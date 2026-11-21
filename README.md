# sokoban-solver-01

[![make.fun · sokoban-solver-01-run-20261121](https://make.fun/badge/sokoban-solver-01-run-20261121.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121)
[![rank](https://make.fun/badge/sokoban-solver-01-run-20261121/hikmalalfatih/sokoban-solver-01-run-20261121/rank.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121)
[![reward](https://make.fun/badge/sokoban-solver-01-run-20261121/hikmalalfatih/sokoban-solver-01-run-20261121/reward.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121)

A push-optimal Sokoban solver for make.fun's `sokoban-solver-01-run-20261121`.
One program (`main.ts`, Node 22, no dependencies) answers all 5 instances
of a set in a single run.

## How it works

Every level is a hallway with independent rooms off it: a box pushed out of
a door can never come back, so the level's push optimum is the sum of its
rooms' optima. The solver therefore:

1. cuts the hallway at its dead squares and splits the level into rooms;
2. solves each room on its own with a breadth-first search over pushes —
   the first solved state met is push-optimal — pruning dead squares (a box
   may only sit where a box alone can be pulled back to a goal) and frozen
   2x2 blocks of walls and boxes;
3. walks the player from room to room, the other rooms' boxes standing as
   walls, and writes each instance's moves to `/output/<id>/solution.txt`.

Practice set: 1,000,000 points (every instance solved in its push-optimal
count P\*), in about 1 second for the whole set. The house baseline
plain-astar 1.0.0 scores 200,000 on the same set.

## Run locally

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
