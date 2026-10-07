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
  await page.evaluate(()=>testGame.api.renderCompendium());assert.equal(await page.textContent('#monsterCards'),'');
  await page.evaluate(()=>{
   const g=testGame;g.api.resetRun();g.state.wave=2;g.state.timeLeft=0;
   const e=g.api.spawnEnemy(false,g.state.player.x+45,g.state.player.y-60,'grunt');e.hp=0;g.api.killEnemy(e);g.api.draw();
  });
  assert.equal(await page.locator('#waveOverlay').isVisible(),false);assert.equal(await page.evaluate(()=>testGame.api.waveFinaleActive()),true);
  await page.evaluate(()=>{testGame.api.update(.35);testGame.api.draw()});assert.ok(await page.evaluate(()=>testGame.api.waveFinaleCamera().zoom)>1);
  await page.screenshot({path:'/tmp/finale-closeup-'+viewport.width+'.png'});
  const age=await page.evaluate(()=>testGame.api.waveFinaleSnapshot().age);await page.click('#pauseBtn');await page.evaluate(()=>testGame.api.update(.5));assert.equal(await page.evaluate(()=>testGame.api.waveFinaleSnapshot().age),age);await page.click('#resumeBtn');
  const canvas=await page.locator('#game').boundingBox();await page.mouse.click(canvas.x+50,canvas.y+50);assert.equal(await page.evaluate(()=>testGame.state.walls.length),0,'drawing disabled during camera scene');
  await page.evaluate(()=>{testGame.api.update(.8);testGame.api.draw()});assert.equal(await page.evaluate(()=>testGame.api.waveFinaleSnapshot().popped),true);
  await page.screenshot({path:'/tmp/finale-pop-'+viewport.width+'.png'});await page.evaluate(()=>{testGame.api.update(.6);testGame.api.draw()});assert.equal(await page.locator('#waveOverlay').isVisible(),true);
  assert.equal(await page.evaluate(()=>testGame.state.kills),1);assert.match(await page.textContent('#waveClearTitle'),/Wave 2/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/finale-clear-'+viewport.width+'.png'});
  await page.click('#continueBtn');assert.equal(await page.locator('#upgradeOverlay').isVisible(),true);
  await page.evaluate(()=>{const g=testGame;g.api.resetRun();g.api.spawnEnemy(false,100,100,'medic');g.api.spawnEnemy(false,130,130,'basil');g.api.spawnEnemy(false,150,150,'gnawer');g.api.openCompendium()});
  const guide=await page.textContent('#monsterCards');assert.ok(guide.indexOf('Chompzilla')<guide.indexOf('Basil')&&guide.indexOf('Basil')<guide.indexOf('Dr. Oopsie'));assert.doesNotMatch(guide,/The Big Rub-Out/);assert.match(guide,/First wave 13/i);assert.match(guide,/Fancy Feast/);
  await page.evaluate(()=>testGame.api.closeCompendium());await page.reload();await page.evaluate(()=>testGame.api.renderCompendium());assert.match(await page.textContent('#monsterCards'),/Basil/);
  await page.click('#startBtn');await page.evaluate(()=>{const g=testGame;g.state.wave=13;g.state.spawnTimer=999;g.state.enemies=[];const p=g.state.player,b=g.api.spawnEnemy(false,g.state.W<400?p.x:p.x-150,g.state.W<400?p.y-150:p.y,'basil');b.feastCd=0;for(let i=0;i<6;i++)g.api.spawnEnemy(false,b.x+30*Math.cos(i),b.y+30*Math.sin(i),'grunt');g.api.updateFeast(b,.1);g.api.updateEnemyAnimations(.1);g.api.draw();});
  assert.equal(await page.evaluate(()=>testGame.state.enemies.filter(e=>testGame.api.feastHost(e)).length),6);await page.screenshot({path:'/tmp/finale-basil-'+viewport.width+'.png'});
  await page.evaluate(()=>{const g=testGame,b=g.state.enemies[0];g.api.updateFeast(b,3);g.api.updateFeast(b,.8);g.api.draw()});assert.equal(await page.evaluate(()=>testGame.state.enemies.filter(e=>e.feastRush===4).length),6);
  if(viewport.width===360){await page.evaluate(()=>{const g=testGame;g.api.resetRun();g.state.wave=20;g.api.startWave();g.api.killEnemy(g.api.spawnEnemy(true,g.state.player.x+40,g.state.player.y-60));});assert.equal(await page.locator('#victoryOverlay').isVisible(),false);await page.evaluate(()=>{testGame.api.update(1.7);testGame.api.draw()});assert.equal(await page.locator('#victoryOverlay').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/finale-victory-360.png'});}
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>testGame.api.enemyMotionReduced(),null,{polling:50});await page.evaluate(()=>{const g=testGame;g.api.resetRun();g.state.timeLeft=0;g.api.killEnemy(g.api.spawnEnemy(false,100,100,'grunt'));});assert.equal(await page.evaluate(()=>testGame.api.waveFinaleCamera().zoom),1);await page.evaluate(()=>testGame.api.update(.61));assert.equal(await page.locator('#waveOverlay').isVisible(),true);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' close-up/pop/clear, pause and input lock, notebook style/fit, actual discoveries/reload/order, Fancy Feast and reduced motion');await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
