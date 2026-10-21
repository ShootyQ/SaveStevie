const assert=require('assert');
module.exports=load=>{
 function setup(length,age=0){const {sandbox}=load(true),g=sandbox.testGame,a=g.api;a.setFirstLessonsEnabled(false);a.setSynergyRevealsEnabled(false);a.resetRun({skipIntro:true});g.state.spawnTimer=999;g.state.stats.rockRate=0;g.state.inks.blast=1;g.state.inks.fire=1;g.state.inks.repulsion=1;for(const s of ['Napalm Scribbles','Cannon Ink','INFERNO'])g.state.synergies.add(s);const w=a.createWall([{x:100,y:180},{x:100+length,y:180}]).base;w.blastAge=age;const e=a.spawnEnemy(false,110,180,'tank');e.hp=e.maxHp=10000;e.speed=0;return {g,a,w,e};}
 for(const [length,age,explodes] of [[49,.8,false],[50,.49,false],[50,.5,true],[100,0,false],[100,.6,true]]){const {a,w,e,g}=setup(length,age);a.damageWall(w,w.hp+1,110,180);assert.equal(g.state.walls.includes(w),false);assert.equal(e.hp<10000,explodes,`length ${length}, age ${age}`);assert.equal(a.abilityEffectsSnapshot().explosions.length>0,explodes);assert.equal(a.launchEffectsSnapshot().napalm.length>0,explodes);assert.equal(!!e.flight,explodes);}
 // The real simulation advances arming; paused time never does.
 {const {g,a,w}=setup(100);g.state.enemies=[];g.state.paused=true;a.update(.6);assert.equal(w.blastAge,0);g.state.paused=false;for(let i=0;i<5;i++)a.update(.1);assert.ok(w.blastAge>=.5);a.damageWall(w,w.hp+1,120,180);assert.equal(a.abilityEffectsSnapshot().explosions.length,1);}
 // Erasing an armed wall into short fragments cannot bypass the length check.
 {const {g,a,w,e}=setup(100,.8);a.eraseWallPath({x:150,y:160},{x:150,y:200},12);assert(g.state.walls.length>=2);for(const part of [...g.state.walls])a.damageWall(part,part.hp+1,part.pts[0].x,180);assert.equal(e.hp,10000);assert.equal(a.abilityEffectsSnapshot().explosions.length,0);}
 console.log('PASS: Blast requires 50px and 0.5s, short/fresh breaks suppress damage and all Blast synergies, pause freezes arming, and eraser fragments cannot bypass minimum length.');
};
