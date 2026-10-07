/* waves: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.waves = function createWavesSystem(game) {
// Two rotating decks: every note appears before its deck repeats. Presentation
// storage is independent of scraps, progression, and the combat random stream.
const stevieNotes={
 death:[
  "Okay. New plan. Fewer monsters. More walls. Maybe a sandwich.",
  "I was doing my brave face. Apparently the monsters did not notice.",
  "That was practice. Very loud, slightly bitey practice.",
  "Please do not show this page to my maths teacher. She already worries.",
  "I think my left shoe is still in there. We should probably go back.",
  "The good news: your drawing is getting better. The bad news has teeth.",
  "I wrote a plan on the back of this note. It just says RUN twice.",
  "Next time I am bringing a helmet. A cereal bowl counts, right?",
  "That monster was definitely cheating. I saw it use both feet.",
  "Can we erase that bit and pretend I did something really cool?",
  "I am not scared. My knees are just doing a little dance.",
  "We need a bigger fort. And a secret snack room. Mostly the fort.",
  "I almost had them! Unless you were watching. Then you know I did not.",
  "My rock missed. I was aiming at the other notebook. Obviously.",
  "If Mum asks, this is a drawing of me taking a nap.",
  "I put DO NOT BITE on the wall. Nobody reads signs anymore.",
  "Please keep drawing me. Being a blank page would be really boring.",
  "I vote we start again before the monsters finish celebrating.",
  "I tried saying please. Next time I am trying a rock.",
  "That fort needed a roof. And a floor. And about six more forts.",
  "You stayed with me till the end. That was pretty awesome of you.",
  "I have a new strategy. It involves not standing exactly there.",
  "Someone owes me a new school shirt. There are teeth holes in this one.",
  "I would give that adventure a D. D for DO IT AGAIN.",
  "Small problem: monsters. Bigger problem: I dropped my lunch.",
  "I am saving this page anyway. The cool bits still count.",
  "Maybe they just wanted to borrow a pencil? No. Probably not.",
  "Next page, I am drawing myself slightly faster legs.",
  "We got knocked over. We can get drawn back up. That is our thing.",
  "You bring the pencil. I will bring the rocks. And a spare shoe."
 ],
 victory:[
  "WE DID IT! I am telling everyone. Even people who did not ask.",
  "That is going straight on the fridge. Move over, spelling test.",
  "You saved me AND my notebook. My homework is still doomed though.",
  "I did a victory dance. Please imagine it was really cool.",
  "I am making you a medal. It is cardboard. Do not get it wet.",
  "The monsters picked the wrong kid with the right pencil friend.",
  "I knew we could do it! Except for the bits where I definitely did not.",
  "Can you sign this page? You are basically famous in my notebook now.",
  "No more monsters! For now. I do not trust the next page.",
  "I am keeping the fort. It is my room now. Knock before entering.",
  "That eraser thought it was so tough. Look who is still drawn!",
  "I think we earned extra recess. I will write a note to the teacher.",
  "My hands are shaking. From being AWESOME. And a little bit scared.",
  "Best. Pencil. Friend. Ever. I underlined it three times.",
  "We should form a club. Rule one: no monsters. Rule two: snacks.",
  "I am calling this masterpiece Stevie Does Not Get Eaten.",
  "I saved you a rock as a souvenir. Sorry it is just a drawing.",
  "A plus! Actually, A plus plus. I am allowed to grade this one.",
  "I drew a trophy on the back. The handles look like ears. Still counts.",
  "You made a little scribble kid feel ten feet tall. Thanks for that."
 ]
};
let noteNext={death:0,victory:0},noteChosen={death:null,victory:null};
try{
 const saved=JSON.parse(localStorage.getItem('saveStevieNoteDecks')||'null');
 for(const kind of ['death','victory'])if(Number.isSafeInteger(saved?.[kind])&&saved[kind]>=0)noteNext[kind]=saved[kind]%stevieNotes[kind].length;
}catch{} // Notes still rotate for this session when storage is unavailable.
function stevieNote(victory=false){
 const s=game.state,kind=victory?'victory':'death';
 const favorite=game.api.equippedEffects().slice().sort((a,b)=>(s.stacks[b.name]||0)-(s.stacks[a.name]||0))[0];
 return {
  heading:victory?'YOU SAVED MY LITTLE DOODLED LIFE.':s.wave>=15?'WE ALMOST HAD THAT ERASER.':s.wave>=5?'THAT WAS A PROPER ADVENTURE.':'SAME NOTEBOOK. FRESH PAGE.',
  message:stevieNotes[kind][noteChosen[kind]??noteNext[kind]],
  keepsake:favorite?'Favorite scribble: '+favorite.name+' · level '+s.stacks[favorite.name]:'Drawn with graphite · '+s.tool.name
 };
}
function renderStevieNote(victory=false){
 const prefix=victory?'victory':'death';
 if(noteChosen[prefix]===null){
  noteChosen[prefix]=noteNext[prefix];noteNext[prefix]=(noteNext[prefix]+1)%stevieNotes[prefix].length;
  try{localStorage.setItem('saveStevieNoteDecks',JSON.stringify(noteNext))}catch{}
 }
 const note=stevieNote(victory);
 for(const [key,suffix] of [['heading','Heading'],['message','Message'],['keepsake','Keepsake']])game.dom.$(prefix+'Note'+suffix).textContent=note[key];
}
function waveDuration(){
  return 60;
}

function resetRun(options={}){
  game.api.resetWaveFinale();
  noteChosen={death:null,victory:null};
  game.api.closeInfo(false);
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
  game.api.beginDevRun();
  if(options.skipNotebook)game.state.tool={name:"Pencil",rank:0,slots:2};else game.api.applyNotebookLoadout();game.api.beginScrapRun();game.api.resetRewardPlan();
  game.state.running=true;game.state.paused=false;game.state.inUpgrade=false;game.state.betweenWaves=false;game.state.awaitingSpec=false;
  game.dom.startOverlay.style.display='none';game.dom.gameOverOverlay.style.display='none';game.dom.upgradeOverlay.style.display='none';
  game.dom.waveOverlay.style.display='none';game.dom.victoryOverlay.style.display='none';game.dom.specializeOverlay.style.display='none';
  game.api.startWave({skipIntro:options.skipIntro});
}

function startWave(options={}){
  game.api.resetWaveFinale();
  game.api.selectMusicTrack(game.api.chapterForWave().id);
  game.api.resetStevieAnimation();
  game.api.resetEnemyAnimations();
  game.api.resetAbilityEffects();
  game.api.resetLaunchEffects();
  game.api.resetSupportInks();
  game.api.resetPlaguefire();
  game.api.resetSoundEffects();game.api.resetRefuge();game.api.resetEnemyWave();game.api.resetSustain();
  game.state.walls=[];game.state.enemies=[];game.state.projectiles=[];game.state.enemyShots=[];game.state.particles=[];game.state.floaters=[];
  game.state.finalOvertime=false; game.state.finalBossDefeated=false;
  game.state.stats.ink=game.state.stats.maxInk;
  game.state.stats.firstStrokeUsed=false;
  game.state.waveElapsed=0;game.state.waveKills=0;game.state.waveTime=game.api.waveDuration();game.state.timeLeft=game.state.waveTime;game.state.spawnTimer=game.state.wave===1?game.catalog.balance.openingDelay:.5;
  game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+game.state.stats.playerRegen+5);
  game.api.setMsg(game.state.wave%5===0?'Wave '+game.state.wave+'. Clear the timed fight; the boss follows.':'Wave '+game.state.wave+'. Fresh page, full ink.');
  game.api.updateUI();
  if(!options.skipIntro&&!game.api.testLabActive?.())game.api.introduceWave();
}

function waveComplete(){
  if(game.api.waveFinaleActive())return;
  if(game.state.betweenWaves||game.state.inUpgrade||!game.state.running||game.api.campaignBossPending()||(game.state.wave%5!==0&&game.state.enemies.length>0)||(game.state.wave%5===0&&!game.api.bossFightResolved()))return;
  game.api.stopSoundEffects();
  game.state.betweenWaves=true;
  game.api.awardWaveScraps();
  game.api.celebrateStevie();
  game.api.resetAbilityEffects();
  game.api.resetLaunchEffects();
  game.api.resetSupportInks();game.api.resetBossEncounters();
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
    game.api.finishScrapRun(true);renderStevieNote(true);
    game.state.running=false;game.dom.$('victoryScore').textContent=game.state.score;game.dom.victoryOverlay.style.display='grid';
    if(!game.api.devRunActive()&&game.state.wave>game.state.best){game.state.best=game.state.wave;localStorage.setItem('doodleDefenderBestV4',game.state.best)}
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

function returnToMenu(){
  game.api.resetEnemyWave();
  game.api.resetWaveFinale();
  game.api.closeInfo(false);game.api.finishScrapRun(false,false);game.api.stopSoundEffects();
  game.state.running=false;game.state.paused=false;game.state.inUpgrade=false;game.state.betweenWaves=false;game.state.awaitingSpec=false;
  game.state.drawing=false;game.state.currentWall=null;
  game.state.walls=[];game.state.enemies=[];game.state.projectiles=[];game.state.enemyShots=[];
  game.api.resetAbilityEffects();
  game.api.resetLaunchEffects();game.api.resetSupportInks();game.api.resetBossEncounters();game.api.resetPlaguefire();
  for(const id of ['upgradeOverlay','waveOverlay','victoryOverlay','gameOverOverlay','specializeOverlay'])game.dom.$(id).style.display='none';
  game.dom.startOverlay.style.display='grid';game.api.selectMusicTrack('splash');game.api.updateUI();game.dom.$('startBtn').focus?.();
}
function gameOver(){
  game.api.resetWaveFinale();
  game.api.stopSoundEffects();
  game.api.finishScrapRun();renderStevieNote();
  game.state.running=false;
  game.dom.$('finalWave').textContent=game.state.wave;game.dom.$('finalKills').textContent=game.state.kills;game.dom.$('finalScore').textContent=game.state.score;
  game.dom.gameOverOverlay.style.display='grid';
  if(!game.api.devRunActive()&&game.state.wave>game.state.best){game.state.best=game.state.wave;localStorage.setItem('doodleDefenderBestV4',game.state.best)}
}
const api = { stevieNote, renderStevieNote, waveDuration, returnToMenu, resetRun, startWave, waveComplete, proceedAfterWave, gameOver };
Object.assign(game.api, api);
return api;
};
