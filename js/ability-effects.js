/* Bounded, presentation-only ability animations. Geometry never uses combat RNG. */
DoodleDefender.systems.abilityEffects = function createAbilityEffects(game) {
const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let reduced=!!preference?.matches,lightning=[],explosions=[],serial=0,statusClock=0,statuses=[],voids=[],leeches=[],lastLeech=-Infinity,electricUntil=new WeakMap(),accents=[],accentCooldown=new WeakMap();
const limits={casts:8,targets:12,explosions:4,wallPoints:48,fragments:16,statusMonsters:24,voids:8,leeches:6};
preference?.addEventListener?.('change',event=>{reduced=event.matches;resetAbilityEffects()});
function resetAbilityEffects(){lightning=[];explosions=[];statuses=[];voids=[];leeches=[];serial=0;statusClock=0;lastLeech=-Infinity;electricUntil=new WeakMap();accents=[];accentCooldown=new WeakMap()}
function boundedPush(list,item,limit){if(list.length>=limit)list.shift();list.push(item)}
function boltPath(dx,dy,seed,phase){
  const length=Math.hypot(dx,dy),steps=Math.max(4,Math.min(12,Math.ceil(length/16)));
  const nx=length?-dy/length:0,ny=length?dx/length:0,points=new Float32Array((steps+1)*2);
  for(let i=0;i<=steps;i++){
    const t=i/steps,jitter=(i===0||i===steps)?0:Math.sin(i*2.39+seed*1.71+phase*2.2)*Math.min(10,length*.09)*Math.sin(t*Math.PI);
    points[i*2]=dx*t+nx*jitter;points[i*2+1]=dy*t+ny*jitter;
  }
  return points;
}
// Per-monster throttles and a global cap keep contact accents small in crowds.
function animateInkAccent(enemy,kind,dx=0,dy=0,result=''){
  let times=accentCooldown.get(enemy);if(!times){times={};accentCooldown.set(enemy,times)}
  if(statusClock-(times[kind]??-Infinity)<.35)return;
  times[kind]=statusClock;
  const length=Math.hypot(dx,dy)||1;
  boundedPush(accents,{x:enemy.x,y:enemy.y,r:Math.min(30,enemy.r||12),kind,dx:dx/length,dy:dy/length,result,age:0,life:reduced?.3:.6},16);
}
function animateElectricShock(enemy,duration){electricUntil.set(enemy,statusClock+duration)}
function animateChainLightning(source,targets){
  const seed=++serial,arcs=[];let previous=source;
  for(const target of targets.slice(0,limits.targets)){
    const dx=target.x-previous.x,dy=target.y-previous.y;
    arcs.push({x:previous.x-source.x,y:previous.y-source.y,dx,dy,immune:target.immunity==='electric',paths:[0,1,2].map(phase=>boltPath(dx,dy,seed+arcs.length,phase))});previous=target;
  }
  boundedPush(lightning,{x:source.x,y:source.y,immune:source.immunity==='electric',arcs,age:0,life:reduced?.3:.45+arcs.length*.025},limits.casts);
}
function animateWallExplosion(wall,x,y,radius,inferno=false){
  const seed=++serial,points=[],anchors=[],fragments=[],n=wall.pts.length;
  const count=Math.min(limits.wallPoints,n);
  for(let i=0;i<count;i++){const p=wall.pts[Math.round(i*(n-1)/Math.max(1,count-1))];points.push({x:p.x-x,y:p.y-y})}
  // Secondary pulses sit on original vertices, matching the real blast locations.
  for(let i=0;i<Math.min(4,n);i++){
    const p=wall.pts[Math.round(i*(n-1)/Math.max(1,Math.min(4,n)-1))];
    if(!anchors.some(a=>Math.hypot(a.x-(p.x-x),a.y-(p.y-y))<18))anchors.push({x:p.x-x,y:p.y-y});
  }
  if(!reduced&&n>1){
    const lengths=[];let total=0;
    for(let i=1;i<n;i++){const length=Math.hypot(wall.pts[i].x-wall.pts[i-1].x,wall.pts[i].y-wall.pts[i-1].y);lengths.push(length);total+=length}
    const count=Math.min(limits.fragments,Math.max(4,Math.ceil(total/16)));let segment=0,start=0;
    for(let i=0;i<count;i++){
      const distance=i*total/(count-1);
      while(segment<lengths.length-1&&start+lengths[segment]<distance){start+=lengths[segment];segment++}
      const a=wall.pts[segment],b=wall.pts[segment+1],t=lengths[segment]?(distance-start)/lengths[segment]:0,angle=Math.atan2(b.y-a.y,b.x-a.x);
      const side=i%2?-1:1,speed=35+25*(1+Math.sin(i*2.17+seed)),direction=angle+side*Math.PI/2;
      fragments.push({x:a.x+(b.x-a.x)*t-x,y:a.y+(b.y-a.y)*t-y,vx:Math.cos(direction)*speed,vy:Math.sin(direction)*speed-15,angle,spin:side*(1+i%3),length:4+i%5});
    }
  }
  boundedPush(explosions,{x,y,radius,points,anchors,fragments,thick:wall.thick,inferno,age:0,life:reduced?.25:.62},limits.explosions);
}
function animateVoidHit(enemy){
  boundedPush(voids,{x:enemy.x,y:enemy.y,r:Math.min(48,enemy.r+12),age:0,life:reduced?.25:.55},limits.voids);
}
function animateLeech(enemy,healed){
  if(healed<=0||statusClock-lastLeech<.12)return;
  lastLeech=statusClock;
  const player=game.state.player;
  boundedPush(leeches,{x:enemy.x,y:enemy.y,dx:player.x-enemy.x,dy:player.y-enemy.y,age:0,life:reduced?.25:.7},limits.leeches);
}
function updateAbilityEffects(dt){
  statusClock+=dt;statuses=[];
  for(const e of game.state.enemies){
    if(e.hp<=0)continue;
    const fire=e.burn>0&&e.immunity!=='fire',poison=e.poison>0&&e.immunity!=='poison',frost=e.freeze>0,electric=e.stun>0&&(electricUntil.get(e)||0)>statusClock&&e.immunity!=='electric';
    if(fire||poison||frost||electric)statuses.push({enemy:e,fire,poison,frost,electric});
    if(statuses.length===limits.statusMonsters)break;
  }
  for(const effect of accents)effect.age+=dt;accents=accents.filter(e=>e.age<e.life);
  for(const effect of voids)effect.age+=dt;
  for(const effect of leeches)effect.age+=dt;
  voids=voids.filter(e=>e.age<e.life);leeches=leeches.filter(e=>e.age<e.life);
  for(const effect of lightning)effect.age+=dt;
  for(const effect of explosions)effect.age+=dt;
  lightning=lightning.filter(e=>e.age<e.life);explosions=explosions.filter(e=>e.age<e.life);
}
function moveAbilityEffects(dx,dy){for(const effect of [...lightning,...explosions,...voids,...leeches,...accents]){effect.x+=dx;effect.y+=dy}}
function abilityEffectsSnapshot(){
  return {
    accents:accents.map(e=>({...e})),
    statuses:statuses.map(s=>({x:s.enemy.x,y:s.enemy.y,fire:s.fire,poison:s.poison,frost:s.frost,electric:s.electric,clock:statusClock})),
    voids:voids.map(e=>({x:e.x,y:e.y,age:e.age})),
    leeches:leeches.map(e=>({x:e.x,y:e.y,targetX:e.x+e.dx,targetY:e.y+e.dy,age:e.age})),
    lightning:lightning.map(e=>({x:e.x,y:e.y,age:e.age,targets:e.arcs.map(a=>({x:e.x+a.x+a.dx,y:e.y+a.y+a.dy,immune:a.immune})),pathPoints:e.arcs.reduce((n,a)=>n+a.paths[0].length/2,0)})),
    explosions:explosions.map(e=>({x:e.x,y:e.y,age:e.age,radius:e.radius,points:e.points.map(p=>({x:e.x+p.x,y:e.y+p.y})),anchors:e.anchors.map(p=>({x:e.x+p.x,y:e.y+p.y})),fragments:e.fragments.length,inferno:e.inferno}))
  };
}
function traceBolt(ctx,points){ctx.beginPath();ctx.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1])}
function zapSpark(ctx,x,y,strength,immune){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle=immune?'#9b67cb':'#4674e1';ctx.lineWidth=2;
  const radius=reduced?6:5+strength*3;
  ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
  if(!reduced){ctx.strokeStyle='#ffe18c';ctx.lineWidth=1.6;ctx.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/2+.35;ctx.moveTo(Math.cos(a)*(radius+2),Math.sin(a)*(radius+2));ctx.lineTo(Math.cos(a)*(radius+5),Math.sin(a)*(radius+5))}ctx.stroke()}
  ctx.restore();
}
function drawChainLightning(){
  const ctx=game.dom.ctx;
  for(const cast of lightning){
    const progress=cast.age/cast.life,phase=reduced?0:Math.min(2,Math.floor(cast.age/.055));
    const strength=(1-progress)*(reduced?.65:cast.age<.11?1:.7);
    ctx.save();ctx.translate(cast.x,cast.y);ctx.globalAlpha=strength;ctx.lineCap='round';ctx.lineJoin='round';
    for(const [index,arc] of cast.arcs.entries()){
      if(!reduced&&cast.age<index*.025)continue;
      ctx.save();ctx.translate(arc.x,arc.y);
      traceBolt(ctx,arc.paths[phase]);
      ctx.strokeStyle='#233f78';ctx.lineWidth=reduced?3:6;ctx.stroke();
      ctx.strokeStyle='#5fa3ff';ctx.lineWidth=reduced?2:3.6;ctx.stroke();
      if(!reduced){ctx.strokeStyle='#fff4b4';ctx.lineWidth=1.35;ctx.stroke()}
      zapSpark(ctx,arc.dx,arc.dy,strength,arc.immune);ctx.restore();
    }
    zapSpark(ctx,0,0,strength,cast.immune);ctx.restore();
  }
}
function strokeWallEcho(ctx,e,color,width){
  if(!e.points.length)return;
  ctx.beginPath();ctx.moveTo(e.points[0].x,e.points[0].y);for(let i=1;i<e.points.length;i++)ctx.lineTo(e.points[i].x,e.points[i].y);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function scribbleRing(ctx,x,y,radius){
  ctx.beginPath();for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,r=radius*(1+.035*Math.sin(i*2.3));const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py)}ctx.closePath();
}
function drawWallExplosions(){
  const ctx=game.dom.ctx;
  for(const e of explosions){
    const t=e.age/e.life,ink=e.inferno?'#a44326':'#86551d',bright=e.inferno?'#ff8944':'#ffc457';
    ctx.save();ctx.translate(e.x,e.y);ctx.lineCap='round';ctx.lineJoin='round';
    if(reduced){
      ctx.globalAlpha=(1-t)*.55;strokeWallEcho(ctx,e,bright,Math.min(12,e.thick+3));
      ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.stroke();ctx.restore();continue;
    }
    if(e.age<.22){
      ctx.globalAlpha=(1-e.age/.22)*.8;strokeWallEcho(ctx,e,ink,Math.min(20,e.thick+6));strokeWallEcho(ctx,e,bright,Math.min(14,e.thick+2));
    }
    // Thin expanding, uneven pen rings keep the damage field readable.
    const wave=1-Math.pow(1-Math.min(1,e.age/.5),2),radius=5+Math.min(160,e.radius)*wave;
    ctx.globalAlpha=(1-t)*(1-t)*.65;
    for(const anchor of e.anchors){
      scribbleRing(ctx,anchor.x,anchor.y,radius);ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle=bright;ctx.lineWidth=1.5;ctx.stroke();
    }
    if(e.age<.3){
      const pop=1-Math.pow(1-Math.min(1,e.age/.14),3),size=(14+Math.min(28,e.radius*.25))*pop;
      ctx.globalAlpha=(1-e.age/.3)*.9;ctx.beginPath();
      for(let i=0;i<24;i++){const a=i*Math.PI/12,r=size*(i%2?.48:1+.1*Math.sin(i*3.1));const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.closePath();
      ctx.fillStyle='#fff0a7';ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle=bright;ctx.lineWidth=1.5;ctx.stroke();
    }
    ctx.globalAlpha=(1-t)*.85;
    for(const f of e.fragments){
      const x=f.x+f.vx*e.age,y=f.y+f.vy*e.age+50*e.age*e.age,a=f.angle+f.spin*e.age;
      ctx.beginPath();ctx.moveTo(x-Math.cos(a)*f.length/2,y-Math.sin(a)*f.length/2);ctx.lineTo(x+Math.cos(a)*f.length/2,y+Math.sin(a)*f.length/2);
      ctx.strokeStyle='#26333c';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle=bright;ctx.lineWidth=1;ctx.stroke();
    }
    ctx.restore();
  }
}
// Small pen-and-pencil ornaments leave the body and health bar readable.
function drawInkStatusEffects(){
  const ctx=game.dom.ctx;
  const living=new Set(game.state.enemies);
  for(const s of statuses){
    const e=s.enemy;if(e.hp<=0||!living.has(e))continue;
    const r=Math.min(30,e.r*1.15),phase=statusClock*5+e.type.length;
    ctx.save();ctx.translate(e.x,e.y-game.api.enemyFlightHeight(e));ctx.lineWidth=1.5;ctx.lineJoin='round';
    if(s.electric){
      ctx.strokeStyle='#315fd2';ctx.lineWidth=2;
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3+(reduced?0:statusClock*3),d=r+5;
        ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(d,-7);ctx.lineTo(d+5,-2);ctx.lineTo(d-2,1);ctx.lineTo(d+3,7);ctx.stroke();
        ctx.strokeStyle='#f5c84c';ctx.lineWidth=1;ctx.stroke();ctx.restore();
      }
    }
    if(s.fire&&!reduced){
      ctx.fillStyle='#db742b';
      for(let i=0;i<2;i++){const t=(statusClock*.9+i*.5)%1;ctx.globalAlpha=Math.sin(t*Math.PI)*.8;ctx.beginPath();ctx.arc((i?1:-1)*(r+3)+Math.sin(t*6)*3,-t*22,1.5,0,Math.PI*2);ctx.fill()}
      ctx.globalAlpha=1;
    }
    if(s.fire){
      for(const side of [-1,1]){
        const height=reduced?9:10+Math.sin(phase+side)*4,x=side*(r+3),y=r*.4;
        ctx.beginPath();ctx.moveTo(x-4,y);ctx.quadraticCurveTo(x-7,y-7,x+side*2,y-height);
        ctx.quadraticCurveTo(x+1,y-7,x+5,y);ctx.closePath();
        ctx.fillStyle='#f28a38';ctx.fill();ctx.strokeStyle='#8a422b';ctx.stroke();
        ctx.beginPath();ctx.moveTo(x-2,y-1);ctx.lineTo(x,y-height*.55);ctx.lineTo(x+2,y-1);ctx.fillStyle='#ffe293';ctx.fill();
      }
    }
    if(s.poison){
      ctx.strokeStyle='#6b9637';ctx.fillStyle='#b2d568';ctx.lineWidth=1;
      for(const side of [-1,1]){const x=side*(r*.6),y=r+2+(reduced?0:Math.sin(phase+side)*2);ctx.beginPath();ctx.moveTo(x,y-4);ctx.quadraticCurveTo(x-5,y+3,x,y+4);ctx.quadraticCurveTo(x+5,y+3,x,y-4);ctx.fill();ctx.stroke()}
      for(let i=0;i<2;i++){
        const t=reduced?.35:(statusClock*.7+i*.5)%1,x=(i?-1:1)*(r+5)+(!reduced?Math.sin(t*5+i)*3:0),y=r*.3-t*24;
        ctx.globalAlpha=reduced?.7:Math.sin(t*Math.PI)*.8;ctx.fillStyle='#c5e882';ctx.strokeStyle='#528133';
        ctx.beginPath();ctx.arc(x,y,2.5+t*1.5,0,Math.PI*2);ctx.fill();ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
    if(s.frost){
      for(let i=0;i<3;i++){
        const angle=(i/3)*Math.PI*2+.3,x=Math.cos(angle)*(r+4),y=Math.sin(angle)*(r+4);
        const size=reduced?5:5+Math.sin(phase*.6+i)*1.2;
        ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size*.55,y);ctx.lineTo(x,y+size);ctx.lineTo(x-size*.55,y);ctx.closePath();
        ctx.fillStyle='#d6f6ff';ctx.fill();ctx.strokeStyle='#408ea8';ctx.stroke();
        ctx.beginPath();ctx.moveTo(x,y-size+1);ctx.lineTo(x,y+size-1);ctx.strokeStyle='#8bd9eb';ctx.stroke();
      }
    }
    ctx.restore();
  }
}
function drawInkBursts(){
  const ctx=game.dom.ctx;
  for(const e of accents){
    const t=e.age/e.life,p=reduced?0:t;
    ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=(1-t)*.85;ctx.lineWidth=1.8;ctx.lineJoin='round';
    if(e.kind==='repulsion'){
      const angle=Math.atan2(e.dy,e.dx);ctx.rotate(angle);ctx.strokeStyle='#3a887e';
      for(let i=0;i<3;i++){const x=-e.r-7-i*7+p*14,w=7-i;ctx.beginPath();ctx.moveTo(x-w,-w);ctx.lineTo(x,0);ctx.lineTo(x-w,w);ctx.stroke()}
      ctx.strokeStyle='#90cdb4';ctx.beginPath();ctx.moveTo(-e.r-25,-5);ctx.lineTo(-e.r-8+p*10,-5);ctx.moveTo(-e.r-28,5);ctx.lineTo(-e.r-10+p*10,5);ctx.stroke();
    }else if(e.kind==='chaos'){
      const colors=['#cf5277','#d7a832','#599949','#428cca','#8961bb'];
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5+p*1.3,d=e.r+5+p*15,x=Math.cos(a)*d,y=Math.sin(a)*d;ctx.strokeStyle=colors[i];ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x,y-4);ctx.lineTo(x+3,y);ctx.lineTo(x,y+4);ctx.closePath();ctx.stroke()}
      ctx.fillStyle='#694079';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(e.result.toUpperCase(),0,-e.r-12-p*10);
    }else if(e.kind==='death'){
      const y=-e.r-8-p*12;ctx.strokeStyle='#59516a';ctx.fillStyle='#f4ede0';ctx.beginPath();ctx.arc(0,y,6,Math.PI,Math.PI*2);ctx.lineTo(5,y+5);ctx.lineTo(-5,y+5);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#59516a';for(const x of [-2.5,2.5]){ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill()}
      ctx.beginPath();ctx.moveTo(-2,y+3);ctx.lineTo(-2,y+6);ctx.moveTo(2,y+3);ctx.lineTo(2,y+6);ctx.stroke();
    }
    ctx.restore();
  }

  for(const e of voids){
    const t=e.age/e.life,r=e.r*(reduced?.65:1-t*.8);
    ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=(1-t)*.85;ctx.lineWidth=2;ctx.strokeStyle='#704b9b';
    if(reduced){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke()}
    else{
      // Two curled pen strokes collapse into a tiny purple ink dot.
      for(let arm=0;arm<2;arm++){
        ctx.beginPath();for(let i=0;i<=20;i++){const a=i/20*Math.PI*2+t*5+arm*Math.PI,rr=r*(1-i/24),x=Math.cos(a)*rr,y=Math.sin(a)*rr;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.stroke();
      }
      ctx.strokeStyle='#ac89ce';for(let i=0;i<3;i++){const a=i*Math.PI*2/3+t*3,d=e.r*(1-t);ctx.beginPath();ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);ctx.lineTo(Math.cos(a)*(d+4),Math.sin(a)*(d+4));ctx.stroke()}
      ctx.fillStyle='#a88acc';ctx.beginPath();ctx.arc(0,0,Math.max(1,r*.12),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  for(const e of leeches){
    const t=e.age/e.life;
    ctx.save();ctx.strokeStyle='#863650';ctx.fillStyle='#de7286';ctx.lineWidth=1.5;
    if(reduced){
      ctx.globalAlpha=(1-t)*.7;ctx.beginPath();ctx.arc(e.x+e.dx,e.y+e.dy,22,0,Math.PI*2);ctx.stroke();
    }else{
      for(let i=0;i<3;i++){
        const p=Math.max(0,Math.min(1,t*1.5-i*.16)),arc=Math.sin(p*Math.PI)*16;
        const x=e.x+e.dx*p,y=e.y+e.dy*p-arc;
        ctx.globalAlpha=Math.min(1,(1-t)*3)*.8;
        ctx.beginPath();ctx.arc(x,y,3-i*.4,0,Math.PI*2);ctx.fill();ctx.stroke();
      }
      if(t>.55){ctx.globalAlpha=(1-t)*1.4;const x=e.x+e.dx,y=e.y+e.dy-22;ctx.beginPath();ctx.moveTo(x,y+4);ctx.bezierCurveTo(x-10,y-2,x-3,y-9,x,y-4);ctx.bezierCurveTo(x+3,y-9,x+10,y-2,x,y+4);ctx.fill();ctx.stroke()}
    }
    ctx.restore();
  }
}
const api={animateInkAccent,animateElectricShock,animateVoidHit,animateLeech,drawInkStatusEffects,drawInkBursts,animateChainLightning,animateWallExplosion,updateAbilityEffects,resetAbilityEffects,moveAbilityEffects,abilityEffectsSnapshot,drawChainLightning,drawWallExplosions};
Object.assign(game.api,api);return api;
};
