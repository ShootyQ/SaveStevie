const assert=require('assert');
module.exports=load=>{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.enemies=[];g.state.stats.ink=g.state.stats.maxInk=10000;
 const electric=rarity=>g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Electric Ink'),rarity});
 electric('rare');electric('common');assert(!g.api.teslaSnapshot().unlocked,'ordinary Electric ranks do not unlock Tesla');electric('legendary');assert(g.api.teslaSnapshot().unlocked);
 assert.match(g.api.upgradePreview({...g.catalog.upgrades.find(u=>u.name==='Electric Ink'),rarity:'legendary'}).afterDetail,/Tesla.*2 seconds/);assert.equal(g.api.upgradeArtworkInfo({name:'Electric Ink',rarity:'legendary'}).file,'assets/art/upgrades/tesla.svg');
 const wall=()=>g.api.createWall([{x:80,y:200},{x:380,y:200}]).base;wall();wall();
 const foes=[];for(let i=0;i<10;i++){const e=g.api.spawnEnemy(false,120+i*18,170,'grunt');e.hp=e.maxHp=1000;foes.push(e);}
 const immune=g.api.spawnEnemy(false,200,180,'grunt');immune.hp=1000;immune.immunity='electric';const hidden=g.api.spawnEnemy(false,210,180,'grunt');hidden.hp=1000;hidden.paperTunnel={phase:'travel',age:0,rub:0,exit:{x:240,y:120}};
 g.state.wave=7;const shield=g.api.spawnEnemy(false,200,180,'tank');shield.hp=1000;shield.chonks.moveDirection={x:0,y:-1};g.api.updateChonksShield(.01);
 g.api.updateTesla(1);assert.equal(g.api.teslaSnapshot().charge,.5);assert(foes.every(e=>e.hp===1000));const snap=JSON.stringify(g.api.teslaSnapshot());g.state.paused=true;g.api.updateTesla(5);assert.equal(JSON.stringify(g.api.teslaSnapshot()),snap);g.state.paused=false;
 const damage=g.api.electricTuning(g.state.inks.electric).damage*4;g.api.updateTesla(1);assert.equal(g.api.teslaSnapshot().bolts.length,8);assert.equal(foes.filter(e=>e.hp<1000).length,8);for(const e of foes.filter(e=>e.hp<1000)){assert(Math.abs(e.hp-(1000-damage))<1e-8,'one hit across overlapping walls');assert.equal(e.stun,0,'no added stun');}assert.equal(immune.hp,1000);assert.equal(hidden.hp,1000);assert.equal(shield.hp,1000);
 const before=JSON.stringify(g.state),fx=JSON.stringify(g.api.teslaSnapshot());const rng=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('Tesla rendering must not use combat RNG')};g.api.drawTeslaWalls();g.api.drawTeslaBolts();env.sandbox.Math.random=rng;assert.equal(JSON.stringify(g.state),before);assert.equal(JSON.stringify(g.api.teslaSnapshot()),fx);
 g.api.moveTesla(4,7);assert.equal(g.api.teslaSnapshot().bolts[0].x,JSON.parse(fx).bolts[0].x+4);g.api.updateTesla(.4);assert.equal(g.api.teslaSnapshot().bolts.length,0);
 g.state.enemies=[];g.api.updateTesla(4);assert.equal(g.api.teslaSnapshot().charge,1,'hold charge until enemy arrives');const lethal=g.api.spawnEnemy(false,180,170,'grunt');lethal.hp=1;const kills=g.state.kills;g.api.updateTesla(.01);assert.equal(g.state.kills,kills+1,'normal kill rewards');
 for(let i=0;i<30;i++)wall();assert.equal(g.api.teslaSnapshot().coils.length,24,'bounded coils even with wall spam');g.api.eraseWallPath({x:200,y:180},{x:200,y:220},12);g.api.updateTesla(10);assert.equal(g.api.teslaSnapshot().bolts.length,0,'no target/no catchup');
 g.state.tool.slots=2;g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Fire Ink'),rarity:'common'});g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Poison Ink'),rarity:'common'},'Electric Ink');assert(!g.api.teslaSnapshot().unlocked);assert.equal(g.api.teslaSnapshot().charge,0);
 g.api.resetRun();electric('legendary');g.state.wave=2;g.api.startWave();assert(g.api.teslaSnapshot().unlocked);assert.equal(g.api.teslaSnapshot().charge,0);g.api.resetRun();assert(!g.api.teslaSnapshot().unlocked);
 console.log('PASS: legendary Tesla, two-second shared charge, 8 distinct hits, overlap limit, immunity/tunnel/shield, no stun, pause, pure RNG-free art, resize, held charge, kills, 24 coil bound, replacement and wave/run lifecycle.');
};
