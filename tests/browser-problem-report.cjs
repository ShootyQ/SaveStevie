// Local report drafts and end-screen navigation on desktop and Android.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='index.html'&&viewport.width<600)body=body.toString('utf8').replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  await page.evaluate(()=>{const g=testGame;g.state.wave=7;g.state.stacks['Fire Ink']=2;g.state.inks.fire=2;g.api.updateUI()});
  await page.click('#pauseBtn');await page.click('#pauseSettingsBtn');await page.click('#reportProblemBtn');
  assert.equal(await page.evaluate(()=>testGame.state.paused),true);
  await page.fill('#reportDescription','My wall vanished. I expected it to stay. <script>plain text</script>');
  const report=await page.inputValue('#reportPreview');assert(report.includes('Alpha '+require(path.join(root,'package.json')).version));assert.match(report,/Wave: 7/);assert.match(report,/Fire Ink ×2/);assert.match(report,/fire ×2/);assert.match(report,/<script>plain text<\/script>/);
  const href=await page.locator('#reportGitHubLink').getAttribute('href'),url=new URL(href);assert.equal(url.origin,'https://github.com');assert.equal(url.pathname,'/ShootyQ/SaveStevie/issues/new');assert.equal(url.searchParams.get('body'),report);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedReport=text}}}));await page.click('#copyReportBtn');assert.equal(await page.evaluate(()=>copiedReport),report);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}}));await page.click('#copyReportBtn');assert.match(await page.textContent('#reportStatus'),/Clipboard unavailable/);
  const [download]=await Promise.all([page.waitForEvent('download'),page.click('#saveReportBtn')]);assert.equal(download.suggestedFilename(),'SaveStevie-problem-report.txt');assert.equal(fs.readFileSync(await download.path(),'utf8'),report);
  await page.locator('#reportTitle').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/stevie-report-'+viewport.width+'.png'});
  assert.equal(await page.locator('#buildNotebookBtn').count(),0);assert.equal(await page.locator('#deathNotebookBtn').count(),0);assert.equal(await page.locator('#victoryNotebookBtn').count(),0);
  await page.click('#closeReportBtn');assert.equal(await page.locator('#pauseOverlay').isVisible(),true);assert.equal(await page.evaluate(()=>testGame.state.paused),true);await page.click('#resumeBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),false);
  await page.evaluate(()=>{const g=testGame;g.api.awardScraps(5);g.state.player.hp=0;g.api.gameOver();g.api.updateUI()});
  assert.deepEqual(await page.locator('#gameOverOverlay .cardactions button').allTextContents(),['Return to main menu','Start a new run']);
  const bank=await page.evaluate(()=>testGame.api.notebookSnapshot().scraps);
  await page.click('#deathNewRunBtn');assert.equal(await page.evaluate(()=>testGame.state.running&&testGame.state.wave===1&&testGame.state.player.hp>0),true,'starts gameplay directly even with first scraps');assert.equal(await page.locator('#gameOverOverlay').isVisible(),false);assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),bank);
  const finalBank=await page.evaluate(()=>{testGame.state.player.hp=0;testGame.api.gameOver();return testGame.api.notebookSnapshot().scraps});await page.click('#againBtn');assert.equal(await page.locator('#startOverlay').isVisible(),true);assert.equal(await page.evaluate(()=>testGame.state.running),false);
  await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');assert.equal(await page.locator('#notebookOverlay').isVisible(),true);assert.equal(await page.locator('#notebookBuy-starterEraser').isEnabled(),true);assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),finalBank);assert.deepEqual(errors,[]);
  console.log('PASS: report metadata, GitHub draft URL, copy/fallback/download, pause restoration, direct fresh run and home scrap shop at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
