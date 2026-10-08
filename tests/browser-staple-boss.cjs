// Optional browser regression for enemy personality motion and canvas rendering.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  await page.evaluate(()=>{const g=testGame;g.api.setDevMode(true);g.api.resetRun();g.state.wave=10;g.api.startWave();g.state.timeLeft=0;g.api.update(.01);g.api.update(2);g.api.draw()});
  assert.equal(await page.evaluate(()=>testGame.api.stapleIntroPose().stage),'snap');
  await page.screenshot({path:'/tmp/staple-entry-'+viewport.width+'.png'});
  await page.evaluate(()=>{const g=testGame;g.state.paused=true;const age=g.api.stapleIntroPose().age;g.api.update(.4);if(g.api.stapleIntroPose().age!==age)throw Error('entrance advanced during pause');g.state.paused=false;g.api.update(1.3)});
  assert.equal(await page.evaluate(()=>testGame.state.enemies.filter(e=>e.waveBoss).length),1);
  const liveFight=await page.evaluate(()=>{
   const g=testGame,e=g.state.enemies.find(n=>n.waveBoss);let helpers=0,travel=0,idleTravel=0,flights=0;const attacks=new Set();
   // Observe a full phase without ending it through incidental damage/death.
   e.hp=e.maxHp=100000;g.state.player.hp=g.state.player.maxHp=100000;g.api.updateBossEncounter(e,0);
   for(let i=0;i<900;i++){
    const x=e.x,y=e.y,previous=g.api.stapleSnapshot(e).attack;g.api.update(1/30);travel+=Math.hypot(e.x-x,e.y-y);
    if(!previous&&!g.api.stapleSnapshot(e).attack)idleTravel+=Math.hypot(e.x-x,e.y-y);
    const s=g.api.stapleSnapshot(e);if(s.attack)attacks.add(s.attack);flights=Math.max(flights,s.deployments.length);
    helpers=Math.max(helpers,g.state.enemies.filter(n=>n.type==='jamling').length);
   }
   g.api.draw();return {helpers,travel,idleTravel,flights,attacks:[...attacks],finite:g.state.enemies.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)),running:g.state.running};
  });assert.ok(liveFight.helpers>0&&liveFight.helpers<=6&&liveFight.finite&&liveFight.running);
  assert.ok(liveFight.idleTravel>250,JSON.stringify(liveFight));assert.ok(liveFight.travel>400,JSON.stringify(liveFight));assert.ok(liveFight.flights>0);for(const move of ['fan','rush','punch'])assert.ok(liveFight.attacks.includes(move),JSON.stringify(liveFight));
  console.log('Phase-one '+viewport.width+': '+Math.round(liveFight.idleTravel)+'px between attacks; fan, rush, punch and visible helper flights observed.');
  const moves=[['fan','rush','punch'],['zipper','drag','nests'],['barrage','snap','jam']];
  for(let phase=1;phase<=3;phase++)for(let index=0;index<3;index++){
   const result=await page.evaluate(({phase,index})=>{
    const g=testGame;g.api.resetRun();g.state.wave=10;g.api.startWave();g.state.timeLeft=0;
    const p=g.state.player,e=g.api.spawnEnemy(true,p.x-140,p.y-70),b=g.api.bossBrain(e);e.hp=e.maxHp*[.9,.5,.25][phase-1];g.api.updateBossEncounter(e,0);b.cd=0;b.staple.turn=index;
    if(index===1&&phase===2||index===2&&phase===1)g.api.createWall([{x:e.x+50,y:e.y-25},{x:e.x+50,y:e.y+25}]);
    g.api.updateBossEncounter(e,.01);g.api.updateEnemyAnimations(.01);g.api.draw();
    const state=JSON.stringify(g.state),brain=JSON.stringify(g.api.bossEncounterSnapshot());g.api.draw();const pure=state===JSON.stringify(g.state)&&brain===JSON.stringify(g.api.bossEncounterSnapshot());
    return {kind:b.cast.kind,phase:g.api.stapleSnapshot(e).phase,pure};
   },{phase,index});
   assert.equal(result.kind,moves[phase-1][index]);assert.equal(result.phase,phase);assert.ok(result.pure);
   await page.screenshot({path:'/tmp/staple-'+moves[phase-1][index]+'-'+viewport.width+'.png'});
   const action=await page.evaluate(()=>{
    const g=testGame,e=g.state.enemies.find(n=>n.waveBoss);g.api.updateBossEncounter(e,2.01);g.api.updateBossEncounter(e,.15);g.api.updateEnemyAnimations(.1);g.api.draw();
    const state=JSON.stringify(g.api.bossEncounterSnapshot());g.state.paused=true;g.api.update(.5);const paused=state===JSON.stringify(g.api.bossEncounterSnapshot());g.state.paused=false;
    return {paused,finite:g.state.enemies.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y))};
   });assert.ok(action.paused&&action.finite);
   if(phase===1&&index===0)await page.screenshot({path:'/tmp/staple-jam-spit-'+viewport.width+'.png'});
  }
  const minion=await page.evaluate(()=>{
   const g=testGame;g.state.enemies=[];g.state.enemyShots=[];const e=g.api.spawnEnemy(false,g.state.player.x-75,g.state.player.y-65,'jamling');g.api.updateEnemyAnimations(0);g.api.draw();
   const pixels=()=>g.dom.ctx.getImageData(0,0,g.state.W,g.state.H).data.reduce((sum,v,i)=>(sum+v*(i%17+1))>>>0,0);
   const before=pixels();e.x+=5;g.api.updateEnemyAnimations(.1);g.api.draw();return {before,after:pixels(),facing:g.api.enemyFacing(e)};
  });assert.notEqual(minion.before,minion.after);assert.equal(minion.facing,1);
  await page.screenshot({path:'/tmp/jamling-'+viewport.width+'.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>testGame.api.enemyMotionReduced(),null,{polling:50});
  assert.equal(await page.evaluate(()=>testGame.api.enemyAnimationPose(testGame.state.enemies[0]).y),0);
  await page.setViewportSize({width:viewport.height,height:viewport.width});
  await page.evaluate(()=>{testGame.api.resize();testGame.api.draw()});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' Staple Snack entrance, nine attack warnings/actions, Jamling pixels/facing, pause, pure rendering, reduced motion and rotation');await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
