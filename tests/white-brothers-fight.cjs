const assert=require('assert');
module.exports=load=>{
 const env=load(true),g=env.sandbox.testGame,a=g.api;
 a.resetRun();g.state.wave=20;g.state.timeLeft=0;g.state.enemies=[];a.resetEnemyWave();a.setWaveFinaleEnabled(false);
 const out=a.spawnEnemy(true,180,150),glue=g.state.enemies.find(e=>e.type==='mr-glue');
 assert(glue&&a.isWhiteBrother(out)&&a.isWhiteBrother(glue));assert.equal(g.state.enemies.length,2);assert.equal(out.hp,1000);
 const hp=out.hp;for(const e of [out,glue])for(const kind of ['physical','fire','electric','frost','poison','blast','void','reflected'])a.dealDamage(e,1000,kind);
 assert.equal(out.hp,hp,'all wall/unsourced damage is ignored');
 const advance=t=>{for(let i=0;i<Math.ceil(t/.025);i++)a.update(.025);};advance(3);
 a.dealDamage(glue,10,'physical',{rock:true});assert.equal(out.hp,990);assert.equal(glue.hp,990,'paper-ball damage shares health');
 const wall={pts:[{x:out.x-50,y:out.y},{x:out.x+50,y:out.y}],hp:1e6,maxHp:1e6,life:100,thick:8,eraseInk:200};g.state.walls=[wall];const ink=g.state.stats.ink;advance(.1);assert(!g.state.walls.some(w=>a.nearestPointOnWall(out,w)&&Math.hypot(a.nearestPointOnWall(out,w).x-out.x,a.nearestPointOnWall(out,w).y-out.y)<out.r),'body clears high-HP walls');assert(g.state.stats.ink<=ink+2,'enemy erasing never refunds ink');
 advance(3);let s=a.whiteBrothersFightSnapshot();assert(s.brushes.length>0,'Mr Out summons brushes');
 const brush=s.brushes[0];g.state.stats.ink=0;assert(a.canStartStroke(brush),'empty-ink pencil can collect');
 a.whitePencilPath(brush,brush,true);for(let i=0;i<4;i++)a.whitePencilPath({x:brush.x-12,y:brush.y},{x:brush.x+12,y:brush.y});
 s=a.whiteBrothersFightSnapshot();assert(s.white>0);assert(s.brushes.find(b=>b.id===brush.id).flee,'empty brush retreats');assert.equal(g.state.stats.ink,0,'collecting whiteout costs no ink');
 const before=out.hp;a.whitePencilPath({x:glue.x-30,y:glue.y},{x:glue.x+30,y:glue.y});assert(out.hp<before,'painting either brother hurts shared health');assert.equal(glue.hp,out.hp);a.resetWhiteToolsStroke();
 advance(4);s=a.whiteBrothersFightSnapshot();assert(s.blobs.length>0&&s.planes.length>0,'Mr Glue leaves glue and launches a plane');
 const blob=s.blobs[0];for(let i=0;i<4;i++)a.eraseWallPath({x:blob.x-12,y:blob.y},{x:blob.x+12,y:blob.y},20);
 assert(a.whiteBrothersFightSnapshot().glueInk>0,'real eraser collects glue');a.resetWhiteToolsStroke();
 a.eraseWallPath({x:out.x-10,y:out.y},{x:out.x+10,y:out.y},20);advance(.05);s=a.whiteBrothersFightSnapshot();assert(s.actors.find(x=>x.kind==='out').glued>0,'glue eraser pins brother');
 const pos={x:out.x,y:out.y};advance(.5);assert(Math.hypot(out.x-pos.x,out.y-pos.y)<.01,'glue actually holds movement');advance(2);assert(a.whiteBrothersFightSnapshot().actors[0].glued===0,'pin expires');
 const paused=JSON.stringify(a.whiteBrothersFightSnapshot());g.state.paused=true;a.update(.3);assert.equal(JSON.stringify(a.whiteBrothersFightSnapshot()),paused,'pause freezes encounter');assert(!a.whitePencilPath(pos,{x:pos.x+30,y:pos.y}));g.state.paused=false;
 const beforeDraw=JSON.stringify(a.whiteBrothersFightSnapshot()),rng=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('draw consumes RNG');};a.drawWhiteBrothersFields();a.drawWhiteBrothersHud();for(const e of [out,glue])a.drawWhiteBrotherBody(e);assert.equal(JSON.stringify(a.whiteBrothersFightSnapshot()),beforeDraw,'render is pure');env.sandbox.Math.random=rng;
 const kills=g.state.kills;a.dealDamage(glue,10000,'reflected',{whiteout:true});assert.equal(out.hp,0);a.killEnemy(glue);assert.equal(g.state.kills,kills+1,'two bodies award one boss kill');assert(!g.state.enemies.includes(glue));assert(a.bossFightResolved(),'only shared defeat resolves boss');assert.equal(a.whiteBrothersFightSnapshot(),null,'defeat clears all supplies and hazards');
 console.log('PASS: White Brothers shared health, wall immunity/clearance, paper-ball contribution, zero-ink brush collection/retreat, whiteout damage, real glue pickup/pinning/release, supplies, pause, pure drawing and victory cleanup.');

 const runs=[];
 for(const [width,height] of [[1280,800],[393,700]]){
  const env=load(true),g=env.sandbox.testGame,a=g.api;env.node('game').getBoundingClientRect=()=>({left:0,top:0,width,height});a.resize();a.resetRun();g.state.wave=20;g.state.timeLeft=0;g.state.enemies=[];a.resetEnemyWave();const host=a.spawnEnemy(true,width*.2,height*.2);g.state.stats.ink=0;g.state.stats.inkRegen=0;
  let seconds=0;
  for(let i=0;i<4000&&g.state.running&&!g.state.betweenWaves;i++){
   if(i%10===0){
    let s=a.whiteBrothersFightSnapshot();if(!s)break;
    if(s.white<35)for(const b of s.brushes.filter(b=>!b.flee&&b.supply>0)){a.resetWhiteToolsStroke();a.whitePencilPath(b,b,true);for(let j=0;j<3;j++)a.whitePencilPath({x:b.x-16,y:b.y},{x:b.x+16,y:b.y});if(a.whiteBrothersFightSnapshot().white>65)break;}
    s=a.whiteBrothersFightSnapshot();if(s.white>10){a.resetWhiteToolsStroke();a.whitePencilPath({x:host.x-28,y:host.y},{x:host.x+28,y:host.y},true);a.resetWhiteToolsStroke();}
    s=a.whiteBrothersFightSnapshot();if(s.glueInk<15&&s.blobs.length){const b=s.blobs[0];a.resetWhiteToolsStroke();for(let j=0;j<3;j++)a.eraseWallPath({x:b.x-14,y:b.y},{x:b.x+14,y:b.y},20);a.resetWhiteToolsStroke();}
    s=a.whiteBrothersFightSnapshot();if(s.glueInk>10){a.eraseWallPath({x:host.x-10,y:host.y},{x:host.x+10,y:host.y},20);a.resetWhiteToolsStroke();}
   }
   a.update(.025);seconds+=.025;
  }
  assert(host.hp<=0&&g.state.betweenWaves,'tools can win full encounter '+JSON.stringify({width,seconds,hp:host.hp,player:g.state.player.hp}));assert(g.state.player.hp>0);assert.equal(g.state.stats.ink,0,'whole fight can be played without ordinary ink');runs.push({width,seconds:Math.round(seconds),hp:g.state.player.hp});
 }
 console.log('PASS: full White Brothers tool-only victories with zero ordinary ink '+JSON.stringify(runs));

};
