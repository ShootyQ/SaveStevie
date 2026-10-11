module.exports=function(load){
 const assert=require('assert');
 const g=load(true).sandbox.testGame;g.api.resetRun({skipIntro:true});g.state.wave=6;g.api.startWave({skipIntro:true});
 const a=g.api.spawnEnemy(false,90,120,'tank'),b=g.api.spawnEnemy(false,190,120,'tank');
 assert(a&&b);assert.equal(g.api.spawnEnemy(false,290,120,'tank'),null,'third living Chonks is rejected');
 a.chonks.shield=false;assert.equal(g.api.spawnEnemy(false,290,120,'tank'),null,'erasing armor does not free the living-enemy slot');
 a.hp=0;assert(g.api.spawnEnemy(false,290,120,'tank'),'a dead Chonks frees a slot before cleanup');
 g.api.resetRun({skipIntro:true});g.state.wave=5;g.api.startWave({skipIntro:true});
 for(let i=0;i<3;i++)assert(g.api.spawnEnemy(false,90+i*100,120,'tank'),'early-wave behavior is unchanged');
 for(const [W,H] of [[800,700],[360,640],[851,300]]){
  const g=load(true).sandbox.testGame;g.api.resetRun({skipIntro:true});g.state.W=W;g.state.H=H;g.state.player.x=W/2;g.state.player.y=H/2;g.state.wave=5;g.api.startWave({skipIntro:true});g.state.enemies=[];
  const p=g.state.player,e=g.api.spawnEnemy(true,p.x,p.y),brain=g.api.bossBrain(e);
  const ring={pts:[{x:p.x-85,y:p.y-70},{x:p.x+85,y:p.y-70},{x:p.x+85,y:p.y+70},{x:p.x-85,y:p.y+70},{x:p.x-85,y:p.y-70}],hp:10000,maxHp:10000,life:100,thick:8,closed:true};
  const distant={pts:[{x:10,y:90},{x:30,y:90}],hp:10000,maxHp:10000,life:100,thick:8};g.state.walls=[ring,distant];
  assert(g.api.touchesRefuge(e));const hp=p.hp;
  assert(g.api.contactStevie(e));assert(!g.api.touchesRefuge(e),'boxed-in Doom leaves the fort immediately at '+W+'x'+H);
  assert.equal(p.hp,hp-10,'initial contact still hurts');assert(!g.state.walls.includes(ring),'blocked retreat tears its local cover');assert(g.state.walls.includes(distant),'unrelated walls survive');
  brain.cd=999;brain.helperCd=999;g.state.spawnTimer=999;g.state.timeLeft=100;g.state.stats.wallDamage=0;
  for(let i=0;i<200;i++){g.api.update(.05);assert(!g.api.touchesRefuge(e),'retreat resumes a safe orbit');}
  assert.equal(p.hp,hp-10,'no repeated contact ticks over ten seconds');
  e.x=p.x+50;e.y=p.y;brain.contactCd=0;
  const guard={pts:[{x:p.x+25,y:p.y-65},{x:p.x+25,y:p.y+65}],hp:10000,maxHp:10000,life:100,thick:8};g.state.walls=[ring,guard,distant];
  const protectedHp=p.hp;assert(g.api.contactStevie(e));assert(!g.api.touchesRefuge(e),'ink-blocked contact also releases the boss');assert.equal(p.hp,protectedHp,'guarding ink still prevents contact damage');
 }
 console.log('PASS: two living Chonks, armor/death slot handling, unchanged early spawns, boxed-fort Doom escape and ten-second safe orbit at desktop, portrait and landscape sizes.');
};
