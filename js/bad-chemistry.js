/* Random poison/Blast fallout: no aiming, recursive explosions or lingering DPS. */
DoodleDefender.systems.badChemistry=function(game){
 const a=game.api,s=game.state;
 let globs=[],splats=[],clock=0,rest=new WeakMap(),serial=0;
 const active=()=>s.running&&!s.paused&&!s.inUpgrade&&!s.betweenWaves&&!s.awaitingSpec&&!document.hidden&&!a.infoOpen()&&!a.firstLessonActive()&&!a.synergyRevealActive()&&!a.waveFinaleActive()&&!a.bossEntranceActive();
 const eligible=e=>e.hp>0&&!a.underPaper(e)&&!e.flight&&!e.hurdle&&!e.catapultHeld&&!a.bossFriendHeld(e)&&!a.heldUnderDesk(e)&&!a.catapulterAway(e)&&!a.gravityCaptured(e)&&!a.abilityImmune(e);
 function chemistryDamage(big,wave=s.wave){return big?24+Math.max(0,wave-1):5+Math.floor(Math.max(0,wave-1)/2);}
 function burstBadChemistry(e){
  if(!s.synergies.has('Bad Chemistry')||!active()||!eligible(e)||e.poison<=0||(rest.get(e)||0)>clock||globs.length>171)return false;
  // Failed rolls also reserve the cooldown: stacked explosions cannot reroll
  // the same monster repeatedly until a reaction becomes certain.
  rest.set(e,clock+2);const roll=Math.random();if(roll>=.23)return false;
  const big=roll<.03,count=6+Math.floor(Math.random()*4),damage=chemistryDamage(big);
  for(let i=0;i<count;i++){
   const angle=Math.random()*Math.PI*2,range=85+Math.random()*175;
   globs.push({source:e,id:++serial,big,damage,age:0,duration:.52+Math.random()*.32,
    from:{x:e.x,y:e.y},to:{x:a.clamp(e.x+Math.cos(angle)*range,10,Math.max(10,s.W-10)),y:a.clamp(e.y+Math.sin(angle)*range,80,Math.max(80,s.H-12))},
    lift:e.r*.7,height:(big?48:34)+Math.random()*40,spin:(Math.random()-.5)*2,r:big?10:5});
  }
  a.floatText(e.x,e.y-e.r-20,big?'BAD BATCH!':'BAD CHEMISTRY! ',big?'#6d7926':'#498334');
  a.playSound('poison');return true;
 }
 function globPoint(g,age=g.age){const t=a.clamp(age/g.duration,0,1);return {x:g.from.x+(g.to.x-g.from.x)*t,y:g.from.y+(g.to.y-g.from.y)*t-Math.sin(t*Math.PI)*g.height-g.lift*(1-t)};}
 function splat(g,p){if(splats.length>=64)splats.shift();splats.push({x:p.x,y:p.y,big:g.big,age:0,life:g.big?1.6:1.15,id:g.id});}
 function updateBadChemistry(dt){
  if(!active())return;clock+=dt;for(const p of splats)p.age+=dt;splats=splats.filter(p=>p.age<p.life);
  const alive=[];
  for(const g of globs){
   const end=Math.min(g.duration,g.age+dt),steps=Math.max(1,Math.ceil((end-g.age)/.025)),start=g.age;let hit=null,impact=null;
   for(let i=0;i<steps&&!hit;i++){
    const p=globPoint(g,start+(end-start)*i/steps),q=globPoint(g,start+(end-start)*(i+1)/steps),dx=q.x-p.x,dy=q.y-p.y,len2=dx*dx+dy*dy;let nearest=Infinity;
    for(const e of s.enemies){if(e===g.source||!eligible(e)||e.immunity==='poison')continue;const y=e.y-e.r*.3,t=len2?a.clamp(((e.x-p.x)*dx+(y-p.y)*dy)/len2,0,1):0;
     if(t<nearest&&a.pointSegDist(e.x,y,p.x,p.y,q.x,q.y)<=e.r+g.r){nearest=t;hit=e;impact={x:p.x+dx*t,y:p.y+dy*t};}
    }
   }
   g.age=end;
   if(hit){a.dealDamage(hit,g.damage,'poison',{badChemistry:true});splat(g,impact);if(hit.hp<=0)a.killEnemy(hit);}
   else if(g.age>=g.duration)splat(g,g.to);
   else alive.push(g);
  }
  globs=alive;
 }
 function resetBadChemistry(){globs=[];splats=[];clock=0;rest=new WeakMap();serial=0;}
 function moveBadChemistry(dx,dy){for(const g of globs)for(const p of [g.from,g.to]){p.x+=dx;p.y+=dy;}for(const p of splats){p.x+=dx;p.y+=dy;}}
 function sprite(row,frame,x,y,size,angle=0,sx=1,sy=1){
  const ctx=game.dom.ctx,img=a.doodleArtwork('bad-chemistry');ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(sx,sy);
  if(img)ctx.drawImage(img,frame*img.width/4,row*img.height/4,img.width/4,img.height/4,-size/2,-size/2,size,size);
  else{ctx.fillStyle=row%2?'#436821':'#86b93f';ctx.strokeStyle='#3b502b';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,size*.28,size*.22,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.restore();
 }
 function drawChemistryGround(){const ctx=game.dom.ctx,reduced=a.enemyMotionReduced();ctx.save();
  for(const p of splats){ctx.globalAlpha=Math.min(1,(p.life-p.age)*2);const t=Math.min(1,p.age/.26);sprite(p.big?3:2,Math.min(3,Math.floor(t*4)),p.x,p.y,p.big?68:42,p.id*.7,1+(1-t)*.2,.78+t*.22);
   if(p.big&&p.age<.55){ctx.strokeStyle='#9daf32';ctx.lineWidth=1.5;for(let i=0;i<3;i++){const angle=i*2.4+p.id,radius=8+22*t;ctx.beginPath();ctx.arc(p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius*.5,2+(reduced?0:Math.sin(t*5+i)),0,Math.PI*2);ctx.stroke();}}
  }
  for(const g of globs){const t=g.age/g.duration,y=g.from.y+(g.to.y-g.from.y)*t,h=Math.sin(t*Math.PI);ctx.globalAlpha=.13;ctx.fillStyle='#3c452c';ctx.beginPath();ctx.ellipse(g.from.x+(g.to.x-g.from.x)*t,y+3,(g.big?13:7)*(1-h*.35),g.big?4:2.5,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();
 }
 function drawChemistryAir(){const ctx=game.dom.ctx,reduced=a.enemyMotionReduced();ctx.save();
  for(const g of globs){const p=globPoint(g),frame=reduced?0:Math.floor(g.age*12+g.id)%4,wobble=reduced?0:Math.sin(g.age*19+g.id)*.12;
   if(!reduced){ctx.strokeStyle=g.big?'#64772b':'#a3bc5b';ctx.lineWidth=g.big?5:2;ctx.lineCap='round';ctx.globalAlpha=.55;ctx.beginPath();const tail=globPoint(g,Math.max(0,g.age-.09));ctx.moveTo(tail.x,tail.y);ctx.quadraticCurveTo((tail.x+p.x)/2+Math.sin(g.age*23)*4,(tail.y+p.y)/2,p.x,p.y);ctx.stroke();ctx.globalAlpha=1;}
   sprite(g.big?1:0,frame,p.x,p.y,g.big?48:30,reduced?0:g.spin*g.age,1+wobble,1-wobble);
   if(g.big){ctx.fillStyle='#d5cf46';for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(p.x-5+i*8,p.y-4+(reduced?0:Math.sin(g.age*16+i)*2),2.4,0,Math.PI*2);ctx.fill();}}
  }ctx.restore();
 }
 function badChemistrySnapshot(){return {clock,globs:globs.map(g=>({id:g.id,big:g.big,damage:g.damage,age:g.age,duration:g.duration,from:{...g.from},to:{...g.to},position:globPoint(g)})),splats:splats.map(p=>({...p}))};}
 Object.assign(a,{burstBadChemistry,chemistryDamage,updateBadChemistry,resetBadChemistry,moveBadChemistry,drawChemistryGround,drawChemistryAir,badChemistrySnapshot});return {};
};
