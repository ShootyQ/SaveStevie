const assert=require('assert');
module.exports=load=>{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.stats.ink=g.state.stats.maxInk=5000;
 const upgrade=rarity=>g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Frost Ink'),rarity});
 upgrade('rare');upgrade('common');assert.equal(g.api.icebergMultiplier(),1,'four normal frost levels do not unlock Iceberg');
 const pts=[{x:100,y:200},{x:280,y:200}],w=g.api.createWall(pts).base,hp=w.maxHp,life=w.life;g.api.damageWall(w,hp*.3,180,200);
 upgrade('legendary');assert.equal(g.api.icebergMultiplier(),4);assert.equal(w.maxHp,hp*4);assert(Math.abs(w.hp-hp*.7*4)<1e-8,'preserve existing damage fraction');assert.equal(w.life,life);
 const fresh=g.api.createWall([{x:100,y:300},{x:280,y:300}]).base;assert.equal(fresh.maxHp,hp*4);upgrade('legendary');assert.equal(fresh.maxHp,hp*4,'no repeated multiplication');
 assert.match(g.api.upgradePreview({...g.catalog.upgrades.find(u=>u.name==='Frost Ink'),rarity:'legendary'}).afterDetail,/Iceberg.*4× HP/);
 assert.equal(g.api.upgradeArtworkInfo({name:'Frost Ink',rarity:'legendary'}).file,'assets/art/upgrades/iceberg.svg');
 g.api.updateIceberg(.7);const before=JSON.stringify(g.state);const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('Iceberg render cannot consume combat RNG')};g.api.drawIcebergWalls();env.sandbox.Math.random=random;assert.equal(JSON.stringify(g.state),before,'drawing is pure');
 g.api.eraseWallPath({x:190,y:170},{x:190,y:230},12,{enemy:true});assert.equal(g.state.walls.length,3,'enemy eraser can still split ice');assert(g.state.walls.filter(x=>x.pts[0].y===200).every(x=>x.maxHp<hp*4));
 g.api.setIceberg(false);assert.equal(fresh.maxHp,hp);assert.equal(g.api.icebergMultiplier(),1);upgrade('legendary');
 g.state.tool.slots=2;g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Fire Ink'),rarity:'common'});g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Poison Ink'),rarity:'common'},'Frost Ink');assert.equal(g.state.inks.frost,0);assert.equal(g.api.icebergMultiplier(),1);assert.equal(fresh.maxHp,hp,'replacement removes durability');
 g.api.resetRun();assert(!g.state.stats.iceberg);g.state.stats.ink=1000;upgrade('legendary');g.state.wave=2;g.api.startWave();assert.equal(g.api.icebergMultiplier(),4,'persists across waves');g.api.resetRun();assert.equal(g.api.icebergMultiplier(),1,'new run clears unlock');
 console.log('PASS: Iceberg legendary-only unlock, existing/new HP and damage ratio, no repeat multiplication, lifetime, erase weakness, replacement, pure RNG-free drawing and wave/run lifecycle.');
};
