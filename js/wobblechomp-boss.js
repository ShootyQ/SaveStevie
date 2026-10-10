/* Wave 10, phases one and two: drawn cuts, actual cover, and boss-owned tooth helpers. */
DoodleDefender.systems.wobbleBoss=function(game){
 const rig=DoodleDefender.WobblechompRig,pace=1.45,footPace=1,beamPace=1.9,cap=10,toothBiteWarning=1.2,cutRadius=27;
 let art=null,toothArt=null,loading=false;
 const isWobbleBoss=e=>!!e.waveBoss&&e.type==='wobblechomp';
 function loadWobbleArtwork(){
  if(loading||typeof Image==='undefined')return;loading=true;
  const version=document.documentElement?.dataset?.build,suffix=version?'?v='+encodeURIComponent(version):'';
  for(const [file,set] of [['wobblechomp-parts',i=>art=i],['wobble-tooth',i=>toothArt=i]]){const i=new Image();i.onload=()=>set(i);i.onerror=()=>{loading=false};i.src='assets/art/'+file+'.png'+suffix}
 }
 function state(e){const b=game.api.bossBrain(e);if(!b.wobble){const model=rig.create();model.time=1;b.wobble={model,phase:1,phaseHits:0,inkPot:null,attack:null,turn:0,gap:1.4,angle:-2.2,facing:game.state.player.x>=e.x?-1:1,cutWindow:null,attackSerial:0,counteredSerial:-1,lastAttack:null,punchHit:false,beamHit:0,beamWalls:[],target:null,rollStart:0,rollRoute:[],helperSerial:0,blockStun:0,trapped:0,trapWarning:false,debris:[],scorches:[],scorchAge:0,detour:null,routeAge:0}}return b.wobble}
 // Size the entire puppet down; keep the green cut rings easy to hit.
 function scale(){return .20}
 function frame(e,m=state(e).model){const p=rig.pose(m,game.api.enemyMotionReduced()),s=scale(),f=game.api.bossBrain(e).wobble?.facing??-1;return {p,s,f,x:p.roll?p.roll.x+p.entry:570+p.entry,y:p.roll?p.roll.y:410+p.bob}}
 function world(e,q){const a=frame(e);return {x:e.x+(q.x-a.x)*a.s*a.f,y:e.y+(q.y-a.y)*a.s}}
 function clearance(x,y){const q=game.api.refugePoint(x,y);return Math.hypot(x-q.x,y-q.y)}
 const portraitPhone=()=>game.state.W<500&&game.state.H>=game.state.W;
 const sideMargin=()=>portraitPhone()?24:60;
 const keepout=()=>wobbleInfiniteInk()?30:portraitPhone()?Math.min(game.state.H<700?85:95,Math.max(60,game.state.W/2-56-sideMargin()-1)):95;
 function hintTop(){const label=game.dom.$('bossOvertime'),rect=label.getBoundingClientRect?.(),canvas=game.dom.canvas.getBoundingClientRect();return Math.max(92,Number.isFinite(rect?.bottom)&&label.style.display!=='none'?rect.bottom-canvas.top+18:92)}
 // Leave the entire upright stalk below the three instruction lines on tall desktop pages.
 function topMargin(){return portraitPhone()?Math.max(135,hintTop()+53):game.state.H>=600?Math.max(190,hintTop()+102):90}
 function travelClear(a,b){for(let t=0;t<=1;t+=.05)if(!wobblePositionSafe(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;return true}
 function wobblePositionSafe(x,y){return clearance(x,y)>=keepout()}
 // Body contact consumes cover without ink explosions, healing or control effects.
 function shredWobbleWalls(e,from=e,to=e,except=null){
  const ignored=new Set([...(except?[except]:[]),...(state(e).phase===2?game.state.walls.filter(w=>w.wobbleDraft):[])]),removed=[];
  for(let i=0;i<game.state.walls.length;i++){const hit=game.api.bossShotWallHit({x:from.x,y:from.y,r:Math.max(e.r,32)},to.x,to.y,ignored);if(!hit)break;ignored.add(hit.wall);removed.push(hit);}
  if(!removed.length)return;
  const gone=new Set(removed.map(q=>q.wall));game.state.walls=game.state.walls.filter(w=>!gone.has(w));
  for(const h of removed){h.wall.hp=0;const q=game.api.nearestPointOnWall(to,h.wall);game.api.burst(q.x,q.y,'#b2a17d',6);}
 }
 function wobbleMoveClear(e,x,y){return wobblePositionSafe(x,y)&&travelClear(e,{x,y});}
 function safePoint(angle,rolling=false){
  const {W,H,player:p}=game.state,rx=Math.max(65,W/2-70),ry=Math.max(85,H/2-100);
  // Phones alternate between the top and bottom; side lanes are transit/roll routes.
  let x=p.x+Math.cos(angle)*rx,y=p.y+Math.sin(angle)*ry;
  if(portraitPhone()){
   const reach=Math.max(155,Math.min(235,ry));
   if(rolling){x=p.x+Math.cos(angle)*(W/2-sideMargin());y=p.y+Math.sin(angle)*reach}
   else{x=p.x+Math.cos(angle)*20;y=p.y+(Math.sin(angle)>=0?reach:-reach)}
  }
  else if(H<440&&W>H){x=p.x-Math.max(165,Math.min(260,rx));y=p.y+Math.sin(angle)*Math.max(15,H/2-100)}
  x=game.api.clamp(x,sideMargin(),W-sideMargin());y=game.api.clamp(y,topMargin(),Math.max(topMargin(),H-60));
  if(!wobblePositionSafe(x,y)){
   let best=null,score=Infinity;
   for(let i=0;i<32;i++){const a=i*Math.PI/16,q={x:game.api.clamp(p.x+Math.cos(a)*(portraitPhone()?W/2-sideMargin():rx),sideMargin(),W-sideMargin()),y:game.api.clamp(p.y+Math.sin(a)*ry,topMargin(),Math.max(topMargin(),H-60))};
    if(!wobblePositionSafe(q.x,q.y))continue;const d=Math.hypot(q.x-x,q.y-y);if(d<score){score=d;best=q}}
   if(best)return best;
  }
  return {x,y};
 }
 function keepWobbleDistance(e){const current=state(e);if(current.phase===2){phaseTwo.constrain(e,current);return}if(!wobblePositionSafe(e.x,e.y)||e.x<sideMargin()||e.x>game.state.W-sideMargin()||e.y<topMargin()||e.y>game.state.H-60){const s=state(e),q=safePoint(s.angle);e.x=q.x;e.y=q.y;if(s.attack)cancel(e,s)}}
 function initWobbleBoss(e){loadWobbleArtwork();const s=state(e),p=safePoint(s.angle);if(!wobblePositionSafe(e.x,e.y)||e.x<sideMargin()||e.x>game.state.W-sideMargin()||e.y<topMargin()||e.y>game.state.H-60){e.x=p.x;e.y=p.y}}
 function routeAroundWalls(e,q,dt){
  const s=state(e);s.routeAge-=dt;
  if(travelClear(e,q)&&wobbleMoveClear(e,q.x,q.y)){s.detour=null;return q}
  if(s.detour&&s.routeAge>0&&Math.hypot(e.x-s.detour.x,e.y-s.detour.y)>8&&travelClear(e,s.detour)&&wobbleMoveClear(e,s.detour.x,s.detour.y))return s.detour;
  if(!s.detour&&s.routeAge>0)return q;
  // Visibility graph around the corners of drawings; choose the shortest clear detour.
  const nodes=[{x:e.x,y:e.y},q],{W,H}=game.state;
  const refuge=game.api.refugeBounds();
  if(portraitPhone())for(const x of [refuge.left-keepout()-1,refuge.right+keepout()+1])for(const y of [refuge.top-keepout()-1,refuge.bottom+keepout()+1]){
   if(x>=sideMargin()&&x<=W-sideMargin()&&y>=topMargin()&&y<=H-60)nodes.push({x,y});
  }
  const dist=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),used=new Set();dist[0]=0;
  for(let count=0;count<nodes.length;count++){let i=-1;for(let j=0;j<nodes.length;j++)if(!used.has(j)&&(i<0||dist[j]<dist[i]))i=j;
   if(i<0||!Number.isFinite(dist[i]))break;if(i===1)break;used.add(i);
   for(let j=1;j<nodes.length;j++){if(used.has(j))continue;const a=nodes[i],b=nodes[j],d=dist[i]+Math.hypot(b.x-a.x,b.y-a.y);if(d>=dist[j])continue;
    // Check refuge clearance along the whole segment, not only its destination.
    if(travelClear(a,b)&&wobbleMoveClear({...e,x:a.x,y:a.y},b.x,b.y)){dist[j]=d;prev[j]=i}
   }
  }
  let i=1;if(prev[i]<0){s.detour=null;s.routeAge=.4;return q}while(prev[i]>0)i=prev[i];s.detour=nodes[i];s.routeAge=.5;return s.detour;
 }
 function moveToward(e,q,dt,speed){
  const before={x:e.x,y:e.y};q=routeAroundWalls(e,q,dt);
  const dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy),n=Math.min(d,speed*dt);
  const s=state(e);s.trapProbe??={x:e.x,y:e.y,age:0};s.trapProbe.age+=dt;
  // Count real time even on a slow rail or at a waypoint; otherwise pins can last forever.
  if(n>0)for(const offset of [0,.55,-.55,1.1,-1.1,Math.PI/2,-Math.PI/2]){
   const a=Math.atan2(dy,dx)+offset,x=e.x+Math.cos(a)*n,y=e.y+Math.sin(a)*n;
   if(x<sideMargin()||x>game.state.W-sideMargin()||y<topMargin()||y>game.state.H-60||!wobblePositionSafe(x,y))continue;
   if(game.api.moveEnemySafely(e,x-e.x,y-e.y))break;
  }
  rig.stepWalk(s.model,Math.hypot(e.x-before.x,e.y-before.y),dt,(e.x-before.x)*s.facing>=0?1:-1);
  shredWobbleWalls(e,before,e);s.trapped=0;s.trapWarning=false;s.trapProbe=null;
 }
 // The phase-one ball follows its warned route through ink. Refuge clearance
 // and page bounds still apply; walking continues to route around cover.
 function rollThroughWalls(e,q,dt){
  const before={x:e.x,y:e.y},s=state(e),dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy),n=Math.min(d,280*dt);if(!d)return;
  for(const offset of [0,.55,-.55,1.1,-1.1,Math.PI/2,-Math.PI/2]){const angle=Math.atan2(dy,dx)+offset,x=e.x+Math.cos(angle)*n,y=e.y+Math.sin(angle)*n;if(x<sideMargin()||x>game.state.W-sideMargin()||y<topMargin()||y>game.state.H-60||!wobblePositionSafe(x,y))continue;e.x=x;e.y=y;break}
  shredWobbleWalls(e,before,e);s.detour=null;s.trapped=0;s.trapWarning=false;s.trapProbe=null;
 }
 function stopWobbleAttackSounds(){for(const kind of ['wobbleWindup','wobbleLaser','wobbleRoll'])game.api.stopSoundEffects(kind)}
 function syncWobbleAttackSounds(e,s){
  const active=e.hp>0&&e.freeze<=0&&e.stun<=0&&s.blockStun<=0;
  const laser=active&&s.attack==='beam'&&s.model.beamAge!==null&&s.model.beamAge/beamPace>=.2;
  const roll=active&&(s.phase===2?s.transition<=0:s.attack==='roll'&&s.model.rollAge>=1.1&&s.model.rollAge<3.45);
  for(const [kind,on] of [['wobbleLaser',laser],['wobbleRoll',roll]]){if(on)game.api.sustainSound(kind);else game.api.stopSoundEffects(kind)}
 }
 function start(e,s,kind){
  const fn={punch:rig.punch,spikes:rig.shootSpikes,beam:rig.eyeBeam,teeth:rig.shakeTeeth,roll:rig.tuckAndRoll}[kind];
  s.model.cutFocus=null;if(!fn(s.model))return false;s.attack=kind;s.lastAttack=kind;s.attackSerial++;s.cutWindow=null;s.target={x:game.state.player.x,y:game.state.player.y};s.punchHit=false;s.punchEnd=null;s.beamHit=0;
  s.facing=game.state.player.x>=e.x?-1:1;
  if(kind==='punch')game.api.playSound('wobbleWindup');
  if(kind==='teeth')game.api.playSound('wobbleTeeth');
  if(kind==='beam'){s.beamStart={x:game.state.player.x,y:game.state.player.y};s.beamTip={...s.beamStart};s.beamWalls=game.state.walls.filter(w=>w.hp>0&&w.life>0).map(w=>({wall:w,...game.api.wallGeometry(w.pts)})).sort((a,b)=>Math.hypot(a.cx-game.state.player.x,a.cy-game.state.player.y)-Math.hypot(b.cx-game.state.player.x,b.cy-game.state.player.y)).slice(0,6).map(q=>({wall:q.wall,x:q.cx,y:q.cy}));}
  if(kind==='roll'){s.rollStart=s.angle;s.rollRoute=[];for(let i=0;i<=16;i++)s.rollRoute.push(safePoint(s.angle+i*.22,true))}
  return true;
 }
 function safeSpikeCounter(e){const s=state(e);return s.attack==='spikes'?s.attackSerial:null}
 function counter(e,part,serial=state(e).attackSerial){
  const s=state(e),kind={arm:'punch',leg:'spikes',stalk:'beam'}[part];
  if(s.phase!==1||e.hp<=0||e.freeze>0||e.stun>0||serial!==s.attackSerial||s.counteredSerial===serial||s.lastAttack!==kind||s.model[part+'Cuts']>=2)return false;
  stopWobbleAttackSounds();s.counteredSerial=serial;s.attack=null;s.blockStun=3;s.cutWindow={part,left:3};s.model.cutFocus=part;s.model.focusAge=0;s.model.focusSideways=portraitPhone()||game.state.H<600;s.beamWalls=[];s.model.punchAge=s.model.spikeAge=s.model.beamAge=null;s.model.spikes=[];s.model.walkBlend=0;s.trapped=0;s.trapProbe=null;
  game.api.playSound('rock');return true;
 }
 function counterWobbleSpike(shot){return shot.cutCounter!=null&&isWobbleBoss(shot.wobbleOwner)&&counter(shot.wobbleOwner,'leg',shot.cutCounter)}
 function fire(e,origin,count=5){
  game.api.playSound('wobbleSpike');
  const a=Math.atan2(game.state.player.y-origin.y,game.state.player.x-origin.x);
  for(let i=0;i<count&&game.state.enemyShots.length<32;i++){const angle=a+(i-(count-1)/2)*.16;game.state.enemyShots.push({x:origin.x,y:origin.y,vx:Math.cos(angle)*180,vy:Math.sin(angle)*180,r:4,damage:6,life:6,wobbleOwner:e,bossKind:'wobble-spike',cutCounter:safeSpikeCounter(e)})}
 }
 function spawnTooth(e,t){
  if(game.state.enemies.filter(n=>n.bossOwner===e&&n.type==='wobble-tooth'&&n.hp>0).length>=cap)return;
  const s=state(e),i=s.helperSerial++,p=game.state.player;
  const {W,H}=game.state;let target=safePoint(s.angle);
  for(let attempt=0;attempt<48;attempt++){
   const k=i*7+attempt,u=(k*.61803398875+.31)%1,v=(k*.41421356237+.17)%1,q={x:30+u*Math.max(1,W-60),y:(H<440?90:150)+v*Math.max(1,H-(H<440?90:150)-40)};
   if(clearance(q.x,q.y)<95||game.state.enemies.some(n=>n.bossOwner===e&&n.wobbleLanding&&Math.hypot(n.wobbleLanding.x-q.x,n.wobbleLanding.y-q.y)<30))continue;
   target=q;break;
  }
  const origin=s.attack==='roll'?{x:e.x,y:e.y}:world(e,rig.pose(s.model,true).mouth);
  const n=game.api.spawnEnemy(false,origin.x,origin.y,'wobble-tooth');if(!n)return;n.bossOwner=e;n.wobbleLanding={startX:origin.x,startY:origin.y,x:target.x,y:target.y,age:0,duration:game.api.clamp(.5+Math.hypot(target.x-origin.x,target.y-origin.y)/500,.65,1.35),height:s.attack==='roll'?28:65};n.toothWarning=0;n.toothTurn=target.x<p.x?1:-1;
 }
 function cancel(e,s){stopWobbleAttackSounds();s.model.punchAge=s.model.spikeAge=s.model.beamAge=s.model.teethAge=s.model.rollAge=null;s.model.teethPlan=[];s.model.spikes=[];s.model.teeth=[];s.model.walkBlend=0;s.model.cutFocus=null;s.rail=null;s.attack=null;s.gap=.8;s.cutWindow=null;s.beamWalls=[];s.blockStun=0;s.trapped=0;s.trapWarning=false;s.trapProbe=null}
 function wobblePhase(e){return game.api.bossBrain(e).wobble?.phase??1}
 function wobbleInfiniteInk(){return game.state.running&&game.state.player.hp>0&&!game.state.betweenWaves&&!game.state.inUpgrade&&game.state.enemies.some(e=>isWobbleBoss(e)&&e.hp>0&&wobblePhase(e)===2)}
 function updateWobbleBoss(e,dt){
  const s=state(e);s.model.mobilePose=portraitPhone();if(e.hp<=0){stopWobbleAttackSounds();return}keepWobbleDistance(e);
  if(s.phase===1&&(e.freeze>0||e.stun>0)){cancel(e,s);return}
  let remaining=Math.min(dt,5);while(remaining>1e-8){const step=Math.min(.025,remaining);remaining-=step;
   if(s.cutWindow){s.cutWindow.left-=step;if(s.cutWindow.left<=0){s.cutWindow=null;s.model.cutFocus=null}}
   const m=s.model;if(s.phase===1)shredWobbleWalls(e);
   phaseTwo.updateSiphon(s,step);
   s.scorches=s.scorches.filter(q=>(q.life-=step)>0);
   for(const d of s.debris){d.landX=game.api.clamp(d.landX,35,Math.max(35,game.state.W-35));d.floor=game.api.clamp(d.floor,Math.min(topMargin()+30,game.state.H-45),Math.max(topMargin()+30,game.state.H-45));if(d.settled){d.x=game.api.clamp(d.x,35,Math.max(35,game.state.W-35));d.y=d.floor;continue}d.flightAge=Math.min(d.duration,d.flightAge+step);const t=d.flightAge/d.duration;d.x=d.startX+(d.landX-d.startX)*t;d.y=d.startY+(d.floor-d.startY)*t-Math.sin(t*Math.PI)*d.height;d.angle=d.startAngle+d.spin*t;if(t>=1){d.settled=true;d.vx=d.vy=d.spin=0;game.api.burst(d.x,d.y,'#dfbd29',8)}}

   if(s.phase===2){phaseTwo.update(e,s,step);if(e.hp<=0)break;continue}
   if(s.blockStun>0){m.walkBlend=0;s.blockStun=Math.max(0,s.blockStun-step);m.time+=step;m.focusAge=(m.focusAge||0)+step;m.reaction=.25;
    if(s.blockStun===0){if(s.attack==='punch'){m.punchAge=null;s.attack=null}s.gap=Math.max(s.gap,.35)}continue;
   }
   if(s.cutCelebrate>0){s.cutCelebrate=Math.max(0,s.cutCelebrate-step);rig.update(m,step);continue}
   if(!s.attack){if(!s.cutWindow){s.angle+=step*.4;moveToward(e,safePoint(s.angle),step,110)}s.gap-=step;
    if(s.gap<=0&&(!portraitPhone()||Math.abs(e.y-game.state.player.y)>=Math.min(145,Math.max(110,game.state.player.y-topMargin()))-1e-6)){const sequence=['punch','spikes','teeth','beam','punch','roll','spikes','beam'];for(let i=0;i<sequence.length;i++){const kind=sequence[s.turn++%sequence.length];if(start(e,s,kind))break}}
   }
   rig.update(m,step*(s.attack==='beam'?beamPace:s.attack==='spikes'?footPace:pace));
   if(s.attack==='punch'&&m.punchAge!==null){
    const age=m.punchAge,cover=game.api.bossShotWallHit({x:e.x,y:e.y,r:12},s.target.x,s.target.y),end=s.punchEnd||(cover?{x:e.x+(s.target.x-e.x)*cover.t,y:e.y+(s.target.y-e.y)*cover.t}:s.target),a=frame(e),tx=a.x+(end.x-e.x)/(a.s*a.f),ty=a.y+(end.y-e.y)/a.s,angle=Math.atan2(ty-a.y,tx-a.x)+Math.PI/2;
    if(age>=.85&&age<2.65){const f=game.api.clamp((age-.85)/.3,0,1);m.angle=angle;m.wrist.x=m.wrist.x*(1-f)+(tx+Math.cos(angle)*27.75-Math.sin(angle)*77.7)*f;m.wrist.y=m.wrist.y*(1-f)+(ty+Math.sin(angle)*27.75+Math.cos(angle)*77.7)*f}
    if(age>=1.2&&!s.punchHit){game.api.stopSoundEffects('wobbleWindup');game.api.playSound('wobblePunch');s.punchHit=true;const shot={x:e.x,y:e.y,r:12},hit=game.api.bossShotWallHit(shot,s.target.x,s.target.y);
     if(hit){s.punchEnd={x:e.x+(s.target.x-e.x)*hit.t,y:e.y+(s.target.y-e.y)*hit.t};game.api.damageWall(hit.wall,22,s.punchEnd.x,s.punchEnd.y);counter(e,'arm');s.trapped=0;s.trapProbe=null}
     else game.api.damageStevie(12*(1-game.state.stats.playerArmor),'Wobblechomp warned punch',e);
    }
   }
   if(s.blockStun>0)continue;
   if(m.spikes.some(q=>!q.combatLaunched)){fire(e,s.attack==='roll'?{x:e.x,y:e.y}:world(e,rig.pose(m,true).parts.leg.center),s.attack==='roll'?3:5);for(const q of m.spikes)q.combatLaunched=true}
   if(s.attack==='roll'&&m.teeth.some(t=>!t.combatLaunched))game.api.playSound('wobbleTeeth');
   for(const t of m.teeth)if(!t.combatLaunched){t.combatLaunched=true;spawnTooth(e,t)}
   if(s.attack==='beam'&&m.beamAge!==null){
    const age=m.beamAge/beamPace,i=Math.min(s.beamHit,s.beamWalls.length-1),to=s.beamWalls[i]||{x:s.beamStart.x+100*Math.sin(age*6),y:s.beamStart.y},from=i>0?s.beamWalls[i-1]:s.beamStart;
    const t=game.api.clamp((age-(i>0?.45+(i-1)*.18:.2))/(i>0?.18:.25),0,1);s.beamTip={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};
    s.scorchAge+=step;if(age>=.2&&s.scorchAge>=.025){s.scorchAge=0;const eye=world(e,rig.pose(m,true).parts.stalk.center);for(let t=.2;t<=1;t+=.2)s.scorches.push({x:eye.x+(s.beamTip.x-eye.x)*t,y:eye.y+(s.beamTip.y-eye.y)*t,life:3});s.scorches=s.scorches.slice(-180)}
    while(s.beamHit<s.beamWalls.length&&m.beamAge>=beamPace*(.45+s.beamHit*.18)){const q=s.beamWalls[s.beamHit++];if(game.state.walls.includes(q.wall)){game.state.walls=game.state.walls.filter(w=>w!==q.wall);game.api.burst(q.x,q.y,'#75a999',8);game.api.floatText(q.x,q.y,'BEAMED AWAY!','#28796d')}}
   }
   if(s.attack==='roll'&&m.rollAge!==null){
    const progress=game.api.clamp((m.rollAge-1.1)/2.35,0,1);s.angle=s.rollStart+progress*3.52;rollThroughWalls(e,safePoint(s.angle,true),step);
   }else if(!portraitPhone()&&(s.attack==='teeth'||s.attack==='punch'&&s.punchHit)){s.angle+=step*.5;moveToward(e,safePoint(s.angle),step,95)}
   if(s.attack&&!rig.busy(m)){const foot=s.attack==='spikes';s.attack=null;s.gap=foot?1.8:.35;s.beamWalls=[];}
   if(game.state.player.hp<=0)break;
  }
  syncWobbleAttackSounds(e,s);
 }
 function availableParts(s){return s.phase===1&&s.blockStun>0&&s.cutWindow?[s.cutWindow.part]:[]}
 function cutWobbleStroke(points){
  if(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.api.bossEntranceActive())return false;
  if(!Array.isArray(points)||points.length<2||points.some(q=>!q||!Number.isFinite(q.x)||!Number.isFinite(q.y)))return false;
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
  for(const e of game.state.enemies){if(!isWobbleBoss(e)||e.hp<=0||e.freeze>0||e.stun>0)continue;const s=state(e);if(s.phase===2||s.model.rollAge!==null)continue;
   if(length>=12&&s.attack==='beam'&&s.model.beamAge/beamPace>=.2&&s.beamTip){
    const eye=world(e,rig.pose(s.model,true).parts.stalk.center);
    for(let i=1;i<points.length;i++)if(game.api.segmentIntersection(points[i-1],points[i],eye,s.beamTip)){if(counter(e,'stalk')){game.api.burst(eye.x,eye.y,'#61aca0',12);return true}}
   }
   const a=frame(e),local=points.map(q=>({x:a.x+(q.x-e.x)/(a.s*a.f),y:a.y+(q.y-e.y)/a.s})),allowed=length>=12?availableParts(s):[];
   const fallen=s.model.fallenParts.length;
   if(!rig.cutStroke(s.model,local,game.api.enemyMotionReduced(),allowed,{arm:cutRadius/a.s,leg:cutRadius/a.s,stalk:cutRadius/a.s}))continue;
   for(const d of s.model.fallenParts.slice(fallen)){
    const q=world(e,d);let landing=null,score=-Infinity;
    for(let i=0;i<32;i++){const x=35+((i*.618+d.part.length*.17)%1)*Math.max(1,game.state.W-70),y=topMargin()+30+((i*.414+d.part.length*.29)%1)*Math.max(1,game.state.H-topMargin()-90);if(clearance(x,y)<70)continue;const separation=Math.min(250,...s.debris.map(n=>Math.hypot(x-n.landX,y-n.floor))),distance=Math.hypot(x-q.x,y-q.y),value=separation+Math.min(180,distance);if(value>score){score=value;landing={x,y}}}
    landing??={x:35,y:Math.max(topMargin()+30,game.state.H-65)};
    s.debris.push({...d,...q,startX:q.x,startY:q.y,startAngle:d.angle,landX:landing.x,floor:landing.y,flightAge:0,duration:.95,height:Math.min(140,Math.max(45,q.y-90)),spin:(s.debris.length%2?-1:1)*Math.PI*3,facing:a.f,enlarge:1.8,settled:false});
   }
   const name=s.model.lastCut;
   s.model.cutFocus=null;s.attack=null;s.gap=.9;s.cutCelebrate=.55;s.beamWalls=[];s.blockStun=0;s.cutWindow=null;s.punchEnd=null;s.trapped=0;s.trapProbe=null;
   const cuts=s.model.armCuts+s.model.legCuts+s.model.stalkCuts;
   e.hp=Math.max(e.maxHp*.04,e.hp-e.maxHp*.16);
   game.api.damageNumber(e,e.maxHp*.16,'physical',cuts===6);game.api.playSound('wobbleTear');game.api.floatText(e.x,e.y-e.r-18,s.model[{arm:'armCuts',leg:'legCuts',stalk:'stalkCuts'}[name]]===2?'DETACHED!':'CUT · COUNTER NEXT ATTACK!','#28796d');
   if(name==='leg'&&s.model.legCuts===2)phaseTwo.siphon(e);
   if(cuts===6)phaseTwo.begin(e);return true;
  }return false;
 }
 function updateWobbleTooth(e,dt){
  if(!e.bossOwner||e.bossOwner.hp<=0||!game.state.enemies.includes(e.bossOwner)){game.state.enemies=game.state.enemies.filter(n=>n!==e);return true}
  if(e.freeze>0||e.stun>0){e.toothWarning=0;return false}
  if(e.wobbleLanding){const l=e.wobbleLanding;l.age+=dt;const t=Math.min(1,l.age/l.duration);e.x=l.startX+(l.x-l.startX)*t;e.y=l.startY+(l.y-l.startY)*t;if(l.age>=l.duration+.5)delete e.wobbleLanding;return true}
  if(game.api.touchesRefuge(e)&&!game.api.shotBlocked(e.x,e.y,game.state.player.x,game.state.player.y,0)){
   if(!e.toothWarning)game.api.animateEnemyAction(e,'bite',game.api.refugePoint(e.x,e.y));
   e.toothWarning=(e.toothWarning||0)+dt;if(e.toothWarning>=toothBiteWarning){game.api.damageStevie(e.dmg*(1-game.state.stats.playerArmor),'Tooth doodle warned bite',e);game.state.enemies=game.state.enemies.filter(n=>n!==e)}return true;
  }
  e.toothWarning=0;return false;
 }
 function wobbleToothHeight(e){const l=e.wobbleLanding;if(!l||game.api.enemyMotionReduced())return 0;return l.age<l.duration?Math.sin(l.age/l.duration*Math.PI)*l.height:l.age<l.duration+.25?Math.sin((l.age-l.duration)/.25*Math.PI)*15:0}
 function clearWobbleBoss(e){game.state.enemyShots=game.state.enemyShots.filter(s=>s.wobbleOwner!==e);game.state.enemies=game.state.enemies.filter(n=>n.bossOwner!==e);const s=game.api.bossBrain(e).wobble;if(s)cancel(e,s)}
 function moveWobbleFields(dx,dy){for(const e of game.state.enemies){const l=e.wobbleLanding;if(l){l.startX+=dx;l.startY+=dy;l.x+=dx;l.y+=dy}if(isWobbleBoss(e)){const s=state(e);for(const p of [s.target,s.punchEnd,s.trapProbe,s.detour,s.beamStart,s.beamTip])if(p){p.x+=dx;p.y+=dy}for(const q of [...s.beamWalls,...s.rollRoute,...s.scorches,...s.debris,...(s.trail||[]),...(s.rail?.points||[])]){q.x+=dx;q.y+=dy;if(q.floor!==undefined)q.floor+=dy;if(q.startX!==undefined){q.startX+=dx;q.startY+=dy;q.landX+=dx}}}}}
 function drawWobbleEnemy(e,model=null){const ctx=game.dom.ctx,m=model||game.api.bossBrain(e).wobble?.model;if(!m)return;const a=frame(e,m);ctx.save();ctx.scale(a.s*a.f,a.s);ctx.translate(-a.x,-a.y);if(art)rig.draw(ctx,art,m,{reduced:game.api.enemyMotionReduced(),guide:false,effects:false,debris:false});else{ctx.fillStyle='#ead326';ctx.beginPath();ctx.arc(a.x,a.y,110,0,Math.PI*2);ctx.fill()}ctx.restore()}
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
   for(const q of s.scorches){ctx.save();ctx.globalAlpha=Math.min(.45,q.life*.2);ctx.strokeStyle='#6e492c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q.x-3,q.y-2);ctx.lineTo(q.x+3,q.y+2);ctx.moveTo(q.x-2,q.y+3);ctx.lineTo(q.x+2,q.y-3);ctx.stroke();ctx.restore()}
   if(art)for(const d of s.debris){ctx.save();const playful=s.phase===2&&!d.used&&!game.api.enemyMotionReduced();ctx.globalAlpha=d.used?.4:1;ctx.translate(d.x,d.y+(playful&&d.part==='leg'?-Math.abs(Math.sin(s.model.time*3))*3:0));if(playful)ctx.rotate(Math.sin(s.model.time*(d.part==='arm'?4:2))*(d.part==='arm'?.18:.07));ctx.scale(scale()*(d.enlarge||1)*d.facing*(1+(d.impact||0)*.15),scale()*(d.enlarge||1)*(1+(d.impact||0)*.15));rig.drawFallenPart(ctx,art,{...d,x:0,y:0},game.api.enemyMotionReduced());ctx.restore()}
   phaseTwo.drawWell(s);
   const hintY=s.phase===1&&portraitPhone()&&e.y<hintTop()+100?game.state.H-110:hintTop();
   if(s.phase===2){phaseTwo.draw(e,s,hintY);continue}
   ctx.save();ctx.lineWidth=2;ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#385c4a';ctx.fillText('PHASE 1 · COUNTER, THEN CUT',game.state.W/2,hintY);ctx.font='bold 11px sans-serif';ctx.fillText('Arm '+s.model.armCuts+'/2 · Leg '+s.model.legCuts+'/2 · Eye '+s.model.stalkCuts+'/2',game.state.W/2,hintY+16);
   ctx.fillStyle='#966425';ctx.fillText(s.cutWindow?'STUNNED · CUT THE '+({arm:'ARM',leg:'FOOT',stalk:'EYE'}[s.cutWindow.part])+' ONCE!':({punch:'BLOCK PUNCH → STUN → CUT ARM',spikes:'BLOCK A FOOT SPIKE → STUN → CUT FOOT',beam:'CROSS LIVE LASER → STUN → CUT EYE',teeth:'TEETH · BLOCK THE WARNED BITES',roll:'ROLL · BLOCK THE SPIKES'}[s.attack]||'COUNTER AN ATTACK TO OPEN A CUT'),game.state.W/2,hintY+32);
   if(s.blockStun>0){ctx.strokeStyle='#966425';ctx.lineWidth=2;for(let i=0;i<3;i++){const a=i*Math.PI*2/3+(game.api.enemyMotionReduced()?0:s.model.time*2),x=e.x+Math.cos(a)*23,y=e.y-e.r-14+Math.sin(a)*6;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke()}}
   if(s.trapWarning){const q=game.api.nearestBossWallForStaple(e);if(q){ctx.strokeStyle='#b34936';ctx.lineWidth=3;ctx.beginPath();q.wall.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}}
   if(s.attack==='punch'&&!s.punchHit){ctx.strokeStyle='#b34936';ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(s.target.x,s.target.y);ctx.stroke();ctx.setLineDash([])}
   if(s.attack==='beam'&&s.beamTip){const eye=world(e,rig.pose(s.model,game.api.enemyMotionReduced()).parts.stalk.center),firing=s.model.beamAge/beamPace>=.2;ctx.strokeStyle='#28796d';ctx.lineWidth=firing?5:2;ctx.setLineDash(firing?[]:[6,5]);ctx.beginPath();ctx.moveTo(eye.x,eye.y);ctx.lineTo(s.beamTip.x,s.beamTip.y);ctx.stroke();ctx.setLineDash([]);}
   if(s.attack==='roll'&&s.model.rollAge<1.1){ctx.strokeStyle='#b34936';ctx.lineWidth=e.r*1.5;ctx.globalAlpha=.12;ctx.beginPath();s.rollRoute.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.stroke();ctx.setLineDash([])}
   const p=rig.pose(s.model,game.api.enemyMotionReduced());for(const name of availableParts(s)){const limb=p.parts[name];if(limb.cuts===2)continue;const a=world(e,limb.joint.a),b=world(e,limb.joint.b);ctx.strokeStyle='#28796d';ctx.lineWidth=3;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc((a.x+b.x)/2,(a.y+b.y)/2,cutRadius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.font='bold 12px sans-serif';ctx.fillStyle='#28796d';const labelX=game.api.clamp((a.x+b.x)/2,55,game.state.W-55),labelY=(a.y+b.y)/2+cutRadius+30;ctx.fillStyle='#fff7df';ctx.fillRect(labelX-49,labelY-15,98,21);ctx.fillStyle='#28796d';ctx.fillText(limb.cuts===1?'RIP 2/2':'RIP 1/2',labelX,labelY);ctx.strokeStyle='#fff7df';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#28796d';ctx.lineWidth=3;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([])}ctx.restore();
  }ctx.restore();
 }
 function wobbleSnapshot(e){const s=game.api.bossBrain(e).wobble;return s?{phase:s.phase,phaseHits:s.phaseHits,transition:s.transition??0,inkPot:s.inkPot?{...s.inkPot}:null,rolling:s.phase===2?{vx:s.rollVX??0,vy:s.rollVY??0,armedFor:s.armedFor,bounces:s.bounces,riding:!!s.rail,railPoints:s.rail?s.rail.points.slice(s.rail.index).map(q=>({...q})):[]}:null,attack:s.attack,turn:s.turn,gap:s.gap,pace,footPace,cutRadius,topMargin:topMargin(),keepout:keepout(),bodyWidth:320*scale(),cutSeconds:s.cutWindow?.left??0,clearance:clearance(e.x,e.y),blockStun:s.blockStun,trapped:s.trapped,beamHit:s.beamHit,beamTargets:s.beamWalls.length,beamTip:s.beamTip?{...s.beamTip}:null,beamOrigin:world(e,rig.pose(s.model,true).parts.stalk.center),scorches:s.scorches.map(q=>({...q})),debris:s.debris.map(q=>({...q})),punchEnd:s.punchEnd?{...s.punchEnd}:null,model:JSON.parse(JSON.stringify(s.model)),parts:Object.fromEntries(Object.entries(rig.pose(s.model,game.api.enemyMotionReduced()).parts).map(([k,v])=>[k,{cuts:v.cuts,joint:{a:world(e,v.joint.a),b:world(e,v.joint.b)}}])),available:availableParts(s),helpers:game.state.enemies.filter(n=>n.bossOwner===e).length}:null}
 const phaseTwo=DoodleDefender.WobblePhaseTwo(game,{state,rig,spawnTooth,topMargin:()=>Math.max(topMargin(),hintTop()+65)});
 const api={wobbleCounterOpen:e=>isWobbleBoss(e)&&!!game.api.bossBrain(e).wobble?.cutWindow&&game.api.bossBrain(e).wobble.blockStun>0,wobbleRailPreview:(e,points)=>phaseTwo.preview(e,state(e),{pts:points,thick:game.state.stats.lineWidth}),shredWobbleWalls,isWobbleBoss,wobblePhase,wobbleInfiniteInk,wobbleMoveClear,wobblePositionSafe,keepWobbleDistance,loadWobbleArtwork,wobbleArtworkReady:()=>!!art&&!!toothArt,initWobbleBoss,updateWobbleBoss,counterWobbleSpike,cutWobbleStroke,updateWobbleTooth,wobbleToothHeight,clearWobbleBoss,moveWobbleFields,drawWobbleEnemy,drawWobbleTooth,drawWobbleFields,wobbleSnapshot,wobbleEntrancePoint:()=>safePoint(-2.2)};Object.assign(game.api,api);return api;
};
