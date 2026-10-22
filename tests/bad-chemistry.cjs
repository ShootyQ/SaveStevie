const assert=require('assert');
module.exports=load=>{
 function setup(wave=1){const env=load(true,{images:true}),g=env.sandbox.testGame,a=g.api;a.setFirstLessonsEnabled(false);a.setSynergyRevealsEnabled(false);a.setWaveFinaleEnabled(false);a.resetRun({skipIntro:true});g.state.wave=wave;g.state.enemies=[];g.state.walls=[];g.state.spawnTimer=999;g.state.stats.rockRate=0;g.state.stats.wallDamage=0;g.state.inks.poison=1;g.state.inks.blast=1;g.state.synergies.add('Bad Chemistry');return {env,g,a};}
 function roll(r,values,fn){const old=r.env.sandbox.Math.random;let i=0;r.env.sandbox.Math.random=()=>values[i++]??.5;try{return fn();}finally{r.env.sandbox.Math.random=old;}}
 function monster(r,x=300,y=300){const e=r.a.spawnEnemy(false,x,y,'grunt');e.hp=e.maxHp=1000;e.poison=1;return e;}
 function burst(r,e,chance=.1,count=0){return roll(r,[chance,count],()=>r.a.burstBadChemistry(e));}
 // Mutually exclusive 3% big / 20% small outcomes, inclusive glob count range.
 for(const [chance,success,big] of [[0,true,true],[.029999,true,true],[.03,true,false],[.229999,true,false],[.23,false,false],[.99,false,false]]){
  const r=setup(),e=monster(r);assert.equal(burst(r,e,chance),success);const gs=r.a.badChemistrySnapshot().globs;assert.equal(gs.length,success?6:0);if(success)assert(gs.every(g=>g.big===big));
 }
 {const r=setup(),e=monster(r);assert(burst(r,e,.1,.999999));assert.equal(r.a.badChemistrySnapshot().globs.length,9);assert(!burst(r,e),'same monster cannot reroll during cooldown');r.a.updateBadChemistry(2);assert(burst(r,e));}
 {const r=setup(),e=monster(r);assert(!burst(r,e,.9));assert(!burst(r,e,.1),'failed reaction roll also has a cooldown');r.a.updateBadChemistry(2);assert(burst(r,e));}
 {const r=setup();for(const [wave,small,big] of [[1,5,24],[9,9,32],[17,13,40]]){assert.equal(r.a.chemistryDamage(false,wave),small);assert.equal(r.a.chemistryDamage(true,wave),big);}}
 // The real armed wall explosion emits fallout even when the source dies.
 {const r=setup(),e=monster(r);e.hp=1;const w=r.a.createWall([{x:265,y:300},{x:335,y:300}]).base;w.blastAge=.6;roll(r,[.1,0],()=>r.a.damageWall(w,w.hp,300,300));assert(e.hp<=0);assert.equal(r.a.badChemistrySnapshot().globs.length,6);assert(!r.g.state.walls.includes(w));}
 {const r=setup(),e=monster(r);const w=r.a.createWall([{x:295,y:300},{x:305,y:300}]).base;w.blastAge=.6;r.a.damageWall(w,w.hp,300,300);assert.equal(r.a.badChemistrySnapshot().globs.length,0,'tiny unarmed/nonexploding walls cannot emit chemistry');e.poison=0;assert(!burst(r,e));e.poison=1;r.g.state.synergies.delete('Bad Chemistry');assert(!burst(r,e));}
 // A full swept flight hits the first body once, respects poison immunity and
 // never hits its source, damages Stevie, or recursively emits more globs.
 for(const big of [false,true]){const r=setup(17),e=monster(r),victim=monster(r,220,230),immune=monster(r,220,230);immune.immunity='poison';victim.poison=10;
  assert(burst(r,e,big?.01:.1));const flight=r.a.badChemistrySnapshot().globs[0],before=victim.hp,source=e.hp,player=r.g.state.player.hp;
  // Deterministic .5 trajectories travel left. Place two monsters in their
  // airborne arc, with the immune one first in enemy iteration order.
  const t=.5;victim.x=immune.x=(flight.from.x+flight.to.x)/2;victim.y=immune.y=flight.from.y-Math.sin(t*Math.PI)*(big?68:54)-e.r*.7*(1-t)+victim.r*.3;r.g.state.enemies=[e,immune,victim];
  r.a.updateBadChemistry(1);assert.equal(victim.hp,before-6*r.a.chemistryDamage(big),'each of six globs damages exactly one body');assert.equal(immune.hp,1000);assert.equal(e.hp,source);assert.equal(r.g.state.player.hp,player);assert.equal(r.a.badChemistrySnapshot().globs.length,0,'hits never cause another burst');assert.equal(r.a.badChemistrySnapshot().splats.length,6);
  const after=victim.hp;r.a.updateBadChemistry(.5);assert.equal(victim.hp,after,'settled stains cause no damage');
 }
 {const r=setup(),e=monster(r);burst(r,e);const before=JSON.stringify(r.a.badChemistrySnapshot());r.g.state.paused=true;r.a.updateBadChemistry(4);assert.equal(JSON.stringify(r.a.badChemistrySnapshot()),before);r.g.state.paused=false;
  const random=r.env.sandbox.Math.random;r.env.sandbox.Math.random=()=>{throw Error('render used combat RNG');};r.a.drawChemistryGround();r.a.drawChemistryAir();r.a.drawChemistryAir();r.env.sandbox.Math.random=random;assert.equal(JSON.stringify(r.a.badChemistrySnapshot()),before,'rendering never advances physics');
  const p=r.a.badChemistrySnapshot().globs[0].position;r.a.moveBadChemistry(20,30);const q=r.a.badChemistrySnapshot().globs[0].position;assert.equal(q.x,p.x+20);assert.equal(q.y,p.y+30);r.a.startWave();assert.equal(r.a.badChemistrySnapshot().globs.length,0);assert.equal(r.a.badChemistrySnapshot().splats.length,0);
 }
 {const r=setup(),e=monster(r);for(let i=0;i<40;i++){const source=monster(r);burst(r,source,.1,.99);}assert(r.a.badChemistrySnapshot().globs.length<=180,'crowded reactions have a fixed live-projectile bound');r.a.resetRun({skipIntro:true});assert.equal(r.a.badChemistrySnapshot().globs.length,0);}
 console.log('PASS: Bad Chemistry exact 20%/3% outcomes, 6–9 globs, real armed/deadly Blast integration, failed/success cooldowns, wave damage, random swept single-body hits, poison immunity/self/Stevie guards, no recursion/stain DPS, bounded effects, pause/reset/resize and pure rendering.');
};
