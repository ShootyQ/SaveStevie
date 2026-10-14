/* Legendary Frost: durability follows real stroke length, not visual thickness. */
DoodleDefender.systems.iceberg=function(game){
 const growth=new WeakMap();
 const icebergMultiplier=()=>game.state.stats.iceberg&&game.state.inks.frost>0?4:1;
 function setIceberg(enabled){
  const previous=game.state.stats.iceberg?4:1,next=enabled?4:1;
  game.state.stats.iceberg=enabled;
  if(previous===next)return;
  for(const w of game.state.walls){w.hp*=next/previous;w.maxHp*=next/previous;growth.delete(w);}
 }
 function updateIceberg(dt){
  if(icebergMultiplier()===1||!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.api.bossEntranceActive()||document.hidden)return;
  for(const w of game.state.walls)growth.set(w,Math.min(1,(growth.get(w)||0)+dt/.7));
 }
 function drawIcebergWalls(){
  if(icebergMultiplier()===1)return;const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  for(const w of game.state.walls){
   if(w.wobbleBumper||w.shapeTurret||w.hp<=0||w.pts.length<2)continue;
   const hp=game.api.clamp(w.hp/w.maxHp,0,1),age=reduced?1:growth.get(w)||0,half=(w.thick/2+8)*(.45+.55*age);
   ctx.globalAlpha=.45+.55*Math.min(1,w.life/w.maxLife);ctx.beginPath();ctx.moveTo(w.pts[0].x,w.pts[0].y);for(const p of w.pts.slice(1))ctx.lineTo(p.x,p.y);
   ctx.strokeStyle='#37627b';ctx.lineWidth=half*2+3;ctx.stroke();ctx.strokeStyle='#a8deea';ctx.lineWidth=half*2;ctx.stroke();ctx.strokeStyle='#e7fbff';ctx.lineWidth=half*.65;ctx.stroke();
   // Sample by length with a bounded number of facets, including sparse strokes.
   let carry=0,count=0;
   for(let i=1;i<w.pts.length&&count<80;i++){
    const a=w.pts[i-1],b=w.pts[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<.001)continue;
    const ux=dx/length,uy=dy/length;
    for(let d=carry;d<length&&count<80;d+=32){
     const x=a.x+ux*d,y=a.y+uy*d,k=count++,side=k%2?1:-1,h=half*(1.1+(k%3)*.22);
     ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(uy,ux));ctx.fillStyle=k%2?'#b8eaf2':'#d5f5fa';ctx.strokeStyle='#527e92';ctx.lineWidth=1.2;
     ctx.beginPath();ctx.moveTo(-9,side*half*.25);ctx.lineTo(-6,side*h);ctx.lineTo(0,side*(h+4*age));ctx.lineTo(9,side*half*.6);ctx.closePath();ctx.fill();ctx.stroke();
     ctx.strokeStyle='#ffffff';ctx.beginPath();ctx.moveTo(-5,side*half*.5);ctx.lineTo(0,side*(h-2));ctx.stroke();
     if(hp<.75){ctx.strokeStyle='#426b86';ctx.lineWidth=1+(1-hp);ctx.beginPath();ctx.moveTo(-5,-half*.65);ctx.lineTo(-1,-2);ctx.lineTo(4,1);ctx.lineTo(hp<.4?0:7,hp<.4?half*.8:half*.35);if(hp<.4){ctx.moveTo(4,1);ctx.lineTo(11,-half*.5);}ctx.stroke();}
     ctx.restore();
    }
    carry=(carry-length)%32;if(carry<0)carry+=32;
   }
  }ctx.restore();
 }
 Object.assign(game.api,{icebergMultiplier,setIceberg,updateIceberg,drawIcebergWalls});return {icebergMultiplier,setIceberg,updateIceberg,drawIcebergWalls};
};
