import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs'
import{join}from'node:path'
const X=[[0,-1],[0,1],[-1,0],[1,0]]
function P(t){let r=t.split('\n').filter(s=>s.length),h=r.length,w=Math.max(...r.map(s=>s.length)),a=new Uint8Array(w*h).fill(1),g=[],b=[],p=-1
r.forEach((s,y)=>{for(let x=0;x<s.length;x++){let c=s[x],i=y*w+x
if(c=='#')continue
a[i]=0
if('.+*'.includes(c))g.push(i)
if('$*'.includes(c))b.push(i)
if('@+'.includes(c))p=i}})
for(let i=0;i<w;i++)a[i]=a[(h-1)*w+i]=1
for(let i=0;i<h;i++)a[i*w]=a[i*w+w-1]=1
return{w,a,g,b:b.sort((m,n)=>m-n),p}}
function V(L){let w=L.w,a=L.a,v=new Uint8Array(a.length),q=[...L.g]
for(let x of q)v[x]=1
for(let i=0;i<q.length;i++)for(let[dx,dy]of X){let d=dy*w+dx,y=q[i]-d
if(!a[y]&&!a[y-d]&&!v[y]){v[y]=1;q.push(y)}}
return v}
function H(L,o,f,s,t,k){let w=L.w,a=L.a,lo=f,n=0
k[n++]=f;s[f]=t
while(n){let p=k[--n]
if(p<lo)lo=p
for(let[dx,dy]of X){let q=p+dy*w+dx
if(!a[q]&&!o[q]&&s[q]!=t){s[q]=t;k[n++]=q}}}
return lo}
function Z(L,o,g,t){let w=L.w,a=L.a
for(let c of[t,t-1,t-w,t-w-1]){let b=c+1,d=c+w,e=d+1
if((a[c]||o[c])&&(a[b]||o[b])&&(a[d]||o[d])&&(a[e]||o[e])&&((o[c]&&!g[c])||(o[b]&&!g[b])||(o[d]&&!g[d])||(o[e]&&!g[e])))return 1}
return 0}
function T(L,o,f,t){if(f==t)return''
let w=L.w,a=L.a,P=new Int32Array(a.length).fill(-1),C=[],q=[f]
P[f]=f
for(let i=0;i<q.length;i++){let p=q[i]
if(p==t)break
for(let j=0;j<4;j++){let n=p+X[j][1]*w+X[j][0]
if(a[n]||o[n]||P[n]>=0)continue
P[n]=p;C[n]='udlr'[j];q.push(n)}}
if(P[t]<0)throw 0
let s=''
for(let p=t;p!=f;p=P[p])s=C[p]+s
return s}
function S(L,mx){let w=L.w,a=L.a,bs=L.b,pl=L.p,n=a.length,g=new Uint8Array(n),v=V(L)
for(let x of L.g)g[x]=1
if(bs.some(x=>!v[x]))return null
let o=new Uint8Array(n),s1=new Int32Array(n),s2=new Int32Array(n),st=new Int32Array(n),c=0
let key=(B,l)=>String.fromCharCode(l,...B),ok=B=>B.every(x=>g[x])
let B=[bs.slice()],Q=[pl],A=[-1],E=[null],ix=new Map
for(let x of bs)o[x]=1
ix.set(key(bs,H(L,o,pl,s1,++c,st)),0)
for(let x of bs)o[x]=0
let fd=ok(bs)?0:-1
for(let hd=0;fd<0&&hd<B.length;hd++){let cb=B[hd]
for(let x of cb)o[x]=1
let hr=++c
H(L,o,Q[hd],s1,hr,st)
for(let i=0;i<cb.length&&fd<0;i++){let b=cb[i]
for(let j=0;j<4;j++){let d=X[j][1]*w+X[j][0],t=b+d
if(s1[b-d]!=hr||a[t]||o[t]||!v[t])continue
o[b]=0;o[t]=1
let fr=Z(L,o,g,t),k=null,nb=null
if(!fr){nb=cb.slice();nb[i]=t;nb.sort((x,y)=>x-y);k=key(nb,H(L,o,b,s2,++c,st))}
o[t]=0;o[b]=1
if(fr||ix.has(k))continue
if(B.length>=mx){for(let x of cb)o[x]=0;return null}
ix.set(k,B.length);B.push(nb);Q.push(b);A.push(hd);E.push([b,t])
if(ok(nb)){fd=B.length-1;break}}}
for(let x of cb)o[x]=0}
if(fd<0)return null
let pa=[]
for(let s=fd;s>0;s=A[s])pa.push(s)
pa.reverse()
let mv='',pp=pl,cb=bs.slice()
for(let s of pa){let[f,t]=E[s],d=t-f,j=X.findIndex(([dx,dy])=>dy*w+dx==d)
for(let x of cb)o[x]=1
mv+=T(L,o,pp,f-d)
for(let x of cb)o[x]=0
mv+='UDLR'[j];pp=f;cb=B[s]}
return mv}
function R(L){let w=L.w,a=L.a,v=V(L),row=(L.p/w)|0,cut=new Uint8Array(a.length)
for(let i=row*w;i<(row+1)*w;i++)if(!a[i]&&!v[i])cut[i]=1
if(L.b.some(x=>cut[x]))return null
let pt=new Int32Array(a.length).fill(-1),rm=[]
for(let s=0;s<a.length;s++){if(a[s]||cut[s]||pt[s]>=0)continue
let q=[s];pt[s]=rm.length
for(let i=0;i<q.length;i++)for(let[dx,dy]of X){let z=q[i]+dy*w+dx
if(!a[z]&&!cut[z]&&pt[z]<0){pt[z]=rm.length;q.push(z)}}
rm.push({b:[],g:[]})}
for(let x of L.b)rm[pt[x]].b.push(x)
for(let x of L.g){if(pt[x]<0)return null;rm[pt[x]].g.push(x)}
if(rm.some(r=>r.b.length!=r.g.length))return null
return rm.filter(r=>r.b.length)}
function Y(L){let rm=R(L)
if(!rm)return S(L,100000)
let pl=L.p,mv=''
for(let r of rm){let a=L.a.slice()
for(let o of rm)if(o!=r)for(let x of o.done?o.g:o.b)a[x]=1
let s=S({w:L.w,a,g:r.g.slice().sort((x,y)=>x-y),b:r.b.slice().sort((x,y)=>x-y),p:pl},250000)
if(s==null)return null
mv+=s
let p=pl
for(let ch of s.toLowerCase())p+=ch=='u'?-L.w:ch=='d'?L.w:ch=='l'?-1:1
pl=p;r.done=1}
return mv}
let I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output'
for(let id of readdirSync(I).sort()){let mv=''
try{let L=P(readFileSync(join(I,id,'level.txt'),'utf8'));mv=Y(L)??S(L,100000)??''}catch{mv=''}
mkdirSync(join(O,id),{recursive:true})
writeFileSync(join(O,id,'solution.txt'),mv+'\n')}
