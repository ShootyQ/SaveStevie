/* Short, wall-safe skating. All motion lives in update; ornaments are read-only. */
DoodleDefender.systems.blackIce=function(game){
 const boss=e=>e.waveBoss||game.catalog.enemyDefs[e.type]?.boss;
 function startBlackIce(e,dx,dy){
  if(e.hp<=0||!game.state.synergies.has('Black Ice')||e.freeze<=0||e.blackIce||boss(e)||game.api.abilityImmune(e)||game.api.underPaper(e)||e.flight||e.hurdle||game.api.bossFriendHeld(e))return false;
  const d=Math.hypot(dx,dy)||1;e.blackIce={phase:'slide',age:0,left:.7,vx:dx/d*220,vy:dy/d*220,spin:dx<0?-1:1,trail:[{x:e.x,y:e.y}],hits:new Set()};
  e.freeze=0;e.stun=0;e.gravitySlow=Math.max(e.gravitySlow,.62);delete e.eraseSlide;game.api.playSound('frost');return true;
 }
 function flop(e){const s=e.blackIce;if(!s||s.phase==='recover')return;s.phase='recover';s.age=0;s.left=.45;game.api.playSound('frost');}
 function updateBlackIce(e,dt){
  const s=e.blackIce;if(!s)return false;
  if(e.hp<=0||boss(e)||game.api.abilityImmune(e)||game.api.underPaper(e)||e.flight||e.hurdle||game.api.bossFriendHeld(e)){delete e.blackIce;return false;}
  s.age+=dt;s.left-=dt;
  if(s.phase==='recover'){if(s.left<=0)delete e.blackIce;return true;}
  // Subsequent control effects stop the skate instead of letting it ignore new freezes.
  if(e.freeze>0||e.stun>0){flop(e);return true;}
  const dx=s.vx*dt,dy=s.vy*dt,x=e.x+dx,y=e.y+dy;
  if(x<e.r||x>game.state.W-e.r||y<e.r||y>game.state.H-e.r||game.api.touchesRefuge({...e,x,y})||!game.api.moveEnemySafely(e,dx,dy)){flop(e);return true;}
  const previous=s.trail.at(-1);if(Math.hypot(e.x-previous.x,e.y-previous.y)>7){s.trail.push({x:e.x,y:e.y});if(s.trail.length>7)s.trail.shift();}
  for(const n of game.state.enemies){
   if(n===e||n.hp<=0||boss(n)||n.flight||n.hurdle||game.api.underPaper(n)||game.api.abilityImmune(n)||n.freeze>0||n.stun>0||game.api.bossFriendHeld(n)||s.hits.has(n)||s.hits.size>=3)continue;
   if(game.api.pointSegDist(n.x,n.y,e.x-dx,e.y-dy,e.x,e.y)>e.r+n.r)continue;
   s.hits.add(n);const ox=n.x-e.x,oy=n.y-e.y,d=Math.hypot(ox,oy)||1,push=n.type==='tank'?8:18;
   const nx=ox/d||s.spin,ny=oy/d;const q={...n,x:n.x+nx*push,y:n.y+ny*push};
   if(q.x>=n.r&&q.x<=game.state.W-n.r&&q.y>=n.r&&q.y<=game.state.H-n.r&&!game.api.touchesRefuge(q))game.api.moveEnemySafely(n,nx*push,ny*push);
   game.api.animateEnemyAction(n,'bounce');s.vx*=.62;s.vy*=.62;
  }
  const friction=Math.exp(-2.4*dt);s.vx*=friction;s.vy*=friction;if(s.left<=0||Math.hypot(s.vx,s.vy)<30)flop(e);return true;
 }
 function blackIcePose(e){const s=e.blackIce;if(!s)return null;if(s.phase==='slide')return {angle:-s.spin*.35+Math.sin(s.age*25)*.1,y:-2,sx:1.08,sy:.92};const t=Math.min(1,s.age/.45),stand=game.api.clamp((t-.5)/.5,0,1);return {angle:s.spin*(1-stand)*1.1,y:5*(1-stand),sx:1+.18*(1-stand),sy:1-.2*(1-stand)};}
 function moveBlackIce(dx,dy){for(const e of game.state.enemies)if(e.blackIce)for(const p of e.blackIce.trail){p.x+=dx;p.y+=dy;}}
 function drawBlackIce(){const ctx=game.dom.ctx;let count=0;for(const e of game.state.enemies){const s=e.blackIce;if(!s||e.hp<=0||++count>24)continue;
  const reduced=game.api.enemyMotionReduced(),fade=s.phase==='recover'?Math.max(0,s.left/.45):1,r=Math.min(26,e.r+7);
  ctx.save();ctx.globalAlpha=.65*fade;ctx.fillStyle='#d1edf2';ctx.strokeStyle='#78aab8';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(e.x,e.y+e.r*.65,r,r*.3,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#fffefa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x-r*.6,e.y+e.r*.65);ctx.lineTo(e.x+r*.5,e.y+e.r*.65-3);ctx.stroke();
  if(!reduced){ctx.strokeStyle='#83afbf';ctx.lineWidth=1.5;for(const side of [-1,1]){ctx.beginPath();for(const [i,p] of s.trail.entries()){const y=p.y+e.r*.8+side*3+(i%2?2:0);if(i)ctx.lineTo(p.x,y);else ctx.moveTo(p.x,y);}ctx.stroke();}}
  ctx.restore();
 }}
 function drawBlackIceLimbs(e){const s=e.blackIce;if(!s||game.api.enemyMotionReduced())return;const ctx=game.dom.ctx,r=Math.min(e.r,25),phase=s.age*28;ctx.save();ctx.strokeStyle='#374858';ctx.lineWidth=2;ctx.lineCap='round';
  if(s.phase==='slide'){for(const side of [-1,1]){const a=phase+side*Math.PI/2,x=side*(r+3),y=-r*.2;ctx.beginPath();ctx.moveTo(side*r*.75,y+4);ctx.lineTo(x+Math.cos(a)*5,y+Math.sin(a)*8);ctx.lineTo(x+Math.cos(a)*9,y+Math.sin(a)*12);ctx.stroke();const fy=r*.8+Math.sin(phase+side)*3;ctx.beginPath();ctx.moveTo(side*r*.3,fy);ctx.lineTo(side*r*.3+Math.cos(phase+side)*7,fy+4);ctx.stroke();}}
  ctx.restore();}
 const api={startBlackIce,updateBlackIce,blackIcePose,moveBlackIce,drawBlackIce,drawBlackIceLimbs};Object.assign(game.api,api);return api;
};
