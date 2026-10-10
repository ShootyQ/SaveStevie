const assert=require('assert');
module.exports=function(load){
 function setup(){const env=load(true),g=env.sandbox.testGame;g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.W=800;g.state.H=700;g.state.player.x=700;g.state.player.y=350;g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.stats.rockDamage=0;g.state.enemies=[];g.state.walls=[];return {g,env};}
 const wall=(x,y1=200,y2=500)=>({pts:[{x,y:y1},{x,y:y2}],thick:8,hp:10000,maxHp:10000,life:1000,maxLife:1000});
 {
  const {g}=setup(),e=g.api.spawnEnemy(false,100,350,'sprinter'),first=wall(300),second=wall(370);g.state.walls=[first,second];assert(e.r>=14&&e.speed>g.catalog.enemyDefs.fast.speed);let sawJump=false;
  for(let i=0;i<350;i++){g.api.updateEnemyBehavior(e,.02);g.api.updateDash(e,.02);sawJump||=!!e.hurdle;}
  assert(sawJump&&e.hurdlesLeft===0);assert(e.x>300&&e.x<370-e.r,'one vault reaches first wall but cannot cross backup');assert.equal(first.hp,10000,'vault preserves first wall');assert(second.hp<10000,'backup wall gets attacked normally');
  const x=e.x;e.freeze=1;g.api.updateDash(e,.5);assert.equal(e.x,x,'freeze prevents movement/attacks');e.freeze=0;
  const extra=g.api.spawnEnemy(false,280,350,'sprinter');g.state.walls=[first,wall(325)];g.api.updateDash(extra,.03);assert(!extra.hurdle,'too-tight double cover denies a safe landing');assert(extra.x<300,'no swept-frame tunneling');
  g.state.walls=[first];const resized=g.api.spawnEnemy(false,278,350,'sprinter');g.api.updateDash(resized,.05);assert(resized.hurdle);const from={...resized.hurdle.from},to={...resized.hurdle.to};resized.x+=10;resized.y+=12;g.api.moveEnemyTactics(10,12);assert.equal(resized.hurdle.from.x,from.x+10);assert.equal(resized.hurdle.to.y,to.y+12);g.state.walls=[first,wall(resized.x+8)];const stoppedX=resized.x;g.api.updateDash(resized,.1);assert(!resized.hurdle&&resized.stun>0);assert.equal(resized.x,stoppedX,'newly drawn backup intercepts an in-progress hurdle');
  g.state.walls=[wall(665)];const near=g.api.spawnEnemy(false,640,350,'sprinter');g.api.updateDash(near,.05);assert(!near.hurdle,'no leap into Stevie’s fort');
 }
 {
  const {g,env}=setup(),e=g.api.spawnEnemy(false,150,350,'flanker');g.state.walls=[wall(300),wall(440,120,390)];const route=g.api.sneakRoute(e,g.state.player);assert(route&&route.length>1,'finds a real multi-wall detour');
  const oldRandom=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('pathfinding must be deterministic')};
  for(let i=0;i<900&&e.x<500;i++)g.api.updateSneaky(e,.03);env.sandbox.Math.random=oldRandom;assert(e.x>500,'walks around staggered walls instead of chewing blindly');
  g.state.walls=[{...wall(500),closed:true,pts:[{x:600,y:260},{x:780,y:260},{x:780,y:440},{x:600,y:440},{x:600,y:260}]}];e.x=550;e.y=350;assert.equal(g.api.sneakRoute(e,g.state.player),null,'cannot route through a sealed enclosure');
  g.api.eraseWallPath({x:600,y:350},{x:600,y:350},22);assert(g.api.sneakRoute(e,g.state.player),'freshly erased gap changes the route');
 }
 {
  const {g}=setup();g.state.player.x=600;const e=g.api.spawnEnemy(false,400,350,'sniper'),cage={...wall(450),closed:true,pts:[{x:350,y:280},{x:450,y:280},{x:450,y:420},{x:350,y:420},{x:350,y:280}]};g.state.walls=[cage];g.state.stats.ink=0;let scrubbing=false;
  for(let i=0;i<500&&!g.api.sniperCanAim(e);i++){g.api.updateSniper(e,.02);scrubbing||=!!e.sniperErase;}
  assert(scrubbing&&g.api.sniperCanAim(e),'boxed-out Pew-Pew erases his own clear lane');assert.equal(g.state.stats.ink,0,'enemy eraser never refunds ink');assert.equal(g.state.enemyShots.length,0,'opening the lane leaves a fresh aim warning');g.api.updateSniper(e,.02);assert(e.shootCd>.6);
  g.state.walls=[cage];e.x=424;e.y=350;e.freeze=1;const geometry=JSON.stringify(g.state.walls);g.api.updateSniper(e,2);assert.equal(JSON.stringify(g.state.walls),geometry);assert(!e.sniperErase,'freeze interrupts erasing');
 }
 {
  const {g}=setup();g.state.wave=5;const e=g.api.spawnEnemy(true,100,350),b=g.api.bossBrain(e);assert(Math.abs(g.api.firstBossTuning(e).helperGap-4.5/1.1)<1e-9);g.state.synergies.add('Hot Rocks');g.state.synergies.add('Snowball Fight');
  b.cast={kind:'mirror-orb',left:1,duration:1};const cast=b.cast,p={x:e.x,y:e.y,target:e,speed:290,damage:20,life:2,doodlePayload:{fire:3,electric:3,frost:3,poison:3,eraser:2,orbit:1,credit:1,split:3,ink:1}};const hp=e.hp;
  g.api.hitPaper(p,e);assert(e.hp<hp,'physical paper still hurts the guarded boss');assert.equal(g.api.afterPaperHit(p,e),false,'paper-note procs cannot attach to king');assert.equal(p.paperMode,undefined);assert.equal(b.cast,cast);for(const k of ['burn','poison','freeze','stun','gravitySlow'])assert.equal(e[k],0,k+' immune');
  const immuneHp=e.hp;for(const kind of ['fire','poison','electric','frost','blast','void','erase','vampire'])g.api.dealDamage(e,100,kind);assert.equal(e.hp,immuneHp);
  for(const kind of ['fire','frost','poison','electric','repulsion','chaos']){g.state.inks[kind]=3;g.api.applyOneInk(kind,e,.1);}g.api.applyInkContact(e,.2);g.api.chainLightning(e,3);for(const k of ['burn','poison','freeze','stun','gravitySlow'])assert.equal(e[k],0);
  const helper=g.api.spawnEnemy(false,120,350,'grunt');helper.bossOwner=e;const before={x:e.x,y:e.y},turn=b.turn;g.api.updateBossEncounter(e,.02);assert(helper.flight?.bossThrown,'eligible passing helper gets scooped without a pickup trip');assert.deepEqual({x:e.x,y:e.y},before);assert.equal(b.cast,cast,'drive-by does not replace ongoing attack');assert.equal(b.turn,turn);assert(helper.flight.damage===0&&helper.flight.stun===0);
  e.freeze=e.stun=e.gravitySlow=1;e.burn=e.poison=2;const left=cast.left;g.api.update(.02);for(const k of ['burn','poison','freeze','stun','gravitySlow'])assert.equal(e[k],0,'no indirect control survives a real frame');assert(cast.left<left,'king cast progresses through attempted status control');
  b.driveByCd=0;e.x=560;e.y=350;const nearHelper=g.api.spawnEnemy(false,570,350,'grunt');nearHelper.bossOwner=e;g.api.updateBossEncounter(e,.02);assert(nearHelper.flight?.bossThrown,'passing adds can be tossed even without the normal far-away pickup requirement');assert(Math.hypot(nearHelper.flight.targetX-g.state.player.x,nearHelper.flight.targetY-g.state.player.y)>=g.state.player.r+nearHelper.r+75,'drive-by landings keep reaction space');
 }
 {
  const {g}=setup();for(let i=0;i<125;i++){const x=i%2?180:180.1;g.api.queuePaperRub({x,y:180},{x:x+.1,y:180},20);g.api.updatePaper(.02);}assert.equal(g.state.paper.holes.length,1,'tiny real movement opens a hole');
  g.api.resetPaper();const edge=g.api.refugePoint(700,250);for(let i=0;i<110;i++){g.api.queuePaperRub({x:edge.x,y:edge.y-18},{x:edge.x+12,y:edge.y-18},20);g.api.updatePaper(.02);}assert.equal(g.state.paper.holes.length,1,'paper near the fort is no longer silently protected by a huge margin');
  const snapshot=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),snapshot);g.state.paused=true;const paused=JSON.stringify(g.state);g.api.update(.5);assert.equal(JSON.stringify(g.state),paused);
 }
 console.log('PASS: fast visible Dash/single swept hurdle/backup and fort safety, deterministic multi-wall Sneaky routes and new gaps, Pew-Pew erasing/fresh aim/no refunds/freeze, immune king with physical paper and drive-by helpers, tiny/near-fort paper wear, pause and pure draw.');
};
if(require.main===module){const fs=require('fs'),source=fs.readFileSync(require('path').join(__dirname,'validate.cjs'),'utf8'),harness=source.slice(0,source.indexOf('// Retain explicit regression'));module.exports(new Function('require','__dirname',harness+'\nreturn load;')(require,__dirname));}
