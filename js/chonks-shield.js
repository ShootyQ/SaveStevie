/* Sir Chonks leads a visible, erasable shield convoy from wave six onward. */
DoodleDefender.systems.chonksShield=function(game){
 const tuning={rubSeconds:.65,shelterLength:115,recruitRange:170,escortCap:6};
 let cachedArray=null,cachedLength=-1,hosts=[],escorts=new WeakMap(),rubs=new Map();
 const active=()=>game.api.paperActive();
 function hasChonksShield(e){return e?.type==='tank'&&e.chonks?.shield===true&&e.hp>0&&!e.flight&&!game.api.underPaper(e);}
 function shieldHosts(){const list=game.state.enemies;if(list!==cachedArray||list.length!==cachedLength){cachedArray=list;cachedLength=list.length;hosts=list.filter(e=>e.type==='tank');}return hosts.filter(hasChonksShield);}
 function front(e){if(e.chonks?.moveDirection)return e.chonks.moveDirection;const p=game.state.player,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;return {x:dx/d,y:dy/d};}
 // Match the body's planted-foot squash and waddle transform. Both drawing
 // and eraser collision use this same carried-shield attachment point.
 function chonksShieldAnchor(e){
  const f=front(e),p=game.api.enemyAnimationPose(e),image=game.api.doodleArtwork('tank');
  const foot=e.r*2.7*(image?.naturalHeight||140)/(image?.naturalWidth||200)*.46;
  const x=f.x*e.r*.8*p.sx,y=(f.y*e.r*.45+e.r*.6-foot)*p.sy+foot;
  const ca=Math.cos(p.angle),sa=Math.sin(p.angle);
  return {x:e.x+p.x+x*ca-y*sa,y:e.y+p.y+x*sa+y*ca,angle:p.angle+f.x*.12,sx:p.sx,sy:p.sy};
 }
 function eligible(e){return e.hp>0&&!e.flight&&!e.hurdle&&!game.api.bossFriendHeld(e)&&!game.api.underPaper(e)&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!['tank','boss','eraser','wallpuller','papertearer'].includes(e.type);}
 function chonksShelterHost(e){
  if(!eligible(e))return null;let best=null,distance=Infinity;
  for(const h of shieldHosts()){const f=front(h),dx=e.x-h.x,dy=e.y-h.y,back=-(dx*f.x+dy*f.y),side=Math.abs(dx*f.y-dy*f.x);if(back>=12&&back<=tuning.shelterLength&&side<=20+back*.45&&back<distance){best=h;distance=back;}}
  return best;
 }
 function chonksProtected(e){return hasChonksShield(e)||!!chonksShelterHost(e);}
 function clearChonksControl(e){if(chonksProtected(e))for(const k of ['burn','burnDps','poison','poisonDps','freeze','stun','charged','gravitySlow','feastRush'])e[k]=0;}
 function resetChonksShield(){cachedArray=null;cachedLength=-1;hosts=[];escorts=new WeakMap();rubs.clear();}
 function cancelChonksRub(){rubs.clear();}
 function eraseChonksShields(a,b,r){
  if(!active()||Math.hypot(b.x-a.x,b.y-a.y)<.5)return false;
  for(const h of shieldHosts()){const q=chonksShieldAnchor(h);if(game.api.pointSegDist(q.x,q.y,a.x,a.y,b.x,b.y)<=r+22)rubs.set(h,.1);}
  return false; // Queues timed rubbing; never awards damage, ink or a kill.
 }
 function updateChonksShield(dt){
  if(!active()){cancelChonksRub();return;}
  for(const [h,left] of rubs){if(!hasChonksShield(h)||!game.state.enemies.includes(h)){rubs.delete(h);continue;}
   const used=Math.min(Math.max(0,dt),.1,left);h.chonks.shieldWear=(h.chonks.shieldWear||0)+used;
   if(h.chonks.shieldWear>=tuning.rubSeconds-1e-9){h.chonks.shield=false;h.chonks.momentum=0;h.chonks.phase='recover';h.chonks.recovery=h.chonks.recoveryTotal=.6;h.chonks.target=null;game.api.burst(h.x,h.y,'#ad9bc8',14);game.api.floatText(h.x,h.y-h.r-30,'SHIELD ERASED!','#775086');rubs.delete(h);}
   else if(left<=used)rubs.delete(h);else rubs.set(h,left-used);
  }
  const previous=escorts;escorts=new WeakMap();
  for(const h of shieldHosts()){
   const f=front(h),near=game.state.enemies.filter(e=>eligible(e)&&!escorts.has(e)&&Math.hypot(e.x-h.x,e.y-h.y)<=tuning.recruitRange&&(e.x-h.x)*f.x+(e.y-h.y)*f.y<25&&!game.api.feastHost(e)).sort((a,b)=>{const ao=previous.get(a),bo=previous.get(b);if(ao?.host===h&&bo?.host===h)return ao.slot-bo.slot;if(ao?.host===h)return -1;if(bo?.host===h)return 1;return Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y);}).slice(0,tuning.escortCap);
   near.forEach((e,i)=>escorts.set(e,{host:h,slot:i}));
  }
 }
 function updateChonksEscort(e,dt){
  const order=escorts.get(e),shelter=chonksShelterHost(e),host=shelter||order?.host;
  if(!host||!eligible(e)||!hasChonksShield(host)||!game.state.enemies.includes(host)||e.freeze>0||e.stun>0||game.api.feastHost(e))return false;
  const f=front(host),pace=host.chonks.phase==='recover'||host.freeze>0||host.stun>0?0:host.speed*game.api.enemyMoveScale(host)*(1-game.api.clamp(host.gravitySlow,0,.7));
  // Everyone actually sheltered shares the leader's speed, including overflow recruits.
  const slot=order?.host===host?order.slot:null,back=slot===null?0:44+Math.floor(slot/3)*30,side=slot===null?0:(slot%3-1)*22;
  const target=slot===null?{x:e.x+f.x*pace*dt,y:e.y+f.y*pace*dt}:{x:game.api.clamp(host.x-f.x*back-f.y*side,e.r+8,game.state.W-e.r-8),y:game.api.clamp(host.y-f.y*back+f.x*side,80+e.r,game.state.H-e.r-20)};
  const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy),travel=Math.min(d,(shelter?pace:Math.max(20,pace)*1.35)*dt);
  if(e.type==='sniper')game.api.updateSniper(e,dt,{host,convoy:true});
  const hit=game.api.nearestWallHit(e);
  if(hit){game.api.dealDamage(e,game.api.applyInkContact(e,dt,hit.wall)*dt,'physical');game.api.damageWall(hit.wall,e.dmg*dt,e.x,e.y);}
  else if(!e.sniperAim&&d>.001&&travel>0)game.api.moveEnemySafely(e,dx/d*travel,dy/d*travel);
  game.api.contactStevie(e);return true;
 }
 function chonksConvoySnapshot(){return game.state.enemies.filter(e=>escorts.has(e)).map(e=>({x:e.x,y:e.y,slot:escorts.get(e).slot}));}
 function drawChonksShield(e){
  const ctx=game.dom.ctx;
  if(!hasChonksShield(e)){if(chonksProtected(e)){ctx.save();ctx.strokeStyle='#84699e';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-5,-e.r-13);ctx.lineTo(5,-e.r-13);ctx.lineTo(4,-e.r-7);ctx.lineTo(0,-e.r-4);ctx.lineTo(-4,-e.r-7);ctx.closePath();ctx.stroke();ctx.restore();}return;}
  const f=front(e),wear=Math.min(1,(e.chonks.shieldWear||0)/tuning.rubSeconds);ctx.save();ctx.rotate(Math.atan2(f.y,f.x));
  ctx.fillStyle='#b4a3c617';ctx.strokeStyle='#9074a65c';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(-12,-25);ctx.lineTo(-115,-72);ctx.lineTo(-115,72);ctx.lineTo(-12,25);ctx.closePath();ctx.fill();ctx.stroke();ctx.setLineDash([]);
  ctx.restore();
  const q=chonksShieldAnchor(e),image=game.api.doodleArtwork('chonks-shield');
  ctx.save();ctx.translate(q.x-e.x,q.y-e.y);ctx.rotate(q.angle);ctx.scale(q.sx,q.sy);
  // A little gray gripping hand connects the shield's inner rim to his armor.
  ctx.strokeStyle='#342f2b';ctx.fillStyle='#b4aaa1';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(-f.x*9,-5,5,3,-f.x*.3,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.globalAlpha=1-wear*.8;
  if(image){const width=e.r*2.2,height=width*image.naturalHeight/image.naturalWidth;ctx.drawImage(image,-width/2,-height/2,width,height);}
  // During a transient load failure the buckler still visibly overlaps his body.
  else{ctx.fillStyle='#c8b2d9';ctx.beginPath();ctx.moveTo(-14,-14);ctx.lineTo(14,-13);ctx.lineTo(11,10);ctx.lineTo(0,17);ctx.lineTo(-12,8);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.restore();
  ctx.save();ctx.fillStyle='#65437a';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('ERASE SHIELD',game.api.clamp(f.x*62,50-e.x,game.state.W-50-e.x),f.y*62+4);ctx.restore();
 }
 const api={chonksShelterHost,chonksConvoySnapshot,chonksShieldAnchor,hasChonksShield,chonksProtected,clearChonksControl,resetChonksShield,cancelChonksRub,eraseChonksShields,updateChonksShield,updateChonksEscort,drawChonksShield,chonksShieldTuning:()=>({...tuning})};Object.assign(game.api,api);return api;
};
