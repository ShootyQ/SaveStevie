const assert=require('assert');
module.exports=load=>{
 const setup=()=>{const env=load(true),g=env.sandbox.testGame,a=g.api,s=g.state;a.resetRun();s.W=1200;s.H=700;s.player.x=1100;s.player.y=350;s.enemies=[];s.walls=[];s.stats.rockDamage=0;return {env,g,a,s};};
 const wall=x=>({pts:[{x,y:200},{x,y:500}],thick:8,hp:10000,maxHp:10000,life:1000,maxLife:1000});
 {
  const {a,s}=setup(),e=a.spawnEnemy(false,220,350,'sprinter');assert.equal(e.r,14*.85);assert.equal(e.hurdlesLeft,1);s.walls=[wall(250),wall(580)];let jumps=0,air=false;
  for(let i=0;i<400&&jumps<2;i++){a.updateDash(e,.02);if(e.hurdle&&!air){jumps++;assert.equal(e.hurdleDistance,0,'each wall jump consumes its running charge');}air=!!e.hurdle;}
  assert.equal(jumps,2,'clear runway earns a second real wall hurdle');assert(s.walls.every(w=>w.hp===10000));
 }
 {
  const {a,s}=setup(),e=a.spawnEnemy(false,220,350,'sprinter');s.walls=[wall(250),wall(310)];let jumped=false;for(let i=0;i<250;i++){a.updateDash(e,.02);jumped||=!!e.hurdle;}assert(jumped);assert(e.x<310-e.r);assert.equal(e.hurdlesLeft,0);assert(e.hurdleDistance<180,'chewing cover cannot recharge jump');
 }
 {
  const {a,s}=setup(),e=a.spawnEnemy(false,100,350,'sprinter');e.hurdlesLeft=0;e.hurdleDistance=0;e.speed=100;a.enemyMoveScale=()=>1;
  a.updateDash(e,1.79);assert.equal(e.hurdlesLeft,0);a.updateDash(e,.01);assert.equal(e.hurdlesLeft,1,'180 actual ground pixels recharge exactly one jump');
  e.hurdlesLeft=0;e.hurdleDistance=0;e.freeze=1;a.updateDash(e,5);assert.equal(e.hurdleDistance,0);e.freeze=0;
  e.x+=80;a.moveEnemyTactics(80,0);a.updateDash(e,0);assert.equal(e.hurdleDistance,0,'external movement and resize cannot grant charge');
  s.paused=true;a.update(1);assert.equal(e.hurdleDistance,0);
 }
 console.log('PASS: 15% smaller Dash, ready spawn, repeated actual wall vaults after ground travel, close-wall counter, exact distance threshold and freeze/resize/pause guards.');
};
