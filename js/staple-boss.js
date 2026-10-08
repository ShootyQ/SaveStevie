/* Staple Snack: locked telegraphs, wall counters, and bounded jam pressure. */
DoodleDefender.systems.stapleBoss=function(game){
const phases=[['fan','rush','punch'],['zipper','drag','nests'],['barrage','snap','jam']];
const names={fan:'STAPLE STITCH · REPLACE COVER BETWEEN BURSTS',rush:'DOUBLE RUSH · FRESH INK JAMS EACH SNAP',punch:'PAPER PUNCH · REBUILD FOR THE FOLLOW-UP',zipper:'ZIPPER · DRAW BEHIND IT',drag:'CLAMP · CROSS THE HELD WALL TO RELEASE',nests:'STAPLE NESTS · DRAW THROUGH TO JAM',barrage:'MISFIRE · LONG WALLS ON BOTH LANES',snap:'TRIPLE SNAP · THREE ANGLES · FRESH INK JAMS',jam:'JAM OVERLOAD · THREE BURSTS · KEEP PATCHING'};
function isStapleBoss(e){return !!e.waveBoss&&e.type==='stapler'}
function phaseFor(e){return e.hp/e.maxHp>.7?1:e.hp/e.maxHp>.35?2:3}
function state(e){const b=game.api.bossBrain(e);if(!b.staple)b.staple={phase:phaseFor(e),transition:0,turn:0,pins:[],nests:[],deployments:[],helperSerial:0,rush:null,drag:null,zipper:null,barrage:null,snaps:0,parries:0,volley:null,hop:null,followup:null,click:0};return b.staple}
function live(e){return e.hp>0&&game.state.enemies.includes(e)}
function safePoint(angle,radius=155){
 const {player:p,W,H}=game.state;
 for(let i=0;i<16;i++){const a=angle+i*Math.PI/8,x=game.api.clamp(p.x+Math.cos(a)*radius,45,W-45),y=game.api.clamp(p.y+Math.sin(a)*radius,Math.min(105,H*.3),H-45);if(Math.hypot(x-p.x,y-p.y)>=125)return {x,y}}
 return {x:45,y:Math.min(105,H*.3)};
}
function adds(e,count=2,source=e){
 const s=state(e),room=6-s.deployments.length-game.state.enemies.filter(n=>n.bossOwner===e&&n.hp>0).length;
 for(let i=0;i<Math.min(count,room);i++){
  const angle=Math.atan2(source.y-game.state.player.y,source.x-game.state.player.x)+(s.helperSerial++%2?1:-1)*.85;
  const p=safePoint(angle,Math.max(145,Math.hypot(source.x-game.state.player.x,source.y-game.state.player.y)-30));
  s.deployments.push({x:source.x,y:source.y,tx:p.x,ty:p.y,age:0,duration:1});
 }
 if(room>0){game.api.floatText(source.x,source.y-30,'JAM SPIT!','#966425');game.api.playSound('rock')}
}
function updateDeployments(e,dt){
 const s=state(e);
 s.deployments=s.deployments.filter(q=>{
  q.age+=dt;if(q.age<q.duration)return true;
  const n=game.api.spawnEnemy(false,q.tx,q.ty,'jamling');if(n){n.bossOwner=e;n.speed*=1.8;n.stun=Math.max(.7,game.api.bossBrain(e).recovery);n.jamWarning=0;game.api.burst(q.tx,q.ty,'#928276',8)}
  return false;
 });
}
function clearStapleBoss(e){
 game.state.enemyShots=game.state.enemyShots.filter(s=>s.stapleOwner!==e);
 game.state.enemies=game.state.enemies.filter(n=>n.bossOwner!==e);
 const s=game.api.bossBrain(e).staple;if(s){s.pins=[];s.nests=[];s.deployments=[];s.rush=s.drag=s.zipper=s.barrage=s.volley=s.hop=s.followup=null}
}
function shoot(e,x,y,tx,ty,count=1,spread=.2){
 const angle=Math.atan2(ty-y,tx-x);
 for(let i=0;i<count&&game.state.enemyShots.length<24;i++){
  const a=angle+(i-(count-1)/2)*spread;
  game.state.enemyShots.push({x,y,vx:Math.cos(a)*145,vy:Math.sin(a)*145,life:4,r:4,damage:7,bossKind:'staple',stapleOwner:e});
 }
 game.api.playSound('rock');
}
function wallAt(x,y,r=10){return game.state.walls.find(w=>w.hp>0&&(()=>{const q=game.api.nearestPointOnWall({x,y},w);return q&&Math.hypot(q.x-x,q.y-y)<=r+w.thick/2})())}
function pinStapleShot(shot){
 const e=shot.stapleOwner;if(!e||!live(e))return;const s=state(e),{player:p,W,H}=game.state;
 if(s.pins.length<8&&shot.x>10&&shot.x<W-10&&shot.y>70&&shot.y<H-10&&Math.hypot(shot.x-p.x,shot.y-p.y)>100)s.pins.push({x:shot.x,y:shot.y,life:10});
}
function cast(e,kind,extra={}){
 const b=game.api.bossBrain(e),s=state(e),p=game.state.player;
 let x=p.x,y=p.y,wall=null;
 if(kind==='punch'||kind==='drag'){const intercept=game.api.bossShotWallHit({x:e.x,y:e.y},p.x,p.y),hit=intercept?{x:e.x+(p.x-e.x)*intercept.t,y:e.y+(p.y-e.y)*intercept.t,wall:intercept.wall}:game.api.nearestBossWallForStaple(e);if(hit){x=hit.x;y=hit.y;wall=hit.wall}else {const q=safePoint(s.turn);x=q.x;y=q.y}}
 const duration=kind==='jam'?1.6:['rush','snap'].includes(kind)?1.05:1.15;
 if(['punch','zipper','drag','jam'].includes(kind))game.state.enemyShots=game.state.enemyShots.filter(q=>q.stapleOwner!==e);
 b.cast={kind,x,y,wall,left:duration,duration,originX:e.x,originY:e.y,existingWalls:new Set(game.state.walls),...extra};e.bossWindup=duration;s.click=0;
 // Every damaging pattern is locked here; no retargeting during its warning.
 if(kind==='barrage')b.cast.origins=[safePoint(-.7,165),safePoint(Math.PI+.7,165)];
 if(kind==='zipper'){const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy)||1;b.cast.zx=e.x;b.cast.zy=e.y;b.cast.vx=dx/d;b.cast.vy=dy/d}
 if(kind==='nests')b.cast.origins=[safePoint(-1,165),safePoint(2.1,165)];
 if(kind==='rush'||kind==='snap')b.cast.route=[{x,y}];
 game.api.setMsg(names[kind]);
}
function finish(e,rest=.45,exposed=false){const b=game.api.bossBrain(e);b.cast=null;e.bossWindup=0;b.recovery=exposed?rest:0;b.cd=rest;game.api.animateEnemyAction(e,'slam')}
function jamBoss(e,label='JAMMED! · ATTACK NOW'){
 const s=state(e);if(s.hop){e.x=s.hop.tx;e.y=s.hop.ty}s.rush=s.drag=s.zipper=s.barrage=s.volley=s.hop=s.followup=null;game.api.bossBrain(e).charge=0;game.state.enemyShots=game.state.enemyShots.filter(q=>q.stapleOwner!==e);finish(e,2.4,true);
 for(const n of game.state.enemies)if(n.bossOwner===e)n.stun=Math.max(n.stun,2.4);
 const refund=Math.min(12,game.state.stats.maxInk-game.state.stats.ink);game.state.stats.ink+=refund;
 game.api.floatText(e.x,e.y-e.r-12,label+' · +'+Math.round(refund)+' INK','#287e72');game.api.burst(e.x,e.y,'#e0b54c',16);
 // Counterplay opens his armor and deals damage; waiting behind old cover does not.
 game.api.dealDamage(e,e.maxHp*.04,'physical');
}
function hop(e,next){
 const s=state(e),p=game.state.player,angle=Math.atan2(e.y-p.y,e.x-p.x);
 const target=safePoint(angle+Math.PI*.75,175);
 s.hop={x:e.x,y:e.y,tx:target.x,ty:target.y,age:0,duration:.65,next};
 game.api.floatText(e.x,e.y-e.r-12,'OTHER SIDE!','#ad741f');
}
function fireBurst(e,v){
 if(v.kind==='jam'){
  for(let i=0;i<8;i++){const a=Math.atan2(v.y-v.originY,v.x-v.originX)+i*Math.PI/4;shoot(e,v.originX,v.originY,v.originX+Math.cos(a)*100,v.originY+Math.sin(a)*100)}
  shoot(e,v.originX,v.originY,v.x,v.y,2,.06);
 }else shoot(e,v.originX,v.originY,v.x,v.y,3,.09);
 game.api.animateEnemyAction(e,'slam');
}
function startVolley(e,c,kind='fan'){
 const s=state(e);s.volley={kind,x:c.x,y:c.y,originX:c.originX,originY:c.originY,age:0,turn:1,total:kind==='jam'?3:4};
 fireBurst(e,s.volley);if(!c.combo)adds(e,kind==='jam'?3:2);finish(e,0);
}
function execute(e,c){
 const b=game.api.bossBrain(e),s=state(e);b.action={kind:c.kind,age:0};b.cast=null;e.bossWindup=0;
 if(c.kind==='fan')startVolley(e,c);
 else if(c.kind==='rush'||c.kind==='snap'){
  s.rush={route:c.route||[{x:c.x,y:c.y}],index:0,left:3,kind:c.kind,existingWalls:c.existingWalls,trail:[]};b.charge=4;
 }else if(c.kind==='punch'){
  for(const w of [...game.state.walls]){const q=game.api.nearestPointOnWall(c,w);if(q&&Math.hypot(q.x-c.x,q.y-c.y)<52)game.api.damageWall(w,w.hp+1,q.x,q.y)}
  game.api.burst(c.x,c.y,'#bd9557',20);adds(e,2);if(s.phase===1&&phases[0][s.turn%3]==='fan')s.turn++;finish(e,0);hop(e,'fan');
 }else if(c.kind==='zipper'){s.zipper={x:c.zx,y:c.zy,vx:c.vx,vy:c.vy,age:0,travel:Math.hypot(c.x-c.zx,c.y-c.zy)+70};finish(e,0)}
 else if(c.kind==='drag'){
  if(c.wall&&game.state.walls.includes(c.wall)){s.drag={wall:c.wall,original:c.wall.pts.map(p=>({...p})),age:0,direction:s.turn%2?1:-1,others:new Set(game.state.walls)};b.cd=0;b.recovery=0}else {finish(e,0);hop(e,'fan')}
 }else if(c.kind==='nests'){
  s.nestsJammed=0;s.nests=c.origins.map(p=>({...p,age:0,cd:.6,warning:0,shots:0,life:24}));adds(e,3);finish(e,.4);
 }else if(c.kind==='barrage'){s.barrage={origins:c.origins,x:c.x,y:c.y,age:0,turn:0};finish(e,2.2)}
 else if(c.kind==='jam')startVolley(e,c,'jam');
}
function endRush(e,blocked,fresh){
 const s=state(e),b=game.api.bossBrain(e);s.rush=null;b.charge=0;
 if(fresh)s.parries++;
 if(s.snaps>0){s.snaps--;finish(e,0);hop(e,s.phase===1?'rush':'snap');game.api.floatText(e.x,e.y-e.r-12,fresh?'INK JAM! · NEXT ANGLE':blocked?'COVER CRUSHED · NEXT ANGLE':'NEXT ANGLE!','#ad741f')}
 else if(s.parries===s.sequenceTotal){jamBoss(e);s.parries=0}
 else finish(e,.45);
}
function updateRush(e,dt){
 const b=game.api.bossBrain(e),s=state(e),r=s.rush;let remaining=Math.min(dt,.25);
 while(remaining>0&&s.rush){const step=Math.min(.016,remaining);remaining-=step;r.left-=step;
  const q=r.route[r.index],dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy)||1,travel=Math.min(d,300*step),nx=e.x+dx/d*travel,ny=e.y+dy/d*travel;
  const hits=game.state.walls.filter(w=>w.hp>0&&w.pts.slice(1).some((p,i)=>game.api.segmentIntersection(e,{x:nx,y:ny},w.pts[i],p)||game.api.pointSegDist(nx,ny,w.pts[i].x,w.pts[i].y,p.x,p.y)<=e.r+w.thick/2));
  const hit=hits.find(w=>!r.existingWalls.has(w))||hits[0]; // Reinforcing old cover with fresh ink still earns the jam.
  if(hit){
   const fresh=!r.existingWalls.has(hit);game.api.damageWall(hit,hit.hp+1,e.x,e.y);endRush(e,true,fresh);break;
  }
  r.trail.push({x:e.x,y:e.y});if(r.trail.length>10)r.trail.shift();e.x=nx;e.y=ny;
  if(game.api.touchesRefuge(e)){
   game.api.damageStevie(14*(1-game.state.stats.playerArmor),'Staple Snack warned '+r.kind,e);
   const q=safePoint(Math.atan2(e.y-game.state.player.y,e.x-game.state.player.x),160);e.x=q.x;e.y=q.y;endRush(e,false,false);break;
  }
  if(d<=travel+.1||r.left<=0){endRush(e,false,false);break}
 }
 b.charge=s.rush?r.left:0;
}
function updatePressure(e,dt){
 const b=game.api.bossBrain(e),s=state(e),p=game.state.player;
 s.pins=s.pins.filter(q=>{q.life-=dt;return q.life>0&&!wallAt(q.x,q.y,12)});
 for(const n of s.nests){
  n.age+=dt;n.life-=dt;
  if(wallAt(n.x,n.y,17)){if(n.life>0)game.api.floatText(n.x,n.y,'JAMMED!','#287e72');n.life=0;s.nestsJammed=(s.nestsJammed||0)+1;continue}
  // Nests are the only persistent damaging channel, and pause their clocks
  // during cover-destroying moves. Never combine a wipe with a surprise volley.
  if(s.drag||s.zipper||s.barrage||['punch','zipper','drag','jam','barrage'].includes(b.cast?.kind)||b.recovery>1.6)continue;
  if(n.warning>0){n.warning-=dt;if(n.warning<=0){shoot(e,n.x,n.y,n.tx,n.ty,2,.06);n.shots++;n.cd=1.2;if(n.shots%2===0)adds(e,1,n)}}
  else if((n.cd-=dt)<=0){n.warning=1.2;n.tx=p.x;n.ty=p.y}
 }
 const hadNests=s.nests.length;s.nests=s.nests.filter(n=>n.life>0);
 if(hadNests&&!s.nests.length&&s.nestsJammed===2){s.nestsJammed=0;jamBoss(e)}
 if(s.zipper){const z=s.zipper,before={x:z.x,y:z.y};z.age+=dt;const travel=Math.min(120*dt,z.travel);z.x+=z.vx*travel;z.y+=z.vy*travel;z.travel-=travel;
  for(const w of [...game.state.walls])if(w.pts.slice(1).some((q,i)=>game.api.segmentIntersection(before,z,w.pts[i],q)||game.api.pointSegDist(z.x,z.y,w.pts[i].x,w.pts[i].y,q.x,q.y)<22))game.api.damageWall(w,70*dt,z.x,z.y);
  if(z.travel<=0){s.zipper=null;finish(e,.35);s.followup='fan'}
 }
 if(s.drag){const d=s.drag;d.age+=dt;
  const crossed=game.state.walls.some(w=>!d.others.has(w)&&w.pts.slice(1).some((q,i)=>d.wall.pts.slice(1).some((v,j)=>game.api.segmentIntersection(w.pts[i],q,d.wall.pts[j],v))));
  if(!game.state.walls.includes(d.wall)||crossed||d.age>=3.5){s.drag=null;if(crossed||!game.state.walls.includes(d.wall))jamBoss(e);else {finish(e,0);hop(e,'fan')}}
  else {const shift=Math.sin(d.age/3.5*Math.PI/2)*45*d.direction,pts=d.original.map(q=>({x:game.api.clamp(q.x+shift,8,game.state.W-8),y:q.y}));
   if(pts.slice(1).every((q,i)=>game.api.pointSegDist(p.x,p.y,pts[i].x,pts[i].y,q.x,q.y)>90)){const delta=pts[0].x-d.wall.pts[0].x;for(const n of game.state.enemies)if(n.bossOwner===e&&n.hp>0&&d.wall.pts.slice(1).some((q,i)=>game.api.pointSegDist(n.x,n.y,d.wall.pts[i].x,d.wall.pts[i].y,q.x,q.y)<n.r+8))game.api.moveEnemySafely(n,delta,0);d.wall.pts=pts;}
  }
 }
 if(s.barrage){const a=s.barrage;a.age+=dt;if(a.age>=a.turn*.5){const q=a.origins[a.turn%2];shoot(e,q.x,q.y,a.x,a.y,3,.06);a.turn++}if(a.turn>=8){s.barrage=null;finish(e,.3)}}
}
function updateStapleBoss(e,dt){
 const b=game.api.bossBrain(e),s=state(e);if(!live(e))return;
 const phase=phaseFor(e);
 if(phase!==s.phase){if(s.hop){e.x=s.hop.tx;e.y=s.hop.ty}s.phase=phase;s.turn=phase===2?2:0;s.transition=2.8;s.rush=s.drag=s.zipper=s.barrage=s.volley=s.hop=s.followup=null;s.nests=[];s.nestsJammed=0;s.pins=[];s.deployments=[];s.snaps=0;s.parries=0;b.cast=null;b.charge=0;b.recovery=0;e.bossWindup=0;game.state.enemyShots=game.state.enemyShots.filter(q=>q.stapleOwner!==e);for(const n of game.state.enemies)if(n.bossOwner===e)n.stun=Math.max(n.stun,2.8);game.api.setMsg('Staple Snack · Phase '+phase+' · Rebuild while he jams!');game.api.playSound('bossEnter')}
 if(s.transition>0){s.transition=Math.max(0,s.transition-dt);b.cd=2.2;return}
 if(e.freeze>0||e.stun>0){if(s.hop){e.x=s.hop.tx;e.y=s.hop.ty}b.cast=null;e.bossWindup=0;s.rush=null;s.snaps=0;s.parries=0;s.barrage=null;s.drag=null;s.zipper=null;s.volley=null;s.hop=null;s.followup=null;b.charge=0;b.cd=Math.max(b.cd,1.5);return}
 b.recovery=Math.max(0,b.recovery-dt);if(b.action){b.action.age+=dt;if(b.action.age>.65)b.action=null}
 updateDeployments(e,dt);
 updatePressure(e,dt);
 if(s.hop){const h=s.hop;h.age=Math.min(h.duration,h.age+dt);const t=h.age/h.duration;e.x=h.x+(h.tx-h.x)*t;e.y=h.y+(h.ty-h.y)*t;if(t>=1){s.hop=null;cast(e,h.next,{combo:true})}return}
 if(s.volley){const v=s.volley;v.age+=dt;if(v.turn<v.total&&v.age>=v.turn*.65){fireBurst(e,v);v.turn++}if(v.turn>=v.total&&v.age>=(v.total-1)*.65+.8){s.volley=null;finish(e,.3)}return}
 if(s.rush){updateRush(e,dt);return}
 if(b.cast){b.cast.left-=dt;e.bossWindup=Math.max(0,b.cast.left);const progress=1-b.cast.left/b.cast.duration,click=Math.floor(progress*3);if(click>s.click){s.click=click;game.api.playSound('rock')}if(b.cast.left<=0)execute(e,b.cast);return}
 b.cd=Math.max(0,b.cd-dt);
 if(s.drag||s.zipper||s.barrage||b.recovery>0||b.cd>0)return;
 const followup=!!s.followup,kind=s.followup||phases[s.phase-1][s.turn++%3];s.followup=null;if(kind==='snap'){s.snaps=2;s.sequenceTotal=3;s.parries=0}else if(kind==='rush'){s.snaps=1;s.sequenceTotal=2;s.parries=0}cast(e,kind,{combo:followup});
}
function stapleTarget(e){
 const b=game.api.bossBrain(e),s=state(e);
 if(b.cast||s.transition>0||s.rush||s.drag||s.zipper||s.barrage||s.volley||s.hop||b.recovery>0||e.freeze>0||e.stun>0)return e;
 const p=game.state.player,angle=Math.atan2(e.y-p.y,e.x-p.x);
 return safePoint(angle+.4,175);
}
function moveStapleBossIdle(e,dt){
 const target=stapleTarget(e);if(target===e)return false;
 const p=game.state.player,distance=Math.hypot(e.x-p.x,e.y-p.y),angle=Math.atan2(e.y-p.y,e.x-p.x);
 // Short orbit steps keep the fort clear. Try the reverse arc or an outward
 // step when cover blocks him, rather than standing against the same wall.
 const candidates=[target,safePoint(angle-.4,175),safePoint(angle+.2,Math.max(175,distance+45))];
 for(const q of candidates){
  const dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy);if(d<2)continue;
  const travel=Math.min(d,e.speed*2.3*dt),nx=e.x+dx/d*travel,ny=e.y+dy/d*travel;
  if(Math.hypot(nx-p.x,ny-p.y)<Math.min(125,distance))continue;
  if(game.api.moveEnemySafely(e,nx-e.x,ny-e.y))return true;
 }
 return false;
}
function stapleContact(e){return true} // Only an explicitly warned rush can hurt Stevie.
function jamlingContact(e,dt=0){
 const owner=e.bossOwner,b=owner&&game.api.bossBrain(owner);
 if(b&&(['punch','zipper','drag'].includes(b.cast?.kind)||b.staple?.zipper||b.staple?.drag)){e.jamWarning=0;return true}
 if(e.freeze>0||e.stun>0){e.jamWarning=0;return true}
 if(!game.api.touchesRefuge(e)||game.api.shotBlocked(e.x,e.y,game.state.player.x,game.state.player.y,0)){e.jamWarning=0;return false}
 e.jamWarning=(e.jamWarning||0)+dt;
 if(e.jamWarning>=1.3){game.api.damageStevie(e.dmg*(1-game.state.stats.playerArmor),'Jammed staple warned snap',e);e.hp=0;game.api.killEnemy(e)}
 return true;
}
function stapleSnapshot(e){const b=game.api.bossBrain(e),s=b.staple;return s?{phase:s.phase,transition:s.transition,attack:b.cast?.kind||s.rush?.kind||s.volley?.kind||null,volley:s.volley?{...s.volley}:null,hop:s.hop?{...s.hop}:null,remainingSnaps:s.snaps,pins:s.pins.map(p=>({...p})),nests:s.nests.map(n=>({...n})),drag:!!s.drag,zipper:s.zipper?{...s.zipper}:null,barrage:!!s.barrage,deployments:s.deployments.map(q=>({...q})),adds:game.state.enemies.filter(n=>n.bossOwner===e).length}:null}
function moveStapleBoss(e,dx,dy){const b=game.api.bossBrain(e),s=b.staple;if(!s)return;for(const q of [...s.pins,...s.nests,...s.deployments,...(b.cast?.origins||[]),...(b.cast?.route||[]),...(s.rush?.route||[]),...(s.rush?.trail||[]),...(s.barrage?.origins||[]),...(s.hop?[s.hop]:[])]){q.x+=dx;q.y+=dy;if(q.tx!==undefined){q.tx+=dx;q.ty+=dy}}if(s.volley){s.volley.x+=dx;s.volley.y+=dy;s.volley.originX+=dx;s.volley.originY+=dy}if(s.zipper){s.zipper.x+=dx;s.zipper.y+=dy}if(s.drag)for(const q of s.drag.original){q.x+=dx;q.y+=dy}if(s.barrage){s.barrage.x+=dx;s.barrage.y+=dy}if(b.cast){b.cast.originX+=dx;b.cast.originY+=dy;if(b.cast.zx!==undefined){b.cast.zx+=dx;b.cast.zy+=dy}}}
function drawStapleBoss(e){
 const ctx=game.dom.ctx,b=game.api.bossBrain(e),s=b.staple;if(!s)return;const reduced=game.api.enemyMotionReduced();
 ctx.save();ctx.strokeStyle='#966425';ctx.fillStyle='#754918';ctx.lineWidth=2;ctx.font='bold 11px sans-serif';ctx.textAlign='center';
 const label=s.transition>0?'JAM! · REBUILD':b.recovery>0?'EXPOSED · '+b.recovery.toFixed(1)+'s':s.volley?'BURST '+s.volley.turn+'/'+s.volley.total:s.hop?'REPOSITION · WATCH THE NEXT ANGLE':'ARMORED · PHASE '+s.phase+' · '+['CLASSROOM MENACE','OFFICE SUPPLY RIOT','JAMMED!'][s.phase-1];
 const pad=Math.min(game.state.W/2,ctx.measureText(label).width/2+8);
 ctx.fillText(label,game.api.clamp(e.x,pad,game.state.W-pad),Math.max(85,e.y-e.r-24));
 if(b.recovery>0){ctx.strokeStyle='#287e72';ctx.lineWidth=3;ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+11,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<3;i++){const a=i*2.1+(reduced?0:b.recovery*3),x=e.x+Math.cos(a)*22,y=e.y-e.r-9+Math.sin(a)*6;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke()}}
 else if(!s.hop){ctx.strokeStyle='#966425';ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(e.x,e.y,e.r+9,i*2.1+.2,i*2.1+1.4);ctx.stroke()}}
 const warning=['rush','snap'].includes(b.cast?.kind)?b.cast:s.rush;
 if(warning){ctx.strokeStyle='#287e72';ctx.lineWidth=3;for(const w of game.state.walls)if(!warning.existingWalls.has(w)){ctx.beginPath();w.pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke()}}
 if(s.rush&&!reduced&&s.rush.trail.length){ctx.strokeStyle='rgba(173,116,31,.35)';ctx.lineWidth=e.r;ctx.beginPath();s.rush.trail.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.lineTo(e.x,e.y);ctx.stroke()}
 const staple=(x,y,r=9)=>{ctx.beginPath();ctx.moveTo(x-r,y+7);ctx.lineTo(x-r,y-6);ctx.lineTo(x+r,y-6);ctx.lineTo(x+r,y+7);ctx.stroke()};
 for(const q of s.deployments){
  const t=Math.min(1,q.age/q.duration),x=q.x+(q.tx-q.x)*t,y=q.y+(q.ty-q.y)*t-(reduced?0:Math.sin(t*Math.PI)*45);
  ctx.save();ctx.strokeStyle='#928276';ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(q.tx,q.ty,15,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  ctx.translate(x,y);if(!reduced)ctx.rotate(t*Math.PI*2);if(!game.api.drawStapleHelper()){staple(-3,0,8);staple(3,4,8);staple(0,-5,6)}ctx.restore();
 }
 if(s.hop){ctx.setLineDash([4,5]);ctx.beginPath();ctx.arc(s.hop.tx,s.hop.ty,e.r+7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
 if(s.volley){const v=s.volley;ctx.strokeStyle='#b34936';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(v.originX,v.originY);ctx.lineTo(v.x,v.y);ctx.stroke();ctx.setLineDash([]);ctx.fillText(v.turn===v.total?'LAST BURST · HOLD COVER':'KEEP PATCHING · '+(v.total-v.turn)+' BURSTS LEFT',game.state.W/2,95)}
 for(const p of s.pins)staple(p.x,p.y,7);
 for(const n of s.nests){ctx.fillStyle='#e7d1a9';ctx.beginPath();ctx.arc(n.x,n.y,18,0,Math.PI*2);ctx.fill();staple(n.x,n.y);staple(n.x-3,n.y+4);if(n.warning>0){ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(n.tx,n.ty);ctx.stroke();ctx.setLineDash([])}ctx.fillStyle='#754918';ctx.fillText('DRAW TO JAM',game.api.clamp(n.x,48,game.state.W-48),n.y+32)}
 if(s.zipper){staple(s.zipper.x,s.zipper.y,18);ctx.beginPath();ctx.arc(s.zipper.x,s.zipper.y,22,0,Math.PI*2);ctx.stroke()}
 if(s.drag){ctx.strokeStyle='#287e72';ctx.lineWidth=4;ctx.beginPath();s.drag.wall.pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke()}
 if(s.barrage)for(const p of s.barrage.origins)staple(p.x,p.y,13);
 if(b.cast){const c=b.cast;ctx.strokeStyle='#b34936';ctx.setLineDash([6,5]);ctx.beginPath();
  if(c.kind==='punch')ctx.arc(c.x,c.y,52,0,Math.PI*2);
  else if(c.kind==='jam')ctx.arc(e.x,e.y,70,0,Math.PI*2);
  else if(c.origins){for(const q of c.origins){ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(c.x,c.y);ctx.stroke();staple(q.x,q.y)}}
  else if(c.kind==='fan'){const a=Math.atan2(c.y-c.originY,c.x-c.originX),d=Math.hypot(c.x-c.originX,c.y-c.originY);for(const off of [-.09,0,.09]){ctx.moveTo(c.originX,c.originY);ctx.lineTo(c.originX+Math.cos(a+off)*d,c.originY+Math.sin(a+off)*d)}}
  else {ctx.moveTo(c.originX,c.originY);for(const q of c.route||[{x:c.x,y:c.y}])ctx.lineTo(q.x,q.y)}
  ctx.stroke();ctx.setLineDash([]);if(c.kind==='rush'||c.kind==='snap'){ctx.fillStyle='#287e72';ctx.font='bold 10px sans-serif';ctx.fillText('SNAP '+(s.sequenceTotal-s.snaps)+' / '+s.sequenceTotal+' · NEW INK = JAM',game.state.W/2,111)}ctx.fillStyle='#8f332b';ctx.font='bold 10px sans-serif';ctx.fillText(names[c.kind],game.state.W/2,Math.min(game.state.H-65,95));
 }
 if(s.transition>0&&!reduced){ctx.strokeStyle='#966425';for(let i=0;i<3;i++)staple(e.x+Math.cos(s.transition*5+i*2)*40,e.y-35+i*10,5)}
 ctx.restore();
}
const api={moveStapleBossIdle,stapleEntrancePoint:()=>safePoint(-2.4,175),isStapleBoss,updateStapleBoss,stapleTarget,stapleContact,stapleDamageMultiplier:e=>game.api.bossBrain(e).recovery>0?1.8:.55,stapleHopHeight:e=>{const h=game.api.bossBrain(e).staple?.hop;return h?Math.sin(Math.PI*h.age/h.duration)*55:0},jamlingContact,stapleSnapshot,moveStapleBoss,drawStapleBoss,pinStapleShot,clearStapleBoss};Object.assign(game.api,api);return api;
};
