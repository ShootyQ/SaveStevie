/* One sparse page-wide wear field. Holes are connected regions, never stamps. */
DoodleDefender.systems.paperSurface=function(game){
 const size=8,limit=65536,caches=new WeakMap();let layer=null,layerKey='',layerOwner=null;
 function data(){const p=game.state.paper;if(!p.surface)p.surface={origin:{x:0,y:0},cells:[],revision:0,serial:0};let c=caches.get(p);if(!c){c={index:new Map(),regions:new Map(),exitCache:new Map(),loops:[]};for(const v of p.surface.cells)c.index.set(v.ix+','+v.iy,v);caches.set(p,c);}return {p,s:p.surface,c};}
 function key(x,y){return x+','+y;}
 function at(x,y){const {s,c}=data();return c.index.get(key(Math.floor((x-s.origin.x)/size),Math.floor((y-s.origin.y)/size)));}
 function surfaceHoleAt(x,y){const v=at(x,y);if(!v||v.wear<1)return null;return game.state.paper.holes.find(h=>h.id===v.region)||null;}
 function paperHoleContains(h,p,pad=0){
  if(!h.surface)return Math.hypot(p.x-h.x,p.y-h.y)<=h.r+pad;
  const {s,c}=data(),ix=Math.floor((p.x-s.origin.x)/size),iy=Math.floor((p.y-s.origin.y)/size),reach=Math.ceil(pad/size);
  for(let x=ix-reach;x<=ix+reach;x++)for(let y=iy-reach;y<=iy+reach;y++){const v=c.index.get(key(x,y));if(!v||v.wear<1||v.region!==h.id)continue;
   const dx=Math.max(s.origin.x+x*size-p.x,0,p.x-(s.origin.x+(x+1)*size)),dy=Math.max(s.origin.y+y*size-p.y,0,p.y-(s.origin.y+(y+1)*size));if(dx*dx+dy*dy<=pad*pad)return true;
  }return false;
 }
 function paperHoleExit(h,toward,padding){
  if(!h.surface)return game.api.safePaperPoint(h,padding)?{x:h.x,y:h.y,id:h.id}:null;
  const {s,c}=data(),cacheKey=h.id+':'+padding+':'+toward.x+':'+toward.y;if(c.exitCache.has(cacheKey)){const cached=c.exitCache.get(cacheKey);return cached?{...cached}:null;}
  if(c.exitCache.size>=64)c.exitCache.clear();
  const cells=c.regions.get(h.id)||[],clearance=Math.min(12,Math.max(0,padding-22));
  const valid=p=>game.api.safePaperPoint(p,padding)&&[[0,0],[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>surfaceHoleAt(p.x+dx*clearance,p.y+dy*clearance)?.id===h.id);
  if(cells.length<=120&&valid(h)){const value={x:h.x,y:h.y,id:h.id};c.exitCache.set(cacheKey,value);return {...value};}
  let best=null,distance=Infinity;for(const v of cells){const p={x:s.origin.x+(v.ix+.5)*size,y:s.origin.y+(v.iy+.5)*size},d=Math.hypot(p.x-toward.x,p.y-toward.y);if(d<distance&&valid(p)){best={...p,id:h.id};distance=d;}}c.exitCache.set(cacheKey,best);return best?{...best}:null;
 }
 function rebuild(seeds=[]){
  const {p,s,c}=data(),open=s.cells.filter(v=>v.wear>=1),unseen=new Set(open.map(v=>key(v.ix,v.iy))),old=[...p.holes,...seeds],holes=[],regions=new Map();
  while(unseen.size){const first=unseen.values().next().value,queue=[c.index.get(first)],cells=[];unseen.delete(first);
   for(let n=0;n<queue.length;n++){const v=queue[n];cells.push(v);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=key(v.ix+dx,v.iy+dy);if(unseen.delete(k))queue.push(c.index.get(k));}}
   const members=new Set(cells.map(v=>key(v.ix,v.iy))),candidates=old.filter(h=>members.has(key(Math.floor((h.x-s.origin.x)/size),Math.floor((h.y-s.origin.y)/size)))).sort((a,b)=>a.id-b.id);
   const h=candidates[0]||{id:++s.serial,x:s.origin.x+(cells[0].ix+.5)*size,y:s.origin.y+(cells[0].iy+.5)*size,r:22};h.surface=true;
   for(const v of cells)v.region=h.id;holes.push(h);regions.set(h.id,cells);
  }
  p.holes=holes;c.regions=regions;c.exitCache.clear();c.loops=contours(open,c.index);s.revision++;
 }
 function contours(cells,index){
  const edges=[],starts=new Map(),solid=(x,y)=>index.get(key(x,y))?.wear>=1;
  function edge(x,y,ex,ey){const v={x,y,ex,ey,used:false};edges.push(v);const k=key(x,y);if(!starts.has(k))starts.set(k,[]);starts.get(k).push(v);}
  for(const v of cells){const x=v.ix,y=v.iy;if(!solid(x,y-1))edge(x,y,x+1,y);if(!solid(x+1,y))edge(x+1,y,x+1,y+1);if(!solid(x,y+1))edge(x+1,y+1,x,y+1);if(!solid(x-1,y))edge(x,y+1,x,y);}
  const loops=[];for(const first of edges){if(first.used)continue;const points=[];let e=first;
   while(e&&!e.used){e.used=true;points.push({x:e.x*size,y:e.y*size});const next=(starts.get(key(e.ex,e.ey))||[]).filter(n=>!n.used),dx=e.ex-e.x,dy=e.ey-e.y;
    next.sort((a,b)=>{const turn=n=>(Math.atan2(dx*(n.ey-n.y)-dy*(n.ex-n.x),dx*(n.ex-n.x)+dy*(n.ey-n.y))+Math.PI*2)%(Math.PI*2);return turn(a)-turn(b);});e=next[0];
   }if(points.length>=3)loops.push(points);
  }return loops;
 }
 function openSeeds(paths){const {s}=data();return paths.map(p=>({x:p.a.x,y:p.a.y,r:22,id:++s.serial}));}
 function rubPaperSurface(paths,dt){
  const {p,s,c}=data(),touched=new Map();let changed=false,opened=false;
  const minX=Math.min(...paths.map(p=>Math.min(p.a.x,p.b.x))),maxX=Math.max(...paths.map(p=>Math.max(p.a.x,p.b.x))),minY=Math.min(...paths.map(p=>Math.min(p.a.y,p.b.y))),maxY=Math.max(...paths.map(p=>Math.max(p.a.y,p.b.y))),weight=Math.min(1,80/Math.max(1,maxX-minX,maxY-minY));
  for(const path of paths){const left=Math.max(8,Math.min(path.a.x,path.b.x)-path.r),right=Math.min(game.state.W-8,Math.max(path.a.x,path.b.x)+path.r),top=Math.max(76,Math.min(path.a.y,path.b.y)-path.r),bottom=Math.min(game.state.H-20,Math.max(path.a.y,path.b.y)+path.r);
   for(let ix=Math.floor((left-s.origin.x)/size);ix<=Math.floor((right-s.origin.x)/size);ix++)for(let iy=Math.floor((top-s.origin.y)/size);iy<=Math.floor((bottom-s.origin.y)/size);iy++){
    const x=s.origin.x+(ix+.5)*size,y=s.origin.y+(iy+.5)*size;if(game.api.pointSegDist(x,y,path.a.x,path.a.y,path.b.x,path.b.y)>path.r||!game.api.safePaperPoint({x,y},8)||game.api.crayonWaxCovers({x,y}))continue;const k=key(ix,iy);touched.set(k,{ix,iy});
   }
  }
  for(const [k,point] of touched){let v=c.index.get(k);if(!v){if(s.cells.length>=limit)continue;v={...point,wear:0,region:0};s.cells.push(v);c.index.set(k,v);}if(v.wear>=1)continue;
   const before=v.wear;v.wear=Math.min(1,v.wear+dt*weight);if(v.wear>=1-1e-8)v.wear=1;if(Math.floor(before*8)!==Math.floor(v.wear*8))changed=true;if(v.wear===1)opened=true;
  }
  if(opened){rebuild(openSeeds(paths));game.api.playSound('paperTear');}else if(changed)s.revision++;
  p.patches=s.cells.filter(v=>v.wear<1).slice(0,256).map(v=>({x:s.origin.x+(v.ix+.5)*size,y:s.origin.y+(v.iy+.5)*size,wear:v.wear}));
  return opened;
 }
 function stampPaperHole(point,r=22){
  const {p,s,c}=data(),existing=surfaceHoleAt(point.x,point.y);if(existing)return existing;if(!game.api.safePaperPoint(point))return null;
  // Components, not spacing, limit new isolated openings. Adjacent growth is allowed.
  if(p.holes.length>=24&&!p.holes.some(h=>paperHoleContains(h,point,r+size)))return null;
  let changed=false;for(let ix=Math.floor((point.x-r-s.origin.x)/size);ix<=Math.floor((point.x+r-s.origin.x)/size);ix++)for(let iy=Math.floor((point.y-r-s.origin.y)/size);iy<=Math.floor((point.y+r-s.origin.y)/size);iy++){
   const x=s.origin.x+(ix+.5)*size,y=s.origin.y+(iy+.5)*size,rough=r*(1+.06*Math.sin(ix*2.4+iy*3.7));if(Math.hypot(x-point.x,y-point.y)>rough||!game.api.safePaperPoint({x,y},8))continue;
   const k=key(ix,iy);let v=c.index.get(k);if(!v){if(s.cells.length>=limit)continue;v={ix,iy,wear:0,region:0};s.cells.push(v);c.index.set(k,v);}if(v.wear<1){v.wear=1;changed=true;}
  }
  if(changed){rebuild([{x:point.x,y:point.y,r,id:++s.serial}]);game.api.playSound('paperTear');}return surfaceHoleAt(point.x,point.y)||null;
 }
 function movePaperSurface(dx,dy){const {s,c}=data();c.exitCache.clear();s.origin.x+=dx;s.origin.y+=dy;s.revision++;}
 function drawPaperSurface(){
  const {s,c}=data();if(!s.cells.length){layerOwner=null;layerKey='';return;}const {W,H}=game.state,cache=s.revision+':'+W+':'+H+':'+s.origin.x+':'+s.origin.y;
  if(!layer){layer=document.createElement('canvas');layerKey='';}
  if(layerKey!==cache||layerOwner!==s){layerOwner=s;const scale=Math.min(1,2048/Math.max(W,H));layer.width=Math.ceil(W*scale);layer.height=Math.ceil(H*scale);const ctx=layer.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(s.origin.x,s.origin.y);
   for(const v of s.cells){if(v.wear>=1)continue;const x=v.ix*size,y=v.iy*size;ctx.fillStyle='rgba(255,253,240,'+(v.wear*.72)+')';ctx.fillRect(x,y,size+.2,size+.2);
    if(v.wear>.3){ctx.strokeStyle='rgba(158,144,119,'+(v.wear*.32)+')';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x+1,y+5);ctx.lineTo(x+7,y+3);ctx.stroke();}if(v.wear>.7){ctx.strokeStyle='#b3a58b88';ctx.beginPath();ctx.moveTo(x+2,y+5);ctx.lineTo(x+4,y+2);ctx.lineTo(x+6,y+4);ctx.stroke();}
   }
   function path(){ctx.beginPath();for(const loop of c.loops){const points=loop.map(p=>({x:p.x+Math.sin(p.x*.73+p.y*.31)*.8,y:p.y+Math.cos(p.y*.61-p.x*.37)*.8})),last=points.at(-1),first=points[0];ctx.moveTo((last.x+first.x)/2,(last.y+first.y)/2);for(let i=0;i<points.length;i++){const p=points[i],n=points[(i+1)%points.length];ctx.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);}ctx.closePath();}}
   path();ctx.save();ctx.clip('evenodd');ctx.fillStyle='#c59b70';ctx.fillRect(-s.origin.x,-s.origin.y,W,H);ctx.strokeStyle='rgba(114,77,43,.25)';ctx.lineWidth=1;ctx.beginPath();for(let y=Math.floor(-s.origin.y/12)*12;y<H-s.origin.y;y+=12){ctx.moveTo(-s.origin.x,y);ctx.bezierCurveTo(W*.3-s.origin.x,y-2,W*.7-s.origin.x,y+2,W-s.origin.x,y);}ctx.stroke();ctx.restore();
   path();ctx.strokeStyle='#65594b55';ctx.lineWidth=2.6;ctx.stroke();path();ctx.strokeStyle='#fffbed';ctx.lineWidth=1.2;ctx.stroke();
   ctx.strokeStyle='#fffbedbb';ctx.lineWidth=.7;ctx.beginPath();for(const loop of c.loops)for(let i=0;i<loop.length;i+=3){const p=loop[i],n=loop[(i+1)%loop.length],dx=n.x-p.x,dy=n.y-p.y,d=Math.hypot(dx,dy)||1;ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-dy/d*2.5,p.y+dx/d*2.5);}ctx.stroke();ctx.restore();layerKey=cache;
  }game.dom.ctx.drawImage(layer,0,0,W,H);
 }
 const api={paperHoleExit,rubPaperSurface,stampPaperHole,paperHoleContains,surfaceHoleAt,movePaperSurface,drawPaperSurface,paperSurfaceSnapshot:()=>{const {s,c}=data();return {cells:s.cells.length,open:s.cells.filter(v=>v.wear>=1).length,regions:c.regions.size,contours:c.loops.length,revision:s.revision,edges:c.loops.reduce((n,l)=>n+l.length,0)};}};Object.assign(game.api,api);return api;
};
