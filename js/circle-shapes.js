/* Circle Studies: one gesture, occupied enclosures or one temporary paper cannon. */
DoodleDefender.systems.circleShapes=function(game){
 const $=game.dom.$,tuning={minDiameter:30,maxDiameter:140,choiceSeconds:3,seconds:10,range:210,interval:1.25,boost:1.5};
 let pending=null,turret=null,clock=0,contacts=new WeakSet();
 const live=w=>w&&w.hp>0&&w.life>0&&game.state.walls.includes(w);
 const surface=e=>e.hp>0&&!e.flight&&!game.api.underPaper(e)&&!game.api.bossFriendHeld(e)&&!e.catapultHeld;
 const turretsAllowed=()=>game.state.wave%5!==0&&!game.api.bossEntranceActive()&&!game.state.enemies.some(e=>e.waveBoss&&e.hp>0);
 const enabled=()=>game.api.notebookSnapshot().levels.circles>0;
 function circleGeometry(points){
  if(!Array.isArray(points)||points.length<8||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  const g=game.api.wallGeometry(points),width=g.maxX-g.minX,height=g.maxY-g.minY,diameter=Math.max(width,height),r=(width+height)/4;
  if(diameter<tuning.minDiameter||diameter>tuning.maxDiameter||Math.min(width,height)/diameter<.72||Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)>Math.min(20,r*.4))return null;
  const x=(g.minX+g.maxX)/2,y=(g.minY+g.maxY)/2;let length=0,area=0,radialError=0;
  const clean=points.filter((p,i)=>!i||Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y)>.5);
  if(Math.hypot(clean[0].x-clean.at(-1).x,clean[0].y-clean.at(-1).y)<.5)clean.pop();
  const turns=[];
  for(let i=0;i<clean.length;i++){const a=clean[i],b=clean[(i+1)%clean.length],prev=clean[(i+clean.length-1)%clean.length];length+=Math.hypot(b.x-a.x,b.y-a.y);area+=a.x*b.y-b.x*a.y;radialError+=(Math.hypot(a.x-x,a.y-y)-r)**2;const incoming=Math.atan2(a.y-prev.y,a.x-prev.x),outgoing=Math.atan2(b.y-a.y,b.x-a.x);turns.push(Math.abs(Math.atan2(Math.sin(outgoing-incoming),Math.cos(outgoing-incoming))));}
  const turnTotal=turns.reduce((a,b)=>a+b,0),sharp=turns.sort((a,b)=>b-a).slice(0,4).reduce((a,b)=>a+b,0);
  if(!length||4*Math.PI*Math.abs(area/2)/(length*length)<.78||Math.sqrt(radialError/clean.length)/r>.18||sharp/turnTotal>.74)return null;
  return {x,y,r,diameter};
 }
 function occupied(w){return game.state.enemies.some(e=>surface(e)&&game.api.insideLoop(e,w));}
 function outsideFort(c){const p=game.api.refugePoint(c.x,c.y);return Math.hypot(c.x-p.x,c.y-p.y)>c.r+10;}
 function enclosure(w){w.circleEnclosure=true;game.api.floatText(w.circleShape.x,w.circleShape.y-w.circleShape.r-10,'ENCLOSE! ×1.5','#477a65');}
 function finishCircle(w){
  if(!enabled()||!live(w)||w.wobbleBumper||w.sneakyDraft||game.api.firstLessonActive())return false;
  const c=circleGeometry(w.pts);if(!c)return false;w.closed=true;w.circleShape=c;
  if(Math.hypot(w.pts[0].x-w.pts.at(-1).x,w.pts[0].y-w.pts.at(-1).y)>.01)w.pts=w.pts.concat([{...w.pts[0]}]);
  if(occupied(w)){enclosure(w);return true;}
  if(!turretsAllowed()){game.api.floatText(c.x,c.y-c.r-12,'No turrets on boss waves','#896847');return false;}
  if(!outsideFort(c)){game.api.floatText(c.x,c.y-c.r-12,'Give Stevie some room!','#896847');return false;}
  if(turret){game.api.floatText(c.x,c.y-c.r-12,'One turret at a time','#896847');return false;}
  pending={wall:w,circle:c,left:tuning.choiceSeconds};syncCirclePrompt();return true;
 }
 function resolveCircleChoice(yes,automatic=false){
  if(!pending)return false;
  if(!automatic&&(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.api.infoOpen()))return false;
  const p=pending;pending=null;syncCirclePrompt();if(!yes||!live(p.wall))return true;
  // A monster can enter during the offer. Never seal it into an ignored turret.
  if(occupied(p.wall)){enclosure(p.wall);return true;}
  if(!turretsAllowed()||turret||!outsideFort(p.circle))return true;
  p.wall.shapeTurret=true;p.wall.circleEnclosure=false;p.wall.life=p.wall.maxLife=tuning.seconds;
  game.state.walls=game.state.walls.filter(w=>w!==p.wall);
  turret={wall:p.wall,circle:p.circle,left:tuning.seconds,age:0,cd:.25,angle:0,recoil:0,draft:0};
  game.api.floatText(p.circle.x,p.circle.y-p.circle.r-10,'PAPER TURRET!','#42698e');game.api.playSound('pencil');return true;
 }
 function resetCircleShapes(){pending=null;turret=null;clock=0;contacts=new WeakSet();syncCirclePrompt();}
 function syncCirclePrompt(){
  const show=!!pending&&turretsAllowed()&&game.state.running&&!game.state.paused&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec&&!game.api.infoOpen()&&!game.api.synergyRevealActive()&&!game.api.bossEntranceActive();
  const box=$('circlePrompt');box.hidden=!show;if(!show)return;
  $('circlePromptText').textContent='Turret? '+Math.ceil(pending.left)+'s';
  box.style.left=game.api.clamp(pending.circle.x-92,8,Math.max(8,game.state.W-192))+'px';
  box.style.top=game.api.clamp(pending.circle.y-pending.circle.r-65,80,Math.max(80,game.state.H-65))+'px';
 }
 function updateCircleShapes(dt){
  contacts=new WeakSet();clock+=dt;if(!turretsAllowed()){pending=null;turret=null;syncCirclePrompt();return;}let turretDt=dt;const existing=turret,choiceLeft=pending?.left;
  if(pending){if(!live(pending.wall)){pending=null;}else{pending.left-=dt;if(pending.left<=1e-8){resolveCircleChoice(true,true);if(!existing&&turret)turretDt=Math.max(0,dt-choiceLeft);}}}
  if(turret){const t=turret;t.left=Math.max(0,t.left-turretDt);t.age+=turretDt;t.wall.life=t.left;t.recoil=Math.max(0,t.recoil-turretDt);if(t.left<=0||t.wall.hp<=0||game.api.wobbleInfiniteInk()){turret=null;}else{
   t.cd-=turretDt;const target=game.api.nearestEnemy(t.circle.x,t.circle.y,tuning.range);
   if(target&&t.cd<=0){const origin={x:t.circle.x,y:t.circle.y-4};const shot=game.api.throwPaper(target,origin,null,true,{turret:true});if(shot){t.cd=tuning.interval;t.angle=Math.atan2(target.y-origin.y,target.x-origin.x);t.recoil=.2;
    const second=shot.doodlePayload?.second||0;if(second){t.draft=Math.min(1,t.draft+Math.min(.75,.35+.1*(second-1)));if(t.draft>=1){const other=game.state.enemies.find(e=>e!==target&&e.hp>0&&Math.hypot(e.x-origin.x,e.y-origin.y)<=tuning.range);if(other&&game.api.throwPaper(other,origin,null,true,{turret:true}))t.draft-=1;}}
   }}
  }}syncCirclePrompt();
 }
 function applyCircleEnclosure(e,dt){
  if(!surface(e))return false;
  const wall=game.state.walls.find(w=>w.circleEnclosure&&w.closed&&live(w)&&game.api.insideLoop(e,w));if(!wall)return false;
  const dps=game.api.applyInkContact(e,dt*tuning.boost,wall);contacts.add(e);game.api.dealDamage(e,dps*dt*tuning.boost,'physical');return true;
 }
 function shapeMoveClear(e,x,y){if(!turret||!turretsAllowed()||e.waveBoss||e.flight||game.api.underPaper(e))return true;const c=turret.circle,r=c.r+e.r+4,start=Math.hypot(e.x-c.x,e.y-c.y),end=Math.hypot(x-c.x,y-c.y);if(start<r)return end>=start;return game.api.pointSegDist(c.x,c.y,e.x,e.y,x,y)>=r;}
 function avoidCircleTurret(e,dt){
  if(!turret||!turretsAllowed()||!surface(e)||e.waveBoss||e.wobbleLanding||e.hurdle)return false;
  const c=turret.circle,r=c.r+e.r+12,goal=game.api.enemyTarget(e),d=Math.hypot(e.x-c.x,e.y-c.y);
  if(d>r+70||game.api.pointSegDist(c.x,c.y,e.x,e.y,goal.x,goal.y)>r)return false;
  if(e.stun>0||e.freeze>0)return true;
  const a=Math.atan2(e.y-c.y,e.x-c.x),cross=(e.x-c.x)*(goal.y-c.y)-(e.y-c.y)*(goal.x-c.x),sign=cross>=0?1:-1;
  const p={x:c.x+Math.cos(a+sign*.4)*r,y:c.y+Math.sin(a+sign*.4)*r},dx=p.x-e.x,dy=p.y-e.y,n=Math.hypot(dx,dy)||1,speed=e.speed*game.api.enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7)),step=Math.min(n,speed*dt);
  game.api.moveEnemySafely(e,dx/n*step,dy/n*step);return true;
 }
 function constrainCircleTurret(){if(!turret||!turretsAllowed())return;const c=turret.circle;for(const e of game.state.enemies){if(!surface(e)||e.hurdle||e.wobbleLanding)continue;const dx=e.x-c.x,dy=e.y-c.y,d=Math.hypot(dx,dy),r=c.r+e.r+5;if(d<r){const angle=d?Math.atan2(dy,dx):Math.atan2(e.y-game.state.player.y,e.x-game.state.player.x);e.x=c.x+Math.cos(angle)*r;e.y=c.y+Math.sin(angle)*r;}}}
 function circleTurretContact(e,dt){if(!turret||!turretsAllowed()||!surface(e))return;const c=turret.circle;if(Math.abs(Math.hypot(e.x-c.x,e.y-c.y)-c.r)<=e.r+turret.wall.thick/2+8&&!game.api.chonksProtected(e))game.api.dealDamage(e,game.state.stats.wallDamage*dt,'physical');}
 function moveCircleShapes(dx,dy){const circles=new Set(game.state.walls.map(w=>w.circleShape).filter(Boolean));if(pending)circles.add(pending.circle);if(turret){circles.add(turret.circle);turret.wall.pts=turret.wall.pts.map(p=>({x:p.x+dx,y:p.y+dy}));}for(const c of circles){c.x+=dx;c.y+=dy;}syncCirclePrompt();}
 function drawCircleShapes(){
  syncCirclePrompt();const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();ctx.save();
  for(const w of game.state.walls){if(!w.circleEnclosure||!w.closed||!live(w))continue;const c=w.circleShape;ctx.strokeStyle='#488b78';ctx.fillStyle='rgba(74,145,119,.045)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(c.x,c.y,c.r*.93,0,Math.PI*2);ctx.fill();ctx.stroke();if(!reduced){ctx.globalAlpha=.25;const radius=c.r*(1-(clock%1.2)/1.2);ctx.beginPath();ctx.arc(c.x,c.y,radius,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}}
  if(pending&&turretsAllowed()){const c=pending.circle;ctx.strokeStyle='#a48650';ctx.lineWidth=2;ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(c.x,c.y,c.r-3,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  if(turret&&turretsAllowed()){const t=turret,c=t.circle;ctx.globalAlpha=Math.min(1,t.left);ctx.strokeStyle='#4f5352';ctx.lineWidth=t.wall.thick;ctx.lineCap='round';ctx.beginPath();t.wall.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#557f9a';ctx.beginPath();ctx.arc(c.x,c.y,c.r-5,-Math.PI/2,-Math.PI/2+Math.PI*2*t.left/tuning.seconds);ctx.stroke();
   const image=game.api.doodleArtwork('paper-turret'),size=Math.min(48,Math.max(28,c.r)),fold=reduced?1:Math.min(1,t.age/.25),recoil=reduced?0:Math.sin(t.recoil/.2*Math.PI)*4;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(Math.cos(t.angle)<0?t.angle-Math.PI:t.angle);ctx.scale(Math.cos(t.angle)<0?-fold:fold,fold);if(image)ctx.drawImage(image,-size/2-recoil,-size*.4,size,size*.8);ctx.restore();
  }ctx.restore();
 }
 function circleShapesSnapshot(){return {pending:pending?{...pending.circle,left:pending.left}:null,turret:turret?{...turret.circle,left:turret.left,hp:turret.wall.hp,maxHp:turret.wall.maxHp,cd:turret.cd}:null,enclosures:game.state.walls.filter(w=>w.circleEnclosure&&w.closed).length};}
 const api={circleGeometry,finishCircle,resolveCircleChoice,resetCircleShapes,updateCircleShapes,applyCircleEnclosure,avoidCircleTurret,constrainCircleTurret,circleTurretContact,shapeMoveClear,drawCircleShapes,moveCircleShapes,circleShapesSnapshot,shapeBarrierWalls:()=>turret&&turretsAllowed()?[turret.wall]:[],enclosureAlreadyHit:e=>contacts.has(e),circleShapeTuning:()=>({...tuning})};Object.assign(game.api,api);
 $('circleConfirm').onclick=()=>resolveCircleChoice(true);$('circleCancel').onclick=()=>resolveCircleChoice(false);return api;
};
