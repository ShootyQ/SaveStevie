/* Portable permanent progress. Never imports executable code or active combat. */
DoodleDefender.systems.saveBackup = function createSaveBackup(game) {
const limit=65536,checkpointKey='saveStevieBeforeRestoreV1';let pending=null,readAttempt=0;
const status=text=>{game.dom.$('backupStatus').textContent=text;};
function saveBackupText(){
 const p=game.api.notebookSnapshot();
 return JSON.stringify({format:'SaveStevieBackup',version:1,appVersion:game.dom.$('appVersion').textContent,createdAt:new Date().toISOString(),progress:{notebook:{version:2,scraps:p.scraps,lifetimeScraps:p.lifetimeScraps,scrapTutorialDone:p.scrapTutorialDone===true,levels:p.levels},bestWave:game.state.best,lessons:game.api.lessonSnapshot().seen,discoveries:game.api.discoveredMonsterTypes()}},null,2);
}
function validateSaveBackup(text){
 if(typeof text!=='string'||text.length>limit)throw Error('Choose a Save Stevie backup smaller than 64 KB.');
 let data;try{data=JSON.parse(text)}catch{throw Error('This is not valid backup JSON. Paste the complete backup text or choose its .json file.');}
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const integer=(value,max=1e9,min=0)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
 if(!object(data)||data.format!=='SaveStevieBackup'||data.version!==1)throw Error('This backup format is not supported by this Alpha.');
 const p=data.progress,n=p?.notebook;
 if(!object(p)||!object(n)||n.version!==2||!object(n.levels)||!integer(n.scraps)||!integer(n.lifetimeScraps)||n.lifetimeScraps<n.scraps||typeof n.scrapTutorialDone!=='boolean'||!integer(p.bestWave,1e9,1))throw Error('The backup has invalid saved-progress values. Nothing was restored.');
 const perks=game.catalog.notebookPerks,levels={};
 if(Object.keys(n.levels).some(id=>!perks.some(perk=>perk.id===id)))throw Error('This backup includes upgrades this Alpha does not support.');
 for(const perk of perks){const rank=n.levels[perk.id]??0;if(!integer(rank,perk.max))throw Error('Invalid upgrade rank: '+perk.name+'. Nothing was restored.');levels[perk.id]=rank;}
 if(!object(p.lessons)||['draw','erase'].some(k=>typeof p.lessons[k]!=='boolean'))throw Error('The backup has invalid tutorial progress.');
 if(!Array.isArray(p.discoveries)||p.discoveries.length>game.catalog.monsters.length||p.discoveries.some(type=>!game.catalog.monsters.some(m=>m.type===type)))throw Error('The backup has invalid monster discoveries.');
 return {notebook:{version:2,scraps:n.scraps,lifetimeScraps:n.lifetimeScraps,scrapTutorialDone:n.scrapTutorialDone,levels},bestWave:p.bestWave,lessons:{draw:p.lessons.draw,erase:p.lessons.erase},discoveries:[...new Set(p.discoveries)]};
}
function clearBackupReview(){pending=null;game.dom.$('backupReview').hidden=true;}
function renderSaveBackup(){
 readAttempt++;clearBackupReview();game.dom.$('backupText').value='';game.dom.$('backupFile').value='';status('');
 const p=game.api.notebookSnapshot();game.dom.$('backupCurrent').textContent='This device: '+p.scraps+' saved scraps · best wave '+game.state.best+'.';
 game.dom.$('confirmBackupBtn').disabled=game.state.running;
 try{game.dom.$('previousBackupBtn').hidden=!localStorage.getItem(checkpointKey)}catch{game.dom.$('previousBackupBtn').hidden=true;}
}
function previewSaveBackup(text=game.dom.$('backupText').value){
 clearBackupReview();
 try{pending=validateSaveBackup(text);const p=game.api.notebookSnapshot(),ranks=levels=>Object.values(levels).reduce((sum,n)=>sum+n,0);
  game.dom.$('backupComparison').textContent='Saved scraps: '+p.scraps+' → '+pending.notebook.scraps+'. Best wave: '+game.state.best+' → '+pending.bestWave+'. Permanent upgrade ranks: '+ranks(p.levels)+' → '+ranks(pending.notebook.levels)+'. Discovered monsters: '+game.api.discoveredMonsterTypes().length+' → '+pending.discoveries.length+'.';
  const changes=game.dom.$('backupPerkChanges');changes.innerHTML='';for(const perk of game.catalog.notebookPerks)if(p.levels[perk.id]!==pending.notebook.levels[perk.id]){const item=document.createElement('li');item.textContent=perk.name+': rank '+p.levels[perk.id]+' → '+pending.notebook.levels[perk.id];changes.appendChild(item);}
  game.dom.$('backupReview').hidden=false;game.dom.$('confirmBackupBtn').disabled=game.state.running;
  status(game.state.running?'Backup checked. Finish your run or return to the home screen before restoring.':'Backup checked. Review the replacement above, then confirm or cancel.');return true;
 }catch(error){status(error.message);return false;}
}
function restoreSaveBackup(){
 if(!pending)return false;
 if(game.state.running){status('Finish your run or return to the home screen before restoring.');return false;}
 const p=pending,writes=[['saveStevieNotebookV1',JSON.stringify(p.notebook)],['doodleDefenderBestV4',String(p.bestWave)],['saveStevieLessonsV1',JSON.stringify(p.lessons)],['saveStevieDiscoveredMonstersV1',JSON.stringify(p.discoveries)],[checkpointKey,saveBackupText()]],old=new Map(),written=[];
 try{for(const [key] of writes)old.set(key,localStorage.getItem(key));}
 catch{status('Storage is unavailable. Nothing was restored. Keep your backup and try again when saving works.');return false;}
 try{for(const [key,value] of writes){localStorage.setItem(key,value);written.push(key);}}
 catch{let rolledBack=true;for(const key of written.reverse())try{if(old.get(key)===null)localStorage.removeItem(key);else localStorage.setItem(key,old.get(key));}catch{rolledBack=false;}
  status(rolledBack?'Could not save the restore. Your existing progress was kept. Check storage and try again.':'Storage failed during restore and recovery. Keep your backup; do not reload until storage works and you can retry.');return false;
 }
 game.api.adoptNotebookBackup(p.notebook);game.state.best=p.bestWave;game.api.adoptLessonBackup(p.lessons);game.api.adoptDiscoveryBackup(p.discoveries);
 game.api.updateUI();clearBackupReview();game.dom.$('previousBackupBtn').hidden=false;game.dom.$('backupCurrent').textContent='This device: '+p.notebook.scraps+' saved scraps · best wave '+p.bestWave+'.';
 status('Progress restored. Your next run uses these upgrades. Recover previous save can bring back the progress you replaced.');return true;
}
function downloadSaveBackup(){
 readAttempt++;clearBackupReview();const text=saveBackupText();game.dom.$('backupText').value=text;
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='SaveStevie-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Backup file prepared. Keep it somewhere safe; Copy backup text is also available.');
}
async function copySaveBackup(){
 readAttempt++;clearBackupReview();const text=saveBackupText();game.dom.$('backupText').value=text;
 try{if(!window.navigator?.clipboard?.writeText)throw Error();await window.navigator.clipboard.writeText(text);status('Backup copied. Save this text somewhere safe.');}
 catch{game.dom.$('backupText').focus?.();game.dom.$('backupText').select?.();status('Clipboard unavailable. The backup text is selected for you to copy, or use Save backup file.');}
}
async function readBackupFile(event){
 const attempt=++readAttempt;clearBackupReview();const file=event.target.files?.[0];if(!file)return;
 if(file.size>limit){status('Choose a Save Stevie backup smaller than 64 KB.');return;}
 try{const text=await file.text();if(attempt!==readAttempt)return;game.dom.$('backupText').value=text;previewSaveBackup(text);}
 catch{if(attempt===readAttempt)status('Could not read this file. Try another file or paste the backup text.');}
}
const api={saveBackupText,validateSaveBackup,renderSaveBackup,previewSaveBackup,restoreSaveBackup,copySaveBackup,downloadSaveBackup};Object.assign(game.api,api);
game.dom.$('openBackupBtn').onclick=()=>game.api.openInfo('backup');game.dom.$('closeBackupBtn').onclick=()=>{readAttempt++;game.api.closeInfo();};
game.dom.$('downloadBackupBtn').onclick=downloadSaveBackup;game.dom.$('copyBackupBtn').onclick=copySaveBackup;game.dom.$('backupFile').onchange=readBackupFile;
game.dom.$('backupText').oninput=()=>{readAttempt++;clearBackupReview();status('');};game.dom.$('previewBackupBtn').onclick=()=>previewSaveBackup();game.dom.$('confirmBackupBtn').onclick=restoreSaveBackup;
game.dom.$('cancelBackupBtn').onclick=()=>{clearBackupReview();status('Restore cancelled. Your progress is unchanged.');};
game.dom.$('previousBackupBtn').onclick=()=>{readAttempt++;try{const text=localStorage.getItem(checkpointKey);game.dom.$('backupText').value=text||'';previewSaveBackup(text);}catch{status('The recovery copy could not be read.');}};
return api;
};
