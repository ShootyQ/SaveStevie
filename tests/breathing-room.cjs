const assert=require('assert');
module.exports=load=>{
 for(const desktop of [false,true]){
  const env=load(true),g=env.sandbox.testGame,a=g.api,s=g.state;a.resetRun();s.W=1280;s.H=900;s.player.x=640;s.player.y=450;a.desktopUiEnabled=()=>desktop;s.enemies=[];s.walls=[];
  const e=a.spawnEnemy(false,640-(desktop?330:200),450,'sniper');e.shootCd=.01;a.updateSniper(e,.02);assert.equal(s.enemyShots.length,1);
  for(let i=0;i<80;i++)a.updateSniper(e,.05);assert.equal(s.enemyShots.length,1,'no extra pencil while first is outbound');assert(e.shootCd>=.8);
  s.enemyShots=[];a.updateSniper(e,.4);assert.equal(s.enemyShots.length,0,'short breathing room after pencil clears');a.updateSniper(e,.5);assert.equal(s.enemyShots.length,1,'next committed throw follows short cooldown');
  s.enemyShots=[];delete e.sniperAim;e.x=-e.r;e.shootCd=0;assert.equal(a.sniperCanAim(e),false);a.updateSniper(e,.1);assert.equal(s.enemyShots.length,0,'off-page sniper approaches instead of shooting');assert(e.x>-e.r);
 }
 console.log('PASS: touch/desktop single outbound pencil, short post-flight cooldown, subsequent throw and visible sniper entry.');
};
