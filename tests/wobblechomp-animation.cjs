const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const sandbox={DoodleDefender:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/wobblechomp-animation.js'),'utf8'),sandbox);
const rig=sandbox.DoodleDefender.WobblechompRig,model=rig.create();
const cross=()=>{const {a,b}=rig.pose(model).joint,x=(a.x+b.x)/2,y=(a.y+b.y)/2;return [{x,y:y-70},{x,y:y+70}]};
const snapshot=()=>JSON.stringify(model);
assert.equal(rig.cutStroke(model,[{x:100,y:100},{x:100,y:200}]),false);
assert.equal(rig.cutStroke(model,[cross()[0],cross()[0]]),false);
assert.ok(rig.punch(model));assert.equal(rig.punch(model),false);
const rest=model.wrist.x;for(let i=0;i<28;i++)rig.update(model,.05);assert.ok(model.wrist.x<rest-100,'punch reaches away from the body');
const gesture=cross();gesture.push(gesture[0],gesture[1]);assert.ok(rig.cutStroke(model,gesture));assert.equal(model.armCuts,1,'one scribbling gesture counts only once');assert.equal(model.punchAge,null,'cut interrupts the punch');
for(let i=0;i<40;i++)rig.update(model,.05);assert.ok(model.wrist.y>470,'first cut leaves a dangling arm');assert.equal(model.debris,null);
assert.ok(rig.punch(model),'damaged arm can still struggle through a punch');for(let i=0;i<22;i++)rig.update(model,.05);
assert.ok(rig.cutStroke(model,cross()));assert.equal(model.armCuts,2);assert.ok(model.debris);assert.equal(rig.punch(model),false);assert.equal(rig.cutStroke(model,cross()),false);
for(let i=0;i<300;i++)rig.update(model,1/60);assert.ok(model.debris.settled,'detached fist falls, bounces and settles');assert.ok(model.debris.x>=95&&model.debris.x<=890);assert.equal(model.debris.y,590);
const ctx=new Proxy({},{get:()=>()=>{}}),image={naturalWidth:1536,naturalHeight:1024},before=snapshot();rig.draw(ctx,image,model);rig.draw(ctx,image,model,{reduced:true});assert.equal(snapshot(),before,'rendering never advances animation');
assert.equal(rig.pose(model,true).bob,0);assert.equal(rig.pose(model,true).bodyAngle,0);assert.equal(rig.create().armCuts,0);
console.log('PASS: distant punch, missed/tap strokes, one cut per gesture, persistent dangling arm, interrupted punch, second-cut debris physics, settled bounds, pure drawing, reset and reduced motion.');
// Every detachment order reuses the same rig, with no complete-body combinations.
const orders=[['arm','leg','stalk'],['arm','stalk','leg'],['leg','arm','stalk'],['leg','stalk','arm'],['stalk','arm','leg'],['stalk','leg','arm']];
const key={arm:'armCuts',leg:'legCuts',stalk:'stalkCuts'};
function limbCross(m,name,reduced=false){const {a,b}=rig.pose(m,reduced).parts[name].joint,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),x=(a.x+b.x)/2,y=(a.y+b.y)/2;return [{x:x-dy/l*60,y:y+dx/l*60},{x:x+dy/l*60,y:y-dx/l*60}]}
for(const order of orders){
 const m=rig.create();for(let i=0;i<20;i++)rig.update(m,.05);
 for(const name of order){
  assert.ok(rig.cutStroke(m,limbCross(m,name)));assert.equal(m[key[name]],1);assert.equal(m.lastCut,name);
  for(let i=0;i<20;i++)rig.update(m,.05);
  assert.ok(rig.cutStroke(m,limbCross(m,name)));assert.equal(m[key[name]],2);
  const state=JSON.stringify(m);rig.draw(ctx,image,m);rig.draw(ctx,image,m,{reduced:true});assert.equal(JSON.stringify(m),state);
 }
 for(let i=0;i<300;i++)rig.update(m,1/60);
 assert.equal(m.fallenParts.length,3);assert.ok(m.fallenParts.every(d=>d.settled&&d.y===590&&d.x>=95&&d.x<=890));
 assert.equal(rig.punch(m),false);assert.equal(rig.shootSpikes(m),false);assert.equal(rig.eyeBeam(m),false);
}
const spiker=rig.create();assert.ok(rig.shootSpikes(spiker));assert.equal(rig.eyeBeam(spiker),false,'attack poses cannot overlap');
for(let i=0;i<18;i++)rig.update(spiker,.05);assert.equal(spiker.spikes.length,0,'wind-up precedes projectiles');
rig.update(spiker,.1);assert.equal(spiker.spikes.length,5,'one launch creates the fan');
rig.update(spiker,.05);assert.equal(spiker.spikes.length,5,'fan launches once');
assert.ok(rig.cutStroke(spiker,limbCross(spiker,'leg')));assert.equal(spiker.spikeAge,null,'leg cut interrupts the kick');
const beam=rig.create();assert.ok(rig.eyeBeam(beam));for(let i=0;i<20;i++)rig.update(beam,.05);
assert.ok(rig.cutStroke(beam,limbCross(beam,'stalk')));assert.equal(beam.beamAge,null,'stalk cut interrupts the beam');
assert.ok(rig.eyeBeam(beam),'dangling stalk can still attack');assert.ok(rig.cutStroke(beam,limbCross(beam,'stalk')));assert.equal(rig.eyeBeam(beam),false);
const single=rig.create(),sweep=[...limbCross(single,'arm'),...limbCross(single,'stalk'),...limbCross(single,'leg')];
assert.ok(rig.cutStroke(single,sweep));assert.equal(single.armCuts+single.legCuts+single.stalkCuts,1,'a long scribble never cuts multiple parts');
assert.equal(rig.cutStroke(single,[{x:NaN,y:0},{x:0,y:0}]),false);
console.log('PASS: all six missing-part orders, three settled pieces, attack exclusivity, spike warning/fan, interrupted kick/beam, dangling stalk attack, and one joint per gesture.');
const toothArt={naturalWidth:1024,naturalHeight:1024},mouth=rig.create();
assert.ok(rig.shakeTeeth(mouth));assert.equal(rig.punch(mouth),false,'teeth shake owns the attack pose');
for(let i=0;i<8;i++)rig.update(mouth,.1);assert.equal(mouth.teeth.length,0);assert.equal(mouth.teethPlan.length,8);
rig.update(mouth,.1);assert.equal(mouth.teeth.length,1,'first tooth visibly launches before the pack');assert.equal(rig.toothPose(mouth.teeth[0]).phase,'flying');
for(let i=0;i<5;i++)rig.update(mouth,.1);assert.equal(mouth.teeth.length,8);assert.equal(new Set(mouth.teeth.map(t=>t.target.x)).size,8);
const first=mouth.teeth[0];while(first.age<first.flight+.1)rig.update(mouth,.01);
assert.equal(rig.toothPose(first).phase,'bouncing');assert.ok(rig.toothPose(first).y<first.target.y,'landing has a visible bounce');
const landedX=first.x;while(first.age<first.flight+.5)rig.update(mouth,.01);assert.equal(first.x,landedX,'landing pause precedes movement');
while(first.age<first.flight+.7)rig.update(mouth,.01);assert.equal(rig.toothPose(first).phase,'scurrying');assert.notEqual(first.x,landedX);
first.x=70;first.vx=-60;rig.update(mouth,.1);assert.ok(first.vx>0,'minion turns around at the edge');
assert.equal(rig.toothPose(first,true).angle,0);assert.equal(rig.toothPose(first,true).y,first.y,'reduced motion suppresses decorative hopping');
let beforeTeeth=JSON.stringify(mouth);rig.draw(ctx,image,mouth,{toothImage:toothArt});rig.draw(ctx,image,mouth,{toothImage:toothArt,reduced:true});assert.equal(JSON.stringify(mouth),beforeTeeth,'tooth rendering is pure');
const amounts=[];for(let batch=0;batch<6;batch++){
 while(rig.busy(mouth))rig.update(mouth,.1);assert.ok(rig.shakeTeeth(mouth));amounts.push(mouth.teethPlan.length);
 for(let i=0;i<27;i++){rig.update(mouth,.1);assert.ok(mouth.teeth.length<=20,'repeated packs stay bounded')}
}
assert.deepEqual(amounts,[9,10,6,7,8,9]);for(let i=0;i<100;i++)rig.update(mouth,.1);assert.equal(mouth.teeth.length,0,'preview minions fade and expire');
const toothlessLimbs=rig.create();for(const name of ['arm','leg','stalk']){rig.cutStroke(toothlessLimbs,limbCross(toothlessLimbs,name));rig.cutStroke(toothlessLimbs,limbCross(toothlessLimbs,name));}
assert.ok(rig.shakeTeeth(toothlessLimbs),'mouth attack works with every appendage missing');
console.log('PASS: teeth warning, staggered 6–10 launches, flight/bounce/landing pause/scurry, turning, pure drawing, reduced motion, bounded repeats/expiry and missing-part compatibility.');
for(let mask=0;mask<8;mask++){
 const rolling=rig.create();for(const [i,name] of ['arm','leg','stalk'].entries())if(mask&(1<<i)){rig.cutStroke(rolling,limbCross(rolling,name));rig.cutStroke(rolling,limbCross(rolling,name));}
 const cuts=[rolling.armCuts,rolling.legCuts,rolling.stalkCuts];assert.ok(rig.tuckAndRoll(rolling));assert.equal(rig.shakeTeeth(rolling),false);
 const phases=new Set();const seenSpikes=new Set();let sawTravel=false,sawTurn=false;
 for(let step=0;step<95;step++){
  rig.update(rolling,.05);const r=rig.rollPose(rolling);
  if(r){phases.add(r.phase);if(r.phase==='rolling'){sawTravel ||= Math.abs(r.x-570)>200;sawTurn ||= r.direction!==rolling.rollDirection}
   assert.ok(r.x>=160&&r.x<=790);assert.ok(r.y>=390&&r.y<=505);
   assert.equal(rig.cutStroke(rolling,limbCross(rolling,'arm')),false,'tucked joints are unavailable');
   assert.equal(rig.rollPose(rolling,true).angle,0);
   const tiles=[],record=new Proxy({},{get:(_,key)=>key==='drawImage'?(img,...args)=>tiles.push(args):()=>{}}),before=JSON.stringify(rolling);
   rig.draw(record,image,rolling,{toothImage:toothArt});rig.draw(ctx,image,rolling,{toothImage:toothArt,reduced:true});assert.equal(JSON.stringify(rolling),before);
   for(const [i,name] of ['arm','leg','stalk'].entries())if(mask&(1<<i)){
    const col={arm:1,leg:2,stalk:0}[name],row=name==='stalk'?1:0;
    // Detached pieces still render on the page; attached layer count must not grow.
    assert.equal(tiles.filter(a=>a.length===8&&a[0]===col*512&&a[1]===row*512).length,1,'missing part stays a single fallen piece');
   }
  }
  for(const spike of rolling.spikes)seenSpikes.add(spike);
  assert.deepEqual([rolling.armCuts,rolling.legCuts,rolling.stalkCuts],cuts);
 }
 assert.ok(sawTravel&&sawTurn);assert.deepEqual([...phases].sort(),['braking','rolling','tucking','unfolding','winding']);
 assert.equal(rolling.rollAge,null);assert.equal(rolling.rollDrops,3);assert.equal(rolling.teeth.length,3);assert.equal(seenSpikes.size,mask&2?0:9);
 const previousDirection=rolling.rollDirection;assert.ok(rig.tuckAndRoll(rolling));assert.equal(rolling.rollDirection,-previousDirection,'repeats alternate the first direction');
}
const damaged=rig.create();for(const name of ['arm','leg','stalk'])rig.cutStroke(damaged,limbCross(damaged,name));assert.ok(rig.tuckAndRoll(damaged));for(let i=0;i<46;i++)rig.update(damaged,.1);assert.deepEqual([damaged.armCuts,damaged.legCuts,damaged.stalkCuts],[1,1,1],'dangling state survives roll');
console.log('PASS: all eight roll part combinations, tuck/wind/travel/turn/brake/unfold, hidden-joint rejection, missing-leg spike suppression, three tooth drops, pure/reduced drawing, alternating repeats and persistent dangling parts.');

// Gait advances with actual movement, including the missing-leg hop.
const walker=rig.create();walker.time=1;rig.stepWalk(walker,11,.1,-1);const gait=rig.pose(walker).walk;assert(gait.blend>0&&gait.lift<0&&gait.sx>1);assert.equal(walker.walkFacing,-1);const phase=walker.walkPhase;rig.stepWalk(walker,0,.1);assert.equal(walker.walkPhase,phase,'blocked movement cannot advance the stride');const hop=rig.create();hop.time=1;hop.legCuts=2;rig.stepWalk(hop,11,.1,-1);assert(Math.abs(rig.pose(hop).walk.lift)>Math.abs(gait.lift));assert.equal(rig.pose(hop,true).walk.blend,0);const saved=JSON.stringify(walker);rig.draw(ctx,image,walker);assert.equal(JSON.stringify(walker),saved);for(let i=0;i<20;i++)rig.update(walker,.1);assert(rig.pose(walker).walk.blend<.001,'stopping settles the gait');
console.log('PASS: distance-driven stomp, blocked movement, missing-leg hop, reduced motion and pure walking render.');
