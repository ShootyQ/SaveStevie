const assert=require('assert');
function check(g,assert){
 const a=g.api,s=g.state;a.resetRun({skipIntro:true});s.enemies=[];s.walls=[];s.projectiles=[];s.stats.ink=s.stats.maxInk=5000;
 // A long winding ride used to retain many seconds of reserved rail lifetime.
 for(const range of [0,3])for(const broken of [false,true]){
  s.enemies=[];s.walls=[];s.projectiles=[];
  const w=a.createWall([{x:180,y:150},{x:180,y:400},{x:300,y:400},{x:300,y:250}]).base;
  const p={x:160,y:200,speed:290,life:99,manual:true,vx:290,vy:0,doodlePayload:{underline:8,range}};
  assert(a.guideDoodleProjectile(p,{x:160,y:200},{x:195,y:200}),'ball boards line');
  if(broken){s.walls=[];a.advanceDoodleRail(p,.01);}else for(let i=0;i<400&&p.rail;i++)a.advanceDoodleRail(p,.01);
  assert.equal(p.rail,null);assert.equal(p.life,a.paperRange(p.doodlePayload)/p.speed,'exit discards all reserved ride time');
  const origin={x:p.x,y:p.y};s.projectiles=[p];let distance=0,prev={...origin};
  for(let i=0;i<1000&&s.projectiles.includes(p);i++){a.updateProjectiles(.01);distance+=Math.hypot(p.x-prev.x,p.y-prev.y);prev={x:p.x,y:p.y};}
  assert(!s.projectiles.includes(p),'unclaimed throw expires');assert(distance<=a.paperRange(p.doodlePayload)+.001,'exit never shoots beyond normal range');assert(distance>a.paperRange(p.doodlePayload)-4,'exit still gets a full normal throw');
 }
 // Retarget from the endpoint, excluding enemies formerly inside the bonus range.
 for(const turret of [false,true]){
  s.enemies=[];s.walls=[];const w=a.createWall([{x:180,y:150},{x:180,y:300}]).base;
  const p={x:170,y:200,speed:290,life:99,target:{x:180,y:400},doodlePayload:{underline:4},turretShot:turret,turretRange:170};
  a.guideDoodleProjectile(p,{x:160,y:200},{x:195,y:200});
  const reach=turret?170:a.paperRange(p.doodlePayload),far=a.spawnEnemy(false,180+reach+25,300,'grunt');
  for(let i=0;i<200&&p.rail;i++)a.advanceDoodleRail(p,.01);
  assert.equal(p.target,null,'out-of-range enemy is not acquired');assert.equal(p.life,reach/p.speed);
 }
}
module.exports=load=>{check(load(true,{images:true}).sandbox.testGame,assert);console.log('PASS: Underline long rides and broken lines reset to normal flight range, captured range upgrades apply, extra Underline copies grant no range, endpoint targeting and turret range stay bounded.');};
module.exports.check=check;
