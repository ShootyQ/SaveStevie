const assert=require('assert'),fs=require('fs'),path=require('path');
module.exports=load=>{
 const env=load(true),g=env.sandbox.testGame,a=g.api,rig=env.sandbox.DoodleDefender.WhiteBrothersRig,ctx=env.node('brothersCanvas').getContext('2d');
 assert.equal(Object.keys(rig.durations).length,9);const asset=fs.readFileSync(path.join(__dirname,'../assets/art/white-brothers-torsos.png'));assert.equal(asset.subarray(1,4).toString(),'PNG');assert(asset.readUInt32BE(16)>asset.readUInt32BE(20),'two-column atlas');
 const records=[];env.sandbox.Math.random=()=>{throw Error('animation used combat RNG');};
 for(const kind of ['wite','glue'])for(const action of Object.keys(rig.durations)){
  const m=rig.create(kind);assert(rig.act(m,action));for(let i=0;i<9;i++)rig.update(m,.05);const pose=rig.pose(m);for(const value of Object.values(pose))if(typeof value==='number')assert(Number.isFinite(value));
  const before=JSON.stringify(m);env.calls.length=0;rig.draw(ctx,null,m);assert.equal(JSON.stringify(m),before,'drawing cannot mutate models');records.push(JSON.stringify(env.calls));
  for(const call of env.calls)for(const value of call.slice(1))if(typeof value==='number')assert(Number.isFinite(value),'finite draw coordinates');
  const quiet=JSON.stringify(rig.pose(m,true));rig.update(m,.1);assert.equal(JSON.stringify(rig.pose(m,true)),quiet,'reduced motion holds each action pose steady');
 }
 assert(new Set(records).size>=15,'actions and brothers have distinct drawings');
 const m=rig.create('wite');assert.equal(rig.act(m,'not-an-action'),false);rig.update(m,Infinity);assert.equal(m.age,0);rig.update(m,1000);assert.equal(m.age,.1,'large ticks are bounded');
 const state=JSON.stringify(g.state);a.whiteBrothersAction('attack');assert.equal(JSON.stringify(g.state),state,'studio actions do not change game state');
 console.log('PASS: custom monster atlas, both articulated models, nine distinct actions, pure RNG-free finite drawing, bounded ticks and static reduced-motion poses.');
};
