/* renderer: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.renderer = function createRendererSystem(game) {
// Keep base artwork ready before starting; retry transient image failures.
const doodles={},tintedDoodles=new Map();
// Fit a busy wave's working set without rebuilding every colored enemy each frame.
const tintLimits={entries:192,bytes:16*1024*1024};
let tintedBytes=0,tintHits=0,tintMisses=0,tintEvictions=0;
function rendererCacheStats(){return {tintEntries:tintedDoodles.size,tintBytes:tintedBytes,tintHits,tintMisses,tintEvictions,tintLimits:{...tintLimits}}}
const artworkVersion=document.documentElement?.dataset?.build;
const doodleNames=['wallpuller','papertearer','sprinter-animations','doodle-scraps-extra','doodle-scraps','boss-animations','scrubber','basil','jamling','paper-fort','stevie','stevie-animations','grunt','grunt-animations','fast-animations','sniper','sniper-animations','splitter','tank','pencil','fire','frost','poison','arrow','bouncer','flanker','wardling','sprinter','brood','bulwark','medic','sapper','gnawer','boss','stapler','crayon','eraser','fast','brute','elite','mini','electric','blast','vampire','gravity','repulsion','void','chaos','sniper-ready','sniper-fire','sapper-ready','sapper-strike','medic-ready','medic-heal','stevie-flinch','stevie-cheer-a','stevie-cheer-b','stevie-threats'];
const coreArtwork=new Set(['wallpuller','papertearer','paper-fort','stevie','scrubber','basil','jamling','grunt','sniper','splitter','tank','bouncer','flanker','wardling','sprinter','brood','bulwark','medic','sapper','gnawer','boss','stapler','crayon','eraser','fast','brute','elite','mini']);
const artworkLoads=new Map(),artworkSupported=typeof Image!=='undefined';
function artworkStatus(){const loaded=[...coreArtwork].filter(name=>!!doodles[name]).length;return {ready:!artworkSupported||loaded===coreArtwork.size,loaded,total:coreArtwork.size,failed:[...artworkLoads].filter(([,r])=>r.failed).map(([name])=>name),loading:[...artworkLoads].filter(([,r])=>r.loading).map(([name])=>name)};}
function syncArtworkUI(){
 const s=artworkStatus(),notice=game.dom.$('artworkLoadStatus'),retry=game.dom.$('retryArtworkBtn');
 notice.hidden=s.ready&&!s.failed.length;notice.textContent=s.failed.length?'Some doodle artwork couldn’t load. Retry artwork to bring it back.':s.ready?'':'Opening notebook artwork… '+s.loaded+' / '+s.total;
 retry.hidden=!s.failed.length;
 game.dom.$('startBtn').disabled=!s.ready||!!game.api.scrapLessonPending?.();
}
function retryArtwork(){for(const [name,r] of artworkLoads)if(r.failed){r.retries=0;loadDoodle(name,true)}syncArtworkUI();}
function loadDoodle(name,retry=false){
 const previous=artworkLoads.get(name),record=previous||{retries:0,attempt:0};if(record.loading||doodles[name])return;record.loading=true;record.failed=false;record.attempt++;artworkLoads.set(name,record);
 const image=new Image();image.decoding='async';image.fetchPriority=coreArtwork.has(name)?'high':'low';
  image.onload=()=>{
    doodles[name]=image;
    if(name==='scrubber')for(let stage=1;stage<=2;stage++){
      const frame=document.createElement('canvas');frame.width=384;frame.height=256;
      frame.naturalWidth=384;frame.naturalHeight=256;
      const c=frame.getContext('2d');c.drawImage(image,0,0,384,256);c.globalCompositeOperation='destination-out';
      // First wipe removes the left hand, a foot and a bite of the body.
      c.beginPath();c.moveTo(0,105);c.lineTo(87,103);c.lineTo(110,136);c.lineTo(96,177);c.lineTo(121,203);c.lineTo(119,256);c.lineTo(0,256);c.closePath();c.fill();
      if(stage===2){
        // Second wipe takes the hair and lower body; the face/eraser survive.
        c.beginPath();c.moveTo(0,0);c.lineTo(384,0);c.lineTo(384,98);c.lineTo(242,98);c.lineTo(215,85);c.lineTo(203,92);c.lineTo(191,77);c.lineTo(166,72);c.lineTo(0,72);c.closePath();c.fill();
        c.beginPath();c.moveTo(110,177);c.lineTo(140,188);c.lineTo(159,177);c.lineTo(180,188);c.lineTo(210,178);c.lineTo(232,171);c.lineTo(264,184);c.lineTo(264,256);c.lineTo(110,256);c.closePath();c.fill();
      }
      doodles['scrubber-wiped-'+stage]=frame;
    }
    const sheet=name==='sprinter-animations'?{type:'sprinter',rows:2,count:8}:name==='boss-animations'?{type:'boss',rows:4,count:16}:name==='grunt-animations'?{type:'grunt',rows:4,count:16}:name==='fast-animations'?{type:'fast',rows:2,count:8}:name==='sniper-animations'?{type:'sniper',rows:3,count:12}:null;
    if(sheet){
      // Crop equal cells once at load; draw/tint cached frames without allocations.
      for(let i=0;i<sheet.count;i++){
        const frame=document.createElement('canvas');frame.width=160;frame.height=sheet.type==='boss'?Math.round(160*image.naturalHeight/image.naturalWidth):sheet.type==='sprinter'?Math.round(160*image.naturalHeight*4/(image.naturalWidth*sheet.rows)):160;
        frame.naturalWidth=frame.width;frame.naturalHeight=frame.height;
        frame.getContext('2d').drawImage(image,(i%4)*image.naturalWidth/4,Math.floor(i/4)*image.naturalHeight/sheet.rows,image.naturalWidth/4,image.naturalHeight/sheet.rows,0,0,frame.width,frame.height);
        doodles[sheet.type+'-frame-'+i]=frame;
      }
    }
    if(name==='stevie-threats')for(let i=0;i<2;i++){
      const frame=document.createElement('canvas');frame.width=128;frame.height=136;
      frame.naturalWidth=128;frame.naturalHeight=136;
      frame.getContext('2d').drawImage(image,i*image.naturalWidth/2,0,image.naturalWidth/2,image.naturalHeight,0,0,128,136);
      doodles[i?'stevie-cover':'stevie-concerned']=frame;
    }
    for(const img of document.querySelectorAll('img'))if(img.complete&&!img.naturalWidth&&img.getAttribute('src')?.split('?')[0]==='assets/art/'+name+'.png')img.src=image.src;
    record.loading=false;record.failed=false;syncArtworkUI();
    inkSprites.clear();
  };
  image.onerror=()=>{record.loading=false;record.failed=true;syncArtworkUI();if(record.retries<2){record.retries++;setTimeout(()=>loadDoodle(name,true),record.retries*400);}};
  image.src='assets/art/'+name+'.png'+(artworkVersion?'?v='+artworkVersion:'')+(retry?(artworkVersion?'&':'?')+'artRetry='+record.attempt:'');
}
if(artworkSupported)for(const name of doodleNames)loadDoodle(name);
game.dom.$('retryArtworkBtn').onclick=retryArtwork;syncArtworkUI();
// One SVG coordinate system drives both the visible stroke and its physical nib.
const menuPath=game.dom.$('splashInkPath'),menuPencil=document.querySelector?.('.splash-pencil');
const menuStrokes=document.querySelectorAll('.splash-ink-stroke');
const menuFire=game.dom.$("splashLineFire");
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
 // Ignite behind the nib once it passes this spot, then settle into a flicker.
 if(menuFire){
  const anchor=menuPath.getPointAtLength(menuLength*.28),ignite=1.2+3.6*.28;
  const age=phase-ignite,appear=motionReduced?1:Math.max(0,Math.min(1,age/.22));
  const fade=motionReduced?1:Math.min(1,(18-phase)/.65);
  const pop=motionReduced?1:1+Math.sin(Math.min(1,Math.max(0,age)/.4)*Math.PI)*.38;
  menuFire.setAttribute('transform','translate('+anchor.x+' '+anchor.y+') scale('+(appear*pop)+')');
  menuFire.setAttribute('opacity',String(appear*Math.max(0,fade)));
 }
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
    m={x:e.x,y:e.y,phase:(motionSerial++%13)*.47,heavy,hop:heavy?.7:e.type==='basil'?3.2:e.type==='fast'||e.type==='mini'?2.8:1.5,hitAge:1,lastHit:-1,birthAge:1,actionAge:1,walkAge:0,gruntFrame:0,runDistance:0,fastFrame:0,sniperFrame:8,kingFrame:0,action:null,readyUntil:-1,sprite:null,facing:game.state.player.x<e.x?-1:1,actionFacing:1,cue:null,cueProgress:0,pose:{...stillEnemyPose}};enemyMotion.set(e,m);
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
  if(e.introFrame!==undefined&&doodles['boss-frame-0'])return 'boss-frame-'+e.introFrame;
  if(e.type==='sprinter'&&doodles['sprinter-frame-0'])return 'sprinter-frame-'+(motionReduced?0:(enemyMotion.get(e)?.dashFrame||0));
  if(game.api.isFirstBoss(e)&&doodles['boss-frame-0'])return motionReduced?null:'boss-frame-'+(enemyMotion.get(e)?.kingFrame||0);
  if(e.type==='sniper'&&doodles['sniper-frame-0'])return 'sniper-frame-'+(motionReduced?8:(enemyMotion.get(e)?.sniperFrame??8));
  if(e.type==='fast'&&doodles['fast-frame-0']){const m=enemyMotion.get(e),facing=m?.facing??(game.state.player.x<e.x?-1:1);return 'fast-frame-'+((facing<0?4:0)+(motionReduced?0:(m?.fastFrame||0)))}
  if(e.type==='grunt'&&doodles['grunt-frame-0'])return 'grunt-frame-'+(motionReduced?0:(enemyMotion.get(e)?.gruntFrame||0));
  return null;
}
// Native profile direction: Staple Snack's open jaws point left; the other
// profile monsters point right. Front-facing silhouettes keep their artwork.
const profileDirections={wallpuller:1,papertearer:1,scrubber:1,fast:1,sprinter:1,flanker:1,mini:1,basil:1,jamling:1,sniper:1,stapler:-1};
function enemyFacing(e){
  const m=enemyMotion.get(e);
  if(e.type==='sniper'&&(m?.action==='fire'&&m.actionAge<.3||e.shootCd<=.6&&game.api.sniperCanAim(e)))return game.state.player.x<e.x?-1:1;
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
    if(e.type==='sprinter'&&e.freeze<=0&&e.stun<=0){if(moving)m.runDistance=(m.runDistance+Math.min(distance,e.r*2))%48;m.dashFrame=e.hurdle?4+Math.min(3,Math.floor(e.hurdle.age/e.hurdle.duration*4)):e.dashLanding>0?7:moving?Math.floor(m.runDistance/12):0;}
    if(e.type==='sniper'&&e.freeze<=0&&e.stun<=0){
      if(moving)m.runDistance=(m.runDistance+Math.min(distance,e.r*2))%48;
      m.sniperFrame=m.action==='fire'&&m.actionAge<.3?(m.actionAge<.09?6:7):e.shootCd<=.6&&game.api.sniperCanAim(e)?(e.shootCd<.25?5:4):moving?Math.floor(m.runDistance/12):8;
    }
    if(game.api.isFirstBoss(e)&&e.freeze<=0&&e.stun<=0){
      const b=game.api.bossBrain(e);
      if(m.action==='king-return'&&m.actionAge<1.25)m.kingFrame=12+Math.min(3,Math.floor(m.actionAge/1.25*4));
      else if(b.cast){const t=game.api.clamp(1-b.cast.left/(b.cast.duration||1.2),0,1);m.kingFrame=4+Math.min(3,Math.floor(t*4));}
      else if(b.action&&['mirror-orb','arc-fan','paper-lob','friend-fling'].includes(b.action.kind)&&b.action.age<.48)m.kingFrame=8+Math.min(3,Math.floor(b.action.age/.48*4));
      else if(moving){m.runDistance=(m.runDistance+Math.min(distance,e.r*2))%(e.r*2);m.kingFrame=Math.floor(m.runDistance/(e.r*.5));}
      else m.kingFrame=0;
    }
    if(moving)m.phase=(m.phase+Math.min(distance,e.r)* (heavy?.16:.27))%(Math.PI*2);
    const step=moving?Math.sin(m.phase):0,hop=moving?Math.abs(step)*m.hop:0;
    const hit=m.hitAge<.14?Math.sin(m.hitAge/.14*Math.PI)*.12:0;
    const birth=m.birthAge<.28?Math.sin(m.birthAge/.28*Math.PI):0;
    const p=m.pose;p.x=0;p.y=-hop-birth*5;p.angle=step*(heavy?.035:.055);
    p.sx=1+hit+birth*.14;p.sy=1-hit-birth*.1;
    m.sprite=null;
    if(e.type==='scrubber'&&e.freeze<=0&&e.stun<=0&&m.action==='strike'&&m.actionAge<.3){p.x+=Math.sin(m.actionAge*60)*3;p.angle+=Math.sin(m.actionAge*40)*.12;}
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
    if(e.crew&&!motionReduced&&e.freeze<=0&&e.stun<=0){const c=e.crew;if(c.phase==='hook'||c.phase==='pull'){p.angle-=m.facing*(c.phase==='pull'?.2:.1);p.sx+=.08;p.sy-=.08;}else if(c.phase==='tear'){p.y+=4;p.sy-=.14;p.sx+=.12;}else if(c.phase==='bomb')p.angle-=m.facing*.18;}
    if(e.eraseStumble>0&&e.freeze<=0&&!motionReduced){const skid=game.api.clamp(e.eraseStumble/1.4,0,1);p.angle+=m.facing*.7*skid;p.y+=4*skid;p.sx+=.15*skid;p.sy-=.15*skid;}
    if(e.freeze>0||e.stun>0)continue;
    // Distinct silhouettes reuse the existing art. These offsets never touch
    // enemy coordinates, attack timers, damage, or the combat random stream.
    if(e.type==='sniper'){
      if(e.sniperErase){m.cue='erase';m.cueProgress=Math.min(1,e.sniperErase.age/.7);p.angle+=m.facing*Math.sin(motionTime*24)*.13;p.x+=Math.sin(motionTime*24)*3;}
      const facing=enemyFacing(e);
      if(m.action==='fire'&&m.actionAge<.3){const recoil=Math.sin(m.actionAge/.3*Math.PI);p.x-=facing*recoil*3;p.angle-=facing*recoil*.12;p.sx+=recoil*.1;p.sy-=recoil*.08}
      else if(e.shootCd<=.6&&game.api.sniperCanAim(e)){const aim=game.api.clamp(1-e.shootCd/.6,0,1);p.x-=facing*aim*2;p.angle-=facing*aim*.08;p.sx+=aim*.07;p.sy-=aim*.05}
      else if(moving){p.angle+=m.facing*.08;p.y-=Math.abs(step)*1.2}
    }
    if(e.type==='jamling'){if(moving){p.y-=Math.abs(step)*2;p.angle+=step*.16;p.sx+=step*.08;p.sy-=step*.08}if(e.jamWarning>0){p.sx+=e.jamWarning*.18;p.sy-=e.jamWarning*.14;p.angle+=Math.sin(motionTime*15)*.05}}
    if(moving&&e.type==='flanker'){p.angle+=m.facing*(e.sneakDetour?.2:.12);p.y-=Math.abs(step)*(e.sneakDetour?2.5:1.6);p.sx+=step*.06;p.sy-=step*.04}
    if(e.type==='splitter'){p.angle+=Math.sin(motionTime*5+m.phase)*.08;p.sx+=Math.abs(Math.sin(motionTime*3+m.phase))*.1;if(e.twiceyDizzy>0){p.y+=3;p.angle+=Math.sin(motionTime*12)*.16;p.sy-=.12;}}
    if(e.twicey?.phase==='warn'){p.sx+=.18;p.sy-=.14;p.angle-=m.facing*.15;}
    if(e.twicey?.phase==='dash'){p.angle+=m.facing*.25;p.sx+=.2;p.sy-=.12;}
    if(moving&&(e.type==='fast'||e.type==='mini')){p.angle+=m.facing*.09;p.sx+=step*.05;p.sy-=step*.05;}
    if(moving&&e.type==='grunt'&&!doodles['grunt-frame-0']){p.sx+=step*.035;p.sy-=step*.035;}
    if(e.type==='boss'&&game.api.isFirstBoss(e)){
      const brain=game.api.bossBrain(e);
      if(brain.recovery>0){p.angle-=.24;p.sx+=.1;p.sy-=.14;p.y+=4;p.x+=Math.sin(brain.recovery*9)*1.5}
      else if(brain.cast){const ready=1-brain.cast.left/(brain.cast.duration||1.2);p.sx+=ready*.08;p.sy-=ready*.08;p.angle+=Math.sin(ready*Math.PI)*.07}
    }
    if(e.type==='tank'&&e.chonks){
      const c=e.chonks,face=c.facing;
      if(c.phase==='windup'){const t=1-c.windup/.65;m.cue='belly-ready';m.cueProgress=t;p.x-=face*t*3;p.sx+=t*.18;p.sy-=t*.18;p.y+=t*3;p.angle-=face*t*.12}
      else if(c.phase==='recover'){const t=1-c.recovery/c.recoveryTotal,stand=game.api.clamp((t-.65)/.35,0,1),flop=Math.sin(Math.min(1,t/.2)*Math.PI);m.cue='belly-recover';m.cueProgress=t;p.x-=face*flop*4;p.y+=(1-stand)*5;p.angle+=face*((1-stand)*.22+flop*.3);p.sx+=(1-stand)*.17;p.sy-=(1-stand)*.22;if(m.action==='belly-bump'&&m.actionAge<.14){const bump=Math.sin(m.actionAge/.14*Math.PI);p.x+=face*bump*6;p.sx+=bump*.12;p.sy-=bump*.06}}
      else if(moving){m.cue='waddle';p.angle+=step*.13;p.x+=Math.sin(m.phase-.7)*1.8;p.y-=Math.abs(step)*1.5;p.sx+=Math.sin(m.phase-1)*(.04+c.momentum*.05);p.sy-=Math.sin(m.phase-1)*.04}
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
      if(e.hurdle){const t=e.hurdle.age/e.hurdle.duration;m.cue='dash';p.y-=Math.sin(t*Math.PI)*30;p.angle+=m.facing*Math.sin(t*Math.PI)*.2;p.sx+=Math.sin(t*Math.PI)*.12;}
      else if(e.dashLanding>0){const t=e.dashLanding/.28;m.cue='slam';m.cueProgress=t;p.sx+=t*.18;p.sy-=t*.18;}
      else if(moving&&e.dashTime<2.1){m.cue='dash';p.angle+=m.facing*.12;p.y-=Math.abs(step)*2;}
      if(e.dashTime>=2.6&&moving){m.cue='dash';p.x=m.facing*2;p.angle=m.facing*.22;p.sx+=.15;p.sy-=.12;}
      else if(e.dashTime>2.1&&e.dashTime<2.6){
        const charge=(e.dashTime-2.1)/.5;m.cue='charge';m.cueProgress=charge;
        p.y+=charge*2;p.sx+=charge*.16;p.sy-=charge*.18;p.angle-=m.facing*charge*.1;
      }
    }else if(e.type==='stapler'){
      const brain=e.waveBoss?game.api.bossBrain(e):null;
      if(brain?.staple?.rush){m.cue='dash';p.angle+=m.facing*.2;p.sx+=.18;p.sy-=.16}
      if(brain?.staple?.hop){const t=brain.staple.hop.age/brain.staple.hop.duration;p.angle+=m.facing*Math.sin(t*Math.PI)*.25;p.sx+=Math.sin(t*Math.PI)*.12;p.sy-=Math.sin(t*Math.PI)*.1}
      if(brain?.staple?.transition>0){p.angle+=Math.sin(motionTime*15)*.09;p.sx+=.1;p.sy-=.08}
      if(brain?.recovery>0){p.angle-=.15;p.sy+=.08}
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
  const action=e.type==='scrubber'&&e.eraseHits?'scrubber-wiped-'+Math.min(2,e.eraseHits):enemySpriteFrame(e)||enemyActionFrame(e),name=doodles[action]?action:e.type,image=doodles[name];if(!image)return false;
  const framed=/^(grunt|fast|sprinter|sniper|boss)-frame-/.test(name),base=framed?image:doodles[e.type]||image;
  const ctx=game.dom.ctx,colors=enemyStatusColors(e),width=e.r*(['wallpuller','papertearer'].includes(e.type)?3.6:e.type==='sprinter'?3.4:name.startsWith('sniper-frame-')?3.8:name.startsWith('fast-frame-')?4:name.startsWith('boss-frame-')?3:framed?3.25:e.type==='sniper'?3.4:e.type==='scrubber'?3.8:2.7),height=width*base.naturalHeight/base.naturalWidth;
  const left=-width*(e.type==='sniper'?.4:.5),top=-height*.54;
  const pose=enemyAnimationPose(e);
  ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);
  // Squash around the feet so hit reactions remain small and planted.
  const foot=top+height;ctx.translate(0,foot);ctx.scale(pose.sx,pose.sy);ctx.translate(0,-foot);
  if(profileDirections[e.type]&&!name.startsWith('fast-frame-')&&enemyFacing(e)!==profileDirections[e.type])ctx.scale(-1,1);
  // Damage never fades the body: health belongs in the separate bar.
  if(e.type==='splitter'||e.type==='mini'&&e.twicey)drawTwiceyBody(ctx,e,left,top,width,height,colors);
  else if(e.type==='tank'&&e.chonks&&!motionReduced)drawChonksBody(ctx,tintedDoodle(name,colors),e,left,top,width,height);
  else {ctx.save();if(e.type==='sniper'&&e.sniperErase)ctx.scale(-1,1);ctx.drawImage(tintedDoodle(name,colors),left,top,width,height);ctx.restore();}
  if(e.type==='sniper'&&e.sniperErase){ctx.save();const q=e.sniperErase;ctx.strokeStyle='#b77991';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x-e.x,q.y-e.y,10,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,q.age/.7));ctx.stroke();for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(q.x-e.x-4+i*5,q.y-e.y+8);ctx.lineTo(q.x-e.x-2+i*5,q.y-e.y+11);ctx.stroke();}ctx.restore();}
  if(e.waveBoss&&e.type==='stapler'&&e.hp/e.maxHp<=.35){ctx.strokeStyle='#4b3228';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-e.r);ctx.lineTo(2,-e.r+12);ctx.lineTo(-4,-e.r+18);ctx.lineTo(8,-e.r+30);ctx.stroke()}
  ctx.restore();
  if(showHealth)drawEnemyHealthBar(e,hpRatio,colors);
  if(e.type==='tank'&&e.chonks)drawChonksWarning(e);
  if(e.type==='splitter'||e.twicey)drawTwiceyCue(e);
  return true;
}
// Twicey's original two-eyed doodle becomes two expressive, independent halves.
function drawTwiceyBody(ctx,e,left,top,width,height,colors){
 const image=tintedDoodle('splitter',e.twicey?.role==='runner'&&!colors.length?['#d35451']:colors),iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 const active=!motionReduced&&e.freeze<=0&&e.stun<=0,t=active?motionTime:0;
 if(e.type==='splitter'){
  for(let i=0;i<2;i++){
   const side=i?1:-1,wriggle=active?Math.sin(t*6+i*Math.PI)*1.7:0,gap=active?Math.abs(Math.sin(t*3))*2:0;
   ctx.save();ctx.translate(side*gap,wriggle);ctx.rotate(active?side*Math.sin(t*4)*.045:0);
   ctx.drawImage(image,i*iw/2,0,iw/2,ih,left+i*width/2,top,width/2,height);ctx.restore();
  }
  ctx.strokeStyle='#f6e5a0';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(0,-e.r*.85);ctx.lineTo(0,e.r*.85);ctx.stroke();ctx.setLineDash([]);
 }else{
  const runner=e.twicey.role==='runner',i=runner?0:1;
  ctx.drawImage(image,i*iw/2,0,iw/2,ih,-width*.4,top,width*.8,height);
  ctx.strokeStyle=runner?'#b84439':'#673596';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,e.r+2,0,Math.PI*2);ctx.stroke();
  // Mouths make the roles readable without depending solely on color.
  ctx.beginPath();if(runner){ctx.arc(0,e.r*.5,3,0,Math.PI);ctx.stroke();}
  else{ctx.moveTo(-4,e.r*.4);ctx.lineTo(-2,e.r*.7);ctx.lineTo(0,e.r*.4);ctx.lineTo(2,e.r*.7);ctx.lineTo(4,e.r*.4);ctx.stroke();}
  if(e.twicey.phase==='reunite'){
   const wave=active?Math.sin(t*13)*3:0;ctx.beginPath();ctx.moveTo(width*.35,0);ctx.lineTo(width*.65,-5);ctx.lineTo(width*.7+wave,-11);ctx.stroke();
  }
 }
}
function drawTwiceyCue(e){
 const ctx=game.dom.ctx,c=e.twicey;ctx.save();ctx.lineWidth=2;
 if(c?.phase==='warn'){
  ctx.strokeStyle='#b84439';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(c.dx*65,c.dy*65);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(0,0,e.r+6,0,Math.PI*2*(1-c.timer/.7));ctx.stroke();
 }
 if(c?.phase==='reunite'&&c.role==='runner'){
  const partner=game.api.twiceyPartner(e);
  if(partner){ctx.strokeStyle='#754a9a';ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(partner.x-e.x,partner.y-e.y);ctx.stroke();ctx.setLineDash([]);}
 }
 if(e.twiceyDizzy>0){
  ctx.strokeStyle='#b08a27';for(let i=0;i<3;i++){const a=i*Math.PI*2/3+(motionReduced?0:motionTime*4),x=Math.cos(a)*(e.r+4),y=-e.r-9+Math.sin(a)*3;ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x+2,y);ctx.moveTo(x,y-2);ctx.lineTo(x,y+2);ctx.stroke();}
 }
 ctx.restore();
}

// Separate feet from the same doodle so the heavy waddle has real alternating steps.
function drawChonksBody(ctx,image,e,left,top,width,height){
 const m=enemyMotion.get(e),c=e.chonks,phase=m?.phase||0,walking=c.phase==='walk'&&m?.cue==='waddle',recover=c.phase==='recover';
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 for(let i=0;i<2;i++){const step=Math.sin(phase+i*Math.PI),lift=walking?Math.max(0,step)*3:recover?Math.sin(c.recovery*8+i)*1.5:0,shift=walking?step*1.6:recover?(i?2:-2):0;
  ctx.drawImage(image,i*iw/2,ih*.8,iw/2,ih*.2,left+i*width/2+shift,top+height*.8-lift,width/2,height*.2);
 }
 ctx.drawImage(image,0,0,iw,ih*.88,left,top,width,height*.88);
 if(walking){ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#a98b67';for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(left+width*(i?.78:.22)-c.facing*4,top+height+1,2+Math.abs(Math.sin(phase))*2,1,0,0,Math.PI*2);ctx.fill()}ctx.restore()}
}
function drawChonksWarning(e){
 const ctx=game.dom.ctx,c=e.chonks;ctx.save();
 if(c.phase==='windup'){ctx.strokeStyle='#b16a23';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,e.r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-c.windup/.65));ctx.stroke();ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillStyle='#85501e';ctx.fillText('BELLY BUMP',0,-e.r-22)}
 else if(c.phase==='walk'&&c.momentum>.05){ctx.fillStyle='#e0bd80';ctx.fillRect(-12,e.r+7,24,3);ctx.fillStyle=c.momentum>.7?'#b6532c':'#a87633';ctx.fillRect(-12,e.r+7,24*c.momentum,3)}
 ctx.restore();
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
  game.api.cancelLessonGesture?.();game.api.cancelDrawingInput?.();
  const r=game.dom.canvas.getBoundingClientRect();
  game.state.dpr=Math.min(2,window.devicePixelRatio||1);
  game.dom.canvas.width=Math.floor(r.width*game.state.dpr);game.dom.canvas.height=Math.floor(r.height*game.state.dpr);
  const dx=(r.width-game.state.W)/2,dy=(r.height-game.state.H)/2;
  if(dx||dy){
    // Keep combat distances unchanged through browser chrome/fullscreen changes.
    const move=p=>{p.x+=dx;p.y+=dy;if(Number.isFinite(p.originX))p.originX+=dx;if(Number.isFinite(p.originY))p.originY+=dy};
    const movedCharges=new Set();
    for(const wall of game.state.walls){wall.pts=wall.pts.map(p=>({x:p.x+dx,y:p.y+dy}));if(wall.rockCharge&&!movedCharges.has(wall.rockCharge)){movedCharges.add(wall.rockCharge);wall.rockCharge.x+=dx;wall.rockCharge.y+=dy;}if(wall.stitchPoints)wall.stitchPoints=wall.stitchPoints.map(p=>({x:p.x+dx,y:p.y+dy}));}
    if(game.state.currentWall)game.state.currentWall=game.state.currentWall.map(p=>({x:p.x+dx,y:p.y+dy}));
    for(const collection of [game.state.enemies,game.state.projectiles,game.state.enemyShots,game.state.particles,game.state.floaters])for(const item of collection)move(item);
    game.api.moveLaunchEffects(dx,dy);game.api.moveEnemyTactics(dx,dy);game.api.movePaper(dx,dy);game.api.moveHardhatCrew(dx,dy);game.api.moveDoodleScraps(dx,dy);
    for(const e of game.state.enemies){const m=enemyMotion.get(e);if(m){m.x+=dx;m.y+=dy}}
    for(const echo of splitEchoes)move(echo);
    game.api.moveAbilityEffects(dx,dy);
    game.api.movePlaguefire(dx,dy);game.api.moveWaveFinale(dx,dy,r.width,r.height);
    game.api.moveRefuge(dx,dy);game.api.moveSupportInkVisuals(dx,dy);game.api.moveBossFields(dx,dy);
  }
  game.state.W=r.width;game.state.H=r.height;game.dom.ctx.setTransform(game.state.dpr,0,0,game.state.dpr,0,0);
  game.state.player.x=game.state.W/2;game.state.player.y=game.state.H/2;game.api.refreshBossArrival();game.api.moveFirstLesson?.(dx,dy);
}


/* Sample by stroke distance, not pointer-event count. Cache outside game state:
   rendering never spends ink, changes collisions, or consumes combat randomness. */
