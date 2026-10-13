const assert=require('assert');
module.exports=function(load){
 const env=load(true,{images:true}),g=env.sandbox.testGame,a=g.api,s=g.state;a.resetRun();s.wave=11;s.enemies=[];s.spawnTimer=999;s.player.rockCd=999;
 for(const name of ['catapulter','catapult'])for(let i=0;i<8;i++)assert.equal(a.doodleArtwork(name+'-frame-'+i).naturalWidth,160,'cached custom atlas pose');
 const e=a.spawnEnemy(false,90,180,'catapulter');a.updateCatapulter(e,0);const walk=[];for(let i=0;i<4;i++){walk.push(a.catapulterFrame(e));a.updateCatapulter(e,8/e.speed);}assert.equal(new Set(walk).size,4,'four real travel-driven walk poses');
 const frame=a.catapulterFrame(e),distance=e.catapult.walkDistance;e.freeze=1;a.updateCatapulter(e,.3);assert.equal(a.catapulterFrame(e),frame);assert.equal(e.catapult.walkDistance,distance);e.freeze=0;
 e.x=e.catapult.goal.x;e.y=e.catapult.goal.y;a.updateCatapulter(e,0);assert.equal(a.catapulterFrame(e),'catapulter-frame-4');assert.equal(a.catapultFrame(e),0);
 a.updateCatapulter(e,.625);assert.equal(a.catapulterFrame(e),'catapulter-frame-5');assert.equal(a.catapultFrame(e),1);a.updateCatapulter(e,.625);assert.equal(a.catapulterFrame(e),'catapulter-frame-6');assert.equal(a.catapultFrame(e),2);a.updateCatapulter(e,1.25);assert.equal(a.catapultFrame(e),3);
 const n=a.spawnEnemy(false,e.x+40,e.y,'grunt');a.updateCatapulter(e,.5);assert.equal(a.catapultFrame(e),3);a.heldByCatapulter(n);const high=n.y;a.updateCatapulter(e,.75);a.heldByCatapulter(n);assert(n.y>high,'passenger follows spoon as it is pulled down');assert.equal(a.catapultFrame(e),4);
 a.updateCatapulter(e,.5);assert.equal(a.catapultFrame(e),5);const spoon=a.catapultSpoonPoint(e,true);assert.equal(n.flight.startX,spoon.x);assert.equal(n.flight.startY,spoon.y,'flight starts at snapping spoon');a.updateCatapulter(e,.15);assert.equal(a.catapultFrame(e),6);a.updateCatapulter(e,.2);assert.equal(a.catapultFrame(e),7);
 s.paused=true;const paused=JSON.stringify(s);a.update(.2);assert.equal(JSON.stringify(s),paused);s.paused=false;
 const state=JSON.stringify(s),random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('Animation draw consumed RNG');};a.draw();a.draw();env.sandbox.Math.random=random;assert.equal(JSON.stringify(s),state,'custom pose rendering does not change combat');a.updateCatapulter(e,.3);assert.equal(a.catapultFrame(e),3,'recoil settles back into ready pose');
 const r=load(true,{images:true,reduced:true}).sandbox.testGame;r.api.resetRun();r.state.wave=11;r.state.enemies=[];const still=r.api.spawnEnemy(false,90,180,'catapulter');r.api.updateCatapulter(still,0);assert.equal(r.api.catapulterFrame(still),null);assert.equal(r.api.catapultFrame(still),3);assert.equal(r.api.catapulterPose(still).angle,0);
 console.log('PASS: eight custom poses per atlas, travel-driven walking, freeze, staged assembly, synced spoon/passenger release, snap/follow-through/recoil, pause, pure rendering and reduced motion.');
};
