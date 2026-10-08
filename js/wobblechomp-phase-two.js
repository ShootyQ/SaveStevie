/* Phase two: finite ink stats, an unlimited well, and player-drawn rolling rails. */
DoodleDefender.WobblePhaseTwo=function(game,{state,rig,spawnTooth,topMargin}){
 const speed=()=>game.state.W<500?145:175,requiredHits=4;
 function well(){const {W,H,player:p}=game.state;return {x:game.api.clamp(p.x-85,26,W-26),y:game.api.clamp(p.y+90,180,H-45)}}
 function siphon(e){const s=state(e);s.inkPot??={age:0,fill:0};}
 function updateSiphon(s,dt){if(!s.inkPot)return;s.inkPot.age+=dt;s.inkPot.fill=Math.min(1,s.inkPot.age/1.6);const leg=s.debris.find(d=>d.part==='leg');if(leg)leg.inkLevel=1-s.inkPot.fill;}
 function begin(e){const s=state(e);if(s.phase===2)return;s.phase=2;s.phaseHits=0;s.phaseHp=e.maxHp;s.transition=2.2;s.rollDistance=0;s.armedFor=0;s.hitCooldown=0;s.toothClock=4.5;s.bounces=0;s.trail=[];s.attack='roll';s.cutWindow=null;s.blockStun=0;s.detour=null;s.trapped=0;s.trapWarning=false;s.model.walkBlend=0;s.model.punchAge=s.model.spikeAge=s.model.beamAge=s.model.teethAge=null;s.model.rollAge=0;s.model.phaseTwoRoll=false;s.model.teethPlan=[];s.model.teeth=[];s.model.spikes=[];
  game.state.enemyShots=game.state.enemyShots.filter(q=>q.wobbleOwner!==e);game.state.enemies=game.state.enemies.filter(n=>n.bossOwner!==e);e.hp=e.maxHp;siphon(e);game.state.stats.ink=game.state.stats.maxInk;
  game.api.floatText(e.x,e.y-45,'PHASE 2 · DOODLE RAILS!','#28796d');game.api.setMsg('Infinite ink! Draw lines toward the fallen spikes. He rides along each line and rolls off its end.');game.api.updateUI();
 }
 // Resize can move a fallen target off the page. Keep the foot reachable without
 // restarting the roll or cancelling its animation.
 function constrain(e,s){
  const bounds={left:e.r+10,right:game.state.W-e.r-10,top:topMargin(),bottom:Math.max(topMargin(),game.state.H-35)};
  e.x=game.api.clamp(e.x,bounds.left,bounds.right);e.y=game.api.clamp(e.y,bounds.top,bounds.bottom);
  if(s.rail){const next=s.rail.points[s.rail.index];if(!next||next.x<bounds.left||next.x>bounds.right||next.y<bounds.top||next.y>bounds.bottom)release(e,s)}
  const leg=s.debris.find(d=>d.part==='leg');if(!leg)return;
  leg.x=game.api.clamp(leg.x,bounds.left,bounds.right);leg.y=game.api.clamp(leg.y,bounds.top+20,Math.max(bounds.top+20,bounds.bottom-20));leg.floor=game.api.clamp(leg.floor,bounds.top+20,Math.max(bounds.top+20,bounds.bottom-20));
  const q=game.api.refugePoint(leg.x,leg.y);if(Math.hypot(leg.x-q.x,leg.y-q.y)<60){const p=game.state.player;let best=null;for(const y of [p.y-145,p.y+145])if(y>=bounds.top+20&&y<=bounds.bottom-20){const d=Math.abs(y-leg.y);if(!best||d<best.d)best={y,d}}if(best){leg.y=leg.floor=best.y}else{leg.x=bounds.left;leg.y=leg.floor=game.api.clamp(p.y,bounds.top+20,bounds.bottom-20)}}
 }
 function launch(e,s){const leg=s.debris.find(d=>d.part==='leg');
  if(leg&&Math.hypot(e.x-leg.x,e.y-leg.y)<70){let q=null;for(let i=0;i<32;i++){const a=i*Math.PI/16,x=leg.x+Math.cos(a)*90,y=leg.y+Math.sin(a)*90;if(x<e.r+10||x>game.state.W-e.r-10||y<topMargin()||y>game.state.H-35)continue;const p=game.api.refugePoint(x,y);if(Math.hypot(x-p.x,y-p.y)<e.r+8)continue;q={x,y};break}if(q){e.x=q.x;e.y=q.y}}
  const a=leg?Math.atan2(e.y-leg.y,e.x-leg.x)+.6:Math.PI/4;s.rollVX=Math.cos(a)*speed();s.rollVY=Math.sin(a)*speed();s.model.phaseTwoRoll=true;s.model.rollAge=1.2;
 }
 function reflect(s,nx,ny){const d=s.rollVX*nx+s.rollVY*ny;if(d<0){s.rollVX-=2*d*nx;s.rollVY-=2*d*ny}s.bounces++;}
 // Follow the struck stroke on the side he approached it from. Offset corners
 // by a bounded miter so curved doodles guide the body without snapping through ink.
 function ride(e,s,wall,contact){
  const pts=wall.pts.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y)>.01);
  if(pts.length<2)return false;
  let best=null;
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),t=game.api.clamp(((contact.x-a.x)*dx+(contact.y-a.y)*dy)/(len*len),0,1),x=a.x+dx*t,y=a.y+dy*t,d=Math.hypot(contact.x-x,contact.y-y);if(!best||d<best.d)best={i,x,y,d,tx:dx/len,ty:dy/len}}
  const dir=s.rollVX*best.tx+s.rollVY*best.ty<-.001?-1:1,pad=e.r+wall.thick/2+1,side=(contact.x-best.x)*(-best.ty)+(contact.y-best.y)*best.tx<0?-1:1;
  const normal=i=>{const a=pts[i],b=pts[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);return {x:-(b.y-a.y)/len*side,y:(b.x-a.x)/len*side}};
  const offset=i=>{const p=pts[i],a=normal(Math.max(0,i-1)),b=normal(Math.min(pts.length-2,i)),x=a.x+b.x,y=a.y+b.y,len=Math.hypot(x,y);if(len<.01)return {x:p.x+b.x*pad,y:p.y+b.y*pad};const ux=x/len,uy=y/len,reach=Math.min(pad*2,pad/Math.max(.5,ux*b.x+uy*b.y));return {x:p.x+ux*reach,y:p.y+uy*reach}};
  const n=normal(best.i),points=[{x:best.x+n.x*pad,y:best.y+n.y*pad}];for(let i=dir>0?best.i+1:best.i;i>=0&&i<pts.length;i+=dir)points.push(offset(i));
  e.x=points[0].x;e.y=points[0].y;s.rollVX=best.tx*dir*speed();s.rollVY=best.ty*dir*speed();s.rail={wall,points,index:1};s.armedFor=6;s.bounces++;game.api.playSound('rock');game.api.floatText(e.x,e.y-30,'RIDING THE LINE!','#28796d');return true;
 }
 function release(e,s,consume=true){const rail=s.rail;if(!rail)return;s.rail=null;if(consume&&game.state.walls.includes(rail.wall))game.api.damageWall(rail.wall,Math.max(rail.wall.hp,rail.wall.maxHp),e.x,e.y)}
 function advanceRail(e,s,dt){const rail=s.rail;if(!game.state.walls.includes(rail.wall)||rail.wall.hp<=0||rail.wall.life<=0){release(e,s,false);return false}
  let travel=speed()*dt;
  while(travel>1e-8&&s.rail){const target=rail.points[rail.index],dx=target.x-e.x,dy=target.y-e.y,len=Math.hypot(dx,dy);if(len<1e-6){rail.index++;if(rail.index>=rail.points.length)release(e,s);continue}
   s.rollVX=dx/len*speed();s.rollVY=dy/len*speed();const step=Math.min(travel,len);e.x+=dx/len*step;e.y+=dy/len*step;travel-=step;s.armedFor=6;if(step>=len-1e-8){rail.index++;if(rail.index>=rail.points.length)release(e,s)}
  }
  if(travel>0){e.x+=s.rollVX/speed()*travel;e.y+=s.rollVY/speed()*travel}return true;
 }
 function update(e,s,dt){
  if(s.transition>0){rig.update(s.model,dt*1.45);s.transition=Math.max(0,s.transition-dt);if(!s.transition)launch(e,s);return}
  if(e.freeze>0||e.stun>0)return;s.model.time+=dt;s.hitCooldown=Math.max(0,s.hitCooldown-dt);s.armedFor=Math.max(0,s.armedFor-dt);s.toothClock-=dt;
  if(s.toothClock<=0){s.toothClock=4.5;for(let i=0;i<2;i++)spawnTooth(e,{})}
  const old={x:e.x,y:e.y};
  if(!s.rail||!advanceRail(e,s,dt)){
   const nx=e.x+s.rollVX*dt,ny=e.y+s.rollVY*dt,hit=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},nx,ny);
   if(hit){const contact={x:e.x+(nx-e.x)*hit.t,y:e.y+(ny-e.y)*hit.t};if(ride(e,s,hit.wall,contact))advanceRail(e,s,dt*(1-hit.t));else{e.x=nx;e.y=ny}}
   else{e.x=nx;e.y=ny}
  }
  const left=e.r+10,right=game.state.W-left,top=topMargin(),bottom=game.state.H-35;
  if(e.x<left){release(e,s);e.x=left;reflect(s,1,0)}if(e.x>right){release(e,s);e.x=right;reflect(s,-1,0)}if(e.y<top){release(e,s);e.y=top;reflect(s,0,1)}if(e.y>bottom){release(e,s);e.y=bottom;reflect(s,0,-1)}
  const refuge=game.api.refugePoint(e.x,e.y),dx=e.x-refuge.x,dy=e.y-refuge.y,d=Math.hypot(dx,dy),pad=e.r+8;
  if(d<pad){release(e,s);let ux=dx/(d||1),uy=dy/(d||1);if(!d){const length=Math.hypot(s.rollVX,s.rollVY)||1;ux=-s.rollVX/length;uy=-s.rollVY/length}e.x=refuge.x+ux*pad;e.y=refuge.y+uy*pad;reflect(s,ux,uy)}
  s.rollDistance+=Math.hypot(e.x-old.x,e.y-old.y);s.model.ballAngle+=Math.hypot(e.x-old.x,e.y-old.y)/24*(s.rollVX<0?-1:1);s.trail.push({x:e.x,y:e.y,life:.45});s.trail=s.trail.filter(p=>(p.life-=dt)>0).slice(-24);
  const leg=s.debris.find(d=>d.part==='leg');if(leg&&s.hitCooldown<=0&&Math.hypot(e.x-leg.x,e.y-leg.y)<e.r+18){
   release(e,s);const x=e.x-leg.x,y=e.y-leg.y,length=Math.hypot(x,y)||1;let ux=x/length,uy=y/length;if(!x&&!y){ux=-s.rollVX/speed();uy=-s.rollVY/speed()}e.x=leg.x+ux*(e.r+20);e.y=leg.y+uy*(e.r+20);s.rollVX=ux*speed();s.rollVY=uy*speed();s.hitCooldown=1;
   if(s.armedFor>0){s.phaseHits++;s.armedFor=0;e.hp=Math.max(0,s.phaseHp*(1-s.phaseHits/requiredHits));game.api.damageNumber(e,s.phaseHp/requiredHits,'physical',false);game.api.burst(leg.x,leg.y,'#203b4d',12);game.api.playSound('rock');game.api.floatText(e.x,e.y-35,'SPIKE SPLAT! '+s.phaseHits+'/'+requiredHits,'#28796d');if(e.hp<=0)game.api.killEnemy(e)}
   else game.api.floatText(e.x,e.y-30,'DRAW A RAIL FIRST!','#966425');
  }
 }
 function draw(e,s,hintY){const ctx=game.dom.ctx,leg=s.debris.find(d=>d.part==='leg');
  ctx.save();ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#385c4a';ctx.fillText('PHASE 2 · ROLL HIM INTO THE SPIKY FOOT',game.state.W/2,hintY);ctx.font='bold 11px sans-serif';ctx.fillText('Spike splats '+s.phaseHits+'/'+requiredHits+' · INFINITE INK',game.state.W/2,hintY+16);ctx.fillStyle='#966425';ctx.fillText(s.transition>0?'INK SIPHON · GET YOUR RAILS READY!':'DRAW A RAIL TOWARD THE FALLEN SPIKES',game.state.W/2,hintY+32);
  if(leg){ctx.strokeStyle='#28796d';ctx.lineWidth=3;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(leg.x,leg.y,21,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.font='bold 10px sans-serif';ctx.fillStyle='#28796d';ctx.fillText('ROLL HIM HERE',leg.x,leg.y+33)}
  if(s.transition<=0&&s.rollVX!==undefined){ctx.strokeStyle=s.armedFor>0?'#28796d':'#966425';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+s.rollVX*.6,e.y+s.rollVY*.6);ctx.stroke();ctx.setLineDash([])}
  if(!game.api.enemyMotionReduced())for(const p of s.trail){ctx.globalAlpha=p.life*.12;ctx.fillStyle='#966425';ctx.beginPath();ctx.arc(p.x,p.y,16,0,Math.PI*2);ctx.fill()}ctx.restore();
 }
 function drawWell(s){if(!s.inkPot)return;const ctx=game.dom.ctx,p=well(),leg=s.debris.find(d=>d.part==='leg'),fill=s.inkPot.fill;
  ctx.save();if(leg&&fill<1){ctx.strokeStyle='#203b4d';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(leg.x,leg.y);ctx.quadraticCurveTo((leg.x+p.x)/2,p.y-50,p.x,p.y-12);ctx.stroke();ctx.setLineDash([]);if(!game.api.enemyMotionReduced())for(let i=0;i<4;i++){const t=(s.inkPot.age*1.4+i/4)%1,x=(1-t)*(1-t)*leg.x+2*(1-t)*t*(leg.x+p.x)/2+t*t*p.x,y=(1-t)*(1-t)*leg.y+2*(1-t)*t*(p.y-50)+t*t*(p.y-12);ctx.fillStyle='#203b4d';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill()}}
  ctx.translate(p.x,p.y);ctx.fillStyle='#fff7df';ctx.strokeStyle='#26343a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-15,-12);ctx.lineTo(-18,13);ctx.quadraticCurveTo(0,21,18,13);ctx.lineTo(15,-12);ctx.closePath();ctx.fill();ctx.stroke();ctx.save();ctx.beginPath();ctx.rect(-15,-9,30,25);ctx.clip();ctx.fillStyle='#203b4d';ctx.fillRect(-15,14-fill*23,30,25);ctx.restore();ctx.fillStyle='#203b4d';ctx.beginPath();ctx.ellipse(0,-12,15,4,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=s.phase===2?'#fff7df':'#26343a';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText(s.phase===2?'∞':'',0,10);ctx.font='bold 10px sans-serif';ctx.fillStyle='#28796d';ctx.fillText(s.phase===2?'INFINITE INK':'INK FOR PHASE 2',0,35);ctx.restore();
 }
 return {begin,constrain,update,draw,drawWell,siphon,updateSiphon};
};
