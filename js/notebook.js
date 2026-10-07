/* Permanent, device-local progression. Transactions never consume combat RNG. */
DoodleDefender.systems.notebook = function createNotebook(game) {
const key='saveStevieNotebookV1',costs=[5,12,24,40,60],maxCurrency=1e9;
const toolForRank=rank=>rank>=10?{name:'Scented Sharpie',slots:4}:rank>=6?{name:'Simple Pen',slots:3}:rank>=3?{name:'Mechanical Pencil',slots:2}:{name:'Pencil',slots:2};
const toolCosts=[5,8,12,16,20,24,30,36,44,55];
const perkPrice=(perk,rank)=>perk.id==='tool'?toolCosts[rank]:perk.id==='extraChoice'?25:costs[rank];
const perks=game.catalog.notebookPerks=[
  {id:'tool',name:'Your Drawing Tool',max:10,art:'thick-ink',desc:'Grow from Pencil to Mechanical Pencil (rank 3), Simple Pen (rank 6), and Scented Sharpie (rank 10). Pens unlock a third effect slot; Sharpies unlock a fourth.',effect:n=>toolForRank(n).name+' · '+toolForRank(n).slots+' effect slots'},
  {id:'inkTank',name:'Bigger Starting Tank',max:5,art:'bigger-ink-tank',desc:'+20 starting/max ink per rank.',effect:n=>'+'+20*n+' starting/max ink'},
  {id:'inkRegen',name:'Refill Practice',max:3,art:'quick-refill',desc:'+1 starting ink regeneration per second per rank. Stacks with run upgrades.',effect:n=>'+'+n+' starting ink/s'},
  {id:'extraChoice',name:'Extra Credit',max:1,art:'greedy-goblin',desc:'Start every run with four reward choices instead of three. Boss rewards already have four.',effect:n=>n?'4 reward choices from the first wave':'3 normal reward choices'},
  {id:'pencil',name:'Fresh Pencil',max:4,art:'thick-ink',desc:'+8 starting wall HP per rank.',effect:n=>'+'+8*n+' base wall HP'},
  {id:'health',name:'Lunchbox Band-Aids',max:4,art:'bandages',desc:'+8 starting/max Stevie HP per rank.',effect:n=>'+'+8*n+' Stevie HP'},
  {id:'rocks',name:'Pocket Pebbles',max:3,art:'pocket-rocks',desc:'Start throwing rocks: 3 damage per rank. Higher ranks throw a little faster.',effect:n=>n?(3*n)+' starting rock damage · '+Number((1.6-.1*n).toFixed(1))+'s between throws':'Starting rocks not unlocked'},
  {id:'rerolls',name:'Lunch Money',max:2,art:'reroll-coupon',desc:'+1 starting reroll per rank. Each cleared wave still supplies a free reroll.',effect:n=>'+'+n+' starting rerolls'},
  {id:'luck',name:'Lucky Eraser',max:4,art:'lucky-scribble',desc:'+2 starting Luck per rank, improving upgrade rarity odds.',effect:n=>'+'+2*n+' starting Luck'}
];
let progress={version:1,scraps:0,lifetimeScraps:0,levels:{}},storageIssue=false,runScraps=0,runActive=false,killScraps=0;
const cleanNumber=n=>Number.isSafeInteger(n)&&n>=0?Math.min(maxCurrency,n):0;
try{
  const saved=JSON.parse(localStorage.getItem(key)||'null');
  if(saved&&saved.version===1&&typeof saved.levels==='object'&&saved.levels!==null){
    progress.scraps=cleanNumber(saved.scraps);progress.lifetimeScraps=Math.max(progress.scraps,cleanNumber(saved.lifetimeScraps));
    for(const p of perks)progress.levels[p.id]=Math.min(p.max,cleanNumber(saved.levels[p.id]));
  }
}catch{storageIssue=true}
for(const p of perks)progress.levels[p.id]??=0;
function saveNotebook(){
  try{localStorage.setItem(key,JSON.stringify(progress));storageIssue=false}catch{storageIssue=true}
}
function notebookSnapshot(){return {...progress,levels:{...progress.levels},runScraps,runActive,storageIssue}}
function updateScrapCounters(){
  for(const id of ['splashScraps','buildScraps','deathBankScraps','victoryBankScraps','notebookBank'])game.dom.$(id).textContent=progress.scraps;
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
  s.inkRegen+=l.inkRegen;s.extraChoice=!!l.extraChoice;
  s.maxInk+=l.inkTank*20;s.ink=s.maxInk;s.wallHp+=l.pencil*8;
  p.maxHp+=l.health*8;p.hp=p.maxHp;
  s.rockDamage=l.rocks*3;s.rockRate=l.rocks?Number((1.6-.1*l.rocks).toFixed(1)):0;
  s.luck+=l.luck*2;game.state.rerolls+=l.rerolls;
}
function canSpendScraps(){return !game.state.running}
function buyNotebookPerk(id){
  const perk=perks.find(p=>p.id===id);if(!perk||!canSpendScraps())return false;
  const rank=progress.levels[id],price=perkPrice(perk,rank);
  if(rank>=perk.max||progress.scraps<price)return false;
  progress.scraps-=price;progress.levels[id]++;saveNotebook();updateScrapCounters();renderNotebook();
  game.dom.$('notebookNotice').textContent=perk.name+' is now rank '+progress.levels[id]+'. Ready for your next run!'+(storageIssue?' This browser is not saving progress; this purchase lasts for this visit.':'');
  const bought=game.dom.$('notebookBuy-'+id);
  (bought.disabled?game.dom.$('closeNotebookBtn'):bought).focus?.({preventScroll:true});return true;
}
function resetNotebookProgress(){
  if(!window.confirm('Start over? This erases all scraps, permanent Notebook perks, your best-wave record, and the current run on this browser. Music and monster-intro settings stay.'))return false;
  const fresh={version:1,scraps:0,lifetimeScraps:0,levels:Object.fromEntries(perks.map(p=>[p.id,0]))};
  let oldBest=null;
  try{
    oldBest=localStorage.getItem('doodleDefenderBestV4');
    localStorage.setItem('doodleDefenderBestV4','1');
    localStorage.setItem(key,JSON.stringify(fresh));
  }catch{
    try{if(oldBest!==null)localStorage.setItem('doodleDefenderBestV4',oldBest)}catch{}
    game.dom.$('notebookNotice').textContent='Could not reset saved progress. Check this browser’s storage settings and try again.';
    return false;
  }
  progress=fresh;storageIssue=false;
  game.api.closeInfo();game.state.best=1;game.api.resetRun();game.api.closeInfo();
  game.state.running=false;game.state.paused=false;runActive=false;runScraps=0;killScraps=0;
  game.api.selectMusicTrack('splash');
  game.dom.startOverlay.style.display='grid';updateScrapCounters();game.api.updateUI();
  game.dom.$('startBtn').focus?.();return true;
}
function renderNotebook(){
  updateScrapCounters();const locked=!canSpendScraps(),version=document.documentElement?.dataset?.build,query=version?'?v='+encodeURIComponent(version):'';
  game.dom.$('notebookNotice').textContent=storageIssue?'This browser is not saving progress. Scraps and purchases are kept for this visit.':locked?'Your run is paused. Purchases unlock after it ends and apply to the next run.':'Spend scraps on your next attempt. Permanent perks stack with the upgrades you earn during a run.';
  const l=progress.levels;
  game.dom.$('notebookLoadout').textContent='Next run: '+toolForRank(l.tool).name+' · '+toolForRank(l.tool).slots+' effect slots · '+(160+l.inkTank*20)+' ink · '+(5+l.inkRegen)+' ink/s · '+(65+l.pencil*8)+' wall HP · 8 wall damage/s · '+(75+l.health*8)+' Stevie HP · '+l.rerolls+' starting rerolls · '+(l.extraChoice?4:3)+' reward choices · '+(l.luck*2)+' Luck'+(l.rocks?' · '+l.rocks*3+' rock damage':'');
  const list=game.dom.$('notebookPerks');list.innerHTML='';
  for(const perk of perks){
    const rank=l[perk.id],maxed=rank===perk.max,price=perkPrice(perk,rank),card=document.createElement('article');card.className='notebook-perk';
    const art=perk.id==='tool'?'assets/art/tools/'+(rank>=10?'sharpie':rank>=6?'pen':rank>=3?'mechanical':'pencil')+'.svg':'assets/art/upgrades/'+perk.art+'.svg';
    card.innerHTML=`${perk.id==='tool'?game.api.toolIllustration(rank):''}<div class="notebook-perk-heading"><img src="${art}${query}" alt="" width="48" height="48"><div><h3>${perk.name}</h3><span>Rank ${rank} / ${perk.max}</span></div></div><p>${perk.desc}</p><p class="notebook-effect">${perk.effect(rank)}</p><p class="notebook-next">${maxed?'All ranks unlocked.':'Next rank: '+perk.effect(rank+1)}</p>`;
    const button=document.createElement('button');button.id='notebookBuy-'+perk.id;
    button.disabled=maxed||locked||progress.scraps<price;
    button.textContent=maxed?'Fully upgraded':locked?'Available after this run':'Buy rank '+(rank+1)+' · '+price+' scraps';
    button.onclick=()=>buyNotebookPerk(perk.id);card.appendChild(button);list.appendChild(card);
  }
}
function openNotebook(){game.api.openInfo('notebook')}
function closeNotebook(){game.api.closeInfo()}
const api={awardWaveScraps,resetNotebookProgress,notebookSnapshot,updateScrapCounters,beginScrapRun,resumeScrapRun,awardScraps,awardKillScraps,finishScrapRun,applyNotebookLoadout,canSpendScraps,buyNotebookPerk,renderNotebook,openNotebook,closeNotebook};
Object.assign(game.api,api);updateScrapCounters();return api;
};
