/* input: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.input = function createInputSystem(game) {
function pointerPos(e){
  const r=game.dom.canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}
}

function endDraw(){
  if(!game.state.drawing)return;game.state.drawing=false;if(game.state.currentWall)game.api.createWall(game.state.currentWall);game.state.currentWall=null
}
function bind() {
window.addEventListener('resize',game.api.resize);
game.dom.$('buildBtn').onclick=game.api.openBuild;
game.dom.$('closeBuildBtn').onclick=game.api.closeBuild;
window.addEventListener('keydown',e=>{
  if(game.dom.$('buildOverlay').style.display!=='grid')return;
  if(e.key==='Escape')game.api.closeBuild();
  if(e.key==='Tab'){e.preventDefault();game.dom.$('closeBuildBtn').focus?.()}
});
game.dom.canvas.addEventListener('pointerdown',e=>{
  if(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.state.awaitingSpec)return;
  game.state.drawing=true;game.state.currentWall=[game.api.pointerPos(e)];game.dom.canvas.setPointerCapture(e.pointerId)
});
game.dom.canvas.addEventListener('pointermove',e=>{
  if(!game.state.drawing||!game.state.currentWall)return;
  const p=game.api.pointerPos(e),q=game.state.currentWall.at(-1);
  if(game.api.dist(p.x,p.y,q.x,q.y)>6)game.state.currentWall.push(p)
});
game.dom.canvas.addEventListener('pointerup',game.api.endDraw);
game.dom.canvas.addEventListener('pointercancel',game.api.endDraw);
game.dom.$('startBtn').onclick=game.api.resetRun;
game.dom.$('againBtn').onclick=game.api.resetRun;
game.dom.$('newRunBtn').onclick=game.api.resetRun;
game.dom.$('continueBtn').onclick=game.api.proceedAfterWave;
game.dom.$('rerollBtn').onclick=game.api.reroll;
game.dom.$('endlessBtn').onclick=()=>{
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
  if(!game.state.running||game.state.inUpgrade||game.state.betweenWaves||game.state.awaitingSpec)return;
  game.state.paused=!game.state.paused;game.dom.$('pauseBtn').textContent=game.state.paused?'Resume':'Pause'
};
}
const api = { pointerPos, endDraw, bind };
Object.assign(game.api, api);
return api;
};
