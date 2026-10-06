/* waves: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.waves = function createWavesSystem(game) {
function waveDuration(){
  return 60;
}

function resetRun(){
  game.api.closeInfo();
  game.dom.$('lastHitText').textContent='';
  game.state.wave=1;game.state.kills=0;game.state.score=0;game.state.waveKills=0;game.state.rerolls=0;game.state.endless=false;game.state.specialization='none';game.state.finalOvertime=false;game.state.finalBossDefeated=false;
  game.state.walls=[];game.state.enemies=[];game.state.particles=[];game.state.floaters=[];game.state.projectiles=[];game.state.enemyShots=[];game.state.synergies.clear();
  Object.assign(game.state.stats,{
    maxInk:160,ink:160,inkRegen:5,wallHp:65,wallDamage:8,wallSlow:0,wallStun:0,
    refund:0,luck:0,playerRegen:0,doubleLine:false,tripleLine:false,explode:false,
    repairOnKill:0,freehandLevel:0,freehandCharge:0,freehandThreshold:80,freehandBank:0,freehandBankSize:40,strokeCount:0,closedBonus:1,killHeal:0,
    lineCost:.31,lineWidth:8,wallLife:72,intersectBonus:0,repairDraw:0,firstFree:false,
    firstStrokeUsed:false,playerArmor:0,rockDamage:0,rockRate:0,enemyScale:1,
    extraChoice:false,uncommonFloor:false,newCardBias:false
  });
  Object.keys(game.state.inks).forEach(k=>game.state.inks[k]=0);
  for(const k in game.state.stacks)delete game.state.stacks[k];
  game.state.player.maxHp=75;game.state.player.hp=75;game.state.player.rockCd=0;
  game.state.drawing=false;game.state.currentWall=null;
  game.api.applyNotebookLoadout();game.api.beginScrapRun();
  game.state.running=true;game.state.paused=false;game.state.inUpgrade=false;game.state.betweenWaves=false;game.state.awaitingSpec=false;
  game.dom.startOverlay.style.display='none';game.dom.gameOverOverlay.style.display='none';game.dom.upgradeOverlay.style.display='none';
  game.dom.waveOverlay.style.display='none';game.dom.victoryOverlay.style.display='none';game.dom.specializeOverlay.style.display='none';
  game.api.startWave();
}

function startWave(){
  game.api.resetStevieAnimation();
  game.api.resetEnemyAnimations();
  game.api.resetAbilityEffects();
  game.api.resetEnemyWave();
  game.state.walls=[];game.state.enemies=[];game.state.projectiles=[];game.state.enemyShots=[];game.state.particles=[];game.state.floaters=[];
  game.state.finalOvertime=false; game.state.finalBossDefeated=false;
  game.state.stats.ink=game.state.stats.maxInk;
  game.state.stats.firstStrokeUsed=false;
  game.state.waveKills=0;game.state.waveTime=game.api.waveDuration();game.state.timeLeft=game.state.waveTime;game.state.spawnTimer=.5;
  game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+game.state.stats.playerRegen+5);
  game.api.setMsg(game.state.wave===20&&!game.state.endless?game.api.monsterName('eraser')+' approaches. This seems personal.':game.state.wave%5===0?'Boss wave. Fresh page, full ink.':'Wave '+game.state.wave+'. Fresh page, full ink.');
  game.api.updateUI();
  game.api.introduceWave();
}

function waveComplete(){
  if(game.state.betweenWaves||game.state.inUpgrade||!game.state.running)return;
  game.state.betweenWaves=true;
  game.api.awardScraps(3);
  game.api.celebrateStevie();
  game.api.resetAbilityEffects();
  for(const e of game.state.enemies)game.api.burst(e.x,e.y,'#d9d2bf',8);
  game.state.enemies=[];game.state.projectiles=[];game.state.enemyShots=[];

  const survival=100,killBonus=game.state.waveKills*10;
  const inkBonus=Math.floor(75*(game.state.stats.ink/game.state.stats.maxInk));
  const hpBonus=Math.floor(75*(game.state.player.hp/game.state.player.maxHp));
  const total=survival+killBonus+inkBonus+hpBonus;
  game.state.score+=total;

  game.dom.$('survivalBonus').textContent='+'+survival;
  game.dom.$('killBonus').textContent='+'+killBonus;
  game.dom.$('inkBonus').textContent='+'+inkBonus;
  game.dom.$('hpBonus').textContent='+'+hpBonus;
  game.dom.$('waveScore').textContent=total;
  game.dom.$('waveClearTitle').textContent='Wave '+game.state.wave+' cleared!';

  if(game.state.wave===20&&!game.state.endless){
    game.api.finishScrapRun(true);
    game.state.running=false;game.dom.$('victoryScore').textContent=game.state.score;game.dom.victoryOverlay.style.display='grid';
    if(game.state.wave>game.state.best){game.state.best=game.state.wave;localStorage.setItem('doodleDefenderBestV4',game.state.best)}
    game.api.updateUI();return;
  }
  game.dom.waveOverlay.style.display='grid';game.api.updateUI();
}

function proceedAfterWave(){
  game.dom.waveOverlay.style.display='none';
  if(game.state.wave%5===0&&!game.state.endless){
    game.state.awaitingSpec=true;game.dom.specializeOverlay.style.display='grid';
  }else game.api.openUpgrade();
}

function gameOver(){
  game.api.finishScrapRun();
  game.state.running=false;
  game.dom.$('finalWave').textContent=game.state.wave;game.dom.$('finalKills').textContent=game.state.kills;game.dom.$('finalScore').textContent=game.state.score;
  game.dom.gameOverOverlay.style.display='grid';
  if(game.state.wave>game.state.best){game.state.best=game.state.wave;localStorage.setItem('doodleDefenderBestV4',game.state.best)}
}
const api = { waveDuration, resetRun, startWave, waveComplete, proceedAfterWave, gameOver };
Object.assign(game.api, api);
return api;
};
