const assert=require('assert');
module.exports=function(load){
 const key='saveStevieNotebookV1',saved=new Map([[key,JSON.stringify({version:2,scraps:1000,lifetimeScraps:1000,betaPencilClaimed:true,levels:{starterEraser:1}})],['doodleDefenderBestV4','11']]),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v))};
 let env=load(true,{storage}),g=env.sandbox.testGame,a=g.api,s=g.state;
 for(const id of ['turretRange','turretDuration','turretCapacity','turretRate','turretFold']){assert(!a.buyNotebookPerk(id),'Notebook prerequisites');assert(!a.buyBetaNode(id),'tree prerequisites');}
 assert(a.buyBetaNode('circles'));assert(!a.buyNotebookPerk('turretRate'));assert(!a.buyBetaNode('turretFold'));
 for(const [id,prices] of [['turretRange',[10,20,35]],['turretDuration',[10,20,35]],['turretCapacity',[30,60]],['turretRate',[10,20,35]],['turretFold',[15,30]]]){for(const price of prices){assert.equal(a.notebookPerkPrice(id),price);assert(a.buyBetaNode(id));}assert(!a.buyNotebookPerk(id),'rank cap');}
 assert.equal(a.notebookSnapshot().scraps,645);const backup=a.validateSaveBackup(a.saveBackupText());assert.equal(backup.notebook.levels.turretCapacity,2);
 env=load(true,{storage});g=env.sandbox.testGame;a=g.api;s=g.state;assert.equal(a.notebookSnapshot().levels.turretRange,3);
 a.resetRun();s.enemies=[];s.walls=[];const cfg=a.circleShapeTuning();assert.equal(cfg.range,300);assert.equal(cfg.seconds,19);assert.equal(cfg.capacity,3);assert(Math.abs(cfg.interval-.95)<1e-10);assert.equal(cfg.choiceSeconds,1);
 const draw=(x,y)=>{s.stats.ink=160;const points=Array.from({length:17},(_,i)=>({x:x+Math.cos(i/16*Math.PI*2)*20,y:y+Math.sin(i/16*Math.PI*2)*20}));return a.createWall(points).base;};
 for(const [x,y] of [[100,180],[260,180],[100,480]]){draw(x,y);assert(a.resolveCircleChoice(true));}
 assert.equal(a.circleShapesSnapshot().turrets.length,3);assert.equal(a.shapeBarrierWalls().length,3);
 const target=a.spawnEnemy(false,380,180,'grunt');target.hp=target.maxHp=10000;a.updateCircleShapes(.25);const shots=s.projectiles.filter(p=>p.turretShot);assert.equal(shots.length,2,'two independent cannons shoot; third target is out of range');assert(shots.every(p=>p.turretRange===300));assert(a.circleShapesSnapshot().turrets.slice(0,2).every(t=>Math.abs(t.cd-.95)<1e-10));
 s.enemies=[];const oldest=a.shapeBarrierWalls()[0];draw(260,480);assert.equal(a.circleShapesSnapshot().turrets.length,3);a.updateCircleShapes(1);const turrets=a.circleShapesSnapshot().turrets;assert.equal(turrets.length,3);assert.equal(turrets[0].x,260);assert.equal(turrets[2].left,19,'auto-build replacement gets entire upgraded duration');assert.equal(oldest.life,0);assert(!a.shapeBarrierWalls().includes(oldest));
 const state=JSON.stringify(s),random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('render RNG')};a.draw();env.sandbox.Math.random=random;assert.equal(JSON.stringify(s),state);
 const before=a.circleShapesSnapshot().turrets;env.node('game').getBoundingClientRect=()=>({left:0,top:0,width:1000,height:850});a.resize();a.circleShapesSnapshot().turrets.forEach((t,i)=>{assert.equal(t.x,before[i].x+100);assert.equal(t.y,before[i].y+75);});
 a.updateCircleShapes(19.1);assert.equal(a.shapeBarrierWalls().length,0,'all expired cannons removed');
 draw(100,180);a.resolveCircleChoice(true);draw(260,180);a.resolveCircleChoice(true);s.wave=10;a.spawnEnemy(true,100,180);assert.equal(a.circleShapesSnapshot().turrets.length,0,'boss entry clears every cannon');
 console.log('PASS: turret branch prerequisites, prices/caps, saved ranks and backup, three independent upgraded cannons, oldest replacement, full auto-build duration, range/cadence, expiration, resize and boss cleanup.');
};
