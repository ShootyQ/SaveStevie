/* Legendary Electric: a bounded wall network, not one independent timer per fragment. */
DoodleDefender.systems.tesla=function(game){
 const tuning={period:2,range:160,damageMultiplier:4,maxTargets:8,maxCoils:24,maxPerWall:3,boltLife:.32};
 let charge=0,clock=0,bolts=[];
 const enabled=()=>!!game.state.stats.tesla&&game.state.inks.electric>0;
 const active=()=>game.state.running&&!game.state.paused&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec&&!game.api.synergyRevealActive()&&!game.api.bossEntranceActive()&&!game.api.waveFinaleActive()&&!game.api.wobbleRepairActive()&&!document.hidden;
 const eligible=e=>e.hp>0&&!game.api.abilityImmune(e)&&e.immunity!=='electric'&&!game.api.underPaper(e)&&!e.flight&&!e.hurdle&&!game.api.bossFriendHeld(e)&&!e.catapultHeld;
 function resetTesla(){charge=0;clock=0;bolts=[];}
 function coils(){
  const result=[];if(!enabled())return result;
  for(const w of game.state.walls){
   if(w.hp<=0||w.life<=0||w.shapeTurret||w.wobbleBumper||w.pts.length<2)continue;
   let length=0;for(let i=1;i<w.pts.length;i++)length+=Math.hypot(w.pts[i].x-w.pts[i-1].x,w.pts[i].y-w.pts[i-1].y);
   if(length<8)continue;const count=Math.min(tuning.maxPerWall,Math.max(1,Math.floor(length/100)));
   for(let j=0;j<count&&result.length<tuning.maxCoils;j++){
    let left=length*(j+.5)/count;
    for(let i=1;i<w.pts.length;i++){const a=w.pts[i-1],b=w.pts[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<.001)continue;
     if(left<=d){result.push({x:a.x+dx*left/d,y:a.y+dy*left/d,angle:Math.atan2(dy,dx)});break;}left-=d;
    }
   }
   if(result.length>=tuning.maxCoils)break;
  }return result;
 }
 function updateTesla(dt){
  if(!active())return;if(!enabled()){resetTesla();return;}
  clock+=dt;bolts=bolts.filter(b=>(b.age+=dt)<tuning.boltLife);
  const nodes=coils();if(!nodes.length){charge=0;return;}charge=Math.min(1,charge+Math.max(0,dt)/tuning.period);if(charge<1)return;
  const targets=[];
  for(const e of game.state.enemies){if(!eligible(e))continue;let node=null,best=Infinity;for(const p of nodes){const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<=tuning.range+e.r&&d<best){best=d;node=p;}}if(node)targets.push({e,node,distance:best});}
  targets.sort((a,b)=>a.distance-b.distance);if(!targets.length)return;
  charge=0;const damage=game.api.electricTuning(game.state.inks.electric).damage*tuning.damageMultiplier;
  // Each monster is selected once across the entire network, even with overlaps.
  for(const {e,node} of targets.slice(0,tuning.maxTargets)){
   if(!eligible(e))continue;bolts.push({x:node.x,y:node.y,tx:e.x,ty:e.y,age:0,seed:bolts.length});game.api.dealDamage(e,damage,'electric');if(e.hp<=0)game.api.killEnemy(e);
  }
  game.api.playSound('electric');
 }
 function drawTeslaWalls(){
  if(!enabled())return;const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();ctx.save();
  for(const [i,p] of coils().entries()){
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=.3+charge*.45;ctx.strokeStyle='#599ae0';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(0,0,12+charge*7,8+charge*5,0,0,Math.PI*2);ctx.stroke();
   ctx.globalAlpha=1;ctx.fillStyle='#697484';ctx.strokeStyle='#303b4f';ctx.lineWidth=1.4;ctx.beginPath();ctx.roundRect(-14,-6,28,12,3);ctx.fill();ctx.stroke();
   for(let j=0;j<5;j++){ctx.strokeStyle='#8d572c';ctx.lineWidth=3.4;ctx.beginPath();ctx.ellipse(-10+j*5,0,2.5,8,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#e6ba6d';ctx.lineWidth=1.3;ctx.stroke();}
   ctx.fillStyle=charge>.85?'#f4fdff':'#9ecffa';for(const x of [-15,15]){ctx.beginPath();ctx.arc(x,0,3.5,0,Math.PI*2);ctx.fill();}
   if(charge>.25){const angle=reduced?-Math.PI/2:clock*3+i*1.9;ctx.fillStyle='#c5edff';ctx.beginPath();ctx.arc(Math.cos(angle)*(14+charge*7),Math.sin(angle)*(8+charge*5),2+charge,0,Math.PI*2);ctx.fill();}
   ctx.restore();
  }ctx.restore();
 }
 function drawTeslaBolts(){
  if(!enabled())return;const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  for(const b of bolts){const dx=b.tx-b.x,dy=b.ty-b.y,length=Math.hypot(dx,dy)||1;ctx.globalAlpha=1-b.age/tuning.boltLife;
   ctx.beginPath();ctx.moveTo(b.x,b.y);for(let i=1;i<9;i++){const t=i/9,jitter=Math.sin(i*7.3+b.seed*2+(reduced?0:b.age*24))*10*Math.sin(t*Math.PI);ctx.lineTo(b.x+dx*t-dy/length*jitter,b.y+dy*t+dx/length*jitter);}ctx.lineTo(b.tx,b.ty);
   ctx.strokeStyle='#3c68c7';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#82c9ff';ctx.lineWidth=3.5;ctx.stroke();ctx.strokeStyle='#f2ffff';ctx.lineWidth=1.4;ctx.stroke();
   for(const p of [{x:b.x,y:b.y},{x:b.tx,y:b.ty}]){ctx.strokeStyle='#70b7e8';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(p.x,p.y,4+b.age*28,0,Math.PI*2);ctx.stroke();}
  }ctx.restore();
 }
 function moveTesla(dx,dy){for(const b of bolts){b.x+=dx;b.tx+=dx;b.y+=dy;b.ty+=dy;}}
 const api={resetTesla,updateTesla,drawTeslaWalls,drawTeslaBolts,moveTesla,teslaSnapshot:()=>({unlocked:enabled(),charge,coils:coils(),bolts:bolts.map(b=>({...b})),tuning:{...tuning}})};Object.assign(game.api,api);return api;
};
