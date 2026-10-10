const assert=require('assert');
module.exports=function(load){
 const wall=pts=>({pts,hp:10000,maxHp:10000,thick:8,life:100,maxLife:100});
 function setup(){const env=load(true),g=env.sandbox.testGame;g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.wave=10;g.api.startWave();g.state.W=800;g.state.H=700;Object.assign(g.state.player,{x:400,y:350,hp:75,maxHp:75});g.state.enemies=[];g.state.walls=[];g.state.stats.rockDamage=0;g.state.stats.maxInk=g.state.stats.ink=1000;const e=g.api.spawnEnemy(true,100,220),s=g.api.bossBrain(e).wobble;s.gap=999;return {g,e,s,env};}
 {
  const {g,e,s}=setup();g.state.stats.explode=true;g.state.inks.blast=10;g.state.inks.fire=10;g.state.inks.vampire=10;g.state.stats.refund=10;g.state.stats.ink=20;g.state.player.hp=40;
  const first=wall([{x:140,y:160},{x:140,y:280}]),second=wall([{x:175,y:160},{x:175,y:280}]),untouched=wall([{x:650,y:160},{x:650,y:280}]);g.state.walls=[first,second,untouched];const hp=e.hp;
  assert(g.api.moveEnemySafely(e,100,0));assert.deepEqual(g.state.walls,[untouched]);assert.equal(first.hp,0);assert.equal(second.hp,0);assert.equal(e.hp,hp);assert.equal(e.freeze,0);assert.equal(e.stun,0);assert.equal(g.state.stats.ink,20);assert.equal(g.state.player.hp,40);
  // Stationary contact also shreds, so a fresh stroke cannot encase a stunned boss.
  const touching=wall([{x:e.x,y:e.y-60},{x:e.x,y:e.y+60}]);g.state.walls=[touching];s.blockStun=1;g.api.updateWobbleBoss(e,.01);assert(!g.state.walls.includes(touching));
 }
 {
  const {g,e,s}=setup();s.gap=0;s.turn=0;g.api.updateWobbleBoss(e,.01);g.state.walls=[wall([{x:250,y:100},{x:250,y:500}])];g.api.updateWobbleBoss(e,.9);
  assert.equal(s.model.cutFocus,'arm');assert(g.api.abilityImmune(e),'earned cut windows cannot be cancelled by the player’s own elemental notes');const snap=g.api.wobbleSnapshot(e),j=snap.parts.arm.joint;assert(Math.hypot(j.a.x-j.b.x,j.a.y-j.b.y)>20,'longer seam is actually hittable');assert(snap.cutRadius>=27);
  const middle={x:(j.a.x+j.b.x)/2,y:(j.a.y+j.b.y)/2};g.api.createWall([{x:middle.x-22,y:middle.y},{x:middle.x+22,y:middle.y}]);assert.equal(s.model.armCuts,1);assert.equal(s.model.cutFocus,null);assert(s.cutCelebrate>0);const p={x:e.x,y:e.y};g.api.updateWobbleBoss(e,.3);assert.deepEqual({x:e.x,y:e.y},p,'rip has a real breathing beat');
 }
 {
  const {g,e,s}=setup();s.gap=0;s.turn=0;g.api.updateWobbleBoss(e,.01);g.state.walls=[wall([{x:250,y:100},{x:250,y:500}])];g.api.updateWobbleBoss(e,.9);
  const j=g.api.wobbleSnapshot(e).parts.arm.joint,m={x:(j.a.x+j.b.x)/2,y:(j.a.y+j.b.y)/2};
  const pts=[{x:m.x-4,y:m.y},{x:m.x+4,y:m.y}];g.api.updateLiveWall(pts);const live=g.state.walls.at(-1);g.api.updateWobbleBoss(e,.05);assert(!g.state.walls.includes(live),'body shreds the partial cut during real-time drawing');
  pts.push({x:m.x+25,y:m.y});assert(g.api.updateLiveWall(pts),'paid gesture keeps growing after its wall is shredded');g.api.finishLiveWall();assert.equal(s.model.armCuts,1,'released paid gesture still earns its cut');assert(!g.state.walls.includes(live),'cut metadata never resurrects a destroyed wall');
 }
 function phaseTwo(){const r=setup(),{g,e,s,env}=r;const rig=env.sandbox.DoodleDefender.WobblechompRig;s.model.armCuts=s.model.legCuts=s.model.stalkCuts=2;s.debris=['arm','leg','stalk'].map((part,i)=>({part,x:200+i*150,y:580,landX:200+i*150,floor:580,startX:200+i*150,startY:580,settled:true,angle:0,facing:1,enlarge:1.8}));
  g.state.walls=[wall([{x:20,y:200},{x:200,y:200}])];g.state.projectiles=[{x:0,y:0}];const two=env.sandbox.DoodleDefender.WobblePhaseTwo(g,{state:()=>s,rig,spawnTooth:()=>{throw Error('No unrelated adds in pinball')},topMargin:()=>157});two.begin(e);assert.equal(g.state.walls.length,0);assert.equal(g.state.projectiles.length,0);g.api.updateWobbleBoss(e,3);s.windup=s.hitPause=0;s.hitCooldown=0;return r;}
 {
  const {g,e,s}=phaseTwo();g.state.stats.doubleLine=g.state.stats.tripleLine=true;g.state.stats.doodleStitch=true;g.state.synergies.add('THE BLACK HOLE');g.state.synergies.add('TESLA CAGE');g.state.inks.fire=5;g.state.inks.blast=5;g.state.inks.frost=5;
  g.api.createWall([{x:70,y:340},{x:170,y:340},{x:245,y:365}]);assert.equal(g.state.walls.length,1,'one steering stroke despite multiple-line upgrades');assert(g.state.walls[0].wobbleBumper);assert.equal(g.state.walls[0].eraseInk,0);
  const rail=g.state.walls[0];Object.assign(e,{x:100,y:280});s.rollVX=0;s.rollVY=175;s.hitCooldown=0;s.armedFor=0;const before=JSON.stringify(g.state),preview=g.api.wobbleRailPreview(e,rail.pts);assert(preview.at(-1).x===245);assert.equal(JSON.stringify(g.state),before,'preview cannot consume or mutate a rail');
  for(let i=0;i<55;i++)g.api.updateWobbleBoss(e,.01);assert(s.rail);assert(e.x>100);assert(rail.pts[0].x>100,'drawn ink is consumed behind the body');assert.equal(g.state.enemies.filter(n=>n.bossOwner===e).length,0);
  const position={x:e.x,y:e.y};e.freeze=e.stun=e.gravitySlow=99;g.api.update(.01);assert.equal(e.freeze,0);assert.equal(e.stun,0);assert.equal(e.gravitySlow,0);assert(e.x!==position.x||e.y!==position.y,'ink abilities cannot stall pinball');assert.equal(g.state.projectiles.length,0);
  const state=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),state,'animated targets and rail preview render purely');g.state.paused=true;const paused=JSON.stringify(g.state);g.api.update(.5);assert.equal(JSON.stringify(g.state),paused);
 }
 {
  const {g,e,s}=phaseTwo();g.state.stats.ink=0;Object.assign(e,{x:100,y:280});s.rollVX=0;s.rollVY=175;
  const draft=g.api.updateLiveWall([{x:70,y:340},{x:220,y:340}]);assert(draft);const rail=g.state.walls[0];assert(rail.wobbleDraft);g.api.updateWobbleBoss(e,.2);assert(!s.rail&&g.state.walls.includes(rail),'unfinished curves remain ghost previews');g.api.finishLiveWall();assert.equal(rail.wobbleDraft,false);g.api.updateWobbleBoss(e,.2);assert(s.rail,'released curve catches');
 }
 {
  const {g,e,env}=setup();g.api.beginWobbleRepair(e);env.node('wobbleRepairHelp').onclick();let snap=g.api.wobbleRepairSnapshot();assert.deepEqual(snap.anchor,snap.roots[0]);const model=g.api.bossBrain(e).wobble.model;
  for(let i=0;i<3;i++){snap=g.api.wobbleRepairSnapshot();assert.equal(snap.index,i);assert.deepEqual(snap.anchor,snap.roots[i]);env.node('wobbleRepairPreset').onclick();snap=g.api.wobbleRepairSnapshot();assert.deepEqual(snap.strokes[0][0],snap.anchor);const frozen=JSON.stringify(snap.roots);g.api.update(.1);assert.equal(JSON.stringify(g.api.wobbleRepairSnapshot().roots),frozen,'puppet is steady while drawing');env.node('wobbleRepairAttach').onclick();for(let k=0;k<9;k++)g.api.update(.1);}
  snap=g.api.wobbleRepairSnapshot();assert.equal(snap.stage,'walk');assert.equal(snap.attached,3);for(let i=0;i<3;i++)assert.deepEqual(snap.drawings[i][0][0],snap.origins[i],'player outline stays rooted without mirroring or rescaling');const saved=JSON.stringify(g.state);g.state.paused=true;const paused=JSON.stringify(g.api.wobbleRepairSnapshot());g.api.update(1);assert.equal(JSON.stringify(g.api.wobbleRepairSnapshot()),paused);g.state.paused=false;assert.equal(JSON.stringify(g.state),saved);assert.equal(g.api.bossBrain(e).wobble.model,model);
 }
 console.log('PASS: silent swept/body wall shredding, long counter seams/rip reaction, clean single-rail pinball despite stacked upgrades, progressive rail consumption/preview, control immunity, ghost draft release, actual-joint repair roots and pure/paused rendering.');
};
if(require.main===module){const fs=require('fs'),source=fs.readFileSync(require('path').join(__dirname,'validate.cjs'),'utf8'),harness=source.slice(0,source.indexOf('// Retain explicit regression'));module.exports(new Function('require','__dirname',harness+'\nreturn load;')(require,__dirname));}
