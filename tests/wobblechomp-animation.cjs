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
