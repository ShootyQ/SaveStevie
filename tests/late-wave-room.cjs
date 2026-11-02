const assert=require('assert');
module.exports=load=>{
 const g=load(true).sandbox.testGame,a=g.api,s=g.state;a.resetRun({skipIntro:true});s.waveTime=60;
 for(const wave of [8,11,12,13,15,20]){s.wave=wave;s.timeLeft=57;const oldGrowth=1+.25*Math.max(0,Math.min(1,(wave-8)/12)),factor=wave===12?.68:wave>=13?.6:1;assert(Math.abs(a.lateWaveGrowth()-oldGrowth*factor)<1e-10);const oldBudget=Math.round(60*(1.05*a.wavePressure(8)/(1.48-8*.034))*oldGrowth)+4;assert(a.scheduledWaveBudget()<=oldBudget*factor+3);assert.equal(a.enemyHpScale(20),4);}
 s.wave=14;s.enemies=[];let pool;const pick=a.pick;a.pick=list=>{pool=Array.from(list);return list[0];};a.enemyType();a.pick=pick;assert.equal(pool.filter(t=>t==='sniper').length,8);assert.equal(pool.filter(t=>t==='tank').length,2);
 // Three real outgoing shots earn an eraser pass, even with a clear route to Stevie.
 s.W=800;s.H=700;s.player.x=400;s.player.y=350;s.enemies=[];s.enemyShots=[];const e=a.spawnEnemy(false,200,350,'sniper');
 for(let i=0;i<3;i++){a.fireSniper(e);s.enemyShots=[];}assert.equal(e.sniperRounds,3);
 const wall={pts:[{x:250,y:200},{x:350,y:200}],hp:100,maxHp:100,thick:8,life:30,maxLife:30};s.walls=[wall];assert(!a.shotBlocked(e.x,e.y,s.player.x,s.player.y,3));a.updateSniper(e,.01);assert(e.sniperErase?.cleanup);const target={...e.sniperErase};assert.equal(target.y,200);assert.equal(s.enemyShots.length,0,'pink warning precedes eraser');a.updateSniper(e,.7);const shot=s.enemyShots[0];assert(shot.eraser);assert(shot.vy<0,'cleanup targets the wall, not Stevie');assert.equal(shot.damage,0);assert.equal(e.sniperRounds,0);const hp=s.player.hp;for(let i=0;i<30;i++)a.updateEnemyShots(.05);assert.equal(s.player.hp,hp);assert(!s.walls.includes(wall)||wall.pts.length<2||s.walls.some(w=>w!==wall),'eraser removes a section');
 e.sniperRounds=3;e.sniperFollowUp=0;delete e.sniperAim;s.walls=[];s.enemyShots=[];a.updateSniper(e,.01);assert(!e.sniperErase,'no cleanup with no walls');
 console.log('PASS: reduced late-wave budgets/cadence, specialist weighting, unchanged HP, three-shot cleanup with visible windup, wall aim, real erasure and no Stevie damage.');
};
