// Dedicated boss encounters and animated telegraphs in real browsers.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('doodleDefenderBestV4','1')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
   await page.evaluate(()=>{testGame.api.setDevMode(true);testGame.api.resetRun()});
   for(const wave of [5,10,15,20]){
    const warning=await page.evaluate(wave=>{
     const g=testGame;g.api.setDevMode(true);g.api.resetRun();g.state.wave=wave;g.api.startWave();g.state.spawnTimer=9999;g.state.timeLeft=g.state.waveTime-3;g.api.spawnEnemy(true,200,200);
     const e=g.state.enemies[0];e.x=g.state.W*.3;e.y=g.state.H*.35;e.hp=e.maxHp=10000;const b=g.api.bossBrain(e);b.cd=0;
     if(wave===20)g.state.walls=[{pts:[{x:e.x+50,y:e.y-70},{x:e.x+50,y:e.y+70}],thick:8,hp:1000,maxHp:1000,life:300,maxLife:300}];
     g.api.updateBossEncounter(e,.01);g.api.draw();return g.api.bossEncounterSnapshot().bosses[0];
    },wave);assert.ok(warning.cast);await page.screenshot({path:'/tmp/boss-warning-'+wave+'-'+viewport.width+'.png'});
    await page.evaluate(()=>{const g=testGame,e=g.state.enemies[0];g.api.updateBossEncounter(e,1.2);g.api.updateBossFields(.2);g.api.updateEnemyAnimations(.1);g.api.draw()});
    await page.screenshot({path:'/tmp/boss-action-'+wave+'-'+viewport.width+'.png'});
    const pure=await page.evaluate(()=>{const g=testGame,a=JSON.stringify(g.state),b=JSON.stringify(g.api.bossEncounterSnapshot());g.api.draw();return a===JSON.stringify(g.state)&&b===JSON.stringify(g.api.bossEncounterSnapshot())});assert.equal(pure,true);
    const pause=await page.evaluate(()=>{const g=testGame;g.state.paused=true;const a=JSON.stringify(g.api.bossEncounterSnapshot());g.api.update(.3);g.api.draw();return a===JSON.stringify(g.api.bossEncounterSnapshot())});assert.equal(pause,true);
    await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>testGame.api.draw());await page.emulateMedia({reducedMotion:'no-preference'});
   }
   for(const [turn,kind] of [[0,'mirror-orb'],[1,'arc-fan'],[2,'paper-lob']]){
    const result=await page.evaluate(turn=>{
     const g=testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.spawnTimer=9999;
     const portrait=g.state.H>g.state.W;
     const e=g.api.spawnEnemy(true,portrait?g.state.W*.5:90,portrait?Math.max(115,g.state.H*.22):g.state.H*.62);e.hp=e.maxHp=1000;
     const pts=portrait?[{x:25,y:g.state.player.y-60},{x:g.state.W-25,y:g.state.player.y-60}]:[{x:g.state.player.x-60,y:75},{x:g.state.player.x-60,y:g.state.H-20}];
     g.state.walls=[{pts,hp:200,maxHp:200,thick:8,life:100,maxLife:100}];
     const b=g.api.bossBrain(e);b.turn=turn;b.cd=0;g.api.updateBossEncounter(e,.01);g.api.draw();
     return {kind:b.cast.kind,targets:b.cast.targets};
    },turn);
    assert.equal(result.kind,kind);await page.screenshot({path:'/tmp/first-boss-'+kind+'-warning-'+viewport.width+'.png'});
    await page.evaluate(()=>{const g=testGame;g.api.updateBossEncounter(g.state.enemies[0],1.2);g.api.updateEnemyShots(.35);g.api.draw()});
    await page.screenshot({path:'/tmp/first-boss-'+kind+'-flight-'+viewport.width+'.png'});
    const beforeResize=await page.evaluate(()=>testGame.state.enemyShots.map(s=>({x:s.x,y:s.y,startX:s.startX,startY:s.startY,targetX:s.targetX,targetY:s.targetY})));
    await page.setViewportSize({width:viewport.width+20,height:viewport.height+40});await page.evaluate(()=>testGame.api.resize());
    const afterResize=await page.evaluate(()=>testGame.state.enemyShots.map(s=>({x:s.x,y:s.y,startX:s.startX,startY:s.startY,targetX:s.targetX,targetY:s.targetY})));
    beforeResize.forEach((before,i)=>{const after=afterResize[i],dx=after.x-before.x,dy=after.y-before.y;assert.ok(Math.abs(after.startX-before.startX-dx)<1e-7);assert.ok(Math.abs(after.targetX-before.targetX-dx)<1e-7);assert.ok(Math.abs(after.startY-before.startY-dy)<1e-7);assert.ok(Math.abs(after.targetY-before.targetY-dy)<1e-7)});
    await page.setViewportSize(viewport);await page.evaluate(()=>testGame.api.resize());
    const resolution=await page.evaluate(()=>{
     const g=testGame,e=g.state.enemies[0],hp=g.state.player.hp;g.api.updateEnemyShots(6);g.api.draw();return {hpKept:g.state.player.hp===hp,bossHp:e.hp,recovery:g.api.bossBrain(e).recovery,walls:g.state.walls.length};
    });
    assert.equal(resolution.hpKept,true,'cover returns attacks and paper bombs do not hurt Stevie');
    if(turn<2){assert.ok(resolution.bossHp<1000);assert.equal(resolution.recovery,3)}
   }
   await page.evaluate(()=>{const g=testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();const e=g.api.spawnEnemy(true,g.state.W*.3,g.state.H*.4);e.hp=e.maxHp=10000;const x=e.x,y=e.y;g.state.walls=[{pts:[{x:x-65,y:y-65},{x:x+65,y:y-65},{x:x+65,y:y+65},{x:x-65,y:y+65},{x:x-65,y:y-65}],closed:true,thick:8,hp:500,maxHp:500,life:100}];g.api.updateBossEncounter(e,.01);g.api.updateBossEncounter(e,1.8);g.api.draw()});
   assert.equal(await page.evaluate(()=>testGame.api.bossEncounterSnapshot().bosses[0].cast.kind),'breakout');
   await page.screenshot({path:'/tmp/boss-breakout-warning-'+viewport.width+'.png'});
   await page.evaluate(()=>{const g=testGame;g.api.updateBossEncounter(g.state.enemies[0],1.2);g.api.updateBossFields(.1);g.api.updateEnemyAnimations(.1);g.api.draw()});
   assert.equal(await page.evaluate(()=>testGame.state.walls.length),0);await page.screenshot({path:'/tmp/boss-breakout-action-'+viewport.width+'.png'});
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' three first-boss moves/returns/resize and all four boss warnings/actions, enclosure breakout, custom shots/runes, pause, pure rendering and reduced motion');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
