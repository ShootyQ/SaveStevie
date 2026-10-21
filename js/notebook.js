/* Permanent, device-local progression. Transactions never consume combat RNG. */
DoodleDefender.systems.notebook = function createNotebook(game) {
const key='saveStevieNotebookV1',costs=[5,12,24,40,60],maxCurrency=1e9;
const toolForRank=rank=>rank>=10?{name:'Scented Sharpie',slots:4}:rank>=6?{name:'Simple Pen',slots:3}:rank>=3?{name:'Mechanical Pencil',slots:2}:{name:'Pencil',slots:2};
const toolCosts=[5,8,12,16,20,24,30,36,44,55];
const turretPrices={turretRange:[10,20,35],turretDuration:[10,20,35],turretCapacity:[30,60],turretRate:[10,20,35],turretFold:[15,30]};
const perkPrice=(perk,rank)=>turretPrices[perk.id]?.[rank]??(perk.id==='startingUpgrade'?45:perk.id==='starterEraser'?0:perk.id==='tool'?toolCosts[rank]:['circles','extraChoice','doodleScraps'].includes(perk.id)?25:costs[rank]);
const perks=game.catalog.notebookPerks=[
  {id:'circles',name:'Circle Studies',max:1,art:'closed-loop',desc:'After defeating the wave 10 boss, unlock 30–140px circles. Enclose enemies for 50% stronger wall contact throughout the circle, or turn an empty circle outside the fort into one paper-ball turret for 10 seconds. Turrets deal 50% more paper damage with fixed range and firing rate. Rubble Ruff can gradually erase their reinforced paper; fading turrets keep full firing power until erased. The turret branch improves range, duration, capacity, firing rate and build time. A new turret replaces the oldest when your capacity is full. Turrets work during the timed wave and disappear when its boss enters.',effect:n=>n?'Enclosures and paper turrets · permanent':'Unlock circles · 25 scraps · beat wave 10 first'},
  {id:'turretRange',name:'Long Paper Barrel',max:3,requires:'circles',art:'architect',desc:'After Circle Studies: +30 turret targeting range per rank, from 210 to 300. Doodle Note range bonuses still belong to Stevie.',effect:n=>(210+30*n)+' turret range'},
  {id:'turretDuration',name:'Stubborn Folds',max:3,requires:'circles',art:'fortress-geometry',desc:'After Circle Studies: +3 seconds per turret per rank, from 10 to 19 seconds. Replacement always starts a fresh lifetime.',effect:n=>(10+3*n)+' seconds per turret'},
  {id:'turretCapacity',name:'Cannon Club',max:2,requires:'circles',art:'collector',desc:'After Circle Studies: +1 active turret per rank, up to three. Building beyond your limit crumbles the oldest cannon.',effect:n=>(1+n)+' active turret'+(n?'s':'')},
  {id:'turretRate',name:'Busy Barrels',max:3,requires:'turretRange',art:'quick-refill',desc:'After Long Paper Barrel: reduce turret firing interval by 0.1 seconds per rank, from 1.25 to 0.95 seconds. Doodle Note throw-speed bonuses still belong to Stevie.',effect:n=>(1.25-.1*n).toFixed(2)+' seconds between turret shots'},
  {id:'turretFold',name:'Quick Origami',max:2,requires:'turretDuration',art:'quick-sketch',desc:'After Stubborn Folds: shorten the automatic build wait by one second per rank, from three to one. You can still confirm or cancel immediately.',effect:n=>(3-n)+' second'+(n===2?'':'s')+' to auto-build'},
  {id:'starterEraser',name:'Starter Eraser',max:1,art:'recycling',desc:'Stevie’s free first purchase. Adds 5 percentage points to ink recovery when erasing; applies to every new run.',effect:n=>n?'+5% erase recovery · permanent':'Claim free after your first adventure'},
  {id:'doodleScraps',name:'Doodle Scraps',max:1,art:'collector',desc:'Unlock mysterious paper drops in future runs, from any wave. Draw through one and choose a stacking trick for Stevie’s paper balls. Discover elemental throws, wall rides, decoys and Connect the Dots. Finds last only for that run.',effect:n=>n?'Doodle Scraps can drop from wave 1':'Unlock discoveries · 25 scraps'},
  {id:'tool',name:'Your Drawing Tool',max:10,art:'thick-ink',desc:'Grow from Pencil to Mechanical Pencil (rank 3), Simple Pen (rank 6), and Scented Sharpie (rank 10). Every rank has its own artwork and adds +8 base wall HP. Pens unlock a third effect slot; Sharpies unlock a fourth.',effect:n=>toolForRank(n).name+' · '+toolForRank(n).slots+' effect slots · +'+8*n+' base wall HP'},
  {id:'inkTank',name:'Bigger Starting Tank',max:5,art:'bigger-ink-tank',desc:'+20 starting/max ink per rank.',effect:n=>'+'+20*n+' starting/max ink'},
  {id:'inkRegen',name:'Refill Practice',max:3,art:'quick-refill',desc:'+1 starting ink regeneration per second per rank. Stacks with run upgrades.',effect:n=>'+'+n+' starting ink/s'},
  {id:'startingUpgrade',name:'Head Start',max:1,art:'loaded-deck',desc:'Choose one Common upgrade before wave 1 of every new run. Uses your normal reward-choice count and starting rerolls. Does not consume a wave reward or a reserved Legendary offer.',effect:n=>n?'Choose a Common upgrade before every run':'Opening upgrade choice · 45 scraps'},
  {id:'extraChoice',name:'Extra Credit',max:1,art:'greedy-goblin',desc:'Start every run with four reward choices instead of three. Boss rewards already have four.',effect:n=>n?'4 reward choices from the first wave':'3 normal reward choices'},
  {id:'health',name:'Lunchbox Band-Aids',max:4,art:'bandages',desc:'+8 starting/max Stevie HP per rank.',effect:n=>'+'+8*n+' Stevie HP'},
  {id:'rocks',name:'Paper Ball Practice',max:3,art:'pocket-rocks',desc:'Start throwing crumpled paper: 2 damage per rank. Higher ranks throw a little faster.',effect:n=>n?(2*n)+' starting paper-ball damage · '+Number((1.6-.1*n).toFixed(1))+'s between throws':'Starting paper balls not unlocked'},
  {id:'rerolls',name:'Lunch Money',max:2,art:'reroll-coupon',desc:'+1 starting reroll per rank. Each cleared wave still supplies a free reroll.',effect:n=>'+'+n+' starting rerolls'},
  {id:'luck',name:'Lucky Eraser',max:4,art:'lucky-scribble',desc:'+2 starting Luck per rank, improving upgrade rarity odds.',effect:n=>'+'+2*n+' starting Luck'}
];
let migrationRefund=0;
let progress={version:2,scraps:0,lifetimeScraps:0,scrapTutorialDone:false,levels:{}},storageIssue=false,runScraps=0,runActive=false,killScraps=0;
const cleanNumber=n=>Number.isSafeInteger(n)&&n>=0?Math.min(maxCurrency,n):0;
try{
  const saved=JSON.parse(localStorage.getItem(key)||'null');
  if(saved&&[1,2].includes(saved.version)&&typeof saved.levels==='object'&&saved.levels!==null){
    progress.scrapTutorialDone=saved.scrapTutorialDone===true;
    progress.speedUnlocked=saved.speedUnlocked===true;progress.betaPencilClaimed=saved.betaPencilClaimed===true;if(saved.wobbleDefeated===true)progress.wobbleDefeated=true;
    progress.scraps=cleanNumber(saved.scraps);progress.lifetimeScraps=Math.max(progress.scraps,cleanNumber(saved.lifetimeScraps));
    for(const p of perks)progress.levels[p.id]=Math.min(p.max,cleanNumber(saved.levels[p.id]));
    if(saved.version===1){
      const oldRank=Math.min(4,cleanNumber(saved.levels.pencil)),refund=costs.slice(0,oldRank).reduce((sum,cost)=>sum+cost,0);
      if(refund){progress.scraps=Math.min(maxCurrency,progress.scraps+refund);progress.lifetimeScraps=Math.max(progress.lifetimeScraps,progress.scraps);migrationRefund=refund;saveNotebook();}
    }
  }
}catch{storageIssue=true}
for(const p of perks)progress.levels[p.id]??=0;
function saveNotebook(){
  try{localStorage.setItem(key,JSON.stringify(progress));storageIssue=false}catch{storageIssue=true}
}
function adoptNotebookBackup(saved){progress={...saved,levels:{...saved.levels}};storageIssue=false;migrationRefund=0;runScraps=0;killScraps=0;runActive=false;updateScrapCounters();}
function notebookSnapshot(){return {...progress,levels:{...progress.levels},runScraps,runActive,storageIssue}}
function updateScrapCounters(){
  for(const id of ['splashScraps','buildScraps','deathBankScraps','victoryBankScraps','betaTreeBank'])game.dom.$(id).textContent=progress.scraps;
  for(const id of ['waveRunScraps','deathRunScraps','victoryRunScraps'])game.dom.$(id).textContent=runScraps;
}
function awardScraps(amount){
  if(game.api.devRunActive()||!runActive||!Number.isSafeInteger(amount)||amount<=0)return;
  const earned=Math.min(amount,maxCurrency-progress.scraps);
  progress.scraps+=earned;progress.lifetimeScraps=Math.min(maxCurrency,progress.lifetimeScraps+earned);runScraps+=earned;
  saveNotebook();updateScrapCounters();
}
function beginScrapRun(){runScraps=0;killScraps=0;runActive=!game.api.devRunActive();updateScrapCounters()}
function resumeScrapRun(){runActive=true}
function awardKillScraps(){
  if(!runActive)return;
  const b=game.catalog.balance;
  if(game.state.kills%b.killsPerScrap===0&&killScraps<b.killScrapCap){awardScraps(1);killScraps++}
}
function awardWaveScraps(){
  const wave=game.state.wave,chapter=!game.state.endless&&wave<=20&&wave%5===0;
  game.api.awardScraps(1+(chapter?game.catalog.balance.chapterScraps[wave/5-1]:0));
}
function finishScrapRun(victory=false,consolation=true){
  if(!runActive)return;
  if(victory)awardScraps(game.catalog.balance.victoryScraps);else if(consolation&&runScraps===0)awardScraps(1);
  runActive=false;updateScrapCounters();
}
function applyNotebookLoadout(){
  const l=progress.levels,s=game.state.stats,p=game.state.player;
  game.state.tool={...toolForRank(l.tool),rank:l.tool};
  s.eraseRefund+=.05*l.starterEraser;
  s.inkRegen+=l.inkRegen;s.extraChoice=!!l.extraChoice;
  s.maxInk+=l.inkTank*20;s.ink=s.maxInk;s.wallHp+=l.tool*8;
  p.maxHp+=l.health*8;p.hp=p.maxHp;
  s.rockDamage=l.rocks*2;s.rockRate=l.rocks?Number((1.6-.1*l.rocks).toFixed(1)):0;
  s.luck+=l.luck*2;game.state.rerolls+=l.rerolls;
}
function canSpendScraps(){return !game.state.running}
function doubleSpeedUnlocked(){return progress.speedUnlocked===true||game.state.best>5;}
function recordSpeedVictory(e){
 if(game.api.devRunActive()||game.api.testLabActive?.()||game.state.endless||game.state.wave!==5||!e.waveBoss||e.type!=='boss'||e.hp>0||doubleSpeedUnlocked())return false;
 progress.speedUnlocked=true;saveNotebook();game.api.setMsg('2× speed unlocked! Change game speed in Pause on any run.');return true;
}
function shapeStudiesAvailable(){return progress.wobbleDefeated===true||game.state.best>10||progress.levels.circles>0;}
function recordShapeVictory(e){if(game.api.devRunActive()||game.state.endless||game.state.wave!==10||!e.waveBoss||!['wobblechomp','bootstomp'].includes(e.type)||e.hp>0)return false;progress.wobbleDefeated=true;saveNotebook();return true;}
function buyNotebookPerk(id){
  const perk=perks.find(p=>p.id===id);if(!perk||!canSpendScraps())return false;
  const rank=progress.levels[id],price=perkPrice(perk,rank);
  if(id==='circles'&&!shapeStudiesAvailable())return false;
  if(perk.requires&&!progress.levels[perk.requires])return false;
  if(rank>=perk.max||progress.scraps<price||id==='starterEraser'&&progress.lifetimeScraps===0)return false;
  progress.scraps-=price;progress.levels[id]++;if(id==='starterEraser')progress.scrapTutorialDone=true;saveNotebook();updateScrapCounters();renderNotebook();syncScrapTutorial();
  return true;
}
// The free starting node opens the tree without granting duplicate stats.
function claimBetaPencil(){
  if(!canSpendScraps()||progress.betaPencilClaimed)return false;
  progress.betaPencilClaimed=true;saveNotebook();return true;
}
function notebookPerkPrice(id){const p=perks.find(p=>p.id===id);return p?perkPrice(p,progress.levels[id]):null;}
function resetNotebookProgress(){
  if(!window.confirm('Start over? This erases all scraps, permanent Notebook perks, your best-wave record, and the current run on this browser. Music and monster-intro settings stay.'))return false;
  const fresh={version:2,scraps:0,lifetimeScraps:0,levels:Object.fromEntries(perks.map(p=>[p.id,0]))};
  let oldBest=null;
  try{
    oldBest=localStorage.getItem('doodleDefenderBestV4');
    localStorage.setItem('doodleDefenderBestV4','1');
    localStorage.setItem(key,JSON.stringify(fresh));
  }catch{
    try{if(oldBest!==null)localStorage.setItem('doodleDefenderBestV4',oldBest)}catch{}
    game.dom.$('optionsStorageNote').textContent='Could not reset saved progress. Check this browser’s storage settings and try again.';
    return false;
  }
  progress=fresh;migrationRefund=0;storageIssue=false;game.api.resetFirstLessons?.();
  game.api.closeInfo();game.state.best=1;game.api.resetRun();game.api.closeInfo();
  game.state.running=false;game.state.paused=false;runActive=false;runScraps=0;killScraps=0;
  game.api.selectMusicTrack('splash');
  game.dom.startOverlay.style.display='grid';updateScrapCounters();game.api.updateUI();
  game.dom.$('startBtn').focus?.();return true;
}
// Compatibility entry point for internal callers; the old shop has been retired.
function renderNotebook(){
  updateScrapCounters();game.api.renderBetaTree?.();
  if(migrationRefund)game.dom.$('betaTreeStatus').textContent+=' '+migrationRefund+' scraps returned from the retired Fresh Pencil upgrade.';
}
function scrapLessonPending(){return progress.lifetimeScraps>0&&!progress.scrapTutorialDone&&!progress.levels.starterEraser&&!game.api.devModeEnabled();}
// Wait until a later menu visit; never interrupt earning scraps or a live run.
function syncScrapTutorial(){
 const eligible=scrapLessonPending()&&!game.state.running;
 const tree=eligible&&game.dom.$('betaScrapsOverlay').style.display==='grid';
 const hub=eligible&&game.dom.$('hubOverlay').style.display==='grid';
 const cover=eligible&&!game.api.infoOpen()&&game.dom.startOverlay.style.display!=='none';
 game.dom.$('startBtn').disabled=eligible||game.api.artworkStatus?.().ready===false;
 game.dom.$('splashHubBtn').classList?.toggle('scrap-guide-target',cover);
 game.dom.$('hubNotebookBtn').classList?.toggle('scrap-guide-target',hub);
 game.api.showScrapCoach?.(tree?game.api.scrapTreeLessonStage():hub?'hub':cover?'cover':null);
}
function finishScrapTutorial(){if(!progress.betaPencilClaimed&&!progress.levels.starterEraser)return false;progress.scrapTutorialDone=true;saveNotebook();syncScrapTutorial();return true;}
function openNotebook(){game.api.openInfo('betaScraps')}
function closeNotebook(){game.api.closeInfo()}
const api={doubleSpeedUnlocked,recordSpeedVictory,shapeStudiesAvailable,recordShapeVictory,claimBetaPencil,notebookPerkPrice,adoptNotebookBackup,scrapLessonPending,syncScrapTutorial,finishScrapTutorial,awardWaveScraps,resetNotebookProgress,notebookSnapshot,updateScrapCounters,beginScrapRun,resumeScrapRun,awardScraps,awardKillScraps,finishScrapRun,applyNotebookLoadout,canSpendScraps,buyNotebookPerk,renderNotebook,openNotebook,closeNotebook};
Object.assign(game.api,api);updateScrapCounters();return api;
};
