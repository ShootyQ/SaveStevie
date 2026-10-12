const assert=require('assert');
module.exports=load=>{
 const setup=options=>{const env=load(true,options),g=env.sandbox.testGame;g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.W=800;g.state.H=700;g.state.player.x=400;g.state.player.y=350;g.state.enemies=[];g.state.walls=[];g.state.synergies.add('Black Ice');g.state.inks.frost=1;g.state.inks.repulsion=1;return {g,env};};
 const wall=x=>({pts:[{x,y:200},{x,y:500}],thick:8,hp:1000,maxHp:1000,life:1000,maxLife:1000});
 {
  const {g}=setup(),e=g.api.spawnEnemy(false,250,350,'grunt');e.freeze=1;const hp=e.hp;g.api.applyRepulsionContact(e,.8);assert(e.blackIce&&e.freeze===0&&e.stun===0,'actual repulsion starts skating instead of teleport shove');assert(e.hp<hp,'existing repulsion damage preserved');
  g.api.updateBlackIce(e,.1);assert(e.x<250&&e.blackIce.trail.length>1);g.api.updateEnemyAnimations(.1);assert(Math.abs(g.api.enemyAnimationPose(e).angle)>.1,'leaning pose');
  const trail=e.blackIce.trail[0].x;g.api.moveBlackIce(10,20);assert.equal(e.blackIce.trail[0].x,trail+10);
  let recovery=false;for(let i=0;i<70;i++){g.api.updateBlackIce(e,.02);recovery||=e.blackIce?.phase==='recover';}assert(recovery&&!e.blackIce,'spin-out ends and AI can resume');
 }
 {
  const {g}=setup(),e=g.api.spawnEnemy(false,250,350,'grunt'),n=g.api.spawnEnemy(false,220,350,'grunt');e.freeze=1;g.api.startBlackIce(e,-1,0);const old=n.x;g.api.updateBlackIce(e,.08);assert(n.x<old&&e.blackIce.hits.has(n),'bowls neighbour aside');assert(Math.abs(e.blackIce.vx)<220*Math.exp(-2.4*.08),'collision loses momentum');const after=n.x;g.api.updateBlackIce(e,.01);assert.equal(n.x,after,'one nudge per neighbour');
 }
 {
  const {g}=setup(),e=g.api.spawnEnemy(false,250,350,'grunt');e.freeze=1;g.state.walls=[wall(230)];g.api.startBlackIce(e,-1,0);g.api.updateBlackIce(e,.1);assert.equal(e.x,250);assert.equal(e.blackIce.phase,'recover');assert.equal(g.state.walls[0].hp,1000,'slide cannot destroy or tunnel through wall');
  delete e.blackIce;e.x=340;e.freeze=1;g.state.walls=[];g.api.startBlackIce(e,1,0);g.api.updateBlackIce(e,.1);assert.equal(e.x,340,'slide cannot enter fort');
 }
 {
  const {g}=setup(),e=g.api.spawnEnemy(false,250,350,'grunt');assert(!g.api.startBlackIce(e,-1,0),'requires frozen enemy');e.freeze=1;g.state.synergies.delete('Black Ice');assert(!g.api.startBlackIce(e,-1,0));g.state.synergies.add('Black Ice');e.waveBoss=true;assert(!g.api.startBlackIce(e,-1,0),'boss resists');e.waveBoss=false;e.flight={};assert(!g.api.startBlackIce(e,-1,0),'airborne excluded');delete e.flight;
  g.api.startBlackIce(e,-1,0);g.state.paused=true;const before=JSON.stringify(e);g.api.update(.1);assert.equal(JSON.stringify(e),before,'paused game freezes slide');g.state.paused=false;e.freeze=1;g.api.updateBlackIce(e,.02);assert.equal(e.blackIce.phase,'recover','new freeze interrupts slide');
 }
 {
  const {g,env}=setup({reduced:true}),e=g.api.spawnEnemy(false,250,350,'grunt');e.freeze=1;g.api.startBlackIce(e,-1,0);g.api.updateBlackIce(e,.1);g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemyAnimationPose(e).angle,0,'reduced motion avoids spin');const state=JSON.stringify(g.state);const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('render RNG')};g.api.drawBlackIce();g.api.drawBlackIceLimbs(e);assert.equal(JSON.stringify(g.state),state,'drawing is read-only');env.sandbox.Math.random=random;
 }
 console.log('PASS: real Black Ice repulsion/skating, neighbour nudge and friction, one collision per target, wall/fort safety, boss/flight gating, recovery, pause, resize, new freeze and reduced-motion pure drawing.');
};
