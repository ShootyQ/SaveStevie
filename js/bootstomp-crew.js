/* Bootstomp's eraser crew: rub off their orders, then protect the helpers. */
DoodleDefender.systems.bootstompCrew=function(game){
 const a=game.api,s=game.state,tune={cap:3,spawn:4.5,loyalty:12,scrub:.55,waveGap:3.5,waveWarn:.8,waveSpeed:240};
 let jobs=new WeakMap(),waves=[];
 const crew=host=>s.enemies.filter(n=>n.bootstompBuffer&&n.hp>0&&!n.bufferSpent&&n.bossOwner===host);
 function job(host){let b=jobs.get(host);if(!b){b={spawn:.7,wave:2,warning:null,serial:0};jobs.set(host,b);}return b;}
 function turn(n,friendly){n.bufferFriendly=friendly;n.bufferLife=tune.loyalty;n.bufferScrub=0;n.bufferLock=.4;n.stun=n.freeze=0;if(friendly){n.burn=n.poison=0;}a.burst(n.x,n.y,friendly?'#63b49a':'#ce8d59',8);a.floatText(n.x,n.y-30,friendly?'→ BOOTSTOMP!':'→ STEVIE! ',friendly?'#36846b':'#ac6338');}
 function updateBootstompCrewSpawns(host,dt){
  const phase=a.bootstompSnapshot(host)?.phase;if(['intro','defeat'].includes(phase))return;const b=job(host);b.spawn-=dt;if(b.spawn>0)return;b.spawn=tune.spawn;if(crew(host).length>=tune.cap)return;
  const p=s.player,angle=Math.atan2(host.y-p.y,host.x-p.x)+(b.serial++%2?.8:-.8),n=a.spawnEnemy(false,a.clamp(host.x+Math.cos(angle)*105,28,s.W-28),a.clamp(host.y+Math.sin(angle)*105,100,s.H-35),'boot-buffer');
  if(n){n.bossOwner=host;n.bootstompBuffer=true;n.bufferFriendly=false;n.bufferLife=tune.loyalty;n.bufferScrub=0;n.bufferLock=0;n.scrubOrbit=0;}
 }
 function redirectBootstompCrew(from,to,r){
  if(Math.hypot(to.x-from.x,to.y-from.y)<6)return false;let touched=false;
  for(const n of s.enemies)if(n.bootstompBuffer&&n.hp>0&&!n.bufferSpent&&!n.flight&&a.pointSegDist(n.x,n.y,from.x,from.y,to.x,to.y)<=r+n.r*.7){touched=true;if(!n.bufferFriendly&&!(n.bufferLock>0))turn(n,true);}
  return touched;
 }
 function updateBootstompBuffer(n,dt){
  if(!n.bootstompBuffer)return false;const host=n.bossOwner,phase=a.bootstompSnapshot(host)?.phase;
  if(!host||host.hp<=0||!s.enemies.includes(host)||phase==='defeat'){s.enemies=s.enemies.filter(e=>e!==n);return true;}
  if(n.bufferSpent){n.bufferFade-=dt;if(n.bufferFade<=0)s.enemies=s.enemies.filter(e=>e!==n);return true;}
  n.bufferLock=Math.max(0,(n.bufferLock||0)-dt);if(n.freeze>0||n.stun>0)return true;
  if(!n.bufferFriendly){
   if(s.walls.length||a.shapeBarrierWalls().length)a.updateScrubber(n,dt);else{a.navigateSpecialist(n,s.player,dt,1,false);a.contactStevie(n);}return true;
  }
  n.bufferLife-=dt;if(n.bufferLife<=0){turn(n,false);return true;}
  if(phase!=='down')n.bufferScrub=0;
  const q=a.bootstompSnapshot(host),parts=Object.keys(q.wear).filter(k=>q.wear[k]<3).map(k=>q.parts[k]).sort((x,y)=>Math.hypot(n.x-x.x,n.y-x.y)-Math.hypot(n.x-y.x,n.y-y.y));
  const angle=Math.atan2(n.y-host.y,n.x-host.x),goal=phase==='down'&&parts.length?parts[0]:{x:a.clamp(host.x+Math.cos(angle)*85,24,s.W-24),y:a.clamp(host.y+Math.sin(angle)*85,96,s.H-30)};
  const d=Math.hypot(n.x-goal.x,n.y-goal.y);if(d>n.r+12){n.bufferScrub=0;a.navigateSpecialist(n,goal,dt,1.2,false);return true;}
  if(phase==='down'){n.bufferScrub+=dt;a.animateEnemyAction(n,'strike',goal);if(n.bufferScrub>=tune.scrub&&a.bootstompCrewScrub(host,n)){n.bufferSpent=true;n.bufferFade=.45;a.burst(n.x,n.y,'#e6bba0',10);}}return true;
 }
 function bootstompCrewWaveContact(host,q,from,to){for(const n of crew(host))if(n.bufferFriendly&&a.pointSegDist(n.x,n.y,from.x,from.y,to.x,to.y)<=n.r+10)turn(n,false);}
 function updateBootstompCrewWaves(host,dt){
  const b=job(host),phase=a.bootstompSnapshot(host)?.phase,active=!['intro','defeat','down','fall','stumble','lace_rebound'].includes(phase);b.wave-=dt;
  if(!active)b.warning=null;
  if(active&&!b.warning&&b.wave<=0){const n=crew(host).filter(n=>n.bufferFriendly).sort((x,y)=>Math.hypot(x.x-host.x,x.y-host.y)-Math.hypot(y.x-host.x,y.y-host.y))[0];if(n)b.warning={n,left:tune.waveWarn};}
  if(b.warning){const w=b.warning;w.left-=dt;if(!crew(host).includes(w.n)||!w.n.bufferFriendly)b.warning=null;else if(w.left<=0){waves.push({host,target:w.n,x:host.x,y:host.y,age:0});if(waves.length>4)waves.shift();b.wave=tune.waveGap;b.warning=null;a.playSound('woodImpact');}}
  for(const w of waves){if(w.host!==host)continue;const n=w.target;if(!s.enemies.includes(n)||!n.bufferFriendly||n.bufferSpent){w.done=true;continue;}const dx=n.x-w.x,dy=n.y-w.y,d=Math.hypot(dx,dy),step=Math.min(d,tune.waveSpeed*dt),to={x:w.x+dx/(d||1)*step,y:w.y+dy/(d||1)*step},hit=a.bossShotWallHit({x:w.x,y:w.y,r:6},to.x,to.y);
   if(hit){a.damageWall(hit.wall,hit.wall.maxHp*.4,w.x,w.y);a.floatText(w.x,w.y-20,'CREW SAVED!','#428c73');w.done=true;continue;}
   if(a.pointSegDist(n.x,n.y,w.x,w.y,to.x,to.y)<=n.r+10){turn(n,false);w.done=true;}w.x=to.x;w.y=to.y;w.age+=dt;if(w.age>5)w.done=true;
  }waves=waves.filter(w=>!w.done&&s.enemies.includes(w.host)&&w.host.hp>0);
 }
 function drawBootstompCrew(){const ctx=game.dom.ctx;ctx.save();for(const host of s.enemies.filter(a.isBootstomp)){const w=jobs.get(host)?.warning;if(w&&w.n.bufferFriendly){ctx.strokeStyle='#bf7b48';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(host.x,host.y);ctx.lineTo(w.n.x,w.n.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#a9693e';ctx.font='14px "Stevie Pencil",sans-serif';ctx.textAlign='center';ctx.fillText('TURN BACK!',w.n.x,w.n.y-45);}}
  for(const w of waves){ctx.save();ctx.translate(w.x,w.y);ctx.rotate(Math.atan2(w.target.y-w.y,w.target.x-w.x)+Math.PI/2);ctx.fillStyle='#fff6df';ctx.strokeStyle='#ad7947';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-27,4);ctx.bezierCurveTo(-12,-9,12,-9,27,4);ctx.lineTo(27,10);ctx.bezierCurveTo(12,1,-12,1,-27,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  for(const n of s.enemies)if(n.bootstompBuffer&&!n.bufferSpent){ctx.fillStyle=n.bufferFriendly?'#337e68':'#a6693f';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(n.bufferFriendly?'→ BOOT':'ERASE ORDERS',n.x,n.y-n.r-20);if(n.bufferFriendly&&n.bufferScrub>0){ctx.strokeStyle='#4fa98a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(n.x,n.y,n.r+9,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,n.bufferScrub/tune.scrub));ctx.stroke();}}ctx.restore();}
 Object.assign(a,{resetBootstompCrew:()=>{jobs=new WeakMap();waves=[];},clearBootstompCrew:host=>{waves=waves.filter(w=>w.host!==host);jobs.delete(host);},moveBootstompCrew:(dx,dy)=>{for(const w of waves){w.x+=dx;w.y+=dy;}},updateBootstompCrewSpawns,redirectBootstompCrew,updateBootstompBuffer,updateBootstompCrewWaves,bootstompCrewWaveContact,drawBootstompCrew,bootstompCrewSnapshot:()=>({crew:s.enemies.filter(n=>n.bootstompBuffer).map(n=>({x:n.x,y:n.y,friendly:n.bufferFriendly,life:n.bufferLife,scrub:n.bufferScrub,spent:!!n.bufferSpent})),waves:waves.map(w=>({x:w.x,y:w.y,age:w.age})),tuning:{...tune}})});return {};
};
