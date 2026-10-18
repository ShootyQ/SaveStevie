/* Two deliberate bites remove a mouth-sized section, never an entire stroke. */
DoodleDefender.systems.chompzilla=function(game){
 const api=game.api,tuning={windup:.45,secondWindup:.35,chomp:.2,chew:.25,miss:.65,squeeze:1.4,gapPad:3};
 let brains=new WeakMap(),serial=0;
 function brain(e){let b=brains.get(e);if(!b){b={phase:'walk',age:0,bites:0,point:null,exit:null,wallId:null,facing:1,hit:0};brains.set(e,b);}return b;}
 function resetChompzilla(){brains=new WeakMap();}
 function playable(){const s=game.state;return s.running&&!s.paused&&!s.inUpgrade&&!s.betweenWaves&&!s.awaitingSpec&&!api.waveFinaleActive()&&!api.bossEntranceActive();}
 function target(b){
  if(!b.point)return null;
  for(const w of game.state.walls){if(w.chompWallId!==b.wallId||w.hp<=0||w.life<=0)continue;const p=api.nearestPointOnWall(b.point,w);if(p&&Math.hypot(p.x-b.point.x,p.y-b.point.y)<2)return w;}
  return null;
 }
 function phase(b,name){b.phase=name;b.age=0;}
 function miss(e,b){phase(b,'miss');b.bites=0;b.wallId=null;api.floatText(e.x,e.y-e.r-16,'HUH?','#8c653f');}
 function lock(e,b,hit){
  const w=hit.wall,p=api.nearestPointOnWall(e,w);if(!p)return false;
  if(!w.chompWallId)w.chompWallId=++serial;
  const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy),fallback=Math.atan2(game.state.player.y-e.y,game.state.player.x-e.x),nx=d>.01?dx/d:Math.cos(fallback),ny=d>.01?dy/d:Math.sin(fallback),reach=e.r+w.thick/2+12;
  b.point={x:p.x,y:p.y};b.exit={x:p.x+nx*reach,y:p.y+ny*reach};b.wallId=w.chompWallId;b.bites=0;b.facing=nx<0?-1:1;phase(b,'windup');return true;
 }
 function updateChompzilla(e,dt){
  if(e.type!=='gnawer'||e.hp<=0||!playable())return false;
  const b=brain(e),frozen=e.freeze>0||e.stun>0;
  if(!frozen)b.hit=Math.max(0,b.hit-dt);
  const hit=api.nearestWallHit(e)||api.gravityWallHit(e);
  if(hit){api.dealDamage(e,api.applyInkContact(e,dt,hit.wall)*dt,'physical');if(e.hp<=0)return true;}
  if(e.freeze>0||e.stun>0)return b.phase!=='walk'||!!hit;
  if(b.phase==='walk')return hit?lock(e,b,hit):false;
  b.age+=dt;
  if(b.phase==='miss'){if(b.age>=tuning.miss){phase(b,'walk');b.point=null;b.exit=null;}return true;}
  if(b.phase==='squeeze'){
   const dx=b.exit.x-e.x,dy=b.exit.y-e.y,d=Math.hypot(dx,dy),step=Math.min(d,e.speed*api.enemyMoveScale(e)*1.35*dt*(1-api.clamp(e.gravitySlow,0,.7)));
   if(d<2||b.age>=tuning.squeeze){phase(b,'walk');b.point=null;b.exit=null;return true;}
   // Each layer still blocks him. A fresh wall can stop his wriggle immediately.
   if(!api.moveEnemySafely(e,dx/(d||1)*step,dy/(d||1)*step)){phase(b,'walk');b.point=null;b.exit=null;}
   else api.contactStevie(e);
   return true;
  }
  const w=target(b);
  if(!w||Math.hypot(e.x-b.point.x,e.y-b.point.y)>e.r+w.thick/2+16){miss(e,b);return true;}
  if(b.phase==='windup'&&b.age>=(b.bites?tuning.secondWindup:tuning.windup)){phase(b,'chomp');}
  else if(b.phase==='chomp'&&b.age>=tuning.chomp){
   b.bites++;api.animateEnemyAction(e,'bite',b.point);
   if(b.bites===1){api.playSound('paperCrumple');phase(b,'chew');}
   else{
    const opened=api.eraseWallPath(b.point,b.point,e.r+tuning.gapPad,{enemy:true,onlyWall:w});
    if(opened){api.playSound('wallBreak');b.wallId=null;phase(b,'squeeze');}else miss(e,b);
   }
  }else if(b.phase==='chew'&&b.age>=tuning.chew)phase(b,'windup');
  return true;
 }
 function chompzillaFrame(e){
  if(e.hp<=0)return 15;
  const b=brains.get(e),reduced=api.enemyMotionReduced();if(!b||b.phase==='walk')return b?.hit>0?14:reduced?0:Math.floor(api.enemyWalkClock(e)*8)%4;
  if(b.phase==='windup')return 4+(reduced?0:Math.min(1,Math.floor(b.age/(b.bites?tuning.secondWindup:tuning.windup)*2)));
  if(b.phase==='chomp')return 6+(reduced?1:Math.min(1,Math.floor(b.age/tuning.chomp*2)));
  if(b.phase==='chew')return 8+(reduced?0:Math.floor(b.age*8)%2);
  if(b.phase==='squeeze')return 10+(reduced?0:Math.floor(b.age*9)%2);
  return 12+(reduced?1:Math.min(1,Math.floor(b.age/tuning.miss*2)));
 }
 function drawChompzilla(e){
  if(e.type!=='gnawer')return false;const image=api.doodleArtwork('gnawer-animations');if(!image)return false;
  const frame=chompzillaFrame(e),cw=image.naturalWidth/4,rows=[0,310,609,889,1213],row=Math.floor(frame/4),scale=image.naturalHeight/1213,y=rows[row]*scale,h=(rows[row+1]-rows[row])*scale,ctx=game.dom.ctx,width=e.r*3.6,height=width*h/cw,b=brains.get(e),facing=b&&b.phase!=='walk'?b.facing:api.enemyFacing(e);
  ctx.save();if(facing<0)ctx.scale(-1,1);ctx.drawImage(image,(frame%4)*cw,y,cw,h,-width/2,-height*.55,width,height);ctx.restore();return true;
 }
 function drawChompzillaMarks(){
  const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle='#84613d';ctx.lineWidth=2;ctx.lineCap='round';
  for(const e of game.state.enemies){if(e.type!=='gnawer'||e.hp<=0)continue;const b=brains.get(e);if(!b?.point||b.bites!==1||!target(b)||!['windup','chomp','chew'].includes(b.phase))continue;
   const {x,y}=b.point;ctx.beginPath();ctx.moveTo(x-7,y-8);ctx.lineTo(x-2,y-3);ctx.lineTo(x+3,y-6);ctx.lineTo(x+1,y+1);ctx.lineTo(x+7,y+7);ctx.stroke();
  }ctx.restore();
 }
 function moveChompzilla(dx,dy){for(const e of game.state.enemies){const b=brains.get(e);for(const p of [b?.point,b?.exit])if(p){p.x+=dx;p.y+=dy;}}}
 const exported={updateChompzilla,resetChompzilla,drawChompzilla,drawChompzillaMarks,moveChompzilla,chompzillaFrame,chompzillaHit:e=>{if(e.type==='gnawer')brain(e).hit=.12;},chompzillaSnapshot:e=>{const b=brains.get(e);return b?{phase:b.phase,age:b.age,bites:b.bites,point:b.point?{...b.point}:null,exit:b.exit?{...b.exit}:null}:null;}};Object.assign(api,exported);return exported;
};
