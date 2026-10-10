/* Phase two: finite ink stats, an unlimited well, and player-drawn rolling rails. */
DoodleDefender.WobblePhaseTwo=function(game,{state,rig,spawnTooth,topMargin}){
 const speed=()=>game.state.W<500?145:175,requiredHits=3;
 function well(){const {W,H,player:p}=game.state;return {x:game.api.clamp(p.x-85,26,W-26),y:game.api.clamp(p.y+90,180,H-45)}}
 function siphon(e){const s=state(e);s.inkPot??={age:0,fill:0};}
 function updateSiphon(s,dt){if(!s.inkPot)return;s.inkPot.age+=dt;s.inkPot.fill=Math.min(1,s.inkPot.age/1.6);const leg=s.debris.find(d=>d.part==='leg');if(leg)leg.inkLevel=1-s.inkPot.fill;}
 function begin(e){const s=state(e);if(s.phase===2)return;s.phase=2;s.phaseHits=0;s.phaseHp=e.maxHp;s.transition=2.2;s.windup=.65;s.hitPause=0;s.rollDistance=0;s.armedFor=0;s.hitCooldown=0;s.toothClock=4.5;s.bounces=0;s.trail=[];s.attack='roll';s.cutWindow=null;s.blockStun=0;s.detour=null;s.trapped=0;s.trapWarning=false;s.model.walkBlend=0;s.model.cutFocus=null;s.model.punchAge=s.model.spikeAge=s.model.beamAge=s.model.teethAge=null;s.model.rollAge=0;s.model.phaseTwoRoll=false;s.model.teethPlan=[];s.model.teeth=[];s.model.spikes=[];
  game.state.enemyShots=game.state.enemyShots.filter(q=>q.wobbleOwner!==e);game.state.enemies=game.state.enemies.filter(n=>n.bossOwner!==e);game.state.walls=[];game.state.projectiles=[];game.api.resetAbilityEffects();game.api.resetSupportInks();game.api.resetLaunchEffects();game.api.resetPlaguefire();game.api.cancelLiveWall();game.state.currentWall=null;game.state.drawing=false;for(const d of s.debris)d.used=false;e.hp=e.maxHp;siphon(e);game.state.stats.ink=game.state.stats.maxInk;
  game.api.floatText(e.x,e.y-45,'PHASE 2 · DOODLE RAILS!','#28796d');game.api.setMsg('Doodle pinball! Infinite ink. Draw a curve into his path toward any glowing part. He rides toward the longer end and shreds the line behind him. Hit all three parts!');game.api.updateUI();
 }
 // Resize can move a fallen target off the page. Keep the foot reachable without
 // restarting the roll or cancelling its animation.
 function constrain(e,s){
  const bounds={left:e.r+10,right:game.state.W-e.r-10,top:topMargin(),bottom:Math.max(topMargin(),game.state.H-35)};
  e.x=game.api.clamp(e.x,bounds.left,bounds.right);e.y=game.api.clamp(e.y,bounds.top,bounds.bottom);
  if(s.rail){const next=s.rail.points[s.rail.index];if(!next||next.x<bounds.left||next.x>bounds.right||next.y<bounds.top||next.y>bounds.bottom)release(e,s)}
  for(const leg of s.debris){
  leg.x=game.api.clamp(leg.x,bounds.left,bounds.right);leg.y=game.api.clamp(leg.y,bounds.top+20,Math.max(bounds.top+20,bounds.bottom-20));leg.floor=game.api.clamp(leg.floor,bounds.top+20,Math.max(bounds.top+20,bounds.bottom-20));
  const q=game.api.refugePoint(leg.x,leg.y);if(Math.hypot(leg.x-q.x,leg.y-q.y)<60){const p=game.state.player;let best=null;for(const y of [p.y-145,p.y+145])if(y>=bounds.top+20&&y<=bounds.bottom-20){const d=Math.abs(y-leg.y);if(!best||d<best.d)best={y,d}}if(best){leg.y=leg.floor=best.y}else{leg.x=bounds.left;leg.y=leg.floor=game.api.clamp(p.y,bounds.top+20,bounds.bottom-20)}}
  }
 }
 function launch(e,s){const leg=s.debris.find(d=>d.part==='leg');
  if(leg&&Math.hypot(e.x-leg.x,e.y-leg.y)<70){let q=null;for(let i=0;i<32;i++){const a=i*Math.PI/16,x=leg.x+Math.cos(a)*90,y=leg.y+Math.sin(a)*90;if(x<e.r+10||x>game.state.W-e.r-10||y<topMargin()||y>game.state.H-35)continue;const p=game.api.refugePoint(x,y);if(Math.hypot(x-p.x,y-p.y)<e.r+8)continue;q={x,y};break}if(q){e.x=q.x;e.y=q.y}}
  const a=leg?Math.atan2(e.y-leg.y,e.x-leg.x)+.6:Math.PI/4;s.rollVX=Math.cos(a)*speed();s.rollVY=Math.sin(a)*speed();s.model.phaseTwoRoll=true;s.model.rollAge=1.2;
 }
 function reflect(s,nx,ny){const d=s.rollVX*nx+s.rollVY*ny;if(d<0){s.rollVX-=2*d*nx;s.rollVY-=2*d*ny}s.bounces++;}
 // One pure path planner drives real movement and the player's preview.
 function planRail(e,s,wall,contact){
  const pts=wall.pts.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y)>.01);
  if(pts.length<2)return false;
  let best=null;
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),t=game.api.clamp(((contact.x-a.x)*dx+(contact.y-a.y)*dy)/(len*len),0,1),x=a.x+dx*t,y=a.y+dy*t,d=Math.hypot(contact.x-x,contact.y-y);if(!best||d<best.d)best={i,x,y,d,tx:dx/len,ty:dy/len}}
  let before=0,after=0;
  for(let i=0;i<pts.length-1;i++){const len=Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y);if(i<best.i)before+=len;else if(i>best.i)after+=len;else{before+=Math.hypot(best.x-pts[i].x,best.y-pts[i].y);after+=Math.hypot(pts[i+1].x-best.x,pts[i+1].y-best.y)}}
  const dir=Math.abs(after-before)<.01?(s.rollVX*best.tx+s.rollVY*best.ty<0?-1:1):after>before?1:-1;
  const points=[{x:best.x,y:best.y}];for(let i=dir>0?best.i+1:best.i;i>=0&&i<pts.length;i+=dir)points.push({...pts[i]});
  return {points,dir,tx:best.tx,ty:best.ty};
 }
 function ride(e,s,wall,contact){
  const plan=planRail(e,s,wall,contact);if(!plan)return false;
  // Enter at normal travel speed rather than snapping the body sideways.
  s.rail={wall,points:plan.points,index:0};s.armedFor=6;s.bounces++;game.api.playSound('rock');game.api.floatText(e.x,e.y-36,'WHEEE!','#28796d');return true;
 }
 function release(e,s,consume=true){const rail=s.rail;if(!rail)return;s.rail=null;if(consume){rail.wall.hp=0;game.state.walls=game.state.walls.filter(w=>w!==rail.wall)}}
 function advanceRail(e,s,dt){const rail=s.rail;if(!game.state.walls.includes(rail.wall)||rail.wall.hp<=0||rail.wall.life<=0){release(e,s,false);return false}
  let travel=speed()*dt;
  while(travel>1e-8&&s.rail){const target=rail.points[rail.index],dx=target.x-e.x,dy=target.y-e.y,len=Math.hypot(dx,dy);if(len<1e-6){rail.index++;if(rail.index>=rail.points.length)release(e,s);continue}
   s.rollVX=dx/len*speed();s.rollVY=dy/len*speed();const step=Math.min(travel,len);e.x+=dx/len*step;e.y+=dy/len*step;travel-=step;s.armedFor=6;if(step>=len-1e-8){rail.index++;if(rail.index>=rail.points.length)release(e,s)}
  }
  if(s.rail){rail.wall.pts=[{x:e.x,y:e.y},...rail.points.slice(rail.index).map(q=>({...q}))];rail.wall.closed=false;rail.wall.intersections=0;}
  if(travel>0){e.x+=s.rollVX/speed()*travel;e.y+=s.rollVY/speed()*travel}return true;
 }
 function update(e,s,dt){
  if(s.transition>0){rig.update(s.model,dt*1.45);s.transition=Math.max(0,s.transition-dt);if(!s.transition)launch(e,s);return}
  if(e.freeze>0||e.stun>0)return;
  if(s.hitPause>0){s.hitPause=Math.max(0,s.hitPause-dt);s.model.time+=dt;return}
  if(s.windup>0){s.windup=Math.max(0,s.windup-dt);s.model.time+=dt;return}s.model.time+=dt;s.hitCooldown=Math.max(0,s.hitCooldown-dt);s.armedFor=Math.max(0,s.armedFor-dt);s.toothClock-=dt;

  const old={x:e.x,y:e.y};
  if(!s.rail||!advanceRail(e,s,dt)){
   const nx=e.x+s.rollVX*dt,ny=e.y+s.rollVY*dt,hit=game.api.bossShotWallHit({x:e.x,y:e.y,r:Math.max(e.r,32)},nx,ny,new Set(game.state.walls.filter(w=>!w.wobbleBumper||w.wobbleDraft)));
   if(hit){e.x+=s.rollVX*dt*hit.t;e.y+=s.rollVY*dt*hit.t;const contact={x:e.x,y:e.y};if(ride(e,s,hit.wall,contact))advanceRail(e,s,dt*(1-hit.t));else{e.x=nx;e.y=ny}}
   else{e.x=nx;e.y=ny}
  }
  game.api.shredWobbleWalls(e,old,e,s.rail?.wall);
  const left=e.r+10,right=game.state.W-left,top=topMargin(),bottom=game.state.H-35;
  if(e.x<left){release(e,s);e.x=left;reflect(s,1,0)}if(e.x>right){release(e,s);e.x=right;reflect(s,-1,0)}if(e.y<top){release(e,s);e.y=top;reflect(s,0,1)}if(e.y>bottom){release(e,s);e.y=bottom;reflect(s,0,-1)}
  const refuge=game.api.refugePoint(e.x,e.y),dx=e.x-refuge.x,dy=e.y-refuge.y,d=Math.hypot(dx,dy),pad=e.r+8;
  if(d<pad){release(e,s);let ux=dx/(d||1),uy=dy/(d||1);if(!d){const length=Math.hypot(s.rollVX,s.rollVY)||1;ux=-s.rollVX/length;uy=-s.rollVY/length}e.x=refuge.x+ux*pad;e.y=refuge.y+uy*pad;reflect(s,ux,uy)}
  s.rollDistance+=Math.hypot(e.x-old.x,e.y-old.y);s.model.ballAngle+=Math.hypot(e.x-old.x,e.y-old.y)/24*(s.rollVX<0?-1:1);s.trail.push({x:e.x,y:e.y,life:.45});s.trail=s.trail.filter(p=>(p.life-=dt)>0).slice(-24);
  const part=s.debris.find(d=>!d.used&&Math.hypot(e.x-d.x,e.y-d.y)<e.r+30);
  if(part&&s.hitCooldown<=0){
   const guided=s.armedFor>0;release(e,s);const x=e.x-part.x,y=e.y-part.y,length=Math.hypot(x,y)||1;let ux=x/length,uy=y/length;if(!x&&!y){ux=-s.rollVX/speed();uy=-s.rollVY/speed()}
   e.x=part.x+ux*(e.r+34);e.y=part.y+uy*(e.r+34);s.rollVX=ux*speed();s.rollVY=uy*speed();s.hitCooldown=1;
   if(guided){part.used=true;part.impact=1;s.phaseHits++;s.armedFor=0;s.hitPause=.45;e.hp=Math.max(0,s.phaseHp*(1-s.phaseHits/requiredHits));game.api.damageNumber(e,s.phaseHp/requiredHits,'physical',true);game.api.burst(part.x,part.y,'#dfbd29',18);game.api.playSound('wobblePunch');game.api.floatText(e.x,e.y-40,({arm:'BONK!',leg:'SPIKE SPLAT!',stalk:'EYE POP!'}[part.part])+' '+s.phaseHits+'/'+requiredHits,'#28796d');
    if(e.hp<=0){game.api.beginWobbleRepair(e);game.api.killEnemy(e)}
   }else game.api.floatText(e.x,e.y-36,'GUIDE ME WITH A LINE!','#966425');
  }
  for(const d of s.debris)d.impact=Math.max(0,(d.impact||0)-dt);
 }
 function preview(e,s,wall){
  if(!wall?.pts||wall.pts.length<2||!Number.isFinite(s.rollVX))return null;
  const hit=game.api.bossShotWallHit({x:e.x,y:e.y,r:Math.max(e.r,32)},e.x+s.rollVX*4,e.y+s.rollVY*4,null,[wall]),contact=hit?{x:e.x+s.rollVX*4*hit.t,y:e.y+s.rollVY*4*hit.t}:game.api.nearestPointOnWall(e,wall),plan=planRail(e,s,wall,contact);return plan?.points??null;
 }
 function draw(e,s,hintY){const ctx=game.dom.ctx;
  ctx.save();ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#385c4a';ctx.fillText('PHASE 2 · DOODLE PINBALL',game.state.W/2,hintY);ctx.font='bold 11px sans-serif';ctx.fillText('Parts bonked '+s.phaseHits+'/'+requiredHits+' · INFINITE INK',game.state.W/2,hintY+16);ctx.fillStyle='#966425';ctx.fillText(s.transition>0?'INK SIPHON · GET YOUR RAILS READY!':s.hitPause>0?'BONK! TWO BITS OF REVENGE.':s.windup>0?'READY… DRAW HIS NEXT TURN!':'LONG END TOWARD A GLOWING PART',game.state.W/2,hintY+32);
  for(const part of s.debris){ctx.strokeStyle=part.used?'#a5a083':'#28796d';ctx.lineWidth=part.used?1:3;ctx.setLineDash(part.used?[]:[5,4]);ctx.beginPath();ctx.arc(part.x,part.y,34+(part.impact||0)*14,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.font='bold 11px sans-serif';ctx.fillStyle=ctx.strokeStyle;ctx.fillText(part.used?'✓ BONKED':'HIT ME!',part.x,part.y+47)}
  const draft=game.state.currentWall?.length>1?{pts:game.state.currentWall,thick:game.state.stats.lineWidth}:null;
  const proposed=draft?preview(e,s,draft):s.rail?s.rail.points.slice(s.rail.index):null;
  if(proposed?.length){ctx.strokeStyle='#278c83';ctx.lineWidth=3;ctx.globalAlpha=.65;ctx.setLineDash([6,5]);ctx.beginPath();proposed.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));const end=proposed.at(-1),prev=proposed.at(-2)||e,angle=Math.atan2(end.y-prev.y,end.x-prev.x);ctx.lineTo(end.x+Math.cos(angle)*65,end.y+Math.sin(angle)*65);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(end.x+Math.cos(angle)*65-Math.cos(angle-.5)*12,end.y+Math.sin(angle)*65-Math.sin(angle-.5)*12);ctx.lineTo(end.x+Math.cos(angle)*65,end.y+Math.sin(angle)*65);ctx.lineTo(end.x+Math.cos(angle)*65-Math.cos(angle+.5)*12,end.y+Math.sin(angle)*65-Math.sin(angle+.5)*12);ctx.stroke();ctx.globalAlpha=1;}
  if(s.transition<=0&&s.rollVX!==undefined){ctx.strokeStyle=s.armedFor>0?'#28796d':'#966425';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+s.rollVX*.6,e.y+s.rollVY*.6);ctx.stroke();ctx.setLineDash([])}
  if(!game.api.enemyMotionReduced())for(const p of s.trail){ctx.save();ctx.globalAlpha=p.life*.8;ctx.translate(p.x,p.y);ctx.rotate((p.x+p.y)*.07);ctx.fillStyle='#efe5c7';ctx.strokeStyle='#a39577';ctx.lineWidth=1;ctx.fillRect(-3,-5,6,10);ctx.strokeRect(-3,-5,6,10);ctx.restore()}ctx.restore();
 }
 function drawWell(s){if(!s.inkPot)return;const ctx=game.dom.ctx,p=well(),leg=s.debris.find(d=>d.part==='leg'),fill=s.inkPot.fill;
  ctx.save();if(leg&&fill<1){ctx.strokeStyle='#203b4d';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(leg.x,leg.y);ctx.quadraticCurveTo((leg.x+p.x)/2,p.y-50,p.x,p.y-12);ctx.stroke();ctx.setLineDash([]);if(!game.api.enemyMotionReduced())for(let i=0;i<4;i++){const t=(s.inkPot.age*1.4+i/4)%1,x=(1-t)*(1-t)*leg.x+2*(1-t)*t*(leg.x+p.x)/2+t*t*p.x,y=(1-t)*(1-t)*leg.y+2*(1-t)*t*(p.y-50)+t*t*(p.y-12);ctx.fillStyle='#203b4d';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill()}}
  ctx.translate(p.x,p.y);ctx.fillStyle='#fff7df';ctx.strokeStyle='#26343a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-15,-12);ctx.lineTo(-18,13);ctx.quadraticCurveTo(0,21,18,13);ctx.lineTo(15,-12);ctx.closePath();ctx.fill();ctx.stroke();ctx.save();ctx.beginPath();ctx.rect(-15,-9,30,25);ctx.clip();ctx.fillStyle='#203b4d';ctx.fillRect(-15,14-fill*23,30,25);ctx.restore();ctx.fillStyle='#203b4d';ctx.beginPath();ctx.ellipse(0,-12,15,4,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=s.phase===2?'#fff7df':'#26343a';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText(s.phase===2?'∞':'',0,10);ctx.font='bold 10px sans-serif';ctx.fillStyle='#28796d';ctx.fillText(s.phase===2?'INFINITE INK':'INK FOR PHASE 2',0,35);ctx.restore();
 }
 return {preview,begin,constrain,update,draw,drawWell,siphon,updateSiphon};
};
