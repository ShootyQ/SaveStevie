module.exports=function(load){
 const assert=require('assert'),g=load(true).sandbox.testGame;g.api.resetRun({skipIntro:true});
 assert.equal(g.state.stats.inkRegen,6);
 const take=(name,rarity)=>{const u={...g.catalog.upgrades.find(u=>u.name===name),rarity},after=g.api.upgradePreview(u).after;g.api.applyUpgrade(u);assert.equal(String(g.state.stats.rockDamage),after,'preview matches every awarded rarity level');};
 take('Pocket Rocks','common');take('Better Rocks','rare');take('Really Good Rocks','rare');
 assert(g.state.stats.rockDamage>=10&&g.state.stats.rockDamage<=20,'a representative invested build lands in the 10–20 range');
 take('Really Good Rocks','legendary');take('Stevie Has Had Enough','legendary');
 assert(g.state.stats.rockDamage>=20&&g.state.stats.rockDamage<=30,'heavy investment lands in the 20–30 range');
 for(let i=0;i<50;i++)take('Really Good Rocks','legendary');
 assert(g.state.stats.rockDamage<=30,'repeated damage upgrades stay bounded');
 assert.equal(g.api.paperLabel('Pocket Rocks'),'Paper Balls');assert.equal(g.api.paperLabel('Hot Rocks'),'Hot Paper');assert(g.state.stacks['Pocket Rocks'],'legacy build IDs stay compatible');
 assert(g.api.setDrawingControl('eraserSize','extra-large'));assert.equal(g.api.drawingControls().eraserSize,'extra-large');assert(!g.api.setDrawingControl('eraserSize','huge'));assert.equal(g.api.drawingControls().eraserSize,'extra-large');
 console.log('PASS: +1 base ink/s, representative and heavily invested paper-ball damage targets, exact rarity previews, repeated-upgrade limit, compatible names and eraser size validation.');
};
