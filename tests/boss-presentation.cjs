const assert=require('assert');
module.exports=load=>{
 function setup(options={}){const env=load(true,{finale:true,images:true,...options}),g=env.sandbox.testGame,a=g.api;a.resetRun();g.state.wave=5;a.startWave();g.state.timeLeft=0;const boss=a.spawnEnemy(true,180,180);a.killEnemy(boss);assert(a.waveFinaleActive());return {env,g,a};}
 {
  const {env,g,a}=setup();a.update(1.1);assert.equal(a.bossVictoryPose().stage,'relief');assert.equal(a.waveFinaleSnapshot().popped,true);
  const state=JSON.stringify(g.state),snapshot=JSON.stringify(a.waveFinaleSnapshot()),random=env.sandbox.Math.random;
  env.sandbox.Math.random=()=>{throw Error('presentation must not use combat RNG')};
  env.calls.length=0;a.draw();assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(a.waveFinaleSnapshot()),snapshot);
  assert.equal(env.calls.filter(c=>c[0]==='drawImage'&&c[1]?.url?.includes('stevie-victory')).length,1,'one Stevie drawn in the world');
  env.calls.length=0;a.drawBossVictory();assert.equal(env.calls.filter(c=>c[0]==='drawImage').length,0,'screen overlay never adds a second Stevie');
  env.sandbox.Math.random=random;g.state.paused=true;a.update(1);assert.equal(JSON.stringify(a.waveFinaleSnapshot()),snapshot);g.state.paused=false;
  a.update(.55);assert.equal(a.bossVictoryPose().stage,'jump');
  a.update(.8);assert.equal(a.bossVictoryPose().stage,'dance');const camera=a.waveFinaleCamera();assert(Math.abs(camera.zoom-1.35)<1e-9);assert(Math.abs(camera.x-g.state.player.x)<1,'camera comes home to Stevie');
  a.update(.9);assert.equal(a.bossVictoryPose().stage,'wave');assert.equal(g.state.betweenWaves,false,'reward waits until routine finishes');
  a.update(1);assert.equal(a.bossVictoryPose(),null);assert.equal(g.state.betweenWaves,true);
 }
 {
  const {a}=setup({reduced:true});a.update(.3);assert.equal(a.waveFinaleCamera().zoom,1);assert.equal(a.bossVictoryPose().frame,15);a.update(1.2);assert.equal(a.waveFinaleActive(),false);
 }
 {
  const env=load(true,{images:true}),g=env.sandbox.testGame,a=g.api;a.resetRun();g.state.wave=5;a.startWave();g.state.timeLeft=0;g.state.enemies=[];a.update(.01);assert(a.firstBossIntroActive());
  const frames=new Set();for(let i=0;i<14;i++){a.update(.18);frames.add(a.firstBossIntroPose().artFrame);}assert(frames.size>=4,'walk alternates full drawn steps');
  a.update(.5);assert(a.firstBossIntroPose().artFrame>=4,'stomp winds up before roar');a.update(.7);const pose=a.firstBossIntroPose();assert.equal(pose.stage,'roar');assert(pose.artFrame>=9&&pose.artFrame<=11,'wide mouth frames during audible roar');
  const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('entrance drawing must not roll RNG')};env.calls.length=0;a.draw();assert(env.calls.some(c=>c[0]==='drawImage'&&c[1]?.url?.includes('king-entrance')));env.sandbox.Math.random=random;
  g.state.paused=true;a.update(1);assert.equal(a.firstBossIntroPose().artFrame,pose.artFrame);g.state.paused=false;
  a.update(3);assert.equal(a.firstBossIntroActive(),false);assert.equal(g.state.enemies.filter(e=>e.waveBoss).length,1,'entrance hands off to exactly one boss');
 }
 console.log('PASS: single world Stevie, four victory acts, screen overlay without duplicate, camera return, paused combat/rewards, reduced motion, pure rendering and full drawn King entrance/roar handoff.');
};
