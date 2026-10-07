// Browser regression: personal end-of-run notes and reachable continuation controls.
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
  await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
  await page.evaluate(()=>{
   const g=testGame,u=g.catalog.upgrades.find(u=>u.name==='Fire Ink');g.api.chooseUpgrade(u);g.api.gameOver();
  });
  assert.match(await page.textContent('#deathNoteMessage'),/Fewer monsters/);
  assert.match(await page.textContent('#deathNoteKeepsake'),/Fire Ink · level 1/);
  await page.waitForFunction(()=>document.querySelector('.stevie-note img').naturalWidth>0,null,{polling:50});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#gameOverOverlay .stevie-note')).opacity==='1',null,{polling:50});
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.fonts.check('20px "Stevie Pencil"')),true,'bundled handwriting font loaded');
  assert.match(await page.locator('#deathNoteMessage').evaluate(e=>getComputedStyle(e).fontFamily),/Stevie Pencil/);
  assert.equal((await page.locator('.note-signature').first().textContent()).trim(),'— StEvie');
  assert.equal(await page.locator('.note-signature .signature-pencil').count(),2);
  await page.screenshot({path:'/tmp/stevie-note-death-'+viewport.width+'.png'});
  await page.click('#againBtn');
  await page.evaluate(()=>testGame.api.gameOver());
  assert.match(await page.textContent('#deathNoteMessage'),/brave face/,'a fresh run gets a different note');
  await page.reload();await page.click('#startBtn');await page.evaluate(()=>testGame.api.gameOver());
  assert.match(await page.textContent('#deathNoteMessage'),/practice/,'deck position survives reopening');
  await page.click('#againBtn');assert.equal(await page.locator('#gameOverOverlay').isVisible(),false);
  await page.evaluate(()=>{
   const g=testGame;g.state.wave=20;g.state.timeLeft=0;g.state.finalBossDefeated=true;g.state.enemies=[];g.api.startWave();g.state.timeLeft=0;g.api.killEnemy(g.api.spawnEnemy(true,100,100));g.api.waveComplete();
  });
  assert.match(await page.textContent('#victoryNoteHeading'),/SAVED/);
  assert.match(await page.textContent('#victoryNoteMessage'),/WE DID IT/);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#victoryOverlay .stevie-note')).opacity==='1',null,{polling:50});
  await page.screenshot({path:'/tmp/stevie-note-victory-'+viewport.width+'.png'});
  await page.locator('#endlessBtn').scrollIntoViewIfNeeded();await page.click('#endlessBtn');
  assert.equal(await page.evaluate(()=>testGame.state.wave),21);
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.stevie-note').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.deepEqual(errors,[]);
  console.log('PASS: '+viewport.width+' personal death/victory notes, favorite ink, fresh-run reset, loaded art, reachable buttons and Endless continuation');await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
