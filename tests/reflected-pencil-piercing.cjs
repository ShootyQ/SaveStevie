const assert=require('assert');
module.exports=function(load){
 function setup(wave=9){const g=load(true).sandbox.testGame;g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.W=900;g.state.H=700;g.state.wave=wave;g.state.player.x=800;g.state.player.y=350;g.state.enemies=[];g.state.walls=[];g.state.enemyShots=[];return g;}
 const returnShot=(g,owner,x=600,y=350,life=6)=>{const shot={x,y,r:3,life,sniperOwner:owner,reflected:true};g.state.enemyShots=[shot];return shot;};
 {
  const g=setup(),owner=g.api.spawnEnemy(false,100,350,'sniper');
  const a=g.api.spawnEnemy(false,260,350,'grunt'),b=g.api.spawnEnemy(false,390,350,'bulwark'),miss=g.api.spawnEnemy(false,360,420,'grunt'),behind=g.api.spawnEnemy(false,20,350,'grunt');a.hp=a.maxHp=999;b.hp=b.maxHp=999;
  g.state.walls=[{pts:[{x:600,y:250},{x:600,y:450}],hp:100,maxHp:100,thick:8,life:100,maxLife:100}];
  g.state.enemyShots=[{x:500,y:350,vx:150,vy:0,r:3,life:6,damage:7,sniperOwner:owner,reflected:false}];const hp=g.state.player.hp,kills=g.state.kills;
  g.api.updateEnemyShots(1);assert(g.state.enemyShots[0].reflected,'actual drawn cover reflects the pencil');assert(g.state.enemies.includes(a)&&g.state.enemies.includes(b),'outgoing shot does not kill mobs');
  g.api.updateEnemyShots(3);assert(!g.state.enemies.includes(a)&&!g.state.enemies.includes(b),'swept return kills multiple high-HP mobs through ordinary armor');assert(!g.state.enemies.includes(owner));assert(g.state.enemies.includes(miss)&&g.state.enemies.includes(behind),'only mobs touching the travelled path die');assert.equal(g.state.kills,kills+3,'every defeat awards once');assert.equal(g.state.enemyShots.length,0);assert.equal(g.state.player.hp,hp,'returned pencil never hurts Stevie');
  g.api.updateEnemyShots(1);assert.equal(g.state.kills,kills+3);
 }
 {
  const g=setup(),owner=g.api.spawnEnemy(false,100,350,'sniper'),a=g.api.spawnEnemy(false,550,350,'grunt'),b=g.api.spawnEnemy(false,420,350,'grunt');returnShot(g,owner);g.api.updateEnemyShots(.3);assert(!g.state.enemies.includes(a));assert(g.state.enemies.includes(b));assert.equal(g.state.enemyShots.length,1,'piercing does not consume pencil');g.api.updateEnemyShots(.5);assert(!g.state.enemies.includes(b));assert.equal(owner.returnHits||0,0);g.api.updateEnemyShots(2);assert(!g.state.enemies.includes(owner));
 }
 {
  const g=setup(),owner=g.api.spawnEnemy(false,100,350,'sniper'),tank=g.api.spawnEnemy(false,380,350,'tank'),escort=g.api.spawnEnemy(false,330,350,'grunt'),tunnel=g.api.spawnEnemy(false,470,350,'grunt'),boss=g.api.spawnEnemy(false,230,350,'boss');tunnel.paperTunnel={};const hp=[tank.hp,escort.hp,tunnel.hp,boss.hp];assert(g.api.chonksProtected(escort));returnShot(g,owner);g.api.updateEnemyShots(3);assert(!g.state.enemies.includes(tank)&&!g.state.enemies.includes(escort),'returned pencil pierces shield and convoy');assert.deepEqual([tunnel.hp,boss.hp],hp.slice(2),'hidden underground monsters and bosses remain protected');
 }
 for(const [wave,needed] of [[12,1],[13,1],[19,1],[40,1]]){
  const g=setup(wave),owner=g.api.spawnEnemy(false,100,350,'sniper');assert.equal(owner.returnHitsNeeded,needed);
  for(let i=1;i<=needed;i++){const mob=g.api.spawnEnemy(false,400,350,'grunt');returnShot(g,owner);g.api.updateEnemyShots(3);assert(!g.state.enemies.includes(mob));assert.equal(owner.returnHits,i);assert.equal(g.state.enemies.includes(owner),i<needed);}
 }
 {
  const g=setup(),owner=g.api.spawnEnemy(false,100,350,'sniper'),near=g.api.spawnEnemy(false,580,350,'grunt'),far=g.api.spawnEnemy(false,420,350,'grunt');returnShot(g,owner,600,350,.1);g.api.updateEnemyShots(2);assert(!g.state.enemies.includes(near)&&g.state.enemies.includes(far));assert.equal(owner.returnHits||0,0);assert.equal(g.state.enemyShots.length,0,'expired shot cannot sweep its whole return route');
 }
 console.log('PASS: real pencil deflection, swept piercing multi-kills, surviving return after hits, exact defeat rewards, off-path/behind-owner misses, armor/shield kills, tunnel/boss protection and one return at every wave.');
};
if(require.main===module){const fs=require('fs'),source=fs.readFileSync(require('path').join(__dirname,'validate.cjs'),'utf8'),harness=source.slice(0,source.indexOf('// Retain explicit regression'));module.exports(new Function('require','__dirname',harness+'\nreturn load;')(require,__dirname));}
