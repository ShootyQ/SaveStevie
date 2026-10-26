const assert=require('assert');
module.exports=load=>{
 const setup=options=>{const env=load(true,options),g=env.sandbox.testGame,a=g.api,s=g.state;a.resetRun();s.enemies=[];s.walls=[];s.W=800;s.H=700;s.player.x=600;s.player.y=400;s.spawnTimer=99999;s.timeLeft=300;s.stats.rockDamage=0;return {env,g,a,s};};
 {
  const {a,s,env}=setup();assert(a.beginPaperPress({x:200,y:220}));a.updatePaperPress(.09);assert.equal(a.paperPressSnapshot().press.depth,0);a.updatePaperPress(.011);assert(a.paperPressSnapshot().press.depth>0);a.updatePaperPress(2.5);assert.equal(a.paperPressSnapshot().press.r,90);a.updatePaperPress(20);assert.equal(a.paperPressSnapshot().press.r,90);
  const e=a.spawnEnemy(false,275,220,'grunt'),before=e.x,hp=e.hp;a.updatePaperPress(.2);assert(e.x<before);assert(a.paperPressCaptures(e));const brain=JSON.stringify(a.paperPressSnapshot()),state=JSON.stringify(s),random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('draw must not roll RNG')};a.draw();env.sandbox.Math.random=random;assert.equal(JSON.stringify(s),state);assert.equal(JSON.stringify(a.paperPressSnapshot()),brain);
  assert(a.releasePaperPress());assert(e.flight?.paperBounce);const start={x:e.x,y:e.y};assert(Math.hypot(e.flight.targetX-e.x,e.flight.targetY-e.y)<=58.01);a.updateEnemyFlight(e,.5);assert(!e.flight);assert.equal(e.hp,hp-2);assert(e.stun>0);assert(Math.hypot(e.x-start.x,e.y-start.y)<=58.01);
 }
 {
  const {a,s}=setup();a.beginPaperPress({x:200,y:220});for(let i=0;i<10;i++){a.updatePaperPress(.15);a.movePaperPress({x:200+(i%2?30:0),y:220});}assert.equal(a.paperPressSnapshot().press.age,0,'rubbing never charges');a.updatePaperPress(.5);assert(a.movePaperPress({x:233,y:223}),'minor drift stays pressed');a.movePaperPress({x:270,y:220});assert.equal(a.paperPressSnapshot().press.age,0);
  a.updatePaperPress(1);s.paused=true;a.update(.1);assert.equal(a.paperPressSnapshot().press,null);assert.equal(a.releasePaperPress(),false);s.paused=false;
  a.beginPaperPress({x:200,y:220});a.updatePaperPress(1);a.cancelDrawingInput();assert.equal(a.paperPressSnapshot().press,null);
  a.beginPaperPress({x:200,y:220});a.updatePaperPress(1);a.startWave();assert.equal(a.paperPressSnapshot().press,null);
 }
 {
  const {a,s}=setup();a.beginPaperPress({x:200,y:220});a.updatePaperPress(3);const e=a.spawnEnemy(false,240,220,'grunt'),tank=a.spawnEnemy(false,200,250,'tank');tank.chonks.shield=true;assert(!a.paperPressCaptures(tank));const boss={...e,waveBoss:true};assert(!a.paperPressCaptures(boss));e.paperTunnel={};assert(!a.paperPressCaptures(e));delete e.paperTunnel;
  s.walls=[{pts:[{x:220,y:150},{x:220,y:300}],thick:8,hp:100,maxHp:100,life:100,maxLife:100}];assert(!a.paperPressCaptures(e),'wall blocks suction');a.releasePaperPress();assert(!e.flight);
  s.walls=[];a.beginPaperPress({x:170,y:220});a.updatePaperPress(3);e.x=195;e.y=220;tank.hp=0;a.releasePaperPress();assert(e.flight);s.walls=[{pts:[{x:215,y:150},{x:215,y:300}],thick:8,hp:100,maxHp:100,life:100,maxLife:100}];a.updateEnemyFlight(e,.3);assert(e.x<215-e.r,'new wall intercepts bounce');
 }
 {
  const {a,s}=setup({reduced:true});a.beginPaperPress({x:200,y:220});a.updatePaperPress(3);const e=a.spawnEnemy(false,230,220,'grunt');a.releasePaperPress();assert.equal(e.flight.height,0);a.resetRun();assert.equal(a.paperPressSnapshot().ripples.length,0);assert(!a.beginPaperPress({x:s.player.x,y:s.player.y}));
 }
 {const {a,s}=setup();s.synergies.add('Plaguefire');a.dropPlaguefire({x:200,y:220,burn:2,poison:2});assert(!a.beginPaperPress({x:200,y:220}),'burned-through paper cannot hold a dent');a.resetPlaguefire();a.addPaperHole({x:200,y:220});assert(!a.beginPaperPress({x:200,y:220}),'open holes cannot hold a dent');a.resetPaper();a.spawnEnemy(false,200,220,'grunt');assert(a.beginPaperPress({x:200,y:220}),'can press intact paper beneath ordinary monsters');a.cancelPaperPress();a.spawnEnemy(false,200,220,'scrubber');assert(!a.beginPaperPress({x:200,y:220}),'erasable runner keeps its normal interaction');}
 console.log('PASS: paper press delay/growth/pull, light bounded bounce, rub/drift distinction, wall/fort/boss/shield/tunnel guards, safe cancellation, pure rendering and reduced motion.');
};
