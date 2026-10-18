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
  for(const elapsed of [3,9]){s.timeLeft=60-elapsed;const base=Math.max(.34,1.48-wave*.034),surge=elapsed%12>=8?1.35:.9,oldGap=Math.max(.12,base/(a.wavePressure()*surge));assert(Math.abs(a.spawnGap()-oldGap/(wave>=13?.48:.8))<1e-10,'20 percent slower spawn rate in quiet and surge');}
 }
 a.pick=pick;
 for(const wave of [1,5,8,10]){s.wave=wave;s.enemies=[];let pool;a.pick=list=>{pool=Array.from(list);return list[0];};a.enemyType();if(wave>=8)assert(pool.includes('splitter'),'early splitter remains');s.waveTime=60;s.timeLeft=57;const base=wave===1?g.catalog.balance.openingGap:wave===5?1.42:Math.max(.34,1.48-wave*.034),surge=wave>5?.9:1;assert(Math.abs(a.spawnGap()-Math.max(.12,base/(a.wavePressure()*surge)))<1e-10,'early spawning unchanged');}
 a.pick=pick;
 // Exercise introductions, timed bursts, chapter groups and random spawning together.
 for(const wave of [11,14,16,21]){
  a.resetRun();s.wave=wave;a.startWave();s.enemies=[];const spawn=a.spawnEnemy,arrivals=[];
  a.spawnEnemy=(boss,x,y,type)=>{assert(!boss);assert(allowed.has(type),'all scheduled routes use focused roster: '+type);arrivals.push(type);return {type};};
  for(let frame=0;frame<3600;frame++){s.timeLeft=60-frame/60;a.spawnWaveEnemies(1/60);}
  a.spawnEnemy=spawn;assert(arrivals.includes('grunt')&&arrivals.includes('tank')&&arrivals.includes('wallpuller'));
  if(wave===11)assert(arrivals.includes('catapulter'),'guaranteed catapulter introduction remains');
 }
 console.log('PASS: waves 11+ focused roster across random, introductions and scripted groups; no splitter/nested families, 20% lower regular spawn rate, and early-wave spawn timing preserved.');
};
