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
  assert.equal(await page.locator('#scrapGuideCover').isVisible(),false);
  await page.evaluate(()=>{testGame.api.awardScraps(1);testGame.api.gameOver()});
  await page.getByRole('button',{name:'Return to main menu',exact:true}).click();
  assert.equal(await page.evaluate(()=>testGame.state.running),false);assert.equal(await page.locator('#scrapGuideCover').isVisible(),true);
  await page.locator('#scrapGuideShow').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/scrap-guide-cover-'+viewport.width+'.png'});await page.click('#scrapGuideShow');
  assert.equal(await page.locator('#scrapGuideHub').isVisible(),true);await page.click('#hubNotebookBtn');
  assert.equal(await page.locator('#scrapGuideShop').isVisible(),true);assert.equal(await page.locator('#notebookPerks button').first().isDisabled(),false);
  await page.screenshot({path:'/tmp/scrap-guide-shop-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.click('#scrapGuideDone');assert.equal(await page.locator('#scrapGuideShop').isVisible(),false);
  await page.reload();assert.equal(await page.locator('#scrapGuideCover').isVisible(),false);
  const progress=await page.evaluate(()=>testGame.api.notebookSnapshot());assert.equal(progress.scraps,1);assert.equal(progress.scrapTutorialDone,true);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' defeat menu return, Stevie walkthrough, affordable controls, required free purchase and reload persistence');await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
