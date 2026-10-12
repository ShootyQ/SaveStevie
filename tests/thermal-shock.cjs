const assert=require('assert');
module.exports=load=>{
 const setup=options=>{const env=load(true,options),g=env.sandbox.testGame;g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.W=800;g.state.H=700;g.state.player.x=700;g.state.player.y=350;g.state.enemies=[];g.state.walls=[];g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.stats.rockDamage=0;g.state.synergies.add('Thermal Shock');g.state.inks.fire=g.state.inks.frost=1;return {g,env};};
 const ready=(g,x=200)=>{const e=g.api.spawnEnemy(false,x,350,'grunt');e.hp=e.maxHp=1000;e.burn=2;e.burnDps=10;e.freeze=1;return e;};
 {
  const {g}=setup(),e=ready(g),n=g.api.spawnEnemy(false,245,350,'grunt'),far=g.api.spawnEnemy(false,500,350,'grunt');g.api.applySynergies(e,.02);assert.equal(e.thermalShock.phase,'pressure');assert.equal(e.burn,0);assert.equal(e.freeze,0);assert.equal(e.hp,1000,'no instant burst');assert(g.api.thermalPressureActive(e));
  g.api.updateThermalShockEnemy(e,.25);g.api.updateEnemyAnimations(.25);assert(g.api.enemyAnimationPose(e).sx>1.05);assert.equal(g.api.thermalShockSnapshot().length,0,'readable windup');
  g.api.updateThermalShockEnemy(e,.25);assert.equal(e.hp,974,'one 26-damage burst');assert(n.stun>0&&far.stun===0);assert.equal(n.hp,n.maxHp,'neighbours only stagger');assert.equal(e.thermalShock.phase,'soot');assert.equal(e.freeze,0);assert.equal(e.burn,0);assert.equal(g.api.thermalShockSnapshot().length,1);
  e.freeze=e.burn=1;assert(!g.api.beginThermalShock(e),'cooldown prevents immediate cycling');g.api.updateThermalShockEnemy(e,.1);assert.equal(e.hp,974,'soot never damages again');g.api.moveThermalShock(20,10);assert.equal(g.api.thermalShockSnapshot()[0].x,220);g.api.updateThermalShockTime(.7);assert.equal(g.api.thermalShockSnapshot().length,0);g.api.updateThermalShockEnemy(e,1);assert(!e.thermalShock);
 }
 {
  const {g}=setup(),e=ready(g),boss=ready(g,220);boss.waveBoss=true;g.api.beginThermalShock(e);g.api.updateThermalShockEnemy(e,.5);assert.equal(boss.stun,0,'nearby boss never staggered');assert(g.api.beginThermalShock(boss));assert(!g.api.thermalPressureActive(boss),'boss can keep moving while heating');g.api.updateThermalShockEnemy(boss,.5);assert.equal(boss.stun,0);assert(boss.hp<1000&&boss.hp>=974,'eligible boss takes elemental damage within the existing boss damage budget');
 }
 {
  const {g}=setup(),e=ready(g);e.immunity='fire';assert(!g.api.beginThermalShock(e));e.immunity='frost';assert(!g.api.beginThermalShock(e));e.immunity='';e.flight={};assert(!g.api.beginThermalShock(e));delete e.flight;
  g.api.beginThermalShock(e);e.hp=0;g.api.updateThermalShockEnemy(e,.5);assert.equal(g.api.thermalShockSnapshot().length,0,'dead host does not detonate');assert(!e.thermalShock);
 }
 {
  const {g}=setup(),e=ready(g);g.api.update(.01);assert(g.api.thermalPressureActive(e),'real loop starts reaction');const x=e.x;g.api.update(.1);assert.equal(e.x,x,'pressure holds ordinary host');g.state.paused=true;const before=JSON.stringify(e);g.api.update(.3);assert.equal(JSON.stringify(e),before);g.state.paused=false;
  g.api.resetAbilityEffects();assert(g.api.thermalPressureActive(e),'cosmetic reset cannot cancel combat reaction');g.api.resetThermalShock();assert(!e.thermalShock);assert.equal(g.api.thermalShockSnapshot().length,0);
 }
 {
  const {g,env}=setup({reduced:true}),e=ready(g);g.api.beginThermalShock(e);g.api.updateThermalShockEnemy(e,.2);assert.equal(g.api.thermalShockPose(e),null);const before=JSON.stringify(g.state);const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('render RNG')};g.api.drawThermalShockEnemy(e);g.api.drawThermalShockPops();assert.equal(JSON.stringify(g.state),before);env.sandbox.Math.random=random;
 }
 {
  const {g}=setup(),n=g.api.spawnEnemy(false,250,350,'grunt'),e=ready(g,240),second=ready(g,235);g.api.beginThermalShock(e);g.api.updateThermalShockEnemy(e,.5);n.stun=0;g.api.beginThermalShock(second);g.api.updateThermalShockEnemy(second,.5);assert.equal(n.stun,0,'overlapping bursts share stagger recovery');g.api.resetRun();assert.equal(g.api.thermalShockSnapshot().length,0,'new run discards steam');
 }
 console.log('PASS: delayed consumed-status Thermal Shock, exact single burst, local non-damaging stagger/recovery, boss immunity to control, elemental/flight/death gating, loop/pause/reset/resize and pure reduced-motion presentation.');
};
