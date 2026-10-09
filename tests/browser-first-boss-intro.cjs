// Optional browser regression for enemy personality motion and canvas rendering.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  await page.evaluate(async()=>{const g=testGame;g.api.setAudioVolume('musicVolume',.2);g.api.startSplashMusic();await g.api.unlockSoundEffects();g.state.wave=5;g.api.startWave();g.state.timeLeft=0;g.state.spawnTimer=999;g.api.createWall([{x:40,y:200},{x:200,y:200}]);g.api.update(.01);g.api.draw()});
  assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().ready),27);assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().failed),0);
  await page.evaluate(()=>{testGame.api.toggleMusic();testGame.api.toggleMusic()});
  assert.equal(await page.locator('#gameMusic').evaluate(a=>a.paused),true);
  assert.equal(await page.evaluate(()=>testGame.api.firstBossIntroActive()),true);
  assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().voices.some(v=>v.kind==='bossStomp')),true);
  await page.mouse.click(100,220);assert.equal(await page.evaluate(()=>testGame.state.drawing),false);
  await page.evaluate(()=>{testGame.state.paused=true;testGame.api.update(5)});assert.equal(await page.evaluate(()=>testGame.api.firstBossIntroPose().age),0);
  await page.evaluate(()=>{testGame.state.paused=false;testGame.api.update(3.5);testGame.api.draw()});
  assert.equal(await page.evaluate(()=>testGame.api.firstBossIntroPose().stage),'roar');assert.equal(await page.evaluate(()=>testGame.state.walls.length),1);
  assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().voices.some(v=>v.kind==='bossRoar')),true);
  await page.screenshot({path:'/tmp/first-boss-roar-'+viewport.width+'.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>testGame.api.enemyMotionReduced(),null,{polling:50});assert.equal(await page.evaluate(()=>testGame.api.firstBossIntroPose().zoom),1);
  await page.evaluate(()=>{testGame.state.inks.blast=1;testGame.api.update(2.65);testGame.api.draw()});
  assert.equal(await page.evaluate(()=>testGame.state.walls.length),0);assert.equal(await page.evaluate(()=>testGame.api.abilityEffectsSnapshot().explosions.length),0);
  await page.evaluate(()=>testGame.api.update(.5));
  await page.waitForFunction(()=>document.querySelector('#gameMusic').readyState>=2&&!document.querySelector('#gameMusic').paused,null,{polling:50});
  assert.equal(await page.evaluate(()=>testGame.api.musicStatus().track),'first-boss');assert.ok(Math.abs(await page.locator('#gameMusic').evaluate(a=>a.duration)-178.8)<.1);
  assert.equal(await page.evaluate(()=>testGame.state.enemies.filter(e=>e.waveBoss).length),1);assert.equal(await page.evaluate(()=>testGame.api.firstBossIntroActive()),false);
  await page.evaluate(()=>{const g=testGame;g.api.returnToMenu();g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.timeLeft=0;g.api.update(.01);g.api.returnToMenu()});
  assert.equal(await page.evaluate(()=>testGame.api.firstBossIntroActive()),false);assert.equal(await page.evaluate(()=>testGame.api.musicStatus().track),'splash');
  await page.evaluate(()=>{const g=testGame;g.api.resetRun();g.state.wave=16;g.api.startWave()});
  await page.waitForFunction(()=>document.querySelector('#gameMusic').readyState>=2&&!document.querySelector('#gameMusic').paused,null,{polling:50});
  assert.equal(await page.evaluate(()=>testGame.api.musicStatus().track),'final-draft');assert.ok(Math.abs(await page.locator('#gameMusic').evaluate(a=>a.duration)-359.832)<.1);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' silent side entrance, real stomp/roar, pause, input lock, camera/reduced motion, wall wipe, boss music and cancellation');await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
