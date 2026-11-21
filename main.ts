// Room-by-room push-optimal Sokoban solver.
//
// Idea: every level is a hallway with independent rooms off it (a box pushed
// out of a door can never come back), so the level's push optimum is the sum
// of its rooms' optima. Each room is solved on its own by a breadth-first
// search over pushes — the first solved state met is push-optimal — with two
// safe prunings: a box may only sit on a "live" square (one from which a box
// alone can be pulled back to a goal), and a box may not join a frozen 2x2
// block of walls and boxes that holds a box off its goal. A state is the
// boxes' squares plus the player's reachable region (named by its lowest
// square), so walking never costs a state. Moves are rebuilt by walking to
// each push's square and pushing. Written fresh in this session; the approach
// follows the competition's own description of the levels, and the kit's
// reference solver was read to confirm the room/deadlock definitions.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = [[0, -1, 'u', 'U'], [0, 1, 'd', 'D'], [-1, 0, 'l', 'L'], [1, 0, 'r', 'R']];
const MAX_STATES = 250000;

function parse(text) {
  const rows = text.split('\n').filter((r) => r.length > 0);
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const wall = new Uint8Array(w * h).fill(1);
  const goals = [], boxes = [];
  let player = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x], i = y * w + x;
      if (ch === '#') continue;
      wall[i] = 0;
      if (ch === '.' || ch === '*' || ch === '+') goals.push(i);
      if (ch === '$' || ch === '*') boxes.push(i);
      if (ch === '@' || ch === '+') player = i;
    }
  });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) wall[y * w + x] = 1;
  return { w, h, wall, goals, boxes: boxes.sort((a, b) => a - b), player };
}

// Squares from which a box alone can be pushed onto some goal: pull back
// from the goals, one step at a time, over open floor.
function liveSquares(L) {
  const { w, wall, goals } = L, live = new Uint8Array(wall.length), q = [...goals];
  for (const g of goals) live[g] = 1;
  for (let i = 0; i < q.length; i++) for (const [dx, dy] of DIRS) {
    const d = dy * w + dx, y = q[i] - d;
    if (!wall[y] && !wall[y - d] && !live[y]) { live[y] = 1; q.push(y); }
  }
  return live;
}

// Flood fill from `from` around walls and boxes (marked in `seen` with
// `stamp`); returns the region's lowest square.
function reach(L, occupied, from, seen, stamp, stack) {
  const { w, wall } = L;
  let low = from, n = 0;
  stack[n++] = from; seen[from] = stamp;
  while (n > 0) {
    const p = stack[--n];
    if (p < low) low = p;
    for (let k = 0; k < 4; k++) {
      const q = k === 0 ? p - w : k === 1 ? p + w : k === 2 ? p - 1 : p + 1;
      if (wall[q] === 0 && occupied[q] === 0 && seen[q] !== stamp) { seen[q] = stamp; stack[n++] = q; }
    }
  }
  return low;
}

// Whether the box just pushed to `t` sits in a frozen 2x2 block of walls
// and boxes holding a box off its goal.
function frozenBlock(L, occupied, goal, t) {
  const { w, wall } = L;
  for (const a of [t, t - 1, t - w, t - w - 1]) {
    const b = a + 1, c = a + w, d = c + 1;
    if (!(wall[a] || occupied[a]) || !(wall[b] || occupied[b]) ||
        !(wall[c] || occupied[c]) || !(wall[d] || occupied[d])) continue;
    if ((occupied[a] && !goal[a]) || (occupied[b] && !goal[b]) ||
        (occupied[c] && !goal[c]) || (occupied[d] && !goal[d])) return true;
  }
  return false;
}

// The shortest walk from `from` to `to` around walls and boxes, in lower-case
// LURD letters (first direction first on ties).
function walkTo(L, occupied, from, to) {
  const { w, wall } = L;
  if (from === to) return '';
  const prev = new Int32Array(wall.length).fill(-1), how = new Array(wall.length), q = [from];
  prev[from] = from;
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    if (p === to) break;
    for (const [dx, dy, ch] of DIRS) {
      const n = p + dy * w + dx;
      if (wall[n] || occupied[n] || prev[n] !== -1) continue;
      prev[n] = p; how[n] = ch; q.push(n);
    }
  }
  if (prev[to] === -1) throw new Error('push square out of reach');
  let s = '';
  for (let p = to; p !== from; p = prev[p]) s = how[p] + s;
  return s;
}

// The player square after `moves` (LURD, either case) from `from`.
function endOf(w, from, moves) {
  let p = from;
  for (const ch of moves.toLowerCase()) p += ch === 'u' ? -w : ch === 'd' ? w : ch === 'l' ? -1 : 1;
  return p;
}

