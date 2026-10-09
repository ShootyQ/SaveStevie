/* input: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.input = function createInputSystem(game) {
function pointerPos(e){
  const r=game.dom.canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}
}

let strokePointer=null,modifierPointer=null,held=false,toggled=false,rightDrag=false,lastPoint=null,cursor=null;
function canPaint(){return game.state.running&&!game.state.paused&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec&&!game.api.synergyRevealActive()&&!game.api.waveFinaleActive()&&!game.api.wobbleRepairActive()&&!game.api.bossEntranceActive();}
function eraserActive(){return rightDrag||held||toggled;}
function syncDrawingControls(){
 const button=game.dom.$('eraserBtn'),active=eraserActive();button.textContent=active?'Erasing':'Erase';button.setAttribute?.('aria-pressed',String(active));button.classList?.toggle('eraser-left',game.api.drawingControls().eraserLeft);button.classList?.toggle('is-erasing',active);button.title=game.api.drawingControls().eraserToggle?'Tap to switch between drawing and erasing':'Hold while your other finger erases. PC: right-drag to erase.';
 game.dom.canvas.style.cursor=active?'none':'crosshair';
}
function finishStroke(commit=true){
 if(commit){if(!game.api.finishLiveWall()&&game.state.drawing&&game.state.currentWall)game.api.createWall(game.state.currentWall);}else game.api.cancelLiveWall();
 game.state.drawing=false;game.state.currentWall=null;game.api.stopSoundEffects('scribble');
 const id=strokePointer;strokePointer=null;rightDrag=false;lastPoint=null;cursor=null;
 if(id!==null&&game.dom.canvas.hasPointerCapture?.(id))game.dom.canvas.releasePointerCapture(id);
 syncDrawingControls();
}
function cancelDrawingInput(){
 held=false;toggled=false;modifierPointer=null;finishStroke(false);
}
function endDraw(){
 held=false;toggled=false;modifierPointer=null;finishStroke(true);
}
function changeEraserMode(change){
 const before=eraserActive();change();const after=eraserActive();
 if(before!==after&&strokePointer!==null&&canPaint()){
  if(after){if(!game.api.finishLiveWall()&&game.state.currentWall)game.api.createWall(game.state.currentWall);game.state.currentWall=null;game.api.stopSoundEffects('scribble');cursor={...lastPoint,r:20};game.api.eraseWallPath(lastPoint,lastPoint,20);}
  else{cursor=null;game.state.currentWall=game.api.canStartStroke()?[{...lastPoint}]:null;}
 }
 if(!before&&after&&window.matchMedia?.('(pointer: coarse)').matches)globalThis.navigator?.vibrate?.(12);
 syncDrawingControls();
}
function drawEraserCursor(){
 if(!cursor||!eraserActive()||!canPaint())return;
 const ctx=game.dom.ctx;ctx.save();ctx.fillStyle='#f7d5dc44';ctx.strokeStyle='#793a51';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cursor.x,cursor.y,cursor.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#fffaf0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cursor.x,cursor.y,cursor.r+2,0,Math.PI*2);ctx.stroke();ctx.restore();
}
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
function startRun(){
  if(game.api.scrapLessonPending()){game.api.openInfo('hub');return;}
  game.api.startMusic('margin-mischief');
  if(window.matchMedia?.('(pointer: coarse)').matches)enterScreen();
  game.api.resetRun();
}
function toggleScreen(){
  if(document.fullscreenElement){try{document.exitFullscreen()?.catch(()=>{});}catch{}}else enterScreen();
}
function bind() {
window.addEventListener('resize',game.api.resize);
window.visualViewport?.addEventListener('resize',game.api.resize);
document.addEventListener?.('fullscreenchange',()=>{game.api.resize();updateScreenButton()});
game.dom.$('fullscreenBtn').onclick=toggleScreen;updateScreenButton();
game.dom.$('inspectToolBtn').onclick=game.api.openBuild;
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
for(const id of ['deathNotebookBtn','victoryNotebookBtn','buildNotebookBtn'])game.dom.$(id).onclick=game.api.openNotebook;
game.dom.$('closeNotebookBtn').onclick=game.api.closeNotebook;
game.dom.$('resetNotebookBtn').onclick=game.api.resetNotebookProgress;
window.addEventListener('keydown',game.api.handleInfoKey);
window.addEventListener('savestevie:background',()=>{
  if(game.api.firstLessonActive?.()){game.api.cancelLessonGesture();game.api.stopSoundEffects();return;}
  if(game.api.wobbleRepairActive()){game.api.stopSoundEffects();return;}
  if(game.state.running&&!game.api.infoOpen()&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec)game.api.openInfo('pause');
  game.api.stopSoundEffects();
});
game.dom.canvas.addEventListener('contextmenu',e=>e.preventDefault());
const eraserButton=game.dom.$('eraserBtn');
eraserButton.addEventListener('pointerdown',e=>{
 if(!canPaint()||modifierPointer!==null||game.api.drawingControls().eraserToggle||e.button>0)return;
 e.preventDefault?.();modifierPointer=e.pointerId;eraserButton.setPointerCapture(e.pointerId);changeEraserMode(()=>{held=true;});
});
const releaseEraser=e=>{if(e.pointerId!==modifierPointer)return;modifierPointer=null;changeEraserMode(()=>{held=false;});};
for(const event of ['pointerup','pointercancel','lostpointercapture'])eraserButton.addEventListener(event,releaseEraser);
eraserButton.onclick=e=>{if(canPaint()&&(game.api.drawingControls().eraserToggle||e.detail===0))changeEraserMode(()=>{toggled=!toggled;});};
game.dom.canvas.addEventListener('pointerdown',e=>{
 if(!canPaint()||strokePointer!==null||e.button!==0&&e.button!==2)return;
 const erase=e.button===2||eraserActive();
 if(!erase&&!game.api.canStartStroke()){game.api.setMsg('Let your ink refill to 6 before drawing.');return;}
 e.preventDefault?.();strokePointer=e.pointerId;rightDrag=e.button===2;lastPoint=game.api.pointerPos(e);game.state.drawing=true;game.state.currentWall=erase?null:[lastPoint];game.dom.canvas.setPointerCapture(e.pointerId);
 if(erase){cursor={...lastPoint,r:20};game.api.eraseWallPath(lastPoint,lastPoint,20);}syncDrawingControls();
});
game.dom.canvas.addEventListener('pointermove',e=>{
 if(strokePointer===null){if(eraserActive()&&canPaint())cursor={...game.api.pointerPos(e),r:20};return;}
 if(e.pointerId!==strokePointer)return;
 if(!canPaint()){cancelDrawingInput();return;}
 const p=game.api.pointerPos(e);
 if(eraserActive()){game.api.eraseWallPath(lastPoint,p,20);cursor={...p,r:20};}
 else if(game.state.currentWall){const q=game.state.currentWall.at(-1);if(game.api.dist(p.x,p.y,q.x,q.y)>6){game.state.currentWall.push(p);game.state.currentWall=game.api.updateLiveWall(game.state.currentWall);game.api.playSound('scribble');}}
 lastPoint=p;
});
game.dom.canvas.addEventListener('pointerup',e=>{if(e.pointerId!==strokePointer)return;if(canPaint())finishStroke();else cancelDrawingInput();});
game.dom.canvas.addEventListener('pointercancel',e=>{if(e.pointerId===strokePointer)cancelDrawingInput();});
game.dom.canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===strokePointer)cancelDrawingInput();});
window.addEventListener('blur',cancelDrawingInput);
syncDrawingControls();
game.dom.$('startBtn').onclick=startRun;
game.dom.$('againBtn').onclick=game.api.returnToMenu;
game.dom.$('scrapGuideShow').onclick=()=>game.api.openInfo('hub');
game.dom.$('scrapGuideSkip').onclick=()=>game.api.openInfo('hub');
game.dom.$('scrapGuideHubSkip').onclick=game.api.openNotebook;
game.dom.$('scrapGuideDone').onclick=()=>game.api.buyNotebookPerk('starterEraser');
game.dom.$('newRunBtn').onclick=startRun;
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
const api = { pointerPos, endDraw, cancelDrawingInput, eraserActive, syncDrawingControls, drawEraserCursor, bind };
Object.assign(game.api, api);
return api;
};
