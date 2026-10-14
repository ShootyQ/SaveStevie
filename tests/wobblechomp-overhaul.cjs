const assert=require('assert');
module.exports=function(load){
 const wall=(pts)=>({pts,hp:200,maxHp:200,thick:8,life:100,maxLife:100});
 function setup(W=800,H=700){const env=load(true),g=env.sandbox.testGame;g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.wave=10;g.api.startWave();g.state.W=W;g.state.H=H;Object.assign(g.state.player,{x:W/2,y:H/2,hp:75,maxHp:75});g.state.enemies=[];g.state.walls=[];g.state.stats.ink=g.state.stats.maxInk=160;g.state.stats.rockDamage=0;const e=g.api.spawnEnemy(true,80,220),s=g.api.bossBrain(e).wobble;s.gap=999;return {g,e,s,env,rig:env.sandbox.DoodleDefender.WobblechompRig};}
 function enterTwo(r){const {g,e,s}=r;e.hp=e.maxHp*.45;g.api.updateWobbleBoss(e,.01);assert.equal(s.phase,2);g.api.updateWobbleBoss(e,1.8);return r;}
 function counter(r,kind){const {g,e,s,rig}=r;const cuts={armCuts:s.model.armCuts,legCuts:s.model.legCuts,stalkCuts:s.model.stalkCuts};s.model=Object.assign(rig.create(),cuts);s.cutCelebrate=0;s.blockStun=0;s.cutWindow=null;s.model.time=1;s.lastAttack=s.attack=kind;s.attackSerial++;s.counteredSerial=-1;s.gap=999;s.target={...g.state.player};s.punchHit=false;s.model[{punch:'punchAge',spikes:'spikeAge',beam:'beamAge'}[kind]]=0;
  if(kind==='punch'){g.state.walls=[wall([{x:(e.x+g.state.player.x)/2,y:e.y-150},{x:(e.x+g.state.player.x)/2,y:g.state.player.y+150}])];g.api.updateWobbleBoss(e,1.1);}
  else if(kind==='spikes'){assert(g.api.counterWobbleSpike({wobbleOwner:e,cutCounter:s.attackSerial}));}
  else{s.beamStart={x:g.state.player.x,y:g.state.player.y};s.beamTip={...s.beamStart};s.beamWalls=[];s.model.beamAge=.7;const a=g.api.wobbleSnapshot(e).beamOrigin,b=s.beamTip,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),p={x:(a.x+b.x)/2,y:(a.y+b.y)/2};assert(g.api.cutWobbleStroke([{x:p.x-dy/l*30,y:p.y+dx/l*30},{x:p.x+dy/l*30,y:p.y-dx/l*30}]));}
  assert(s.cutWindow&&s.blockStun>0,'earned counter opens a seam');
 }
 {
  const r=setup(),{g,e,s}=r;assert(g.api.abilityImmune(e));const hp=e.hp;e.freeze=e.stun=e.gravitySlow=99;g.api.updateWobbleBoss(e,.1);assert.equal(e.freeze,0);assert.equal(e.stun,0);assert.equal(e.gravitySlow,0);g.api.dealDamage(e,8,'fire');assert(e.hp<hp,'direct elemental damage works without status control');
  g.api.updateBossDamageBudgets(2);const w=wall([{x:e.x,y:e.y-60},{x:e.x,y:e.y+60}]);g.state.walls=[w];const before=e.hp;g.api.shredWobbleWalls(e);assert(!g.state.walls.includes(w)&&w.hp===0);assert(e.hp<before,'wall impact hurts phase one');assert.equal(s.model.armCuts+s.model.legCuts+s.model.stalkCuts,0);e.hp=e.maxHp*.45;g.api.updateWobbleBoss(e,.01);assert.equal(s.phase,2,'damage advances without a single cut');assert.equal(g.api.wobbleInfiniteInk(),false,'infinite ink is not automatic');assert.equal(g.state.stats.ink,160);assert.equal(s.debris.length,3);
 }
 for(const feed of [false,true]){
  const r=setup(),{g,e,s,env}=r;g.state.walls=[wall([{x:40,y:560},{x:140,y:560}])];g.state.inks.fire=5;s.lastAttack='punch';s.gap=0;const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>.999;g.api.updateWobbleBoss(e,.01);env.sandbox.Math.random=random;assert.equal(s.attack,'gulp');const snack=s.gulpWall;
  if(!feed)g.api.eraseWallPath({x:40,y:560},{x:140,y:560},20);g.api.updateBossDamageBudgets(2);const hp=e.hp;g.api.updateWobbleBoss(e,1.3);assert(!g.state.walls.includes(snack));assert(s.cutWindow&&s.blockStun>0,'gulp opens a chosen limb');assert(e.hp<hp);assert.equal(g.state.enemyShots.length,feed?3:0,'erasing the snack denies the burp');assert.equal(s.model.teethAge,null,'gulp recovery cannot leak a tooth volley');assert.equal(g.state.enemies.filter(n=>n.bossOwner===e).length,0);
 }
 for(const [kind,part] of [['punch','arm'],['spikes','leg'],['beam','stalk']]){
  const r=setup(),{g,e,s}=r;counter(r,kind);const j=g.api.wobbleSnapshot(e).parts[part].joint,c={x:(j.a.x+j.b.x)/2,y:(j.a.y+j.b.y)/2},points=[{x:c.x-30,y:c.y-10},{x:c.x+30,y:c.y+10}];
  g.state.stats.ink=0;g.api.createWall(points);assert.equal(s.model[part+'Cuts'],0,'unpaid gesture cannot detach');g.state.stats.ink=160;g.api.createWall(points);assert.equal(s.model[part+'Cuts'],1,'first paid slash loosens');assert.equal(s.debris.length,0);assert(!g.api.cutWobbleStroke(points),'one cut per counter');counter(r,kind);const j2=g.api.wobbleSnapshot(e).parts[part].joint,c2={x:(j2.a.x+j2.b.x)/2,y:(j2.a.y+j2.b.y)/2};g.api.createWall([{x:c2.x-30,y:c2.y-10},{x:c2.x+30,y:c2.y+10}]);assert.equal(s.model[part+'Cuts'],2,'second separately earned slash detaches');assert.equal(s.debris.length,1);assert(!g.api.cutWobbleStroke(points));assert.equal(s.phase,1,'detachment is optional help, not a phase checklist');
 }
 {
  const r=setup(),{g,e,s}=r;for(const [kind,part] of [['punch','arm'],['punch','arm'],['spikes','leg'],['spikes','leg'],['beam','stalk']]){
   if(s.phase===2)break;counter(r,kind);if(s.phase===2)break;const j=g.api.wobbleSnapshot(e).parts[part].joint,c={x:(j.a.x+j.b.x)/2,y:(j.a.y+j.b.y)/2};g.api.createWall([{x:c.x-30,y:c.y-10},{x:c.x+30,y:c.y+10}]);
  }assert.equal(g.state.stats.rockDamage,0);assert.equal(s.phase,2,'drawing counters reach phase two with zero paper-ball DPS');
 }
 {
  const r=setup(),{g,e,s,env}=r;const kinds=new Set();for(let i=0;i<25;i++){s.attack=null;s.model.punchAge=s.model.spikeAge=s.model.beamAge=s.model.teethAge=s.model.rollAge=null;s.gap=0;g.api.updateWobbleBoss(e,.01);if(s.attack)kinds.add(s.attack);}assert(kinds.size>=3,'varied attack selection');
  s.model.armCuts=2;s.lastAttack='teeth';env.sandbox.Math.random=()=>0;s.attack=null;s.model.punchAge=s.model.spikeAge=s.model.beamAge=s.model.teethAge=s.model.rollAge=null;s.gap=0;g.api.updateWobbleBoss(e,.01);assert.notEqual(s.attack,'punch','missing limb removes its attack');
 }
 {
  const r=enterTwo(setup()),{g,e,s}=r;s.laserDisabled=true;s.rollState='charge';s.chargeLeft=3;s.hitCooldown=0;s.rollVX=0;s.rollVY=310;e.x=100;e.y=250;g.state.walls=[wall([{x:50,y:340},{x:200,y:340}]),wall([{x:500,y:600},{x:650,y:600}])];const w=g.state.walls[0];const preview=g.api.wobbleRailPreview(e,w.pts);assert(preview&&preview.at(-1).y<preview[1].y,'reflection preview predicts the rebound, not a rail');g.api.updateWobbleBoss(e,.3);assert(!g.state.walls.includes(w));assert(s.rollVY<0&&s.bounces===1);assert.equal(s.phaseHits,0);assert(!s.rail);
  const vertical=wall([{x:180,y:200},{x:180,y:350}]);e.x=100;e.y=270;s.rollVX=310;s.rollVY=0;s.rollState='charge';s.chargeLeft=2;g.state.walls=[vertical];g.api.updateWobbleBoss(e,.3);assert(s.rollVX<0&&!g.state.walls.includes(vertical));
 }
 {
  const r=enterTwo(setup()),{g,e,s}=r;g.state.stats.ink=30;g.api.createWall([{x:100,y:280},{x:180,y:300}]);assert(g.state.stats.ink<30,'pre-well course spends ink');assert(g.state.walls[0].wobbleBumper);
  const q=s.targets.well;e.x=q.x-75;e.y=q.y;s.rollVX=310;s.rollVY=0;s.rollState='charge';s.chargeLeft=2;g.state.walls=[];g.api.updateWobbleBoss(e,.2);assert(s.inkUnlocked&&g.api.wobbleInfiniteInk());g.state.stats.ink=0;g.api.createWall([{x:100,y:280},{x:180,y:300}]);assert.equal(g.state.stats.ink,g.state.stats.maxInk);assert.equal(g.state.walls[0].eraseInk,0);assert.equal(s.phaseHits,0,'well is utility, not boss damage');
 }
 {
  const r=enterTwo(setup()),{g,e,s}=r;const eye=s.targets.laser;s.laserClock=0;s.rollState='windup';s.windup=10;g.state.walls=[wall([{x:eye.x-90,y:eye.y+35},{x:eye.x-90,y:eye.y+130}])];g.api.updateWobbleBoss(e,.8);assert(s.groundBeam&&s.groundBeam.age>=.65);assert.equal(g.state.walls.length,0,'visible grounded laser erases crossed cover');
  e.x=eye.x-75;e.y=eye.y;s.rollVX=310;s.rollVY=0;s.rollState='charge';s.chargeLeft=2;g.api.updateWobbleBoss(e,.2);assert(s.laserDisabled&&!s.groundBeam);assert.equal(s.phaseHits,0);const w=wall([{x:eye.x-90,y:eye.y+35},{x:eye.x-90,y:eye.y+130}]);g.state.walls=[w];s.rollState='windup';s.windup=20;g.api.updateWobbleBoss(e,5);assert(g.state.walls.includes(w),'knocked-out eye stays off');
 }
 {
  const r=enterTwo(setup()),{g,e,s}=r;s.laserDisabled=true;e.x=g.state.player.x;e.y=g.state.player.y-95;s.rollVX=0;s.rollVY=310;s.rollState='charge';s.chargeLeft=2;const hp=g.state.player.hp;g.api.updateWobbleBoss(e,.3);assert(g.state.player.hp<hp&&s.fly,'missed course damages Stevie then flies away');
 }
 {
  const r=enterTwo(setup()),{g,e,s,env}=r;s.laserDisabled=true;
  for(let i=1;i<=4;i++){const q=s.targets.spikes;e.x=q.x-85;e.y=q.y;s.rollVX=310;s.rollVY=0;s.hitCooldown=0;s.rollState='charge';s.chargeLeft=2;g.api.updateWobbleBoss(e,.2);assert.equal(s.phaseHits,i,'every spike collision counts without a hidden rail condition');assert(s.fly,'dramatic flight after spike hit');assert(g.state.enemies.includes(e),'landing completes before reward');g.api.updateWobbleBoss(e,2.1);}
  assert(!g.state.enemies.includes(e));assert.equal(g.state.kills,1);assert(g.api.wobbleRepairActive());env.node('wobbleRepairHelp').onclick();env.node('wobbleRepairPreset').onclick();env.node('wobbleRepairAttach').onclick();for(let i=0;i<9;i++)g.api.update(.1);assert.equal(g.api.wobbleRepairSnapshot().stage,'walk');assert.equal(g.api.wobbleRepairSnapshot().attached,1,'only one optional drawing');g.state.paused=true;const repair=JSON.stringify(g.api.wobbleRepairSnapshot());g.api.update(1);assert.equal(JSON.stringify(g.api.wobbleRepairSnapshot()),repair);g.state.paused=false;for(let i=0;i<31;i++)g.api.update(.1);assert(!g.api.wobbleRepairActive()&&g.state.betweenWaves);assert.equal(g.state.kills,1);
 }
 for(const [W,H] of [[800,700],[393,800],[360,640],[851,320]]){
  const r=enterTwo(setup(W,H)),{g,e,s}=r;assert(s.windup>=2.5);if(W<500)assert(Math.abs(e.y-g.state.player.y)>100,'phone charge starts at an end');e.freeze=e.stun=e.gravitySlow=99;g.api.updateWobbleBoss(e,.1);assert.equal(e.freeze+e.stun+e.gravitySlow,0);const hp=e.hp;g.api.dealDamage(e,99999,'physical');assert.equal(e.hp,hp,'phase two requires spike damage');const snap=JSON.stringify(g.api.wobbleSnapshot(e));g.api.draw();assert.equal(JSON.stringify(g.api.wobbleSnapshot(e)),snap,'rendering is pure');g.state.paused=true;g.api.update(.5);assert.equal(JSON.stringify(g.api.wobbleSnapshot(e)),snap);g.state.paused=false;const x=s.targets.spikes.x;g.api.moveWobbleFields(8,5);assert.equal(s.targets.spikes.x,x+8);g.api.moveWobbleFields(-8,-5);g.api.returnToMenu();assert(!g.api.wobbleInfiniteInk());
 }
 console.log('PASS: damage-based handoff, two separately earned cuts and zero-paper-DPS counter progression, randomized missing-part attacks, real wall-angle ricochets, spent/unlocked ink, laser collision and shutdown, dangerous missed charges, four dramatic spike hits, one optional connected arm, pause/render/resize and single victory.');
};
if(require.main===module){const fs=require('fs'),source=fs.readFileSync(require('path').join(__dirname,'validate.cjs'),'utf8'),harness=source.slice(0,source.indexOf('// Retain explicit regression'));module.exports(new Function('require','__dirname',harness+'\nreturn load;')(require,__dirname));}
