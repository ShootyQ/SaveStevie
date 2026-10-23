/* Legendary desk creature: two deliberate eraser strokes, finite real captures. */
DoodleDefender.systems.underDesk=function(game){
 const a=game.api,s=game.state,tuning={ink:35,cooldown:24,lifetime:12,captures:3,reach:70};
 let pit=null,scars=[],armed=null,gesture=null,cooldown=0,handled=false,clock=0,noticeAt=0;
 const owned=()=>!!s.stacks['Under the Desk'];
 const active=()=>s.running&&!s.paused&&!s.inUpgrade&&!s.betweenWaves&&!s.awaitingSpec&&!document.hidden&&!a.infoOpen()&&!a.firstLessonActive()&&!a.synergyRevealActive()&&!a.waveFinaleActive()&&!a.bossEntranceActive()&&!a.wobbleRepairActive();
 const living=e=>!!e&&e.hp>0&&s.enemies.includes(e);
 const live=w=>w&&w.hp>0&&w.life>0&&s.walls.includes(w);
 const eligible=e=>!a.gravityCaptured(e)&&living(e)&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!a.abilityImmune(e)&&!a.chonksProtected(e)&&!a.underPaper(e)&&!e.flight&&!e.hurdle&&!e.catapultHeld&&!a.bossFriendHeld(e)&&!['catapulter','wallpuller','papertearer','brood','splitter','scrubber'].includes(e.type);
 function sketch(w){
  if(!live(w)||!w.closed||w.shapeTurret||w.sneakyDraft||w.wobbleBumper||(w.eraseInk||0)<6)return null;
  const b=a.wallGeometry(w.pts),width=b.maxX-b.minX,height=b.maxY-b.minY;if(Math.min(width,height)<64||Math.max(width,height)>160)return null;
  const x=(b.minX+b.maxX)/2,y=(b.minY+b.maxY)/2,r=a.clamp(Math.min(width,height)*.36,26,42),clear=Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+r+24;
  if(x<r+18||x>s.W-r-18||y<r+90||y>s.H-r-18||Math.hypot(x-s.player.x,y-s.player.y)<clear)return null;
  return {wall:w,x,y,r,radius:Math.min(width,height)/2};
 }
 function message(text){if(clock<noticeAt)return;noticeAt=clock+.6;a.setMsg(text);}
 function underDeskErase(from,to){
  handled=false;if(!active()||!owned())return false;
  const d=Math.hypot(to.x-from.x,to.y-from.y);if(d<6)return false;
  if(!gesture){const c=[...s.walls].reverse().map(sketch).find(c=>c&&a.insideLoop(from,c.wall));if(!c)return false;
   if(pit||cooldown>0){message(pit?'The desk creature is still eating!':'Under the Desk · '+Math.ceil(cooldown)+' seconds to recover.');return false;}
   gesture={...c,from:{...from},to:{...from},travel:0};const pending=a.circleShapesSnapshot().pending;if(pending&&Math.hypot(pending.x-c.x,pending.y-c.y)<5)a.resolveCircleChoice(false,true);
  }
  if(!live(gesture.wall)||Math.hypot(to.x-gesture.x,to.y-gesture.y)>gesture.radius*1.4){gesture=null;return false;}
  gesture.to={...to};gesture.travel+=d;handled=true;return true;
 }
 function endUnderDeskGesture(commit=true){
  const g=gesture;gesture=null;if(!commit||!g||!active()||!live(g.wall))return false;
  const dx=g.to.x-g.from.x,dy=g.to.y-g.from.y,d=Math.hypot(dx,dy);
  if(d<g.radius*.7||d<24||d/Math.max(1,g.travel)<.78||Math.min(Math.abs(dx),Math.abs(dy))/d<.25||a.pointSegDist(g.x,g.y,g.from.x,g.from.y,g.to.x,g.to.y)>g.radius*.3)return false;
  if(armed&&armed.wall===g.wall&&armed.left>0){const u=armed.line,vx=u.to.x-u.from.x,vy=u.to.y-u.from.y,vd=Math.hypot(vx,vy),cross=a.segmentIntersection(u.from,u.to,g.from,g.to);
   if(cross&&Math.abs((dx*vx+dy*vy)/(d*vd))<.45){armed=null;if(s.stats.ink<tuning.ink){a.setMsg('Under the Desk needs 35 extra ink. Your outline stays.');return false;}
    if(pit||cooldown>0||!sketch(g.wall))return false;
    s.stats.ink-=tuning.ink;s.walls=s.walls.filter(w=>w!==g.wall);g.wall.eraseInk=0;pit={x:g.x,y:g.y,r:g.r,age:0,phase:'burst',phaseAge:0,captures:0,victim:null,grabFrom:null,reachCd:.2};cooldown=tuning.cooldown;
    a.playSound('woodImpact');a.burst(g.x,g.y,'#b18b54',18);a.floatText(g.x,g.y-g.r-16,'I THOUGHT WE GOT RID OF THAT!','#8b5b7b');a.updateUI();return true;
   }
  }
  armed={wall:g.wall,x:g.x,y:g.y,r:g.r,radius:g.radius,line:{from:g.from,to:g.to},left:3};a.setMsg('Now erase the other diagonal to complete the X.');return false;
 }
 function heldUnderDesk(e){return !!pit&&pit.victim===e&&living(e);}
 function releaseVictim(){if(pit?.victim&&living(pit.victim)&&pit.grabFrom){const e=pit.victim,margin=e.r+20;e.x=a.clamp(pit.grabFrom.x,margin,s.W-margin);e.y=a.clamp(pit.grabFrom.y,e.r+80,s.H-margin);}if(pit){pit.victim=null;pit.grabFrom=null;}}
 function scar(p){scars.push({x:p.x,y:p.y,r:p.r});if(scars.length>6)scars.shift();}
 function finishUnderDeskWave(){gesture=null;armed=null;handled=false;if(pit){releaseVictim();scar(pit);pit=null;}}
 function resetUnderDesk(options={}){finishUnderDeskWave();if(!options.preserveScars){scars=[];cooldown=0;clock=0;noticeAt=0;}}
 function phase(name){pit.phase=name;pit.phaseAge=0;}
 function updateUnderDesk(dt){
  if(!active())return;clock+=dt;cooldown=Math.max(0,cooldown-dt);if(armed){armed.left-=dt;if(armed.left<=0||!live(armed.wall))armed=null;}
  if(!pit)return;pit.age+=dt;pit.phaseAge+=dt;pit.reachCd=Math.max(0,pit.reachCd-dt);
  if(pit.victim&&!living(pit.victim)){pit.victim=null;pit.grabFrom=null;pit.reachCd=.8;phase('open');}
  if(pit.phase==='burst'){if(pit.phaseAge>=.7)phase('open');return;}
  if(pit.phase==='reach'||pit.phase==='drag'){
   const e=pit.victim;if(!e)return;const from=pit.grabFrom;
   if(pit.phase==='reach'){e.x=from.x;e.y=from.y;if(pit.phaseAge>=.35)phase('drag');return;}
   const t=a.clamp(pit.phaseAge/.85,0,1),ease=t*t*(3-2*t);e.x=from.x+(pit.x-from.x)*ease;e.y=from.y+(pit.y-from.y)*ease;
   if(t>=1){pit.captures++;e.deskSwallowed=true;a.dealDamage(e,e.hp+e.maxHp+1,'erase');if(e.hp<=0)a.killEnemy(e);pit.victim=null;pit.grabFrom=null;phase('chew');a.playSound('paperCrumple');}return;
  }
  if(pit.phase==='chew'){if(pit.phaseAge>=1.15){pit.reachCd=.3;phase('open');a.playSound('paperPop');}return;}
  if(pit.phase==='retreat'){if(pit.phaseAge>=.7){scar(pit);pit=null;}return;}
  if(pit.age>=tuning.lifetime||pit.captures>=tuning.captures){phase('retreat');return;}
  if(pit.reachCd>0)return;
  const e=s.enemies.filter(eligible).filter(e=>Math.hypot(e.x-pit.x,e.y-pit.y)<=pit.r+tuning.reach).sort((x,y)=>Math.hypot(x.x-pit.x,x.y-pit.y)-Math.hypot(y.x-pit.x,y.y-pit.y))[0];
  if(e){pit.victim=e;pit.grabFrom={x:e.x,y:e.y};phase('reach');a.playSound('paperStretch');}
 }
 function underDeskPose(e){if(!heldUnderDesk(e))return null;const t=pit.phase==='drag'?a.clamp(pit.phaseAge/.85,0,1):0;return {visible:Math.max(.03,1-t),reduced:a.enemyMotionReduced(),y:0,angle:a.enemyMotionReduced()?0:Math.sin(pit.phaseAge*35)*.16,sx:1-t*.7,sy:1-t*.7};}
 function moveUnderDesk(dx,dy){const move=p=>{p.x+=dx;p.y+=dy;};if(pit){move(pit);if(pit.grabFrom)move(pit.grabFrom);}scars.forEach(move);if(armed){move(armed);move(armed.line.from);move(armed.line.to);}if(gesture){move(gesture);move(gesture.from);move(gesture.to);}}
 function frame(p){if(p.phase==='burst')return p.phaseAge<.3?0:1;if(p.phase==='reach'||p.phase==='drag')return 3;if(p.phase==='chew')return 4;if(p.phase==='retreat')return 1;return 2;}
 function artwork(ctx,p,index,alpha=1){const image=a.doodleArtwork('under-desk');ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);if(image){const cw=image.width/3,ch=image.height/2,size=p.r*3.3;ctx.drawImage(image,index%3*cw,Math.floor(index/3)*ch,cw,ch,-size/2,-size/2,size,size);}else{ctx.fillStyle='#514039';ctx.strokeStyle='#b38b57';ctx.lineWidth=9;ctx.beginPath();ctx.ellipse(0,0,p.r,p.r*.7,0,0,Math.PI*2);ctx.fill();ctx.stroke();}ctx.restore();}
 function drawUnderDeskGround(){
  const ctx=game.dom.ctx,reduced=a.enemyMotionReduced();ctx.save();for(const p of scars)artwork(ctx,p,5,.65);
  if(pit){const p=pit;ctx.save();if(p.phase==='burst'&&!reduced){const t=a.clamp(p.phaseAge/.7,0,1);ctx.translate(p.x,p.y);ctx.scale(.65+.35*t,.65+.35*t);ctx.translate(-p.x,-p.y);}if(p.phase==='chew'&&!reduced){ctx.translate(p.x,p.y);ctx.scale(1+Math.sin(p.phaseAge*15)*.04,1-Math.sin(p.phaseAge*15)*.035);ctx.translate(-p.x,-p.y);}if(p.phase==='reach'||p.phase==='drag'){artwork(ctx,p,5);ctx.save();ctx.beginPath();ctx.ellipse(p.x,p.y,p.r*.65,p.r*.75,0,0,Math.PI*2);ctx.clip();artwork(ctx,p,3);ctx.restore();}else artwork(ctx,p,frame(p),p.phase==='retreat'?1-p.phaseAge/.9:1);ctx.restore();
   if(p.phase==='open'&&!reduced){ctx.strokeStyle='#9976a366';ctx.lineWidth=1.5;ctx.setLineDash([3,7]);ctx.beginPath();ctx.arc(p.x,p.y,p.r+tuning.reach,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  }
  const c=armed||(!pit&&owned()&&cooldown<=0?[...s.walls].reverse().map(sketch).find(Boolean):null);
  if(c){ctx.strokeStyle='#8d6d9c';ctx.lineWidth=2;ctx.setLineDash([5,5]);const d=c.radius*.44;ctx.beginPath();ctx.moveTo(c.x-d,c.y-d);ctx.lineTo(c.x+d,c.y+d);ctx.moveTo(c.x+d,c.y-d);ctx.lineTo(c.x-d,c.y+d);ctx.stroke();ctx.setLineDash([]);ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillStyle='#805d8d';ctx.fillText(armed?'OTHER SLASH · 35 INK':'ERASE X · 35 INK',a.clamp(c.x,80,s.W-80),Math.max(100,c.y-c.radius-15));}
  ctx.restore();
 }
 function drawUnderDeskActors(){
  if(!pit){if(owned()&&s.running){const ctx=game.dom.ctx;ctx.save();ctx.font='bold 12px "Stevie Pencil", cursive';ctx.fillStyle='#805d8d';ctx.textAlign='right';ctx.fillText(cooldown>0?'DESK NAP · '+Math.ceil(cooldown)+'s':'UNDER DESK · READY',s.W-14,100);ctx.restore();}return;}const ctx=game.dom.ctx,p=pit,e=p.victim,reduced=a.enemyMotionReduced();ctx.save();
  if(e&&living(e)){const reach=p.phase==='reach'?a.clamp(p.phaseAge/.35,0,1):1,end={x:p.x+(e.x-p.x)*reach,y:p.y+(e.y-p.y)*reach};ctx.lineCap='round';for(const sign of [-1,1]){ctx.strokeStyle='#574050';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(p.x+sign*10,p.y);ctx.quadraticCurveTo(p.x+sign*28,(p.y+end.y)/2,end.x+sign*e.r*.5,end.y);ctx.stroke();ctx.strokeStyle=sign<0?'#aa78ac':'#9870ad';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#db9cae';ctx.beginPath();ctx.arc(end.x+sign*e.r*.5,end.y,5,0,Math.PI*2);ctx.fill();}const pose=underDeskPose(e);ctx.fillStyle='#4b334438';ctx.beginPath();ctx.ellipse(e.x,e.y+e.r*.6,e.r*pose.sx,e.r*.35*pose.sy,0,0,Math.PI*2);ctx.fill();a.drawPaperDoodle(e,pose);}
  ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillStyle='#785085';ctx.fillText(p.phase==='chew'?'…BURP.':p.phase==='reach'||p.phase==='drag'?'NOPE. MINE.':p.phase==='retreat'?'BACK TO THE BASEMENT':(tuning.captures-p.captures)+' GRABS LEFT',a.clamp(p.x,85,s.W-85),p.y+p.r+23);
  if(p.phase==='chew'&&!reduced){const t=(p.phaseAge%.6)/.6;ctx.strokeStyle='#a7a35d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x+12,p.y-p.r-5-t*14);ctx.quadraticCurveTo(p.x+21,p.y-p.r-12-t*14,p.x+11,p.y-p.r-19-t*14);ctx.stroke();}
  ctx.restore();
 }
 const underDeskSnapshot=()=>({cooldown,gesture:gesture?{x:gesture.x,y:gesture.y,travel:gesture.travel}:null,armed:armed?{x:armed.x,y:armed.y,left:armed.left}:null,pit:pit?{x:pit.x,y:pit.y,r:pit.r,age:pit.age,phase:pit.phase,captures:pit.captures,victim:pit.victim?.type||null}:null,scars:scars.map(p=>({...p}))});
 function underDeskPaperMissing(p){const inside=q=>((p.x-q.x)/q.r)**2+((p.y-q.y)/(q.r*.7))**2<=1;return !!(pit&&inside(pit))||scars.some(inside);}
 Object.assign(a,{underDeskPaperMissing,updateUnderDeskPresentation:dt=>{if(pit&&pit.phase==='chew'&&!s.paused)pit.phaseAge+=dt;},underDeskErase,endUnderDeskGesture,heldUnderDesk,underDeskPose,updateUnderDesk,drawUnderDeskGround,drawUnderDeskActors,moveUnderDesk,finishUnderDeskWave,resetUnderDesk,underDeskSnapshot,underDeskEraseHandled:()=>handled,resetUnderDeskEraseHandled:()=>{handled=false;}});return {};
};
