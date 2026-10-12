/* Fire consumes the frozen shell: one readable charge, one bounded steam pop. */
DoodleDefender.systems.thermalShock=function(game){
 let pops=[],clock=0,staggerRest=new WeakMap();
 const boss=e=>e.waveBoss||game.catalog.enemyDefs[e.type]?.boss;
 const eligible=e=>e.hp>0&&!game.api.underPaper(e)&&!game.api.abilityImmune(e)&&!e.flight&&!e.hurdle&&!game.api.bossFriendHeld(e);
 function resetThermalShock(){pops=[];clock=0;staggerRest=new WeakMap();for(const e of game.state.enemies){delete e.thermalShock;e.thermalCd=0;}}
 function beginThermalShock(e){
  if(!game.state.synergies.has('Thermal Shock')||!eligible(e)||e.immunity==='fire'||e.immunity==='frost'||e.freeze<=0||e.burn<=0||e.thermalCd>0||e.thermalShock?.phase==='pressure'||e.blackIce)return false;
  e.thermalShock={phase:'pressure',age:0,left:.5,damage:18+4*(game.state.inks.fire+game.state.inks.frost)};
  e.burn=0;e.burnDps=0;e.freeze=0;e.thermalCd=3;game.api.playSound('thermalHeat');return true;
 }
 function updateThermalShockTime(dt){clock+=dt;for(const p of pops)p.age+=dt;pops=pops.filter(p=>p.age<p.life);}
 function updateThermalShockEnemy(e,dt){
  const s=e.thermalShock;if(!s)return false;
  if(!eligible(e)||!game.state.synergies.has('Thermal Shock')){delete e.thermalShock;return false;}
  s.age+=dt;s.left-=dt;
  if(s.phase==='soot'){if(s.left<=0)delete e.thermalShock;return false;}
  if(s.left>0)return !boss(e);
  e.burn=0;e.burnDps=0;e.freeze=0; // Consume anything reapplied during the reserved reaction too.
  const radius=Math.min(100,62+e.r),x=e.x,y=e.y;
  if(pops.length>=8)pops.shift();pops.push({x,y,radius,age:0,life:.6});
  e.thermalShock={phase:'soot',age:0,left:.9};e.thermalCd=3;
  game.api.dealDamage(e,s.damage,'frost');game.api.playSound('thermalPop');
  // Neighbour flinches do not trigger another reaction or indefinitely pin bosses.
  if(!boss(e)&&!game.api.abilityImmune(e))e.stun=Math.max(e.stun,.22);
  for(const n of game.state.enemies){if(n===e||boss(n)||!eligible(n)||(staggerRest.get(n)||0)>clock||Math.hypot(n.x-x,n.y-y)>radius+n.r)continue;
   n.stun=Math.max(n.stun,.22);staggerRest.set(n,clock+1.2);game.api.animateEnemyAction(n,'bounce');
  }
  return false;
 }
 function thermalPressureActive(e){return e.thermalShock?.phase==='pressure'&&!boss(e);}
 function thermalShockPose(e){const s=e.thermalShock;if(!s||s.phase!=='pressure'||game.api.enemyMotionReduced())return null;const t=Math.min(1,s.age/.5);return {x:Math.sin(s.age*70)*t*2,y:-t*2,angle:Math.sin(s.age*55)*t*.07,sx:1+t*.18,sy:1+t*.12};}
 function moveThermalShock(dx,dy){for(const p of pops){p.x+=dx;p.y+=dy;}}
 function drawThermalShockEnemy(e){
  const s=e.thermalShock;if(!s||e.hp<=0)return;const ctx=game.dom.ctx,r=Math.min(38,e.r*1.3+4),reduced=game.api.enemyMotionReduced();ctx.save();ctx.lineJoin='round';
  if(s.phase==='pressure'){
   const t=Math.min(1,s.age/.5);ctx.fillStyle='rgba(191,229,239,.18)';ctx.strokeStyle='#80b5cb';ctx.lineWidth=2;ctx.beginPath();
   for(let i=0;i<=12;i++){const a=i/12*Math.PI*2,d=r*(i%2?1:.93);if(i)ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);else ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);}ctx.closePath();ctx.fill();ctx.stroke();
   for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.3;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(r*.25,-r*.5);ctx.lineTo(r*.5,-r*.15);ctx.lineTo(r*.3,r*.2);ctx.lineTo(r*.7,r*.5);ctx.strokeStyle='#9c4928';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#ffb558';ctx.lineWidth=1+t;ctx.stroke();ctx.restore();}
   ctx.strokeStyle='#e7f6f5';ctx.lineWidth=2;for(let i=0;i<2;i++){const h=reduced?0:((s.age*2+i*.5)%1)*9;ctx.beginPath();ctx.moveTo((i?1:-1)*r*.5,-r-1-h);ctx.quadraticCurveTo((i?1:-1)*r*.5+5,-r-6-h,(i?1:-1)*r*.5,-r-11-h);ctx.stroke();}
  }else{ctx.globalAlpha=Math.min(1,s.left/.4)*.8;ctx.fillStyle='#514c48';for(let i=0;i<5;i++){const x=Math.sin(i*2.3)*r*.48,y=Math.cos(i*2.7)*r*.35;ctx.beginPath();ctx.ellipse(x,y,2.8+i%2,2.2,.3*i,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
 }
 function drawThermalShockPops(){const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();for(const p of pops){const t=p.age/p.life,r=8+(p.radius-8)*(1-Math.pow(1-t,2));ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=(1-t)*.8;
  ctx.strokeStyle='#85a8b1';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=36;i++){const a=i/36*Math.PI*2,d=r*(1+.04*Math.sin(i*2));if(i)ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);else ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);}ctx.stroke();
  ctx.strokeStyle='#fff8e7';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*.88,0,Math.PI*2);ctx.stroke();
  if(!reduced){for(let i=0;i<8;i++){const a=i*Math.PI/4+.2,x=Math.cos(a)*r*.65,y=Math.sin(a)*r*.65-t*13;ctx.fillStyle='#edf2e8';ctx.beginPath();ctx.arc(x,y,4+t*5,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(Math.cos(a)*r,Math.sin(a)*r);ctx.rotate(a+t*2);ctx.fillStyle='#d5f6ff';ctx.strokeStyle='#549ab5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,-4);ctx.lineTo(4,0);ctx.lineTo(-1,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}}
  ctx.restore();}}
 const api={resetThermalShock,beginThermalShock,updateThermalShockTime,updateThermalShockEnemy,thermalPressureActive,thermalShockPose,moveThermalShock,drawThermalShockEnemy,drawThermalShockPops,thermalShockSnapshot:()=>pops.map(p=>({...p}))};Object.assign(game.api,api);return api;
};
