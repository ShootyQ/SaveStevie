const assert=require('assert');
module.exports=load=>{
 const setup=()=>{const env=load(true),g=env.sandbox.testGame,a=g.api,s=g.state;a.resetRun({skipIntro:true});s.W=800;s.H=700;s.player.x=650;s.player.y=300;s.enemies=[];s.walls=[];s.spawnTimer=999;s.stats.rockRate=0;s.timeLeft=300;env.sandbox.Math.random=()=>0;return {env,g,a,s};};
 // Real eraser geometry, including tiny tears, narrow slits and a larger opening.
 {const {a,s}=setup();a.rubPaperSurface([{a:{x:100,y:180},b:{x:101,y:180},r:7}],1);const e=a.spawnEnemy(false,100,180,'grunt');assert(!a.updatePaperEnemy(e,.01),'a pinhole cannot swallow a monster');assert(!e.paperTripUsed);
  a.rubPaperSurface([{a:{x:160,y:180},b:{x:240,y:180},r:7}],1);e.x=200;assert(!a.updatePaperEnemy(e,.01),'a long thin slit is still too narrow');
  a.stampPaperHole({x:300,y:180},40);e.x=300;assert(a.updatePaperEnemy(e,.01));assert(e.paperTripUsed);assert(!a.underPaper(e),'monster is visible while crossing exposed entry desk');const hp=e.hp;a.dealDamage(e,1,'physical');assert.equal(e.hp,hp-1,'exposed entry monster remains vulnerable');
  a.updatePaperEnemy(e,.51);for(let i=0;i<100&&!a.underPaper(e);i++)a.updatePaperEnemy(e,.05);assert(a.underPaper(e),'hiding starts only beneath intact paper');assert(!a.surfaceHoleAt(e.x,e.y));
 }
 // A merged tear's old anchor must not teleport a monster across the opening.
 {const {a}=setup();a.stampPaperHole({x:100,y:200},35);a.stampPaperHole({x:145,y:200},35);const e=a.spawnEnemy(false,145,200,'grunt');a.updatePaperEnemy(e,.01);a.updatePaperEnemy(e,.25);assert.equal(e.x,145);assert.equal(e.y,200);assert(!a.underPaper(e));e.stun=1;assert(!a.updatePaperEnemy(e,.05));assert(!e.paperTunnel,'surface stun cancels the dive instead of trapping it forever');}
 // Bigger bodies need a bigger entrance; partial overlap at the rim is rejected.
 {const {a,s}=setup();s.paper.holes=[{id:1,x:100,y:180,r:22}];const e=a.spawnEnemy(false,100,180,'grunt');e.r=25;assert(!a.updatePaperEnemy(e,.01));s.paper.holes[0].r=40;assert(a.updatePaperEnemy(e,.01));
  const n=a.spawnEnemy(false,137,180,'grunt');assert(!a.updatePaperEnemy(n,.01),'being near a big opening does not mean fitting inside it');}
 // Catch a moving bump off-centre without an accurate head hit, then verify
 // the tear it makes really fits the body and this monster cannot burrow again.
 {const {a,s}=setup(),e=a.spawnEnemy(false,200,200,'grunt');e.r=25;e.paperTripUsed=true;e.paperTunnel={phase:'travel',entryId:-1,exit:{x:650,y:300},rub:0,rubbedAt:-Infinity,age:0};
  for(let i=0;i<10;i++){a.queuePaperRub({x:e.x-5,y:e.y+28},{x:e.x+5,y:e.y+28},6);a.updatePaper(.05);a.updatePaperEnemy(e,.05);}assert.equal(e.paperTunnel.phase,'travel');
  a.queuePaperRub({x:e.x-5,y:e.y+28},{x:e.x+5,y:e.y+28},6);a.updatePaper(.05);assert.equal(e.paperTunnel.phase,'emerge');assert(e.paperTunnel.forced);assert(!a.underPaper(e),'erased-out monster is visible on the desk');const hole=a.surfaceHoleAt(e.x,e.y);assert(hole);assert(a.paperHoleFits(hole,e,e.r*1.35));a.updatePaperEnemy(e,.71);assert(!e.paperTunnel);assert(e.stun>0);e.stun=0;e.paperCooldown=0;assert(!a.updatePaperEnemy(e,.01),'one underground trip stays enforced');
 }
 // Burned-through paper is an opening too, both while burning and after burnout.
 for(const burnt of [false,true]){const {a,s}=setup();s.synergies.add('Plaguefire');a.dropPlaguefire({x:250,y:220,burn:1,poison:1});if(burnt)a.updatePlaguefire(11);const e=a.spawnEnemy(false,190,220,'grunt');e.paperTripUsed=true;e.speed=200;e.paperTunnel={phase:'travel',entryId:-1,exit:{x:650,y:220},rub:0,rubbedAt:-Infinity,age:0};s.player.y=220;a.updatePaperEnemy(e,2);assert.equal(e.paperTunnel.phase,'emerge','first desk opening intercepts even a large time step');assert(a.plaguefirePaperMissing(e));assert(!a.underPaper(e));}
 // Opening the desk underneath an existing bump forces it out before it moves.
 {const {a}=setup(),e=a.spawnEnemy(false,220,200,'grunt');e.paperTunnel={phase:'travel',entryId:1,exit:{x:650,y:300},rub:0,rubbedAt:-Infinity,age:0};a.stampPaperHole(e,35);a.updatePaperEnemy(e,.01);assert.equal(e.paperTunnel.phase,'emerge');assert(!a.underPaper(e));}
 // The legendary desk opening and its lasting scar are exposed surfaces too.
 {const {a,g,s}=setup();a.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Under the Desk'),rarity:'legendary'});s.stats.ink=2000;
  a.createWall([[-40,-40],[0,-40],[40,-40],[40,0],[40,40],[0,40],[-40,40],[-40,0],[-40,-40]].map(([dx,dy])=>({x:300+dx,y:220+dy})));
  a.eraseWallPath({x:282,y:202},{x:318,y:238},8);a.endUnderDeskGesture(true);a.eraseWallPath({x:282,y:238},{x:318,y:202},8);a.endUnderDeskGesture(true);assert(a.underDeskSnapshot().pit);
  for(const scar of [false,true]){if(scar)a.finishUnderDeskWave();const e=a.spawnEnemy(false,230,220,'grunt');e.paperTunnel={phase:'travel',entryId:-1,exit:{x:650,y:220},rub:0,rubbedAt:-Infinity,age:0};s.player.y=220;a.updatePaperEnemy(e,2);assert.equal(e.paperTunnel.phase,'emerge');assert(a.underDeskPaperMissing(e));assert(!a.underPaper(e));}
 }
 console.log('PASS: full-body entrances reject pinholes/slits/rim overlaps, visible vulnerable entry crossing without anchor teleport, forgiving 0.55s rub creates fitting holes, single-use trips, swept active/burnt desk exits and newly exposed bumps.');
};
