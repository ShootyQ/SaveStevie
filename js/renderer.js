/* renderer: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.renderer = function createRendererSystem(game) {
function resize(){
  const r=game.dom.canvas.getBoundingClientRect();
  game.state.dpr=Math.min(2,window.devicePixelRatio||1);
  game.dom.canvas.width=Math.floor(r.width*game.state.dpr);game.dom.canvas.height=Math.floor(r.height*game.state.dpr);
  game.state.W=r.width;game.state.H=r.height;game.dom.ctx.setTransform(game.state.dpr,0,0,game.state.dpr,0,0);
  game.state.player.x=game.state.W/2;game.state.player.y=game.state.H/2;
}


/* Sample by stroke distance, not pointer-event count. Cache outside game state:
   rendering never spends ink, changes collisions, or consumes combat randomness. */
const wallSamples = new WeakMap();
function textureSamples(points){
  if(wallSamples.has(points))return wallSamples.get(points);
  let length=0;
  const segments=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y);
    if(len>0){segments.push({a,b,len,start:length});length+=len;}
  }
  const samples=[],spacing=Math.min(length,Math.max(32,length/96));
  let segment=0;
  for(let d=spacing/2;d<length;d+=spacing){
    while(segment<segments.length-1&&d>segments[segment].start+segments[segment].len)segment++;
    const s=segments[segment],t=(d-s.start)/s.len;
    samples.push({x:s.a.x+(s.b.x-s.a.x)*t,y:s.a.y+(s.b.y-s.a.y)*t,angle:Math.atan2(s.b.y-s.a.y,s.b.x-s.a.x)});
  }
  wallSamples.set(points,samples);
  return samples;
}
function drawWallTextures(points,thick,opacity){
  const inks=game.state.inks,active=Object.keys(inks).filter(k=>inks[k]>0);
  if(!active.length)return;
  const ctx=game.dom.ctx,time=(game.state.waveTime-game.state.timeLeft)*3;
  const samples=textureSamples(points);
  ctx.save();ctx.globalAlpha=opacity;ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=0;i<samples.length;i++){
    const p=samples[i];
    for(let k=0;k<active.length;k++){
      const kind=active[k],level=Math.min(3,inks[kind]);
      // Stagger each element along the stroke, then alternate its side.
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
      ctx.translate((k-(active.length-1)/2)*Math.min(5,24/active.length),(k+i)%2?thick/2+3:-thick/2-3);
      if((k+i)%2===0)ctx.rotate(Math.PI);
      ctx.lineWidth=1.6;
      const pulse=Math.sin(time+i*1.7+k),size=1+level*.1;
      ctx.scale(size,size);
      if(kind==='poison'){
        ctx.strokeStyle='#39742e';ctx.fillStyle='#9bd34a';
        ctx.beginPath();ctx.arc(0,4,3.2,0,Math.PI*2);ctx.fill();ctx.stroke();
        for(let arm=0;arm<5;arm++){
          const a=arm*Math.PI*2/5,x=Math.cos(a),y=Math.sin(a);
          ctx.beginPath();ctx.moveTo(x*3,4+y*3);ctx.lineTo(x*6,4+y*6);ctx.stroke();
          ctx.beginPath();ctx.arc(x*6,4+y*6,1.1,0,Math.PI*2);ctx.fill();
        }
      }else if(kind==='fire'){
        const tip=12+pulse*3;
        ctx.fillStyle='#ed642b';ctx.strokeStyle='#b64225';
        ctx.beginPath();ctx.moveTo(-4,1);ctx.bezierCurveTo(-7,7,-1,8,-2,tip);
        ctx.bezierCurveTo(5,9,7,4,4,1);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle='#ffe27c';ctx.beginPath();ctx.moveTo(-2,2);ctx.quadraticCurveTo(0,6,1,tip*.65);ctx.quadraticCurveTo(4,4,2,2);ctx.fill();
      }else if(kind==='frost'){
        ctx.strokeStyle='#55a7c0';ctx.fillStyle='#d9f9ff';
        ctx.beginPath();ctx.moveTo(-4,1);ctx.lineTo(-2,10);ctx.lineTo(1,6);ctx.lineTo(4,12);ctx.lineTo(5,1);ctx.closePath();ctx.fill();ctx.stroke();
      }else if(kind==='electric'){
        ctx.strokeStyle='#4e74dc';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(-6,2);ctx.lineTo(-1,6+pulse);ctx.lineTo(-3,11);ctx.lineTo(5,7);ctx.lineTo(2,3);ctx.lineTo(7,1);ctx.stroke();
      }else if(kind==='blast'){
        ctx.strokeStyle='#ad7320';ctx.fillStyle='#ffd36c';
        ctx.beginPath();
        for(let n=0;n<12;n++){const a=n*Math.PI/6,r=n%2?2.5:6;ctx.lineTo(Math.cos(a)*r,5+Math.sin(a)*r);}
        ctx.closePath();ctx.fill();ctx.stroke();
      }else if(kind==='vampire'){
        ctx.fillStyle='#b52f57';ctx.strokeStyle='#752744';
        ctx.beginPath();ctx.moveTo(0,1);ctx.bezierCurveTo(-8,9,-2,12,0,11);ctx.bezierCurveTo(7,10,4,6,0,1);ctx.fill();ctx.stroke();
      }else if(kind==='gravity'){
        ctx.strokeStyle='#9270bd';
        ctx.beginPath();for(let n=0;n<24;n++){const a=n*.45+time*.3,r=n*.23;ctx.lineTo(Math.cos(a)*r,6+Math.sin(a)*r);}ctx.stroke();
      }else if(kind==='repulsion'){
        ctx.strokeStyle='#268f87';ctx.lineWidth=2;
        for(let n=0;n<2;n++){ctx.beginPath();ctx.moveTo(-4,2+n*5);ctx.lineTo(0,5+n*5);ctx.lineTo(4,2+n*5);ctx.stroke();}
      }else if(kind==='void'){
        ctx.fillStyle='#30223e';ctx.strokeStyle='#b693d6';
        ctx.beginPath();ctx.ellipse(0,5,4,6+pulse,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      }else if(kind==='chaos'){
        ctx.strokeStyle='hsl('+((time*40+i*37)%360)+',65%,45%)';
        ctx.beginPath();ctx.moveTo(-5,1);ctx.lineTo(3,5);ctx.lineTo(-2,10);ctx.lineTo(5,8);ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

function draw(){
  game.dom.ctx.clearRect(0,0,game.state.W,game.state.H);game.dom.ctx.save();
  game.dom.ctx.strokeStyle='rgba(212,76,76,.35)';game.dom.ctx.lineWidth=2;
  game.dom.ctx.beginPath();game.dom.ctx.moveTo(47,0);game.dom.ctx.lineTo(47,game.state.H);game.dom.ctx.stroke();

  for(const w of game.state.walls){
    const hpRatio=game.api.clamp(w.hp/w.maxHp,0,1);
    const lifeRatio=game.api.clamp(w.life/w.maxLife,0,1);
    const visualRatio=Math.min(hpRatio,lifeRatio);
    let col=`rgba(31,42,51,${.08+.92*visualRatio})`;
    if(game.state.inks.chaos>0)col=`hsla(${(performance.now()/30+w.hp)%360},55%,30%,${.12+.88*visualRatio})`;
    game.dom.ctx.lineCap='round';game.dom.ctx.lineJoin='round';game.dom.ctx.lineWidth=w.thick;game.dom.ctx.strokeStyle=col;
    game.dom.ctx.beginPath();game.dom.ctx.moveTo(w.pts[0].x,w.pts[0].y);
    for(let i=1;i<w.pts.length;i++)game.dom.ctx.lineTo(w.pts[i].x,w.pts[i].y);
    game.dom.ctx.stroke();

    drawWallTextures(w.pts,w.thick,.08+.92*visualRatio);

    if(w.closed&&game.state.synergies.has('THE BLACK HOLE')){
      let cx=0,cy=0;for(const p of w.pts){cx+=p.x;cy+=p.y}cx/=w.pts.length;cy/=w.pts.length;
      game.dom.ctx.save();game.dom.ctx.globalAlpha=.16;game.dom.ctx.fillStyle='#493468';game.dom.ctx.beginPath();game.dom.ctx.arc(cx,cy,34+Math.sin(performance.now()/220)*5,0,Math.PI*2);game.dom.ctx.fill();game.dom.ctx.restore()
    }
    if(w.closed&&game.state.synergies.has('TESLA CAGE')&&w.intersections>0){
      game.dom.ctx.save();game.dom.ctx.globalAlpha=.18;game.dom.ctx.strokeStyle='#6f98ff';game.dom.ctx.lineWidth=3;
      game.dom.ctx.beginPath();game.dom.ctx.arc(w.pts[0].x,w.pts[0].y,16+Math.sin(performance.now()/180)*4,0,Math.PI*2);game.dom.ctx.stroke();game.dom.ctx.restore()
    }
  }
  if(game.state.currentWall&&game.state.currentWall.length>1){
    game.dom.ctx.lineWidth=game.state.stats.lineWidth;game.dom.ctx.strokeStyle='rgba(31,42,51,.72)';game.dom.ctx.lineCap='round';game.dom.ctx.lineJoin='round';
    game.dom.ctx.beginPath();game.dom.ctx.moveTo(game.state.currentWall[0].x,game.state.currentWall[0].y);game.state.currentWall.slice(1).forEach(p=>game.dom.ctx.lineTo(p.x,p.y));game.dom.ctx.stroke();
    // The preview array grows in place, so refresh its cached geometry.
    wallSamples.delete(game.state.currentWall);
    drawWallTextures(game.state.currentWall,game.state.stats.lineWidth,.72)
  }

  // Steve
  game.dom.ctx.translate(game.state.player.x,game.state.player.y);
  game.dom.ctx.fillStyle='#f3d7b5';game.dom.ctx.strokeStyle='#24323a';game.dom.ctx.lineWidth=3;
  game.dom.ctx.beginPath();game.dom.ctx.arc(0,-7,13,0,Math.PI*2);game.dom.ctx.fill();game.dom.ctx.stroke();
  game.dom.ctx.fillStyle='#3f75b7';game.dom.ctx.fillRect(-12,7,24,27);
  game.dom.ctx.fillStyle='#25313a';game.dom.ctx.beginPath();game.dom.ctx.arc(-4,-9,1.8,0,Math.PI*2);game.dom.ctx.arc(4,-9,1.8,0,Math.PI*2);game.dom.ctx.fill();
  game.dom.ctx.strokeStyle='#25313a';game.dom.ctx.lineWidth=2;game.dom.ctx.beginPath();game.dom.ctx.arc(0,-4,5,.25,Math.PI-.25);game.dom.ctx.stroke();
  game.dom.ctx.restore();

  for(const e of game.state.enemies){
    const hpRatio=game.api.clamp(e.hp/e.maxHp,0,1);
    game.dom.ctx.save();game.dom.ctx.translate(e.x,e.y);

    if(e.type==='eraser'){
      game.dom.ctx.rotate(Math.sin(performance.now()/350)*.08);
      game.dom.ctx.strokeStyle='#81344d';game.dom.ctx.lineWidth=3;

      // Empty paper-colored body first, then fill upward according to remaining HP.
      game.dom.ctx.fillStyle='#f7e7e9';game.dom.ctx.fillRect(-32,-20,64,40);
      game.dom.ctx.save();
      game.dom.ctx.beginPath();game.dom.ctx.rect(-32,20-40*hpRatio,64,40*hpRatio);game.dom.ctx.clip();
      game.dom.ctx.fillStyle='#ef8ba6';game.dom.ctx.fillRect(-32,-20,64,40);
      game.dom.ctx.restore();
      game.dom.ctx.strokeRect(-32,-20,64,40);

      game.dom.ctx.fillStyle='#fff';game.dom.ctx.fillRect(-12,-5,7,7);game.dom.ctx.fillRect(5,-5,7,7);
      game.dom.ctx.fillStyle='#3b2630';game.dom.ctx.fillRect(-4,9,8,3);
    }else{
      game.dom.ctx.strokeStyle='#2a3135';game.dom.ctx.lineWidth=2.5;

      // Enemy body is now the health meter: its color drains from top to bottom.
      game.dom.ctx.fillStyle='rgba(255,255,255,.42)';
      game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.fill();

      game.dom.ctx.save();
      game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.clip();
      game.dom.ctx.fillStyle=e.color;
      game.dom.ctx.fillRect(-e.r,e.r-(2*e.r*hpRatio),e.r*2,2*e.r*hpRatio);
      game.dom.ctx.restore();

      game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.stroke();

      game.dom.ctx.fillStyle='#fff';
      game.dom.ctx.beginPath();game.dom.ctx.arc(-e.r*.25,-2,2,0,Math.PI*2);game.dom.ctx.arc(e.r*.25,-2,2,0,Math.PI*2);game.dom.ctx.fill();
      game.dom.ctx.strokeStyle='#222';game.dom.ctx.beginPath();game.dom.ctx.moveTo(-4,5);game.dom.ctx.lineTo(4,5);game.dom.ctx.stroke();
      if(e.type==='boss'){game.dom.ctx.fillStyle='#d8a72e';game.dom.ctx.fillRect(-11,-e.r-8,22,5)}
      if(e.type==='bouncer'){
        game.dom.ctx.strokeStyle='#e8fffb';game.dom.ctx.lineWidth=2;
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r+4,0,Math.PI*1.2);game.dom.ctx.stroke()
      }
      if(e.type==='flanker'){
        game.dom.ctx.strokeStyle='#dbe5ff';game.dom.ctx.lineWidth=2;
        game.dom.ctx.beginPath();game.dom.ctx.moveTo(-e.r-4,0);game.dom.ctx.lineTo(-e.r-9,-5);game.dom.ctx.moveTo(-e.r-4,0);game.dom.ctx.lineTo(-e.r-9,5);game.dom.ctx.stroke()
      }
    }
    game.dom.ctx.restore();
  }

  for(const p of game.state.projectiles){
    game.dom.ctx.fillStyle='#5f5a53';game.dom.ctx.beginPath();game.dom.ctx.arc(p.x,p.y,4,0,Math.PI*2);game.dom.ctx.fill()
  }
  for(const p of game.state.particles){
    game.dom.ctx.globalAlpha=game.api.clamp(p.life*1.8,0,1);game.dom.ctx.fillStyle=p.color;game.dom.ctx.fillRect(p.x,p.y,3,3);game.dom.ctx.globalAlpha=1
  }
  for(const f of game.state.floaters){
    game.dom.ctx.globalAlpha=game.api.clamp(f.t*2,0,1);game.dom.ctx.fillStyle=f.color;game.dom.ctx.font=f.damageNumber?'bold 16px system-ui':'bold 13px system-ui';
    game.dom.ctx.textAlign='center';
    if(f.damageNumber){game.dom.ctx.save();game.dom.ctx.strokeStyle='#fff8e9';game.dom.ctx.lineWidth=3;game.dom.ctx.strokeText(f.text,f.x,f.y);game.dom.ctx.restore()}
    game.dom.ctx.fillText(f.text,f.x,f.y);game.dom.ctx.globalAlpha=1
  }
  if(game.state.paused){
    game.dom.ctx.fillStyle='rgba(20,25,28,.38)';game.dom.ctx.fillRect(0,0,game.state.W,game.state.H);
    game.dom.ctx.fillStyle='#fff';game.dom.ctx.textAlign='center';game.dom.ctx.font='900 38px system-ui';game.dom.ctx.fillText('PAUSED',game.state.W/2,game.state.H/2)
  }
}
const api = { resize, draw };
Object.assign(game.api, api);
return api;
};
