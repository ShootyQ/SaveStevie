/* Bounded, presentation-only ability animations. Geometry never uses combat RNG. */
DoodleDefender.systems.abilityEffects = function createAbilityEffects(game) {
const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let reduced=!!preference?.matches,lightning=[],explosions=[],serial=0;
const limits={casts:8,targets:6,explosions:4,wallPoints:48,fragments:16};
preference?.addEventListener?.('change',event=>{reduced=event.matches;resetAbilityEffects()});
function resetAbilityEffects(){lightning=[];explosions=[];serial=0}
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
function animateChainLightning(source,targets){
  const seed=++serial,arcs=[];
  for(const target of targets.slice(0,limits.targets)){
    const dx=target.x-source.x,dy=target.y-source.y;
    arcs.push({dx,dy,immune:target.immunity==='electric',paths:[0,1,2].map(phase=>boltPath(dx,dy,seed+arcs.length,phase))});
  }
  boundedPush(lightning,{x:source.x,y:source.y,immune:source.immunity==='electric',arcs,age:0,life:reduced?.24:.34},limits.casts);
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
function updateAbilityEffects(dt){
  for(const effect of lightning)effect.age+=dt;
  for(const effect of explosions)effect.age+=dt;
  lightning=lightning.filter(e=>e.age<e.life);explosions=explosions.filter(e=>e.age<e.life);
}
function moveAbilityEffects(dx,dy){for(const effect of [...lightning,...explosions]){effect.x+=dx;effect.y+=dy}}
function abilityEffectsSnapshot(){
  return {
    lightning:lightning.map(e=>({x:e.x,y:e.y,age:e.age,targets:e.arcs.map(a=>({x:e.x+a.dx,y:e.y+a.dy,immune:a.immune})),pathPoints:e.arcs.reduce((n,a)=>n+a.paths[0].length/2,0)})),
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
    for(const arc of cast.arcs){
      traceBolt(ctx,arc.paths[phase]);
      ctx.strokeStyle='#233f78';ctx.lineWidth=reduced?3:6;ctx.stroke();
      ctx.strokeStyle='#5fa3ff';ctx.lineWidth=reduced?2:3.6;ctx.stroke();
      if(!reduced){ctx.strokeStyle='#fff4b4';ctx.lineWidth=1.35;ctx.stroke()}
      zapSpark(ctx,arc.dx,arc.dy,strength,arc.immune);
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
const api={animateChainLightning,animateWallExplosion,updateAbilityEffects,resetAbilityEffects,moveAbilityEffects,abilityEffectsSnapshot,drawChainLightning,drawWallExplosions};
Object.assign(game.api,api);return api;
};
