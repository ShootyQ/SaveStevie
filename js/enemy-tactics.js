/* Deterministic wall-aware approaches; animation clocks never decide collisions. */
DoodleDefender.systems.enemyTactics=function(game){
 let leaders=new Map(),followers=new WeakMap(),orderSerial=0;
 const live=w=>w.hp>0&&w.life>0;
 function resetEnemyTactics(){leaders=new Map();followers=new WeakMap();orderSerial=0;}
 function clear(e,a,b){
  for(const w of game.state.walls){if(!live(w))continue;const pad=e.r+w.thick/2+1;
   for(const seg of game.api.wallGeometry(w.pts).segments){if(game.api.segmentIntersection(a,b,seg.a,seg.b))return false;
    const start=game.api.pointSegDist(a.x,a.y,seg.a.x,seg.a.y,seg.b.x,seg.b.y),end=game.api.pointSegDist(b.x,b.y,seg.a.x,seg.a.y,seg.b.x,seg.b.y),distance=Math.min(start,end,game.api.pointSegDist(seg.a.x,seg.a.y,a.x,a.y,b.x,b.y),game.api.pointSegDist(seg.b.x,seg.b.y,a.x,a.y,b.x,b.y));
    if(distance<pad&&!(start<pad&&distance>=start-1e-5&&end>=start))return false;
   }
  }return true;
 }
 function sneakRoute(e,goal){
  if(clear(e,e,goal))return [goal];
  const candidates=[];
  for(const w of game.state.walls){if(!live(w))continue;
   // Keep planning bounded on long hand-drawn strokes; always include both ends.
   const samples=Math.min(12,w.pts.length);
   for(let index=0;index<samples;index++){const i=Math.round(index*(w.pts.length-1)/Math.max(1,samples-1)),p=w.pts[i],pad=(e.r+w.thick/2+5)*1.45;
    for(let k=0;k<8;k++){const a=k*Math.PI/4,q={x:p.x+Math.cos(a)*pad,y:p.y+Math.sin(a)*pad};
     if(q.x<e.r||q.x>game.state.W-e.r||q.y<e.r||q.y>game.state.H-e.r)continue;
     if(game.state.walls.some(w=>live(w)&&Math.hypot(q.x-game.api.nearestPointOnWall(q,w).x,q.y-game.api.nearestPointOnWall(q,w).y)<e.r+w.thick/2+1))continue;
     candidates.push(q);
    }
   }
  }
  candidates.sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)+Math.hypot(a.x-goal.x,a.y-goal.y)-Math.hypot(b.x-e.x,b.y-e.y)-Math.hypot(b.x-goal.x,b.y-goal.y));
  const nodes=[{x:e.x,y:e.y},goal,...candidates.slice(0,64)],cost=nodes.map(()=>Infinity),previous=[],visited=new Set();cost[0]=0;
  for(let step=0;step<nodes.length;step++){
   let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||cost[i]<cost[current]))current=i;
   if(current<0||!Number.isFinite(cost[current]))break;if(current===1){const path=[];for(let i=1;i!==0;i=previous[i])path.unshift(nodes[i]);return path;}
   visited.add(current);
   for(let i=1;i<nodes.length;i++){if(visited.has(i))continue;const next=cost[current]+Math.hypot(nodes[i].x-nodes[current].x,nodes[i].y-nodes[current].y);if(next>=cost[i]||!clear(e,nodes[current],nodes[i]))continue;cost[i]=next;previous[i]=current;}
  }
  return null;
 }
 const recruits=new Set(['grunt','fast','brute','elite','mini','splitter','brood','bulwark','gnawer','wardling','tank','bouncer','sprinter']);
 function leader(e){let s=leaders.get(e);if(!s){s={runs:0,phase:'scout',wait:1.1,order:null,corner:0,nav:null,speech:0,exit:null};leaders.set(e,s);}return s;}
 function patrolPoints(){const {W,H}=game.state,margin=Math.min(65,W*.13),top=Math.min(130,H*.23);return [{x:margin,y:top},{x:W-margin,y:top},{x:W-margin,y:H-45},{x:margin,y:H-45}];}
 function retireOrder(s){s.order=null;}
 function markRoute(e,s){
  const goal={x:game.state.player.x,y:game.state.player.y},path=sneakRoute(e,goal);
  s.runs++;s.order={id:++orderSerial,points:[{x:e.x,y:e.y},...(path||[goal])],age:0,blocked:path?0:.001,audit:0,erased:false};
  if(s.runs>=3)s.phase='join';
  game.api.animateEnemyAction(e,'aim',goal);game.api.floatText(e.x,e.y-e.r-16,s.runs===3?'MY TURN!':'THIS WAY!','#566fb0');
 }
 function eligible(e){return e.hp>0&&!e.waveBoss&&recruits.has(e.type)&&!game.api.underPaper(e)&&!e.flight&&!e.hurdle&&!game.api.feastHost(e)&&!game.api.doodleTarget(e);}
 function orderValid(owner,order){return owner.hp>0&&game.state.enemies.includes(owner)&&leaders.get(owner)?.order===order&&!order.erased;}
 function updateSneakyOrders(dt){
  for(const [e,s] of leaders){
   if(e.hp<=0||!game.state.enemies.includes(e)){leaders.delete(e);continue;}
   if(e.freeze>0||e.stun>0||game.api.underPaper(e)||e.flight)continue;
   s.speech=Math.max(0,s.speech-dt);const o=s.order;if(!o)continue;
   o.age+=dt;o.audit-=dt;
   if(o.audit<=0){o.audit=.25;const blocked=o.erased||o.points.some((p,i)=>i&&!clear(e,o.points[i-1],p));if(blocked){if(!o.blocked)game.api.floatText(e.x,e.y-e.r-16,'ROUTE BLOCKED!','#a87853');o.blocked=Math.max(.001,o.blocked);}else o.blocked=0;}
   if(o.blocked)o.blocked+=dt;
   if(o.blocked>=10||(!o.blocked&&o.age>=8)){
    retireOrder(s);s.wait=1;game.api.floatText(e.x,e.y-e.r-16,'NEW PLAN!','#566fb0');continue;
   }
   if(o.age<.9||o.erased)continue; // A visible pencil wind-up precedes the rally.
   let count=game.state.enemies.filter(n=>followers.get(n)?.order===o).length;
   for(const n of game.state.enemies){
    if(count>=6)break;if(n===e||!eligible(n)||followers.has(n))continue;
    let best=null;for(let i=0;i<o.points.length-1;i++){const q=o.points[i],distance=Math.hypot(n.x-q.x,n.y-q.y);if(distance<=145&&clear(n,n,q)&&(!best||distance<best.distance))best={index:i,distance};}
    if(best){followers.set(n,{owner:e,order:o,index:best.index});count++;game.api.floatText(n.x,n.y-n.r-10,'ON IT!','#566fb0');}
   }
  }
 }
 function sneakFollowTarget(e){
  if(e.type==='flanker'&&leaders.get(e)?.phase==='escape')return leaders.get(e).exit;
  const f=followers.get(e);if(!f)return null;
  if(!eligible(e)||!orderValid(f.owner,f.order)){followers.delete(e);return null;}
  const pts=f.order.points;while(f.index<pts.length&&Math.hypot(e.x-pts[f.index].x,e.y-pts[f.index].y)<Math.max(8,e.r*.6))f.index++;
  if(f.index>=pts.length){followers.delete(e);return null;}return pts[f.index];
 }
 function navigate(e,s,goal,dt,speed=1){
  let nav=s.nav;const walls=game.state.walls.filter(live);
  const changed=!nav||nav.goal.x!==goal.x||nav.goal.y!==goal.y||walls.length!==nav.walls.length||walls.some((w,i)=>w!==nav.walls[i]||w.pts!==nav.points[i]);
  if(nav)nav.left-=dt;
  if(changed||nav.left<=0){nav={goal:{...goal},path:sneakRoute(e,goal),left:.8,walls,points:walls.map(w=>w.pts)};s.nav=nav;}
  if(!nav.path)return false;
  while(nav.path.length>1&&Math.hypot(nav.path[0].x-e.x,nav.path[0].y-e.y)<5)nav.path.shift();
  const q=nav.path[0]||goal,dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy)||1;
  e.sneakDetour=nav.path.length>1;const travel=Math.min(d,e.speed*speed*game.api.enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7))*dt);
  if(game.api.moveEnemySafely(e,dx/d*travel,dy/d*travel))return true;nav.left=0;return false;
 }
 function exitPoint(e){const {W,H}=game.state,choices=[{x:-e.r-35,y:e.y},{x:W+e.r+35,y:e.y},{x:e.x,y:-e.r-35},{x:e.x,y:H+e.r+35}];return choices.sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)).find(q=>sneakRoute(e,q))||choices[0];}
 function updateSneaky(e,dt){
  const s=leader(e);if(e.hp<=0||e.freeze>0||e.stun>0)return true;
  if(game.state.timeLeft<=0&&game.state.enemies.every(n=>n===e||n.hp<=0)&&s.phase!=='escape'){
   retireOrder(s);s.phase='escape';s.exit=exitPoint(e);s.nav=null;s.speech=99;game.api.setMsg('Sneaky: “We’ll be back!”');
  }
  if(s.phase==='escape'){
   const moved=navigate(e,s,s.exit,dt,1.8);
   if(e.x<-e.r-20||e.x>game.state.W+e.r+20||e.y<-e.r-20||e.y>game.state.H+e.r+20){game.state.enemies=game.state.enemies.filter(n=>n!==e);leaders.delete(e);game.api.setMsg('Sneaky escaped. Stevie is safe!');return true;}
   return moved; // If sealed in, normal wall chewing opens an honest exit.
  }
  if(game.api.feastHost(e)||game.api.doodleTarget(e))return false;
  if(!s.order&&s.phase==='scout'){s.wait-=dt;if(s.wait<=0)markRoute(e,s);}
  if(s.phase==='join'){
   // His third plan is a commitment: no more endless scouting.
   if(s.order&&s.order.age<.9)return true;
   if(!followers.has(e)&&s.order)followers.set(e,{owner:e,order:s.order,index:1});
   const f=followers.get(e);if(f&&!orderValid(f.owner,f.order))followers.delete(e);
   const points=f?.order.points;if(points){while(f.index<points.length&&Math.hypot(e.x-points[f.index].x,e.y-points[f.index].y)<8)f.index++;}
   const goal=points?.[f.index]||game.state.player;
   if(!points){if(navigate(e,s,goal,dt)){game.api.contactStevie(e);return true;}return false;}
   const dx=goal.x-e.x,dy=goal.y-e.y,d=Math.hypot(dx,dy)||1,travel=Math.min(d,e.speed*game.api.enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7))*dt);
   if(game.api.moveEnemySafely(e,dx/d*travel,dy/d*travel)){game.api.contactStevie(e);return true;}return false;
  }
  const corners=patrolPoints();if(!s.initialized){s.corner=corners.reduce((best,q,i)=>Math.hypot(q.x-e.x,q.y-e.y)<Math.hypot(corners[best].x-e.x,corners[best].y-e.y)?i:best,0);s.initialized=true;}
  if(Math.hypot(e.x-corners[s.corner].x,e.y-corners[s.corner].y)<12){s.corner=(s.corner+1)%4;s.nav=null;}
  navigate(e,s,corners[s.corner],dt,1.35);return true;
 }
 function eraseSneakyRoutes(a,b,r){let changed=false;for(const [e,s] of leaders){const o=s.order;if(!o||o.erased)continue;if(o.points.some((p,i)=>i&&(game.api.segmentIntersection(a,b,o.points[i-1],p)||Math.min(game.api.pointSegDist(p.x,p.y,a.x,a.y,b.x,b.y),game.api.pointSegDist(o.points[i-1].x,o.points[i-1].y,a.x,a.y,b.x,b.y),game.api.pointSegDist(a.x,a.y,o.points[i-1].x,o.points[i-1].y,p.x,p.y),game.api.pointSegDist(b.x,b.y,o.points[i-1].x,o.points[i-1].y,p.x,p.y))<=r+3))){o.erased=true;o.blocked=.001;changed=true;game.api.floatText(e.x,e.y-e.r-16,'HEY! MY PLAN!','#566fb0');}}return changed;}
 function sneakySnapshot(){return [...leaders].filter(([e])=>game.state.enemies.includes(e)&&e.hp>0).map(([e,s])=>({x:e.x,y:e.y,runs:s.runs,phase:s.phase,speech:s.speech,route:s.order?{id:s.order.id,age:s.order.age,blocked:s.order.blocked,erased:s.order.erased,points:s.order.points.map(p=>({...p})),followers:game.state.enemies.filter(n=>followers.get(n)?.order===s.order&&n!==e).length}:null}));}
 function drawSneakyRoutes(){const ctx=game.dom.ctx;for(const [e,s] of leaders){if(e.hp<=0||!game.state.enemies.includes(e)||game.api.underPaper(e))continue;const o=s.order;
  if(o&&!o.erased){ctx.save();ctx.strokeStyle=o.blocked?'#a87853':'#566fb0';ctx.lineWidth=3;ctx.globalAlpha=o.age<.9?.4:.8;ctx.setLineDash([2,9]);const length=o.points.reduce((sum,p,i)=>sum+(i?Math.hypot(p.x-o.points[i-1].x,p.y-o.points[i-1].y):0),0);let left=length*Math.min(1,o.age/.9),tip=o.points[0];ctx.beginPath();ctx.moveTo(tip.x,tip.y);for(let i=1;i<o.points.length&&left>0;i++){const a=o.points[i-1],b=o.points[i],distance=Math.hypot(b.x-a.x,b.y-a.y),t=Math.min(1,left/(distance||1));tip={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};ctx.lineTo(tip.x,tip.y);left-=distance;}ctx.stroke();ctx.setLineDash([]);
   if(o.age<.9&&!game.api.enemyMotionReduced()){ctx.translate(tip.x,tip.y);ctx.rotate(-.6);ctx.fillStyle='#f4bf4e';ctx.fillRect(-3,-25,6,19);ctx.fillStyle='#343638';ctx.beginPath();ctx.moveTo(-3,-6);ctx.lineTo(0,0);ctx.lineTo(3,-6);ctx.fill();}
   else{const a=o.points.at(-2),b=o.points.at(-1),angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.beginPath();ctx.moveTo(b.x-Math.cos(angle-.55)*13,b.y-Math.sin(angle-.55)*13);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-Math.cos(angle+.55)*13,b.y-Math.sin(angle+.55)*13);ctx.stroke();}ctx.restore();}
  if(s.phase==='escape'){ctx.save();const x=game.api.clamp(e.x,65,game.state.W-65),y=game.api.clamp(e.y-e.r-25,90,game.state.H-30);ctx.fillStyle='#fff8e5';ctx.strokeStyle='#566fb0';ctx.lineWidth=2;ctx.fillRect(x-61,y-17,122,27);ctx.strokeRect(x-61,y-17,122,27);ctx.fillStyle='#354775';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('We’ll be back!',x,y+1);ctx.beginPath();ctx.moveTo(x,y+10);ctx.lineTo(e.x,e.y-e.r);ctx.stroke();ctx.restore();}
 }}
 // Local neighbours only; accumulated offsets are capped so a crowd never catapults anyone.
 function crowdEligible(e){return e.hp>0&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!game.api.underPaper(e)&&!e.flight&&!e.hurdle&&!game.api.bossFriendHeld(e);}
 function separateEnemies(dt){
  const enemies=game.state.enemies.filter(crowdEligible),size=Math.max(64,...enemies.map(e=>e.r*2+4)),grid=new Map(),offsets=new Map();
  enemies.forEach((e,i)=>{const x=Math.floor(e.x/size),y=Math.floor(e.y/size),key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push({e,i});offsets.set(e,{x:0,y:0});});
  for(let i=0;i<enemies.length;i++){const a=enemies[i],gx=Math.floor(a.x/size),gy=Math.floor(a.y/size);
   for(let x=gx-1;x<=gx+1;x++)for(let y=gy-1;y<=gy+1;y++)for(const {e:b,i:j} of grid.get(x+','+y)||[]){
    if(j<=i||game.api.doodleClingScale(a)<1||game.api.doodleClingScale(b)<1)continue;
    let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),rest=(a.r+b.r)*.85;if(d>=rest)continue;
    if(d<.001){dx=1;dy=0;d=1;}
    const step=Math.min(rest-d,34*dt),ma=a.type==='tank'?4:Math.max(1,a.r/14),mb=b.type==='tank'?4:Math.max(1,b.r/14);
    const oa=offsets.get(a),ob=offsets.get(b);oa.x-=dx/d*step*mb/(ma+mb);oa.y-=dy/d*step*mb/(ma+mb);ob.x+=dx/d*step*ma/(ma+mb);ob.y+=dy/d*step*ma/(ma+mb);
   }
  }
  for(const [e,o] of offsets){if(e.freeze>0||e.stun>0)continue;const m=Math.hypot(o.x,o.y),scale=m?Math.min(1,24*dt/m):0,dx=o.x*scale,dy=o.y*scale,x=e.x+dx,y=e.y+dy;
   if(x<e.r||x>game.state.W-e.r||y<e.r||y>game.state.H-e.r||game.api.touchesRefuge({...e,x,y}))continue;
   game.api.moveEnemySafely(e,dx,dy);
  }
 }
 function updateDash(e,dt){
  if(e.freeze>0||e.stun>0){if(e.hurdle){delete e.hurdle;e.stun=Math.max(e.stun,.35);}return true;}
  if(e.hurdle){const h=e.hurdle;h.age=Math.min(h.duration,h.age+dt);const t=h.age/h.duration,x=h.from.x+(h.to.x-h.from.x)*t,y=h.from.y+(h.to.y-h.from.y)*t;
   const other=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},x,y,new Set([h.wall]));
   if(other){delete e.hurdle;e.stun=.45;game.api.animateEnemyAction(e,'bounce');return true;}
   e.x=x;e.y=y;if(t>=1){delete e.hurdle;e.dashLanding=.28;e.crowdJumpCd=.7;game.api.animateEnemyAction(e,'dash-land');}return true;
  }
  e.dashLanding=Math.max(0,(e.dashLanding||0)-dt);
  if(game.api.feastHost(e))return false;
  const target=game.api.enemyTarget(e),dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1,travel=Math.min(d,e.speed*game.api.enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7))*dt);
  const nx=e.x+dx/d*travel,ny=e.y+dy/d*travel,hit=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r+1},nx,ny);
  e.crowdJumpCd=Math.max(0,(e.crowdJumpCd||0)-dt);
  // Look ahead in the running lane, not behind or at neighbouring lanes.
  const obstacle=!e.crowdJumpCd&&game.state.enemies.filter(n=>n!==e&&n.hp>0&&!game.api.underPaper(n)&&!n.flight&&!n.hurdle&&!game.api.bossFriendHeld(n)).map(n=>{const ox=n.x-e.x,oy=n.y-e.y;return {n,along:(ox*dx+oy*dy)/d,side:Math.abs(ox*dy-oy*dx)/d};}).filter(o=>o.along>=0&&o.along<=e.r+o.n.r+travel+8&&o.side<e.r+o.n.r).sort((a,b)=>a.along-b.along)[0];
  if(obstacle){
   let leap=obstacle.along+obstacle.n.r+e.r+14,to={x:e.x+dx/d*leap,y:e.y+dy/d*leap};
   let wall=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},to.x,to.y)?.wall;
   if(wall&&e.hurdlesLeft>0){const q=game.api.nearestPointOnWall(obstacle.n,wall);leap=Math.max(leap,((q.x-e.x)*dx+(q.y-e.y)*dy)/d+e.r+wall.thick/2+12);to={x:e.x+dx/d*leap,y:e.y+dy/d*leap};}
   const b=game.api.refugeBounds(),fort=game.api.pointSegDist(game.state.player.x,game.state.player.y,e.x,e.y,to.x,to.y)<=Math.hypot(b.halfWidth,b.halfHeight)+e.r+3;
   if((!wall||e.hurdlesLeft>0)&&!fort&&to.x>=e.r&&to.x<=game.state.W-e.r&&to.y>=e.r&&to.y<=game.state.H-e.r&&!game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},to.x,to.y,new Set(wall?[wall]:[]))){
    if(wall)e.hurdlesLeft=0;e.hurdle={wall,from:{x:e.x,y:e.y},to,age:0,duration:.42};game.api.animateEnemyAction(e,'hurdle');game.api.floatText(e.x,e.y-e.r-15,'COMING THROUGH!','#aa6b15');return true;
   }
  }
  if(!hit){e.x=nx;e.y=ny;game.api.contactStevie(e);return true;}
  if(e.hurdlesLeft>0){
   const q=game.api.nearestPointOnWall(e,hit.wall),distance=Math.hypot(q.x-e.x,q.y-e.y),leap=distance+e.r+hit.wall.thick/2+12,to={x:e.x+dx/d*leap,y:e.y+dy/d*leap};
   const b=game.api.refugeBounds(),fort=game.api.pointSegDist(game.state.player.x,game.state.player.y,e.x,e.y,to.x,to.y)<=Math.hypot(b.halfWidth,b.halfHeight)+e.r+3;
   if(!fort&&to.x>=e.r&&to.x<=game.state.W-e.r&&to.y>=e.r&&to.y<=game.state.H-e.r&&!game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},to.x,to.y,new Set([hit.wall]))){
    e.hurdlesLeft=0;e.hurdle={wall:hit.wall,from:{x:e.x,y:e.y},to,age:0,duration:.42};game.api.animateEnemyAction(e,'hurdle');game.api.floatText(e.x,e.y-e.r-15,'HUP!','#aa6b15');return true;
   }
  }
  // Stop before contact even at high speed; the normal wall attack handles the block.
  const step=Math.max(0,hit.t-.0001);e.x+=(nx-e.x)*step;e.y+=(ny-e.y)*step;
  game.api.dealDamage(e,game.api.applyInkContact(e,dt,hit.wall)*dt,'physical');
  if(e.hp>0&&e.freeze<=0&&e.stun<=0){e.attackCd-=dt;if(e.attackCd<=0){game.api.damageWall(hit.wall,e.dmg,e.x,e.y);e.attackCd=.42;game.api.animateEnemyAction(e,'bounce');}}
  return true;
 }
 function eraseSniperLane(e,dt){
  const p=game.state.player,hit=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},p.x,p.y);
  if(!hit){delete e.sniperErase;return false;}
  const q=game.api.nearestPointOnWall(e,hit.wall),dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy)||1,reach=e.r+hit.wall.thick/2+10;
  if(d>reach){delete e.sniperErase;const step=Math.min(d-reach,e.speed*game.api.enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7))*dt);return game.api.moveEnemySafely(e,dx/d*step,dy/d*step);}
  const old=e.sniperErase;e.sniperErase={wall:hit.wall,x:q.x,y:q.y,age:(old?.wall===hit.wall?old.age:0)+dt};
  game.api.animateEnemyAction(e,'erase',q);
  if(e.sniperErase.age>=.7){game.api.eraseWallPath(q,q,18,{enemy:true});game.api.burst(q.x,q.y,'#d5a6b6',6);e.sniperErase=null;}
  return true;
 }
 function moveEnemyTactics(dx,dy){for(const s of leaders.values()){s.nav=null;if(s.exit){s.exit.x+=dx;s.exit.y+=dy;}if(s.order)for(const p of s.order.points){p.x+=dx;p.y+=dy;}}for(const e of game.state.enemies){if(e.hurdle)for(const p of [e.hurdle.from,e.hurdle.to]){p.x+=dx;p.y+=dy;}if(e.sniperErase){e.sniperErase.x+=dx;e.sniperErase.y+=dy;}}}
 const api={separateEnemies,updateSneakyOrders,sneakFollowTarget,eraseSneakyRoutes,sneakySnapshot,drawSneakyRoutes,moveEnemyTactics,resetEnemyTactics,updateSneaky,updateDash,eraseSniperLane,sneakRoute};Object.assign(game.api,api);return api;
};
