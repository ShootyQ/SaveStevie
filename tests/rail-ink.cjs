const assert=require('assert');
module.exports=load=>{
 const setup=options=>{const env=load(true,options),g=env.sandbox.testGame;g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.W=800;g.state.H=700;g.state.player.x=700;g.state.player.y=350;g.state.enemies=[];g.state.walls=[];g.state.stats.rockDamage=0;g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.synergies.add('Rail Ink');g.state.inks.electric=g.state.inks.repulsion=1;return {g,env};};
 const enemy=(g,x)=>{const e=g.api.spawnEnemy(false,x,350,'grunt');e.hp=e.maxHp=1000;return e;};
 {
  const {g}=setup(),e=enemy(g,200),n=enemy(g,235),far=enemy(g,300);g.api.applyRepulsionContact(e,.8);n.x=e.x+35;far.x=e.x+100;assert.equal(g.api.railInkSnapshot()[0].radius,42,'actual repulsion emits field');assert.equal(g.api.railInkSnapshot()[0].waves.length,1);const hp=e.hp;
  g.api.updateRailInk(.1);assert.equal(far.hp,1000);g.api.updateRailInk(.3);assert(n.hp<1000,'outward front reaches nearby target');assert.equal(e.hp,hp,'host does not hurt itself');const damage=1000-n.hp;g.api.updateRailInk(.2);assert.equal(1000-n.hp,damage,'one hit per ripple');assert.equal(far.hp,1000,'small field excludes distant enemy');
  const radius=g.api.railInkSnapshot()[0].radius;g.api.hitPaper({damage:0,paperElement:'fire'},e);assert.equal(g.api.railInkSnapshot()[0].radius,radius,'ordinary/fire paper cannot widen');
  g.api.hitPaper({damage:0,doodlePayload:{electric:1}},e);assert.equal(g.api.railInkSnapshot()[0].radius,60);g.api.hitPaper({damage:0,electricLevel:1},e);assert.equal(g.api.railInkSnapshot()[0].radius,78);g.api.hitPaper({damage:0,paperElement:'cling'},e);assert.equal(g.api.railInkSnapshot()[0].radius,96);
  for(let i=0;i<20;i++)g.api.hitPaper({damage:0,electricLevel:1},e);assert.equal(g.api.railInkSnapshot()[0].radius,114,'bounded radius');assert(g.api.railInkSnapshot()[0].waves.length<=3,'bounded ripple count');g.api.updateRailInk(.65);assert(far.hp<1000,'widened wave reaches outside original radius');g.api.updateRailInk(2);assert.equal(g.api.railInkSnapshot().length,0);assert.equal(e.charged,0);assert(!g.api.widenRailSurge(e,{electricLevel:1}),'paper alone cannot start a surge');
 }
 {
  const {g}=setup(),a=enemy(g,200),b=enemy(g,205),n=enemy(g,220);g.api.startRailSurge(a);g.api.startRailSurge(b);g.api.updateRailInk(.3);const max=g.api.electricTuning(1).fieldDps*.65;assert(Math.abs(1000-n.hp-max)<1e-8,'overlapping fields share damage recovery');
  g.api.widenRailSurge(a,{electricLevel:1});g.api.updateRailInk(.1);assert(Math.abs(1000-n.hp-max)<1e-8,'rapid paper ripples cannot bypass recovery');
 }
 {
  const {g}=setup(),e=enemy(g,200);e.immunity='electric';assert(!g.api.startRailSurge(e));e.immunity='';e.flight={};assert(!g.api.startRailSurge(e));delete e.flight;g.api.startRailSurge(e);e.hp=0;g.api.updateRailInk(.02);assert.equal(g.api.railInkSnapshot().length,0,'dead emitter disappears');
  e.hp=1000;g.api.startRailSurge(e);g.state.synergies.delete('Rail Ink');g.api.updateRailInk(.02);assert.equal(g.api.railInkSnapshot().length,0,'removing synergy clears field');
 }
 {
  const {g,env}=setup(),e=enemy(g,200);g.api.startRailSurge(e);g.state.paused=true;const before=JSON.stringify(g.api.railInkSnapshot());g.api.update(.2);assert.equal(JSON.stringify(g.api.railInkSnapshot()),before);g.state.paused=false;g.api.updateRailInk(.1);
  e.x+=20;e.y+=10;assert.equal(g.api.railInkSnapshot()[0].x,220,'field follows emitter including resize movement');const state=JSON.stringify(g.state),fx=JSON.stringify(g.api.railInkSnapshot()),random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('visual RNG')};g.api.drawRailInk();assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(g.api.railInkSnapshot()),fx);env.sandbox.Math.random=random;g.api.resetRun();assert.equal(g.api.railInkSnapshot().length,0,'new run discards fields');
 }
 {
  const {g,env}=setup({reduced:true}),e=enemy(g,200);g.api.startRailSurge(e);g.api.updateRailInk(.2);const before=JSON.stringify(g.api.railInkSnapshot()),calls=env.calls.length;g.api.drawRailInk();assert.equal(JSON.stringify(g.api.railInkSnapshot()),before);assert(env.calls.slice(calls).some(c=>c[0]==='arc'),'reduced mode uses calm circles');
 }
 console.log('PASS: actual repulsion surge, outward reach/one hit/no self damage, elemental paper widening and cap, non-electric/no-field guards, shared crowd recovery, lifecycle/death/removal, pause/follow/reset and pure rendering.');
};
