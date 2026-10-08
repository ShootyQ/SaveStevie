/* First animation slice, isolated from combat and saved notebook progress. */
DoodleDefender.systems.wobblePreview=function(game){
 const $=game.dom.$,rig=DoodleDefender.WobblechompRig,canvas=$('wobbleCanvas'),ctx=canvas.getContext('2d');
 let model=rig.create(),image=null,ready=false,loading=false,opened=false,paused=false,frame=null,last=null,nextPunch=.8,stroke=null,pointer=null,strokeLife=0,view=null;
 const media=window.matchMedia?.('(prefers-reduced-motion: reduce)'),reduced=()=>!!media?.matches;
 function status(text){$('wobbleStatus').textContent=text}
 function resize(){
  const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);if(!r.width||!r.height)return;
  const scale=Math.min(r.width/rig.WIDTH,r.height/rig.HEIGHT);view={width:r.width,height:r.height,dpr,scale,x:(r.width-rig.WIDTH*scale)/2,y:(r.height-rig.HEIGHT*scale)/2};
  canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);render();
 }
 function render(){
  if(!opened||!view)return;ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.clearRect(0,0,view.width,view.height);
  ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
  if(ready)rig.draw(ctx,image,model,{reduced:reduced(),guide:true});
  if(stroke&&stroke.length){ctx.strokeStyle='#3562be';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();stroke.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}
  ctx.restore();
 }
 function load(){
  if(ready||loading)return;loading=true;image=new Image();status('Opening Wobblechomp’s notebook…');
  image.onload=()=>{loading=false;ready=true;if(opened){status('Two separate strokes across the shoulder threads.');render();sync()}};
  image.onerror=()=>{loading=false;status('Artwork could not load. Close and reopen to try again.');sync()};
  const version=document.documentElement?.dataset?.build;image.src='assets/art/wobblechomp-parts.png'+(version?'?v='+encodeURIComponent(version):'');
 }
 function sync(){
  $('wobblePunchBtn').disabled=!ready||paused||model.armCuts===2||model.punchAge!==null;
  $('wobblePauseBtn').textContent=paused?'Resume':'Pause';$('wobblePauseBtn').setAttribute?.('aria-pressed',String(paused));
  $('wobbleCutCount').textContent=model.armCuts===2?'Arm detached!':model.armCuts+' / 2 cuts';
 }
 function advance(dt){
  if(!opened||paused||document.hidden||!ready)return;
  rig.update(model,dt);
  if(strokeLife>0){strokeLife-=dt;if(strokeLife<=0)stroke=null}
  if($('wobbleAutoPunch').checked&&model.armCuts<2&&model.punchAge===null){nextPunch-=dt;if(nextPunch<=0){rig.punch(model);nextPunch=1.2}}
  sync();render();
 }
 function tick(t){frame=null;if(!opened)return;const dt=last===null?0:Math.min(.05,Math.max(0,(t-last)/1000));last=t;advance(dt);frame=requestAnimationFrame(tick)}
 function clearPointer(){const id=pointer;pointer=null;if(id!==null&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);stroke=null;strokeLife=0}
 function open(){
  if(opened)return;if($('optionsOverlay').style.display!=='grid')game.api.openOptions();
  opened=true;paused=false;model=rig.create();nextPunch=.8;last=null;clearPointer();$('optionsOverlay').inert=true;$('wobblePreviewOverlay').style.display='grid';
  load();resize();sync();if(ready)status('Two separate strokes across the shoulder threads.');$('closeWobblePreviewBtn').focus?.();frame=requestAnimationFrame(tick);
 }
 function close(){
  if(!opened)return;opened=false;if(frame!==null)window.cancelAnimationFrame?.(frame);frame=null;last=null;clearPointer();$('wobblePreviewOverlay').style.display='none';$('optionsOverlay').inert=false;$('openWobblePreviewBtn').focus?.();
 }
 function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-view.x)/view.scale,y:(e.clientY-r.top-view.y)/view.scale}}
 canvas.addEventListener('pointerdown',e=>{if(!opened||!ready||paused||pointer!==null||e.isPrimary===false||e.button>0)return;e.preventDefault();pointer=e.pointerId;stroke=[point(e)];strokeLife=0;canvas.setPointerCapture?.(pointer);render()});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||!stroke)return;const p=point(e),q=stroke.at(-1);if(Math.hypot(p.x-q.x,p.y-q.y)>2&&stroke.length<1024)stroke.push(p);render()});
 canvas.addEventListener('pointerup',e=>{
  if(e.pointerId!==pointer||!stroke)return;stroke.push(point(e));
  if(rig.cutStroke(model,stroke,reduced()))status(model.armCuts===1?'One cut! The arm is hanging by a thread.':'Off it comes! Reset to try again.');else if(model.armCuts<2)status('Cross the threads inside the green circle, then lift your finger.');
  const id=pointer;pointer=null;if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);strokeLife=.6;sync();render();
 });
 canvas.addEventListener('pointercancel',()=>{clearPointer();render()});
 canvas.addEventListener('lostpointercapture',()=>{if(pointer!==null){clearPointer();render()}});
 $('openWobblePreviewBtn').onclick=open;$('closeWobblePreviewBtn').onclick=close;
 $('wobblePunchBtn').onclick=()=>{if(!paused&&ready&&rig.punch(model)){nextPunch=1.2;sync();render()}};
 $('wobblePauseBtn').onclick=()=>{paused=!paused;last=null;clearPointer();sync();render()};
 $('wobbleResetBtn').onclick=()=>{model=rig.create();paused=false;nextPunch=.8;last=null;clearPointer();status('Two separate strokes across the shoulder threads.');sync();render()};
 document.addEventListener?.('keydown',e=>{
  if(!opened)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}
  else if(e.key==='Tab'){
   const buttons=Array.from($('wobblePreviewOverlay').querySelectorAll('button:not([disabled]),input:not([disabled])')),first=buttons[0],last=buttons.at(-1);
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
