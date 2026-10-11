module.exports=function(load){
 const assert=require('assert'),env=load(true),g=env.sandbox.testGame;
 g.api.resetRun({skipIntro:true});
 const rub=seconds=>{for(let i=0;i<Math.round(seconds/.05);i++){g.api.queuePaperRub({x:100,y:180},{x:110,y:180});g.api.updatePaper(.05);}};
 rub(.45);const wear=g.state.paper.patches[0].wear,clock=g.state.paper.clock;
 g.state.paper.arcs.push({life:.2});g.api.queuePaperRub({x:100,y:180},{x:110,y:180});
 g.state.wave=2;g.api.startWave({skipIntro:true});
 assert.equal(g.state.paper.patches[0].wear,wear,'partial wear carries to wave two');
 assert.equal(g.state.paper.clock,clock);assert.equal(g.state.paper.arcs.length,0);
 g.api.updatePaper(.1);assert.equal(g.state.paper.patches[0].wear,wear,'queued rubbing does not carry');
 rub(.55);assert.equal(g.state.paper.holes.length,1,'wear from both waves opens a hole');
 rub(.2); // Existing hole cannot wear again.
 g.api.queuePaperRub({x:250,y:180},{x:260,y:180});g.api.updatePaper(.05);
 for(const wave of [3,4,5]){
  const sheet=g.state.paper;g.state.wave=wave;g.api.startWave({skipIntro:true});
  assert.strictEqual(g.state.paper,sheet,'opening chapter keeps same sheet');
  assert.equal(g.state.paper.holes.length,1);assert(g.state.paper.patches.length>0);
  assert.equal(g.state.stats.ink,g.state.stats.maxInk);
 }
 env.calls.length=0;g.api.drawPaper();
 assert(!env.calls.some(c=>c[0]==='fillText'&&/^\d+%$/.test(c[1])),'no paper percentages');
 assert(env.calls.some(c=>c[0]==='ellipse'),'natural wear remains visible');
 g.state.wave=6;g.api.startWave({skipIntro:true});assert.equal(g.state.paper.holes.length,0);assert.equal(g.state.paper.patches.length,0);
 rub(.2);g.state.wave=7;g.api.startWave({skipIntro:true});assert.equal(g.state.paper.patches.length,0,'later waves refresh');
 g.api.resetRun({skipIntro:true});rub(.2);g.api.startWave({skipIntro:true});assert.equal(g.state.paper.patches.length,0,'same-wave test restart refreshes');
 rub(.2);g.state.wave=4;g.api.startWave({skipIntro:true});assert.equal(g.state.paper.patches.length,0,'direct test jump refreshes');
 rub(.2);g.state.wave=3;g.api.startWave({skipIntro:true});assert.equal(g.state.paper.patches.length,0,'backward jump refreshes');
 rub(.2);g.api.resetRun({skipIntro:true});assert.equal(g.state.paper.patches.length,0,'new run refreshes');
 console.log('PASS: shared opening-chapter wear and holes, fresh wave six/later/restarts, transient cleanup and natural wear without percentages.');
};
