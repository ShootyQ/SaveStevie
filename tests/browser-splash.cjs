// Optional visual/interaction check; Playwright and Chromium are developer tools.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.splash-art img')).every(i=>i.complete&&i.naturalWidth),null,{polling:50});
  // The anchored pencil tip must meet the visible end of the ink on all screen sizes.
  for(const time of [0,480,900,1600,2500,3240,5700]){
   const error=await page.evaluate(time=>{
    document.querySelectorAll('.splash-art *').forEach(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=time}));
    const path=document.querySelector('#splashInkPath'),pencil=document.querySelector('#splashPencilNib');
    const progress=1-parseFloat(getComputedStyle(path).strokeDashoffset);
    const end=path.getPointAtLength(path.getTotalLength()*progress).matrixTransform(path.getScreenCTM());
    const tip=new DOMPoint(0,0).matrixTransform(pencil.getScreenCTM());
    return Math.hypot(end.x-tip.x,end.y-tip.y);
   },time);
   assert.ok(error<1,'pencil tip meets ink at '+time+'ms ('+error+'px)');
  }
  const controls=await page.locator('#startBtn').boundingBox();
  // Freeze a real CSS animation at its throw pose, without advancing the game.
  await page.evaluate(()=>document.querySelectorAll('.splash-art *').forEach(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=4000})));
  assert.equal(await page.locator('.splash-stevie').evaluate(e=>getComputedStyle(e).overflow),'hidden');
  assert.equal(await page.locator('.splash-stevie-frames').evaluate(e=>e.naturalWidth),512);
  assert.ok(await page.locator('.splash-stevie-frames').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42<0),'throw comes from the second sprite row');
  assert.ok(await page.locator('.splash-rock').evaluate(e=>+getComputedStyle(e).opacity>.9),'throw shows a rock');
  assert.deepEqual(await page.locator('#startBtn').boundingBox(),controls,'decorative movement leaves controls stationary');
  assert.equal(await page.evaluate(()=>testGame.state.running),false,'scene never starts combat');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const id of ['startBtn','splashNotebookBtn','splashMusicBtn']){
   const box=await page.locator('#'+id).boundingBox(),card=await page.locator('.splash-box').boundingBox();assert.ok(box.y>=card.y&&box.y+box.height<=card.y+card.height+1,id+' is visible without scrolling');assert.ok(box.x>=0&&box.x+box.width<=viewport.width+1&&box.y>=0&&box.y+box.height<=viewport.height+1,id+' fits');
  }
  await page.screenshot({path:'/tmp/splash-animated-'+viewport.width+'.png'});
  await page.evaluate(()=>document.querySelectorAll('.splash-art *').forEach(e=>e.getAnimations().forEach(a=>{a.currentTime=2500})));
  await page.screenshot({path:'/tmp/splash-drawing-'+viewport.width+'.png'});
  // Resume before testing the actual hidden-overlay lifecycle.
  await page.evaluate(()=>document.querySelectorAll('.splash-art *').forEach(e=>e.getAnimations().forEach(a=>a.play())));
  await page.locator('#splashNotebookBtn').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#notebookOverlay').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#splashNotebookBtn').evaluate(e=>e===document.activeElement),true);
  await page.click('#splashMusicBtn');await page.waitForFunction(()=>!document.querySelector('#gameMusic').paused,null,{polling:50});
  await page.click('#startBtn');assert.equal(await page.locator('#startOverlay').isVisible(),false);
  assert.equal(await page.locator('.splash-stevie-frames').evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
  await page.evaluate(()=>{testGame.api.gameOver();testGame.api.openNotebook()});
  page.once('dialog',d=>d.accept());await page.click('#resetNotebookBtn');
  assert.equal(await page.locator('#startOverlay').isVisible(),true);
  assert.equal(await page.locator('.splash-stevie-frames').evaluate(e=>getComputedStyle(e).animationPlayState),'running');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.splash-art').evaluate(e=>e.getAnimations({subtree:true}).length),0,'reduced motion stops scene animations');
  assert.equal(await page.locator('.splash-ink-stroke').first().evaluate(e=>getComputedStyle(e).strokeDashoffset),'0px');
  assert.equal(await page.locator('.splash-rock').evaluate(e=>getComputedStyle(e).display),'none');
  assert.equal(await page.locator('.splash-stevie-frames').evaluate(e=>getComputedStyle(e).transform),'none');
  await page.screenshot({path:'/tmp/splash-still-'+viewport.width+'.png'});
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' pencil/ink alignment, sprite throw, stationary reachable controls, music/notebook/start/reset and reduced motion');await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
