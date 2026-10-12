const assert=require('assert');
module.exports=load=>{
 const setup=()=>{const env=load(true),g=env.sandbox.testGame;g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.wave=9;g.state.W=800;g.state.H=700;g.state.player.x=700;g.state.player.y=350;g.state.enemies=[];g.state.walls=[];g.state.enemyShots=[];g.state.stats.rockDamage=0;g.state.stats.wallDamage=0;g.state.spawnTimer=9999;g.state.timeLeft=300;return {g,env};};
 const wall=(x,y1=180,y2=520)=>({pts:[{x,y:y1},{x,y:y2}],thick:8,hp:1000,maxHp:1000,life:1000,maxLife:1000,eraseInk:50});
 {
  const {g,env}=setup(),e=g.api.spawnEnemy(false,100,350,'flanker');g.state.walls=[wall(280,100,560),wall(440,200,610)];for(let i=0;i<25;i++)g.state.walls.push(wall(130+i*4,280,295));
  const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('planner must not use RNG')};const path=g.api.sneakRoute({...e,r:19},g.state.player);env.sandbox.Math.random=random;assert(path&&path.length<8,'planner finds a smooth distant detour without a shortlist');let a={...e,r:19};for(const b of path){assert(g.api.bouncePathClear(a,b.x,b.y,0),'every routed segment is body-safe');a={...a,...b};}assert.equal(path.at(-1).x,700);
 }
 {
  const {g}=setup(),e=g.api.spawnEnemy(false,100,350,'flanker');g.state.walls=[{...wall(600),closed:true,pts:[{x:600,y:250},{x:760,y:250},{x:760,y:450},{x:600,y:450},{x:600,y:250}]}];g.api.updateSneaky(e,1.2);const s=g.api.sneakySnapshot()[0];assert.equal(s.route,null,'never advertises a line through sealed cover');assert.equal(s.runs,0);g.api.updateSneaky(e,1.6);g.api.updateSneaky(e,1.6);assert.equal(g.api.sneakySnapshot()[0].phase,'join','failed plans eventually commit without fake route');
 }
 {
  const {g}=setup(),e=g.api.spawnEnemy(false,100,350,'flanker'),ally=g.api.spawnEnemy(false,480,365,'grunt');g.api.updateSneaky(e,1.2);g.api.updateSneakyOrders(1);const target=g.api.sneakFollowTarget(ally);assert(target&&target.x>=470,'late joiner does not walk backward to first dot');
  g.state.walls=[wall(550,0,700)];g.api.updateSneakyOrders(.3);assert(g.api.sneakySnapshot()[0].route.blocked>0);assert.equal(g.api.sneakFollowTarget(ally),null,'compromised directions release followers');g.api.updateSneakyOrders(10);assert.equal(g.api.sneakySnapshot()[0].route,null);
 }
 for(const speed of [1,500]){
  const {g}=setup(),h=g.api.spawnEnemy(false,400,350,'tank'),n=g.api.spawnEnemy(false,356,328,'grunt');n.speed=speed;h.chonks.momentum=1;g.api.updateChonksShield(.01);const pace=h.speed*g.api.enemyMoveScale(h);h.x+=pace*.1;const old=n.x;g.api.updateChonksEscort(n,.1);assert(Math.abs(n.x-old-pace*.1)<1e-6,'slow and fast followers match leader pace');
  h.chonks.phase='recover';const position={x:n.x,y:n.y};g.api.updateChonksEscort(n,.1);assert.deepEqual({x:n.x,y:n.y},position,'recovery stops sheltered convoy');h.chonks.shield=false;assert(!g.api.updateChonksEscort(n,.1));assert.equal(n.speed,speed,'native speed is never overwritten');
 }
 {
  const {g}=setup(),h=g.api.spawnEnemy(false,400,350,'tank');for(let i=0;i<8;i++)g.api.spawnEnemy(false,315-i*2,345+i,'grunt');g.api.updateChonksShield(.01);assert.equal(g.api.chonksConvoySnapshot().length,6);assert.equal(g.state.enemies.filter(e=>g.api.updateChonksEscort(e,.01)).length,8,'overflow sheltered followers also match pace');
 }
 {
  const {g}=setup(),e=g.api.spawnEnemy(false,150,350,'sniper');g.state.walls=[wall(250),wall(450)];const ink=g.state.stats.ink,hp=g.state.player.hp;g.api.fireSniper(e,true);const shot=g.state.enemyShots[0];assert(shot.eraser&&shot.damage===0);g.api.updateEnemyShots(2.5);assert.equal(g.state.player.hp,hp,'eraser cannot damage Stevie');assert.equal(g.state.stats.ink,ink,'no enemy ink refund');assert(g.state.enemyShots.every(s=>!s.reflected),'eraser never reflects');
  for(const w of g.state.walls)assert(g.api.nearestPointOnWall({x:w.pts[0].x,y:350},w)&&w.pts.every(p=>Math.abs(p.y-350)>=g.catalog.enemyDefs.tank.r+8),'all intersected barriers have a Chonks-sized gap');
  assert(g.api.bouncePathClear({x:200,y:350,r:g.catalog.enemyDefs.tank.r},500,350,0),'Chonks really fits through both gaps');
  g.state.enemyShots=[];g.api.fireSniper(e,true);const live=g.state.enemyShots[0];assert(g.api.eraseProjectiles(live,live,20));assert.equal(g.state.enemyShots.length,0,'player can erase eraser pencil');
 }
 {
  const {g}=setup(),e=g.api.spawnEnemy(false,200,350,'sniper');g.state.walls=[{...wall(550),closed:true,pts:[{x:550,y:180},{x:760,y:180},{x:760,y:520},{x:550,y:520},{x:550,y:180}]}];
  for(let i=0;i<15;i++)g.api.updateSniper(e,.05);assert(g.state.enemyShots.some(s=>s.eraser),'no good shot produces warned eraser throw');const count=g.state.enemyShots.length;for(let i=0;i<20;i++)g.api.updateSniper(e,.05);assert.equal(g.state.enemyShots.length,count,'normal shot waits');for(let i=0;i<11;i++)g.api.updateSniper(e,.05);assert(g.state.enemyShots.some(s=>!s.eraser),'regular pencil follows after 1.5s');
  const regular=g.state.enemyShots.find(s=>!s.eraser);g.state.enemyShots=[regular];g.state.walls=[wall(e.x+30)];g.api.updateEnemyShots(.5);assert(regular.reflected,'regular follow-up retains drawing return counter');
 }
 {
  const {g}=setup(),h=g.api.spawnEnemy(false,400,350,'tank'),e=g.api.spawnEnemy(false,330,350,'sniper');g.state.walls=[wall(500)];g.api.updateChonksShield(.01);for(let i=0;i<12;i++)g.api.updateChonksEscort(e,.05);assert(g.state.enemyShots.some(s=>s.eraser),'convoy Pew-Pew clears lane rather than abandoning leader');const count=g.state.enemyShots.length;for(let i=0;i<24;i++)g.api.updateChonksEscort(e,.05);assert.equal(g.state.enemyShots.length,count);g.api.updateChonksEscort(e,.06);assert(g.state.enemyShots.some(s=>!s.eraser),'convoy follow-up uses 20% faster attack clock');
 }
 {
  const {g,env}=setup(),e=g.api.spawnEnemy(false,200,350,'sniper');g.state.walls=[wall(550)];g.api.eraseSniperLane(e,.2);e.freeze=1;const age=e.sniperErase.age;g.api.updateSniper(e,.5);assert(!e.sniperErase&&g.state.enemyShots.length===0,'freeze cancels unthrown eraser');e.freeze=0;g.api.eraseSniperLane(e,.2);const before=JSON.stringify(g.state),rng=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('render RNG')};g.api.draw();env.sandbox.Math.random=rng;assert.equal(JSON.stringify(g.state),before,'warning render is read-only');
  g.state.paused=true;g.api.update(1);assert.equal(e.sniperErase.age,.2,'paused windup stays paused');
 }
 console.log('PASS: deterministic body-clear distant Sneaky detours/no impossible routes/nearby joins/retirement, exact slow-fast convoy pacing and overflow/release, safe sweeping erasable eraser pencils/no refunds/wide gaps, regular returnable follow-up, convoy attack boost, freeze/pause and pure warnings.');
};
