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
const controlsKey='saveStevieControlsV1';let controls={eraserToggle:false,eraserLeft:false};
try{const saved=JSON.parse(localStorage.getItem(controlsKey)||'null');if(saved&&typeof saved==='object')for(const name of Object.keys(controls))if(typeof saved[name]==='boolean')controls[name]=saved[name];}catch{}
function drawingControls(){return {...controls};}
function setDrawingControl(name,value){
 if(!Object.hasOwn(controls,name)||typeof value!=='boolean')return false;
 controls[name]=value;try{localStorage.setItem(controlsKey,JSON.stringify(controls));}catch{}
 game.api.cancelDrawingInput?.();game.api.syncDrawingControls?.();renderOptions();return true;
}
// Session-only manual rewards. Once used, a run stays unranked until reset.
let devEnabled=false,testRun=false;
function devModeEnabled(){return devEnabled}
function devRunActive(){return testRun}
function beginDevRun(){game.api.resetTestLabRun?.();testRun=devEnabled;renderDevMode()}
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
  game.dom.$('eraserToggle').checked=controls.eraserToggle;game.dom.$('eraserLeft').checked=controls.eraserLeft;
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
// Reports are local drafts. Only the player's GitHub submission sends anything.
let reportContext='';
function renderProblemReport(){
 const s=game.state,version=game.dom.$('appVersion').textContent||'Alpha',ua=window.navigator?.userAgent||'Unavailable';
 const list=obj=>Object.entries(obj).filter(([,n])=>n>0).map(([name,n])=>name+' ×'+n).join(', ')||'None';
 reportContext=[
  'Save Stevie problem report',
  'Version: '+version,
  'Device/browser: '+ua,
  'Screen: '+(window.innerWidth||s.W)+' ×'+(window.innerHeight||s.H)+'; game: '+Math.round(s.W)+' ×'+Math.round(s.H),
  'Platform: '+(document.documentElement?.classList?.contains('native-app')?'Android app':'Web'),
  'Run: '+(game.api.testLabActive?.()?'Scratch Page test':devRunActive()?'Dev run':s.running?'Normal run':'Menu / ended run'),
  'Wave: '+s.wave+'; timer: '+Math.round(s.timeLeft)+'s; kills: '+s.kills,
  'Stevie HP: '+Math.ceil(s.player.hp)+' / '+s.player.maxHp+'; ink: '+Math.ceil(s.stats.ink)+' / '+s.stats.maxInk,
  'Tool: '+s.tool.name+'; upgrades: '+list(s.stacks),
  'Ink effects: '+list(s.inks),
  'Synergies: '+(Array.from(s.synergies).join(', ')||'None'),
  'Throwing element: '+(game.api.paperElementName?.()||'Ordinary paper'),
  'Walls: '+s.walls.length+'; monsters: '+s.enemies.filter(e=>e.hp>0).length,
  'Last hit: '+(game.dom.$('lastHitText').textContent||'None recorded'),
  'Eraser controls: '+(controls.eraserToggle?'Tap to toggle':'Hold')+', '+(controls.eraserLeft?'left':'right')+' button'
 ].join('\n');
 game.dom.$('reportDescription').value='';game.dom.$('reportStatus').textContent='';updateProblemReport();
}
function updateProblemReport(){
 const description=String(game.dom.$('reportDescription').value||'').trim().slice(0,2000);
 const body='What happened / what I expected:\n'+(description||'[Describe the problem here]')+'\n\n'+reportContext;
 game.dom.$('reportPreview').value=body;
 const url='https://github.com/ShootyQ/SaveStevie/issues/new?title='+encodeURIComponent('Problem report · '+(game.dom.$('appVersion').textContent||'Alpha')+' · wave '+game.state.wave)+'&body='+encodeURIComponent(body);
 game.dom.$('reportGitHubLink').href=url;
 return body;
}
async function copyProblemReport(){
 const text=updateProblemReport();
 try{if(!window.navigator?.clipboard?.writeText)throw new Error('No clipboard');await window.navigator.clipboard.writeText(text);game.dom.$('reportStatus').textContent='Report copied. Paste it wherever you want to share it.';}
 catch{const preview=game.dom.$('reportPreview');preview.focus?.();preview.select?.();game.dom.$('reportStatus').textContent='Clipboard unavailable. The report is selected so you can copy it, or choose Save report.';}
}
function saveProblemReport(){
 const blob=new Blob([updateProblemReport()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='SaveStevie-problem-report.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 game.dom.$('reportStatus').textContent='Report saved as a text file. Share it with the creator when ready.';
}
function openOptions(){game.api.openInfo('options');}
function closeOptions(){game.api.closeInfo();}
function openStatistics(){game.api.openInfo('statistics');}
function closeStatistics(){game.api.closeInfo();}
const api={renderProblemReport,updateProblemReport,copyProblemReport,saveProblemReport,drawingControls,setDrawingControl,devModeEnabled,devRunActive,beginDevRun,setDevMode,renderDevMode,audioSettings,setAudioVolume,renderOptions,renderStatistics,openOptions,closeOptions,openStatistics,closeStatistics};Object.assign(game.api,api);
for(const name of ['musicVolume','effectsVolume'])game.dom.$(name).oninput=e=>setAudioVolume(name,Number(e.target.value)/100);
game.dom.$('optionsIntros').onchange=e=>game.api.setMonsterIntrosEnabled(e.target.checked);
game.dom.$('devModeBtn').onclick=()=>setDevMode(!devEnabled);
for(const name of ['eraserToggle','eraserLeft'])game.dom.$(name).onchange=e=>setDrawingControl(name,e.target.checked);
game.dom.$('reportProblemBtn').onclick=()=>game.api.openInfo('report');
game.dom.$('closeReportBtn').onclick=()=>game.api.closeInfo();
game.dom.$('reportDescription').oninput=updateProblemReport;
game.dom.$('copyReportBtn').onclick=copyProblemReport;
game.dom.$('saveReportBtn').onclick=saveProblemReport;
renderOptions();return api;
};
