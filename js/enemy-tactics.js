/* Deterministic wall-aware approaches; animation clocks never decide collisions. */
DoodleDefender.systems.enemyTactics=function(game){
 let routes=new WeakMap();
 const live=w=>w.hp>0&&w.life>0;
 function resetEnemyTactics(){routes=new WeakMap();}
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
   for(let i=0;i<w.pts.length;i++){const p=w.pts[i],pad=(e.r+w.thick/2+5)*1.45;
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
 function updateSneaky(e,dt){
  if(e.hp<=0||e.freeze>0||e.stun>0)return true;
  if(game.api.feastHost(e)||game.api.doodleTarget(e))return false;
  const goal=game.state.player;let route=routes.get(e);if(route)route.left-=dt;
  const walls=game.state.walls.filter(live),changed=!route||walls.length!==route.walls.length||walls.some((w,i)=>w!==route.walls[i]||w.pts!==route.points[i]);
  if(changed||route.left<=0||route.path?.length&&!clear(e,e,route.path[0])){route={path:sneakRoute(e,goal),left:.45,walls,points:walls.map(w=>w.pts)};routes.set(e,route);}
  e.sneakDetour=!!route.path&&route.path.length>1;
  if(!route.path)return false; // A sealed defense remains solid; chew only when no route exists.
  while(route.path.length>1&&Math.hypot(route.path[0].x-e.x,route.path[0].y-e.y)<3)route.path.shift();
  const q=route.path[0]||goal,dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy)||1,speed=e.speed*game.api.enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7)),travel=Math.min(d,speed*dt);
  if(game.api.moveEnemySafely(e,dx/d*travel,dy/d*travel)){game.api.contactStevie(e);return true;}route.left=0;return false;
 }
 function updateDash(e,dt){
  if(e.freeze>0||e.stun>0){if(e.hurdle){delete e.hurdle;e.stun=Math.max(e.stun,.35);}return true;}
  if(e.hurdle){const h=e.hurdle;h.age=Math.min(h.duration,h.age+dt);const t=h.age/h.duration,x=h.from.x+(h.to.x-h.from.x)*t,y=h.from.y+(h.to.y-h.from.y)*t;
   const other=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},x,y,new Set([h.wall]));
   if(other){delete e.hurdle;e.stun=.45;game.api.animateEnemyAction(e,'bounce');return true;}
   e.x=x;e.y=y;if(t>=1){delete e.hurdle;e.dashLanding=.28;game.api.animateEnemyAction(e,'dash-land');}return true;
  }
  e.dashLanding=Math.max(0,(e.dashLanding||0)-dt);
  if(game.api.feastHost(e))return false;
  const target=game.api.enemyTarget(e),dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1,travel=Math.min(d,e.speed*game.api.enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7))*dt);
  const nx=e.x+dx/d*travel,ny=e.y+dy/d*travel,hit=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r+1},nx,ny);
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
 function moveEnemyTactics(dx,dy){routes=new WeakMap();for(const e of game.state.enemies){if(e.hurdle)for(const p of [e.hurdle.from,e.hurdle.to]){p.x+=dx;p.y+=dy;}if(e.sniperErase){e.sniperErase.x+=dx;e.sniperErase.y+=dy;}}}
 const api={moveEnemyTactics,resetEnemyTactics,updateSneaky,updateDash,eraseSniperLane,sneakRoute};Object.assign(game.api,api);return api;
};
