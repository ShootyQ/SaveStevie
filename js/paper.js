/* The notebook itself is part of combat. Rubbing time is measured by the game
   clock, never by the number of pointer events or a stationary held eraser. */
DoodleDefender.systems.paper=function(game){
const tuning={wearSeconds:7,escapeSeconds:2,patchRadius:30,holeRadius:22,holeSpacing:70,maxHoles:24,maxPatches:256,exitWarning:.7,recovery:1.2};
let pending=[];
function paperActive(){const s=game.state;return s.running&&!s.paused&&!s.inUpgrade&&!s.betweenWaves&&!s.awaitingSpec&&!game.api.synergyRevealActive()&&!game.api.waveFinaleActive()&&!game.api.wobbleRepairActive()&&!game.api.bossEntranceActive();}
function resetPaper(){game.state.paper={patches:[],holes:[],arcs:[],clock:0};pending=[];}
function cancelPaperRub(){pending=[];}
function underPaper(e){return !!e.paperTunnel;}
function clearSurfaceEffects(e){for(const key of ['burn','burnDps','poison','poisonDps','freeze','stun','charged','gravitySlow','feastRush'])e[key]=0;e.feastHost=null;}
function safePaperPoint(p,r=tuning.holeRadius){const b=game.api.refugeBounds(),near=game.api.refugePoint(p.x,p.y);return p.x>=r+8&&p.x<=game.state.W-r-8&&p.y>=r+76&&p.y<=game.state.H-r-20&&Math.hypot(p.x-near.x,p.y-near.y)>r+28;}
function addPaperHole(p){
 const paper=game.state.paper,near=paper.holes.find(h=>Math.hypot(h.x-p.x,h.y-p.y)<tuning.holeSpacing);
 if(near)return near;
 if(!safePaperPoint(p)||paper.holes.length>=tuning.maxHoles)return null;
 const hole={x:p.x,y:p.y,r:tuning.holeRadius,id:paper.holes.length+1};paper.holes.push(hole);return hole;
}
function queuePaperRub(a,b,r=20){
 if(!paperActive()||![a.x,a.y,b.x,b.y,r].every(Number.isFinite)||Math.hypot(b.x-a.x,b.y-a.y)<1)return;
 // Adjacent pointer samples share one frame's time budget. Bound work even
 // on devices delivering thousands of coalesced moves.
 if(pending.length>=128)pending.shift();pending.push({a:{...a},b:{...b},r});
}
function rubTouches(p,paths,extra=0){return paths.some(s=>game.api.pointSegDist(p.x,p.y,s.a.x,s.a.y,s.b.x,s.b.y)<=s.r+extra);}
function updatePaper(dt){
 if(!paperActive()){pending=[];return;}
 const paper=game.state.paper;paper.clock+=dt;paper.arcs=paper.arcs.filter(a=>(a.life-=dt)>0);
 const paths=pending;pending=[];if(!paths.length)return;
 const touched=new Map();let samples=0;
 for(const path of paths){
  const length=Math.hypot(path.b.x-path.a.x,path.b.y-path.a.y),steps=Math.min(100,Math.max(1,Math.ceil(length/12)));
  for(let i=0;i<=steps;i++){
   samples++;const p={x:path.a.x+(path.b.x-path.a.x)*i/steps,y:path.a.y+(path.b.y-path.a.y)*i/steps};
   if(!safePaperPoint(p)||paper.holes.some(h=>Math.hypot(h.x-p.x,h.y-p.y)<tuning.holeSpacing))continue;
   let patch=paper.patches.find(q=>Math.hypot(q.x-p.x,q.y-p.y)<tuning.patchRadius);
   if(!patch){if(paper.patches.length>=tuning.maxPatches)continue;patch={...p,wear:0};paper.patches.push(patch);}
   touched.set(patch,(touched.get(patch)||0)+1);
  }
 }
 for(const [patch,count] of touched){const before=patch.wear;patch.wear=Math.min(tuning.wearSeconds,patch.wear+Math.min(dt,.1)*count/samples);if(before<3&&patch.wear>=3)game.api.setMsg('Careful! Keep rubbing this thin patch and you will tear a shortcut.');if(patch.wear>=tuning.wearSeconds-1e-8){const hole=addPaperHole(patch);if(hole)game.api.setMsg('A hole! Monsters can tunnel to another hole closer to Stevie. Rub a moving bump for 2 seconds to bring it up.');}}
 paper.patches=paper.patches.filter(p=>!paper.holes.some(h=>Math.hypot(h.x-p.x,h.y-p.y)<tuning.holeSpacing));
 for(const e of game.state.enemies){
  const t=e.paperTunnel;if(!t||t.phase!=='travel'||e.hp<=0)continue;
  const d=Math.hypot(t.exit.x-e.x,t.exit.y-e.y)||1,front={x:e.x+(t.exit.x-e.x)/d*12,y:e.y+(t.exit.y-e.y)/d*12};
  if(rubTouches(front,paths,8)){t.rub=Math.min(tuning.escapeSeconds,t.rub+Math.min(dt,.1));t.rubbedAt=paper.clock;if(t.rub>=tuning.escapeSeconds-1e-8&&safePaperPoint(e)){const hole=addPaperHole(e);beginEmergence(e,hole&&Math.hypot(hole.x-e.x,hole.y-e.y)<35?hole:{x:e.x,y:e.y},true);}}
 }
}
function beginEmergence(e,point,forced=false){
 const t=e.paperTunnel;t.phase='emerge';t.exit={x:point.x,y:point.y};e.x=point.x;e.y=point.y;t.warning=tuning.exitWarning;t.forced=forced;
 game.api.floatText(e.x,e.y-e.r-15,forced?'CAUGHT YOU!':'COMING UP!','#855c3e');
}
function updatePaperEnemy(e,dt){
 if(e.paperCooldown>0)e.paperCooldown=Math.max(0,e.paperCooldown-dt);
 if(e.eraseStumble>0)e.eraseStumble=Math.max(0,e.eraseStumble-dt);
 let t=e.paperTunnel;
 if(!t){
  if(e.waveBoss||game.catalog.enemyDefs[e.type]?.boss||e.flight||e.type==='wobble-tooth'||e.type==='jamling'||e.stun>0||e.freeze>0||e.paperCooldown>0||game.api.bossFriendHeld(e))return false;
  const holes=game.state.paper.holes,player=game.state.player,entry=holes.find(h=>Math.hypot(h.x-e.x,h.y-e.y)<=h.r+e.r*.35);
  if(!entry)return false;
  const startDistance=Math.hypot(entry.x-player.x,entry.y-player.y),exit=holes.filter(h=>h!==entry&&safePaperPoint(h,e.r+22)&&Math.hypot(h.x-player.x,h.y-player.y)<startDistance-45).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
  if(!exit)return false;
  t=e.paperTunnel={phase:'travel',exit:{x:exit.x,y:exit.y},rub:0,rubbedAt:-Infinity,age:0};clearSurfaceEffects(e);if(e.type==='basil')game.api.finishFeast(e);game.api.floatText(e.x,e.y-24,'ZIP!','#855c3e');if(!game.state.paper.tunnelHint){game.state.paper.tunnelHint=true;game.api.setMsg('Follow the moving bump! Rub near it for 2 seconds to force the monster up. Rocks still hit underground.');}
 }
 clearSurfaceEffects(e);t.age+=dt;
 if(t.phase==='emerge'){
  t.warning-=dt;
  if(t.warning<=0){delete e.paperTunnel;e.paperCooldown=6;e.stun=tuning.recovery;e.attackCd=Math.max(e.attackCd||0,tuning.recovery);if(e.chonks){e.chonks.phase='recover';e.chonks.recovery=e.chonks.recoveryTotal=tuning.recovery;e.chonks.momentum=0;e.chonks.target=null;}if(e.type==='bouncer'){e.bounceTime=0;e.bounceKick=0;}game.api.burst(e.x,e.y,'#c8b99a',8);}
  return true;
 }
 const recentlyRubbed=game.state.paper.clock-t.rubbedAt<.12;
 if(!recentlyRubbed)t.rub=Math.max(0,t.rub-dt*.5);
 const dx=t.exit.x-e.x,dy=t.exit.y-e.y,d=Math.hypot(dx,dy),speed=Math.max(35,Math.min(90,e.speed*1.2))*(recentlyRubbed?.2:1),step=Math.min(d,speed*dt);
 if(d>0){e.x+=dx/d*step;e.y+=dy/d*step;}
 if(d<=step+.01)beginEmergence(e,t.exit);
 return true;
}
function eraseProjectiles(a,b,r){
 let changed=false;game.state.enemyShots=game.state.enemyShots.filter(s=>{
  // Small hostile pencils/spikes can be erased. Boss orbs and paper bombs
  // retain their existing drawing counters; returned projectiles stay useful.
  if(s.reflected||s.owner||s.r>6||game.api.pointSegDist(s.x,s.y,a.x,a.y,b.x,b.y)>r+(s.r||3))return true;
  game.api.burst(s.x,s.y,'#cbbba4',4);changed=true;return false;
 });return changed;
}
function eraseWallReaction(wall,pieces,a,b,r,removedInk){
 const clock=game.state.paper.clock;
 if(game.state.inks.electric>0&&removedInk>0&&clock>=(wall.sparkReadyAt||0)){
  wall.sparkReadyAt=clock+.8;for(const p of pieces)p.sparkReadyAt=wall.sparkReadyAt;
  const ends=pieces.flatMap(p=>[p.pts[0],p.pts.at(-1)]).filter(p=>game.api.pointSegDist(p.x,p.y,a.x,a.y,b.x,b.y)<=r+wall.thick+2);
  if(ends.length>=2){let pair=[ends[0],ends[1]],best=0;for(const x of ends)for(const y of ends){const d=Math.hypot(x.x-y.x,x.y-y.y);if(d>best&&d<=r*2+wall.thick*2+30){best=d;pair=[x,y];}}
   const damage=Math.min(12+game.state.inks.electric*2,removedInk*.8);game.state.paper.arcs.push({a:{...pair[0]},b:{...pair[1]},life:.25});if(game.state.paper.arcs.length>16)game.state.paper.arcs.shift();
   for(const e of [...game.state.enemies])if(!underPaper(e)&&e.hp>0&&game.api.pointSegDist(e.x,e.y,pair[0].x,pair[0].y,pair[1].x,pair[1].y)<=e.r+12){game.api.dealDamage(e,damage,'electric');if(e.hp<=0)game.api.killEnemy(e);}
  }
 }
 for(const e of game.state.enemies){
  if(e.hp<=0||underPaper(e)||e.freeze>0||e.stun>0||e.eraseStumbleCooldown>clock)continue;
  const chonk=e.type==='tank'&&e.chonks?.phase==='windup'&&e.chonks.target===wall,boing=e.type==='bouncer'&&e.bounceTime>0&&e.bounceKick>0;
  if(!chonk&&!boing)continue;
  const q=game.api.nearestPointOnWall(e,wall);if(!q||Math.hypot(q.x-e.x,q.y-e.y)>e.r+wall.thick/2+10||!rubTouches(q,[{a,b,r}]))continue;
  if(pieces.some(p=>{const near=game.api.nearestPointOnWall(e,p);return near&&Math.hypot(near.x-e.x,near.y-e.y)<=e.r+p.thick/2+2;}))continue;
  e.eraseStumbleCooldown=clock+6;e.eraseStumble=1.4;e.stun=1.4;e.bounceTime=0;e.bounceKick=0;
  if(chonk){e.chonks.phase='recover';e.chonks.recovery=e.chonks.recoveryTotal=1.4;e.chonks.momentum=0;e.chonks.target=null;}
  game.api.floatText(e.x,e.y-25,'WHOOPS!','#a56930');game.api.animateEnemyAction(e,'bounce');
 }
}
function movePaper(dx,dy){const p=game.state.paper;for(const q of [...p.holes,...p.patches]){q.x+=dx;q.y+=dy;}for(const arc of p.arcs)for(const q of [arc.a,arc.b]){q.x+=dx;q.y+=dy;}for(const e of game.state.enemies)if(e.paperTunnel){e.paperTunnel.exit.x+=dx;e.paperTunnel.exit.y+=dy;}pending=[];}
function drawPaper(){
 const ctx=game.dom.ctx,p=game.state.paper;ctx.save();
 for(const patch of p.patches){const amount=patch.wear/tuning.wearSeconds;ctx.fillStyle='rgba(155,130,98,'+(amount*.18)+')';ctx.strokeStyle='rgba(120,93,63,'+(amount*.5)+')';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(patch.x,patch.y,26,20,-.15,0,Math.PI*2);ctx.fill();for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(patch.x-18,patch.y-9+i*4);ctx.lineTo(patch.x+18,patch.y-12+i*4);ctx.stroke();}if(amount>.6){ctx.beginPath();ctx.moveTo(patch.x-12,patch.y);ctx.lineTo(patch.x-3,patch.y-5);ctx.lineTo(patch.x+3,patch.y+4);ctx.lineTo(patch.x+12,patch.y-2);ctx.stroke();}}
 for(const h of p.holes){ctx.fillStyle='#273039';ctx.strokeStyle='#a28d69';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<16;i++){const angle=i*Math.PI/8,r=h.r*(i%2?.88:1.1),x=h.x+Math.cos(angle)*r,y=h.y+Math.sin(angle)*r*.8;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#fff8e8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(h.x,h.y,h.r*.94,Math.PI,Math.PI*1.7);ctx.stroke();}
 ctx.restore();
}
function drawPaperBump(e){
 const ctx=game.dom.ctx,t=e.paperTunnel,r=Math.min(23,Math.max(13,e.r)),wobble=game.api.enemyMotionReduced()?0:Math.sin(t.age*14)*1.5;
 ctx.save();ctx.fillStyle='#b3a48d55';ctx.beginPath();ctx.ellipse(e.x+3,e.y+5,r+5,r*.6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff8e6';ctx.strokeStyle='#af9c7a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x,e.y+wobble,r,r*.7,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#a8c0d266';ctx.lineWidth=1;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(e.x-r*.65,e.y+i*6);ctx.quadraticCurveTo(e.x,e.y-5+i*6,e.x+r*.65,e.y+i*6);ctx.stroke();}
 ctx.strokeStyle=t.phase==='emerge'?'#b26042':'#4f8361';ctx.lineWidth=3;
 if(t.rub>0||t.phase==='emerge'){const progress=t.phase==='emerge'?1-t.warning/tuning.exitWarning:t.rub/tuning.escapeSeconds;ctx.beginPath();ctx.arc(e.x,e.y,r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();}
 if(t.phase==='emerge'){ctx.beginPath();ctx.moveTo(e.x-r*.6,e.y);ctx.lineTo(e.x-3,e.y-5);ctx.lineTo(e.x+3,e.y+4);ctx.lineTo(e.x+r*.6,e.y-2);ctx.stroke();}
 ctx.restore();
}
function drawSparkGaps(){const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle='#315fd2';ctx.lineWidth=3;for(const arc of game.state.paper.arcs){const dx=arc.b.x-arc.a.x,dy=arc.b.y-arc.a.y,d=Math.hypot(dx,dy)||1;ctx.globalAlpha=arc.life/.25;ctx.beginPath();ctx.moveTo(arc.a.x,arc.a.y);for(let i=1;i<6;i++){const offset=(i%2?1:-1)*4;ctx.lineTo(arc.a.x+dx*i/6-dy/d*offset,arc.a.y+dy*i/6+dx/d*offset);}ctx.lineTo(arc.b.x,arc.b.y);ctx.stroke();}ctx.restore();}
resetPaper();
const api={paperTuning:()=>({...tuning}),paperActive,resetPaper,cancelPaperRub,queuePaperRub,updatePaper,updatePaperEnemy,underPaper,eraseProjectiles,eraseWallReaction,movePaper,drawPaper,drawPaperBump,drawSparkGaps};Object.assign(game.api,api);return api;
};
