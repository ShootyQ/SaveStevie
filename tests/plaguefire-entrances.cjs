const assert=require('assert');
module.exports=load=>{
 function setup(){const env=load(true),g=env.sandbox.testGame,a=g.api,s=g.state;a.resetRun({skipIntro:true});s.W=800;s.H=700;s.player.x=650;s.player.y=220;s.enemies=[];s.walls=[];s.synergies.add('Plaguefire');s.stats.rockRate=0;env.sandbox.Math.random=()=>0;return {env,g,a,s};}
 for(const burnt of [false,true]){
  const {a,s}=setup();a.dropPlaguefire({x:250,y:220,burn:1,poison:1});a.updatePlaguefire(burnt?11:5);
  const e=a.spawnEnemy(false,250,220,'grunt');assert.equal(s.paper.holes.length,0,'no eraser-made entrance');assert(a.updatePaperEnemy(e,.01),'burn is a real entrance');assert.equal(e.paperTunnel.entryId,'burn:1');assert(!a.underPaper(e),'visible while standing on exposed desk');
  a.updatePaperEnemy(e,.51);for(let i=0;i<100&&!a.underPaper(e);i++)a.updatePaperEnemy(e,.05);assert(a.underPaper(e),'only hide after reaching intact paper');assert(!a.plaguefirePaperMissing(e));
  a.dropPlaguefire({x:400,y:220,burn:1,poison:1});if(burnt)a.updatePlaguefire(11);
  for(let i=0;i<250&&e.paperTunnel.phase!=='emerge';i++)a.updatePaperEnemy(e,.05);assert.equal(e.paperTunnel.phase,'emerge');assert(a.plaguefirePaperMissing(e));assert(!a.underPaper(e),'next desk opening exposes the monster');a.updatePaperEnemy(e,.71);e.stun=0;e.paperCooldown=0;assert(!a.updatePaperEnemy(e,.01),'one trip per monster remains');
 }
 {const {a}=setup();a.dropPlaguefire({x:250,y:220,burn:1,poison:1});const e=a.spawnEnemy(false,250,220,'grunt');assert(!a.updatePaperEnemy(e,.01),'new pin-sized burn is too small');a.updatePlaguefire(11);e.x=282;assert(!a.updatePaperEnemy(e,.01),'partial body over rim cannot enter');e.x=250;e.waveBoss=true;assert(!a.updatePaperEnemy(e,.01),'boss never burrows');}
 {const {a,env}=setup();a.dropPlaguefire({x:250,y:220,burn:1,poison:1});a.updatePlaguefire(11);const e=a.spawnEnemy(false,250,220,'grunt');let rolls=0;env.sandbox.Math.random=()=>{rolls++;return .99;};for(let i=0;i<20;i++)a.updatePaperEnemy(e,.01);assert.equal(rolls,1,'failed chance is not rerolled on every frame');e.x=500;a.updatePaperEnemy(e,.01);e.x=250;env.sandbox.Math.random=()=>0;assert(a.updatePaperEnemy(e,.01),'a later encounter can try again');}
 // Indexed collision queries match the exact circular openings, including across cells and resize.
 {const {a,s}=setup();for(let batch=0;batch<10;batch++){for(let i=0;i<12;i++)a.dropPlaguefire({x:40+(i*71+batch*31)%720,y:110+(i*83+batch*47)%500,burn:1,poison:1});a.updatePlaguefire(10);}const scars=a.plaguefireSnapshot().scars;for(let x=0;x<800;x+=17)for(let y=80;y<700;y+=19)assert.equal(a.plaguefirePaperMissing({x,y}),scars.some(p=>Math.hypot(x-p.x,y-p.y)<=p.r));a.movePlaguefire(21,17);const p=scars[0];assert(a.plaguefirePaperMissing({x:p.x+21,y:p.y+17}));a.resetPlaguefire();assert(!a.plaguefirePaperMissing({x:p.x+21,y:p.y+17}));}
 console.log('PASS: active and burnt Plaguefire entrances without eraser holes, full-body/rim/boss guards, one roll per encounter, visible exposed crossings, real intact-paper travel, next-opening emergence, single trips, indexed query parity and move/reset.');
};
