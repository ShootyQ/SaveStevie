/* renderer: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.renderer = function createRendererSystem(game) {
// Load once. Missing/late assets retain the existing vector drawings.
const doodles={},tintedDoodles=new Map();
// Fit a busy wave's working set without rebuilding every colored enemy each frame.
const tintLimits={entries:192,bytes:16*1024*1024};
let tintedBytes=0,tintHits=0,tintMisses=0,tintEvictions=0;
function rendererCacheStats(){return {tintEntries:tintedDoodles.size,tintBytes:tintedBytes,tintHits,tintMisses,tintEvictions,tintLimits:{...tintLimits}}}
const artworkVersion=document.documentElement?.dataset?.build;
const doodleNames=['basil','paper-fort','stevie','stevie-animations','grunt','grunt-animations','fast-animations','sniper','splitter','tank','pencil','fire','frost','poison','arrow','bouncer','flanker','wardling','sprinter','brood','bulwark','medic','sapper','gnawer','boss','stapler','crayon','eraser','fast','brute','elite','mini','electric','blast','vampire','gravity','repulsion','void','chaos','sniper-ready','sniper-fire','sapper-ready','sapper-strike','medic-ready','medic-heal','stevie-flinch','stevie-cheer-a','stevie-cheer-b','stevie-threats'];
if(typeof Image!=='undefined')for(const name of doodleNames){
  const image=new Image();image.decoding='async';
  image.onload=()=>{
    doodles[name]=image;
    const sheet=name==='grunt-animations'?{type:'grunt',rows:4,count:16}:name==='fast-animations'?{type:'fast',rows:2,count:8}:null;
    if(sheet){
      // Crop equal cells once at load; draw/tint cached frames without allocations.
      for(let i=0;i<sheet.count;i++){
        const frame=document.createElement('canvas');frame.width=frame.height=160;
        frame.naturalWidth=frame.naturalHeight=160;
        frame.getContext('2d').drawImage(image,(i%4)*image.naturalWidth/4,Math.floor(i/4)*image.naturalHeight/sheet.rows,image.naturalWidth/4,image.naturalHeight/sheet.rows,0,0,160,160);
        doodles[sheet.type+'-frame-'+i]=frame;
      }
    }
    if(name==='stevie-threats')for(let i=0;i<2;i++){
      const frame=document.createElement('canvas');frame.width=128;frame.height=136;
      frame.naturalWidth=128;frame.naturalHeight=136;
      frame.getContext('2d').drawImage(image,i*image.naturalWidth/2,0,image.naturalWidth/2,image.naturalHeight,0,0,128,136);
      doodles[i?'stevie-cover':'stevie-concerned']=frame;
    }
    inkSprites.clear();
  };
  image.src='assets/art/'+name+'.png'+(artworkVersion?'?v='+artworkVersion:'');
}
// One SVG coordinate system drives both the visible stroke and its physical nib.
const menuPath=game.dom.$('splashInkPath'),menuPencil=document.querySelector?.('.splash-pencil');
const menuStrokes=document.querySelectorAll('.splash-ink-stroke');
let menuAge=0,menuLength=0;
function resetMenuPencil(){menuAge=0}
function updateMenuPencil(dt){
 if(!menuPath?.getTotalLength||!menuPencil)return;
 const visible=!game.state.running&&!game.api.infoOpen()&&!document.hidden&&game.dom.startOverlay.style.display!=='none';
 if(!visible){game.api.stopSoundEffects('scribble');return}
 if(!menuLength)menuLength=menuPath.getTotalLength();
 menuAge+=dt;
 const phase=menuAge%18,progress=motionReduced?1:Math.max(0,Math.min(1,(phase-1.2)/3.6));
 const p=menuPath.getPointAtLength(menuLength*progress);
 menuPencil.setAttribute('transform','translate('+p.x+' '+p.y+')');
 for(const stroke of menuStrokes){stroke.style.strokeDasharray=menuLength+' '+menuLength;stroke.style.strokeDashoffset=String(menuLength*(1-progress))}
 if(!motionReduced&&phase>1.2&&phase<4.8)game.api.playMenuScribble();else game.api.stopSoundEffects('scribble');
}
// Presentation only: no combat RNG, attack delays, or collider changes.
const reducedMotion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let motionReduced=!!reducedMotion?.matches;
reducedMotion?.addEventListener?.('change',event=>{motionReduced=event.matches;resetEnemyAnimations();updateMenuPencil(0)});
let idleTime=0,throwTime=Infinity,throwDuration=.38,throwFacing=1,flinchAge=1,cheerAge=Infinity;
let stevieThreat=0,threatRelease=0;
const wavePortrait=document.getElementById('waveStevie'),waveCtx=wavePortrait?.getContext('2d');
function resetStevieAnimation(){idleTime=0;throwTime=Infinity;throwFacing=1;flinchAge=1;cheerAge=Infinity;stevieThreat=0;threatRelease=0}
function updateStevieAnimation(dt){
  idleTime=(idleTime+dt)%2.2;throwTime+=dt;flinchAge+=dt;
  let nearest=Infinity,count=0;
  for(const e of game.state.enemies)if(e.hp>0){
    count++;nearest=Math.min(nearest,Math.hypot(e.x-game.state.player.x,e.y-game.state.player.y)-e.r-game.state.player.r);
  }
  // Edge distances work for tiny runners and large bosses. Separate release
  // thresholds and a short hold keep a hovering enemy from flickering poses.
  const desired=nearest<30?2:nearest<110||count>=8?1:0;
  const held=stevieThreat===2&&nearest<48?2:stevieThreat>=1&&(nearest<140||count>=6)?1:0;
  if(desired>=stevieThreat){stevieThreat=desired;threatRelease=0}
  else if(held===stevieThreat)threatRelease=0;
  else if((threatRelease+=dt)>=.6){stevieThreat=Math.max(desired,held);threatRelease=0}
}
function reactStevieHit(){if(!motionReduced)flinchAge=0}
function celebrateStevie(){cheerAge=0;throwTime=Infinity;flinchAge=1;stevieThreat=0;threatRelease=0}
function updateStevieCelebration(dt){cheerAge=Math.min(1.2,cheerAge+dt)}
function stevieReactionPose(){
  if(motionReduced)return {sprite:stevieThreat===2?'stevie-cover':stevieThreat===1?'stevie-concerned':null,y:0,angle:0};
  if(flinchAge<.22)return {sprite:'stevie-flinch',y:0,angle:-.08*Math.sin(flinchAge/.22*Math.PI)};
  if(cheerAge!==Infinity){const bounce=cheerAge<1.2?Math.abs(Math.sin(cheerAge/1.2*Math.PI*2)):0;return {sprite:cheerAge<.6?'stevie-cheer-a':'stevie-cheer-b',y:-bounce*4,angle:0}}
  if(stevieThreat)return {sprite:stevieThreat===2?'stevie-cover':'stevie-concerned',y:Math.sin(idleTime*Math.PI*4)*(stevieThreat===2?.35:.65),angle:Math.sin(idleTime*Math.PI*3)*(stevieThreat===2?.025:.012)};
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
const stillEnemyPose=Object.freeze({x:0,y:0,angle:0,sx:1,sy:1});
let enemyMotion=new WeakMap(),splitEchoes=[],motionTime=0,motionSerial=0;
function motionFor(e){
  let m=enemyMotion.get(e);
  if(!m){
    const heavy=['tank','brute','bulwark','boss','stapler','crayon','eraser'].includes(e.type);
    m={x:e.x,y:e.y,phase:(motionSerial++%13)*.47,heavy,hop:heavy?.7:e.type==='basil'?3.2:e.type==='fast'||e.type==='mini'?2.8:1.5,hitAge:1,lastHit:-1,birthAge:1,actionAge:1,walkAge:0,gruntFrame:0,runDistance:0,fastFrame:0,action:null,readyUntil:-1,sprite:null,facing:game.state.player.x<e.x?-1:1,actionFacing:1,cue:null,cueProgress:0,pose:{...stillEnemyPose}};enemyMotion.set(e,m);
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
function animateEnemyAction(e,action,target=null){
  if(motionReduced)return;
  const m=motionFor(e);m.action=action;m.actionAge=0;m.actionFacing=target&&target.x!==e.x?(target.x<e.x?-1:1):m.facing;
}
function prepareSapperStrike(e){if(!motionReduced)motionFor(e).readyUntil=motionTime+.05}
function enemyActionCue(e){return motionReduced?null:(enemyMotion.get(e)?.cue||null)}
function enemyActionFrame(e){return motionReduced?null:(enemyMotion.get(e)?.sprite||null)}
function enemySpriteFrame(e){
  if(e.type==='fast'&&doodles['fast-frame-0']){const m=enemyMotion.get(e),facing=m?.facing??(game.state.player.x<e.x?-1:1);return 'fast-frame-'+((facing<0?4:0)+(motionReduced?0:(m?.fastFrame||0)))}
  if(e.type==='grunt'&&doodles['grunt-frame-0'])return 'grunt-frame-'+(motionReduced?0:(enemyMotion.get(e)?.gruntFrame||0));
  return null;
}
// Native profile direction: Staple Snack's open jaws point left; the other
// profile monsters point right. Front-facing silhouettes keep their artwork.
const profileDirections={fast:1,sprinter:1,flanker:1,mini:1,basil:1,sniper:1,stapler:-1};
function enemyFacing(e){
  const m=enemyMotion.get(e);
  if(e.type==='sniper')return game.state.player.x<e.x?-1:1;
  if(m?.actionAge<.3&&['bite','slam'].includes(m.action))return m.actionFacing;
  return m?.facing??(game.state.player.x<e.x?-1:1);
}
function updateEnemyAnimations(dt){
  motionTime+=dt;
  if(motionReduced)splitEchoes=[];
  for(const e of game.state.enemies){
    const m=motionFor(e),distance=Math.hypot(e.x-m.x,e.y-m.y),heavy=m.heavy;
    if(e.freeze<=0&&e.stun<=0&&Math.abs(e.x-m.x)>.05)m.facing=e.x<m.x?-1:1;
    m.x=e.x;m.y=e.y;m.hitAge+=dt;m.birthAge+=dt;m.actionAge+=dt;
    if(motionReduced)continue;
    const moving=distance>.001&&e.freeze<=0&&e.stun<=0;
    if(e.type==='grunt'&&e.freeze<=0&&e.stun<=0){
      if(moving)m.walkAge+=dt;
      m.gruntFrame=m.action==='bite'&&m.actionAge<.42?8+Math.min(7,Math.floor(m.actionAge/.42*8)):moving?Math.floor(m.walkAge*12)%8:0;
    }
    if(e.type==='fast'&&e.freeze<=0&&e.stun<=0){
      // Advance by distance travelled: chilled runners do not pedal at full speed.
      if(e.flight)m.fastFrame=2;
      else if(moving){m.runDistance=(m.runDistance+Math.min(distance,e.r*2))%(e.r*3);m.fastFrame=Math.floor(m.runDistance/(e.r*3)*4)}
      else m.fastFrame=0;
    }
    if(moving)m.phase=(m.phase+Math.min(distance,e.r)* (heavy?.16:.27))%(Math.PI*2);
    const step=moving?Math.sin(m.phase):0,hop=moving?Math.abs(step)*m.hop:0;
    const hit=m.hitAge<.14?Math.sin(m.hitAge/.14*Math.PI)*.12:0;
    const birth=m.birthAge<.28?Math.sin(m.birthAge/.28*Math.PI):0;
    const p=m.pose;p.x=0;p.y=-hop-birth*5;p.angle=step*(heavy?.035:.055);
    p.sx=1+hit+birth*.14;p.sy=1-hit-birth*.1;
    m.sprite=null;
    if(e.freeze<=0&&e.stun<=0){
      if(e.type==='sniper'){
        if(m.action==='fire'&&m.actionAge<.2)m.sprite='sniper-fire';
        else if(e.shootCd<=.6&&game.api.sniperCanAim(e))m.sprite='sniper-ready';
      }else if(e.type==='sapper'){
        if(m.action==='strike'&&m.actionAge<.22)m.sprite='sapper-strike';
        else if(m.readyUntil>motionTime)m.sprite='sapper-ready';
      }else if(e.type==='medic'&&m.action==='heal'&&m.actionAge<.1)m.sprite=motionTime% .6<.3?'medic-ready':'medic-heal';
    }
    m.cue=null;m.cueProgress=0;
    if(e.freeze>0||e.stun>0)continue;
    // Distinct silhouettes reuse the existing art. These offsets never touch
    // enemy coordinates, attack timers, damage, or the combat random stream.
    if(moving&&e.type==='flanker'){p.angle+=m.facing*.12;p.y-=Math.abs(step)*1.6;p.sx+=step*.06;p.sy-=step*.04}
    if(moving&&(e.type==='fast'||e.type==='mini')){p.angle+=m.facing*.09;p.sx+=step*.05;p.sy-=step*.05;}
    if(moving&&e.type==='grunt'&&!doodles['grunt-frame-0']){p.sx+=step*.035;p.sy-=step*.035;}
    if(e.type==='boss'&&game.api.isFirstBoss(e)){
      const brain=game.api.bossBrain(e);
      if(brain.recovery>0){p.angle-=.24;p.sx+=.1;p.sy-=.14;p.y+=4;p.x+=Math.sin(brain.recovery*9)*1.5}
      else if(brain.cast){const ready=1-brain.cast.left/(brain.cast.duration||1.2);p.sx+=ready*.08;p.sy-=ready*.08;p.angle+=Math.sin(ready*Math.PI)*.07}
    }
    if(e.type==='basil'){
      if(moving){p.angle+=step*.07;p.sx+=step*.06;p.sy-=step*.06}
      if(m.action==='bite'&&m.actionAge<.3){const feast=Math.sin(m.actionAge/.3*Math.PI);m.cue='bite';m.cueProgress=feast;p.x=m.actionFacing*feast*4;p.angle-=m.actionFacing*feast*.15;p.sx+=feast*.14;p.sy-=feast*.12}
    }else if(e.type==='bouncer'){
      if(moving){p.y-=Math.abs(step)*2;p.sx+=step*.08;p.sy-=step*.08;}
      if(m.action==='bounce'&&m.actionAge<.16){
        const impact=Math.sin(m.actionAge/.16*Math.PI);m.cue='bounce';p.sx+=impact*.25;p.sy-=impact*.2;
      }else if(e.bounceTime>0&&moving){m.cue='bounce';p.angle+=m.facing*.15;p.sx+=.12;p.sy-=.08;}
    }else if((e.type==='gnawer'||e.type==='grunt')&&m.action==='bite'&&m.actionAge<.18){
      const bite=Math.sin(m.actionAge/.18*Math.PI);
      const strength=e.type==='gnawer'?1:.65;
      m.cue='bite';m.cueProgress=bite;p.x=m.actionFacing*bite*3*strength;p.sx+=bite*.17*strength;p.sy-=bite*.1*strength;
    }else if(e.type==='sprinter'){
      if(e.dashTime>=2.6&&moving){m.cue='dash';p.x=m.facing*2;p.angle=m.facing*.22;p.sx+=.15;p.sy-=.12;}
      else if(e.dashTime>2.1&&e.dashTime<2.6){
        const charge=(e.dashTime-2.1)/.5;m.cue='charge';m.cueProgress=charge;
        p.y+=charge*2;p.sx+=charge*.16;p.sy-=charge*.18;p.angle-=m.facing*charge*.1;
      }
    }else if(e.type==='stapler'){
      if(e.bossWindup>0){
        const ready=1-e.bossWindup/1.2;m.cue='slam-ready';m.cueProgress=ready;p.y-=ready*4;p.angle-=ready*.16;p.sy+=ready*.1;
      }else if(m.action==='slam'&&m.actionAge<.32){
        const slam=Math.sin(m.actionAge/.32*Math.PI);m.cue='slam';m.cueProgress=slam;p.y+=slam*4;p.sx+=slam*.22;p.sy-=slam*.24;
      }
    }else if(e.type==='crayon'){
      if(e.bossWindup>0){
        const ready=1-e.bossWindup/1.2;m.cue='cast-ready';m.cueProgress=ready;p.y-=Math.sin(ready*Math.PI)*5;p.angle+=Math.sin(ready*Math.PI*4)*.12;
      }else if(m.action==='summon'&&m.actionAge<.45){
        const cast=Math.sin(m.actionAge/.45*Math.PI);m.cue='summon';m.cueProgress=cast;p.y-=cast*6;p.sx-=cast*.08;p.sy+=cast*.12;
      }
    }else if(e.type==='eraser'&&m.action==='erase'&&m.actionAge<.36){
      const swipe=Math.sin(m.actionAge/.36*Math.PI);m.cue='erase';m.cueProgress=swipe;p.x=m.actionFacing*swipe*5;p.angle+=m.actionFacing*swipe*.2;p.sx+=swipe*.1;
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
// Three short marks per acting monster, no particles or new canvases.
function drawEnemyActionMarks(e){
  const m=enemyMotion.get(e);if(motionReduced||!m?.cue||e.freeze>0||e.stun>0)return;
  const ctx=game.dom.ctx,cue=m.cue,p=m.cueProgress;
  if(cue==='charge'||cue==='slam-ready')return; // The body's anticipation is enough.
  ctx.save();ctx.strokeStyle=e.color;ctx.lineWidth=1.8;ctx.lineCap='round';
  ctx.globalAlpha=.75;ctx.beginPath();
  for(let i=0;i<3;i++){
    if(cue==='dash'||cue==='bounce'){
      const x=-m.facing*(e.r+4),y=(i-1)*5;
      ctx.moveTo(x,y);ctx.lineTo(x-m.facing*(5+i*2),y);
    }else if(cue==='bite'){
      const x=m.actionFacing*(e.r+2);
      ctx.moveTo(x,(i-1)*5);ctx.lineTo(x+(x<0?-1:1)*(2+p*4),(i-1)*7);
    }else if(cue==='slam'){
      const x=(i-1)*e.r*.6,y=e.r+2;
      ctx.moveTo(x,y);ctx.lineTo(x+(i-1)*p*5,y+p*6);
    }else if(cue==='erase'){
      const y=(i-1)*7,x=-m.actionFacing*(e.r+8);ctx.moveTo(x,y);ctx.quadraticCurveTo(x-m.actionFacing*(6+p*6),y-4,x,y-8);
    }else{
      const angle=i*Math.PI*2/3+motionTime*2,r=e.r+6+p*7;
      const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
      ctx.moveTo(x-2,y);ctx.lineTo(x+2,y);ctx.moveTo(x,y-2);ctx.lineTo(x,y+2);
    }
  }
  ctx.stroke();ctx.restore();
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
function drawDoodleEnemy(e,hpRatio,showHealth=true){
  const action=enemySpriteFrame(e)||enemyActionFrame(e),name=doodles[action]?action:e.type,image=doodles[name];if(!image)return false;
  const framed=/^(grunt|fast)-frame-/.test(name),base=framed?image:doodles[e.type]||image;
  const ctx=game.dom.ctx,colors=enemyStatusColors(e),width=e.r*(name.startsWith('fast-frame-')?4:framed?3.25:e.type==='sniper'?3.4:2.7),height=width*base.naturalHeight/base.naturalWidth;
  const left=-width*(e.type==='sniper'?.4:.5),top=-height*.54;
  const pose=enemyAnimationPose(e);
  ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);
  // Squash around the feet so hit reactions remain small and planted.
  const foot=top+height;ctx.translate(0,foot);ctx.scale(pose.sx,pose.sy);ctx.translate(0,-foot);
  if(profileDirections[e.type]&&!name.startsWith('fast-frame-')&&enemyFacing(e)!==profileDirections[e.type])ctx.scale(-1,1);
  // Damage never fades the body: health belongs in the separate bar.
  ctx.drawImage(tintedDoodle(name,colors),left,top,width,height);
  ctx.restore();
  if(showHealth)drawEnemyHealthBar(e,hpRatio,colors);
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
    game.api.moveLaunchEffects(dx,dy);
    for(const e of game.state.enemies){const m=enemyMotion.get(e);if(m){m.x+=dx;m.y+=dy}}
    for(const echo of splitEchoes)move(echo);
    game.api.moveAbilityEffects(dx,dy);
    game.api.movePlaguefire(dx,dy);game.api.moveWaveFinale(dx,dy,r.width,r.height);
    game.api.moveRefuge(dx,dy);game.api.moveSupportInkVisuals(dx,dy);game.api.moveBossFields(dx,dy);
  }
  game.state.W=r.width;game.state.H=r.height;game.dom.ctx.setTransform(game.state.dpr,0,0,game.state.dpr,0,0);
  game.state.player.x=game.state.W/2;game.state.player.y=game.state.H/2;game.api.refreshBossArrival();
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
  const ctx=game.dom.ctx,time=(game.state.waveElapsed||0)*3;
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

// Cached, deterministic paper grain: presentation never consumes combat RNG.
const graphiteGrain=new WeakMap();
function pencilGrain(points){
  if(graphiteGrain.has(points))return graphiteGrain.get(points);
  const grain=[];
  let distance=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y);
    if(!len)continue;
    for(let d=6-distance;d<len;d+=6){
      const t=Math.max(0,d)/len;
      grain.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,nx:-(b.y-a.y)/len,ny:(b.x-a.x)/len});
      if(grain.length>=128)break;
    }
    distance=(distance+len)%6;
    if(grain.length>=128)break;
  }
  graphiteGrain.set(points,grain);return grain;
}
function drawToolStroke(points,thick,opacity,color){
  const ctx=game.dom.ctx,rank=game.state.tool?.rank||0;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.globalAlpha=opacity;
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  if(rank>=6){
    // Ballpoint has a crisp core; the marker lays down dense, broad ink.
    ctx.lineWidth=thick;ctx.globalAlpha=opacity*(rank>=10?.95:.28);ctx.stroke();
    ctx.lineWidth=thick*(rank>=10?.86:.55);ctx.globalAlpha=opacity;ctx.stroke();
  }else{
    const mechanical=rank>=3;
    // Pale rubbed graphite keeps the full wall footprint readable.
    ctx.lineWidth=thick;ctx.globalAlpha=opacity*(mechanical?.16:.24);ctx.stroke();
    ctx.lineWidth=thick*(mechanical?.32:.72);ctx.globalAlpha=opacity*(mechanical?.85:.57);ctx.stroke();
    ctx.lineWidth=mechanical?.65:1.1;ctx.globalAlpha=opacity*(mechanical?.28:.35);
    ctx.beginPath();
    const grain=pencilGrain(points);
    for(let i=0;i<grain.length;i++){
      const p=grain[i],offset=Math.sin(i*2.399)*thick*(mechanical?.22:.36),reach=mechanical?.8:2.1;
      const x=p.x+p.nx*offset,y=p.y+p.ny*offset;
      ctx.moveTo(x-p.nx*reach,y-p.ny*reach);ctx.lineTo(x+p.nx*reach,y+p.ny*reach);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function draw(){
  drawWaveStevie();
  game.dom.ctx.clearRect(0,0,game.state.W,game.state.H);game.dom.ctx.save();
  const intro=game.api.firstBossIntroPose();
  const camera=intro?{zoom:intro.zoom,x:game.api.clamp(intro.x,game.state.W/(2*intro.zoom),game.state.W-game.state.W/(2*intro.zoom)),y:game.api.clamp(intro.y,game.state.H/(2*intro.zoom),game.state.H-game.state.H/(2*intro.zoom))}:game.api.waveFinaleCamera();game.dom.ctx.translate(game.state.W/2,game.state.H/2);game.dom.ctx.scale(camera.zoom,camera.zoom);game.dom.ctx.translate(-camera.x,-camera.y);
  game.dom.ctx.strokeStyle='rgba(212,76,76,.35)';game.dom.ctx.lineWidth=2;
  game.dom.ctx.beginPath();game.dom.ctx.moveTo(47,0);game.dom.ctx.lineTo(47,game.state.H);game.dom.ctx.stroke();

  game.api.drawPlaguefire();
  game.api.drawLaunchGround();

  for(const w of game.state.walls){
    const hpRatio=game.api.clamp(w.hp/w.maxHp,0,1);
    const lifeRatio=game.api.clamp(w.life/w.maxLife,0,1);
    const visualRatio=Math.min(hpRatio,lifeRatio);
    let col='#343638';
    if(game.state.inks.chaos>0)col=`hsl(${(performance.now()/30+w.hp)%360},55%,30%)`;
    drawToolStroke(w.pts,w.thick,.08+.92*visualRatio,col);

    drawWallTextures(w.pts,w.thick,.08+.92*visualRatio);
    if(w.sealAge!==undefined&&w.sealAge<.65){
      const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle='#638466';ctx.globalAlpha=(1-w.sealAge/.65)*.65;ctx.lineWidth=w.thick+3;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(w.pts[0].x,w.pts[0].y);
      const count=motionReduced?w.pts.length:Math.max(2,Math.ceil(w.pts.length*w.sealAge/.4));
      for(let i=1;i<Math.min(w.pts.length,count);i++)ctx.lineTo(w.pts[i].x,w.pts[i].y);ctx.stroke();ctx.restore();
    }

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
    // The preview grows in place; refresh both presentation caches.
    wallSamples.delete(game.state.currentWall);graphiteGrain.delete(game.state.currentWall);
    drawToolStroke(game.state.currentWall,game.state.stats.lineWidth,.72,'#343638');
    drawWallTextures(game.state.currentWall,game.state.stats.lineWidth,.72)
  }

  // Ranged threats are readable before and after firing.
  game.api.drawWallExplosions();
  drawSplitAnimations();
  for(const e of game.state.enemies){
    if(e.type!=='sniper'||e.hp<=0||e.stun>0||e.freeze>0||e.shootCd>.6||
      !game.api.sniperCanAim(e))continue;
    const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle='#3562be';ctx.lineWidth=2;ctx.globalAlpha=.65;
    ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(game.state.player.x,game.state.player.y);ctx.stroke();
    ctx.setLineDash([]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  game.api.drawBossEncounters();
  for(const shot of game.state.enemyShots){
    if(shot.owner){game.api.drawFirstBossShot(shot);continue}
    const ctx=game.dom.ctx;ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(Math.atan2(shot.vy,shot.vx));
    const image=doodles.arrow;
    // The front tip stays on the projectile collision point; the visible shaft
    // trails behind it, so the arrow cannot disappear before its tip arrives.
    if(shot.bossKind){
      ctx.strokeStyle=shot.bossKind==='crumb'?'#bd5d7e':shot.bossKind==='staple'?'#8b6d38':'#8650a2';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2;
      if(!motionReduced){ctx.globalAlpha=.45;ctx.beginPath();ctx.moveTo(-26,-3);ctx.lineTo(-15,-3);ctx.moveTo(-23,3);ctx.lineTo(-14,3);ctx.stroke();ctx.globalAlpha=1}
      if(shot.bossKind==='staple'){ctx.beginPath();ctx.moveTo(-12,5);ctx.lineTo(-12,-5);ctx.lineTo(0,-5);ctx.lineTo(0,5);ctx.stroke();ctx.strokeStyle='#d7c58f';ctx.lineWidth=1;ctx.stroke()}
      else if(shot.bossKind==='crayon'){
        ctx.fillStyle='#a769c5';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-5,-4);ctx.lineTo(-17,-4);ctx.lineTo(-17,4);ctx.lineTo(-5,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#e9cdf5';ctx.beginPath();ctx.moveTo(-12,-3);ctx.lineTo(-12,3);ctx.moveTo(-8,-3);ctx.lineTo(-8,3);ctx.stroke();
      }else if(shot.bossKind==='crumb'){
        if(!motionReduced)ctx.rotate(shot.life*5);ctx.beginPath();for(let i=0;i<7;i++){const a=i*Math.PI*2/6,r=i%2?3:5;if(i)ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.fill();ctx.strokeStyle='#edb5c6';ctx.lineWidth=1;ctx.stroke();
      }else{ctx.beginPath();ctx.arc(-4,0,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ce8fbc';ctx.beginPath();ctx.arc(-5,-1,1.3,0,Math.PI*2);ctx.fill()}
      ctx.restore();continue;
    }
    if(image){const width=30,height=width*image.naturalHeight/image.naturalWidth;ctx.drawImage(image,-width,-height/2,width,height)}
    else{
      ctx.strokeStyle='#fff8e9';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-27,0);ctx.lineTo(-5,0);ctx.stroke();
      ctx.strokeStyle='#24323a';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#d95050';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-10,-5);ctx.lineTo(-10,5);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='#3562be';ctx.beginPath();ctx.moveTo(-25,-5);ctx.lineTo(-20,0);ctx.lineTo(-25,5);ctx.stroke();
    }
    ctx.restore();
  }

  game.api.drawRefuge(doodles['paper-fort'],motionReduced);
  // Stevie
  game.dom.ctx.save();game.dom.ctx.translate(game.state.player.x,game.state.player.y);
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
    if(e.bossWindup>0){
      game.dom.ctx.save();game.dom.ctx.strokeStyle=e.type==='stapler'?'#a56a16':'#9354b9';game.dom.ctx.lineWidth=3;
      game.dom.ctx.setLineDash([5,4]);game.dom.ctx.beginPath();
      if(e.type==='stapler'&&game.state.walls.includes(e.bossTarget)){
        const p=game.api.nearestPointOnWall(e,e.bossTarget);
        if(p){game.dom.ctx.moveTo(e.x,e.y);game.dom.ctx.lineTo(p.x,p.y);game.dom.ctx.stroke();game.dom.ctx.beginPath();game.dom.ctx.arc(p.x,p.y,16,0,Math.PI*2)}
      }else game.dom.ctx.arc(e.x,e.y,e.r+10+8*(1-e.bossWindup/1.2),0,Math.PI*2);
      game.dom.ctx.stroke();game.dom.ctx.restore();
    }
    if(e.type==='basil'&&e.feastPhase!=='idle'){
      const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle=e.feastPhase==='warning'?'#ce7932':'#6b944c';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.arc(e.x,e.y,85+(motionReduced?0:Math.sin(motionTime*4)*3),0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff8df';ctx.beginPath();ctx.ellipse(e.x,e.y+e.r+10,18,7,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#e29236';ctx.fillRect(e.x-7,e.y+e.r+7,13,4);ctx.restore();
    }
    if(e.feastRush>0){const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle='#cf8738';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,0,Math.PI*2);ctx.stroke();ctx.restore();}
    const hpRatio=game.api.clamp(e.hp/e.maxHp,0,1);
    game.dom.ctx.save();game.dom.ctx.translate(e.x,e.y-game.api.enemyFlightHeight(e));
    if(e.flight&&!motionReduced){const t=e.flight.age/e.flight.duration;game.dom.ctx.rotate(e.flight.spin*Math.sin(t*Math.PI)*.8);const scale=1+Math.sin(t*Math.PI)*.16;game.dom.ctx.scale(scale,scale);}

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
    drawEnemyActionMarks(e);
    game.dom.ctx.restore();
  }

  for(const p of game.state.projectiles){
    game.dom.ctx.fillStyle='#5f5a53';game.dom.ctx.beginPath();game.dom.ctx.arc(p.x,p.y,4,0,Math.PI*2);game.dom.ctx.fill()
  }
  for(const p of game.state.particles){
    game.dom.ctx.globalAlpha=game.api.clamp(p.life*1.8,0,1);game.dom.ctx.fillStyle=p.color;game.dom.ctx.fillRect(p.x,p.y,3,3);game.dom.ctx.globalAlpha=1
  }
  game.api.drawSupportInks();
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
  if(intro){
    const ctx=game.dom.ctx;ctx.save();ctx.translate(intro.x,intro.y-intro.hop);
    const e={type:'boss',r:28,hp:1,maxHp:1,freeze:0,stun:0,burn:0,poison:0,charged:0,gravitySlow:0};
    if(!drawDoodleEnemy(e,1,false)){ctx.fillStyle='#962f3d';ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.fill()}
    if(intro.stage==='roar'){ctx.fillStyle='#962f3d';ctx.font='bold 23px "Stevie Pencil",cursive';ctx.textAlign='center';ctx.fillText('ROOOAR!',0,-65)}
    if(intro.stage==='smash'){ctx.strokeStyle='#b17635';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,40+(intro.age-6.132)*game.state.W*3,0,Math.PI*2);ctx.stroke()}
    ctx.restore();
  }
  game.api.drawWaveFinale(drawDoodleEnemy);game.dom.ctx.restore();
  if(game.state.paused){
    game.dom.ctx.fillStyle='rgba(20,25,28,.38)';game.dom.ctx.fillRect(0,0,game.state.W,game.state.H);
    game.dom.ctx.fillStyle='#fff';game.dom.ctx.textAlign='center';game.dom.ctx.font='900 38px system-ui';game.dom.ctx.fillText('PAUSED',game.state.W/2,game.state.H/2)
  }
}
const api = { enemyFacing, enemyMotionReduced:()=>motionReduced, enemySpriteFrame, updateMenuPencil, resetMenuPencil, enemyActionCue, rendererCacheStats, artworkReady:()=>doodleNames.every(name=>!!doodles[name]), animateEnemyAction, prepareSapperStrike, enemyActionFrame, reactStevieHit, celebrateStevie, updateStevieCelebration, stevieReactionPose, resetEnemyAnimations, reactEnemyHit, animateEnemySplit, animateSplitChild, updateEnemyAnimations, enemyAnimationPose, enemyAnimationCount, resetStevieAnimation, updateStevieAnimation, startStevieThrow, stevieAnimationFrame, enemyStatusColors, resize, draw };
Object.assign(game.api, api);
updateMenuPencil(0);
return api;
};