const wallSamples = new WeakMap();
function textureSamples(points,count){
  if(wallSamples.get(points)?.count===count)return wallSamples.get(points).samples;
  let length=0;
  const segments=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y);
    if(len>0){segments.push({a,b,len,start:length});length+=len;}
  }
  const samples=[],spacing=length/count;
  let segment=0;
  for(let i=0;i<count&&length>0;i++){
    const d=(i+.5)*spacing;
    while(segment<segments.length-1&&d>segments[segment].start+segments[segment].len)segment++;
    const s=segments[segment],t=(d-s.start)/s.len;
    samples.push({x:s.a.x+(s.b.x-s.a.x)*t,y:s.a.y+(s.b.y-s.a.y)*t,angle:Math.atan2(s.b.y-s.a.y,s.b.x-s.a.x)});
  }
  wallSamples.set(points,{count,length,samples});
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
  const length=wallSamples.get(points)?.length??points.reduce((sum,p,i)=>sum+(i?Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y):0),0);
  // Longer walls repeat each element at most three times, with eighteen glyphs
  // total. Space elements along the stroke instead of piling them at each mark.
  const repeats=Math.min(3,Math.max(1,Math.ceil(Math.sqrt(length/200))));
  const samples=textureSamples(points,Math.max(active.length,Math.min(18,active.length*repeats)));
  ctx.save();ctx.globalAlpha=opacity;ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=0;i<samples.length;i++){
    const p=samples[i];
    {
      const k=i%active.length;
      const kind=active[k],level=Math.min(3,inks[kind]);
      // Stagger each element along the stroke, then alternate its side.
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
      ctx.translate(0,i%2?thick/2+3:-thick/2-3);
      if(i%2===0)ctx.rotate(Math.PI);
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
  const intro=game.api.firstBossIntroPose(),entry=game.api.stapleIntroPose(),focus=intro||game.api.wobbleIntroPose()||entry;
  const camera=focus?{zoom:focus.zoom,x:game.api.clamp(focus.x,game.state.W/(2*focus.zoom),game.state.W-game.state.W/(2*focus.zoom)),y:game.api.clamp(focus.y,game.state.H/(2*focus.zoom),game.state.H-game.state.H/(2*focus.zoom))}:game.api.waveFinaleCamera();game.dom.ctx.translate(game.state.W/2,game.state.H/2);game.dom.ctx.scale(camera.zoom,camera.zoom);game.dom.ctx.translate(-camera.x,-camera.y);
  game.dom.ctx.strokeStyle='rgba(212,76,76,.35)';game.dom.ctx.lineWidth=2;
  game.dom.ctx.beginPath();game.dom.ctx.moveTo(47,0);game.dom.ctx.lineTo(47,game.state.H);game.dom.ctx.stroke();

  game.api.drawPaper();game.api.drawDoodleScraps();
  game.api.drawPlaguefire();
  game.api.drawLaunchGround();

  for(const w of game.state.walls){
    const hpRatio=game.api.clamp(w.hp/w.maxHp,0,1);
    const lifeRatio=game.api.clamp(w.life/w.maxLife,0,1);
    const visualRatio=Math.min(hpRatio,lifeRatio);
    let col='#343638';
    if(!w.wobbleBumper&&game.state.inks.chaos>0)col=`hsl(${(performance.now()/30+w.hp)%360},55%,30%)`;
    drawToolStroke(w.pts,w.thick,.08+.92*visualRatio,col);

    if(!w.wobbleBumper)drawWallTextures(w.pts,w.thick,.08+.92*visualRatio);else continue;
    if(w.stitchPoints){const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle='#b37b32';ctx.lineWidth=2;ctx.globalAlpha=.85;for(const p of w.stitchPoints){if(!w.pts.slice(1).some((q,i)=>game.api.pointSegDist(p.x,p.y,w.pts[i].x,w.pts[i].y,q.x,q.y)<2))continue;ctx.beginPath();ctx.moveTo(p.x-4,p.y-5);ctx.lineTo(p.x+4,p.y+5);ctx.moveTo(p.x+4,p.y-5);ctx.lineTo(p.x-4,p.y+5);ctx.stroke();}ctx.restore();}
    if(w.rockCharge?.life>0){
      const ctx=game.dom.ctx,c=w.rockCharge;ctx.save();ctx.strokeStyle='#628fff';ctx.lineWidth=3;ctx.globalAlpha=Math.min(1,c.life)*.8;
      for(let i=1;i<w.pts.length;i++){const a=w.pts[i-1],b=w.pts[i],cuts=game.api.eraserIntervals(a,b,c,c,48);for(const [lo,hi] of cuts){ctx.beginPath();ctx.moveTo(a.x+(b.x-a.x)*lo,a.y+(b.y-a.y)*lo);ctx.lineTo(a.x+(b.x-a.x)*hi,a.y+(b.y-a.y)*hi);ctx.stroke();}}
      ctx.restore();
    }
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
  if(game.state.currentWall&&game.state.currentWall.length>1&&!game.api.liveWallActive()){
    // The preview grows in place; refresh both presentation caches.
    wallSamples.delete(game.state.currentWall);graphiteGrain.delete(game.state.currentWall);
    drawToolStroke(game.state.currentWall,game.state.stats.lineWidth,.72,'#343638');
    drawWallTextures(game.state.currentWall,game.state.stats.lineWidth,.72)
  }

  // Ranged threats are readable before and after firing.
  game.api.drawSparkGaps();game.api.drawHardhatCrew();
  game.api.drawWallExplosions();
  drawSplitAnimations();
  for(const e of game.state.enemies){
    if(game.api.underPaper(e)||e.type!=='sniper'||e.hp<=0||e.stun>0||e.freeze>0||e.shootCd>.6||
      !game.api.sniperCanAim(e))continue;
    const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle='#3562be';ctx.lineWidth=2;ctx.globalAlpha=.65;
    ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(game.state.player.x,game.state.player.y);ctx.stroke();
    ctx.setLineDash([]);ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  game.api.drawBossEncounters();game.api.drawWobbleFields();
  for(const n of game.state.enemies)if(n.type==='jamling'&&n.jamWarning>0){const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle='#b34936';ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.x,n.y,n.r+5,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,n.jamWarning/1.3));ctx.stroke();ctx.restore()}
  for(const shot of game.state.enemyShots){
    if(shot.wobbleOwner){const ctx=game.dom.ctx;ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(Math.atan2(shot.vy,shot.vx));if(!motionReduced){ctx.strokeStyle='rgba(173,110,40,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(-5,0);ctx.stroke()}ctx.fillStyle='#edb538';ctx.strokeStyle='#3b3024';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-13,-4);ctx.lineTo(-11,0);ctx.lineTo(-13,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();continue}
    if(shot.owner){game.api.drawFirstBossShot(shot);continue}
    const ctx=game.dom.ctx;ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(Math.atan2(shot.vy,shot.vx));
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
    // Normal enemy shots are Pew-Pew's pencils. Keep the nib on the unchanged
    // collision point; the shaft trails behind it just like the old arrow.
    if(shot.reflected){ctx.strokeStyle='#278f82';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-36,0);ctx.lineTo(-29,0);ctx.stroke()}
    ctx.fillStyle=shot.reflected?'#7dc7a0':'#efc84c';ctx.strokeStyle='#29343b';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-6,-3);ctx.lineTo(-25,-3);ctx.lineTo(-25,3);ctx.lineTo(-6,3);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#e4bb8c';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-6,-3);ctx.lineTo(-6,3);ctx.closePath();ctx.fill();ctx.fillStyle='#29343b';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-2,-1);ctx.lineTo(-2,1);ctx.closePath();ctx.fill();ctx.fillStyle='#db8c91';ctx.fillRect(-28,-3,3,6);ctx.strokeRect(-28,-3,3,6);ctx.strokeStyle='#aa852d';ctx.beginPath();ctx.moveTo(-23,0);ctx.lineTo(-7,0);ctx.stroke();ctx.restore();continue;

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
    if(game.api.underPaper(e)){game.api.drawPaperBump(e);continue;}
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
    game.dom.ctx.save();game.dom.ctx.translate(e.x,e.y-game.api.enemyFlightHeight(e)-game.api.wobbleToothHeight(e)-(game.api.isStapleBoss(e)&&!motionReduced?game.api.stapleHopHeight(e):0));
    if(e.flight&&!motionReduced){const t=e.flight.age/e.flight.duration;game.dom.ctx.rotate(e.flight.spin*Math.sin(t*Math.PI)*.8);const scale=1+Math.sin(t*Math.PI)*.16;game.dom.ctx.scale(scale,scale);}

    if(e.type==='wobblechomp'){game.api.drawWobbleEnemy(e);drawEnemyHealthBar(e,hpRatio);}
    else if(e.type==='wobble-tooth'){game.api.drawWobbleTooth(e);drawEnemyHealthBar(e,hpRatio);}
    else if(e.type==='eraser'){
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
    if(e.eraseStumble>0){const ctx=game.dom.ctx;ctx.save();ctx.strokeStyle="#a56930";ctx.lineWidth=2;for(let i=0;i<3;i++){const angle=i*Math.PI*2/3;ctx.beginPath();ctx.arc(Math.cos(angle)*(e.r+6),-e.r-7+Math.sin(angle)*4,2,0,Math.PI*2);ctx.stroke();}ctx.restore();}
    drawEnemyActionMarks(e);
    game.dom.ctx.restore();
  }

  const scrubberCue=game.api.scrubberHintSnapshot();
  if(scrubberCue){const ctx=game.dom.ctx,x=game.api.clamp(scrubberCue.x,48,game.state.W-48),y=game.api.clamp(scrubberCue.y-50,90,game.state.H-50);ctx.save();ctx.fillStyle='#fff4cd';ctx.strokeStyle='#456238';ctx.lineWidth=2;ctx.fillRect(x-43,y-14,86,25);ctx.strokeRect(x-43,y-14,86,25);ctx.fillStyle='#29462c';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('Erase ×'+scrubberCue.rubsLeft+'!',x,y+3);ctx.beginPath();ctx.moveTo(x,y+11);ctx.lineTo(scrubberCue.x,scrubberCue.y-20);ctx.stroke();ctx.restore();}
  game.api.drawDoodleTricks();game.api.drawPaperTricks();
  for(const p of game.state.projectiles){
    const ctx=game.dom.ctx,colors={fire:'#c25a30',electric:'#386ac3',poison:'#528237',frost:'#387f98',eraser:'#ae537a',ink:'#25283b'},owned=Object.keys(p.doodlePayload||{}).filter(k=>colors[k]),color=colors[p.paperElement]||({cling:colors.electric,ash:colors.fire,influence:colors.fire,bubble:colors.poison,dots:'#a758a3',underline:'#40856a'}[p.paperElement]);
    ctx.save();ctx.translate(p.x,p.y);if(p.scale)ctx.scale(p.scale,p.scale);if(p.paperMode==='perch'){ctx.strokeStyle='#438e5e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(0,11);ctx.moveTo(0,7);ctx.lineTo(-5,4);ctx.stroke();}if(owned.length>1){owned.forEach((k,i)=>{ctx.strokeStyle=colors[k];ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,8,i/owned.length*Math.PI*2,(i+.8)/owned.length*Math.PI*2);ctx.stroke();});}if(p.rail){ctx.strokeStyle='#40856a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-p.vx/p.speed*13,-p.vy/p.speed*13);ctx.lineTo(0,0);ctx.stroke();}ctx.fillStyle=p.doodlePayload?.ink?'#25283b':'#fffaf0';ctx.strokeStyle=color||'#6d655b';ctx.lineWidth=color?2:1.5;ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(-2,-5);ctx.lineTo(3,-4);ctx.lineTo(5,0);ctx.lineTo(2,5);ctx.lineTo(-4,3);ctx.closePath();ctx.fill();ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,-2);ctx.lineTo(1,1);ctx.lineTo(3,-2);ctx.moveTo(1,1);ctx.lineTo(0,4);ctx.stroke();ctx.restore();
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
    const e={type:'boss',introFrame:intro.frame,r:28,hp:1,maxHp:1,freeze:0,stun:0,burn:0,poison:0,charged:0,gravitySlow:0};
    if(!drawDoodleEnemy(e,1,false)){ctx.fillStyle='#962f3d';ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.fill()}
    if(intro.stage==='roar'){ctx.fillStyle='#962f3d';ctx.font='bold 23px "Stevie Pencil",cursive';ctx.textAlign='center';ctx.fillText('ROOOAR!',0,-65)}
    if(intro.stage==='smash'){ctx.strokeStyle='#b17635';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,40+(intro.age-6.132)*game.state.W*3,0,Math.PI*2);ctx.stroke()}
    ctx.restore();
  }
  const wobbleIntro=game.api.wobbleIntroPose();
  if(wobbleIntro){const ctx=game.dom.ctx,m=DoodleDefender.WobblechompRig.create();m.time=wobbleIntro.age+1;m.reaction=wobbleIntro.stage==='roar'?1:0;ctx.save();ctx.translate(wobbleIntro.x,wobbleIntro.y);game.api.drawWobbleEnemy({x:wobbleIntro.x,y:wobbleIntro.y},m);if(wobbleIntro.stage==='roar'){ctx.fillStyle='#966425';ctx.font='bold 22px "Stevie Pencil",cursive';ctx.textAlign='center';ctx.fillText('WOBBLECHOMP!',0,-85)}ctx.restore();}
  const stapleIntro=game.api.stapleIntroPose();
  if(stapleIntro){
    const ctx=game.dom.ctx;ctx.save();ctx.translate(stapleIntro.x,stapleIntro.y);ctx.strokeStyle='#7d5834';ctx.fillStyle='#453c32';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(0,12,43,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#9c8b73';
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*20-10,5);ctx.lineTo(i*20-10,-14);ctx.lineTo(i*20+10,-14);ctx.lineTo(i*20+10,5);ctx.stroke()}
    if(stapleIntro.stage!=='punch'){ctx.save();ctx.scale(stapleIntro.scale,stapleIntro.scale);ctx.rotate(stapleIntro.angle);drawDoodleEnemy({type:'stapler',r:30,x:stapleIntro.x,y:stapleIntro.y,hp:1,maxHp:1,freeze:0,stun:0},1,false);ctx.restore()}
    if(stapleIntro.stage==='snap'){ctx.font='bold 22px "Stevie Pencil",cursive';ctx.textAlign='center';ctx.fillStyle='#995c29';ctx.fillText(stapleIntro.age<2.55?'CLACK!':'CLACK CLACK!',0,-60)}ctx.restore();
  }
  game.api.drawThrowAim?.();
  game.api.drawEraserCursor?.();
  game.api.drawWaveFinale(drawDoodleEnemy);game.dom.ctx.restore();game.api.drawBossVictory();
  game.api.drawFirstLesson();
  if(game.state.paused&&!game.api.firstLessonActive()){
    game.dom.ctx.fillStyle='rgba(20,25,28,.38)';game.dom.ctx.fillRect(0,0,game.state.W,game.state.H);
    game.dom.ctx.fillStyle='#fff';game.dom.ctx.textAlign='center';game.dom.ctx.font='900 38px system-ui';game.dom.ctx.fillText('PAUSED',game.state.W/2,game.state.H/2)
  }
}
function drawPaperDoodle(e,pose){
 if(!pose||pose.visible<=0)return;
 const ctx=game.dom.ctx;ctx.save();ctx.translate(e.x,e.y);
 // The lower body disappears below the torn rim; emergence reverses the mask.
 ctx.beginPath();ctx.rect(-e.r*3,-e.r*4,e.r*6,e.r*4+e.r*(pose.reduced?4:pose.visible));ctx.clip();
 ctx.globalAlpha=pose.reduced?pose.visible:1;ctx.translate(0,pose.y);ctx.rotate(pose.angle);ctx.scale(pose.sx,pose.sy);
 drawDoodleEnemy(e,game.api.clamp(e.hp/e.maxHp,0,1),false);ctx.restore();
}
const api = { doodleArtwork:name=>doodles[name]||null,artworkStatus,retryArtwork,drawPaperDoodle,drawStapleHelper:()=>drawDoodleEnemy({type:'jamling',r:10,hp:1,maxHp:1},1,false), enemyFacing, enemyMotionReduced:()=>motionReduced, enemySpriteFrame, updateMenuPencil, resetMenuPencil, enemyActionCue, rendererCacheStats, artworkReady:()=>doodleNames.every(name=>!!doodles[name]), animateEnemyAction, prepareSapperStrike, enemyActionFrame, reactStevieHit, celebrateStevie, updateStevieCelebration, stevieReactionPose, resetEnemyAnimations, reactEnemyHit, animateEnemySplit, animateSplitChild, updateEnemyAnimations, enemyAnimationPose, enemyAnimationCount, resetStevieAnimation, updateStevieAnimation, startStevieThrow, stevieAnimationFrame, enemyStatusColors, resize, draw };
Object.assign(game.api, api);
updateMenuPencil(0);
return api;
};
