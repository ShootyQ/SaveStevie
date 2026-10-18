const assert=require('assert');
module.exports=load=>{
 function setup(options={}){const env=load(true,options),g=env.sandbox.testGame,a=g.api;a.resetRun();g.state.wave=12;g.state.waveTime=g.state.timeLeft=300;g.state.spawnTimer=99999;g.state.stats.inkRegen=0;g.state.stats.ink=40;g.state.stats.wallDamage=0;const e=a.spawnEnemy(false,235,250,'gnawer');e.hp=e.maxHp=1000;const w={pts:[{x:250,y:100},{x:250,y:500}],hp:1000,maxHp:1000,thick:8,life:100,maxLife:100,eraseInk:80};g.state.walls=[w];return {env,g,a,e,w};}
 const advance=(a,t)=>{for(let i=0;i<Math.round(t/.025);i++)a.update(.025);};
 const until=(a,pred,t=4)=>{for(let i=0;i<t/.025&&!pred();i++)a.update(.025);assert(pred(),'expected phase within '+t+' seconds');};
 {
  const {g,a,e,w}=setup(),ink=g.state.stats.ink;
  until(a,()=>a.chompzillaSnapshot(e)?.bites===1);assert.equal(a.chompzillaSnapshot(e).phase,'chew');assert.equal(w.hp,1000,'first bite does not damage the whole line');assert.equal(g.state.walls.length,1);assert.equal(w.pts.length,2);
  until(a,()=>a.chompzillaSnapshot(e)?.phase==='squeeze');assert.equal(a.chompzillaSnapshot(e).bites,2);assert.equal(g.state.walls.length,2,'second bite leaves two wall remnants');
  const gap=a.chompzillaSnapshot(e).point;assert(g.state.walls.every(w=>Math.hypot(a.nearestPointOnWall(gap,w).x-gap.x,a.nearestPointOnWall(gap,w).y-gap.y)>=e.r+w.thick/2+2));
  assert(g.state.walls.some(w=>a.nearestPointOnWall({x:250,y:150},w).y===150));assert(g.state.walls.some(w=>a.nearestPointOnWall({x:250,y:450},w).y===450));assert.equal(g.state.stats.ink,ink,'monster-created gap gives no erase refund');assert(g.state.walls.every(w=>w.hp===w.maxHp&&w.maxHp<1000),'remaining material retains proportional durability');
  advance(a,1.2);assert(e.x>250+e.r,'monster actually moves through its gap');
 }
 {
  const {g,a,e,w}=setup();const other={...w,pts:w.pts.map(p=>({...p,x:278}))};g.state.walls.push(other);
  until(a,()=>a.chompzillaSnapshot(e)?.phase==='squeeze');assert(g.state.walls.includes(other),'one bite opening never erases adjacent lines');assert.equal(other.hp,1000);
  advance(a,.65);assert(e.x<278-e.r,'second line still blocks the wriggle');
  until(a,()=>!g.state.walls.includes(other),4);assert(e.x<278,'second layer needs its own two bites before crossing');
 }
 {
  const {g,a,e,w}=setup();until(a,()=>a.chompzillaSnapshot(e)?.bites===1);a.eraseWallPath({x:250,y:110},{x:250,y:110},15);assert(!g.state.walls.includes(w));advance(a,.05);assert.notEqual(a.chompzillaSnapshot(e).phase,'miss','erasing a distant end does not cancel the targeted bite');
  a.eraseWallPath({x:250,y:250},{x:250,y:250},20);advance(a,.025);assert.equal(a.chompzillaSnapshot(e).phase,'miss','erase his mouthful to make him miss');assert.equal(a.chompzillaSnapshot(e).bites,0);advance(a,.2);assert.equal(a.chompzillaFrame(e),12);advance(a,.6);assert.equal(a.chompzillaSnapshot(e).phase,'walk');
 }
 {
  const {g,a,e}=setup();advance(a,.2);e.freeze=1;const before=JSON.stringify(a.chompzillaSnapshot(e));advance(a,.25);assert.equal(JSON.stringify(a.chompzillaSnapshot(e)),before,'freeze holds bite progress');e.freeze=0;e.stun=1;advance(a,.25);assert.equal(JSON.stringify(a.chompzillaSnapshot(e)),before,'stun also pauses chomping');e.stun=0;
  g.state.paused=true;a.update(.3);assert.equal(JSON.stringify(a.chompzillaSnapshot(e)),before);g.state.paused=false;g.state.stats.wallDamage=10;const hp=e.hp;advance(a,.1);assert(e.hp<hp,'wall damage still applies during windup');
  const point=a.chompzillaSnapshot(e).point;a.moveChompzilla(10,20);assert.equal(a.chompzillaSnapshot(e).point.x,point.x+10);assert.equal(a.chompzillaSnapshot(e).point.y,point.y+20);
 }
 {
  const {g,a,e,env}=setup({images:true});advance(a,.2);const before=JSON.stringify(g.state),phase=JSON.stringify(a.chompzillaSnapshot(e)),rng=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('drawing uses combat RNG');};env.calls.length=0;assert(a.drawChompzilla(e));assert.equal(env.calls.filter(c=>c[0]==='drawImage').length,1,'full drawn sprite, not separate facial/body parts');assert(!env.calls.some(c=>['arc','ellipse','beginPath'].includes(c[0])));a.drawChompzillaMarks();assert.equal(JSON.stringify(g.state),before);assert.equal(JSON.stringify(a.chompzillaSnapshot(e)),phase);env.sandbox.Math.random=rng;
  a.resetChompzilla();assert.equal(a.chompzillaSnapshot(e),null);
 }
 {
  const env=load(true),g=env.sandbox.testGame,a=g.api;a.resetRun();g.state.wave=11;assert.equal(a.spawnScheduledEnemy(100,100,'gnawer',true),null);g.state.wave=12;assert(a.spawnScheduledEnemy(100,100,'gnawer',true));assert(a.spawnScheduledEnemy(200,100,'gnawer',true));assert.equal(a.spawnEnemy(false,300,100,'gnawer'),null,'at most two alive');let pool;a.pick=list=>{pool=[...list];return list[0];};a.enemyType();assert(!pool.includes('gnawer'),'full cap is excluded before random selection');
 }
 console.log('PASS: Chompzilla two-bite local gaps, retained wall material/HP/no refund, real gap traversal, independently blocked layers, geometric target retention/missed bites, freeze/stun/pause, wall damage, pure full-sprite art, resize/reset and capped wave-12 availability.');
};
