/* Sir Chonks leads a visible, erasable shield convoy from wave six onward. */
DoodleDefender.systems.chonksShield=function(game){
 const tuning={rubSeconds:.65,shelterLength:115,recruitRange:170,escortCap:6};
 let cachedArray=null,cachedLength=-1,hosts=[],escorts=new WeakMap(),rubs=new Map();
 const active=()=>game.api.paperActive();
 function hasChonksShield(e){return e?.type==='tank'&&e.chonks?.shield===true&&e.hp>0&&!e.flight&&!game.api.underPaper(e);}
 function shieldHosts(){const list=game.state.enemies;if(list!==cachedArray||list.length!==cachedLength){cachedArray=list;cachedLength=list.length;hosts=list.filter(e=>e.type==='tank');}return hosts.filter(hasChonksShield);}
 function front(e){const p=game.state.player,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;return {x:dx/d,y:dy/d};}
 function eligible(e){return e.hp>0&&!e.flight&&!game.api.underPaper(e)&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!['tank','boss','eraser'].includes(e.type);}
 function chonksProtected(e){
  if(hasChonksShield(e))return true;if(!eligible(e))return false;
  for(const h of shieldHosts()){const f=front(h),dx=e.x-h.x,dy=e.y-h.y,back=-(dx*f.x+dy*f.y),side=Math.abs(dx*f.y-dy*f.x);if(back>=12&&back<=tuning.shelterLength&&side<=20+back*.45)return true;}
  return false;
 }
 function clearChonksControl(e){if(chonksProtected(e))for(const k of ['burn','burnDps','poison','poisonDps','freeze','stun','charged','gravitySlow','feastRush'])e[k]=0;}
 function resetChonksShield(){cachedArray=null;cachedLength=-1;hosts=[];escorts=new WeakMap();rubs.clear();}
 function cancelChonksRub(){rubs.clear();}
 function eraseChonksShields(a,b,r){
  if(!active()||Math.hypot(b.x-a.x,b.y-a.y)<.5)return false;
  for(const h of shieldHosts()){const f=front(h),x=h.x+f.x*30,y=h.y+f.y*30;if(game.api.pointSegDist(x,y,a.x,a.y,b.x,b.y)<=r+22)rubs.set(h,.1);}
  return false; // Queues timed rubbing; never awards damage, ink or a kill.
 }
 function updateChonksShield(dt){
  if(!active()){cancelChonksRub();return;}
  for(const [h,left] of rubs){if(!hasChonksShield(h)||!game.state.enemies.includes(h)){rubs.delete(h);continue;}
   const used=Math.min(Math.max(0,dt),.1,left);h.chonks.shieldWear=(h.chonks.shieldWear||0)+used;
   if(h.chonks.shieldWear>=tuning.rubSeconds-1e-9){h.chonks.shield=false;h.chonks.momentum=0;h.chonks.phase='recover';h.chonks.recovery=h.chonks.recoveryTotal=.6;h.chonks.target=null;game.api.burst(h.x,h.y,'#ad9bc8',14);game.api.floatText(h.x,h.y-h.r-30,'SHIELD ERASED!','#775086');rubs.delete(h);}
   else if(left<=used)rubs.delete(h);else rubs.set(h,left-used);
  }
  escorts=new WeakMap();
  for(const h of shieldHosts()){
   const f=front(h),near=game.state.enemies.filter(e=>eligible(e)&&!escorts.has(e)&&Math.hypot(e.x-h.x,e.y-h.y)<=tuning.recruitRange&&(e.x-h.x)*f.x+(e.y-h.y)*f.y<25&&!game.api.feastHost(e)).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y)).slice(0,tuning.escortCap);
   near.forEach((e,i)=>escorts.set(e,{host:h,slot:i}));
  }
 }
 function updateChonksEscort(e,dt){
  const order=escorts.get(e);if(!order||!eligible(e)||!hasChonksShield(order.host)||!game.state.enemies.includes(order.host)||e.freeze>0||e.stun>0)return false;
  const f=front(order.host),back=44+Math.floor(order.slot/3)*30,side=(order.slot%3-1)*22;
  const target={x:game.api.clamp(order.host.x-f.x*back-f.y*side,e.r+8,game.state.W-e.r-8),y:game.api.clamp(order.host.y-f.y*back+f.x*side,80+e.r,game.state.H-e.r-20)};
  const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy),travel=Math.min(d,e.speed*game.api.enemyMoveScale(e)*1.2*dt);
  const hit=game.api.nearestWallHit(e);
  if(hit){game.api.dealDamage(e,game.api.applyInkContact(e,dt,hit.wall)*dt,'physical');game.api.damageWall(hit.wall,e.dmg*dt,e.x,e.y);}
  else if(d>3)game.api.moveEnemySafely(e,dx/d*travel,dy/d*travel);
  game.api.contactStevie(e);return true;
 }
 function drawChonksShield(e){
  const ctx=game.dom.ctx;
  if(!hasChonksShield(e)){if(chonksProtected(e)){ctx.save();ctx.strokeStyle='#84699e';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-5,-e.r-13);ctx.lineTo(5,-e.r-13);ctx.lineTo(4,-e.r-7);ctx.lineTo(0,-e.r-4);ctx.lineTo(-4,-e.r-7);ctx.closePath();ctx.stroke();ctx.restore();}return;}
  const f=front(e),wear=Math.min(1,(e.chonks.shieldWear||0)/tuning.rubSeconds);ctx.save();ctx.rotate(Math.atan2(f.y,f.x));
  ctx.fillStyle='#b4a3c617';ctx.strokeStyle='#9074a65c';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(-12,-25);ctx.lineTo(-115,-72);ctx.lineTo(-115,72);ctx.lineTo(-12,25);ctx.closePath();ctx.fill();ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=1-wear*.65;ctx.fillStyle='#e9dcf5';ctx.strokeStyle='#705080';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(22,-25);ctx.lineTo(41,-20);ctx.lineTo(43,10);ctx.lineTo(30,28);ctx.lineTo(18,8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#b396cb';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(23,-17+i*9);ctx.lineTo(37,-12+i*8);ctx.stroke();}ctx.restore();
  ctx.save();ctx.fillStyle='#65437a';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('ERASE SHIELD',game.api.clamp(f.x*62,50-e.x,game.state.W-50-e.x),f.y*62+4);ctx.restore();
 }
 const api={hasChonksShield,chonksProtected,clearChonksControl,resetChonksShield,cancelChonksRub,eraseChonksShields,updateChonksShield,updateChonksEscort,drawChonksShield,chonksShieldTuning:()=>({...tuning})};Object.assign(game.api,api);return api;
};
