const assert=require('assert');
module.exports=load=>{
 const setup=()=>{const g=load(true).sandbox.testGame;g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.W=800;g.state.H=700;g.state.player.x=700;g.state.player.y=350;g.state.enemies=[];g.state.walls=[];return g;};
 const wall=x=>({pts:[{x,y:200},{x,y:500}],thick:8,hp:1000,maxHp:1000,life:1000,maxLife:1000});
 {
  const g=setup(),a=g.api.spawnEnemy(false,200,350,'grunt'),b=g.api.spawnEnemy(false,200,350,'grunt');
  for(let i=0;i<60;i++)g.api.separateEnemies(1/60);
  assert(Math.hypot(a.x-b.x,a.y-b.y)>a.r,'coincident doodles gently separate');assert(Math.abs((a.x+b.x)/2-200)<.01,'balanced crowd does not drift');
  const heavy=g.api.spawnEnemy(false,300,350,'tank'),small=g.api.spawnEnemy(false,310,350,'grunt'),hx=heavy.x,sx=small.x;g.api.separateEnemies(.03);assert(Math.abs(small.x-sx)>Math.abs(heavy.x-hx),'heavy doodle shoves small one more');
  a.x=295;b.x=290;g.state.walls=[wall(300)];for(let i=0;i<60;i++)g.api.separateEnemies(.02);assert(a.x<300&&b.x<300,'separation cannot push through wall');
  b.freeze=1;const x=b.x;g.api.separateEnemies(.02);assert.equal(b.x,x,'frozen enemy stays still');
  g.state.paused=true;const before=JSON.stringify(g.state.enemies);g.api.update(.03);assert.equal(JSON.stringify(g.state.enemies),before,'paused loop does not separate');g.state.paused=false;
  const boss=g.api.spawnEnemy(true,200,350,'boss');boss.waveBoss=true;const bx=boss.x;g.api.separateEnemies(.02);assert.equal(boss.x,bx,'boss excluded');
  const airborne=g.api.spawnEnemy(false,heavy.x,heavy.y,'grunt');airborne.flight={};const ax=airborne.x;g.api.separateEnemies(.02);assert.equal(airborne.x,ax);
 }
 {
  const g=setup(),dash=g.api.spawnEnemy(false,220,350,'sprinter'),friend=g.api.spawnEnemy(false,250,350,'tank');
  g.api.updateDash(dash,.02);assert(dash.hurdle,'monster starts a hurdle');assert.equal(dash.hurdlesLeft,1,'monster alone preserves wall vault');const destination=dash.hurdle.to.x;assert(destination>friend.x+friend.r);
  for(let i=0;i<21;i++)g.api.updateDash(dash,.02);assert(!dash.hurdle);assert.equal(dash.x,destination);
  for(let i=0;i<40;i++)g.api.updateDash(dash,.02);const next=g.api.spawnEnemy(false,dash.x+28,350,'grunt');g.api.updateDash(dash,.02);assert(dash.hurdle,'can hurdle another monster after recovery');
 }
 {
  const g=setup(),dash=g.api.spawnEnemy(false,260,350,'sprinter');g.api.spawnEnemy(false,285,350,'grunt');const w=wall(300);g.state.walls=[w];g.api.updateDash(dash,.02);assert(dash.hurdle&&dash.hurdle.wall===w,'crowded monster and wall jumped together');assert.equal(dash.hurdlesLeft,0);assert(dash.hurdle.to.x>300+dash.r);assert.equal(w.hp,1000);
  g.state.walls.push(wall(dash.x+8));const x=dash.x;g.api.updateDash(dash,.1);assert(!dash.hurdle&&dash.stun>0);assert.equal(dash.x,x,'new backup wall intercepts crowd jump');
 }
 {
  const g=setup(),dash=g.api.spawnEnemy(false,260,350,'sprinter');g.api.spawnEnemy(false,285,350,'grunt');g.state.walls=[wall(300),wall(325)];g.api.updateDash(dash,.02);assert(!dash.hurdle,'cannot vault two close walls');
  dash.x=640;g.state.walls=[];g.api.spawnEnemy(false,665,350,'grunt');g.api.updateDash(dash,.02);assert(!dash.hurdle,'cannot vault into fort');
 }
 {
  const g=setup(),dash=g.api.spawnEnemy(false,150,350,'sprinter'),boss=g.api.spawnEnemy(false,180,350,'tank');boss.waveBoss=true;g.api.updateDash(dash,.02);assert(dash.hurdle,'Dash also hurdles a grounded boss without pushing it');assert.equal(boss.x,180);
 }
 console.log('PASS: gentle bounded wall-safe crowd separation, heavy shoving, freeze/boss/flight exclusions, repeat monster hurdles, combined monster-wall vault, backup interception and fort safety.');
};
