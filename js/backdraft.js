/* Legendary Fire: a shared wall reservoir, one swept vent, no combat RNG. */
DoodleDefender.systems.backdraft=function(game){
 let clock=0,serial=0,waves=[];
 const tuning={minimum:.2,ambient:.1,contact:.65,cooldown:2,maxWaves:8};
 const active=()=>game.state.running&&!game.state.paused&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec&&!game.api.synergyRevealActive()&&!game.api.bossEntranceActive()&&!game.api.waveFinaleActive()&&!game.api.wobbleRepairActive()&&!document.hidden;
 const enabled=()=>!!game.state.stats.backdraft&&game.state.inks.fire>0;
 function resetBackdraft(){clock=0;waves=[];serial=0;for(const w of game.state.walls)delete w.backdraft;}
 function heat(w){return w.backdraft||(w.backdraft={charge:0,readyAt:0,id:++serial});}
 function chargeBackdraft(w,e,dt){if(!enabled()||!active()||!w||w.hp<=0||w.shapeTurret||!game.state.walls.includes(w)||e.hp<=0||e.immunity==='fire'||game.api.underPaper(e))return;const h=heat(w);if(clock>=h.readyAt)h.charge=Math.min(1,h.charge+Math.max(0,dt)*tuning.contact);}
 function ventBackdraft(w,a,b){
  if(!enabled()||!active()||!w.backdraft||w.backdraft.charge<tuning.minimum||clock<w.backdraft.readyAt||waves.length>=tuning.maxWaves)return false;
  const h=w.backdraft,q=h.charge,point=game.api.nearestPointOnWall({x:(a.x+b.x)/2,y:(a.y+b.y)/2},w);if(!point)return false;
  let closest=Infinity,nx=0,ny=-1;for(let i=1;i<w.pts.length;i++){const p=w.pts[i-1],r=w.pts[i],d=game.api.pointSegDist(point.x,point.y,p.x,p.y,r.x,r.y);if(d<closest){closest=d;const length=Math.hypot(r.x-p.x,r.y-p.y)||1;nx=-(r.y-p.y)/length;ny=(r.x-p.x)/length;}}
  const player=game.state.player;if(nx*(point.x-player.x)+ny*(point.y-player.y)<0){nx=-nx;ny=-ny;}
  h.charge=0;h.readyAt=clock+tuning.cooldown;
  waves.push({x:point.x,y:point.y,nx,ny,swell:q,reach:90+210*q,width:25+70*q,damage:(3+3*game.state.inks.fire)*(6+9*(q-tuning.minimum)/(1-tuning.minimum)),age:0,life:.65,hits:new Set(),id:++serial});
  game.api.playSound('thermalPop');game.api.floatText(point.x,point.y-24,'BACKDRAFT!','#b54b23');return true;
 }
 function updateBackdraft(dt){
  if(!active())return;if(!enabled()){resetBackdraft();return;}clock+=dt;const seen=new Set();
  for(const w of game.state.walls){if(w.hp<=0||w.shapeTurret)continue;const h=heat(w);if(seen.has(h))continue;seen.add(h);if(clock>=h.readyAt)h.charge=Math.min(1,h.charge+dt*tuning.ambient);}
  for(const f of waves){f.age+=dt;const front=f.reach*Math.min(1,f.age/.35);
   for(const e of [...game.state.enemies]){if(e.hp<=0||f.hits.has(e)||e.immunity==='fire'||game.api.underPaper(e))continue;const dx=e.x-f.x,dy=e.y-f.y,along=dx*f.nx+dy*f.ny,across=Math.abs(dx*f.ny-dy*f.nx),width=f.width*(.35+.65*game.api.clamp(along/f.reach,0,1));
    if(along<-e.r||along>front+e.r||across>width+e.r)continue;f.hits.add(e);game.api.dealDamage(e,f.damage,'fire');if(e.hp<=0)game.api.killEnemy(e);
   }
  }waves=waves.filter(f=>f.age<f.life);
 }
 function pointAlong(w,t){let total=0;for(let i=1;i<w.pts.length;i++)total+=Math.hypot(w.pts[i].x-w.pts[i-1].x,w.pts[i].y-w.pts[i-1].y);let left=total*t;for(let i=1;i<w.pts.length;i++){const a=w.pts[i-1],b=w.pts[i],d=Math.hypot(b.x-a.x,b.y-a.y);if(left<=d)return {x:a.x+(b.x-a.x)*left/(d||1),y:a.y+(b.y-a.y)*left/(d||1)};left-=d;}return w.pts.at(-1);}
 function drawBackdraftWalls(){
  if(!enabled())return;const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();let hinted=false;ctx.save();
  for(const w of game.state.walls){const h=w.backdraft;if(!h||h.charge<.04||w.hp<=0||w.shapeTurret)continue;const q=h.charge,count=Math.min(5,Math.max(1,Math.floor(w.pts.length/3))),pulse=reduced?0:Math.sin(clock*5+h.id)*q*1.5;
   for(let i=0;i<count;i++){const p=pointAlong(w,(i+.5)/count),radius=5+q*14+Math.sin(i*2.3+h.id)*q*2+ pulse;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(i+h.id)*.25);ctx.fillStyle='#c7482540';ctx.beginPath();ctx.ellipse(0,2,radius+5,radius*.7+4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=q>.75?'#ff9e43':'#e57438';ctx.strokeStyle='#703c2b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-radius,2);ctx.bezierCurveTo(-radius*1.15,-radius*.55,-radius*.5,-radius*.9,0,-radius*.65);ctx.bezierCurveTo(radius*.7,-radius,radius*1.15,-radius*.3,radius,3);ctx.quadraticCurveTo(0,radius*.7,-radius,2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffe6a0';ctx.beginPath();ctx.ellipse(-radius*.25,-radius*.32,radius*.27,radius*.13,-.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a34828';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-radius*.65,2);ctx.quadraticCurveTo(-radius*.4,-radius*.4,-radius*.2,1);ctx.moveTo(radius*.45,2);ctx.lineTo(radius*.6,-radius*.25);ctx.stroke();
    if(q>.55){for(let j=0;j<3;j++){const age=reduced?.5:(clock*.7+j*.33+i*.17)%1;ctx.globalAlpha=(1-age)*q;ctx.fillStyle=j%2?'#ffe29a':'#d75a2b';ctx.fillRect(Math.sin(j*3+i)*radius*.7,-radius-age*18,2,3);}}ctx.restore();
    if(q>=tuning.minimum&&!hinted){ctx.font='12px "Stevie Pencil",cursive';ctx.textAlign='center';ctx.fillStyle='#fff4d5';ctx.fillRect(p.x-47,p.y-radius-25,94,18);ctx.fillStyle='#9b4424';ctx.fillText('Erase → Backdraft',p.x,p.y-radius-11);hinted=true;}
   }
  }ctx.restore();
 }
 function drawBackdraftWaves(){
  const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();ctx.save();for(const f of waves){const t=Math.min(1,f.age/.35),fade=Math.min(1,(f.life-f.age)/.22);ctx.save();ctx.translate(f.x,f.y);ctx.rotate(Math.atan2(f.ny,f.nx));ctx.globalAlpha=fade;
   const length=f.reach*t;for(let layer=0;layer<3;layer++){const width=f.width*(.35+.65*t)*(1-layer*.23),tip=Math.max(0,length-(14+f.swell*22)-layer*7);ctx.fillStyle=['#c7432da0','#f18a38dd','#ffe5a0ee'][layer];ctx.strokeStyle=layer?'#9d482855':'#69392b99';ctx.lineWidth=layer?1:2;ctx.beginPath();ctx.moveTo(0,-width*.2);ctx.quadraticCurveTo(length*.48,-width*.18,length*.8,-width*.82);
    for(let i=0;i<=10;i++){const a=-Math.PI/2+i*Math.PI/10,wobble=reduced?0:Math.sin(i*2.3+f.age*12)*5;ctx.lineTo(tip+Math.cos(a)*(14+f.swell*22)+wobble,Math.sin(a)*width);}ctx.quadraticCurveTo(length*.45,width*.16,0,width*.2);ctx.closePath();ctx.fill();ctx.stroke();}
   for(let i=0;i<14;i++){const seed=Math.sin(i*7.1+f.id),x=length*(.15+(i%7)/8),y=seed*f.width*(.15+t*.8);ctx.fillStyle=i%3?'#ffce70':'#844a3999';ctx.beginPath();ctx.ellipse(x,y,3+(i%3),1.5+(i%2),seed,0,Math.PI*2);ctx.fill();}ctx.restore();
  }ctx.restore();
 }
 function moveBackdraft(dx,dy){for(const f of waves){f.x+=dx;f.y+=dy;}}
 const api={resetBackdraft,chargeBackdraft,ventBackdraft,updateBackdraft,drawBackdraftWalls,drawBackdraftWaves,moveBackdraft,backdraftSnapshot:()=>({unlocked:enabled(),walls:game.state.walls.filter(w=>w.backdraft).map(w=>({charge:w.backdraft.charge,readyAt:w.backdraft.readyAt,id:w.backdraft.id})),waves:waves.map(f=>({x:f.x,y:f.y,age:f.age,reach:f.reach,width:f.width,damage:f.damage,hits:f.hits.size}))})};Object.assign(game.api,api);return api;
};