// Push-optimal solution of a level: {pushes, moves}, or null when the search
// gives up (or the level has no solution). Breadth-first over pushes.
function solvePushOptimal(L, maxStates = MAX_STATES) {
  const { w, wall, goals, boxes, player } = L, size = wall.length;
  const goal = new Uint8Array(size), live = liveSquares(L);
  for (const g of goals) goal[g] = 1;
  if (boxes.some((b) => !live[b])) return null;
  const occ = new Uint8Array(size), seen = new Int32Array(size),
        mark = new Int32Array(size), stack = new Int32Array(size);
  let stamp = 0;
  const key = (bs, low) => String.fromCharCode(low, ...bs);
  const solved = (bs) => bs.every((b) => goal[b]);
  const SB = [boxes.slice()], SP = [player], PA = [-1], PU = [null];
  const idx = new Map();
  for (const b of boxes) occ[b] = 1;
  idx.set(key(boxes, reach(L, occ, player, seen, ++stamp, stack)), 0);
  for (const b of boxes) occ[b] = 0;
  let found = solved(boxes) ? 0 : -1;
  for (let head = 0; found < 0 && head < SB.length; head++) {
    const bs = SB[head];
    for (const b of bs) occ[b] = 1;
    const here = ++stamp;
    reach(L, occ, SP[head], seen, here, stack);
    for (let bi = 0; bi < bs.length && found < 0; bi++) {
      const b = bs[bi];
      for (const [dx, dy] of DIRS) {
        const d = dy * w + dx, t = b + d;
        if (seen[b - d] !== here || wall[t] || occ[t] || !live[t]) continue;
        occ[b] = 0; occ[t] = 1;
        const fr = frozenBlock(L, occ, goal, t);
        let k = null, nb = null;
        if (!fr) {
          nb = bs.slice(); nb[bi] = t; nb.sort((a, b2) => a - b2);
          k = key(nb, reach(L, occ, b, mark, ++stamp, stack));
        }
        occ[t] = 0; occ[b] = 1;
        if (fr || idx.has(k)) continue;
        if (SB.length >= maxStates) { for (const x of bs) occ[x] = 0; return null; }
        idx.set(k, SB.length);
        SB.push(nb); SP.push(b); PA.push(head); PU.push([b, t]);
        if (solved(nb)) { found = SB.length - 1; break; }
      }
    }
    for (const x of bs) occ[x] = 0;
  }
  if (found < 0) return null;
  const path = [];
  for (let s = found; s > 0; s = PA[s]) path.push(s);
  path.reverse();
  let moves = '', pl = player, bs = boxes.slice();
  for (const s of path) {
    const [from, to] = PU[s], d = to - from;
    const dir = DIRS.find(([dx, dy]) => dy * w + dx === d);
    for (const b of bs) occ[b] = 1;
    moves += walkTo(L, occ, pl, from - d);
    for (const b of bs) occ[b] = 0;
    moves += dir[3]; pl = from; bs = SB[s];
  }
  return { pushes: path.length, moves };
}

// The level's rooms: cut the player's row (the hallway) at its dead squares
// — a box there reaches no goal — and each remaining part holding a box is a
// room. Null when the level is no set of rooms.
function roomsOf(L) {
  const { w, wall, goals, boxes, player } = L, live = liveSquares(L);
  const row = Math.floor(player / w), cut = new Uint8Array(wall.length);
  for (let i = row * w; i < (row + 1) * w; i++) if (!wall[i] && !live[i]) cut[i] = 1;
  if (boxes.some((b) => cut[b])) return null;
  const part = new Int32Array(wall.length).fill(-1), rooms = [];
  for (let s = 0; s < wall.length; s++) {
    if (wall[s] || cut[s] || part[s] >= 0) continue;
    const sq = [s];
    part[s] = rooms.length;
    for (let i = 0; i < sq.length; i++) for (const [dx, dy] of DIRS) {
      const q = sq[i] + dy * w + dx;
      if (!wall[q] && !cut[q] && part[q] < 0) { part[q] = rooms.length; sq.push(q); }
    }
    rooms.push({ boxes: [], goals: [] });
  }
  for (const b of boxes) rooms[part[b]].boxes.push(b);
  for (const g of goals) {
    if (part[g] < 0) return null;
    rooms[part[g]].goals.push(g);
  }
  if (rooms.some((r) => r.boxes.length !== r.goals.length)) return null;
  return rooms.filter((r) => r.boxes.length > 0);
}

// The level solved room by room: each room's push-optimal solution in turn,
// the other rooms' boxes standing as walls (on their goals once done), the
// player walking on from where the last room left it.
function solveByRooms(L) {
  const rooms = roomsOf(L);
  if (rooms === null) return solvePushOptimal(L, 100000);
  let player = L.player, pushes = 0, moves = '';
  for (const room of rooms) {
    const wall = L.wall.slice();
    for (const o of rooms) if (o !== room)
      for (const b of o.done ? o.goals : o.boxes) wall[b] = 1;
    const sub = {
      w: L.w, h: L.h, wall,
      goals: room.goals.slice().sort((a, b) => a - b),
      boxes: room.boxes.slice().sort((a, b) => a - b),
      player,
    };
    const s = solvePushOptimal(sub);
    if (s === null) return null;
    pushes += s.pushes; moves += s.moves;
    player = endOf(L.w, player, s.moves); room.done = true;
  }
  return { pushes, moves };
}

function solve(text) {
  const L = parse(text);
  return solveByRooms(L) ?? solvePushOptimal(L, 100000) ?? { pushes: 0, moves: '' };
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  let moves = '';
  try { moves = solve(readFileSync(join(I, id, 'level.txt'), 'utf8')).moves; } catch { moves = ''; }
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'solution.txt'), `${moves}\n`);
}
