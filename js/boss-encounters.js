/* Boss encounter combat and handmade telegraphs; bounded hazards, no draw RNG. */
DoodleDefender.systems.bossEncounters=function(game){
let brains=new WeakMap(),marks=[],clock=0;
const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let reduced=!!preference?.matches;preference?.addEventListener?.('change',e=>{reduced=e.matches});
const colors={boss:'#9b3549',stapler:'#ad741f',crayon:'#8751ac',eraser:'#b95176'};
function bossBrain(e){let b=brains.get(e);if(!b){b={cd:3,cast:null,turn:0,moveCd:0,target:null,enclosed:false,contactCd:0,recovery:0,charge:0,action:null,repeat:0};brains.set(e,b)}return b}
function resetBossEncounters(){brains=new WeakMap();marks=[];clock=0}
function inside(e,w){let yes=false;const pts=w.pts;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>e.y)!==(b.y>e.y)&&e.x<(b.x-a.x)*(e.y-a.y)/(b.y-a.y)+a.x)yes=!yes}return yes}
function nearestBossWall(e,range=150){let best=null;for(const w of game.state.walls){const p=game.api.nearestPointOnWall(e,w);if(!p)continue;const d=Math.hypot(p.x-e.x,p.y-e.y);if(d<range){range=d;best={wall:w,...p}}}return best}
function bossDamageMultiplier(e){return e.waveBoss&&(bossBrain(e).enclosed||bossBrain(e).recovery>0)?1.35:1}
function bossWallHit(e){if(!e.waveBoss)return null;const hit=nearestBossWall(e,e.r+20);return hit&&Math.hypot(hit.x-e.x,hit.y-e.y)<=e.r+hit.wall.thick/2+3?{wall:hit.wall,seg:1}:null}
function bossContact(e){
 const b=bossBrain(e),p=game.state.player;if(b.contactCd<=0){game.api.damageStevie(10*(1-game.state.stats.playerArmor),game.api.monsterName(e.type)+' contact',e);b.contactCd=1.2}
 const angle=Math.atan2(e.y-p.y,e.x-p.x),distance=e.r+Math.hypot(game.api.refugeBounds().halfWidth,game.api.refugeBounds().halfHeight)+6;
 for(let i=0;i<12;i++){const a=angle+i*Math.PI/6,x=p.x+Math.cos(a)*distance,y=p.y+Math.sin(a)*distance;if(game.api.moveEnemySafely(e,x-e.x,y-e.y))break}
 b.moveCd=0;return true;
}
function summon(e,type,count,x=e.x,y=e.y){const existing=game.state.enemies.filter(n=>n.bossOwner===e&&n.hp>0).length;for(let i=0;i<Math.min(count,6-existing);i++){const a=i*2.4+bossBrain(e).turn;const n=game.api.spawnEnemy(false,x+Math.cos(a)*35,y+Math.sin(a)*35,type);if(n)n.bossOwner=e}game.api.animateEnemyAction(e,'summon')}
function volley(e,cast,count,kind){const angle=Math.atan2(cast.y-e.y,cast.x-e.x);for(let i=0;i<count&&game.state.enemyShots.length<32;i++){const a=angle+(i-(count-1)/2)*.18;game.state.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*125,vy:Math.sin(a)*125,life:3,r:4,damage:6,bossKind:kind})}game.api.animateEnemyAction(e,'fire')}
function execute(e,b,c){
 const furious=e.hp<e.maxHp*.4;b.action={kind:c.kind,age:0};
 if(c.kind==='charge'){
  b.charge=.5;b.repeat=furious&&!c.repeat?1:0;b.chargeX=c.x;b.chargeY=c.y;game.api.animateEnemyAction(e,'slam');
  if(c.wall&&game.state.walls.includes(c.wall)&&Math.hypot(c.x-e.x,c.y-e.y)<145)game.api.damageWall(c.wall,furious?80:60,c.x,c.y);
 }else if(c.kind==='swipe'){
  for(const w of [...game.state.walls]){const p=game.api.nearestPointOnWall(e,w);if(p&&Math.hypot(p.x-e.x,p.y-e.y)<130)game.api.damageWall(w,furious?90:65,p.x,p.y)}
  game.api.animateEnemyAction(e,'erase',{x:c.x,y:c.y});b.recovery=1.5;
 }else if(c.kind==='clean'){
  e.burn=0;e.poison=0;b.recovery=2;game.api.animateVoidHit(e);volley(e,c,furious?5:3,'crumb');
 }else if(c.kind==='paint'){
  const kinds=['red','blue','green'];for(let i=0;i<(furious?2:1)&&marks.length<8;i++)marks.push({x:c.x+(i?45:0),y:c.y,r:42,age:0,life:5,kind:kinds[(b.turn+i)%3],owner:e,hatched:false});game.api.animateEnemyAction(e,'summon');
 }else if(c.kind==='summon')summon(e,'mini',2);
 else volley(e,c,e.type==='stapler'?(furious?5:3):3,e.type==='stapler'?'staple':e.type==='crayon'?'crayon':'ink');
 b.cd=furious?3.2:4.5;b.turn++;b.cast=null;e.bossWindup=0;
}
function updateBossEncounter(e,dt){
 const b=bossBrain(e);if(b.action){b.action.age+=dt;if(b.action.age>.65)b.action=null}b.contactCd=Math.max(0,b.contactCd-dt);b.recovery=Math.max(0,b.recovery-dt);
 b.enclosed=game.state.walls.some(w=>w.closed&&w.hp>0&&inside(e,w));
 if(e.hp<=0||e.freeze>0||e.stun>0){b.cast=null;b.charge=0;b.repeat=0;e.bossWindup=0;b.cd=Math.max(b.cd,1);return}
 if(b.cast){b.cast.left-=dt;e.bossWindup=Math.max(0,b.cast.left);if(b.cast.left<=0)execute(e,b,b.cast);return}
 if(b.charge>0){b.charge=Math.max(0,b.charge-dt);const dx=b.chargeX-e.x,dy=b.chargeY-e.y,m=Math.hypot(dx,dy)||1;if(!game.api.moveEnemySafely(e,dx/m*160*dt,dy/m*160*dt)){b.charge=0;b.recovery=1.2;b.repeat=0}
  if(b.charge<=0&&b.repeat){b.repeat=0;b.cast={kind:'charge',x:game.state.player.x,y:game.state.player.y,left:1.2,repeat:true};e.bossWindup=1.2}return}
 if(b.recovery>0)return;
 b.cd-=dt;if(b.cd>0)return;
 const wall=nearestBossWall(e),player=game.state.player;
 let kind=e.type==='stapler'?(b.turn%2===0?'charge':'volley'):e.type==='crayon'?(b.turn%4===3?'volley':'paint'):e.type==='eraser'?(wall?'swipe':'clean'):(b.turn%3===2?'summon':'volley');
 if(b.enclosed&&wall&&e.type!=='stapler'&&e.type!=='eraser'&&b.turn%2===1)kind='swipe';
 const target=(kind==='swipe'||kind==='charge')&&wall?wall:player;
 b.cast={kind,x:kind==='swipe'?e.x:target.x,y:kind==='swipe'?e.y:target.y,wall:target.wall,left:1.2};e.bossWindup=1.2;
}
function bossPathClear(e,x,y){return !game.api.shotBlocked(e.x,e.y,x,y,e.r+1)}
function bossTarget(e){
 const b=bossBrain(e);if(b.cast||b.recovery>0||b.charge>0)return {x:e.x,y:e.y};
 if(b.enclosed){b.detour=false;const wall=nearestBossWall(e,Infinity);return wall||game.state.player}
 if(b.detour&&b.target&&Math.hypot(b.target.x-e.x,b.target.y-e.y)>4&&bossPathClear(e,b.target.x,b.target.y))return b.target;
 b.detour=false;
 if(b.moveCd<=0||!b.target){
  const player=game.state.player,direct=bossPathClear(e,player.x,player.y),desired=Math.atan2(e.y-player.y,e.x-player.x)+.7;
  let best=null,score=Infinity,detour=false;
  for(let i=0;i<12;i++){const a=i*Math.PI/6+b.turn*.25,d=e.type==='crayon'?150:95,x=game.api.clamp(player.x+Math.cos(a)*d,e.r,game.state.W-e.r),y=game.api.clamp(player.y+Math.sin(a)*d,e.r,game.state.H-e.r);
   if(!bossPathClear(e,x,y))continue;const s=Math.hypot(x-(player.x+Math.cos(desired)*d),y-(player.y+Math.sin(desired)*d))*.8+Math.hypot(x-e.x,y-e.y)*.2;if(s<score){score=s;best={x,y}}
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
  b.target=best||(direct?player:(nearestBossWall(e)||player));b.moveCd=.5;b.detour=detour;
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
function moveBossFields(dx,dy){for(const m of marks){m.x+=dx;m.y+=dy}for(const e of game.state.enemies)if(e.waveBoss){const b=bossBrain(e);for(const p of [b.cast,b.target])if(p&&p!==game.state.player){p.x+=dx;p.y+=dy}if(b.chargeX!==undefined){b.chargeX+=dx;b.chargeY+=dy}}}
function bossEncounterSnapshot(){return {marks:marks.map(m=>({x:m.x,y:m.y,age:m.age,kind:m.kind})),bosses:game.state.enemies.filter(e=>e.waveBoss).map(e=>{const b=bossBrain(e);return {type:e.type,enclosed:b.enclosed,cast:b.cast?{kind:b.cast.kind,x:b.cast.x,y:b.cast.y,left:b.cast.left}:null,recovery:b.recovery,charge:b.charge,action:b.action?{...b.action}:null}})}}
function drawBossEncounters(){const ctx=game.dom.ctx;
 for(const m of marks){const color=m.kind==='red'?'#c34937':m.kind==='blue'?'#3887ba':'#57913b';ctx.save();ctx.translate(m.x,m.y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=m.age<1.2?.45:.2;ctx.beginPath();ctx.arc(0,0,m.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.8;ctx.lineWidth=2;ctx.setLineDash(m.age<1.2?[5,5]:[]);ctx.stroke();ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText(m.kind==='green'?'✦':m.kind==='blue'?'~':'!',0,6);ctx.restore()}
 for(const e of game.state.enemies){if(!e.waveBoss||e.hp<=0)continue;const b=bossBrain(e);ctx.save();ctx.strokeStyle=colors[e.type];ctx.fillStyle=colors[e.type];ctx.lineWidth=2;
  if(b.enclosed||b.recovery>0){ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+8+(reduced?0:Math.sin(clock*5)*2),0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
  if(b.cast){const c=b.cast;ctx.setLineDash([6,5]);ctx.beginPath();if(c.kind==='charge'||c.kind==='volley'){ctx.moveTo(e.x,e.y);ctx.lineTo(c.x,c.y)}else ctx.arc(c.x,c.y,c.kind==='swipe'?130:42,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-c.left/1.2));ctx.stroke()}
  if(b.action&&!reduced){const t=b.action.age/.65;ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=(1-t)*.7;
   if(b.action.kind==='swipe'||b.action.kind==='clean'){
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
const api={bossPathClear,bossWallHit,bossBrain,resetBossEncounters,bossDamageMultiplier,bossContact,updateBossEncounter,bossTarget,updateBossFields,moveBossFields,bossEncounterSnapshot,drawBossEncounters};Object.assign(game.api,api);return api;
};
