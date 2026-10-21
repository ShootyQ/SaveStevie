/* Eraser-held paper trampoline. Simulation owns all clocks; rendering never rolls RNG. */
DoodleDefender.systems.paperPress=function(game){
 const tuning={delay:.4,drift:10,growTime:2.5,startRadius:28,maxRadius:90,pullSpeed:100,throwDistance:58,damage:2};
 let press=null,ripples=[];
 const touchPlay=()=>!!document.documentElement?.classList?.contains('native-app')||!!window.matchMedia?.('(pointer: coarse)').matches;
 const holdRadius=p=>Math.max(52,p.r+12);
 const allowed=()=>game.state.running&&!game.state.paused&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec&&!document.hidden&&!game.api.windowFocusBlocked?.()&&!game.api.firstLessonActive?.()&&!game.api.synergyRevealActive()&&!game.api.waveFinaleActive()&&!game.api.wobbleRepairActive()&&!game.api.bossEntranceActive()&&!game.api.whiteBrothersActive?.();
 function validPaper(p){if(game.api.bootstompRubTarget?.(p))return false;if(game.api.bootstompPressTarget?.(p))return true;return p.x>=24&&p.x<=game.state.W-24&&p.y>=85&&p.y<=game.state.H-30&&!game.api.surfaceHoleAt(p.x,p.y)&&!game.api.plaguefirePaperMissing(p)&&!game.api.touchesRefuge({...p,r:24})&&!game.api.crayonWaxCovers(p)&&!game.state.walls.some(w=>w.hp>0&&w.life>0&&game.api.nearestPointOnWall(p,w)&&Math.hypot(game.api.nearestPointOnWall(p,w).x-p.x,game.api.nearestPointOnWall(p,w).y-p.y)<w.thick/2+18);}
 function cancelPaperPress(){press=null;game.api.stopSoundEffects('paperStretch');}
 function resetPaperPress(){cancelPaperPress();ripples=[];}
 function beginPaperPress(p){cancelPaperPress();if(!allowed()||!validPaper(p)||(!game.api.bootstompPressTarget?.(p)&&game.state.enemies.some(e=>e.hp>0&&(e.type==='scrubber'||game.api.hasChonksShield(e))&&!game.api.underPaper(e)&&Math.hypot(e.x-p.x,e.y-p.y)<e.r+14)))return false;press={x:p.x,y:p.y,age:0,r:tuning.startRadius,depth:0};return true;}
 function movePaperPress(p){if(press&&Math.hypot(p.x-press.x,p.y-press.y)<=(touchPlay()&&press.age>=tuning.delay?holdRadius(press):tuning.drift))return press.age>=tuning.delay;beginPaperPress(p);return false;}
 const eligible=e=>e.hp>0&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!['boss','eraser'].includes(e.type)&&!game.api.abilityImmune(e)&&!game.api.underPaper(e)&&!e.flight&&!e.hurdle&&!e.catapultHeld&&!game.api.bossFriendHeld(e)&&!game.api.heldByCatapulter(e)&&e.freeze<=0;
 function paperPressCaptures(e){return !!press&&press.age>=tuning.delay&&eligible(e)&&Math.hypot(e.x-press.x,e.y-press.y)<=press.r+e.r*.4&&!game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},press.x,press.y);}
 function paperPressEnemyDip(e){return paperPressCaptures(e)?press.depth*Math.max(0,1-Math.hypot(e.x-press.x,e.y-press.y)/(press.r+e.r))*.65:0;}
 function updatePaperPress(dt){
  if(!allowed()){cancelPaperPress();return;}
  ripples=ripples.filter(r=>(r.age+=dt)<.48);
  if(!press)return;if(!validPaper(press)){cancelPaperPress();return;}
  press.age+=dt;if(press.age<tuning.delay)return;
  if(!press.stretchPlayed){press.stretchPlayed=true;game.api.playSound('paperStretch');}
  game.api.cancelPaperRub();game.api.stopSoundEffects('erase');
  const grow=Math.min(1,(press.age-tuning.delay)/tuning.growTime);press.r=tuning.startRadius+(Math.min(tuning.maxRadius,Math.min(game.state.W,game.state.H)*.25)-tuning.startRadius)*grow;press.depth=5+17*grow;
  for(const e of game.state.enemies){if(!paperPressCaptures(e)||e.stun>0)continue;const dx=press.x-e.x,dy=press.y-e.y,d=Math.hypot(dx,dy);if(d>4){const weight=e.type==='tank'?.55:1,step=Math.min(d-4,tuning.pullSpeed*(.55+.45*grow)*weight*dt);game.api.moveEnemySafely(e,dx/d*step,dy/d*step);}}
 }
 function releasePaperPress(){
  if(!press)return false;const p=press;if(!allowed()||p.age<tuning.delay){cancelPaperPress();return false;}
  const targets=game.state.enemies.filter(paperPressCaptures);ripples.push({x:p.x,y:p.y,r:p.r,age:0});if(ripples.length>3)ripples.shift();
  targets.forEach((e,i)=>{const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),angle=d>5?Math.atan2(dy,dx):i*2.39996,reach=tuning.throwDistance*(.6+.4*(p.r/tuning.maxRadius));let x=game.api.clamp(e.x+Math.cos(angle)*reach,e.r+10,game.state.W-e.r-10),y=game.api.clamp(e.y+Math.sin(angle)*reach,85+e.r,game.state.H-e.r-20);
   const hit=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r+1},x,y);if(hit){x=e.x+(x-e.x)*Math.max(0,hit.t-.02);y=e.y+(y-e.y)*Math.max(0,hit.t-.02);}
   const near=game.api.refugePoint(x,y);if(Math.hypot(x-near.x,y-near.y)<e.r+4){x=e.x;y=e.y;}
   e.flight={paperBounce:true,startX:e.x,startY:e.y,targetX:x,targetY:y,age:0,duration:.48,height:game.api.enemyMotionReduced()?0:20+14*p.r/tuning.maxRadius,spin:i%2?-1:1,damage:tuning.damage,stun:.25};game.api.animateEnemyAction(e,'bounce');
  });
  cancelPaperPress();game.api.playSound('paperRelease');if(targets.length){game.api.floatText(p.x,p.y-20,'BOING!','#637d63');}return true;
 }
 function updatePaperBounceFlight(e,dt){
  const f=e.flight;f.targetX=game.api.clamp(f.targetX,e.r+10,game.state.W-e.r-10);f.targetY=game.api.clamp(f.targetY,85+e.r,game.state.H-e.r-20);f.age=Math.min(f.duration,f.age+dt);const t=f.age/f.duration,x=f.startX+(f.targetX-f.startX)*t,y=f.startY+(f.targetY-f.startY)*t,hit=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},x,y);
  if(hit||game.api.touchesRefuge({...e,x,y})){f.targetX=e.x;f.targetY=e.y;f.age=f.duration;}else{e.x=x;e.y=y;}
  if(f.age>=f.duration){delete e.flight;e.stun=Math.max(e.stun,.25);game.api.animateEnemyAction(e,'dash-land');game.api.dealDamage(e,f.damage,'physical');if(e.hp<=0)game.api.killEnemy(e);}return true;
 }
 function movePaperPressBy(dx,dy){for(const p of [press,...ripples])if(p){p.x+=dx;p.y+=dy;}}
 function drawPaperPress(){
  const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();ctx.save();
  if(press&&press.age>=tuning.delay){const p=press,r=p.r,d=p.depth;ctx.save();ctx.translate(p.x,p.y);const shade=ctx.createRadialGradient(0,d*.4,2,0,0,r);shade.addColorStop(0,'rgba(171,161,142,.72)');shade.addColorStop(.65,'rgba(222,214,195,.48)');shade.addColorStop(1,'rgba(239,231,210,0)');ctx.fillStyle=shade;ctx.beginPath();ctx.ellipse(0,0,r,r*.75,0,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#7394a34d';ctx.lineWidth=1.2;for(let i=-2;i<=2;i++){const y=i*r*.24,w=Math.sqrt(Math.max(0,r*r-y*y))*.88;ctx.beginPath();ctx.moveTo(-w,y);ctx.quadraticCurveTo(0,y+d*(1-Math.abs(i)/4),w,y);ctx.stroke();}
   ctx.strokeStyle='#746b5b55';for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*.75);ctx.quadraticCurveTo(Math.cos(a)*r*.65,Math.sin(a)*r*.48+d*.25,Math.cos(a)*r*.42,Math.sin(a)*r*.32+d*.4);ctx.stroke();}ctx.restore();
   if(touchPlay()){
    const ring=holdRadius(p),grow=Math.min(1,(p.age-tuning.delay)/tuning.growTime);
    ctx.save();ctx.strokeStyle='#426b7bb3';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(p.x,p.y,ring,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle='#466e52';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,ring,-Math.PI/2,-Math.PI/2+Math.PI*2*grow);ctx.stroke();
    const label=game.api.bootstompPressTarget?.(p)?'Hold here for the stomp':grow<1?'Keep finger inside ring':'Release to bounce';
    ctx.font='15px "Stevie Pencil",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const width=ctx.measureText(label).width+18,x=game.api.clamp(p.x,width/2+6,game.state.W-width/2-6),y=p.y-ring-16<68?p.y+ring+16:p.y-ring-16;
    ctx.fillStyle='#fff9e8ed';ctx.fillRect(x-width/2,Math.min(game.state.H-15,y)-11,width,22);ctx.fillStyle='#36515b';ctx.fillText(label,x,Math.min(game.state.H-15,y));ctx.restore();
   }
  }
  for(const p of ripples){const t=p.age/.48;ctx.globalAlpha=(1-t)*.5;ctx.strokeStyle='#9a8c71';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,p.r*(reduced?1:.7+t*.5),p.r*.65*(reduced?1:.7+t*.5),0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
 }
 Object.assign(game.api,{beginPaperPress,movePaperPress,cancelPaperPress,resetPaperPress,releasePaperPress,updatePaperPress,paperPressCaptures,paperPressEnemyDip,updatePaperBounceFlight,movePaperPressBy,drawPaperPress,paperPressGuard:()=>{if(!allowed())cancelPaperPress();},paperPressSnapshot:()=>({press:press?{...press}:null,ripples:ripples.map(p=>({...p})),tuning:{...tuning}})});return {};
};
