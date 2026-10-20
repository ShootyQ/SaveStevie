const assert=require('assert');
module.exports=load=>{
 const env=load(true),g=env.sandbox.testGame,a=g.api,c=env.node('game'),button=env.node('eraserBtn');
 a.setFirstLessonsEnabled(false);a.resetRun({skipIntro:true});g.state.enemies=[];g.state.walls=[];
 const e=a.spawnEnemy(false,180,200,'scrubber'),event=(id,x,y,button=2)=>({pointerId:id,clientX:x,clientY:y,button,preventDefault(){}});
 for(let i=0;i<10;i++){c.listeners.pointerdown(event(i,180,200));c.listeners.pointerup(event(i,180,200));}
 assert.equal(e.eraseHits||0,0,'repeated clicks never count as rubbing');
 c.listeners.pointerdown(event(20,180,200));
 for(const x of [181,179,182,178,180])c.listeners.pointermove(event(20,x,200));
 assert.equal(e.eraseHits||0,0,'stationary jitter never counts as rubbing');
 for(let x=181;x<=186;x++)c.listeners.pointermove(event(20,x,200));
 assert.equal(e.eraseHits,1,'slow one-pixel samples accumulate into a real rub');
 c.listeners.pointerup(event(20,186,200));
 c.listeners.pointerdown(event(21,186,200));c.listeners.pointerup(event(21,186,200));
 assert.equal(e.eraseHits,1,'clicking after a rub earns no extra hit');
 // Mobile tool hold uses the same motion gate.
 button.listeners.pointerdown(event(30,0,0,0));c.listeners.pointerdown(event(31,186,200,0));
 assert.equal(e.eraseHits,1);c.listeners.pointermove(event(31,180,200,0));assert.equal(e.eraseHits,2);
 c.listeners.pointerup(event(31,180,200,0));button.listeners.pointerup(event(30,0,0,0));
 console.log('PASS: click/tap spam and jitter rejected, slow rubbing accumulated, real mouse/touch rubs preserved.');
};
