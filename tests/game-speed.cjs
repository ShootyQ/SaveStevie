const assert=require('assert');
module.exports=load=>{
 const key='saveStevieNotebookV1';
 function storage(seed=[]){const saved=new Map(seed);return {saved,getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v)),removeItem:k=>saved.delete(k)};}
 function setup(save=storage()){const env=load(true,{storage:save}),g=env.sandbox.testGame,a=g.api;a.resetRun({skipIntro:true});g.state.spawnTimer=999;g.state.enemies=[];g.state.stats.rockRate=0;return {env,g,a,save};}
 // Only an actual first-boss defeat in a normal campaign grants the permanent flag.
 {const r=setup(),{a,g,save}=r;assert(!a.doubleSpeedUnlocked());assert(!a.setGameSpeed(2));a.openInfo('pause');assert(g.dom.$('pauseSpeedBtn').disabled);assert.match(g.dom.$('pauseSpeedHelp').textContent,/wave 5/);a.closeInfo();
  g.state.wave=5;const e=a.spawnEnemy(true,100,180);assert(!a.recordSpeedVictory(e));e.hp=0;a.killEnemy(e);assert(a.doubleSpeedUnlocked());assert.equal(JSON.parse(save.getItem(key)).speedUnlocked,true);assert(a.setGameSpeed(2));assert.equal(a.gameSpeed(),2);assert(!a.setGameSpeed(3));assert(!a.setGameSpeed('2'));assert(a.doubleSpeedUnlocked());
  const reloaded=setup(save);assert(reloaded.a.doubleSpeedUnlocked());assert.equal(reloaded.a.gameSpeed(),1,'reload starts safely at normal speed');
  const backup=a.saveBackupText();assert.equal(a.validateSaveBackup(backup).notebook.speedUnlocked,true);const bad=JSON.parse(backup);bad.progress.notebook.speedUnlocked='yes';assert.throws(()=>a.validateSaveBackup(JSON.stringify(bad)),/double-speed/);
  const clean=setup();clean.a.returnToMenu();assert(clean.a.previewSaveBackup(backup));assert(clean.a.restoreSaveBackup());assert(clean.a.doubleSpeedUnlocked());
  const old=JSON.parse(backup);delete old.progress.notebook.speedUnlocked;old.progress.bestWave=5;assert.equal(a.validateSaveBackup(JSON.stringify(old)).notebook.speedUnlocked,false,'old backups remain valid without inventing a victory');
  a.returnToMenu();r.env.sandbox.confirm=()=>true;assert(a.resetNotebookProgress());assert(!a.doubleSpeedUnlocked());assert.equal(a.gameSpeed(),1);assert(!JSON.parse(save.getItem(key)).speedUnlocked);
 }
 for(const best of [5,6]){const r=setup(storage([['doodleDefenderBestV4',String(best)]]));assert.equal(r.a.doubleSpeedUnlocked(),best===6,'old players who passed wave 5 qualify');}
 for(const mode of ['dev','endless']){const {g,a}=setup();if(mode==='dev'){a.setDevMode(true);a.beginDevRun();}else g.state.endless=true;g.state.wave=5;assert(!a.recordSpeedVictory({waveBoss:true,type:'boss',hp:0}));assert(!a.doubleSpeedUnlocked());}
 // Same small simulation steps: 2x wall/ink/enemy time, no large collision steps.
 {const one=setup(storage([['doodleDefenderBestV4','6']])),two=setup(storage([['doodleDefenderBestV4','6']]));
  for(const r of [one,two]){r.g.state.stats.ink=10;r.g.state.stats.inkRegen=4;r.a.createWall([{x:100,y:200},{x:200,y:200}]);r.enemy=r.a.spawnEnemy(false,100,300,'grunt');r.enemy.speed=20;r.g.state.last=1000;}
  assert(two.a.setGameSpeed(2));one.a.loop(1030);two.a.loop(1030);
  assert(Math.abs(one.g.state.timeLeft-59.97)<1e-8);assert(Math.abs(two.g.state.timeLeft-59.94)<1e-8);assert(Math.abs(two.g.state.stats.ink-one.g.state.stats.ink-.12)<1e-8);assert(Math.abs(one.g.state.walls[0].life-two.g.state.walls[0].life-.03)<1e-8);assert(Math.hypot(two.enemy.x-100,two.enemy.y-300)>Math.hypot(one.enemy.x-100,one.enemy.y-300)*1.99);
  const real=two.a.update,steps=[];two.a.update=dt=>steps.push(dt);two.a.advanceSimulation(.033);assert.deepEqual(steps,[.033,.033]);steps.length=0;two.a.update=dt=>{steps.push(dt);two.g.state.inUpgrade=true;};two.a.advanceSimulation(.02);assert.deepEqual(steps,[.02],'reward opening stops the second simulation step');two.g.state.inUpgrade=false;two.a.update=real;
  two.a.openInfo('pause');const before=two.g.state.timeLeft;two.a.advanceSimulation(.03);assert.equal(two.g.state.timeLeft,before);two.g.dom.$('pauseSpeedBtn').onclick();assert.equal(two.a.gameSpeed(),1);assert(two.g.state.paused,'switching speed never resumes');two.g.dom.$('pauseSpeedBtn').onclick();assert.equal(two.a.gameSpeed(),2);two.a.closeInfo();assert.equal(two.a.simulationSpeed(),2);
  two.g.state.wave=5;two.a.spawnEnemy(true,80,180);assert.equal(two.a.gameSpeed(),1,'boss arrival resets to normal speed');assert(two.a.setGameSpeed(2),'player can deliberately reenable it during boss fights');
 }
 // Menus, cinematics and focus gates use one real-time presentation step.
 {const {a,g}=setup(storage([['doodleDefenderBestV4','6']]));a.setGameSpeed(2);for(const flag of ['paused','betweenWaves','inUpgrade','awaitingSpec']){g.state[flag]=true;assert.equal(a.simulationSpeed(),1);g.state[flag]=false;}const old=a.waveFinaleActive;a.waveFinaleActive=()=>true;assert.equal(a.simulationSpeed(),1);a.waveFinaleActive=old;assert.equal(a.simulationSpeed(),2);}
 console.log('PASS: first-boss permanent 2x unlock, legacy migration, dev exclusions, save/reload/backup validation/restore/reset, actual 2x timer/regen/wall/enemy motion, small collision steps, paused toggle, transition guards and boss reset.');
};
