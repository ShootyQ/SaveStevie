// Optional browser check; Playwright/Chromium are developer tools, not game dependencies.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  const wait=page.waitForFunction.bind(page);page.waitForFunction=(f,a,o)=>wait(f,a,{polling:50,...o});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');
  assert.equal(await page.locator('.notebook-perk').count(),10);assert.equal(await page.locator('.notebook-perk button:disabled').count(),10);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.notebook-perk img')).every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'page width fits');
  assert.equal(await page.evaluate(()=>Array.from(document.querySelectorAll('.notebook-perk')).every(c=>c.scrollWidth<=c.clientWidth+1)),true,'perk text fits');
  await page.keyboard.press('Escape');await page.click('#closeHubBtn');await page.click('#startBtn');
  await page.evaluate(()=>{testGame.api.awardScraps(17);testGame.api.openNotebook()});
  assert.equal(await page.locator('.notebook-perk button:disabled').count(),10);assert.equal(await page.evaluate(()=>testGame.state.paused),true);
  await page.click('#closeNotebookBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),false);
  await page.evaluate(()=>testGame.api.gameOver());await page.click('#deathNotebookBtn');await page.click('#notebookBuy-starterEraser');await page.click('#notebookBuy-inkTank');await page.click('#notebookBuy-inkTank');
  assert.equal(await page.textContent('#notebookBank'),'0');assert.match(await page.textContent('#notebookLoadout'),/200 ink/);
  await page.reload();await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');assert.match(await page.textContent('#notebookLoadout'),/200 ink/);await page.click('#closeNotebookBtn');await page.click('#closeHubBtn');await page.click('#startBtn');
  assert.equal(await page.evaluate(()=>testGame.state.stats.maxInk),200);
  await page.click('#pauseBtn');await page.click('#pauseToolBtn');await page.click('#buildNotebookBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#pauseOverlay').isVisible(),true);await page.click('#resumeBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'pauseBtn','closing a nested dialog restores visible focus');
  await page.evaluate(()=>testGame.api.openNotebook());
  page.once('dialog',dialog=>dialog.dismiss());await page.click('#resetNotebookBtn');
  assert.equal(await page.evaluate(()=>testGame.state.stats.maxInk),200,'cancel preserves current kit');
  page.once('dialog',dialog=>dialog.accept());await page.click('#resetNotebookBtn');
  assert.equal(await page.evaluate(()=>testGame.state.running),false);assert.equal(await page.locator('#startOverlay').isVisible(),true);
  assert.equal(await page.evaluate(()=>testGame.state.stats.maxInk),160);assert.equal(await page.textContent('#splashScraps'),'0');
  await page.reload();await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');assert.match(await page.textContent('#notebookLoadout'),/160 ink/);
  await page.click('#closeNotebookBtn');await page.click('#closeHubBtn');await page.click('#startBtn');
  await page.evaluate(()=>{testGame.api.awardScraps(66);testGame.api.gameOver()});await page.click('#deathNotebookBtn');
  await page.click('#notebookBuy-starterEraser');for(let i=0;i<3;i++)await page.click('#notebookBuy-inkRegen');await page.click('#notebookBuy-extraChoice');
  assert.equal(await page.textContent('#notebookBank'),'0');assert.match(await page.textContent('#notebookLoadout'),/8 ink\/s/);assert.match(await page.textContent('#notebookLoadout'),/4 reward choices/);
  await page.reload();await page.click('#startBtn');assert.equal(await page.evaluate(()=>testGame.state.stats.inkRegen),8);await page.evaluate(()=>{testGame.state.wave=1;testGame.api.rollCards()});assert.equal(await page.locator('#cards > *').count(),4);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' notebook images/layout, pause/locking, purchases, saved reload, next-run loadout and confirmed/cancelled reset');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
