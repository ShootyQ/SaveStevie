/* input: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.input = function createInputSystem(game) {
function pointerPos(e){
  const r=game.dom.canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}
}

function endDraw(){
  if(!game.state.drawing)return;game.state.drawing=false;game.api.stopSoundEffects('scribble');if(game.state.currentWall)game.api.createWall(game.state.currentWall);game.state.currentWall=null
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
game.dom.$('buildBtn').onclick=game.api.openBuild;
game.dom.$('inspectToolBtn').onclick=game.api.openBuild;
for(const id of ['optionsBtn','splashOptionsBtn'])game.dom.$(id).onclick=game.api.openOptions;
game.dom.$('closeOptionsBtn').onclick=game.api.closeOptions;
for(const id of ['optionsStatsBtn','splashStatsBtn'])game.dom.$(id).onclick=game.api.openStatistics;
game.dom.$('closeStatisticsBtn').onclick=game.api.closeStatistics;
game.dom.$('closeBuildBtn').onclick=game.api.closeBuild;
game.dom.$('changelogBtn').onclick=game.api.openChangelog;
game.dom.$('closeChangelogBtn').onclick=game.api.closeChangelog;
game.dom.$('compendiumBtn').onclick=game.api.openCompendium;
game.dom.$('closeCompendiumBtn').onclick=game.api.closeCompendium;
game.dom.$('monsterIntrosEnabled').onchange=e=>game.api.setMonsterIntrosEnabled(e.target.checked);
game.dom.$('continueMonsterIntroBtn').onclick=game.api.continueMonsterIntro;
for(const id of ['splashNotebookBtn','deathNotebookBtn','victoryNotebookBtn','buildNotebookBtn'])game.dom.$(id).onclick=game.api.openNotebook;
game.dom.$('closeNotebookBtn').onclick=game.api.closeNotebook;
game.dom.$('resetNotebookBtn').onclick=game.api.resetNotebookProgress;
window.addEventListener('keydown',game.api.handleInfoKey);
window.addEventListener('savestevie:background',()=>{
  if(game.state.running&&!game.api.infoOpen()&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec)game.api.openInfo('pause');
  game.api.stopSoundEffects();
});
game.dom.canvas.addEventListener('pointerdown',e=>{
  if(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.state.awaitingSpec)return;
  if(!game.api.canStartStroke()){game.api.setMsg('Let your ink refill to 6 before drawing.');return;}
  game.state.drawing=true;game.state.currentWall=[game.api.pointerPos(e)];game.dom.canvas.setPointerCapture(e.pointerId)
});
game.dom.canvas.addEventListener('pointermove',e=>{
  if(!game.state.drawing||!game.state.currentWall)return;
  const p=game.api.pointerPos(e),q=game.state.currentWall.at(-1);
  if(game.api.dist(p.x,p.y,q.x,q.y)>6){game.state.currentWall.push(p);game.api.playSound('scribble')}
});
game.dom.canvas.addEventListener('pointerup',game.api.endDraw);
game.dom.canvas.addEventListener('pointercancel',game.api.endDraw);
game.dom.$('startBtn').onclick=startRun;
game.dom.$('againBtn').onclick=startRun;
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
  if(game.dom.$('pauseOverlay').style.display==='grid'){game.api.closeInfo(false);return}
  if(game.api.infoOpen()||!game.state.running||game.state.inUpgrade||game.state.betweenWaves||game.state.awaitingSpec)return;
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
const api = { pointerPos, endDraw, bind };
Object.assign(game.api, api);
return api;
};
