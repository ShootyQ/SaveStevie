// Optional browser check; Playwright/Chromium are developer tools, not game dependencies.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  const wait=page.waitForFunction.bind(page);page.waitForFunction=(f,a,o)=>wait(f,a,{polling:50,...o});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
  const height=await page.locator('#game').evaluate(c=>c.getBoundingClientRect().height);
  for(const wave of [5,10,15,20]){
   const name=await page.evaluate(wave=>{const g=testGame;g.api.resetRun();g.state.wave=wave;g.api.startWave();const boss=g.api.spawnEnemy(true,g.state.player.x-110,g.state.player.y);boss.freeze=100;g.state.timeLeft=.01;g.api.update(.02);g.api.draw();return g.api.monsterName(boss.type)},wave);
   assert.equal(await page.locator('#waveCountdown').isVisible(),false);assert.equal(await page.locator('#timeBar').isVisible(),false);
   assert.equal(await page.locator('#bossOvertime').isVisible(),true);assert.match(await page.textContent('#bossOvertime'),new RegExp(name));
   assert.equal(await page.locator('#game').evaluate(c=>c.getBoundingClientRect().height),height,'overtime never shrinks playfield');
   assert.equal(await page.locator('#bossOvertime').evaluate(c=>c.scrollWidth<=c.clientWidth+1),true,'objective fits phone');
   await page.screenshot({path:'/tmp/difficulty-overtime-'+wave+'-'+viewport.width+'.png'});
   await page.evaluate(()=>{const g=testGame;g.api.killEnemy(g.state.enemies.find(e=>e.waveBoss));g.api.update(.016)});
   assert.equal(await page.locator(wave===20?'#victoryOverlay':'#waveOverlay').isVisible(),true);assert.equal(await page.locator('#bossOvertime').isVisible(),false);
  }
  await page.evaluate(()=>{const g=testGame;g.api.resetRun();const e=g.api.spawnEnemy(false,100,100,'grunt');e.freeze=999;g.state.timeLeft=.01;g.state.spawnTimer=0;g.api.update(.02);g.api.draw()});
  assert.equal(await page.locator('#waveCountdown').isVisible(),true);assert.match(await page.textContent('#bossOvertime'),/1 left/);assert.equal(await page.locator('#waveOverlay').isVisible(),false);
  await page.screenshot({path:'/tmp/wave-cleanup-'+viewport.width+'.png'});
  await page.evaluate(()=>{const g=testGame;g.api.killEnemy(g.state.enemies[0]);g.api.update(.02)});assert.equal(await page.locator('#waveOverlay').isVisible(),true);
  await page.evaluate(()=>{const g=testGame;g.api.resetRun();for(const name of ['Quick Refill','Quick Refill','Living Fountain Pen','Recycling','Patch Job','Emergency Medicine','Triple Stroke'])g.api.chooseUpgrade(g.catalog.upgrades.find(u=>u.name===name));g.api.openBuild()});
  assert.match(await page.textContent('#buildStats'),/Combat healing budget/);assert.match(await page.textContent('#buildStats'),/12 HP/);assert.match(await page.textContent('#buildUpgrades'),/diminishing returns/);assert.match(await page.textContent('#buildUpgrades'),/60%/);
  await page.click('#buildNotebookBtn');assert.match(await page.locator('.notebook-earn').first().textContent(),/25 kills/);assert.match(await page.locator('.notebook-earn').first().textContent(),/Chapter-clear bonuses/);await page.click('#closeNotebookBtn');
  await page.evaluate(()=>{const g=testGame;g.state.wave=1;const names=['Quick Refill','Recycling','Patch Job'];let i=0;g.api.getUpgrade=()=>g.catalog.upgrades.find(u=>u.name===names[i++%3]);g.api.openUpgrade()});
  assert.match(await page.textContent('#cards'),/smaller bonuses/);assert.equal(await page.locator('#cards .ucard').evaluateAll(cards=>cards.every(c=>c.scrollWidth<=c.clientWidth+1)),true);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' untimed bosses and regular-wave cleanup, stable playfield, accurate Build/regeneration/budget/Notebook text and reward-card fit');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
