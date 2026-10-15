/* Presentation and a click-to-resume focus gate; no combat RNG or balance changes. */
DoodleDefender.systems.desktopPolish=function(game){
 let hover=null,blocked=false,previousPause=false,lastInk=-Infinity;
 function desktop(){return !!game.api.desktopUiEnabled?.()&&!document.documentElement?.classList?.contains('native-app')&&!window.matchMedia?.('(pointer: coarse)').matches;}
 function syncDesktopCursor(){
  if(!desktop())return;
  let kind='default',value='auto';
  if(game.api.drawingAvailable?.()&&!blocked){kind=game.api.eraserActive?.()?'erase':!game.state.drawing&&!game.api.canStartStroke(hover)?'empty':'draw';const file={erase:'eraser',empty:'empty',draw:'pencil'}[kind],hotspot=kind==='draw'?'2 30':'16 16';value='url("assets/art/ui/cursors/'+file+'.svg") '+hotspot+', '+(kind==='empty'?'not-allowed':'crosshair');}
  game.dom.canvas.style.cursor=value;game.dom.canvas.dataset&&(game.dom.canvas.dataset.toolCursor=kind);
 }
 function showDesktopInkFeedback(e){
  if(!desktop()||performance.now()-lastInk<700)return;lastInk=performance.now();
  const hint=game.dom.$('desktopInkFeedback');hint.hidden=false;hint.style.left=Math.max(8,Math.min((window.innerWidth||game.state.W)-160,e.clientX+18))+'px';hint.style.top=Math.max(8,Math.min((window.innerHeight||game.state.H)-44,e.clientY-36))+'px';
  game.dom.inkBar.classList?.add('ink-shortfall');setTimeout(()=>{hint.hidden=true;game.dom.inkBar.classList?.remove('ink-shortfall');},1000);syncDesktopCursor();
 }
 function blockWindowFocus(){
  if(!desktop()||!game.state.running||blocked)return false;
  previousPause=game.state.paused;game.api.cancelDrawingInput?.();game.api.cancelLessonGesture?.();blocked=true;game.state.paused=true;game.api.stopSoundEffects();game.dom.$('focusResumeOverlay').hidden=false;game.dom.$('desktopInkFeedback').hidden=true;syncDesktopCursor();return true;
 }
 function resumeWindowFocus(e){
  if(!blocked||!e||e.detail===0)return false;
  blocked=false;game.state.paused=previousPause;game.state.last=performance.now();game.dom.$('focusResumeOverlay').hidden=true;game.api.syncDrawingControls?.();game.api.updateUI();return true;
 }
 game.dom.canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;hover=game.api.pointerPos?.(e)||null;syncDesktopCursor();});
 game.dom.canvas.addEventListener('pointerleave',()=>{hover=null;});
 window.addEventListener('blur',blockWindowFocus);
 document.addEventListener?.('visibilitychange',()=>{if(document.hidden)blockWindowFocus();});
 window.addEventListener('keydown',e=>{if(!blocked||e.ctrlKey||e.altKey||e.metaKey||e.key==='F11')return;e.preventDefault?.();e.stopImmediatePropagation?.();},{capture:true});
 game.dom.$('focusResumeBtn').onclick=resumeWindowFocus;
 const api={syncDesktopCursor,showDesktopInkFeedback,blockWindowFocus,resumeWindowFocus,windowFocusBlocked:()=>blocked};Object.assign(game.api,api);return api;
};
