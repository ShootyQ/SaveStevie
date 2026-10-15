module.exports=load=>{
 const assert=require('assert'),g=load(true).sandbox.testGame,a=g.api,s=g.state;
 a.resetRun({skipIntro:true});s.enemies=[];
 for(const start of [1,6,11,16,21]){
  s.wave=start;a.startWave({skipIntro:true});assert.equal(s.paper.holes.length,0);assert.equal(a.plaguefireSnapshot().scars.length,0);
  a.addPaperHole({x:130,y:180});a.queuePaperRub({x:300,y:180},{x:310,y:180},20);a.updatePaper(.05);
  const sheet=s.paper,wear=JSON.stringify(sheet.surface);sheet.crewHoles=6;sheet.arcs.push({life:1});
  s.synergies.add('Plaguefire');s.inks.fire=s.inks.poison=1;a.dropPlaguefire({x:210,y:220,burn:1,poison:1});a.updatePlaguefire(2);
  const radius=a.plaguefireSnapshot().patches[0].r;
  a.queuePaperRub({x:350,y:180},{x:360,y:180},20);
  for(let wave=start+1;wave<=start+4;wave++){
   s.wave=wave;a.startWave({skipIntro:true});assert.equal(s.paper,sheet,'same sheet through boss wave');assert.equal(JSON.stringify(sheet.surface),wear,'all partial wear and openings persist');assert.equal(sheet.crewHoles,0,'worker allowance remains per wave');assert.equal(sheet.arcs.length,0);assert.equal(a.plaguefireSnapshot().patches.length,0,'active fire cannot carry damage into a new wave');assert.equal(a.plaguefireSnapshot().scars.length,1);assert.equal(a.plaguefireSnapshot().scars[0].r,radius,'unfinished fire leaves its current footprint');a.updatePaper(.1);assert.equal(JSON.stringify(sheet.surface),wear,'stale rub input cannot wear the new wave');
  }
  // The ordinary clear-out at Wobble's entrance must leave the physical page alone.
  if(start===6){s.timeLeft=0;a.spawnWaveEnemies(.1);a.updateBossEntrance(10);assert.equal(s.paper,sheet);assert.equal(a.plaguefireSnapshot().scars.length,1,'boss entrance retains chapter burns');}
  s.wave=start+5;a.startWave({skipIntro:true});assert.notEqual(s.paper,sheet);assert.equal(s.paper.holes.length,0);assert.equal(s.paper.surface.cells.length,0);assert.equal(a.plaguefireSnapshot().scars.length,0);
 }
 a.addPaperHole({x:130,y:180});a.resetRun({skipIntro:true});assert.equal(s.paper.holes.length,0);assert.equal(a.plaguefireSnapshot().scars.length,0,'new run never inherits chapter damage');
 console.log('PASS: shared five-wave paper through bosses/endless, partial wear and scars, current-size fire burnout, fresh chapter/run, transient rub/arc/crew reset and boss entrance preservation.');
};
