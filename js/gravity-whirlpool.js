/* A loop is a notebook drain: bodies cross its ink, then get one center roll. */
DoodleDefender.systems.gravityWhirlpool=function(game){
 const a=game.api,s=game.state;let clock=0,cooldown=0,tried=new WeakSet(),captured=new Map(),pops=[],pulling=new WeakSet();
 const enabled=()=>s.synergies.has('Gravity Trap')||s.synergies.has('THE BLACK HOLE');
 const loops=()=>enabled()?s.walls.filter(w=>w.closed&&w.hp>0&&w.life>0&&!w.shapeTurret):[];
 const eligible=e=>e.hp>0&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!a.abilityImmune(e)&&e.immunity!=='void'&&!a.chonksProtected(e)&&!a.underPaper(e)&&!e.flight&&!e.hurdle&&!a.bossFriendHeld(e)&&!a.heldByCatapulter(e)&&!a.heldUnderDesk(e);
 function resetGravityWhirlpool(){clock=0;cooldown=0;tried=new WeakSet();captured.clear();pops=[];pulling=new WeakSet();}
 function updateGravityWhirlpool(dt){
  if(!a.scoringActive()||!Number.isFinite(dt)||dt<=0)return;pulling=new WeakSet();clock+=dt;cooldown=Math.max(0,cooldown-dt);pops=pops.filter(p=>(p.left-=dt)>0);
  for(const [e,c] of captured){a.recordSupport('control',Math.min(dt,Math.max(0,1.1-c.age)));c.age+=dt;if(!s.enemies.includes(e)||e.hp<=0){captured.delete(e);continue;}if(c.age>=1.1){captured.delete(e);a.dealDamage(e,e.hp,'void',{gravityGulp:true});if(e.hp<=0){a.recordSkillPlay('GULP!',100,c.x,c.y);a.killEnemy(e);a.playSound('paperDive');pops.push({x:c.x,y:c.y,left:.9});}else e.stun=Math.max(e.stun,.6);}}
  if(!enabled())return;
  const fields=loops().map(w=>(()=>{const f=a.wallGeometry(w.pts);return {w,...f,cx:(f.minX+f.maxX)/2,cy:(f.minY+f.maxY)/2};})());
  for(const e of s.enemies){if(!eligible(e)||captured.has(e)||tried.has(e))continue;
   let field=null,distance=Infinity;for(const f of fields){const d=Math.hypot(f.cx-e.x,f.cy-e.y),r=Math.max(a.supportInkTuning(s.inks.gravity).gravityRange,Math.min(125,Math.max(f.maxX-f.minX,f.maxY-f.minY)*.65));if(d<r&&d<distance){field=f;distance=d;}}
   if(!field)continue;const dx=field.cx-e.x,dy=field.cy-e.y,d=distance||1,pull=45+Math.min(65,s.inks.gravity*8),step=Math.min(distance,pull*dt),nx=e.x+dx/d*step,ny=e.y+dy/d*step;
   const clear=Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+e.r+3;
   if(a.pointSegDist(s.player.x,s.player.y,e.x,e.y,nx,ny)<clear)continue;
   // Ignore only this loop's ink, keeping other cover and turret barriers solid.
   if(!a.bossShotWallHit({x:e.x,y:e.y,r:e.r},nx,ny,new Set([field.w]))&&nx>=e.r&&nx<=s.W-e.r&&ny>=e.r+76&&ny<=s.H-e.r){e.x=nx;e.y=ny;pulling.add(e);}
   if(Math.hypot(e.x-field.cx,e.y-field.cy)<=12&&cooldown<=0){tried.add(e);if(Math.random()<.15){captured.set(e,{age:0,x:field.cx,y:field.cy});e.x=field.cx;e.y=field.cy;cooldown=1.8;a.playSound('paperCrumple');}else{e.stun=Math.max(e.stun,.35);a.floatText(e.x,e.y-e.r-12,'...woah.','#796194');}}
  }
 }
 function drawGravityGround(){const c=game.dom.ctx,reduced=a.enemyMotionReduced();c.save();for(const w of loops()){
  const bounds=a.wallGeometry(w.pts),f={...bounds,cx:(bounds.minX+bounds.maxX)/2,cy:(bounds.minY+bounds.maxY)/2},r=a.clamp(Math.min(f.maxX-f.minX,f.maxY-f.minY)*.32,12,29),spin=reduced?0:clock*1.5;c.save();c.translate(f.cx,f.cy);
  // Bent ruled lines and scribbled concentric spirals make the page itself curl.
  c.lineWidth=1;c.strokeStyle='#7699ac55';for(const y of [-25,-13,13,25]){c.beginPath();c.moveTo(-r-17,y);c.quadraticCurveTo(0,y*.25,r+17,y);c.stroke();}
  c.rotate(spin);for(let arm=0;arm<3;arm++){c.strokeStyle=['#796684','#4a3c58','#b4a4b8'][arm];c.lineWidth=2;c.beginPath();for(let i=0;i<=55;i++){const t=i/55,angle=t*Math.PI*3+arm*Math.PI*2/3,rad=(1-t)*r+2,x=Math.cos(angle)*rad,y=Math.sin(angle)*rad*.7;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();}
  c.fillStyle='#302b38';c.beginPath();c.ellipse(0,0,8,5,0,0,Math.PI*2);c.fill();for(let i=0;i<4;i++){const t=spin+i*1.57;c.save();c.translate(Math.cos(t)*(r+5),Math.sin(t)*(r+5)*.7);c.rotate(t+.4);c.fillStyle=i%2?'#fff8df':'#c9bbd0';c.fillRect(-2,-3,4,6);c.restore();}c.restore();}c.restore();}
 function drawGravityCaptures(){const c=game.dom.ctx,reduced=a.enemyMotionReduced();for(const [e,v] of captured){const t=a.clamp(v.age/1.1,0,1);if(t<.8){c.save();c.translate(v.x,v.y);c.rotate(reduced?0:t*Math.PI*3);c.translate(-v.x,-v.y);a.drawPaperDoodle(e,{visible:1,y:0,sx:Math.max(.08,(1-t)*(1+.55*Math.sin(t*Math.PI))),sy:Math.max(.04,(1-t)**1.7),angle:0,reduced:false});c.restore();}else{c.save();c.globalAlpha=(1-t)*5;c.fillStyle='#fff8e4';c.strokeStyle='#45344f';for(const sign of [-1,1]){const x=v.x+sign*4,y=v.y+(t-.8)*15;c.beginPath();c.ellipse(x,y,3,4,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#292331';c.fillRect(x, y,1,2);c.fillStyle='#fff8e4';}c.restore();}}
  c.save();c.font='bold 16px "Stevie Pencil", cursive';c.textAlign='center';for(const p of pops){c.globalAlpha=p.left/.9;c.fillStyle='#6c527e';c.fillText(p.left>.55?'gulp!':'burp.',p.x,p.y-12);c.strokeStyle='#a895b0';c.beginPath();c.ellipse(p.x,p.y,10+(1-p.left)*18,4+(1-p.left)*5,0,0,Math.PI*2);c.stroke();}c.restore();}
 function moveGravityWhirlpool(dx,dy){for(const p of [...captured.values(),...pops]){p.x+=dx;p.y+=dy;}}
 Object.assign(a,{updateGravityWhirlpool,resetGravityWhirlpool,drawGravityGround,drawGravityCaptures,moveGravityWhirlpool,gravityCaptured:e=>captured.has(e),gravityWhirlpoolPulling:e=>pulling.has(e)&&!tried.has(e),gravityWhirlpoolSnapshot:()=>({clock,cooldown,captured:[...captured.values()].map(v=>({...v})),pops:pops.map(v=>({...v}))})});return {};
};
