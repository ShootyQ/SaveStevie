/* Ricochet showdown: real angled wall rebounds, three stolen weapons and four spike hits. */
DoodleDefender.WobblePhaseTwo=function(game,{state,rig,topMargin}){
 const requiredHits=4,chargeSpeed=()=>game.state.W<500?245:310;
 function limits(e){return {left:e.r+12,right:Math.max(e.r+12,game.state.W-e.r-12),top:topMargin(),bottom:Math.max(topMargin(),game.state.H-e.r-18)}}
 function targetPoint(e,x,y){const b=limits(e),q={x:game.api.clamp(x,b.left+10,b.right-10),y:game.api.clamp(y,b.top+15,b.bottom-15)},p=game.state.player;
  const edge=game.api.refugePoint(q.x,q.y);if(Math.hypot(q.x-edge.x,q.y-edge.y)<75)q.y=game.api.clamp(p.y+(q.y<p.y?-1:1)*145,b.top+15,b.bottom-15);return q;
 }
 function placeTargets(e,s){const {W,H}=game.state,phone=W<500&&H>W;
  s.targets={well:{...targetPoint(e,W*.23,phone?H*.34:H*.3),r:28,active:true},spikes:{...targetPoint(e,W*.76,phone?H*.69:H*.72),r:30,active:true},laser:{...targetPoint(e,W*.77,phone?H*.32:H*.27),r:28,active:true}};
  for(const d of s.debris){const q=s.targets[{arm:'well',leg:'spikes',stalk:'laser'}[d.part]];if(!q)continue;d.startX=d.x;d.startY=d.y;d.landX=q.x;d.floor=q.y;d.flightAge=0;d.duration=1;d.height=90;d.spin=Math.PI*3;d.settled=false;d.used=false;}
 }
 function chargeSite(e,s,flip=false){const {W,H,player:p}=game.state,b=limits(e),phone=W<500&&H>W;
  if(phone){const bottom=flip?e.y<p.y:(s.chargeCount||0)%2===1;return {x:game.api.clamp(p.x+(s.chargeCount%3-1)*Math.min(35,W*.08),b.left,b.right),y:bottom?b.bottom-12:b.top+15};}
  const a=(s.chargeCount||0)*2.399+(flip?Math.PI:0),rx=Math.max(80,W/2-65),ry=Math.max(35,H/2-75);return {x:game.api.clamp(p.x+Math.cos(a)*rx,b.left,b.right),y:game.api.clamp(p.y+Math.sin(a)*ry,b.top,b.bottom)};
 }
 function ready(e,s,relocate=false){if(relocate){const q=chargeSite(e,s);e.x=q.x;e.y=q.y;}s.rollState='windup';s.windup=2.7;s.chargeLeft=0;s.rollVX=s.rollVY=0;s.chargeAim={x:game.state.player.x,y:game.state.player.y};s.model.rollAge=.75;s.model.phaseTwoRoll=true;s.model.ballAngle=0;s.splatAge=0;}
 function begin(e){const s=state(e);if(s.phase===2)return;game.api.stopSoundEffects('wobbleLaser');game.api.stopSoundEffects('wobbleWindup');game.api.detachWobbleParts(e);
  Object.assign(s,{phase:2,phaseHits:0,phaseHp:e.maxHp,transition:1.7,inkUnlocked:false,laserDisabled:false,laserClock:2.4,groundBeam:null,chargeCount:0,bounces:0,rollDistance:0,hitCooldown:0,trail:[],rollState:'transition',attack:'roll',cutWindow:null,blockStun:0,detour:null,rail:null,fly:null,pendingWin:false});
  s.model.walkBlend=0;s.model.cutFocus=null;s.model.punchAge=s.model.spikeAge=s.model.beamAge=s.model.teethAge=null;s.model.rollAge=0;s.model.phaseTwoRoll=false;s.model.teethPlan=[];s.model.teeth=[];s.model.spikes=[];
  game.state.enemyShots=game.state.enemyShots.filter(q=>q.wobbleOwner!==e);game.state.enemies=game.state.enemies.filter(n=>n.bossOwner!==e);game.api.cancelDrawingInput?.();const refund=game.state.walls.reduce((sum,w)=>sum+(w.eraseInk||0)*game.api.clamp(w.hp/Math.max(1,w.maxHp),0,1)*.25,0);for(const w of game.state.walls.slice(0,8)){const q=w.pts[Math.floor(w.pts.length/2)];if(q)game.api.burst(q.x,q.y,'#c8b99a',5);}game.state.walls=[];game.state.stats.ink=Math.min(game.state.stats.maxInk,game.state.stats.ink+refund);e.hp=e.maxHp;placeTargets(e,s);s.inkPot={age:0,fill:1};
  game.api.floatText(e.x,e.y-45,'MY BITS!!','#28796d');game.api.setMsg('Bounce him with angled walls. Spikes: four hits to win. Ink well: unlimited ink. Eye: stop the wall-erasing laser.');game.api.updateUI();
 }
 function siphon(e){state(e).inkPot??={age:0,fill:1};}
 function updateSiphon(s,dt){if(s.inkPot)s.inkPot.age+=dt;}
 function constrain(e,s){const b=limits(e);if(!s.fly){e.x=game.api.clamp(e.x,b.left,b.right);e.y=game.api.clamp(e.y,b.top,b.bottom)}
  if(!s.targets)return;for(const q of Object.values(s.targets)){const safe=targetPoint(e,q.x,q.y);q.x=safe.x;q.y=safe.y;}
  for(const d of s.debris){const q=s.targets[{arm:'well',leg:'spikes',stalk:'laser'}[d.part]];if(q){d.landX=q.x;d.floor=q.y;if(d.settled){d.x=q.x;d.y=q.y}}}
  if(s.chargeAim){s.chargeAim.x=game.state.player.x;s.chargeAim.y=game.state.player.y;}
 }
 function normal(e,hit,x,y){const segments=game.api.wallGeometry(hit.wall.pts).segments;let best=null;
  for(const seg of segments){const dx=seg.b.x-seg.a.x,dy=seg.b.y-seg.a.y,len=dx*dx+dy*dy;if(!len)continue;const t=game.api.clamp(((x-seg.a.x)*dx+(y-seg.a.y)*dy)/len,0,1),qx=seg.a.x+dx*t,qy=seg.a.y+dy*t,d=Math.hypot(x-qx,y-qy);if(!best||d<best.d)best={d,dx,dy,qx,qy};}
  if(!best)return {x:0,y:-1};const len=Math.hypot(best.dx,best.dy);return {x:-best.dy/len,y:best.dx/len};
 }
 function bounce(s,n){const dot=s.rollVX*n.x+s.rollVY*n.y;s.rollVX-=2*dot*n.x;s.rollVY-=2*dot*n.y;s.bounces++;}
 function circleTime(a,b,q,r){const dx=b.x-a.x,dy=b.y-a.y,ox=a.x-q.x,oy=a.y-q.y,A=dx*dx+dy*dy,C=ox*ox+oy*oy-r*r;if(C<=0)return 0;if(!A)return null;const B=2*(ox*dx+oy*dy),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
 function flyAway(e,s,win=false){const q=chargeSite(e,s,true);s.fly={startX:e.x,startY:e.y,x:q.x,y:q.y,age:0,duration:.85,spin:0};s.rollState='fly';s.pendingWin=win;if(win){s.groundBeam=null;game.api.stopSoundEffects('wobbleLaser');}game.api.playSound('wobblePunch');}
 function hitTarget(e,s,name){const q=s.targets[name];
  if(name==='well'){q.active=false;s.inkUnlocked=true;game.state.stats.ink=game.state.stats.maxInk;game.api.floatText(q.x,q.y-42,'BOTTOMLESS INK!','#28796d');game.api.burst(q.x,q.y,'#26384a',18);game.api.playSound('rock');return;}
  if(name==='laser'){q.active=false;s.laserDisabled=true;s.groundBeam=null;game.api.stopSoundEffects('wobbleLaser');game.api.floatText(q.x,q.y-42,'LIGHTS OUT!','#28796d');game.api.burst(q.x,q.y,'#61aca0',12);game.api.playSound('rock');return;}
  s.phaseHits++;s.hitCooldown=1.5;game.api.damageNumber(e,s.phaseHp/requiredHits,'physical',s.phaseHits===requiredHits);e.hp=s.phaseHits===requiredHits?1:s.phaseHp*(1-s.phaseHits/requiredHits);game.api.burst(q.x,q.y,'#dfbd29',24);game.api.floatText(q.x,q.y-44,'SPIKE SPLAT! '+s.phaseHits+'/'+requiredHits,'#b14c32');s.chargeCount++;flyAway(e,s,s.phaseHits===requiredHits);
 }
 function launch(e,s){const p=s.chargeAim,dx=p.x-e.x,dy=p.y-e.y,len=Math.hypot(dx,dy)||1;s.rollVX=dx/len*chargeSpeed();s.rollVY=dy/len*chargeSpeed();s.chargeLeft=3.1;s.rollState='charge';s.model.phaseTwoRoll=true;s.model.rollAge=1.2;game.api.playSound('wobbleRoll');}
 function groundLaser(e,s,dt){if(s.laserDisabled||s.transition>0||s.pendingWin)return;s.laserClock-=dt;
  if(!s.groundBeam&&s.laserClock<=0){const q=s.targets.laser,p=game.state.player,wall=game.state.walls.filter(w=>!w.wobbleDraft&&!w.shapeTurret&&w.hp>0).sort((a,b)=>game.api.dist(q.x,q.y,game.api.wallGeometry(a.pts).cx,game.api.wallGeometry(a.pts).cy)-game.api.dist(q.x,q.y,game.api.wallGeometry(b.pts).cx,game.api.wallGeometry(b.pts).cy))[0],to=wall?game.api.wallGeometry(wall.pts):{cx:p.x,cy:p.y};s.groundBeam={age:0,angle:Math.atan2(to.cy-q.y,to.cx-q.x),tip:{x:to.cx,y:to.cy}};}
  if(!s.groundBeam)return;const b=s.groundBeam,q=s.targets.laser;b.age+=dt;const a=b.angle+Math.sin(Math.max(0,b.age-.65)*3)*.48,length=Math.min(450,Math.max(game.state.W,game.state.H));b.tip={x:q.x+Math.cos(a)*length,y:q.y+Math.sin(a)*length};
  if(b.age>=.65){game.api.sustainSound('wobbleLaser');const ignored=new Set([...game.api.shapeBarrierWalls(),...game.state.walls.filter(w=>w.wobbleDraft)]);for(let i=0;i<6;i++){const hit=game.api.bossShotWallHit({x:q.x,y:q.y,r:3},b.tip.x,b.tip.y,ignored);if(!hit)break;ignored.add(hit.wall);hit.wall.hp=0;game.state.walls=game.state.walls.filter(w=>w!==hit.wall);const p=game.api.nearestPointOnWall(q,hit.wall);game.api.burst(p.x,p.y,'#75a999',5);}}
  if(b.age>=1.4){s.groundBeam=null;s.laserClock=3.2;game.api.stopSoundEffects('wobbleLaser');}
 }
 function advance(e,s,dt){let left=dt;
  for(let i=0;i<8&&left>1e-7&&s.rollState==='charge';i++){
   const a={x:e.x,y:e.y},to={x:e.x+s.rollVX*left,y:e.y+s.rollVY*left},ignored=new Set([...game.api.shapeBarrierWalls(),...game.state.walls.filter(w=>w.wobbleDraft||w.shapeTurret)]),wall=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},to.x,to.y,ignored);let first=wall?{t:wall.t,wall}:null;
   for(const [name,q] of Object.entries(s.targets)){if(!q.active||name==='spikes'&&s.hitCooldown>0)continue;const t=circleTime(a,to,q,e.r+q.r);if(t!==null&&(!first||t<first.t))first={t,name};}
   const p=game.state.player,t=circleTime(a,to,p,e.r+p.r+10);if(t!==null&&(!first||t<first.t))first={t,player:true};
   const used=left*(first?.t??1);e.x+=s.rollVX*used;e.y+=s.rollVY*used;s.rollDistance+=chargeSpeed()*used;left-=used;
   if(!first)break;
   if(first.wall){const w=first.wall.wall,n=normal(e,first.wall,e.x,e.y);w.hp=0;game.state.walls=game.state.walls.filter(q=>q!==w);bounce(s,n);game.api.burst(e.x,e.y,'#b2a17d',8);game.api.playSound('rock');game.api.floatText(e.x,e.y-38,'BOING!','#28796d');e.x+=s.rollVX/chargeSpeed()*2;e.y+=s.rollVY/chargeSpeed()*2;left=Math.max(0,left-.002);}
   else if(first.player){game.api.damageStevie(16*(1-game.state.stats.playerArmor),'Wobblechomp warned charge',e);s.chargeCount++;flyAway(e,s);}
   else{hitTarget(e,s,first.name);if(s.rollState==='charge'){e.x+=s.rollVX/chargeSpeed()*2;e.y+=s.rollVY/chargeSpeed()*2;}}
  }
  const b=limits(e);if(s.rollState==='charge'&&(e.x<b.left||e.x>b.right||e.y<b.top||e.y>b.bottom)){e.x=game.api.clamp(e.x,b.left,b.right);e.y=game.api.clamp(e.y,b.top,b.bottom);s.splatAge=.8;s.rollState='recover';s.recovery=.9;game.api.playSound('wobblePunch');game.api.burst(e.x,e.y,'#dfbd29',10);}
 }
 function update(e,s,dt){s.model.time+=dt;s.hitCooldown=Math.max(0,s.hitCooldown-dt);groundLaser(e,s,dt);
  if(s.transition>0){rig.update(s.model,dt);s.transition=Math.max(0,s.transition-dt);if(!s.transition)ready(e,s,true);return;}
  if(s.fly){const f=s.fly;f.age=Math.min(f.duration,f.age+dt);const t=f.age/f.duration;f.spin=game.api.enemyMotionReduced()?0:t*Math.PI*3;e.x=f.startX+(f.x-f.startX)*t;e.y=f.startY+(f.y-f.startY)*t-(game.api.enemyMotionReduced()?0:Math.sin(t*Math.PI)*65);
   if(t>=1){s.fly=null;s.splatAge=.8;s.rollState='recover';s.recovery=1.1;game.api.burst(e.x,e.y,'#dfbd29',18);game.api.playSound('wobblePunch');game.api.floatText(e.x,e.y-40,'SPLAT!','#b14c32');}return;}
  if(s.rollState==='recover'){s.splatAge=Math.max(0,s.splatAge-dt);s.recovery-=dt;if(s.recovery<=0){if(s.pendingWin){e.hp=0;game.api.beginWobbleRepair(e);game.api.killEnemy(e);return;}s.chargeCount++;ready(e,s);}return;}
  if(s.rollState==='windup'){s.windup=Math.max(0,s.windup-dt);s.model.ballAngle=game.api.enemyMotionReduced()?0:Math.sin(s.model.time*13)*.12;if(!s.windup)launch(e,s);return;}
  if(s.rollState==='charge'){s.chargeLeft-=dt;advance(e,s,dt);s.model.ballAngle+=chargeSpeed()*dt/24*(s.rollVX<0?-1:1);s.trail.push({x:e.x,y:e.y,life:.45});s.trail=s.trail.filter(q=>(q.life-=dt)>0).slice(-20);if(s.chargeLeft<=0&&s.rollState==='charge'){s.chargeCount++;flyAway(e,s);}}
 }
 function preview(e,s,wall){if(!wall?.pts||wall.pts.length<2||s.rollState==='fly')return null;const a=s.rollState==='windup'?{x:(s.chargeAim.x-e.x),y:(s.chargeAim.y-e.y)}:{x:s.rollVX,y:s.rollVY},len=Math.hypot(a.x,a.y)||1,v={x:a.x/len,y:a.y/len},end={x:e.x+v.x*900,y:e.y+v.y*900},hit=game.api.bossShotWallHit({x:e.x,y:e.y,r:e.r},end.x,end.y,null,[wall]);if(!hit)return null;const contact={x:e.x+(end.x-e.x)*hit.t,y:e.y+(end.y-e.y)*hit.t},n=normal(e,hit,contact.x,contact.y),dot=v.x*n.x+v.y*n.y;return [{x:e.x,y:e.y},contact,{x:contact.x+(v.x-2*dot*n.x)*170,y:contact.y+(v.y-2*dot*n.y)*170}];}
 function line(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();const a=points.at(-2),b=points.at(-1),angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.beginPath();ctx.moveTo(b.x-Math.cos(angle-.5)*12,b.y-Math.sin(angle-.5)*12);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-Math.cos(angle+.5)*12,b.y-Math.sin(angle+.5)*12);ctx.stroke();}
 function draw(e,s,hintY){const ctx=game.dom.ctx;ctx.save();ctx.textAlign='center';ctx.font='bold 13px "Stevie Pencil",sans-serif';ctx.fillStyle='#385c4a';ctx.fillText('RICOCHET · SPIKE HITS '+s.phaseHits+' / '+requiredHits,game.state.W/2,Math.min(hintY,40));
  const meterW=Math.min(180,game.state.W*.45),mx=(game.state.W-meterW)/2,my=Math.min(hintY,40)+7;ctx.fillStyle='#fff7df';ctx.fillRect(mx-5,my-3,meterW+10,18);for(let i=0;i<requiredHits;i++){ctx.fillStyle=i<s.phaseHits?'#c26937':'#d6cbb2';ctx.fillRect(mx+i*meterW/requiredHits,my,meterW/requiredHits-3,12)}
  ctx.font='bold 11px sans-serif';ctx.fillStyle='#385c4a';ctx.fillText(s.inkUnlocked?'INK ∞ · ANGLED WALLS BOUNCE HIM':'HIT THE WELL FOR ∞ INK',game.state.W/2,my+31);
  for(const [name,q] of Object.entries(s.targets)){ctx.lineWidth=3;ctx.strokeStyle=name==='spikes'?'#bb6639':name==='well'?'#345a74':'#448a71';ctx.globalAlpha=q.active?1:.35;ctx.beginPath();ctx.arc(q.x,q.y,q.r+(game.api.enemyMotionReduced()?0:Math.sin(s.model.time*3)*2),0,Math.PI*2);ctx.stroke();ctx.font='bold 13px "Stevie Pencil",sans-serif';ctx.fillStyle=ctx.strokeStyle;const text=name==='spikes'?'SPIKES · HURT HIM':name==='well'?(q.active?'INK WELL · HIT ME':'INK ∞'):(q.active?'EYE · SWITCH OFF':'EYE OFF');const labelX=game.api.clamp(q.x,65,game.state.W-65);ctx.fillStyle='#fff7df';ctx.fillRect(labelX-65,q.y+q.r+4,130,17);ctx.fillStyle=ctx.strokeStyle;ctx.fillText(text,labelX,q.y+q.r+17);ctx.globalAlpha=1;}
  if(s.groundBeam){const b=s.groundBeam,q=s.targets.laser;ctx.strokeStyle='#448a71';ctx.lineWidth=b.age<.65?2:5;ctx.setLineDash(b.age<.65?[5,4]:[]);line(ctx,[q,b.tip]);ctx.setLineDash([]);}
  if(s.rollState==='windup'){ctx.strokeStyle='#b14c32';ctx.lineWidth=3;ctx.setLineDash([7,5]);line(ctx,[e,s.chargeAim]);ctx.setLineDash([]);ctx.font='bold 13px "Stevie Pencil",sans-serif';ctx.fillStyle='#b14c32';ctx.fillText('CHARGE IN '+s.windup.toFixed(1)+'s',game.api.clamp(e.x,65,game.state.W-65),e.y+45);}
  const draft=game.state.currentWall?.length>1?{pts:game.state.currentWall,thick:game.state.stats.lineWidth}:null,candidate=draft||(s.rollState==='windup'?game.state.walls.filter(w=>w.hp>0&&!w.wobbleDraft&&!w.shapeTurret).at(-1):null),proposed=candidate?preview(e,s,candidate):null;if(proposed){ctx.strokeStyle='#28796d';ctx.lineWidth=3;ctx.setLineDash([4,4]);line(ctx,proposed);ctx.setLineDash([]);}
  if(!game.api.enemyMotionReduced())for(const p of s.trail){ctx.globalAlpha=p.life;ctx.fillStyle='#efe5c7';ctx.fillRect(p.x-3,p.y-3,6,6)}ctx.restore();
 }
 function drawWell(s){if(s.phase!==2||!s.targets)return;const ctx=game.dom.ctx,p=s.targets.well;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#fff7df';ctx.strokeStyle='#26343a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-19,-16);ctx.lineTo(-22,17);ctx.quadraticCurveTo(0,26,22,17);ctx.lineTo(19,-16);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#203b4d';ctx.fillRect(-17,-9,34,25);ctx.beginPath();ctx.ellipse(0,-16,19,5,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='bold 22px "Stevie Pencil",sans-serif';ctx.fillStyle='#fff7df';ctx.textAlign='center';ctx.fillText(s.inkUnlocked?'∞':'?',0,11);ctx.restore();}
 return {preview,begin,constrain,update,draw,drawWell,siphon,updateSiphon};
};
