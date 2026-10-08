/* Wave 10, phase one: drawn cuts, actual cover, and boss-owned tooth helpers. */
DoodleDefender.systems.wobbleBoss=function(game){
 const rig=DoodleDefender.WobblechompRig,pace=1,cap=10,toothBiteWarning=1.2;
 let art=null,toothArt=null,loading=false;
 const isWobbleBoss=e=>!!e.waveBoss&&e.type==='wobblechomp';
 function loadWobbleArtwork(){
  if(loading||typeof Image==='undefined')return;loading=true;
  const version=document.documentElement?.dataset?.build,suffix=version?'?v='+encodeURIComponent(version):'';
  for(const [file,set] of [['wobblechomp-parts',i=>art=i],['wobble-tooth',i=>toothArt=i]]){const i=new Image();i.onload=()=>set(i);i.onerror=()=>{loading=false};i.src='assets/art/'+file+'.png'+suffix}
 }
 function state(e){const b=game.api.bossBrain(e);if(!b.wobble){const model=rig.create();model.time=1;b.wobble={model,attack:null,turn:0,gap:1.4,angle:-2.2,facing:game.state.player.x>=e.x?-1:1,cutWindow:null,punchHit:false,beamHit:0,beamWalls:[],target:null,rollStart:0,rollRoute:[],helperSerial:0}}return b.wobble}
 // Size the entire puppet down; keep the green cut rings easy to hit.
 function scale(){return .17}
 function frame(e,m=state(e).model){const p=rig.pose(m,game.api.enemyMotionReduced()),s=scale(),f=game.api.bossBrain(e).wobble?.facing??-1;return {p,s,f,x:p.roll?p.roll.x+p.entry:570+p.entry,y:p.roll?p.roll.y:410+p.bob}}
 function world(e,q){const a=frame(e);return {x:e.x+(q.x-a.x)*a.s*a.f,y:e.y+(q.y-a.y)*a.s}}
 function clearance(x,y){const q=game.api.refugePoint(x,y);return Math.hypot(x-q.x,y-q.y)}
 function wobblePositionSafe(x,y){return clearance(x,y)>=95}
 function wobbleMoveClear(e,x,y){
  if(!wobblePositionSafe(x,y))return false;const ignore=new Set();
  for(const w of game.state.walls){const a=game.api.nearestPointOnWall(e,w),b=game.api.nearestPointOnWall({x,y},w);if(!a||!b)continue;
   const old=Math.hypot(a.x-e.x,a.y-e.y),next=Math.hypot(b.x-x,b.y-y);
   if(old<e.r+w.thick/2+1&&next>old+1e-6)ignore.add(w);
  }
  return !game.api.shotBlocked(e.x,e.y,x,y,e.r,ignore);
 }
 function safePoint(angle){
  const {W,H,player:p}=game.state,rx=Math.max(65,W/2-70),ry=Math.max(85,H/2-100);
  // Narrow portrait pages use a ranged lower rail; short landscape pages a side rail.
  let x=p.x+Math.cos(angle)*rx,y=p.y+Math.sin(angle)*ry;
  if(W<440&&H>=W){x=p.x+Math.cos(angle)*rx;y=p.y+Math.max(155,Math.min(235,ry))}
  else if(H<440&&W>H){x=p.x-Math.max(165,Math.min(260,rx));y=p.y+Math.sin(angle)*Math.max(15,H/2-100)}
  x=game.api.clamp(x,60,W-60);y=game.api.clamp(y,90,Math.max(90,H-60));
  if(!wobblePositionSafe(x,y)){
   let best=null,score=Infinity;
   for(let i=0;i<32;i++){const a=i*Math.PI/16,q={x:game.api.clamp(p.x+Math.cos(a)*rx,60,W-60),y:game.api.clamp(p.y+Math.sin(a)*ry,90,Math.max(90,H-60))};
    if(!wobblePositionSafe(q.x,q.y))continue;const d=Math.hypot(q.x-x,q.y-y);if(d<score){score=d;best=q}}
   if(best)return best;
  }
  return {x,y};
 }
 function keepWobbleDistance(e){if(!wobblePositionSafe(e.x,e.y)||e.x<60||e.x>game.state.W-60||e.y<90||e.y>game.state.H-60){const s=state(e),q=safePoint(s.angle);e.x=q.x;e.y=q.y;if(s.attack)cancel(e,s)}}
 function initWobbleBoss(e){loadWobbleArtwork();const s=state(e),p=safePoint(s.angle);if(!wobblePositionSafe(e.x,e.y)||e.x<60||e.x>game.state.W-60||e.y<90||e.y>game.state.H-60){e.x=p.x;e.y=p.y}}
 function moveToward(e,q,dt,speed){
  const dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy)||1,n=Math.min(d,speed*dt);
  // Slide around cover instead of destroying it while walking or rolling.
  for(const offset of [0,.55,-.55,1.1,-1.1,Math.PI/2,-Math.PI/2]){
   const a=Math.atan2(dy,dx)+offset,x=e.x+Math.cos(a)*n,y=e.y+Math.sin(a)*n;
   if(x<60||x>game.state.W-60||y<90||y>game.state.H-60||!wobblePositionSafe(x,y))continue;
   if(game.api.moveEnemySafely(e,x-e.x,y-e.y))return;
  }
 }
 function start(e,s,kind){
  const fn={punch:rig.punch,spikes:rig.shootSpikes,beam:rig.eyeBeam,teeth:rig.shakeTeeth,roll:rig.tuckAndRoll}[kind];
  if(!fn(s.model))return false;s.attack=kind;s.target={x:game.state.player.x,y:game.state.player.y};s.punchHit=false;s.punchEnd=null;s.beamHit=0;
  s.facing=game.state.player.x>=e.x?-1:1;
  if(kind==='beam')s.beamWalls=game.state.walls.filter(w=>w.hp>0&&w.life>0).map(w=>({wall:w,...game.api.wallGeometry(w.pts)})).sort((a,b)=>Math.hypot(a.cx-game.state.player.x,a.cy-game.state.player.y)-Math.hypot(b.cx-game.state.player.x,b.cy-game.state.player.y)).slice(0,2).map(q=>({wall:q.wall,x:q.cx,y:q.cy}));
  if(kind==='roll'){s.rollStart=s.angle;s.rollRoute=[];for(let i=0;i<=16;i++)s.rollRoute.push(safePoint(s.angle+i*.22))}
  return true;
 }
 function fire(e,origin,count=5){
  const a=Math.atan2(game.state.player.y-origin.y,game.state.player.x-origin.x);
  for(let i=0;i<count&&game.state.enemyShots.length<32;i++){const angle=a+(i-(count-1)/2)*.16;game.state.enemyShots.push({x:origin.x,y:origin.y,vx:Math.cos(angle)*180,vy:Math.sin(angle)*180,r:4,damage:6,life:6,wobbleOwner:e,bossKind:'wobble-spike'})}
 }
 function spawnTooth(e,t){
  if(game.state.enemies.filter(n=>n.bossOwner===e&&n.type==='wobble-tooth'&&n.hp>0).length>=cap)return;
  const s=state(e),i=s.helperSerial++,p=game.state.player;
  const target=safePoint(s.angle+(i%2?1:-1)*(.45+(i%5)*.3));
  const origin=s.attack==='roll'?{x:e.x,y:e.y}:world(e,rig.pose(s.model,true).mouth);
  const n=game.api.spawnEnemy(false,origin.x,origin.y,'wobble-tooth');if(!n)return;n.bossOwner=e;n.wobbleLanding={startX:origin.x,startY:origin.y,x:target.x,y:target.y,age:0,duration:s.attack==='roll'?.4:.6,height:s.attack==='roll'?28:65};n.toothWarning=0;n.toothTurn=target.x<p.x?1:-1;
 }
 function cancel(e,s){s.model.punchAge=s.model.spikeAge=s.model.beamAge=s.model.teethAge=s.model.rollAge=null;s.model.teethPlan=[];s.model.spikes=[];s.model.teeth=[];s.attack=null;s.gap=.8;s.cutWindow=null;s.beamWalls=[]}
 function updateWobbleBoss(e,dt){
  const s=state(e);if(e.hp<=0)return;keepWobbleDistance(e);
  if(e.freeze>0||e.stun>0){cancel(e,s);return}
  let remaining=Math.min(dt,5);while(remaining>1e-8){const step=Math.min(.025,remaining);remaining-=step;
   if(s.cutWindow){s.cutWindow.left-=step;if(s.cutWindow.left<=0)s.cutWindow=null}
   const m=s.model;
   if(!s.attack){if(!s.cutWindow){s.angle+=step*.4;moveToward(e,safePoint(s.angle),step,85)}s.gap-=step;
    if(s.gap<=0){const sequence=['punch','spikes','teeth','beam','punch','roll','spikes','beam'];for(let i=0;i<sequence.length;i++){const kind=sequence[s.turn++%sequence.length];if(start(e,s,kind))break}}
   }
   rig.update(m,step*pace);
   if(s.attack==='punch'&&m.punchAge!==null){
    const age=m.punchAge,cover=game.api.bossShotWallHit({x:e.x,y:e.y,r:12},s.target.x,s.target.y),end=s.punchEnd||(cover?{x:e.x+(s.target.x-e.x)*cover.t,y:e.y+(s.target.y-e.y)*cover.t}:s.target),a=frame(e),tx=a.x+(end.x-e.x)/(a.s*a.f),ty=a.y+(end.y-e.y)/a.s,angle=Math.atan2(ty-a.y,tx-a.x)+Math.PI/2;
    if(age>=.85&&age<2.65){const f=game.api.clamp((age-.85)/.3,0,1);m.angle=angle;m.wrist.x=m.wrist.x*(1-f)+(tx+Math.cos(angle)*27.75-Math.sin(angle)*77.7)*f;m.wrist.y=m.wrist.y*(1-f)+(ty+Math.sin(angle)*27.75+Math.cos(angle)*77.7)*f}
    if(age>=1.2&&!s.punchHit){s.punchHit=true;const shot={x:e.x,y:e.y,r:12},hit=game.api.bossShotWallHit(shot,s.target.x,s.target.y);
     if(hit){s.punchEnd={x:e.x+(s.target.x-e.x)*hit.t,y:e.y+(s.target.y-e.y)*hit.t};game.api.damageWall(hit.wall,22,s.punchEnd.x,s.punchEnd.y);game.api.floatText(s.punchEnd.x,s.punchEnd.y,'BLOCKED!','#28796d')}
     else game.api.damageStevie(12*(1-game.state.stats.playerArmor),'Wobblechomp warned punch',e);
    }
   }
   if(m.spikes.some(q=>!q.combatLaunched)){fire(e,s.attack==='roll'?{x:e.x,y:e.y}:world(e,rig.pose(m,true).parts.leg.center),s.attack==='roll'?3:5);for(const q of m.spikes)q.combatLaunched=true}
   for(const t of m.teeth)if(!t.combatLaunched){t.combatLaunched=true;spawnTooth(e,t)}
   if(s.attack==='beam'&&m.beamAge!==null){
    for(const at of [1,1.65])if(m.beamAge>=at&&s.beamHit<[1,1.65].indexOf(at)+1){const q=s.beamWalls[s.beamHit++];if(q&&game.state.walls.includes(q.wall)){game.state.walls=game.state.walls.filter(w=>w!==q.wall);game.api.burst(q.x,q.y,'#75a999',8);game.api.floatText(q.x,q.y,'BEAMED AWAY!','#28796d')}}
   }
   if(s.attack==='roll'&&m.rollAge!==null){
    const progress=game.api.clamp((m.rollAge-1.1)/2.35,0,1);s.angle=s.rollStart+progress*3.52;moveToward(e,safePoint(s.angle),step,220);
   }else if(s.attack==='teeth'||s.attack==='spikes'&&m.spikeAge>1.2||s.attack==='punch'&&s.punchHit){s.angle+=step*.5;moveToward(e,safePoint(s.angle),step,75)}
   if(s.attack&&!rig.busy(m)){s.attack=null;s.gap=.65;s.beamWalls=[]}
   if(game.state.player.hp<=0)break;
  }
 }
 function availableParts(s){const names=[];const part={punch:'arm',spikes:'leg',beam:'stalk'}[s.attack];if(part)names.push(part);if(s.cutWindow&&!names.includes(s.cutWindow.part))names.push(s.cutWindow.part);return names}
 function cutWobbleStroke(points){
  if(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.api.bossEntranceActive())return false;
  for(const e of game.state.enemies){if(!isWobbleBoss(e)||e.hp<=0||e.freeze>0||e.stun>0)continue;const s=state(e);if(s.model.rollAge!==null)continue;
   const a=frame(e),local=points.map(q=>({x:a.x+(q.x-e.x)/(a.s*a.f),y:a.y+(q.y-e.y)/a.s})),allowed=availableParts(s);
   if(!rig.cutStroke(s.model,local,game.api.enemyMotionReduced(),allowed))continue;
   const name=s.model.lastCut;
   if(name==={punch:'arm',spikes:'leg',beam:'stalk'}[s.attack]){s.attack=null;s.gap=1.6;s.beamWalls=[]}
   s.cutWindow={part:name,left:1.6};
   const cuts=s.model.armCuts+s.model.legCuts+s.model.stalkCuts;
   e.hp=cuts===6?0:Math.max(e.maxHp*.04,e.hp-e.maxHp*.16);
   game.api.damageNumber(e,e.maxHp*.16,'physical',cuts===6);game.api.playSound('pencil');game.api.floatText(e.x,e.y-e.r-18,s.model[{arm:'armCuts',leg:'legCuts',stalk:'stalkCuts'}[name]]===2?'DETACHED!':'CUT · 1 MORE!','#28796d');
   if(cuts===6)game.api.killEnemy(e);return true;
  }return false;
 }
 function updateWobbleTooth(e,dt){
  if(!e.bossOwner||e.bossOwner.hp<=0||!game.state.enemies.includes(e.bossOwner)){game.state.enemies=game.state.enemies.filter(n=>n!==e);return true}
  if(e.freeze>0||e.stun>0){e.toothWarning=0;return true}
  if(e.wobbleLanding){const l=e.wobbleLanding;l.age+=dt;const t=Math.min(1,l.age/l.duration);e.x=l.startX+(l.x-l.startX)*t;e.y=l.startY+(l.y-l.startY)*t;if(l.age>=l.duration+.5)delete e.wobbleLanding;return true}
  if(game.api.touchesRefuge(e)&&!game.api.shotBlocked(e.x,e.y,game.state.player.x,game.state.player.y,0)){
   e.toothWarning=(e.toothWarning||0)+dt;if(e.toothWarning>=toothBiteWarning){game.api.damageStevie(e.dmg*(1-game.state.stats.playerArmor),'Tooth doodle warned bite',e);game.state.enemies=game.state.enemies.filter(n=>n!==e)}return true;
  }
  e.toothWarning=0;return false;
 }
 function wobbleToothHeight(e){const l=e.wobbleLanding;if(!l||game.api.enemyMotionReduced())return 0;return l.age<l.duration?Math.sin(l.age/l.duration*Math.PI)*l.height:l.age<l.duration+.25?Math.sin((l.age-l.duration)/.25*Math.PI)*15:0}
 function clearWobbleBoss(e){game.state.enemyShots=game.state.enemyShots.filter(s=>s.wobbleOwner!==e);game.state.enemies=game.state.enemies.filter(n=>n.bossOwner!==e);const s=game.api.bossBrain(e).wobble;if(s)cancel(e,s)}
 function moveWobbleFields(dx,dy){for(const e of game.state.enemies){const l=e.wobbleLanding;if(l){l.startX+=dx;l.startY+=dy;l.x+=dx;l.y+=dy}if(isWobbleBoss(e)){const s=state(e);for(const p of [s.target,s.punchEnd])if(p){p.x+=dx;p.y+=dy}for(const q of [...s.beamWalls,...s.rollRoute]){q.x+=dx;q.y+=dy}}}}
 function drawWobbleEnemy(e,model=null){const ctx=game.dom.ctx,m=model||game.api.bossBrain(e).wobble?.model;if(!m)return;const a=frame(e,m);ctx.save();ctx.scale(a.s*a.f,a.s);ctx.translate(-a.x,-a.y);if(art)rig.draw(ctx,art,m,{reduced:game.api.enemyMotionReduced(),guide:false,effects:false});else{ctx.fillStyle='#ead326';ctx.beginPath();ctx.arc(a.x,a.y,110,0,Math.PI*2);ctx.fill()}ctx.restore()}
 function drawWobbleTooth(e){
  const ctx=game.dom.ctx,l=e.wobbleLanding;ctx.save();
  if(!game.api.enemyMotionReduced()&&e.freeze<=0&&e.stun<=0){
   if(l){const t=l.age/l.duration;ctx.rotate(t<1?t*Math.PI*2*e.toothTurn:Math.sin((l.age-l.duration)*12)*.1);const squash=l.age>=l.duration&&l.age<l.duration+.09;ctx.scale(squash?1.2:Math.min(1,.45+t*1.8),squash?.8:Math.min(1,.45+t*1.8))}
   else{const p=game.api.enemyAnimationPose(e);ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(p.sx,p.sy)}
  }
  ctx.scale(game.state.player.x>=e.x?-1:1,1);if(toothArt)ctx.drawImage(toothArt,-18,-18,36,36);else{ctx.fillStyle='#fff7df';ctx.strokeStyle='#282014';ctx.lineWidth=2;ctx.fillRect(-9,-12,18,24);ctx.strokeRect(-9,-12,18,24)}ctx.restore();
 }
 function drawWobbleFields(){const ctx=game.dom.ctx;ctx.save();
  for(const n of game.state.enemies)if(n.type==='wobble-tooth'){
   if(n.wobbleLanding){ctx.strokeStyle='#9b632d';ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(n.wobbleLanding.x,n.wobbleLanding.y,16,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
   if(n.toothWarning>0){ctx.strokeStyle='#b34936';ctx.lineWidth=3;ctx.beginPath();ctx.arc(n.x,n.y,17,-Math.PI/2,-Math.PI/2+Math.PI*2*n.toothWarning/toothBiteWarning);ctx.stroke()}
  }
  for(const e of game.state.enemies){if(!isWobbleBoss(e))continue;const s=game.api.bossBrain(e).wobble;if(!s)continue;
   const label=game.dom.$('bossOvertime'),rect=label.getBoundingClientRect?.(),canvas=game.dom.canvas.getBoundingClientRect(),hintY=Math.max(92,Number.isFinite(rect?.bottom)&&label.style.display!=='none'?rect.bottom-canvas.top+18:92);
   ctx.save();ctx.lineWidth=2;ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#385c4a';ctx.fillText('PHASE 1 · CUT THE GREEN THREADS TWICE',game.state.W/2,hintY);ctx.font='bold 11px sans-serif';ctx.fillText('Arm '+s.model.armCuts+'/2 · Leg '+s.model.legCuts+'/2 · Eye '+s.model.stalkCuts+'/2',game.state.W/2,hintY+16);
   ctx.fillStyle='#966425';ctx.fillText(s.cutWindow&&s.model[{arm:'armCuts',leg:'legCuts',stalk:'stalkCuts'}[s.cutWindow.part]]===1?({arm:'ARM',leg:'LEG',stalk:'EYE'}[s.cutWindow.part]+' DANGLING · CUT AGAIN!'):({punch:'PUNCH · BLOCK OR CUT THE ARM',spikes:'SPIKES · BLOCK OR CUT THE LEG',teeth:'TEETH · BLOCK THE WARNED BITES',beam:'EYE BEAM · CUT THE STALK',roll:'ROLL · BLOCK THE SPIKES'}[s.attack]||'WATCH FOR A GREEN RING'),game.state.W/2,hintY+32);
   if(s.attack==='punch'&&!s.punchHit){ctx.strokeStyle='#b34936';ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(s.target.x,s.target.y);ctx.stroke();ctx.setLineDash([])}
   if(s.attack==='beam'){const eye=world(e,rig.pose(s.model,game.api.enemyMotionReduced()).parts.stalk.center);for(const q of s.beamWalls){ctx.strokeStyle='#28796d';ctx.lineWidth=s.model.beamAge>=.8?5:2;ctx.setLineDash(s.model.beamAge>=.8?[]:[6,5]);ctx.beginPath();ctx.moveTo(eye.x,eye.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.setLineDash([]);if(game.state.walls.includes(q.wall)){ctx.strokeStyle='#b34936';ctx.lineWidth=3;ctx.beginPath();q.wall.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}}}
   if(s.attack==='roll'&&s.model.rollAge<1.1){ctx.strokeStyle='#b34936';ctx.lineWidth=e.r*1.5;ctx.globalAlpha=.12;ctx.beginPath();s.rollRoute.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.stroke();ctx.setLineDash([])}
   const p=rig.pose(s.model,game.api.enemyMotionReduced());for(const name of availableParts(s)){const limb=p.parts[name];if(limb.cuts===2)continue;const a=world(e,limb.joint.a),b=world(e,limb.joint.b);ctx.strokeStyle='#28796d';ctx.lineWidth=3;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc((a.x+b.x)/2,(a.y+b.y)/2,18,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}ctx.restore();
  }ctx.restore();
 }
 function wobbleSnapshot(e){const s=game.api.bossBrain(e).wobble;return s?{attack:s.attack,turn:s.turn,gap:s.gap,pace,bodyWidth:320*scale(),cutSeconds:s.cutWindow?.left??0,clearance:clearance(e.x,e.y),punchEnd:s.punchEnd?{...s.punchEnd}:null,model:JSON.parse(JSON.stringify(s.model)),parts:Object.fromEntries(Object.entries(rig.pose(s.model,game.api.enemyMotionReduced()).parts).map(([k,v])=>[k,{cuts:v.cuts,joint:{a:world(e,v.joint.a),b:world(e,v.joint.b)}}])),available:availableParts(s),helpers:game.state.enemies.filter(n=>n.bossOwner===e).length}:null}
 const api={isWobbleBoss,wobbleMoveClear,wobblePositionSafe,keepWobbleDistance,loadWobbleArtwork,wobbleArtworkReady:()=>!!art&&!!toothArt,initWobbleBoss,updateWobbleBoss,cutWobbleStroke,updateWobbleTooth,wobbleToothHeight,clearWobbleBoss,moveWobbleFields,drawWobbleEnemy,drawWobbleTooth,drawWobbleFields,wobbleSnapshot,wobbleEntrancePoint:()=>safePoint(-2.2)};Object.assign(game.api,api);return api;
};
