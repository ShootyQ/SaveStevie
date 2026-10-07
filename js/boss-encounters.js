/* Boss encounter combat and handmade telegraphs; bounded hazards, no draw RNG. */
DoodleDefender.systems.bossEncounters=function(game){
let brains=new WeakMap(),marks=[],clock=0;
const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let reduced=!!preference?.matches;preference?.addEventListener?.('change',e=>{reduced=e.matches});
function isFirstBoss(e){return e.waveBoss&&e.type==='boss'&&game.state.wave===5}
function earlyBoss(e){return e.waveBoss&&(game.state.wave===5||game.state.wave===10)}
const colors={boss:'#9b3549',stapler:'#ad741f',crayon:'#8751ac',eraser:'#b95176'};
function bossBrain(e){let b=brains.get(e);if(!b){b={cd:3,cast:null,turn:0,moveCd:0,target:null,enclosed:false,enclosedAge:0,damageBudget:Math.max(30,e.maxHp*.045)*.5,contactCd:0,recovery:0,charge:0,action:null,repeat:0};brains.set(e,b)}return b}
function resetBossEncounters(){brains=new WeakMap();marks=[];clock=0}
function inside(e,w){let yes=false;const pts=w.pts;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>e.y)!==(b.y>e.y)&&e.x<(b.x-a.x)*(e.y-a.y)/(b.y-a.y)+a.x)yes=!yes}return yes}
function nearestBossWall(e,range=150){let best=null;for(const w of game.state.walls){const p=game.api.nearestPointOnWall(e,w);if(!p)continue;const d=Math.hypot(p.x-e.x,p.y-e.y);if(d<range){range=d;best={wall:w,...p}}}return best}
function updateBossDamageBudgets(dt){for(const e of game.state.enemies)if(e.waveBoss){const b=bossBrain(e),rate=Math.max(30,e.maxHp*.045);b.damageBudget=Math.min(rate*.5,b.damageBudget+rate*dt)}}
function limitBossDamage(e,amount,kind){if(!e.waveBoss||(kind==='reflected'&&isFirstBoss(e)))return amount;const b=bossBrain(e),guard=isFirstBoss(e)&&!b.enclosed&&b.recovery<=0?.25:1,actual=Math.min(amount,b.damageBudget*guard);b.damageBudget-=actual/guard;return actual}
function pushThroughBossStrokes(e,dt){
 for(const w of [...game.state.walls]){if(w.hp<=0)continue;const p=game.api.nearestPointOnWall(e,w);
  if(p&&Math.hypot(p.x-e.x,p.y-e.y)<e.r*.8+w.thick/2){
   // No explosion chain from discarded body scribbles: the boss tears them away.
   w.hp-=Math.max(300,w.maxHp*2)*dt;
   if(w.hp<=0){game.state.walls=game.state.walls.filter(other=>other!==w);game.api.burst(p.x,p.y,'#bca88a',6)}
  }
 }
}
function bossDamageMultiplier(e){if(!e.waveBoss)return 1;const b=bossBrain(e);return b.enclosed||b.recovery>0?1.35:isFirstBoss(e)?.25:1}
function bossWallHit(e){if(!e.waveBoss)return null;const hit=nearestBossWall(e,e.r+20);return hit&&Math.hypot(hit.x-e.x,hit.y-e.y)<=e.r+hit.wall.thick/2+3?{wall:hit.wall,seg:1}:null}
function bossContact(e){
 const b=bossBrain(e),p=game.state.player;if(b.contactCd<=0){game.api.damageStevie(10*(1-game.state.stats.playerArmor),game.api.monsterName(e.type)+' contact',e);b.contactCd=1.2}
 const angle=Math.atan2(e.y-p.y,e.x-p.x),distance=e.r+Math.hypot(game.api.refugeBounds().halfWidth,game.api.refugeBounds().halfHeight)+6;
 for(let i=0;i<12;i++){const a=angle+i*Math.PI/6,x=p.x+Math.cos(a)*distance,y=p.y+Math.sin(a)*distance;if(game.api.moveEnemySafely(e,x-e.x,y-e.y))break}
 b.moveCd=0;return true;
}
function summon(e,type,count,x=e.x,y=e.y){const existing=game.state.enemies.filter(n=>n.bossOwner===e&&n.hp>0).length;for(let i=0;i<Math.min(count,6-existing);i++){const a=i*2.4+bossBrain(e).turn;const n=game.api.spawnEnemy(false,x+Math.cos(a)*35,y+Math.sin(a)*35,type);if(n)n.bossOwner=e}game.api.animateEnemyAction(e,'summon')}
function volley(e,cast,count,kind){const angle=Math.atan2(cast.y-e.y,cast.x-e.x);for(let i=0;i<count&&game.state.enemyShots.length<32;i++){const a=angle+(i-(count-1)/2)*.18;game.state.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*125,vy:Math.sin(a)*125,life:3,r:4,damage:6,bossKind:kind})}game.api.animateEnemyAction(e,'fire')}
// First encounter: three readable attacks. All targeting is locked at launch.
function firstBossCurvePlan(e,side){
 const p=game.state.player,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,nx=-dy/d*side,ny=dx/d*side;
 const x=e.x+nx*(e.r+8),y=e.y+ny*(e.r+8),spread=Math.min(110,game.state.W*.28);
 const cx=game.api.clamp(x+nx*spread,9,game.state.W-9),cy=game.api.clamp(y+ny*spread,85,game.state.H-9);
 return {x,y,cx,cy,targetX:p.x,targetY:p.y,nx,ny,duration:Math.max(1.8,Math.hypot(p.x-x,p.y-y)/125+.5)};
}
function firstBossCurve(e,side,kind){
 if(game.state.enemyShots.length>=32)return;
 const {x,y,cx,cy,targetX,targetY,nx,ny,duration}=firstBossCurvePlan(e,side);
 game.state.enemyShots.push({x,y,vx:nx*125,vy:ny*125,r:kind==='mirror-orb'?9:6,damage:kind==='mirror-orb'?9:5,life:duration+1,age:0,duration,
  startX:x,startY:y,controlX:cx,controlY:cy,targetX,targetY,owner:e,bossKind:kind,returnable:true,reflected:false,trail:[]});
}
function firstBossLobTargets(e){
 const p=game.state.player,safe=p.r+26;
 const candidates=game.state.walls.filter(w=>w.hp>0).map(w=>game.api.nearestPointOnWall(e,w)).filter(q=>q&&Math.hypot(q.x-p.x,q.y-p.y)>safe).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));
 const targets=[];
 for(let i=0;i<2;i++){
  let q=candidates.find(q=>i===0||Math.hypot(q.x-candidates[0].x,q.y-candidates[0].y)>75);
  if(!q){const angle=Math.atan2(e.y-p.y,e.x-p.x)+(i?-.8:.8);q={x:game.api.clamp(p.x+Math.cos(angle)*(safe+70),45,game.state.W-45),y:game.api.clamp(p.y+Math.sin(angle)*(safe+70),110,game.state.H-45)}}
  targets.push({x:q.x,y:q.y});
 }
 return targets;
}
function firstBossLobs(e,targets){
 for(const q of targets){
  if(game.state.enemyShots.length>=32)break;
  // Lobs only damage ink walls, never Stevie, even if a small screen moves the marker.
  game.state.enemyShots.push({x:e.x,y:e.y,vx:0,vy:0,r:6,damage:0,life:1.5,age:0,duration:1.5,startX:e.x,startY:e.y,targetX:q.x,targetY:q.y,owner:e,bossKind:'paper-lob',trail:[]});
 }
}
function shotCircleTime(x,y,nx,ny,cx,cy,r){const dx=nx-x,dy=ny-y,px=x-cx,py=y-cy,a=dx*dx+dy*dy,c=px*px+py*py-r*r;if(c<=0)return 0;if(!a)return null;const b=2*(px*dx+py*dy),disc=b*b-4*a*c;if(disc<0)return null;const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null}
function returnWallHit(s,nx,ny){
 let best=null;
 for(const w of game.state.walls){if(w.hp<=0||w.life<=0)continue;const pad=w.thick/2+s.r;
  for(let i=1;i<w.pts.length;i++){
   const a=w.pts[i-1],b=w.pts[i];
   const touches=t=>{const x=s.x+(nx-s.x)*t,y=s.y+(ny-s.y)*t;return game.api.segmentIntersection({x:s.x,y:s.y},{x,y},a,b)||Math.min(game.api.pointSegDist(s.x,s.y,a.x,a.y,b.x,b.y),game.api.pointSegDist(x,y,a.x,a.y,b.x,b.y),game.api.pointSegDist(a.x,a.y,s.x,s.y,x,y),game.api.pointSegDist(b.x,b.y,s.x,s.y,x,y))<=pad};
   if(!touches(1))continue;let lo=0,hi=1;for(let j=0;j<10;j++){const mid=(lo+hi)/2;if(touches(mid))hi=mid;else lo=mid}
   if(!best||hi<best.t)best={t:hi,wall:w};
  }
 }
 return best;
}
function updateFirstBossShot(s,dt){
 if(!s.owner||s.owner.hp<=0||!game.state.enemies.includes(s.owner))return false;
 let left=Math.min(dt,Math.max(0,s.life));
 while(left>1e-8){
  const step=Math.min(.025,left);left-=step;s.life-=step;s.age+=step;
  let nx,ny;
  if(s.bossKind==='paper-lob'){
   const t=Math.min(1,s.age/s.duration);nx=s.startX+(s.targetX-s.startX)*t;ny=s.startY+(s.targetY-s.startY)*t-Math.sin(t*Math.PI)*85;
   if(t>=1-1e-8){for(const w of [...game.state.walls]){const q=game.api.nearestPointOnWall({x:s.targetX,y:s.targetY},w);if(q&&Math.hypot(q.x-s.targetX,q.y-s.targetY)<46)game.api.damageWall(w,100,q.x,q.y)}game.api.burst(s.targetX,s.targetY,'#ae794a',10);game.api.floatText(s.targetX,s.targetY,'PAPER POP!','#98612e');return false}
  }else if(s.reflected){
   const dx=s.owner.x-s.x,dy=s.owner.y-s.y,d=Math.hypot(dx,dy)||1;s.vx=dx/d*245;s.vy=dy/d*245;nx=s.x+s.vx*step;ny=s.y+s.vy*step;
   if(shotCircleTime(s.x,s.y,nx,ny,s.owner.x,s.owner.y,s.owner.r+s.r)!==null){
    const boss=s.owner,b=bossBrain(boss);b.recovery=3;b.cast=null;boss.bossWindup=0;b.cd=Math.max(b.cd,1.2);
    const levels=Object.values(game.state.inks).reduce((a,n)=>a+n,0),bonus=1+Math.min(.3,levels*.025);
    game.api.dealDamage(boss,boss.maxHp*(s.bossKind==='mirror-orb'?.12:.04)*bonus,'reflected');
    game.api.animateEnemyAction(boss,'slam');game.api.burst(boss.x,boss.y,'#4c9c97',12);game.api.floatText(boss.x,boss.y-boss.r-14,'EXPOSED!','#287a78');
    if(boss.hp<=0)game.api.killEnemy(boss);return false;
   }
  }else{
   const t=Math.min(1,s.age/s.duration),u=1-t;
   if(s.age<=s.duration){nx=u*u*s.startX+2*u*t*s.controlX+t*t*s.targetX;ny=u*u*s.startY+2*u*t*s.controlY+t*t*s.targetY;s.vx=(nx-s.x)/step;s.vy=(ny-s.y)/step}
   else{nx=s.x+s.vx*step;ny=s.y+s.vy*step}
   const p=game.state.player,impact=shotCircleTime(s.x,s.y,nx,ny,p.x,p.y,p.r+s.r),wall=returnWallHit(s,nx,ny);
   if(wall&&(impact===null||wall.t<=impact)){
    nx=s.x+(nx-s.x)*wall.t;ny=s.y+(ny-s.y)*wall.t;s.reflected=true;s.age=0;s.life=6;s.trail=[];
    game.api.damageWall(wall.wall,6,nx,ny);game.api.burst(nx,ny,'#61aca0',6);game.api.floatText(nx,ny-10,'RETURN!','#287a78');game.api.playSound('rock');
   }else if(impact!==null){game.api.damageStevie(s.damage*(1-game.state.stats.playerArmor),'King Doodle '+s.bossKind,s);game.api.burst(p.x,p.y,'#9b3549',6);return false}
  }
  s.x=nx;s.y=ny;
  if(!reduced){s.trail.push({x:nx,y:ny});if(s.trail.length>12)s.trail.shift()}
 }
 return s.life>0;
}
function moveFirstBossShots(dx,dy){for(const s of game.state.enemyShots)if(s.owner){for(const key of ['startX','controlX','targetX'])if(Number.isFinite(s[key]))s[key]+=dx;for(const key of ['startY','controlY','targetY'])if(Number.isFinite(s[key]))s[key]+=dy;for(const p of s.trail||[]){p.x+=dx;p.y+=dy}}}
function execute(e,b,c){
 const furious=e.hp<e.maxHp*.4;b.action={kind:c.kind,age:0};
 if(c.kind==='mirror-orb'||c.kind==='arc-fan'){
  if(c.kind==='mirror-orb')firstBossCurve(e,b.turn%2?1:-1,'mirror-orb');else for(const side of [-1,1])firstBossCurve(e,side,'arc-spark');
  game.api.animateEnemyAction(e,'fire');
 }else if(c.kind==='paper-lob'){firstBossLobs(e,c.targets);game.api.animateEnemyAction(e,'summon');
 }else if(c.kind==='breakout'){
  for(const w of [...game.state.walls]){const p=game.api.nearestPointOnWall(e,w);if(p&&(Math.hypot(p.x-e.x,p.y-e.y)<e.r+100||(w.closed&&inside(e,w)))){game.state.walls=game.state.walls.filter(other=>other!==w);game.api.burst(p.x,p.y,'#bca88a',8)}}
  b.enclosed=false;b.enclosedAge=0;b.recovery=.35;b.moveCd=0;game.api.animateEnemyAction(e,'slam');game.api.floatText(e.x,e.y-e.r-12,'BREAKOUT!','#9b3549');
 }else if(c.kind==='charge'){
  b.charge=.5;b.repeat=furious&&!c.repeat?1:0;b.chargeX=c.x;b.chargeY=c.y;game.api.animateEnemyAction(e,'slam');
  if(c.wall&&game.state.walls.includes(c.wall)&&Math.hypot(c.x-e.x,c.y-e.y)<145)game.api.damageWall(c.wall,earlyBoss(e)?(furious?150:110):(furious?80:60),c.x,c.y);
 }else if(c.kind==='swipe'){
  for(const w of [...game.state.walls]){const p=game.api.nearestPointOnWall(e,w);if(p&&Math.hypot(p.x-e.x,p.y-e.y)<130)game.api.damageWall(w,earlyBoss(e)?(furious?140:100):(furious?90:65),p.x,p.y)}
  game.api.animateEnemyAction(e,'erase',{x:c.x,y:c.y});b.recovery=1.5;
 }else if(c.kind==='clean'){
  e.burn=0;e.poison=0;b.recovery=2;game.api.animateVoidHit(e);volley(e,c,furious?5:3,'crumb');
 }else if(c.kind==='paint'){
  const kinds=['red','blue','green'];for(let i=0;i<(furious?2:1)&&marks.length<8;i++)marks.push({x:c.x+(i?45:0),y:c.y,r:42,age:0,life:5,kind:kinds[(b.turn+i)%3],owner:e,hatched:false});game.api.animateEnemyAction(e,'summon');
 }else if(c.kind==='summon')summon(e,'mini',2);
 else volley(e,c,e.type==='stapler'?(furious?5:3):3,e.type==='stapler'?'staple':e.type==='crayon'?'crayon':'ink');
 b.cd=isFirstBoss(e)?3.2:earlyBoss(e)?(furious?2.5:3.5):(furious?3.2:4.5);b.turn++;b.cast=null;e.bossWindup=0;
}
function updateBossEncounter(e,dt){
 const b=bossBrain(e);if(b.action){b.action.age+=dt;if(b.action.age>.65)b.action=null}b.contactCd=Math.max(0,b.contactCd-dt);b.recovery=Math.max(0,b.recovery-dt);
 b.enclosed=game.state.walls.some(w=>{if(!w.closed||w.hp<=0||w.life<=0||!inside(e,w))return false;const p=game.api.nearestPointOnWall(e,w);return p&&Math.hypot(p.x-e.x,p.y-e.y)>e.r+w.thick/2+8});
 b.enclosedAge=b.enclosed?b.enclosedAge+dt:0;
 if(e.hp<=0||e.freeze>0||e.stun>0){b.cast=null;b.charge=0;b.repeat=0;e.bossWindup=0;b.cd=Math.max(b.cd,1);return}
 if(b.enclosedAge>=1.8&&!b.cast&&b.charge<=0){b.cast={kind:'breakout',x:e.x,y:e.y,left:1.2};e.bossWindup=1.2;return}
 if(b.cast){b.cast.left-=dt;e.bossWindup=Math.max(0,b.cast.left);if(b.cast.left<=0)execute(e,b,b.cast);return}
 if(b.charge>0){b.charge=Math.max(0,b.charge-dt);const dx=b.chargeX-e.x,dy=b.chargeY-e.y,m=Math.hypot(dx,dy)||1;if(!game.api.moveEnemySafely(e,dx/m*160*dt,dy/m*160*dt)){b.charge=0;b.recovery=1.2;b.repeat=0}
  if(b.charge<=0&&b.repeat){b.repeat=0;b.cast={kind:'charge',x:game.state.player.x,y:game.state.player.y,left:1.2,repeat:true};e.bossWindup=1.2}return}
 if(b.recovery>0)return;
 if(earlyBoss(e)&&b.enclosed)b.cd=Math.min(b.cd,1.8);
 b.cd-=dt;if(b.cd>0)return;
 const wall=nearestBossWall(e),player=game.state.player;
 let kind=isFirstBoss(e)?['mirror-orb','arc-fan','paper-lob'][b.turn%3]:e.type==='stapler'?(b.turn%2===0?'charge':'volley'):e.type==='crayon'?(b.turn%4===3?'volley':'paint'):e.type==='eraser'?(wall?'swipe':'clean'):(b.turn%3===2?'summon':'volley');
 if(!isFirstBoss(e)&&b.enclosed&&wall&&e.type!=='stapler'&&e.type!=='eraser'&&(earlyBoss(e)||b.turn%2===1))kind='swipe';
 const target=(kind==='swipe'||kind==='charge')&&wall?wall:player;
 if(isFirstBoss(e))game.api.floatText(e.x,e.y-e.r-14,kind==='mirror-orb'?'DRAW TO RETURN!':kind==='arc-fan'?'SIDE SPARKS!':'WATCH YOUR WALLS!','#9b3549');
 b.cast={kind,x:kind==='swipe'?e.x:target.x,y:kind==='swipe'?e.y:target.y,wall:target.wall,left:1.2};
 if(kind==='paper-lob')b.cast.targets=firstBossLobTargets(e);
 e.bossWindup=1.2;
}
function bossIgnoredWalls(e){return new Set(game.state.walls.filter(w=>{const p=game.api.nearestPointOnWall(e,w);return p&&Math.hypot(p.x-e.x,p.y-e.y)<e.r*.8+w.thick/2}))}
function bossPathClear(e,x,y){return !game.api.shotBlocked(e.x,e.y,x,y,e.r+1,bossIgnoredWalls(e))}
function bossMoveClear(e,x,y){return game.api.bouncePathClear(e,x,y,0,bossIgnoredWalls(e))}

