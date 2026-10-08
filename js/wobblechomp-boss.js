/* Wave 10, phases one and two: drawn cuts, actual cover, and boss-owned tooth helpers. */
DoodleDefender.systems.wobbleBoss=function(game){
 const rig=DoodleDefender.WobblechompRig,pace=1.45,footPace=1,beamPace=1.9,cap=10,toothBiteWarning=1.2,cutRadius=18;
 let art=null,toothArt=null,loading=false;
 const isWobbleBoss=e=>!!e.waveBoss&&e.type==='wobblechomp';
 function loadWobbleArtwork(){
  if(loading||typeof Image==='undefined')return;loading=true;
  const version=document.documentElement?.dataset?.build,suffix=version?'?v='+encodeURIComponent(version):'';
  for(const [file,set] of [['wobblechomp-parts',i=>art=i],['wobble-tooth',i=>toothArt=i]]){const i=new Image();i.onload=()=>set(i);i.onerror=()=>{loading=false};i.src='assets/art/'+file+'.png'+suffix}
 }
 function state(e){const b=game.api.bossBrain(e);if(!b.wobble){const model=rig.create();model.time=1;b.wobble={model,phase:1,phaseHits:0,inkPot:null,attack:null,turn:0,gap:1.4,angle:-2.2,facing:game.state.player.x>=e.x?-1:1,cutWindow:null,punchHit:false,beamHit:0,beamWalls:[],target:null,rollStart:0,rollRoute:[],helperSerial:0,blockStun:0,trapped:0,trapWarning:false,debris:[],scorches:[],scorchAge:0,detour:null,routeAge:0}}return b.wobble}
 // Size the entire puppet down; keep the green cut rings easy to hit.
 function scale(){return .17}
 function frame(e,m=state(e).model){const p=rig.pose(m,game.api.enemyMotionReduced()),s=scale(),f=game.api.bossBrain(e).wobble?.facing??-1;return {p,s,f,x:p.roll?p.roll.x+p.entry:570+p.entry,y:p.roll?p.roll.y:410+p.bob}}
 function world(e,q){const a=frame(e);return {x:e.x+(q.x-a.x)*a.s*a.f,y:e.y+(q.y-a.y)*a.s}}
 function clearance(x,y){const q=game.api.refugePoint(x,y);return Math.hypot(x-q.x,y-q.y)}
 const portraitPhone=()=>game.state.W<500&&game.state.H>=game.state.W;
 const sideMargin=()=>portraitPhone()?24:60;
 const keepout=()=>wobbleInfiniteInk()?30:portraitPhone()?Math.min(95,Math.max(60,game.state.W/2-56-sideMargin()-1)):95;
 function hintTop(){const label=game.dom.$('bossOvertime'),rect=label.getBoundingClientRect?.(),canvas=game.dom.canvas.getBoundingClientRect();return Math.max(92,Number.isFinite(rect?.bottom)&&label.style.display!=='none'?rect.bottom-canvas.top+18:92)}
 // Leave the entire upright stalk below the three instruction lines on tall desktop pages.
 function topMargin(){return !portraitPhone()&&game.state.H>=600?Math.max(190,hintTop()+102):90}
 function travelClear(a,b){for(let t=0;t<=1;t+=.05)if(!wobblePositionSafe(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;return true}
 function wobblePositionSafe(x,y){return clearance(x,y)>=keepout()}
 function wobbleMoveClear(e,x,y){
  if(!wobblePositionSafe(x,y))return false;const ignore=new Set();
  for(const w of game.state.walls){const a=game.api.nearestPointOnWall(e,w),b=game.api.nearestPointOnWall({x,y},w);if(!a||!b)continue;
   const old=Math.hypot(a.x-e.x,a.y-e.y),next=Math.hypot(b.x-x,b.y-y);
   if(old<e.r+w.thick/2+1&&next>old+1e-6)ignore.add(w);
  }
  return !game.api.shotBlocked(e.x,e.y,x,y,e.r,ignore);
 }
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
  for(const w of game.state.walls){const pad=e.r+w.thick/2+8,xs=w.pts.map(p=>p.x),ys=w.pts.map(p=>p.y);
   for(const x of [Math.min(...xs)-pad,Math.max(...xs)+pad])for(const y of [Math.min(...ys)-pad,Math.max(...ys)+pad]){
    if(nodes.length<82&&x>=sideMargin()&&x<=W-sideMargin()&&y>=topMargin()&&y<=H-60&&wobblePositionSafe(x,y))nodes.push({x,y});
   }
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
  const hit=game.api.nearestBossWallForStaple(e);
  if(!hit||Math.hypot(hit.x-e.x,hit.y-e.y)>e.r+30){s.trapped=0;s.trapWarning=false;s.trapProbe=null;return}
  if(s.trapProbe.age>=.35){const probe=s.trapProbe;
   if(game.api.insideLoop(e,hit.wall)||Math.hypot(e.x-probe.x,e.y-probe.y)<12)s.trapped+=probe.age;else{s.trapped=0;s.trapWarning=false}
   s.trapProbe={x:e.x,y:e.y,age:0};
  }
  if(s.trapped>=.25&&!s.trapWarning){s.trapWarning=true;game.api.floatText(e.x,e.y-e.r-15,'MAKE ROOM!','#966425')}
  if(s.trapped>=.65){game.api.damageWall(hit.wall,Math.max(hit.wall.hp,hit.wall.maxHp),hit.x,hit.y);game.api.playSound('rock');s.trapped=0;s.trapWarning=false;s.trapProbe=null}
 }
 // The phase-one ball follows its warned route through ink. Refuge clearance
 // and page bounds still apply; walking continues to route around cover.
 function rollThroughWalls(e,q,dt){
  const s=state(e),dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy),n=Math.min(d,280*dt);if(!d)return;
  for(const offset of [0,.55,-.55,1.1,-1.1,Math.PI/2,-Math.PI/2]){const angle=Math.atan2(dy,dx)+offset,x=e.x+Math.cos(angle)*n,y=e.y+Math.sin(angle)*n;if(x<sideMargin()||x>game.state.W-sideMargin()||y<topMargin()||y>game.state.H-60||!wobblePositionSafe(x,y))continue;e.x=x;e.y=y;break}
  s.detour=null;s.trapped=0;s.trapWarning=false;s.trapProbe=null;
 }
 function start(e,s,kind){
  const fn={punch:rig.punch,spikes:rig.shootSpikes,beam:rig.eyeBeam,teeth:rig.shakeTeeth,roll:rig.tuckAndRoll}[kind];
  if(!fn(s.model))return false;s.attack=kind;s.target={x:game.state.player.x,y:game.state.player.y};s.punchHit=false;s.punchEnd=null;s.beamHit=0;
  s.facing=game.state.player.x>=e.x?-1:1;
  if(kind==='beam'){s.beamStart={x:game.state.player.x,y:game.state.player.y};s.beamTip={...s.beamStart};s.beamWalls=game.state.walls.filter(w=>w.hp>0&&w.life>0).map(w=>({wall:w,...game.api.wallGeometry(w.pts)})).sort((a,b)=>Math.hypot(a.cx-game.state.player.x,a.cy-game.state.player.y)-Math.hypot(b.cx-game.state.player.x,b.cy-game.state.player.y)).slice(0,6).map(q=>({wall:q.wall,x:q.cx,y:q.cy}));}
  if(kind==='roll'){s.rollStart=s.angle;s.rollRoute=[];for(let i=0;i<=16;i++)s.rollRoute.push(safePoint(s.angle+i*.22,true))}
  return true;
 }
 function fire(e,origin,count=5){
  const a=Math.atan2(game.state.player.y-origin.y,game.state.player.x-origin.x);
  for(let i=0;i<count&&game.state.enemyShots.length<32;i++){const angle=a+(i-(count-1)/2)*.16;game.state.enemyShots.push({x:origin.x,y:origin.y,vx:Math.cos(angle)*180,vy:Math.sin(angle)*180,r:4,damage:6,life:6,wobbleOwner:e,bossKind:'wobble-spike'})}
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
 function cancel(e,s){s.model.punchAge=s.model.spikeAge=s.model.beamAge=s.model.teethAge=s.model.rollAge=null;s.model.teethPlan=[];s.model.spikes=[];s.model.teeth=[];s.model.walkBlend=0;s.rail=null;s.attack=null;s.gap=.8;s.cutWindow=null;s.beamWalls=[];s.blockStun=0;s.trapped=0;s.trapWarning=false;s.trapProbe=null}
 function wobblePhase(e){return game.api.bossBrain(e).wobble?.phase??1}
 function wobbleInfiniteInk(){return game.state.running&&game.state.player.hp>0&&!game.state.betweenWaves&&!game.state.inUpgrade&&game.state.enemies.some(e=>isWobbleBoss(e)&&e.hp>0&&wobblePhase(e)===2)}
 function updateWobbleBoss(e,dt){
  const s=state(e);if(e.hp<=0)return;keepWobbleDistance(e);
  if(s.phase===1&&(e.freeze>0||e.stun>0)){cancel(e,s);return}
  let remaining=Math.min(dt,5);while(remaining>1e-8){const step=Math.min(.025,remaining);remaining-=step;
   if(s.cutWindow){s.cutWindow.left-=step;if(s.cutWindow.left<=0)s.cutWindow=null}
   const m=s.model;
   phaseTwo.updateSiphon(s,step);
   s.scorches=s.scorches.filter(q=>(q.life-=step)>0);
   for(const d of s.debris)if(!d.settled){d.vy+=110*step;d.x+=d.vx*step;d.y+=d.vy*step;d.angle+=d.spin*step;if(d.y>=d.floor){d.y=d.floor;d.vy*=-.3;d.vx*=.6;d.spin*=.45;if(Math.abs(d.vy)<6){d.settled=true;d.vx=d.vy=d.spin=0}}}

   if(s.phase===2){phaseTwo.update(e,s,step);if(e.hp<=0)break;continue}
   if(s.blockStun>0){m.walkBlend=0;s.blockStun=Math.max(0,s.blockStun-step);if(m.punchAge===null)rig.update(m,step*pace);else m.time+=step;m.reaction=.25;
    if(s.blockStun===0){if(s.attack==='punch'){m.punchAge=null;s.attack=null}s.gap=Math.max(s.gap,.35)}continue;
   }
   if(!s.attack){if(!s.cutWindow){s.angle+=step*.4;moveToward(e,safePoint(s.angle),step,110)}s.gap-=step;
    if(s.gap<=0&&(!portraitPhone()||Math.abs(e.y-game.state.player.y)>=145)){const sequence=['punch','spikes','teeth','beam','punch','roll','spikes','beam'];for(let i=0;i<sequence.length;i++){const kind=sequence[s.turn++%sequence.length];if(start(e,s,kind))break}}
   }
   rig.update(m,step*(s.attack==='beam'?beamPace:s.attack==='spikes'?footPace:pace));
   if(s.attack==='punch'&&m.punchAge!==null){
    const age=m.punchAge,cover=game.api.bossShotWallHit({x:e.x,y:e.y,r:12},s.target.x,s.target.y),end=s.punchEnd||(cover?{x:e.x+(s.target.x-e.x)*cover.t,y:e.y+(s.target.y-e.y)*cover.t}:s.target),a=frame(e),tx=a.x+(end.x-e.x)/(a.s*a.f),ty=a.y+(end.y-e.y)/a.s,angle=Math.atan2(ty-a.y,tx-a.x)+Math.PI/2;
    if(age>=.85&&age<2.65){const f=game.api.clamp((age-.85)/.3,0,1);m.angle=angle;m.wrist.x=m.wrist.x*(1-f)+(tx+Math.cos(angle)*27.75-Math.sin(angle)*77.7)*f;m.wrist.y=m.wrist.y*(1-f)+(ty+Math.sin(angle)*27.75+Math.cos(angle)*77.7)*f}
    if(age>=1.2&&!s.punchHit){s.punchHit=true;const shot={x:e.x,y:e.y,r:12},hit=game.api.bossShotWallHit(shot,s.target.x,s.target.y);
     if(hit){s.punchEnd={x:e.x+(s.target.x-e.x)*hit.t,y:e.y+(s.target.y-e.y)*hit.t};game.api.damageWall(hit.wall,22,s.punchEnd.x,s.punchEnd.y);game.api.floatText(s.punchEnd.x,s.punchEnd.y,'BLOCKED · STUNNED!','#28796d');s.blockStun=3;s.trapped=0;s.trapProbe=null}
     else game.api.damageStevie(12*(1-game.state.stats.playerArmor),'Wobblechomp warned punch',e);
    }
   }
   if(s.blockStun>0)continue;
   if(m.spikes.some(q=>!q.combatLaunched)){fire(e,s.attack==='roll'?{x:e.x,y:e.y}:world(e,rig.pose(m,true).parts.leg.center),s.attack==='roll'?3:5);for(const q of m.spikes)q.combatLaunched=true}
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
   if(s.attack&&!rig.busy(m)){const eye=s.attack==='beam'&&m.stalkCuts<2;s.attack=null;s.gap=eye?1.2:.35;s.beamWalls=[];if(eye)s.cutWindow={part:'stalk',left:1.2}}
   if(game.state.player.hp<=0)break;
  }
 }
 function availableParts(s){if(s.phase===2)return [];const names=[];const part={punch:'arm',spikes:'leg',beam:'stalk'}[s.attack];if(part)names.push(part);if(s.blockStun>0&&s.model.armCuts<2&&!names.includes('arm'))names.push('arm');if(s.cutWindow&&!names.includes(s.cutWindow.part))names.push(s.cutWindow.part);return names}
 function cutWobbleStroke(points){
  if(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.api.bossEntranceActive())return false;
  if(!Array.isArray(points)||points.length<2||points.some(q=>!q||!Number.isFinite(q.x)||!Number.isFinite(q.y)))return false;
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
  for(const e of game.state.enemies){if(!isWobbleBoss(e)||e.hp<=0||e.freeze>0||e.stun>0)continue;const s=state(e);if(s.phase===2||s.model.rollAge!==null)continue;
   const a=frame(e),local=points.map(q=>({x:a.x+(q.x-e.x)/(a.s*a.f),y:a.y+(q.y-e.y)/a.s})),allowed=length>=12?availableParts(s):[];
   const fallen=s.model.fallenParts.length;
   if(!rig.cutStroke(s.model,local,game.api.enemyMotionReduced(),allowed,{arm:cutRadius/a.s,leg:cutRadius/a.s,stalk:cutRadius/a.s}))continue;
   for(const d of s.model.fallenParts.slice(fallen)){const q=world(e,d);s.debris.push({...d,...q,vx:d.vx*a.s*a.f,vy:d.vy*a.s,facing:a.f,floor:Math.min(game.state.H-35,q.y+45)});}
   const name=s.model.lastCut;
   if(name==={punch:'arm',spikes:'leg',beam:'stalk'}[s.attack]){s.attack=null;s.gap=1.6;s.beamWalls=[]}
   s.gap=Math.max(s.gap,1.6);
   s.cutWindow={part:name,left:name==='leg'?2.2:1.6};
   if(name==='leg')s.gap=Math.max(s.gap,2.2);
   if(name==='arm'){s.blockStun=0;s.cutWindow=null;s.gap=.35;s.punchEnd=null;s.trapped=0;s.trapProbe=null;}
   const cuts=s.model.armCuts+s.model.legCuts+s.model.stalkCuts;
   e.hp=Math.max(e.maxHp*.04,e.hp-e.maxHp*.16);
   game.api.damageNumber(e,e.maxHp*.16,'physical',cuts===6);game.api.playSound('pencil');game.api.floatText(e.x,e.y-e.r-18,s.model[{arm:'armCuts',leg:'legCuts',stalk:'stalkCuts'}[name]]===2?'DETACHED!':name==='arm'?'ARM CUT · WAIT FOR NEXT PUNCH!':'CUT · 1 MORE!','#28796d');
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
 function moveWobbleFields(dx,dy){for(const e of game.state.enemies){const l=e.wobbleLanding;if(l){l.startX+=dx;l.startY+=dy;l.x+=dx;l.y+=dy}if(isWobbleBoss(e)){const s=state(e);for(const p of [s.target,s.punchEnd,s.trapProbe,s.detour,s.beamStart,s.beamTip])if(p){p.x+=dx;p.y+=dy}for(const q of [...s.beamWalls,...s.rollRoute,...s.scorches,...s.debris,...(s.trail||[]),...(s.rail?.points||[])]){q.x+=dx;q.y+=dy;if(q.floor!==undefined)q.floor+=dy}}}}
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
   if(art)for(const d of s.debris){ctx.save();ctx.translate(d.x,d.y);ctx.scale(scale()*d.facing,scale());rig.drawFallenPart(ctx,art,{...d,x:0,y:0},game.api.enemyMotionReduced());ctx.restore()}
   phaseTwo.drawWell(s);
   const hintY=hintTop();
   if(s.phase===2){phaseTwo.draw(e,s,hintY);continue}
   ctx.save();ctx.lineWidth=2;ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#385c4a';ctx.fillText('PHASE 1 · CUT THROUGH THE GREEN RINGS',game.state.W/2,hintY);ctx.font='bold 11px sans-serif';ctx.fillText('Arm '+s.model.armCuts+'/2 · Leg '+s.model.legCuts+'/2 · Eye '+s.model.stalkCuts+'/2',game.state.W/2,hintY+16);
   ctx.fillStyle='#966425';ctx.fillText(s.blockStun>0?(s.model.armCuts<2?'BLOCKED · STUNNED · CUT THE ARM!':'BLOCKED · STUNNED · REBUILD!'):s.cutWindow&&s.model[{arm:'armCuts',leg:'legCuts',stalk:'stalkCuts'}[s.cutWindow.part]]===1?({arm:'ARM',leg:'LEG',stalk:'EYE'}[s.cutWindow.part]+' DANGLING · CUT AGAIN!'):({punch:(s.model.armCuts===1?'PUNCH · CUT ARM RING TO DETACH!':'PUNCH · BLOCK OR CUT THE ARM RING'),spikes:'SPIKES · BLOCK OR CUT THE LEG',teeth:'TEETH · BLOCK THE WARNED BITES',beam:'BEAM · CUT THE EYE RING TO SAVE WALLS',roll:'ROLL · BLOCK THE SPIKES'}[s.attack]||(s.cutWindow?.part==='stalk'?'EYE EXPOSED · SLASH THE GREEN RING!':'WATCH FOR A GREEN RING')),game.state.W/2,hintY+32);
   if(s.blockStun>0){ctx.strokeStyle='#966425';ctx.lineWidth=2;for(let i=0;i<3;i++){const a=i*Math.PI*2/3+(game.api.enemyMotionReduced()?0:s.model.time*2),x=e.x+Math.cos(a)*23,y=e.y-e.r-14+Math.sin(a)*6;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke()}}
   if(s.trapWarning){const q=game.api.nearestBossWallForStaple(e);if(q){ctx.strokeStyle='#b34936';ctx.lineWidth=3;ctx.beginPath();q.wall.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}}
   if(s.attack==='punch'&&!s.punchHit){ctx.strokeStyle='#b34936';ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(s.target.x,s.target.y);ctx.stroke();ctx.setLineDash([])}
   if(s.attack==='beam'&&s.beamTip){const eye=world(e,rig.pose(s.model,game.api.enemyMotionReduced()).parts.stalk.center),firing=s.model.beamAge/beamPace>=.2;ctx.strokeStyle='#28796d';ctx.lineWidth=firing?5:2;ctx.setLineDash(firing?[]:[6,5]);ctx.beginPath();ctx.moveTo(eye.x,eye.y);ctx.lineTo(s.beamTip.x,s.beamTip.y);ctx.stroke();ctx.setLineDash([]);}
   if(s.attack==='roll'&&s.model.rollAge<1.1){ctx.strokeStyle='#b34936';ctx.lineWidth=e.r*1.5;ctx.globalAlpha=.12;ctx.beginPath();s.rollRoute.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.stroke();ctx.setLineDash([])}
   const p=rig.pose(s.model,game.api.enemyMotionReduced());for(const name of availableParts(s)){const limb=p.parts[name];if(limb.cuts===2)continue;const a=world(e,limb.joint.a),b=world(e,limb.joint.b);ctx.strokeStyle='#28796d';ctx.lineWidth=3;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc((a.x+b.x)/2,(a.y+b.y)/2,cutRadius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);if(name==='arm'){ctx.font='bold 10px sans-serif';ctx.fillStyle='#28796d';ctx.fillText(s.model.armCuts===1?'CUT 2/2':'CUT 1/2',(a.x+b.x)/2,(a.y+b.y)/2-cutRadius-4)}}ctx.restore();
  }ctx.restore();
 }
 function wobbleSnapshot(e){const s=game.api.bossBrain(e).wobble;return s?{phase:s.phase,phaseHits:s.phaseHits,transition:s.transition??0,inkPot:s.inkPot?{...s.inkPot}:null,rolling:s.phase===2?{vx:s.rollVX??0,vy:s.rollVY??0,armedFor:s.armedFor,bounces:s.bounces,riding:!!s.rail,railPoints:s.rail?s.rail.points.slice(s.rail.index).map(q=>({...q})):[]}:null,attack:s.attack,turn:s.turn,gap:s.gap,pace,footPace,cutRadius,topMargin:topMargin(),keepout:keepout(),bodyWidth:320*scale(),cutSeconds:s.cutWindow?.left??0,clearance:clearance(e.x,e.y),blockStun:s.blockStun,trapped:s.trapped,beamHit:s.beamHit,beamTargets:s.beamWalls.length,beamTip:s.beamTip?{...s.beamTip}:null,scorches:s.scorches.map(q=>({...q})),debris:s.debris.map(q=>({...q})),punchEnd:s.punchEnd?{...s.punchEnd}:null,model:JSON.parse(JSON.stringify(s.model)),parts:Object.fromEntries(Object.entries(rig.pose(s.model,game.api.enemyMotionReduced()).parts).map(([k,v])=>[k,{cuts:v.cuts,joint:{a:world(e,v.joint.a),b:world(e,v.joint.b)}}])),available:availableParts(s),helpers:game.state.enemies.filter(n=>n.bossOwner===e).length}:null}
 const phaseTwo=DoodleDefender.WobblePhaseTwo(game,{state,rig,spawnTooth,topMargin:()=>Math.max(topMargin(),hintTop()+65)});
 const api={isWobbleBoss,wobblePhase,wobbleInfiniteInk,wobbleMoveClear,wobblePositionSafe,keepWobbleDistance,loadWobbleArtwork,wobbleArtworkReady:()=>!!art&&!!toothArt,initWobbleBoss,updateWobbleBoss,cutWobbleStroke,updateWobbleTooth,wobbleToothHeight,clearWobbleBoss,moveWobbleFields,drawWobbleEnemy,drawWobbleTooth,drawWobbleFields,wobbleSnapshot,wobbleEntrancePoint:()=>safePoint(-2.2)};Object.assign(game.api,api);return api;
};
