const assert=require('assert');
module.exports=load=>{
 const g=load(true).sandbox.testGame,a=g.api,s=g.state;
 function reset(wave=14){a.resetRun({skipIntro:true});s.wave=wave;s.W=800;s.H=700;s.player.x=600;s.player.y=350;s.enemies=[];s.walls=[];s.timeLeft=60;s.stats.ink=s.stats.maxInk=10000;}
 reset();let pool;const pick=a.pick;a.pick=p=>{pool=Array.from(p);return p[0];};a.enemyType();a.pick=pick;
 assert(pool.filter(t=>t==='sniper').length>pool.filter(t=>t==='grunt').length);assert(pool.includes('papertearer'));assert.equal(g.catalog.monsters.find(m=>m.type==='papertearer').wave,14);
 a.spawnChapterGroup();assert(s.enemies.some(e=>e.type==='catapulter'),'available builder gets a chapter slot');assert.equal(a.catapulterSnapshot().cap,4);
 reset();const yank=a.spawnEnemy(false,100,200,'wallpuller');const tiny=a.createWall([{x:120,y:190},{x:120,y:210}]).base,big=a.createWall([{x:180,y:120},{x:180,y:300}]).base,far=a.createWall([{x:700,y:80},{x:700,y:600}]).base;
 a.updateHardhat(yank,1.1);assert.equal(yank.crew.wall,big,'longest nearby wall wins over nearer tiny or enormous distant wall');assert.notEqual(yank.crew.wall,tiny);assert.notEqual(yank.crew.wall,far);
 reset();const pew=a.spawnEnemy(false,420,350,'sniper');pew.shootCd=.61;a.updateSniper(pew,.02);assert(pew.sniperAim,'aim is locked as telegraph starts');const x=pew.x,y=pew.y;
 a.createWall([{x:500,y:290},{x:500,y:410}]);assert(a.shotBlocked(pew.x,pew.y,s.player.x,s.player.y,3));a.updateSniper(pew,.6);assert.equal(pew.x,x);assert.equal(pew.y,y);assert.equal(s.enemyShots.length,1,'new counter-wall cannot cancel the promised shot');assert(!s.enemyShots[0].eraser);a.updateEnemyShots(.6);assert(s.enemyShots[0]?.reflected,'committed pencil still reflects normally');
 reset(7);const sneaky=a.spawnEnemy(false,100,200,'flanker');a.updateSneaky(sneaky,1.2);
 for(let i=0;i<2;i++){
  const plan=a.sneakySnapshot()[0].route;assert(plan&&!plan.hijacked);const p=plan.points[0],q=plan.points[1],cut={x:(p.x+q.x)/2,y:(p.y+q.y)/2};a.eraseSneakyRoutes(cut,cut,12);const broken=a.sneakySnapshot()[0].route;assert(broken.gap);assert.deepEqual(broken.points.at(-1),broken.gap.start,'tail disappears at the cut');
  assert(a.redirectSneakyRoute([broken.gap.start,{x:70+i*15,y:580}]));
  a.updateSneakyOrders(4.01);a.updateSneaky(sneaky,.6);if(i===0)assert(a.sneakySnapshot()[0].route&&!a.sneakySnapshot()[0].route.hijacked,'owner can make a second plan');else assert.equal(a.sneakySnapshot()[0].route,null,'two active lines prevent a third plan');
 }
 assert.equal(a.stolenRouteSnapshot().length,2,'two independent false routes coexist');const before=JSON.stringify(a.stolenRouteSnapshot());a.drawSneakyRoutes();assert.equal(JSON.stringify(a.stolenRouteSnapshot()),before,'drawing cannot age routes');
 sneaky.hp=0;s.enemies=[];a.updateSneakyOrders(.1);assert(a.stolenRouteSnapshot().length,'stolen routes survive owner death');a.moveEnemyTactics(10,20);assert(a.stolenRouteSnapshot()[0].points[0].x===JSON.parse(before)[0].points[0].x+10);a.updateSneakyOrders(20);assert.equal(a.stolenRouteSnapshot().length,2);a.resetEnemyTactics();assert.equal(a.stolenRouteSnapshot().length,0);
 console.log('PASS: specialist weighting/early tearer/scheduled catapult, longest nearby wall, committed reflected shot, and two independent stolen routes through replanning/death/resize/reset.');
};
