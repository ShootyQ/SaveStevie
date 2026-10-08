/* Modular animation preview, isolated from combat and saved notebook progress. */
DoodleDefender.systems.wobblePreview=function(game){
 const $=game.dom.$,rig=DoodleDefender.WobblechompRig,canvas=$('wobbleCanvas'),ctx=canvas.getContext('2d');
 let model=rig.create(),image=null,toothImage=null,ready=false,loading=false,opened=false,paused=false,frame=null,last=null,nextPunch=.8,nextAttack=0,stroke=null,pointer=null,strokeLife=0,view=null;
 const media=window.matchMedia?.('(prefers-reduced-motion: reduce)'),reduced=()=>!!media?.matches;
 const attacks=[{button:'wobblePunchBtn',cuts:'armCuts',run:rig.punch},{button:'wobbleSpikesBtn',cuts:'legCuts',run:rig.shootSpikes},{button:'wobbleBeamBtn',cuts:'stalkCuts',run:rig.eyeBeam},{button:'wobbleTeethBtn',run:rig.shakeTeeth}];
 const limbs=attacks.filter(a=>a.cuts);
 const instructions='Cut any circled joint twice. Try the attacks at both speeds.';
 function status(text){$('wobbleStatus').textContent=text}
 function resize(){
  const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);if(!r.width||!r.height)return;
  const scale=Math.min(r.width/rig.WIDTH,r.height/rig.HEIGHT);view={width:r.width,height:r.height,dpr,scale,x:(r.width-rig.WIDTH*scale)/2,y:(r.height-rig.HEIGHT*scale)/2};
  canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);render();
 }
 function render(){
  if(!opened||!view)return;ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.clearRect(0,0,view.width,view.height);
  ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
  if(ready)rig.draw(ctx,image,model,{reduced:reduced(),guide:true,toothImage});
  if(stroke&&stroke.length){ctx.strokeStyle='#3562be';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();stroke.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}
  ctx.restore();
 }
 function load(){
  if(ready||loading)return;loading=true;status('Opening Wobblechomp’s notebook…');
  const version=document.documentElement?.dataset?.build,suffix=version?'?v='+encodeURIComponent(version):'';
  let remaining=2,failed=false;
  const done=()=>{if(failed)return;if(--remaining===0){loading=false;ready=true;if(opened){status(instructions);render();sync()}}};
  const fail=()=>{if(failed)return;failed=true;loading=false;status('Artwork could not load. Close and reopen to try again.');sync()};
  image=new Image();image.onload=done;image.onerror=fail;image.src='assets/art/wobblechomp-parts.png'+suffix;
  toothImage=new Image();toothImage.onload=done;toothImage.onerror=fail;toothImage.src='assets/art/wobble-tooth.png'+suffix;
 }
 function sync(){
  $('wobbleToothCount').textContent=model.teeth.length?'Teeth: '+model.teeth.length:'';
  for(const a of attacks)$(a.button).disabled=!ready||paused||(a.cuts&&model[a.cuts]===2)||rig.busy(model);
  $('wobblePauseBtn').textContent=paused?'Resume':'Pause';$('wobblePauseBtn').setAttribute?.('aria-pressed',String(paused));
  $('wobbleCutCount').textContent=limbs.every(a=>model[a.cuts]===2)?'All parts detached!':'Arm '+model.armCuts+'/2 · Leg '+model.legCuts+'/2 · Eye '+model.stalkCuts+'/2';
 }
 function advance(dt){
  if(!opened||paused||document.hidden||!ready)return;
  const speed=$('wobbleSpeed').value==='2'?2:1;dt=Math.min(.05,Math.max(0,dt))*speed;rig.update(model,dt);
  if(strokeLife>0){strokeLife-=dt;if(strokeLife<=0)stroke=null}
  if($('wobbleAutoPunch').checked&&!rig.busy(model)){
   nextPunch-=dt;if(nextPunch<=0){for(let n=0;n<attacks.length;n++){const i=(nextAttack+n)%attacks.length;if(attacks[i].run(model)){nextAttack=(i+1)%attacks.length;break}}nextPunch=.8}
  }
  sync();render();
 }
 function tick(t){frame=null;if(!opened)return;const dt=last===null?0:Math.min(.05,Math.max(0,(t-last)/1000));last=t;advance(dt);frame=requestAnimationFrame(tick)}
 function clearPointer(){const id=pointer;pointer=null;if(id!==null&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);stroke=null;strokeLife=0}
 function open(){
  if(opened)return;if($('optionsOverlay').style.display!=='grid')game.api.openOptions();
  opened=true;paused=false;model=rig.create();nextPunch=.8;nextAttack=0;last=null;clearPointer();$('optionsOverlay').inert=true;$('wobblePreviewOverlay').style.display='grid';
  load();resize();sync();if(ready)status(instructions);$('closeWobblePreviewBtn').focus?.();frame=requestAnimationFrame(tick);
 }
 function close(){
  if(!opened)return;opened=false;if(frame!==null)window.cancelAnimationFrame?.(frame);frame=null;last=null;clearPointer();$('wobblePreviewOverlay').style.display='none';$('optionsOverlay').inert=false;$('openWobblePreviewBtn').focus?.();
 }
 function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-view.x)/view.scale,y:(e.clientY-r.top-view.y)/view.scale}}
 canvas.addEventListener('pointerdown',e=>{if(!opened||!ready||paused||pointer!==null||e.isPrimary===false||e.button>0)return;e.preventDefault();pointer=e.pointerId;stroke=[point(e)];strokeLife=0;canvas.setPointerCapture?.(pointer);render()});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||!stroke)return;const p=point(e),q=stroke.at(-1);if(Math.hypot(p.x-q.x,p.y-q.y)>2&&stroke.length<1024)stroke.push(p);render()});
 canvas.addEventListener('pointerup',e=>{
  if(e.pointerId!==pointer||!stroke)return;stroke.push(point(e));
  if(rig.cutStroke(model,stroke,reduced())){const part=model.lastCut,name={arm:'Arm',leg:'Spiky leg',stalk:'Eye stalk'}[part],cuts=model[{arm:'armCuts',leg:'legCuts',stalk:'stalkCuts'}[part]];status(limbs.every(a=>model[a.cuts]===2)?'All three parts detached! Reset to try again.':cuts===1?name+' is hanging by a thread!':name+' detached! Try the remaining parts.')}else if(limbs.some(a=>model[a.cuts]<2))status('Cross the threads inside a green circle, then lift your finger.');
  const id=pointer;pointer=null;if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);strokeLife=.6;sync();render();
 });
 canvas.addEventListener('pointercancel',()=>{clearPointer();render()});
 canvas.addEventListener('lostpointercapture',()=>{if(pointer!==null){clearPointer();render()}});
 $('openWobblePreviewBtn').onclick=open;$('closeWobblePreviewBtn').onclick=close;
 for(const a of attacks)$(a.button).onclick=()=>{if(!paused&&ready&&a.run(model)){nextPunch=.8;if(a.run===rig.shakeTeeth)status('Watch the teeth launch, bounce and scurry.');sync();render()}};
 $('wobbleSpeed').onchange=()=>{last=null;clearPointer();render()};
 $('wobblePauseBtn').onclick=()=>{paused=!paused;last=null;clearPointer();sync();render()};
 $('wobbleResetBtn').onclick=()=>{model=rig.create();paused=false;nextPunch=.8;nextAttack=0;last=null;clearPointer();status(instructions);sync();render()};
 document.addEventListener?.('keydown',e=>{
  if(!opened)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}
  else if(e.key==='Tab'){
   const buttons=Array.from($('wobblePreviewOverlay').querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')),first=buttons[0],last=buttons.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   e.stopImmediatePropagation();
  }
 },true);
 document.addEventListener?.('visibilitychange',()=>{last=null;if(document.hidden)clearPointer()});
 window.addEventListener('savestevie:background',()=>{if(opened){paused=true;last=null;clearPointer();sync();render()}});
 window.addEventListener('resize',()=>{if(opened){clearPointer();resize()}});
 media?.addEventListener?.('change',()=>{if(opened)render()});
 const api={openWobblePreview:open,closeWobblePreview:close,advanceWobblePreview:advance,wobblePreviewSnapshot:()=>({opened,paused,ready,reduced:reduced(),model:JSON.parse(JSON.stringify(model)),view:view?{...view}:null})};Object.assign(game.api,api);return api;
};
