const assert=require('assert');
module.exports=load=>{
 function setup(){const g=load(true).sandbox.testGame,a=g.api,s=g.state;a.resetRun({skipIntro:true});s.wave=13;a.startWave();s.enemies=[];s.walls=[];s.stats.ink=s.stats.maxInk=3000;return {g,a,s};}
 // Every underground speed band gains exactly 10%, without changing ground speed.
 for(const speed of [15,50,200]){const {a,s}=setup(),e=a.spawnEnemy(false,100,200,'grunt');e.speed=speed;e.paperTunnel={phase:'travel',exit:{x:700,y:200},rub:0,rubbedAt:-999,entryId:-1};const before=e.x;assert(a.updatePaperEnemy(e,.5));assert(Math.abs(e.x-before-Math.max(35,Math.min(90,speed*1.2))*1.1*.5)<1e-8);assert.equal(e.speed,speed);}
 // Exercise real launches, then an entire swept descent through overlapping cover.
 for(const mode of ['old','fresh','stale','fragment','old-and-fresh']){const {a,s}=setup();const pts=[{x:280,y:90},{x:280,y:500}];let wall;if(['old','fragment','old-and-fresh'].includes(mode))wall=a.createWall(pts).base;
  const c=a.spawnEnemy(false,100,180,'catapulter');a.updateCatapulter(c,0);c.x=c.catapult.goal.x;c.y=c.catapult.goal.y;a.updateCatapulter(c,0);a.updateCatapulter(c,2.5);const e=a.spawnEnemy(false,c.x+35,c.y,'grunt');a.updateCatapulter(c,.5);a.updateCatapulter(c,1.25);assert(e.flight?.catapult);
  // Put the catcher at the actual 75%-flight point, perpendicular to the approach.
  const f=e.flight,x=f.startX+(f.targetX-f.startX)*.75,y=f.startY+(f.targetY-f.startY)*.75,dx=f.targetX-f.startX,dy=f.targetY-f.startY,d=Math.hypot(dx,dy),catcher=[{x:x-dy/d*50,y:y+dx/d*50},{x:x+dy/d*50,y:y-dx/d*50}];
  if(wall){wall.pts=catcher;if(mode==='fragment')s.walls=[{...wall,pts:catcher.map(p=>({...p}))}];}
  if(['fresh','stale','old-and-fresh'].includes(mode)){wall=a.createWall(catcher).base;if(mode==='stale')wall.blastAge=.76;}
  const hp=s.player.hp;a.updateEnemyFlight(e,1.05);const caught=['fresh','old-and-fresh'].includes(mode);assert.equal(s.player.hp===hp,caught,mode+' catcher eligibility');assert(!e.flight);if(caught)assert(e.stun>0);else assert(!s.enemies.includes(e),'uncaught passenger impacts once');
 }
 console.log('PASS: 10% faster underground travel at every speed band; actual catapult launches ignore old/stale/fragment cover, accept fresh overlapping catchers, and preserve swept catches/impact.');
};
