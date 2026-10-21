const assert=require('assert');
module.exports=function(load){
 const {sandbox}=load(true),g=sandbox.testGame,a=g.api,s=g.state;
 a.resetRun();
 const allowed=new Set(['grunt','scrubber','bouncer','tank','flanker','sniper','sprinter','wallpuller','catapulter','papertearer','gnawer']);
 const pick=a.pick;
 for(const wave of [11,12,13,14,15,16,20,25,40]){
  s.wave=wave;s.enemies=[];a.resetCatapulterRun();let pool;
  a.pick=list=>{pool=Array.from(list);return list[0];};a.enemyType();
  assert(pool.every(t=>allowed.has(t)),'focused random roster on wave '+wave);
  assert(pool.includes('sniper')&&pool.includes('tank')&&pool.includes('wallpuller'),'specialists stay available');
  for(const type of ['fast','wardling','splitter','brood','mini','bulwark','medic','basil','brute','sapper','elite'])assert.equal(a.spawnScheduledEnemy(null,null,type,true),null,'scripted arrivals cannot reintroduce '+type);
  s.waveTime=60;
  for(const elapsed of [3,9]){s.timeLeft=60-elapsed;const base=1.48-8*.034,surge=elapsed%12>=8?1.35:.9;assert(Math.abs(a.spawnGap()-Math.max(.12,base/(a.wavePressure(8)*surge*a.lateWaveGrowth())))<1e-10,'late pacing grows gently from wave-eight cadence');}
 }
 a.pick=pick;
 for(const wave of [1,5,8]){s.wave=wave;s.enemies=[];let pool;a.pick=list=>{pool=Array.from(list);return list[0];};a.enemyType();if(wave>=8)assert(pool.includes('splitter'),'early splitter remains');s.waveTime=60;s.timeLeft=57;const base=wave===1?g.catalog.balance.openingGap:wave===5?1.42:Math.max(.34,1.48-wave*.034),surge=wave>5?.9:1;assert(Math.abs(a.spawnGap()-Math.max(.12,base/(a.wavePressure()*surge)))<1e-10,'early spawning unchanged');}
 a.pick=pick;
 // Exercise introductions, timed bursts, chapter groups and random spawning together.
 for(const wave of [11,14,16,21]){
  a.resetRun();s.wave=wave;a.startWave();s.enemies=[];const spawn=a.spawnEnemy,arrivals=[];
  a.spawnEnemy=(boss,x,y,type)=>{assert(!boss);assert(allowed.has(type),'all scheduled routes use focused roster: '+type);arrivals.push(type);return {type};};
  for(let frame=0;frame<3600;frame++){s.timeLeft=60-frame/60;a.spawnWaveEnemies(1/60);}
  a.spawnEnemy=spawn;assert(arrivals.includes('grunt')&&arrivals.includes('tank')&&arrivals.includes('wallpuller'));
  if(wave===11)assert(!arrivals.includes('catapulter')&&!arrivals.includes('papertearer'),'wave eleven introduces only Yank');
 }
 // All arrival paths respect the staggered specialist introductions.
 for(const [wave,newType] of [[11,'wallpuller'],[12,'gnawer'],[13,'catapulter'],[14,'papertearer']]){
  a.resetRun({skipIntro:true});s.wave=wave;a.startWave({skipIntro:true});s.enemies=[];
  const firstWaves={wallpuller:11,gnawer:12,catapulter:13,papertearer:14};
  for(const [type,first] of Object.entries(firstWaves))if(wave<first)assert.equal(a.spawnScheduledEnemy(null,null,type,true),null,'no premature scripted '+type);
  const spawn=a.spawnEnemy,arrivals=[];a.spawnEnemy=(boss,x,y,type)=>{assert(wave>=(firstWaves[type]||0),'no premature random/group '+type);arrivals.push(type);return {type};};
  s.spawnTimer=0;a.spawnWaveEnemies(.01);assert.equal(arrivals[0],newType,'guaranteed first newcomer on wave '+wave);a.spawnChapterGroup();a.spawnEnemy=spawn;
 }
 for(const [wave,kind,count] of [[13,'catapult',0],[14,'catapult',2],[14,'tunnel',0],[16,'tunnel',2]]){
  a.resetRun({skipIntro:true});s.wave=wave;a.startWave({skipIntro:true});s.enemies=[];
  assert.equal(a.specialistReinforcements({x:100,y:160},2,{kind}).length,count,'staggered backup on wave '+wave+' for '+kind);
 }
 console.log('PASS: waves 11+ focused roster across random, introductions and scripted groups; no splitter/nested families, gentle wave-eight-based spawn growth, and early-wave spawn timing preserved.');
};
