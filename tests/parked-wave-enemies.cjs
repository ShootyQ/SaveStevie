const assert=require('assert');
module.exports=load=>{
 const env=load(true),g=env.sandbox.testGame,a=g.api,s=g.state;
 for(let wave=1;wave<=30;wave++){
  a.resetRun({skipIntro:true});s.wave=wave;a.startWave({skipIntro:true});s.enemies=[];
  const pick=a.pick;a.pick=pool=>{assert(!pool.includes('fast'),'Nugget absent from random pool '+wave);assert(!pool.includes('wardling'),'Nope Goblin absent from random pool '+wave);return pool[0];};a.enemyType();a.pick=pick;
  a.spawnChapterGroup();assert(s.enemies.every(e=>!['fast','wardling'].includes(e.type)),'scripted groups exclude parked types');
 }
 a.resetRun({skipIntro:true});s.wave=9;a.startWave({skipIntro:true});s.enemies=[];assert.equal(a.spawnScheduledEnemy(null,null,'papertearer'),null,'Rip-Raff waits until wave eleven');s.wave=11;a.startWave({skipIntro:true});s.enemies=[];for(let i=0;i<3;i++){s.spawnTimer=0;a.spawnWaveEnemies(.01);}assert(s.enemies.some(e=>e.type==='papertearer'),'Rip-Raff introduced with wave-eleven specialists');
 const crew=a.specialistReinforcements({x:100,y:160},5,{kind:'tunnel',entryId:1,exitId:2});assert.equal(crew.length,5,'wave-eleven shortcut can call its runners');assert(crew.every(e=>e.type==='grunt'));
 assert(a.spawnEnemy(false,100,200,'fast'));assert(a.spawnEnemy(false,150,200,'wardling'),'parked enemies remain available for explicit test spawning');
 console.log('PASS: parked Nugget/Nope Goblin excluded from wave pools/groups, retained explicit test spawns, wave-eleven Rip-Raff introduction and five-runner shortcut call.');
};
