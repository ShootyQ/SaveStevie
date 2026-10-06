/* Device-local audio preferences and read-only run/Notebook statistics. */
DoodleDefender.systems.settings = function createSettings(game) {
const key='saveStevieAudioV1',defaults={musicVolume:.35,effectsVolume:.7};
let preferences={...defaults},storageIssue=false;
const volume=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.min(1,Math.max(0,value)):fallback;
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object')for(const name of Object.keys(defaults))preferences[name]=volume(saved[name],defaults[name]);}catch{storageIssue=true;}
function audioSettings(){return {...preferences,storageIssue};}
function setAudioVolume(name,value){
  if(!Object.hasOwn(defaults,name)||typeof value!=='number'||!Number.isFinite(value))return false;
  preferences[name]=volume(value,defaults[name]);
  try{localStorage.setItem(key,JSON.stringify(preferences));storageIssue=false;}catch{storageIssue=true;}
  game.api.applyMusicVolume?.();game.api.applyEffectsVolume?.();renderOptions();return true;
}
// Session-only manual rewards. Once used, a run stays unranked until reset.
let devEnabled=false,testRun=false;
function devModeEnabled(){return devEnabled}
function devRunActive(){return testRun}
function beginDevRun(){testRun=devEnabled;renderDevMode()}
function setDevMode(enabled){
  devEnabled=!!enabled;
  if(devEnabled&&game.state.running)testRun=true;
  renderDevMode();
  if(game.state.running&&game.state.inUpgrade)game.api.rollCards(game.state.wave%5===0);
}
function renderDevMode(){
  const button=game.dom.$('devModeBtn');button.textContent=devEnabled?'DEV MODE · ON':'DEV MODE';
  button.setAttribute?.('aria-pressed',String(devEnabled));
  game.dom.$('devModeNote').textContent=devEnabled?'Manual rewards enabled for this visit. Dev runs earn no scraps or best-wave records.':testRun?'Manual rewards off. This run remains a dev run; start a new run for normal progress.':'Choose your upgrade and rarity after each wave. Combat plays normally.';
  game.dom.$('devRunBanner').hidden=!testRun;
}
function renderOptions(){
  renderDevMode();
  for(const [name,id] of [['musicVolume','musicVolume'],['effectsVolume','effectsVolume']]){
    game.dom.$(id).value=Math.round(preferences[name]*100);game.dom.$(id+'Value').textContent=Math.round(preferences[name]*100)+'%';
  }
  game.dom.$('optionsIntros').checked=game.api.monsterIntrosEnabled?.()??true;
  game.dom.$('optionsStorageNote').textContent=storageIssue?'This browser cannot save preferences. Changes work for this visit.':'Saved automatically on this browser. Your progress is kept separately.';
}
function renderStatistics(){
  const s=game.state,p=game.api.notebookSnapshot(),ranks=Object.values(p.levels).reduce((a,n)=>a+n,0),max=game.catalog.notebookPerks.reduce((a,x)=>a+x.max,0);
  const tiles=[['Best wave',s.best],['Scraps banked',p.scraps],['Scraps earned, all time',p.lifetimeScraps],['Permanent ranks',ranks+' / '+max]];
  game.dom.$('statisticsProgress').innerHTML=tiles.map(([label,value])=>`<div class="journal-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
  const run=[['Wave',s.wave],['Kills',s.kills],['Score',s.score],['Scraps earned',p.runScraps],['Stevie HP',Math.ceil(s.player.hp)+' / '+s.player.maxHp],['Tool',s.tool.name]];
  game.dom.$('statisticsRun').innerHTML=run.map(([label,value])=>`<div class="journal-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
  game.dom.$('statisticsRunTitle').textContent=s.running?'This run · paused':'Most recent run';
  game.dom.$('statisticsProgressBar').style.width=(100*ranks/max)+'%';
  game.dom.$('statisticsSaveNote').textContent=p.storageIssue?'Progress is temporary because this browser cannot save it.':'Records and Notebook progress are saved on this browser. Run stats reset when you start a new run.';
}
function openOptions(){game.api.openInfo('options');}
function closeOptions(){game.api.closeInfo();}
function openStatistics(){game.api.openInfo('statistics');}
function closeStatistics(){game.api.closeInfo();}
const api={devModeEnabled,devRunActive,beginDevRun,setDevMode,renderDevMode,audioSettings,setAudioVolume,renderOptions,renderStatistics,openOptions,closeOptions,openStatistics,closeStatistics};Object.assign(game.api,api);
for(const name of ['musicVolume','effectsVolume'])game.dom.$(name).oninput=e=>setAudioVolume(name,Number(e.target.value)/100);
game.dom.$('optionsIntros').onchange=e=>game.api.setMonsterIntrosEnabled(e.target.checked);
game.dom.$('devModeBtn').onclick=()=>setDevMode(!devEnabled);
renderOptions();return api;
};
