const assert=require('assert');
module.exports=load=>{
 const env=load(true),g=env.sandbox.testGame,a=g.api;a.resetRun();const e=a.spawnEnemy(false,100,200,'grunt');e.paperTunnel={phase:'travel',age:.2,exit:{x:200,y:240},rub:0};
 a.enemyMotionReduced=()=>false;const first=a.paperBumpPose(e);assert(first.r>=23&&first.r<=30);assert.equal(first.angle,Math.atan2(40,100));e.paperTunnel.age+=.2;assert.notEqual(a.paperBumpPose(e).step,first.step,'alternating paw pressure animates');
 a.enemyMotionReduced=()=>true;const quiet=JSON.stringify(a.paperBumpPose(e));e.paperTunnel.age+=1;assert.equal(JSON.stringify(a.paperBumpPose(e)),quiet,'reduced motion holds the paper shape still');
 const before=JSON.stringify(g.state);env.sandbox.Math.random=()=>{throw Error('cosmetic rendering consumed combat RNG');};a.drawPaperBump(e);a.drawPaperBump(e);assert.equal(JSON.stringify(g.state),before,'drawing never changes tunnel or combat state');
 e.paperTunnel.phase='emerge';e.paperTunnel.warning=a.paperTuning().exitWarning*.25;assert.equal(a.paperBumpPose(e).rise,.25,'paper settles as the creature emerges');
 console.log('PASS: readable bounded underground hump, directional crawl/paw movement, steady reduced motion, emergence settling and pure RNG-free rendering.');
};
