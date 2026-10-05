/* renderer: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.renderer = function createRendererSystem(game) {
// Load once. Missing/late assets retain the existing vector drawings.
const doodles={},tintedDoodles=new Map();
const artworkVersion=document.documentElement?.dataset?.build;
const doodleNames=['stevie','stevie-animations','grunt','sniper','splitter','tank','pencil','fire','frost','poison','arrow','bouncer','flanker','wardling','sprinter','brood','bulwark','medic','sapper','gnawer','boss','eraser','fast','brute','elite','mini','electric','blast','vampire','gravity','repulsion','void','chaos'];
if(typeof Image!=='undefined')for(const name of doodleNames){
  const image=new Image();image.decoding='async';
  image.onload=()=>{doodles[name]=image;inkSprites.clear()};
  image.src='assets/art/'+name+'.png'+(artworkVersion?'?v='+artworkVersion:'');
}
// Presentation only: no combat RNG, attack delays, or collider changes.
const reducedMotion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let idleTime=0,throwTime=Infinity,throwDuration=.38,throwFacing=1;
function resetStevieAnimation(){idleTime=0;throwTime=Infinity;throwFacing=1}
function updateStevieAnimation(dt){idleTime=(idleTime+dt)%2.2;throwTime+=dt}
function startStevieThrow(target){
  throwFacing=target.x<game.state.player.x?-1:1;
  throwDuration=Math.max(.18,Math.min(.38,game.state.stats.rockRate*.7));throwTime=0;
}
function stevieAnimationFrame(){
  if(reducedMotion?.matches)return {column:0,row:0,facing:1};
  if(throwTime<throwDuration){
    const progress=throwTime/throwDuration;
    return {column:progress<.14?0:progress<.42?1:progress<.75?2:3,row:1,facing:throwFacing};
  }
  return {column:idleTime<.85?0:idleTime<1.5?1:idleTime<1.6?2:3,row:0,facing:1};
}
function tintedDoodle(name,colors){
  const image=doodles[name];if(!colors.length)return image;
  const key=name+':'+colors.join(',');
  if(tintedDoodles.has(key))return tintedDoodles.get(key);
  const canvas=typeof OffscreenCanvas==='undefined'?document.createElement('canvas'):new OffscreenCanvas(image.naturalWidth,image.naturalHeight);
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');
  ctx.drawImage(image,0,0);ctx.globalCompositeOperation='color';
  colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*canvas.width/colors.length,0,canvas.width/colors.length,canvas.height)});
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(image,0,0);
  // Only 32 combinations stay resident, regardless of changing monster statuses.
  if(tintedDoodles.size>=32)tintedDoodles.delete(tintedDoodles.keys().next().value);
  tintedDoodles.set(key,canvas);return canvas;
}
function drawDoodleEnemy(e,hpRatio){
  const image=doodles[e.type];if(!image)return false;
  const ctx=game.dom.ctx,colors=enemyStatusColors(e),width=e.r*(e.type==='sniper'?3.4:2.7),height=width*image.naturalHeight/image.naturalWidth;
  const left=-width*(e.type==='sniper'?.4:.5),top=-height*.54;
  ctx.save();if(e.type==='sniper'&&game.state.player.x<e.x)ctx.scale(-1,1);
  // A pale full silhouette remains; healthy colored artwork fills upward.
  // Round to display pixels so tiny fractional HP changes need no clipping.
  const visibleHp=Math.round(hpRatio*height)/height,healthy=tintedDoodle(e.type,colors);
  if(visibleHp<1){
    ctx.globalAlpha=.22;ctx.drawImage(image,left,top,width,height);ctx.globalAlpha=1;
    ctx.save();ctx.beginPath();ctx.rect(left,top+height*(1-visibleHp),width,height*visibleHp);ctx.clip();
    ctx.drawImage(healthy,left,top,width,height);ctx.restore();
  }else ctx.drawImage(healthy,left,top,width,height);
  ctx.restore();
  if(hpRatio<1||colors.length){
    const barWidth=e.r*2.3,barY=-e.r-10;
    ctx.fillStyle='#ddd5c1';ctx.fillRect(-barWidth/2,barY,barWidth,3);
    if(colors.length)colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(-barWidth/2+i*barWidth*hpRatio/colors.length,barY,barWidth*hpRatio/colors.length,3)});
    else{ctx.fillStyle=e.color;ctx.fillRect(-barWidth/2,barY,barWidth*hpRatio,3)}
  }
  return true;
}
function enemyStatusColors(e){
  const colors=[];
  if(e.poison>0)colors.push('#73ba44');
  if(e.burn>0)colors.push('#f28a38');
  if(e.freeze>0)colors.push('#80dcf2');
  if(e.charged>0)colors.push('#7199f5');
  if(e.gravitySlow>0)colors.push('#b493db');
  if(e.stun>0)colors.push('#f1cf64');
  return colors;
}
function drawEnemyFill(e,x,y,width,height){
  const ctx=game.dom.ctx,colors=enemyStatusColors(e);
  ctx.fillStyle=e.color;ctx.fillRect(x,y,width,height);
  colors.forEach((color,i)=>{
    ctx.fillStyle=color;ctx.fillRect(x+i*width/colors.length,y,width/colors.length,height);
  });
}

function resize(){
  const r=game.dom.canvas.getBoundingClientRect();
  game.state.dpr=Math.min(2,window.devicePixelRatio||1);
  game.dom.canvas.width=Math.floor(r.width*game.state.dpr);game.dom.canvas.height=Math.floor(r.height*game.state.dpr);
  const dx=(r.width-game.state.W)/2,dy=(r.height-game.state.H)/2;
  if(dx||dy){
    // Keep combat distances unchanged through browser chrome/fullscreen changes.
    const move=p=>{p.x+=dx;p.y+=dy;if(Number.isFinite(p.originX))p.originX+=dx;if(Number.isFinite(p.originY))p.originY+=dy};
    for(const wall of game.state.walls)wall.pts=wall.pts.map(p=>({x:p.x+dx,y:p.y+dy}));
    if(game.state.currentWall)game.state.currentWall=game.state.currentWall.map(p=>({x:p.x+dx,y:p.y+dy}));
    for(const collection of [game.state.enemies,game.state.projectiles,game.state.enemyShots,game.state.particles,game.state.floaters])for(const item of collection)move(item);
  }
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
// Glyphs are reused across walls; only animated phases need separate sprites.
// Browsers without OffscreenCanvas retain the vector rendering path.
const inkSprites=new Map();
let spriteDpr=0;
function paintInk(ctx,kind,pulse,time,i){
      const image=doodles[kind];
      if(image){
        const width=['fire','electric','void'].includes(kind)?14+pulse:14,height=width*image.naturalHeight/image.naturalWidth;
        // Wall-local positive Y points outward, so flames rise away from the ink.
        ctx.save();ctx.translate(0,7);ctx.rotate(Math.PI);
        if(kind==='gravity')ctx.rotate(time*.3);
        if(kind==='chaos')ctx.rotate((time*40+i*37)*Math.PI/180);
        ctx.drawImage(image,-width/2,-height/2,width,height);ctx.restore();return;
      }
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
}
function inkSprite(kind,pulse,time,i){
  if(typeof OffscreenCanvas==='undefined')return null;
  const dpr=game.state.dpr;
  if(spriteDpr!==dpr){inkSprites.clear();spriteDpr=dpr}
  let phase=0;
  if(kind==='fire'||kind==='electric'||kind==='void'){
    phase=Math.round((pulse+1)*8);pulse=phase/8-1;
  }else if(kind==='gravity'){
    phase=Math.round(((time*.3)%(Math.PI*2))/(Math.PI*2)*64)%64;
    time=phase/64*Math.PI*2/.3;
  }else if(kind==='chaos'){
    phase=Math.round(((time*40+i*37)%360)/7.5)%48;time=phase*7.5/40;i=0;
  }
  const key=kind+':'+phase;
  if(inkSprites.has(key))return inkSprites.get(key);
  const canvas=new OffscreenCanvas(40*dpr,40*dpr),ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,20*dpr,10*dpr);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=1.6;
  paintInk(ctx,kind,pulse,time,i);inkSprites.set(key,canvas);return canvas;
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
      const sprite=inkSprite(kind,pulse,time,i);
      if(sprite)ctx.drawImage(sprite,-20,-10,40,40);
      else paintInk(ctx,kind,pulse,time,i);
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

  // Ranged threats are readable before and after firing.
  for(const e of game.state.enemies){
    if(e.type!=='sniper'||e.hp<=0||e.stun>0||e.freeze>0||e.shootCd>.6||
      game.api.dist(e.x,e.y,game.state.player.x,game.state.player.y)>=190||
      game.api.shotBlocked(e.x,e.y,game.state.player.x,game.state.player.y))continue;
    const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle='#3562be';ctx.lineWidth=2;ctx.globalAlpha=.65;
    ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(game.state.player.x,game.state.player.y);ctx.stroke();
    ctx.setLineDash([]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  for(const shot of game.state.enemyShots){
    const ctx=game.dom.ctx;ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(Math.atan2(shot.vy,shot.vx));
    const image=doodles.arrow;
    // The front tip stays on the projectile collision point; the visible shaft
    // trails behind it, so the arrow cannot disappear before its tip arrives.
    if(image){const width=30,height=width*image.naturalHeight/image.naturalWidth;ctx.drawImage(image,-width,-height/2,width,height)}
    else{
      ctx.strokeStyle='#fff8e9';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-27,0);ctx.lineTo(-5,0);ctx.stroke();
      ctx.strokeStyle='#24323a';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#d95050';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-10,-5);ctx.lineTo(-10,5);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='#3562be';ctx.beginPath();ctx.moveTo(-25,-5);ctx.lineTo(-20,0);ctx.lineTo(-25,5);ctx.stroke();
    }
    ctx.restore();
  }

  // Stevie
  game.dom.ctx.translate(game.state.player.x,game.state.player.y);
  if(doodles['stevie-animations']){
    const pose=stevieAnimationFrame();
    game.dom.ctx.scale(pose.facing,1);
    // Fixed cells and planted feet prevent trimmed-frame size/position jumps.
    game.dom.ctx.drawImage(doodles['stevie-animations'],pose.column*128,pose.row*136,128,136,-34,-39.25,68,72.25);
  }else if(doodles.stevie){
    const image=doodles.stevie,height=64,width=height*image.naturalWidth/image.naturalHeight;
    game.dom.ctx.drawImage(image,-width/2,-31,width,height);
  }else{
    game.dom.ctx.fillStyle='#f3d7b5';game.dom.ctx.strokeStyle='#24323a';game.dom.ctx.lineWidth=3;
    game.dom.ctx.beginPath();game.dom.ctx.arc(0,-7,13,0,Math.PI*2);game.dom.ctx.fill();game.dom.ctx.stroke();
    game.dom.ctx.fillStyle='#3f75b7';game.dom.ctx.fillRect(-12,7,24,27);
    game.dom.ctx.fillStyle='#25313a';game.dom.ctx.beginPath();game.dom.ctx.arc(-4,-9,1.8,0,Math.PI*2);game.dom.ctx.arc(4,-9,1.8,0,Math.PI*2);game.dom.ctx.fill();
    game.dom.ctx.strokeStyle='#25313a';game.dom.ctx.lineWidth=2;game.dom.ctx.beginPath();game.dom.ctx.arc(0,-4,5,.25,Math.PI-.25);game.dom.ctx.stroke();
  }
  game.dom.ctx.restore();

  for(const e of game.state.enemies){
    const hpRatio=game.api.clamp(e.hp/e.maxHp,0,1);
    game.dom.ctx.save();game.dom.ctx.translate(e.x,e.y);

    if(e.type==='eraser'){
      game.dom.ctx.rotate(Math.sin(performance.now()/350)*.08);
      if(!drawDoodleEnemy(e,hpRatio)){
        game.dom.ctx.strokeStyle='#81344d';game.dom.ctx.lineWidth=3;

        // Empty paper-colored body first, then fill upward according to remaining HP.
        game.dom.ctx.fillStyle='#f7e7e9';game.dom.ctx.fillRect(-32,-20,64,40);
        game.dom.ctx.save();
        game.dom.ctx.beginPath();game.dom.ctx.rect(-32,20-40*hpRatio,64,40*hpRatio);game.dom.ctx.clip();
        drawEnemyFill(e,-32,20-40*hpRatio,64,40*hpRatio);
        game.dom.ctx.restore();
        game.dom.ctx.strokeRect(-32,-20,64,40);

        game.dom.ctx.fillStyle='#fff';game.dom.ctx.fillRect(-12,-5,7,7);game.dom.ctx.fillRect(5,-5,7,7);
        game.dom.ctx.fillStyle='#3b2630';game.dom.ctx.fillRect(-4,9,8,3);
      }
    }else{
      if(!drawDoodleEnemy(e,hpRatio)){
        game.dom.ctx.strokeStyle='#2a3135';game.dom.ctx.lineWidth=2.5;

        // Enemy body is now the health meter: its color drains from top to bottom.
        game.dom.ctx.fillStyle='rgba(255,255,255,.42)';
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.fill();

        game.dom.ctx.save();
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.clip();
        drawEnemyFill(e,-e.r,e.r-(2*e.r*hpRatio),e.r*2,2*e.r*hpRatio);
        game.dom.ctx.restore();

        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.stroke();

        game.dom.ctx.fillStyle='#fff';
        game.dom.ctx.beginPath();game.dom.ctx.arc(-e.r*.25,-2,2,0,Math.PI*2);game.dom.ctx.arc(e.r*.25,-2,2,0,Math.PI*2);game.dom.ctx.fill();
        game.dom.ctx.strokeStyle='#222';game.dom.ctx.beginPath();game.dom.ctx.moveTo(-4,5);game.dom.ctx.lineTo(4,5);game.dom.ctx.stroke();
      }
      if(e.type==='boss'&&!doodles.boss){game.dom.ctx.fillStyle='#d8a72e';game.dom.ctx.fillRect(-11,-e.r-8,22,5)}
      if(e.type==='bouncer'){
        game.dom.ctx.strokeStyle='#e8fffb';game.dom.ctx.lineWidth=2;
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r+4,0,Math.PI*1.2);game.dom.ctx.stroke()
      }
      const symbols={wardling:'◇',sprinter:'»',brood:'✣',bulwark:'▣',medic:'+',sapper:'×'};
      if(symbols[e.type]&&!doodles[e.type]){
        game.dom.ctx.fillStyle='#fffdf2';game.dom.ctx.font='bold 15px system-ui';game.dom.ctx.textAlign='center';
        game.dom.ctx.fillText(symbols[e.type],0,4);
      }
      if(e.immunity){
        const labels={fire:'FIRE',poison:'VENOM',electric:'ZAP',blast:'BLAST',frost:'FROST'};
        const colors={fire:'#c44c17',poison:'#427b24',electric:'#315fd2',blast:'#a46a12',frost:'#167f99'};
        game.dom.ctx.strokeStyle=colors[e.immunity];game.dom.ctx.lineWidth=3;
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r+4,0,Math.PI*2);game.dom.ctx.stroke();
        game.dom.ctx.font='bold 9px system-ui';game.dom.ctx.fillStyle=colors[e.immunity];
        game.dom.ctx.strokeStyle='#fff8e9';game.dom.ctx.lineWidth=3;game.dom.ctx.strokeText(labels[e.immunity],0,-e.r-8);game.dom.ctx.fillText(labels[e.immunity],0,-e.r-8);
      }
      if(e.type==='sprinter'&&e.dashTime>2.1){
        game.dom.ctx.strokeStyle=e.dashTime>=2.6?'#d95050':'#e39d2d';game.dom.ctx.lineWidth=2;
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r+5,0,Math.PI*2);game.dom.ctx.stroke();
      }
      if(e.type==='medic'){
        game.dom.ctx.strokeStyle='rgba(74,155,102,.25)';game.dom.ctx.lineWidth=1;
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,25+e.healPulse*20,0,Math.PI*2);game.dom.ctx.stroke();
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
    if(f.hitMarker){
      const ctx=game.dom.ctx;ctx.save();ctx.globalAlpha=Math.min(1,f.t*2);ctx.strokeStyle='#d95050';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r+7,0,Math.PI*2);ctx.stroke();
      const image=doodles[f.type];
      if(image&&f.type!=='arrow'){const width=f.r*2.7,height=width*image.naturalHeight/image.naturalWidth;ctx.globalAlpha*=.4;ctx.drawImage(image,f.x-width/2,f.y-height/2,width,height)}
      ctx.restore();continue;
    }
    if(f.damageNumber)continue;
    game.dom.ctx.globalAlpha=game.api.clamp(f.t*2,0,1);game.dom.ctx.fillStyle=f.color;game.dom.ctx.font='bold 13px system-ui';
    game.dom.ctx.textAlign='center';game.dom.ctx.fillText(f.text,f.x,f.y);game.dom.ctx.globalAlpha=1
  }
  game.api.drawDamageNumbers();
  if(game.state.paused){
    game.dom.ctx.fillStyle='rgba(20,25,28,.38)';game.dom.ctx.fillRect(0,0,game.state.W,game.state.H);
    game.dom.ctx.fillStyle='#fff';game.dom.ctx.textAlign='center';game.dom.ctx.font='900 38px system-ui';game.dom.ctx.fillText('PAUSED',game.state.W/2,game.state.H/2)
  }
}
const api = { artworkReady:()=>doodleNames.every(name=>!!doodles[name]), resetStevieAnimation, updateStevieAnimation, startStevieThrow, stevieAnimationFrame, enemyStatusColors, resize, draw };
Object.assign(game.api, api);
return api;
};
