/* renderer: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.renderer = function createRendererSystem(game) {
// Load once. Missing/late assets retain the existing vector drawings.
const doodles={},tintedDoodles=new Map();
// Fit a busy wave's working set without rebuilding every colored enemy each frame.
const tintLimits={entries:192,bytes:16*1024*1024};
let tintedBytes=0,tintHits=0,tintMisses=0,tintEvictions=0;
function rendererCacheStats(){return {tintEntries:tintedDoodles.size,tintBytes:tintedBytes,tintHits,tintMisses,tintEvictions,tintLimits:{...tintLimits}}}
const artworkVersion=document.documentElement?.dataset?.build;
const doodleNames=['stevie','stevie-animations','grunt','sniper','splitter','tank','pencil','fire','frost','poison','arrow','bouncer','flanker','wardling','sprinter','brood','bulwark','medic','sapper','gnawer','boss','eraser','fast','brute','elite','mini','electric','blast','vampire','gravity','repulsion','void','chaos','sniper-ready','sniper-fire','sapper-ready','sapper-strike','medic-ready','medic-heal','stevie-flinch','stevie-cheer-a','stevie-cheer-b'];
if(typeof Image!=='undefined')for(const name of doodleNames){
  const image=new Image();image.decoding='async';
  image.onload=()=>{doodles[name]=image;inkSprites.clear()};
  image.src='assets/art/'+name+'.png'+(artworkVersion?'?v='+artworkVersion:'');
}
// Presentation only: no combat RNG, attack delays, or collider changes.
const reducedMotion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let motionReduced=!!reducedMotion?.matches;
reducedMotion?.addEventListener?.('change',event=>{motionReduced=event.matches;resetEnemyAnimations()});
let idleTime=0,throwTime=Infinity,throwDuration=.38,throwFacing=1,flinchAge=1,cheerAge=Infinity;
const wavePortrait=document.getElementById('waveStevie'),waveCtx=wavePortrait?.getContext('2d');
function resetStevieAnimation(){idleTime=0;throwTime=Infinity;throwFacing=1;flinchAge=1;cheerAge=Infinity}
function updateStevieAnimation(dt){idleTime=(idleTime+dt)%2.2;throwTime+=dt;flinchAge+=dt}
function reactStevieHit(){if(!motionReduced)flinchAge=0}
function celebrateStevie(){cheerAge=0;throwTime=Infinity;flinchAge=1}
function updateStevieCelebration(dt){cheerAge=Math.min(1.2,cheerAge+dt)}
function stevieReactionPose(){
  if(motionReduced)return {sprite:null,y:0,angle:0};
  if(flinchAge<.22)return {sprite:'stevie-flinch',y:0,angle:-.08*Math.sin(flinchAge/.22*Math.PI)};
  if(cheerAge!==Infinity){const bounce=cheerAge<1.2?Math.abs(Math.sin(cheerAge/1.2*Math.PI*2)):0;return {sprite:cheerAge<.6?'stevie-cheer-a':'stevie-cheer-b',y:-bounce*4,angle:0}}
  return {sprite:null,y:0,angle:0};
}
function drawWaveStevie(){
  if(!waveCtx||!game.state.betweenWaves)return;
  const pose=stevieReactionPose(),image=doodles[pose.sprite]||doodles.stevie;if(!image)return;
  waveCtx.clearRect(0,0,128,136);waveCtx.save();waveCtx.translate(64,132+pose.y);waveCtx.rotate(pose.angle);
  const height=119,width=height*image.naturalWidth/image.naturalHeight;
  waveCtx.drawImage(image,-width/2,-height,width,height);waveCtx.restore();
}
function startStevieThrow(target){
  throwFacing=target.x<game.state.player.x?-1:1;
  throwDuration=Math.max(.18,Math.min(.38,game.state.stats.rockRate*.7));throwTime=0;
}
function stevieAnimationFrame(){
  if(motionReduced)return {column:0,row:0,facing:1};
  if(throwTime<throwDuration){
    const progress=throwTime/throwDuration;
    return {column:progress<.14?0:progress<.42?1:progress<.75?2:3,row:1,facing:throwFacing};
  }
  return {column:idleTime<.85?0:idleTime<1.5?1:idleTime<1.6?2:3,row:0,facing:1};
}
// Weak records follow living monsters; only 20 short-lived split echoes survive
// removal. Motion never moves a collider or consumes the combat random stream.
const stillEnemyPose=Object.freeze({y:0,angle:0,sx:1,sy:1});
let enemyMotion=new WeakMap(),splitEchoes=[],motionTime=0,motionSerial=0;
function motionFor(e){
  let m=enemyMotion.get(e);
  if(!m){
    const heavy=['tank','brute','bulwark','boss','eraser'].includes(e.type);
    m={x:e.x,y:e.y,phase:(motionSerial++%13)*.47,heavy,hop:heavy?.7:e.type==='fast'||e.type==='mini'?2.8:1.5,hitAge:1,lastHit:-1,birthAge:1,actionAge:1,action:null,readyUntil:-1,sprite:null,pose:{...stillEnemyPose}};enemyMotion.set(e,m);
  }
  return m;
}
function resetEnemyAnimations(){enemyMotion=new WeakMap();splitEchoes=[];motionTime=0;motionSerial=0}
function reactEnemyHit(e){
  if(motionReduced)return;
  const m=motionFor(e);
  // Continuous poison/burn ticks produce an occasional nudge, not a permanent squash.
  if(motionTime-m.lastHit>=.18){m.hitAge=0;m.lastHit=motionTime}
}
function animateSplitChild(e){if(e&&!motionReduced)motionFor(e).birthAge=0}
function animateEnemySplit(e){
  if(motionReduced)return;
  if(splitEchoes.length>=20)splitEchoes.shift();
  splitEchoes.push({x:e.x,y:e.y,r:e.r,type:e.type,color:e.color,hp:e.maxHp,maxHp:e.maxHp,age:0});
}
function enemyAnimationPose(e){return motionReduced?stillEnemyPose:(enemyMotion.get(e)?.pose||stillEnemyPose)}
function enemyAnimationCount(){return splitEchoes.length}
function animateEnemyAction(e,action){
  if(motionReduced)return;
  const m=motionFor(e);m.action=action;m.actionAge=0;
}
function prepareSapperStrike(e){if(!motionReduced)motionFor(e).readyUntil=motionTime+.05}
function enemyActionFrame(e){return motionReduced?null:(enemyMotion.get(e)?.sprite||null)}
function updateEnemyAnimations(dt){
  motionTime+=dt;
  if(motionReduced){splitEchoes=[];return}
  for(const e of game.state.enemies){
    const m=motionFor(e),distance=Math.hypot(e.x-m.x,e.y-m.y),heavy=m.heavy;
    m.x=e.x;m.y=e.y;m.hitAge+=dt;m.birthAge+=dt;m.actionAge+=dt;
    const moving=distance>.001&&e.freeze<=0&&e.stun<=0;
    if(moving)m.phase=(m.phase+Math.min(distance,e.r)* (heavy?.16:.27))%(Math.PI*2);
    const step=moving?Math.sin(m.phase):0,hop=moving?Math.abs(step)*m.hop:0;
    const hit=m.hitAge<.14?Math.sin(m.hitAge/.14*Math.PI)*.12:0;
    const birth=m.birthAge<.28?Math.sin(m.birthAge/.28*Math.PI):0;
    const p=m.pose;p.y=-hop-birth*5;p.angle=step*(heavy?.035:.055);
    p.sx=1+hit+birth*.14;p.sy=1-hit-birth*.1;
    m.sprite=null;
    if(e.freeze<=0&&e.stun<=0){
      if(e.type==='sniper'){
        if(m.action==='fire'&&m.actionAge<.2)m.sprite='sniper-fire';
        else if(e.shootCd<=.6&&game.api.dist(e.x,e.y,game.state.player.x,game.state.player.y)<190&&!game.api.shotBlocked(e.x,e.y,game.state.player.x,game.state.player.y))m.sprite='sniper-ready';
      }else if(e.type==='sapper'){
        if(m.action==='strike'&&m.actionAge<.22)m.sprite='sapper-strike';
        else if(m.readyUntil>motionTime)m.sprite='sapper-ready';
      }else if(e.type==='medic'&&m.action==='heal'&&m.actionAge<.1)m.sprite=motionTime% .6<.3?'medic-ready':'medic-heal';
    }
  }
  for(const echo of splitEchoes)echo.age+=dt;
  splitEchoes=splitEchoes.filter(e=>e.age<.28);
}
function drawSplitAnimations(){
  if(motionReduced)return;
  const ctx=game.dom.ctx;
  for(const echo of splitEchoes){
    if(!doodles[echo.type])continue;
    const progress=echo.age/.28;
    for(const side of [-1,1]){
      ctx.save();ctx.globalAlpha=(1-progress)*.65;ctx.translate(echo.x+side*progress*10,echo.y-progress*3);
      ctx.scale(1+progress*.35,1-progress*.25);ctx.beginPath();ctx.rect(side<0?-echo.r*2:0,-echo.r*2,echo.r*2,echo.r*4);ctx.clip();
      drawDoodleEnemy(echo,1);ctx.restore();
    }
  }
}
function tintedDoodle(name,colors){
  const image=doodles[name];if(!colors.length)return image;
  const key=name+':'+colors.join(',');
  const cached=tintedDoodles.get(key);
  if(cached){
    // Move hits to the end, evicting genuinely unused combinations first.
    tintedDoodles.delete(key);tintedDoodles.set(key,cached);tintHits++;return cached.canvas;
  }
  tintMisses++;
  const canvas=typeof OffscreenCanvas==='undefined'?document.createElement('canvas'):new OffscreenCanvas(image.naturalWidth,image.naturalHeight);
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');
  ctx.drawImage(image,0,0);ctx.globalCompositeOperation='color';
  colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*canvas.width/colors.length,0,canvas.width/colors.length,canvas.height)});
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(image,0,0);
  const bytes=canvas.width*canvas.height*4;
  if(bytes>tintLimits.bytes)return canvas;
  while(tintedDoodles.size&&(tintedDoodles.size>=tintLimits.entries||tintedBytes+bytes>tintLimits.bytes)){
    const oldest=tintedDoodles.keys().next().value;
    tintedBytes-=tintedDoodles.get(oldest).bytes;tintedDoodles.delete(oldest);tintEvictions++;
  }
  tintedDoodles.set(key,{canvas,bytes});tintedBytes+=bytes
  return canvas;
}
function drawDoodleEnemy(e,hpRatio){
  const action=enemyActionFrame(e),name=doodles[action]?action:e.type,image=doodles[name];if(!image)return false;
  const base=doodles[e.type]||image;
  const ctx=game.dom.ctx,colors=enemyStatusColors(e),width=e.r*(e.type==='sniper'?3.4:2.7),height=width*base.naturalHeight/base.naturalWidth;
  const left=-width*(e.type==='sniper'?.4:.5),top=-height*.54;
  const pose=enemyAnimationPose(e);
  ctx.save();ctx.translate(0,pose.y);ctx.rotate(pose.angle);
  // Squash around the feet so hit reactions remain small and planted.
  const foot=top+height;ctx.translate(0,foot);ctx.scale(pose.sx,pose.sy);ctx.translate(0,-foot);
  if(e.type==='sniper'&&game.state.player.x<e.x)ctx.scale(-1,1);
  // Damage never fades the body: health belongs in the separate bar.
  ctx.drawImage(tintedDoodle(name,colors),left,top,width,height);
  ctx.restore();
  drawEnemyHealthBar(e,hpRatio,colors);
  return true;
}
function drawEnemyHealthBar(e,hpRatio,colors=enemyStatusColors(e)){
  const ctx=game.dom.ctx;
  if(hpRatio<1||colors.length){
    const barWidth=e.r*2.3,barY=-e.r-10;
    ctx.fillStyle='#ddd5c1';ctx.fillRect(-barWidth/2,barY,barWidth,3);
    if(colors.length)colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(-barWidth/2+i*barWidth*hpRatio/colors.length,barY,barWidth*hpRatio/colors.length,3)});
    else{ctx.fillStyle=e.color;ctx.fillRect(-barWidth/2,barY,barWidth*hpRatio,3)}
  }
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
    for(const e of game.state.enemies){const m=enemyMotion.get(e);if(m){m.x+=dx;m.y+=dy}}
    for(const echo of splitEchoes)move(echo);
    game.api.moveAbilityEffects(dx,dy);
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
  drawWaveStevie();
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
  game.api.drawWallExplosions();
  drawSplitAnimations();
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
  const reaction=stevieReactionPose();
  if(doodles[reaction.sprite]){
    game.dom.ctx.translate(0,reaction.y);game.dom.ctx.rotate(reaction.angle);
    game.dom.ctx.drawImage(doodles[reaction.sprite],-34,-39.25,68,72.25);
  }else if(doodles['stevie-animations']){
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
      if(doodles.eraser){
        if(!motionReduced&&e.freeze<=0&&e.stun<=0)game.dom.ctx.rotate(Math.sin(motionTime/.35)*.08);
      }else game.dom.ctx.rotate(Math.sin(performance.now()/350)*.08);
      if(!drawDoodleEnemy(e,hpRatio)){
        game.dom.ctx.strokeStyle='#81344d';game.dom.ctx.lineWidth=3;

        // Fallback bodies stay opaque too; only the health bar drains.
        game.dom.ctx.fillStyle='#f7e7e9';game.dom.ctx.fillRect(-32,-20,64,40);
        game.dom.ctx.save();
        game.dom.ctx.beginPath();game.dom.ctx.rect(-32,-20,64,40);game.dom.ctx.clip();
        drawEnemyFill(e,-32,-20,64,40);
        game.dom.ctx.restore();
        game.dom.ctx.strokeRect(-32,-20,64,40);

        game.dom.ctx.fillStyle='#fff';game.dom.ctx.fillRect(-12,-5,7,7);game.dom.ctx.fillRect(5,-5,7,7);
        game.dom.ctx.fillStyle='#3b2630';game.dom.ctx.fillRect(-4,9,8,3);
        drawEnemyHealthBar(e,hpRatio);
      }
    }else{
      if(!drawDoodleEnemy(e,hpRatio)){
        game.dom.ctx.strokeStyle='#2a3135';game.dom.ctx.lineWidth=2.5;

        // Preserve the full silhouette, including when PNG artwork is unavailable.
        game.dom.ctx.fillStyle='rgba(255,255,255,.42)';
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.fill();

        game.dom.ctx.save();
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.clip();
        drawEnemyFill(e,-e.r,-e.r,e.r*2,e.r*2);
        game.dom.ctx.restore();

        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.stroke();

        game.dom.ctx.fillStyle='#fff';
        game.dom.ctx.beginPath();game.dom.ctx.arc(-e.r*.25,-2,2,0,Math.PI*2);game.dom.ctx.arc(e.r*.25,-2,2,0,Math.PI*2);game.dom.ctx.fill();
        game.dom.ctx.strokeStyle='#222';game.dom.ctx.beginPath();game.dom.ctx.moveTo(-4,5);game.dom.ctx.lineTo(4,5);game.dom.ctx.stroke();
        drawEnemyHealthBar(e,hpRatio);
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
        const pulse=doodles.medic?(enemyActionFrame(e)?e.healPulse:0):e.healPulse;
        game.dom.ctx.strokeStyle='rgba(74,155,102,.25)';game.dom.ctx.lineWidth=1;
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,25+pulse*20,0,Math.PI*2);game.dom.ctx.stroke();
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
  game.api.drawInkStatusEffects();
  game.api.drawInkBursts();
  game.api.drawChainLightning();
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
const api = { rendererCacheStats, artworkReady:()=>doodleNames.every(name=>!!doodles[name]), animateEnemyAction, prepareSapperStrike, enemyActionFrame, reactStevieHit, celebrateStevie, updateStevieCelebration, stevieReactionPose, resetEnemyAnimations, reactEnemyHit, animateEnemySplit, animateSplitChild, updateEnemyAnimations, enemyAnimationPose, enemyAnimationCount, resetStevieAnimation, updateStevieAnimation, startStevieThrow, stevieAnimationFrame, enemyStatusColors, resize, draw };
Object.assign(game.api, api);
return api;
};
