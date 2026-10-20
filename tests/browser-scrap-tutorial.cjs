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
  assert(await page.locator('#scrapCoach').isHidden());
  await page.evaluate(()=>{testGame.api.awardScraps(1);testGame.api.gameOver()});
  assert(await page.locator('#deathNewRunBtn').isHidden());await page.click('#againBtn');
  const checkGuide=async()=>{
   assert(await page.locator('#scrapCoachCard').isVisible());
   assert(await page.locator('#scrapCoachCard').evaluate(card=>{const r=card.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&card.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'coach is on screen and above the tree');
  };
  const openTree=async()=>{await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');await checkGuide();};
  await checkGuide();await page.reload();await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});assert(await page.locator('#startBtn').isDisabled());await openTree();
  assert.equal(await page.locator('#notebookOverlay').count(),0);assert.equal(await page.textContent('#betaTreeTitle'),'Scrap Tree');
  await page.click('#beta-node-start');await checkGuide();assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),1,'inspection does not spend');
  await page.screenshot({path:'/tmp/scrap-guide-buy-'+viewport.width+'.png'});
  await page.reload();await openTree();await page.click('#beta-node-start');await page.click('#betaBuyNode');await checkGuide();
  assert.match(await page.textContent('#scrapCoachProgress'),/5 of 5/);assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scrapTutorialDone),false);
  await page.reload();await openTree();assert.match(await page.textContent('#scrapCoachProgress'),/5 of 5/);await page.click('#closeBetaScrapsBtn');assert(await page.locator('#scrapCoach').isHidden());
  await page.reload();await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});assert(await page.locator('#scrapCoach').isHidden());
  const progress=await page.evaluate(()=>testGame.api.notebookSnapshot());assert.equal(progress.scraps,1);assert.equal(progress.scrapTutorialDone,true);assert.equal(progress.betaPencilClaimed,true);
  await page.click('#startBtn');await page.evaluate(()=>testGame.api.gameOver());assert(await page.locator('#deathNewRunBtn').isVisible());await page.click('#deathNewRunBtn');assert.equal(await page.evaluate(()=>testGame.state.running),true);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' defeat menu return, Stevie walkthrough, visible tree coach, inspection, free pencil, interrupted reloads and later replay');await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
