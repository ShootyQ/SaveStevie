const assert=require('assert');
module.exports=load=>{
 function setup(W=800,H=700,storage){const env=load(true,{images:true,storage}),g=env.sandbox.testGame,a=g.api;a.setFirstLessonsEnabled(false);a.resetRun({skipIntro:true});g.state.wave=10;a.startWave();g.state.W=W;g.state.H=H;g.state.player.x=W/2;g.state.player.y=H/2;g.state.player.hp=g.state.player.maxHp=10000;g.state.timeLeft=0;g.state.enemies=[];g.state.walls=[];g.state.stats.rockRate=0;g.state.stats.playerArmor=0;const e=a.spawnEnemy(true,100,180);a.updateBootstomp(e,a.bootstompSnapshot(e).introDuration+1.45);a.updateBootstomp(e,.81);assert.equal(a.bootstompSnapshot(e).phase,'windup');return {env,g,a,e};}
 function step(r,seconds,hold=false){for(let t=0;t<seconds-.000001;t+=.05){const dt=Math.min(.05,seconds-t);if(hold)r.a.updatePaperPress(dt);r.a.updateBootstomp(r.e,dt);}}
 function down(r){let s=r.a.bootstompSnapshot(r.e);for(let i=0;s.phase!=='windup'&&i<1000;i++){step(r,.05);s=r.a.bootstompSnapshot(r.e);}assert.equal(s.phase,'windup');assert(r.a.beginPaperPress(s.target));step(r,3.3,true);assert.equal(r.a.bootstompSnapshot(r.e).phase,'stumble');step(r,1.3);assert.equal(r.a.bootstompSnapshot(r.e).phase,'down');}
 const wall=(x,y)=>({pts:[{x:x-100,y},{x:x+100,y}],hp:100,maxHp:100,life:100,thick:8});
 for(const dims of [[800,700],[393,700],[960,520]]){
  const r=setup(...dims),{g,a,e}=r,s=a.bootstompSnapshot(e);assert.equal(e.type,'bootstomp');assert(s.target.x>=20&&s.target.x<g.state.W-20);assert(s.target.y>20&&s.target.y<g.state.H-10);
  const hp=e.hp;e.freeze=e.stun=e.gravitySlow=50;a.dealDamage(e,99999,'physical');a.dealDamage(e,99999,'fire');a.update(.01);assert.equal(e.hp,hp);assert.equal(e.freeze,0);assert.equal(e.stun,0);
  down(r);assert.equal(a.paperPressSnapshot().press,null,'successful landing consumes the dent');assert.equal(a.beginPaperPress(a.bootstompSnapshot(e).parts.star),false,'fallen rub targets do not start a trampoline');
  const q=a.bootstompSnapshot(e).parts.left_boot,from={x:q.x-14,y:q.y},to={x:q.x+14,y:q.y};
  for(let i=0;i<6;i++)a.eraseWallPath(q,q,15);assert.equal(a.bootstompSnapshot(e).wear.left_boot,0,'stationary clicks do not damage patches');
  a.eraseWallPath(from,to,6);assert.equal(a.bootstompSnapshot(e).wear.left_boot,1);step(r,.61);a.eraseWallPath(from,to,6);assert.equal(a.bootstompSnapshot(e).wear.left_boot,1,'one-direction stroke cannot multi-hit');
  const p=a.bootstompSnapshot(e).parts.left_boot;a.eraseWallPath({x:p.x+14,y:p.y},{x:p.x-14,y:p.y},6);assert.equal(a.bootstompSnapshot(e).wear.left_boot,2,'real reversal earns another swipe');
  const before=JSON.stringify(a.bootstompSnapshot(e)),random=r.env.sandbox.Math.random;let rolls=0;r.env.sandbox.Math.random=()=>{rolls++;return random();};a.draw();a.draw();r.env.sandbox.Math.random=random;assert.equal(rolls,0);assert.equal(JSON.stringify(a.bootstompSnapshot(e)),before,'rendering is pure');
  g.state.paused=true;a.updateBootstomp(e,1);assert.equal(JSON.stringify(a.bootstompSnapshot(e)),before,'pause stops boss clocks');g.state.paused=false;
  step(r,4);assert.equal(a.bootstompSnapshot(e).wear.left_boot,2,'wear survives standing up');a.endDraw();assert.equal(a.paperPressSnapshot().press,null);
 }
 // Missed stomp always reaches Stevie; any number of walls grants one reduction.
 for(const count of [0,1,3]){const r=setup(),{g,a,e}=r;const q=a.bootstompSnapshot(e).target,p=g.state.player;for(let i=1;i<=count;i++)g.state.walls.push(wall(q.x,q.y+(p.y-q.y)*i/(count+1)));const hp=p.hp;step(r,3.3);assert.equal(a.bootstompSnapshot(e).phase,'impact');step(r,1.2);assert.equal(hp-p.hp,count?7:14,'ripple mitigation is applied exactly once');}
 // A shallow hold and an early release fail; old completed dents cannot be banked.
 {const r=setup(),{a,e}=r;a.beginPaperPress(a.bootstompSnapshot(e).target);a.updatePaperPress(2.2);assert(a.bootstompSnapshot(e).pressure<.8);step(r,3.3);assert.equal(a.bootstompSnapshot(e).phase,'impact');}
 {const r=setup(),{a,e}=r;a.beginPaperPress(a.bootstompSnapshot(e).target);a.updatePaperPress(3);a.releasePaperPress();step(r,3.3);assert.equal(a.bootstompSnapshot(e).phase,'impact');}
 // Every part needs three real swipes; all 15 survive across several openings.
 {const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v))},r=setup(800,700,storage),{a,e,g}=r;assert.equal(a.shapeStudiesAvailable(),false);let cycles=0;
  while(g.state.enemies.includes(e)&&cycles++<15){down(r);for(let i=0;i<4;i++){
    const s=a.bootstompSnapshot(e),name=Object.keys(s.wear).find(n=>s.wear[n]<3);if(!name||s.phase!=='down')break;const p=s.parts[name];a.resetBootstompRub();a.eraseWallPath({x:p.x-15,y:p.y},{x:p.x+15,y:p.y},4);step(r,.62);if(a.bootstompSnapshot(e).phase==='defeat')break;
   }
   if(a.bootstompSnapshot(e).phase==='defeat')break;
  }
  assert.equal(a.bootstompSnapshot(e).phase,'defeat');assert(Object.values(a.bootstompSnapshot(e).wear).every(n=>n===3));assert(g.state.enemies.includes(e),'drawn defeat plays before the kill');step(r,3.2);assert(!g.state.enemies.includes(e));assert(a.bossFightResolved());assert(a.shapeStudiesAvailable(),'new boss still unlocks Circle Studies');const restored=load(true,{storage}).sandbox.testGame;assert(restored.api.shapeStudiesAvailable(),'wave-10 unlock survives reload');
 }
 // Lace can be countered by a real paid wall, drops its passenger and never throws.
 {const r=setup(),{a,e,g}=r;let s=a.bootstompSnapshot(e);for(let i=0;i<1200&&s.phase!=='lace';i++){step(r,.05);s=a.bootstompSnapshot(e);}assert.equal(s.phase,'lace');step(r,.3);const l=a.bootstompSnapshot(e).lace,x=(l.x+l.ex)/2,y=(l.y+l.y2)/2;g.state.stats.ink=999;a.createWall([{x,y:y-28},{x,y:y+28}]);assert.equal(a.bootstompSnapshot(e).phase,'lace_rebound');assert.equal(g.state.enemies.filter(n=>n.flight?.bossThrown).length,0);assert(g.state.enemies.filter(n=>n.bossOwner===e).every(n=>!a.bossFriendHeld(n)));}
 // Double waves demand defenses even when the footprint counter succeeds.
 for(const covered of [false,true]){const r=setup(),{a,e,g}=r;down(r);let s=a.bootstompSnapshot(e);for(let i=0;i<1000&&s.phase!=='shockwave';i++){step(r,.05);s=a.bootstompSnapshot(e);}assert.equal(s.phase,'shockwave');assert.equal(s.ripples.length,0,'warning precedes the waves');
  const p=g.state.player,hp=p.hp;if(covered){const x=(e.x+p.x)/2,y=(e.y+p.y)/2,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);g.state.walls.push({pts:[{x:x-dy/d*130,y:y+dx/d*130},{x:x+dy/d*130,y:y-dx/d*130}],hp:100,maxHp:100,life:100,thick:8});}
  step(r,.75);assert.equal(a.bootstompSnapshot(e).shockCount,1);step(r,1.1);assert.equal(a.bootstompSnapshot(e).shockCount,2);if(covered)assert.equal(g.state.walls[0].hp,20,'both waves spend cover HP before the boss resumes walking');step(r,.9);assert.equal(hp-p.hp,covered?0:28,'both waves can be completely caught by a wall');
 }
 // A nearby helper is visibly wound up, kicked through the air and lands safely
 // with no fall damage or stun.
 for(const [W,H] of [[1280,800],[393,700]]){const r=setup(W,H),{a,e,g}=r;let s=a.bootstompSnapshot(e);for(let i=0;i<1000&&s.phase!=='walk';i++){step(r,.05);s=a.bootstompSnapshot(e);}assert.equal(s.phase,'walk');
  const n=a.spawnEnemy(false,e.x,e.y,'grunt');n.bossOwner=e;const hp=n.hp;step(r,.05);assert.equal(a.bootstompSnapshot(e).phase,'kick');assert(a.bossFriendHeld(n));step(r,.5);assert(!n.flight,'kick has a readable windup');step(r,.2);assert(n.flight?.bossThrown);assert.equal(n.flight.damage,0);assert.equal(n.flight.stun,0);assert(!a.bossFriendHeld(n));
  const f=n.flight,p=g.state.player;assert(Math.hypot(f.targetX-p.x,f.targetY-p.y)>Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+n.r);a.updateEnemyFlight(n,.7);assert.equal(n.hp,hp);assert.equal(n.stun,0);assert(!n.flight);
 }
 // Actual PC movement follows the inset ring and keeps the original combat pace.
 {const r=setup(1280,800),{a,e,g}=r;a.desktopUiEnabled=()=>true;let walked=0,minDistance=Infinity;
  for(let i=0;i<1600;i++){const before=a.bootstompSnapshot(e),x=e.x,y=e.y;step(r,.025);const after=a.bootstompSnapshot(e);if(before.phase!=='intro')minDistance=Math.min(minDistance,Math.hypot(e.x-g.state.player.x,e.y-g.state.player.y));if(before.phase==='walk'){const distance=Math.hypot(e.x-x,e.y-y);assert(distance<=110*.025+1e-7,'walk retains its 110px/s combat pace');walked+=distance;}}
  assert(walked>150,'boss still relocates between attacks');assert(minDistance>220,'PC route stays well clear of Stevie');assert.equal(e.speed,110);
 }
 // A short top entrance eases in and out, with the same capped walking speed.
 for(const [W,H] of [[1280,800],[393,700]]){const {a,g}=setup(W,H);a.resetRun({skipIntro:true});g.state.W=W;g.state.H=H;g.state.player.x=W/2;g.state.player.y=H/2;g.state.wave=10;a.startWave();g.state.enemies=[];const boss=a.spawnEnemy(true,100,180),s=a.bootstompSnapshot(boss),start={x:boss.x,y:boss.y};
  assert(start.y<0&&start.x===s.introGoal.x,'short entrance from above rather than a screen-wide horizontal slide');
  assert(s.introDuration>=1.5*Math.hypot(s.introGoal.x-start.x,s.introGoal.y-start.y)/88,'eased entrance respects capped peak speed');
  for(let i=0;i<10;i++){const old={x:boss.x,y:boss.y};a.updateBootstomp(boss,.1);assert(Math.hypot(boss.x-old.x,boss.y-old.y)<=8.8+1e-7,'entrance cannot race across a wide screen');}
  a.updateBootstomp(boss,s.introDuration-1+.01);assert(Math.hypot(boss.x-s.introGoal.x,boss.y-s.introGoal.y)<1e-7);assert.equal(a.bootstompSnapshot(boss).phase,'intro');a.updateBootstomp(boss,1.45);assert.equal(a.bootstompSnapshot(boss).phase,'idle');assert.equal(boss.speed,110);
 }
 // Helpers keep the same cap, but actual arrivals are spaced farther apart.
 {const r=setup(),{a,e,g}=r,count=()=>g.state.enemies.filter(n=>n.bossOwner===e).length;assert.equal(count(),0);step(r,.2);assert.equal(count(),1);step(r,2);assert.equal(count(),1,'no second helper at the old arrival cadence');step(r,.5);assert.equal(count(),2,'reduced stream continues spawning helpers');}
 console.log('PASS: Bootstomp held-foot counter, 15 persistent real swipes, immunity, one-time ripple mitigation, paid lace counter, full defeat, pause/pure draw and three arena sizes.');
};
