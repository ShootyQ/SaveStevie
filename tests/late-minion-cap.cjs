const assert=require('assert');
module.exports=load=>{
 const g=load(true).sandbox.testGame,a=g.api,s=g.state;a.resetRun({skipIntro:true});s.waveTime=60;
 assert.equal(a.scheduledWaveBudget(15),83,'baseline remains the standard wave-15 allowance');
 for(const wave of [14,15,16,17,18,19,20,21]){
  s.wave=wave;s.enemies=[];const cap=wave>=15&&wave<=20?83:180;assert.equal(a.minionLimit(),cap);
  for(let i=0;i<cap;i++)assert(a.spawnEnemy(false,100,150,'grunt'));
  assert.equal(a.spawnEnemy(false,100,150,'grunt'),null,'crowd stops at cap on wave '+wave);
  if(wave>=15&&wave<=20){
   const dead=s.enemies[0];dead.hp=0;assert(a.spawnEnemy(false,100,150,'grunt'),'death frees a slot before cleanup');
   assert.equal(a.spawnScheduledEnemy(100,150,'grunt'),null,'scheduled arrivals obey the same cap');
   assert.equal(a.specialistReinforcements({x:100,y:150},2,{kind:'catapult'}).length,0);
   const boss=a.spawnEnemy(true,300,150);assert(boss,'boss can enter at full minion cap');assert.equal(a.spawnEnemy(false,100,150,'grunt'),null);
   s.enemies=s.enemies.filter(e=>e!==dead);s.enemies.find(e=>!e.waveBoss).hp=0;
   assert(a.spawnEnemy(false,100,150,'grunt'),'boss does not consume a free minion slot');
   const grunt=s.enemies.find(e=>e.type==='grunt'&&e.hp>0);assert.equal(grunt.maxHp,g.catalog.enemyDefs.grunt.hp*a.enemyHpScale(wave)*s.stats.enemyScale,'existing HP scaling retained');
  }
 }
 // Splitting is atomic: it must not remove the parent with room for only one child.
 s.wave=16;s.enemies=[];const twicey=a.spawnEnemy(false,100,150,'splitter');for(let i=0;i<82;i++)a.spawnEnemy(false,100,150,'grunt');assert.equal(a.splitTwicey(twicey),false);assert(s.enemies.includes(twicey));s.enemies.pop();assert(a.splitTwicey(twicey));assert.equal(s.enemies.filter(e=>e.hp>0&&!e.waveBoss).length,83);
 console.log('PASS: waves 15–20 share 83 living minions across spawn routes and splits, deaths free slots, bosses remain exempt, original HP scaling and other-wave caps stay intact.');
};
