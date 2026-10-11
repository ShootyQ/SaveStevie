module.exports=function(load){
 const assert=require('assert'),env=load(true,{images:true}),g=env.sandbox.testGame;
 function setup(){g.api.resetRun({skipIntro:true});g.state.wave=6;g.api.startWave({skipIntro:true});g.state.W=800;g.state.H=700;g.state.player.x=600;g.state.player.y=350;g.state.spawnTimer=9999;g.state.timeLeft=100;g.state.enemies=[];g.state.stats.wallDamage=0;return g.api.spawnEnemy(false,250,350,'tank');}
 let h=setup(),ally=g.api.spawnEnemy(false,180,350,'grunt'),outside=g.api.spawnEnemy(false,310,350,'grunt');
 assert(g.api.hasChonksShield(h));assert(g.api.chonksProtected(ally));assert(!g.api.chonksProtected(outside));
 for(const e of [h,ally]){const hp=e.hp;for(const kind of ['physical','fire','poison','electric','frost','blast','void','reflected','erase'])g.api.dealDamage(e,99999,kind);assert.equal(e.hp,hp,'shield blocks ALL damage sources');}
 const hp=outside.hp;g.api.dealDamage(outside,1,'physical');assert.equal(outside.hp,hp-1);
 h.freeze=h.stun=2;ally.freeze=ally.stun=2;h.burn=ally.poison=3;g.api.update(.01);assert.equal(h.freeze,0);assert.equal(ally.freeze,0);assert.equal(h.burn,0);assert.equal(ally.poison,0);
 g.api.updateChonksShield(.01);const before={x:ally.x,y:ally.y};assert(g.api.updateChonksEscort(ally,.2));assert(ally.x!==before.x||ally.y!==before.y,'recruits move into actual shelter slots');
 const boss=g.api.spawnEnemy(false,180,350,'boss');assert(!g.api.chonksProtected(boss));assert(!g.api.updateChonksEscort(boss,.1));
 const wall={pts:[{x:280,y:250},{x:280,y:450}],thick:8,hp:10000,maxHp:10000,life:100,maxLife:100};g.state.walls=[wall];g.api.updateChonks(h,.5);assert(!g.state.walls.includes(wall),'shield ram destroys a very sturdy wall immediately');assert.equal(h.chonks.recoveryTotal,.3);
 h.x=250;h.y=350;g.state.walls=[];const ink=g.state.stats.ink,score=g.state.score,kills=g.state.kills;
 const rub=seconds=>{for(let i=0;i<Math.round(seconds/.05);i++){g.api.eraseWallPath({x:276,y:338},{x:284,y:362});g.api.updateChonksShield(.05);}};
 rub(.3);assert(g.api.hasChonksShield(h));const wear=h.chonks.shieldWear;g.state.paused=true;rub(1);assert.equal(h.chonks.shieldWear,wear);g.state.paused=false;
 g.api.cancelChonksRub();g.api.updateChonksShield(.1);assert.equal(h.chonks.shieldWear,wear,'release cancels stale rub');
 g.api.eraseWallPath({x:280,y:350},{x:280,y:350});g.api.updateChonksShield(.1);assert.equal(h.chonks.shieldWear,wear,'stationary tap cannot erase shield');
 g.api.eraseWallPath({x:276,y:338},{x:284,y:362},20,{enemy:true});g.api.updateChonksShield(.1);assert.equal(h.chonks.shieldWear,wear,'enemy erasers cannot remove shield');
 rub(.35);assert(!g.api.hasChonksShield(h));assert(!g.api.chonksProtected(ally));assert.equal(g.state.stats.ink,ink);assert.equal(g.state.score,score);assert.equal(g.state.kills,kills,'erasing armor grants no kill rewards');assert(!g.api.updateChonksEscort(ally,.1),'convoy releases immediately');
 const unshielded=h.hp;g.api.dealDamage(h,5,'fire');assert.equal(h.hp,unshielded-5,'normal elemental damage resumes');
 h=setup();h.speed=0;g.state.projectiles=[{x:h.x,y:h.y,target:h,speed:0,damage:100,life:1}];const armorHp=h.hp;g.api.updateProjectiles(.01);assert.equal(h.hp,armorHp,'real paper impacts cannot bypass shield');
 g.api.addPaperHole({x:h.x,y:h.y});g.api.addPaperHole({x:400,y:350});assert.equal(g.api.updatePaperEnemy(h,.1),false,'armored convoy leader stays above paper');
 const state=JSON.stringify(g.state),random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('shield draw uses RNG')};g.api.draw();env.sandbox.Math.random=random;assert.equal(JSON.stringify(g.state),state,'shield draw is pure');
 for(let i=0;i<14;i++)g.api.spawnEnemy(false,180,330+i*3,'grunt');g.api.updateChonksShield(.01);assert(g.state.enemies.filter(e=>g.api.updateChonksEscort(e,0)).length<=6,'bounded convoy size');
 g.api.eraseWallPath({x:276,y:338},{x:284,y:362});g.state.wave=7;g.api.startWave({skipIntro:true});assert.equal(g.state.enemies.length,0);const next=g.api.spawnEnemy(false,250,350,'tank');g.api.updateChonksShield(.1);assert.equal(next.chonks.shieldWear,0,'wave reset drops pending eraser work');
 g.api.resetRun({skipIntro:true});const early=g.api.spawnEnemy(false,250,350,'tank');assert(!g.api.hasChonksShield(early),'waves 1–5 retain current behavior');
 console.log('PASS: Chonks shield/convoy damage and control immunity, exposed targets, real follower movement, boss exclusion, instant wall crush, timed player rubbing, pause/release/stationary/enemy guards, normal damage after erase, paper impacts/tunnels, pure drawing, cap and wave reset.');
};
