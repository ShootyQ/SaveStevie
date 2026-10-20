/* input: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.input = function createInputSystem(game) {
function pointerPos(e){
  const r=game.dom.canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}
}

const aimKeys=new Set();
let strokePointer=null,modifierPointer=null,held=false,toggled=false,rightDrag=false,lastPoint=null,cursor=null,erasePoint=null;
function canPaint(){return game.state.running&&!game.state.paused&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec&&!game.api.synergyRevealActive()&&!game.api.waveFinaleActive()&&!game.api.wobbleRepairActive()&&!game.api.bossEntranceActive();}
function eraserActive(){return rightDrag||held||toggled;}
function syncDrawingControls(){
 if(document.documentElement)document.documentElement.dataset.eraserSize=game.api.drawingControls().eraserSize;
 const button=game.dom.$('eraserBtn'),active=eraserActive();const glueLoaded=(game.api.whiteBrothersFightSnapshot?.()?.glueInk||0)>0;button.textContent=glueLoaded?(active?'Gluing':'Glue'):(active?'Erasing':'Erase');button.setAttribute?.('aria-pressed',String(active));button.classList?.toggle('eraser-left',game.api.drawingControls().eraserLeft);button.classList?.toggle('is-erasing',active);button.title=game.api.drawingControls().eraserToggle?'Tap to switch tools. Rub to erase; hold still on paper and release to bounce monsters.':'Hold while your other finger erases. PC: '+game.api.controlLabel('erase')+' drag to erase; hold still on bare paper, then release to bounce.';
 game.dom.canvas.style.cursor=active?'none':'crosshair';game.api.syncDesktopCursor?.();
}
function finishStroke(commit=true){
 if(commit&&canPaint())game.api.releasePaperPress();else game.api.cancelPaperPress();
 const lift=commit&&game.state.drawing&&!eraserActive()&&game.state.currentWall?.length>1;
 game.api.resetWhiteToolsStroke?.();game.api.resetBootstompRub?.();game.api.resetCrayonEraseStroke();game.api.resetCatapultEraseStroke();
 game.api.cancelPaperRub();game.api.cancelChonksRub();game.api.resetScrubberRub();
 if(commit){if(!game.api.finishLiveWall()&&game.state.drawing&&game.state.currentWall)game.api.createWall(game.state.currentWall);}else game.api.cancelLiveWall();
 game.state.drawing=false;game.state.currentWall=null;game.api.stopSoundEffects('scribble');game.api.stopSoundEffects('draw');game.api.stopSoundEffects('erase');if(lift)game.api.playSound('pencilLift');
 const id=strokePointer;strokePointer=null;rightDrag=false;lastPoint=null;cursor=null;erasePoint=null;
 if(id!==null&&game.dom.canvas.hasPointerCapture?.(id))game.dom.canvas.releasePointerCapture(id);
 syncDrawingControls();
}
function cancelDrawingInput(){
 aimKeys.clear();held=false;toggled=false;modifierPointer=null;finishStroke(false);
}
function endDraw(){
 game.api.cancelPaperPress();
 aimKeys.clear();held=false;toggled=false;modifierPointer=null;finishStroke(true);
}
function changeEraserMode(change){
 const before=eraserActive();change();const after=eraserActive();
 if(before!==after){erasePoint=lastPoint?{...lastPoint}:null;if(before&&canPaint())game.api.releasePaperPress();else game.api.cancelPaperPress();game.api.resetWhiteToolsStroke?.();game.api.resetBootstompRub?.();game.api.stopSoundEffects('draw');game.api.stopSoundEffects('erase');game.api.resetCrayonEraseStroke();game.api.resetCatapultEraseStroke();game.api.cancelPaperRub();game.api.cancelChonksRub();game.api.resetScrubberRub();}
 if(before!==after&&strokePointer!==null&&canPaint()){
  if(after){game.api.beginPaperPress(lastPoint);if(!game.api.finishLiveWall()&&game.state.currentWall)game.api.createWall(game.state.currentWall);game.state.currentWall=null;game.api.stopSoundEffects('scribble');cursor={...lastPoint,r:20};erasePoint={...lastPoint};}
  else{cursor=null;game.state.currentWall=game.api.canStartStroke(lastPoint)?[{...lastPoint}]:null;}
 }
 if(!before&&after&&window.matchMedia?.('(pointer: coarse)').matches)globalThis.navigator?.vibrate?.(12);
 syncDrawingControls();
}
function drawEraserCursor(){
 if(!cursor||!eraserActive()||!canPaint())return;
 const ctx=game.dom.ctx;ctx.save();ctx.fillStyle='#f7d5dc44';ctx.strokeStyle='#793a51';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cursor.x,cursor.y,cursor.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#fffaf0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cursor.x,cursor.y,cursor.r+2,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function throwAim(){
 if(!canPaint()||document.documentElement?.classList?.contains('native-app')||window.matchMedia?.('(pointer: coarse)').matches)return null;
 const x=Number(aimKeys.has('right'))-Number(aimKeys.has('left')),y=Number(aimKeys.has('down'))-Number(aimKeys.has('up')),length=Math.hypot(x,y);return length?{x:x/length,y:y/length}:null;
}
function drawThrowAim(){const a=throwAim();if(!a||!game.state.stats.rockRate)return;const ctx=game.dom.ctx,p=game.state.player;ctx.save();ctx.translate(p.x,p.y-8);ctx.rotate(Math.atan2(a.y,a.x));ctx.strokeStyle='#385f87';ctx.lineWidth=2;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(54,0);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(47,-6);ctx.lineTo(54,0);ctx.lineTo(47,6);ctx.stroke();ctx.restore();}
function screenSupported(){return typeof document.documentElement?.requestFullscreen==='function'}
function updateScreenButton(){
  const button=game.dom.$('fullscreenBtn');
  button.disabled=!screenSupported();button.textContent=document.fullscreenElement?'Exit':'Screen';
  button.setAttribute?.('aria-pressed',document.fullscreenElement?'true':'false');
  button.title=screenSupported()?'Toggle fullscreen':'Fullscreen is unavailable in this browser; the game still fits your screen';
}
function enterScreen(){
  if(!screenSupported()||document.fullscreenElement)return;
  // Must run directly from a user gesture; unavailable/denied fullscreen is harmless.
  try{const request=document.documentElement.requestFullscreen();request?.catch(()=>{});}catch{}
}
function startRun(options={}){
  if(game.api.artworkStatus().ready===false){game.api.setMsg('Notebook artwork is still loading. Try again when it is ready.');return;}
  if(options.fromEnd!==true&&game.api.scrapLessonPending()){game.api.openInfo('hub');return;}
  game.api.startMusic('margin-mischief');
  if(window.matchMedia?.('(pointer: coarse)').matches)enterScreen();
  game.api.resetRun();
}
function toggleScreen(){
  if(document.fullscreenElement){try{document.exitFullscreen()?.catch(()=>{});}catch{}}else enterScreen();
}
function bind() {
const canQuit=typeof window.stevieDesktop?.quit==='function';
for(const id of ['splashQuitBtn','pauseQuitBtn','settingsQuitBtn']){game.dom.$(id).hidden=!canQuit;game.dom.$(id).onclick=()=>{if(canQuit)game.api.openInfo('desktopQuit');};}
game.dom.$('desktopQuitCancel').onclick=()=>game.api.closeInfo();
game.dom.$('desktopQuitConfirm').onclick=async()=>{if(!canQuit)return;const button=game.dom.$('desktopQuitConfirm');button.disabled=true;try{await window.stevieDesktop.quit();}catch{game.dom.$('desktopQuitStatus').textContent='Could not close the app. Try again or use the window close button.';}finally{button.disabled=false;}};
window.addEventListener('resize',game.api.resize);
// A header, font or control-size change can resize the arena without resizing the window.
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{
 const r=game.dom.canvas.getBoundingClientRect();
 if(Math.abs(r.width-game.state.W)>.5||Math.abs(r.height-game.state.H)>.5)game.api.resize();
}).observe(game.dom.canvas);
window.visualViewport?.addEventListener('resize',game.api.resize);
document.addEventListener?.('fullscreenchange',()=>{game.api.resize();updateScreenButton()});
game.dom.$('fullscreenBtn').onclick=toggleScreen;updateScreenButton();
game.dom.$('inspectToolBtn').onclick=game.api.openBuild;
for(const id of ['quickBuildBtn','deathInspectBuild','victoryInspectBuild'])game.dom.$(id).onclick=game.api.openBuild;
window.addEventListener('keydown',e=>{if(game.api.desktopUiEnabled?.()&&e.key?.toLowerCase()==='b'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.target?.isContentEditable&&!['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)&&game.state.running&&!game.state.paused&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec&&!game.api.infoOpen()){e.preventDefault();game.api.openBuild();}});
for(const id of ['splashOptionsBtn'])game.dom.$(id).onclick=game.api.openOptions;
game.dom.$('closeOptionsBtn').onclick=game.api.closeOptions;
for(const id of ['optionsStatsBtn'])game.dom.$(id).onclick=game.api.openStatistics;
game.dom.$('closeStatisticsBtn').onclick=game.api.closeStatistics;
game.dom.$('closeBuildBtn').onclick=game.api.closeBuild;
game.dom.$('changelogBtn').onclick=game.api.openChangelog;
game.dom.$('closeChangelogBtn').onclick=game.api.closeChangelog;
game.dom.$('splashHubBtn').onclick=()=>game.api.openInfo('hub');
game.dom.$('closeHubBtn').onclick=()=>game.api.closeInfo();
for(const [id,kind] of Object.entries({hubMonstersBtn:'compendium',hubToolBtn:'build',hubNotebookBtn:'notebook',hubSettingsBtn:'options',hubStatsBtn:'statistics',hubChangelogBtn:'changelog'}))game.dom.$(id).onclick=()=>game.api.openInfo(kind);
game.dom.$('closeCompendiumBtn').onclick=game.api.closeCompendium;
game.dom.$('monsterIntrosEnabled').onchange=e=>game.api.setMonsterIntrosEnabled(e.target.checked);
game.dom.$('continueMonsterIntroBtn').onclick=game.api.continueMonsterIntro;
game.dom.$('continueSynergyBtn').onclick=game.api.continueSynergyReveal;
game.dom.$('victoryMenuBtn').onclick=game.api.returnToMenu;
game.dom.$('closeNotebookBtn').onclick=game.api.closeNotebook;
game.dom.$('resetNotebookBtn').onclick=game.api.resetNotebookProgress;
window.addEventListener('keydown',game.api.handleInfoKey);
const aimCode=e=>['up','left','down','right'].find(action=>game.api.controlKey(action,e));
window.addEventListener('keydown',e=>{const code=aimCode(e);if(!code||!canPaint()||e.ctrlKey||e.altKey||e.metaKey||e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||document.documentElement?.classList?.contains('native-app')||window.matchMedia?.('(pointer: coarse)').matches)return;aimKeys.add(code);e.preventDefault?.();});
window.addEventListener('keyup',e=>{const code=aimCode(e);if(code)aimKeys.delete(code);});
window.addEventListener('savestevie:background',()=>{
  if(game.api.firstLessonActive?.()){game.api.cancelLessonGesture();game.api.stopSoundEffects();return;}
  if(game.api.wobbleRepairActive()){game.api.stopSoundEffects();return;}
  if(game.state.running&&!game.api.infoOpen()&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec)game.api.openInfo('pause');
  game.api.stopSoundEffects();
});
game.dom.canvas.addEventListener('contextmenu',e=>e.preventDefault());game.dom.canvas.addEventListener('auxclick',e=>e.preventDefault());
const eraserButton=game.dom.$('eraserBtn');
eraserButton.addEventListener('pointerdown',e=>{
 if(game.api.firstLessonActive()){game.api.lessonEraserDown(e);return;}
 if(!canPaint()||modifierPointer!==null||game.api.drawingControls().eraserToggle||e.button>0)return;
 e.preventDefault?.();modifierPointer=e.pointerId;eraserButton.setPointerCapture(e.pointerId);changeEraserMode(()=>{held=true;});
});
const releaseEraser=e=>{if(game.api.firstLessonActive()){game.api.lessonEraserUp(e);return;}if(e.pointerId!==modifierPointer)return;if(e.type&&e.type!=='pointerup')game.api.cancelPaperPress();modifierPointer=null;changeEraserMode(()=>{held=false;});};
for(const event of ['pointerup','pointercancel','lostpointercapture'])eraserButton.addEventListener(event,releaseEraser);
eraserButton.onclick=e=>{if(game.api.firstLessonActive()){game.api.lessonEraserClick(e);return;}if(canPaint()&&(game.api.drawingControls().eraserToggle||e.detail===0))changeEraserMode(()=>{toggled=!toggled;});};
game.dom.canvas.addEventListener('pointerdown',e=>{
 if(game.api.firstLessonActive()){game.api.lessonPointerDown(e);return;}
 if(!canPaint()||strokePointer!==null||!game.api.mouseControl(e))return;
 const erase=game.api.mouseControl(e)==='erase'||eraserActive();
 if(!erase&&!game.api.canStartStroke(game.api.pointerPos(e))){game.api.setMsg('Not enough ink to start this stroke. Let it refill, or start from a free/discounted route.');game.api.showDesktopInkFeedback?.(e);return;}
 e.preventDefault?.();strokePointer=e.pointerId;rightDrag=game.api.mouseControl(e)==='erase';lastPoint=game.api.pointerPos(e);game.state.drawing=true;game.state.currentWall=erase?null:[lastPoint];game.dom.canvas.setPointerCapture(e.pointerId);
 if(erase){game.api.beginPaperPress(lastPoint);cursor={...lastPoint,r:20};erasePoint={...lastPoint};}
 else if(game.api.whitePencilPath?.(lastPoint,lastPoint,true))game.state.currentWall=null;syncDrawingControls();
});
game.dom.canvas.addEventListener('pointermove',e=>{
 if(game.api.firstLessonActive()){game.api.lessonPointerMove(e);return;}
 if(strokePointer===null){if(eraserActive()&&canPaint())cursor={...game.api.pointerPos(e),r:20};return;}
 if(e.pointerId!==strokePointer)return;
 if(!canPaint()){cancelDrawingInput();return;}
 const p=game.api.pointerPos(e);
 if(eraserActive()){
  const pressing=game.api.movePaperPress(p);
  // A click is not a rub. Accumulate slow movement from an anchor so small
  // pointer samples still form a stroke, without rewarding stationary jitter.
  if(!erasePoint)erasePoint={...lastPoint};
  if(!pressing&&game.api.dist(erasePoint.x,erasePoint.y,p.x,p.y)>=6){
   game.api.sustainSound('erase');game.api.eraseWallPath(erasePoint,p,20);
   if(!game.api.whiteToolsEraseHandled?.()&&!game.api.bootstompEraseHandled?.())game.api.queuePaperRub(erasePoint,p,20);
   erasePoint={...p};
  }
  cursor={...p,r:20};
 }
 else if(game.api.whitePencilPath?.(lastPoint,p)){game.api.finishLiveWall();game.state.currentWall=null;}
 else if(game.state.currentWall){const q=game.state.currentWall.at(-1);if(game.api.dist(p.x,p.y,q.x,q.y)>6){game.state.currentWall.push(p);game.state.currentWall=game.api.updateLiveWall(game.state.currentWall);game.api.sustainSound('draw');}}
 lastPoint=p;
});
game.dom.canvas.addEventListener('pointerup',e=>{if(game.api.firstLessonActive()){game.api.lessonPointerUp(e);return;}if(e.pointerId!==strokePointer)return;if(canPaint())finishStroke();else cancelDrawingInput();});
game.dom.canvas.addEventListener('pointercancel',e=>{if(game.api.firstLessonActive()){game.api.cancelLessonGesture();return;}if(e.pointerId===strokePointer)cancelDrawingInput();});
game.dom.canvas.addEventListener('lostpointercapture',e=>{if(game.api.firstLessonActive()){game.api.cancelLessonGesture();return;}if(e.pointerId===strokePointer)cancelDrawingInput();});
window.addEventListener('blur',cancelDrawingInput);
syncDrawingControls();
game.dom.$('startBtn').onclick=startRun;
game.dom.$('againBtn').onclick=game.api.returnToMenu;
game.dom.$('deathNewRunBtn').onclick=()=>startRun({fromEnd:true});
game.dom.$('newRunBtn').onclick=()=>startRun({fromEnd:true});
game.dom.$('continueBtn').onclick=game.api.proceedAfterWave;
game.dom.$('rerollBtn').onclick=game.api.reroll;
game.dom.$('endlessBtn').onclick=()=>{
  game.api.resumeScrapRun();
  game.state.endless=true;game.state.running=true;game.dom.victoryOverlay.style.display='none';
  game.state.wave=21;game.state.betweenWaves=false;game.state.inUpgrade=false;game.state.awaitingSpec=false;game.api.startWave();game.api.updateUI()
};
document.querySelectorAll('[data-spec]').forEach(el=>el.onclick=()=>game.api.chooseSpecialization(el.dataset.spec));
game.dom.$('clearBtn').onclick=()=>{
  const refund=Math.min(game.state.stats.maxInk*.18,game.state.walls.reduce((a,w)=>a+w.pts.length,0)*.1);
  game.state.walls=[];game.state.stats.ink=Math.min(game.state.stats.maxInk,game.state.stats.ink+refund);
  game.api.setMsg('Walls erased. Reclaimed a little ink.')
};
game.dom.$('pauseBtn').onclick=()=>{
  if(game.dom.$('monsterIntroOverlay').style.display==='grid')return;
  if(!game.state.running||game.state.inUpgrade||game.state.betweenWaves||game.state.awaitingSpec)return;
  if(game.api.infoOpen()){game.api.closeInfo(false);return}
  game.api.openInfo('pause');
};
game.dom.$('resumeBtn').onclick=()=>game.api.closeInfo(false);
game.dom.$('pauseSettingsBtn').onclick=game.api.openOptions;
game.dom.$('pauseToolBtn').onclick=()=>game.api.openInfo('build');
game.dom.$('pauseMonstersBtn').onclick=()=>game.api.openInfo('compendium');
game.dom.$('returnMenuBtn').onclick=()=>{game.dom.$('pauseActions').hidden=true;game.dom.$('quitConfirmation').hidden=false;game.dom.$('cancelQuitBtn').focus?.()};
game.dom.$('cancelQuitBtn').onclick=()=>{game.dom.$('quitConfirmation').hidden=true;game.dom.$('pauseActions').hidden=false;game.dom.$('returnMenuBtn').focus?.()};
game.dom.$('confirmQuitBtn').onclick=game.api.returnToMenu;
}
const api = { drawingAvailable:canPaint,throwAim,drawThrowAim,pointerPos, endDraw, cancelDrawingInput, eraserActive, syncDrawingControls, drawEraserCursor, bind };
Object.assign(game.api, api);
return api;
};