function bossTarget(e){
 const b=bossBrain(e);if(b.cast||b.recovery>0||b.charge>0)return {x:e.x,y:e.y};
 if(b.enclosed){b.detour=false;return {x:e.x,y:e.y}}
 if(b.detour&&b.target&&Math.hypot(b.target.x-e.x,b.target.y-e.y)>4&&bossPathClear(e,b.target.x,b.target.y))return b.target;
 b.detour=false;
 if(b.moveCd<=0||!b.target){
  const player=game.state.player,first=isFirstBoss(e),direct=bossPathClear(e,player.x,player.y),desired=Math.atan2(e.y-player.y,e.x-player.x)+.7;
  const rx=Math.max(35,game.state.W/2-e.r-18),ry=Math.max(45,game.state.H/2-(game.state.W>game.state.H?e.r+18:105)),direction=b.turn%2?1:-1;
  const orbit=Math.atan2((e.y-player.y)/ry,(e.x-player.x)/rx)+direction*.5;
  let best=null,score=Infinity,detour=false;
  for(let i=0;i<12;i++){const a=i*Math.PI/6+b.turn*.25,d=e.type==='crayon'?150:95,x=game.api.clamp(player.x+Math.cos(a)*(first?rx:d),e.r,game.state.W-e.r),y=game.api.clamp(player.y+Math.sin(a)*(first?ry:d),e.r,game.state.H-e.r);
   if(first){if(game.api.pointSegDist(player.x,player.y,e.x,e.y,x,y)<e.r+player.r+20)continue;const current=Math.atan2((e.y-player.y)/ry,(e.x-player.x)/rx),ahead=((a-current)*direction+Math.PI*4)%(Math.PI*2);if(ahead<.12||ahead>1.5)continue}
   if(!bossPathClear(e,x,y))continue;const s=Math.hypot(x-(player.x+Math.cos(first?orbit:desired)*(first?rx:d)),y-(player.y+Math.sin(first?orbit:desired)*(first?ry:d)))*.8+Math.hypot(x-e.x,y-e.y)*.2;if(s<score){score=s;best={x,y}}
  }
  // Aim beyond open wall ends so a boss can make a real detour, rather than
  // greedily bouncing between two points along the middle of a long barrier.
  if(!best&&!direct)for(const w of game.state.walls){
   if(w.closed||w.pts.length<2)continue;
   for(const end of [0,w.pts.length-1]){
    const p=w.pts[end],other=w.pts[end===0?1:end-1],dx=p.x-other.x,dy=p.y-other.y,length=Math.hypot(dx,dy)||1,tx=dx/length,ty=dy/length,nx=-ty,ny=tx,side=(e.x-p.x)*nx+(e.y-p.y)*ny>=0?1:-1,pad=e.r+w.thick/2+8;
    for(const detourSide of [side,-side]){
    const x=p.x+tx*pad+nx*detourSide*pad,y=p.y+ty*pad+ny*detourSide*pad;
    if(Math.hypot(x-e.x,y-e.y)<4||x<e.r||y<e.r||x>game.state.W-e.r||y>game.state.H-e.r||!bossPathClear(e,x,y))continue;
    const s=Math.hypot(x-e.x,y-e.y)+Math.hypot(x-player.x,y-player.y);if(s<score){score=s;best={x,y}}
    }
   }
  }
  if(best&&!direct)detour=true;
  // Probe local sideways routes around long barriers if no orbit point is reachable.
  if(!best&&!direct)for(let i=0;i<12;i++){const a=i*Math.PI/6,x=e.x+Math.cos(a)*70,y=e.y+Math.sin(a)*70;if(x<e.r||y<e.r||x>game.state.W-e.r||y>game.state.H-e.r||!bossPathClear(e,x,y))continue;const s=Math.hypot(x-player.x,y-player.y);if(s<score){score=s;best={x,y}}}
  b.target=best||(first?{x:e.x,y:e.y}:direct?player:(nearestBossWall(e)||player));b.moveCd=.5;b.detour=detour;
 }
 return b.target;
}
function updateBossFields(dt){clock+=dt;for(const e of game.state.enemies)if(e.waveBoss)bossBrain(e).moveCd-=dt;
 for(const m of marks){if(m.owner.hp<=0||!game.state.enemies.includes(m.owner)){m.age=m.life;continue}const before=m.age;m.age+=dt;const active=Math.max(0,Math.min(m.age,m.life)-Math.max(before,1.2));
  if(m.age<1.2)continue;
  // Drawing through the warning can cancel a crayon rune before it hatches.
  if(game.state.walls.some(w=>{const p=game.api.nearestPointOnWall(m,w);return p&&Math.hypot(p.x-m.x,p.y-m.y)<m.r*.7})){m.age=m.life;continue}
  if(m.kind==='green'&&!m.hatched){summon(m.owner,'mini',2,m.x,m.y);m.hatched=true}
  if(game.api.withinRadius(m.x,m.y,game.state.player.x,game.state.player.y,m.r)){
   if(m.kind==='red')game.api.damageStevie(4*active*(1-game.state.stats.playerArmor),'Count Crayon red doodle',m);
   if(m.kind==='blue')game.state.stats.ink=Math.max(0,game.state.stats.ink-4*active);
  }
 }marks=marks.filter(m=>m.age<m.life);
}
function moveBossFields(dx,dy){moveFirstBossShots(dx,dy);for(const m of marks){m.x+=dx;m.y+=dy}for(const e of game.state.enemies)if(e.waveBoss){const b=bossBrain(e);for(const p of [b.cast,b.target])if(p&&p!==game.state.player){p.x+=dx;p.y+=dy;for(const q of p.targets||[]){q.x+=dx;q.y+=dy}}if(b.chargeX!==undefined){b.chargeX+=dx;b.chargeY+=dy}}}
function bossEncounterSnapshot(){return {marks:marks.map(m=>({x:m.x,y:m.y,age:m.age,kind:m.kind})),bosses:game.state.enemies.filter(e=>e.waveBoss).map(e=>{const b=bossBrain(e);return {type:e.type,enclosed:b.enclosed,cast:b.cast?{kind:b.cast.kind,x:b.cast.x,y:b.cast.y,left:b.cast.left,targets:b.cast.targets?.map(p=>({...p}))}:null,recovery:b.recovery,charge:b.charge,action:b.action?{...b.action}:null}})}}
function drawLobTarget(ctx,x,y,progress){
 ctx.save();ctx.translate(x,y);ctx.strokeStyle='#b07535';ctx.fillStyle='rgba(190,122,48,.13)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,46,0,Math.PI*2);ctx.fill();ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);
 ctx.beginPath();ctx.arc(0,0,34,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();ctx.beginPath();ctx.moveTo(-9,-9);ctx.lineTo(9,9);ctx.moveTo(9,-9);ctx.lineTo(-9,9);ctx.stroke();ctx.restore();
}
function drawFirstBossShot(s){
 const ctx=game.dom.ctx,color=s.reflected?'#278f82':s.bossKind==='mirror-orb'?'#a84691':'#b84956';
 ctx.save();
 if(s.bossKind==='paper-lob')drawLobTarget(ctx,s.targetX,s.targetY,Math.min(1,s.age/s.duration));
 if(!reduced&&s.trail.length>1){ctx.strokeStyle=color;ctx.lineWidth=s.r*.7;ctx.globalAlpha=.35;ctx.lineCap='round';ctx.beginPath();s.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.globalAlpha=1}
 ctx.translate(s.x,s.y);
 if(s.bossKind==='paper-lob'){
  if(!reduced)ctx.rotate(s.age*6);ctx.fillStyle='#f4e5c5';ctx.strokeStyle='#74563e';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(-2,-9);ctx.lineTo(7,-6);ctx.lineTo(10,2);ctx.lineTo(3,8);ctx.lineTo(-8,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-8,-4);ctx.lineTo(3,1);ctx.lineTo(7,-6);ctx.moveTo(3,1);ctx.lineTo(2,7);ctx.stroke();
 }else{
  const pulse=reduced?0:Math.sin(s.age*18)*1.5;ctx.fillStyle=color;ctx.strokeStyle='#412f43';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,0,s.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=s.reflected?'#9cddbe':'#e8abd7';ctx.beginPath();ctx.arc(0,0,s.r+3+pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff5cf';ctx.beginPath();ctx.arc(-2,-2,s.r*.32,0,Math.PI*2);ctx.fill();
  if(s.bossKind==='mirror-orb'){ctx.strokeStyle='#fff5cf';ctx.lineWidth=1.3;for(let i=0;i<4;i++){const a=i*Math.PI/2+(reduced?0:s.age*3);ctx.beginPath();ctx.moveTo(Math.cos(a)*(s.r+6),Math.sin(a)*(s.r+6));ctx.lineTo(Math.cos(a)*(s.r+10),Math.sin(a)*(s.r+10));ctx.stroke()}}
 }
 ctx.restore();
}
function drawBossEncounters(){const ctx=game.dom.ctx;
 const arrival=game.api.bossArrivalSnapshot();
 if(arrival){
  const x=game.api.clamp(arrival.x,35,game.state.W-35),y=arrival.side==='top'?Math.min(125,game.state.H*.4):game.api.clamp(arrival.y,35,game.state.H-35),pulse=reduced?0:Math.sin(clock*18)*3;
  ctx.save();ctx.translate(x+pulse,y);ctx.fillStyle='rgba(70,42,35,.22)';ctx.beginPath();ctx.ellipse(0,0,30+(2.4-arrival.left)*7,14,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9b3549';ctx.lineWidth=2;
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*11-4,-12);ctx.lineTo(i*11+4,0);ctx.lineTo(i*11-3,12);ctx.stroke()}ctx.restore();
 }

 for(const m of marks){const color=m.kind==='red'?'#c34937':m.kind==='blue'?'#3887ba':'#57913b';ctx.save();ctx.translate(m.x,m.y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=m.age<1.2?.45:.2;ctx.beginPath();ctx.arc(0,0,m.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.8;ctx.lineWidth=2;ctx.setLineDash(m.age<1.2?[5,5]:[]);ctx.stroke();ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText(m.kind==='green'?'✦':m.kind==='blue'?'~':'!',0,6);ctx.restore()}
 for(const e of game.state.enemies){if(!e.waveBoss||e.hp<=0)continue;const b=bossBrain(e);ctx.save();ctx.strokeStyle=colors[e.type];ctx.fillStyle=colors[e.type];ctx.lineWidth=2;
  if(isFirstBoss(e)){
   ctx.strokeStyle=b.recovery>0?'#278f82':'#6e586d';ctx.fillStyle=ctx.strokeStyle;ctx.setLineDash(b.recovery>0?[]:[3,5]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+12,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
   if(b.recovery>0){ctx.strokeStyle='#d09b34';for(let i=0;i<3;i++){const angle=i*Math.PI*2/3+(reduced?0:clock*3),x=e.x+Math.cos(angle)*20,y=e.y-e.r-12+Math.sin(angle)*5;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke()}}
   ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(b.recovery>0?'EXPOSED · '+Math.ceil(b.recovery)+'s':'GUARDED',game.api.clamp(e.x,60,game.state.W-60),Math.min(game.state.H-10,e.y+e.r+23));ctx.strokeStyle=colors[e.type];ctx.fillStyle=colors[e.type];
  }
  if(b.enclosed||b.recovery>0){ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+8+(reduced?0:Math.sin(clock*5)*2),0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
  if(b.cast&&isFirstBoss(e)&&['mirror-orb','arc-fan','paper-lob'].includes(b.cast.kind)){
   const c=b.cast;
   if(c.kind==='paper-lob')for(const q of c.targets)drawLobTarget(ctx,q.x,q.y,1-c.left/1.2);
   else{ctx.strokeStyle='#a84691';ctx.globalAlpha=.5;ctx.setLineDash([5,7]);for(const side of c.kind==='arc-fan'?[-1,1]:[b.turn%2?1:-1]){const p=firstBossCurvePlan(e,side);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.cx,p.cy,p.targetX,p.targetY);ctx.stroke()}ctx.setLineDash([]);ctx.globalAlpha=1}
   ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(c.kind==='paper-lob'?'PAPER BOMBS · REBUILD':c.kind==='arc-fan'?'TWIN ARCS · RETURN':'ORB · DRAW TO RETURN',game.api.clamp(e.x,85,game.state.W-85),Math.max(110,e.y-e.r-18));
  }else if(b.cast){const c=b.cast;ctx.setLineDash([6,5]);ctx.beginPath();if(c.kind==='charge'||c.kind==='volley'){ctx.moveTo(e.x,e.y);ctx.lineTo(c.x,c.y)}else ctx.arc(c.x,c.y,c.kind==='breakout'?e.r+100:c.kind==='swipe'?130:42,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-c.left/1.2));ctx.stroke()}
  if(b.action&&!reduced){const t=b.action.age/.65;ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=(1-t)*.7;
   if(b.action.kind==='breakout'||b.action.kind==='swipe'||b.action.kind==='clean'){
    ctx.beginPath();ctx.arc(0,0,e.r+10+t*65,-.8+t,1.8+t);ctx.stroke();
    for(let i=0;i<6;i++){const a=i*.7,d=e.r+8+t*35;ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d,2+i%2,0,Math.PI*2);ctx.fill()}
   }else if(b.action.kind==='paint'||b.action.kind==='summon'){
    for(let i=0;i<4;i++){ctx.strokeStyle=['#c34937','#3887ba','#57913b','#8751ac'][i];const a=i*Math.PI/2+t;ctx.beginPath();ctx.moveTo(Math.cos(a)*(e.r+5),Math.sin(a)*(e.r+5));ctx.lineTo(Math.cos(a)*(e.r+18+t*10),Math.sin(a)*(e.r+18+t*10));ctx.stroke()}
   }else{ctx.beginPath();ctx.arc(0,0,e.r+5+t*20,0,Math.PI*2);ctx.stroke()}ctx.restore();
  }
  if(b.charge>0&&!reduced){ctx.beginPath();for(let i=0;i<3;i++){ctx.moveTo(e.x-e.r-10-i*7,e.y-6);ctx.lineTo(e.x-e.r-i*7,e.y+6)}ctx.stroke()}
  ctx.restore();
 }
}
const api={drawFirstBossShot,isFirstBoss,updateFirstBossShot,firstBossCurve,bossMoveClear,updateBossDamageBudgets,limitBossDamage,pushThroughBossStrokes,bossPathClear,bossWallHit,bossBrain,resetBossEncounters,bossDamageMultiplier,bossContact,updateBossEncounter,bossTarget,updateBossFields,moveBossFields,bossEncounterSnapshot,drawBossEncounters};Object.assign(game.api,api);return api;
};
