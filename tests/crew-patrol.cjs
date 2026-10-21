const assert=require('assert');
module.exports=load=>{
 const env=load(true),g=env.sandbox.testGame,a=g.api,s=g.state;a.resetRun();s.W=800;s.H=700;s.player.x=400;s.player.y=350;s.wave=16;a.startWave();s.enemies=[];s.walls=[];s.timeLeft=300;
 const e=a.spawnEnemy(false,54,180,'papertearer'),yank=a.spawnEnemy(false,700,200,'wallpuller');assert.equal(e.r,12);assert.equal(yank.r,12);const sites=new Set();let last='';
 for(let i=0;i<2400;i++){a.updateHardhat(e,.1);a.updateHardhatBombs(.1);if(e.crew.phase==='tear'&&last!=='tear')sites.add(Math.round(e.x)+','+Math.round(e.y));last=e.crew.phase;}
 assert(sites.size>=3,'keeps cutting at different patrol sites');assert(s.paper.crewHoles<=6,'reuses openings after six new holes');assert.equal(s.enemies.filter(n=>n.specialistJob?.kind==='tunnel').length,20,'repeated shortcuts call up to twenty runners');
 const goal={...e.ripGoal};a.moveHardhatCrew(10,20);assert.equal(e.ripGoal.x,goal.x+10);assert.equal(e.ripGoal.y,goal.y+20);
 a.desktopUiEnabled=()=>true;assert(a.sniperRange()>=350&&a.sniperRange()<=550);a.desktopUiEnabled=()=>false;assert.equal(a.sniperRange(),260);
 s.synergies.add('Plaguefire');a.dropPlaguefire({x:200,y:200,burn:2,poison:2});a.updatePlaguefire(3);env.calls.length=0;const snap=JSON.stringify(a.plaguefireSnapshot());a.drawPlaguefire();assert(env.calls.some(c=>c[0]==='drawImage'),'active pool reveals cached burned desk before expiry');assert.equal(JSON.stringify(a.plaguefireSnapshot()),snap);assert.equal(a.plaguefireSnapshot().scars.length,0);
 console.log('PASS: smaller hardhats, repeating cut/patrol/call with reusable holes and twenty-runner cap, patrol resize, middle sniper range and visible active Plaguefire burn-through.');
};
