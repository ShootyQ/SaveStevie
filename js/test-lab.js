/* A session-only scratch page: use real upgrade rules without reward advancement. */
DoodleDefender.systems.testLab=function(game){
const $=game.dom.$,rarities=['common','uncommon','rare','legendary'];
const tools={0:{name:'Pencil',slots:2},3:{name:'Mechanical Pencil',slots:2},6:{name:'Simple Pen',slots:3},10:{name:'Scented Sharpie',slots:4}};
let loadout=[],last=null,active=false;
function testLabActive(){return active}
const restartIds=['pauseRestartTestBtn','waveRestartTestBtn','deathRestartTestBtn','victoryRestartTestBtn'];
function syncTestRestartButtons(){for(const id of restartIds)$(id).hidden=!(active&&last)}
function restartTestRun(){return !!(active&&last&&startTestRun(last))}
function resetTestLabRun(){active=false;syncTestRestartButtons()}
function testLabSnapshot(){return {active,loadout:loadout.map(x=>({...x})),last:last?{...last,upgrades:last.upgrades.map(x=>({...x}))}:null}}
function notice(text){$('testLabNotice').textContent=text}
function renderLoadout(){
 const box=$('testLoadout');box.innerHTML='';
 if(!loadout.length){const p=document.createElement('p');p.className='option-help';p.textContent='Starting kit only. Add effects or utilities above.';box.appendChild(p)}
 loadout.forEach((entry,i)=>{
  const row=document.createElement('div');row.className='test-loadout-row';
  const text=document.createElement('span');text.textContent=entry.name+' · '+entry.rarity+' × '+entry.copies;
  const remove=document.createElement('button');remove.className='secondary';remove.textContent='Remove';remove.setAttribute?.('aria-label','Remove '+entry.name);remove.onclick=()=>{loadout.splice(i,1);renderLoadout()};row.appendChild(text);row.appendChild(remove);box.appendChild(row);
 });
 $('repeatTestBtn').hidden=!last;
}
function syncTestRarity(){
 const base=game.catalog.upgrades.find(u=>u.name===$('testUpgrade').value);
 $('testRarity').disabled=!!base?.exclusiveRarity;if(base?.exclusiveRarity)$('testRarity').value=base.exclusiveRarity;
 const once=game.api.isOneTimeUpgrade(base?.name);$('testCopies').disabled=once;if(once)$('testCopies').value=1;
}
function openTestLab(){
 $('testLabPanel').hidden=false;$('testLabBtn').setAttribute?.('aria-expanded','true');
 if(!$('testUpgrade').children.length)for(const base of game.catalog.upgrades){const option=document.createElement('option');option.value=base.name;option.textContent=base.name;$('testUpgrade').appendChild(option)}
 if(!$('testUpgrade').value)$('testUpgrade').value=game.catalog.upgrades[0].name;
 syncTestRarity();renderLoadout();$('testWave').focus?.();$('testLabPanel').scrollIntoView?.({block:'start',behavior:'auto'});
}
function addTestUpgrade(){
 const base=game.catalog.upgrades.find(u=>u.name===$('testUpgrade').value),copies=Number($('testCopies').value),rarity=base?.exclusiveRarity||$('testRarity').value;
 if(!base||!rarities.includes(rarity)||!Number.isInteger(copies)||copies<1||copies>25)return notice('Choose an upgrade, a rarity and 1–25 copies.');
 if(game.api.isOneTimeUpgrade(base.name)&&loadout.some(x=>x.name===base.name))return notice('That upgrade is a one-time unlock.');
 if(loadout.length>=50)return notice('This scratch page holds up to 50 upgrade entries.');
 loadout.push({name:base.name,rarity,copies:game.api.isOneTimeUpgrade(base.name)?1:copies});renderLoadout();notice('Added '+base.name+'.');
}
function readSetup(){return {wave:Number($('testWave').value),phase:$('testPhase').value,toolRank:Number($('testTool').value),notebook:!!$('testNotebook').checked,upgrades:loadout.map(x=>({...x}))}}
function startTestRun(config=readSetup()){
 if(game.api.artworkStatus().ready===false){notice('Notebook artwork is still loading. Wait for the artwork or retry it from the home screen.');return false;}
 if(!config||!Number.isInteger(config.wave)||config.wave<1||config.wave>200||!['wave','boss'].includes(config.phase)||!Object.hasOwn(tools,config.toolRank)||!Array.isArray(config.upgrades)||config.upgrades.length>50){notice('Choose a wave from 1–200 and a valid drawing tool.');return false}
 if(config.phase==='boss'&&config.wave%5!==0){notice('Boss-only tests need a boss wave: 5, 10, 15, 20, 25…');return false}
 const entries=[],effects=new Set(),once=new Set();
 for(const entry of config.upgrades){
  const base=game.catalog.upgrades.find(u=>u.name===entry?.name);
  if(!base||!rarities.includes(entry.rarity)||!Number.isInteger(entry.copies)||entry.copies<1||entry.copies>25||base.exclusiveRarity&&entry.rarity!==base.exclusiveRarity){notice('Check your upgrade names, rarities and copies. Retired upgrades cannot be selected.');return false}
  if(base.cat==='ink')effects.add(base.name);
  if(game.api.isOneTimeUpgrade(base.name)){if(once.has(base.name)||entry.copies!==1){notice('One-time unlocks can only be included once.');return false}once.add(base.name)}
  entries.push({...entry});
 }
 if(effects.size>tools[config.toolRank].slots){notice('This tool has '+tools[config.toolRank].slots+' effect slots. Remove an effect or choose a larger tool.');return false}
 // Validation is complete before replacing the current run. Saved perks stay intact.
 game.api.setDevMode(true);game.api.resetRun({skipNotebook:!config.notebook,skipIntro:true});active=true;
 game.state.stats.wallHp+=(config.toolRank-game.state.tool.rank)*8;
 game.state.tool={...tools[config.toolRank],rank:config.toolRank};
 for(const entry of entries){const base=game.catalog.upgrades.find(u=>u.name===entry.name);for(let i=0;i<entry.copies;i++)if(!game.api.applyUpgrade({...base,rarity:entry.rarity}))break}
 game.state.wave=config.wave;game.state.endless=config.wave>20;game.state.player.hp=game.state.player.maxHp;
 game.api.startWave();
 if(config.phase==='boss'){
  game.state.timeLeft=0;const point=game.api.bossSpawnPoint();
  // Testing skips the off-page approach as well as the timed lead-in.
  game.api.spawnEnemy(true,game.api.clamp(point.x,52,game.state.W-52),game.api.clamp(point.y,Math.min(130,game.state.H*.3),game.state.H-90));
 }
 game.state.stats.ink=game.state.stats.maxInk;game.dom.synergyNote.innerHTML='';game.state.synergySplashTimer=0;$('synergySplash').style.display='none';
 game.api.updateUI();game.api.setMsg('SCRATCH PAGE · Wave '+config.wave+' · '+(config.phase==='boss'?'Boss only':'Full wave'));
 last={...config,upgrades:entries.map(x=>({...x}))};$('repeatTestBtn').hidden=false;syncTestRestartButtons();notice('Test ready. No scraps or records are saved.');return true;
}
const api={openTestLab,addTestUpgrade,startTestRun,testLabActive,resetTestLabRun,testLabSnapshot,restartTestRun,syncTestRestartButtons};Object.assign(game.api,api);
for(const id of restartIds)$(id).onclick=restartTestRun;
$('testLabBtn').onclick=()=>{$('testLabPanel').hidden?openTestLab():($('testLabPanel').hidden=true,$('testLabBtn').setAttribute?.('aria-expanded','false'))};
$('testUpgrade').onchange=syncTestRarity;$('addTestUpgrade').onclick=addTestUpgrade;
$('startTestBtn').onclick=()=>startTestRun();$('repeatTestBtn').onclick=()=>last&&startTestRun(last);
$('clearTestBuildBtn').onclick=()=>{loadout=[];renderLoadout();notice('Starting build cleared.')};
for(const button of document.querySelectorAll('[data-test-wave]'))button.onclick=()=>{$('testWave').value=Number(button.dataset.testWave);$('testPhase').value='boss';notice('Boss-only wave '+button.dataset.testWave+' selected.')};
return api;
};
