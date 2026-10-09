// Optional browser check; Playwright/Chromium are developer tools, not game dependencies.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..')),native=process.env.NATIVE_APP==='1';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  const wait=page.waitForFunction.bind(page);page.waitForFunction=(f,a,o)=>wait(f,a,{polling:50,...o});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='index.html'&&native)body=body.toString('utf8').replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');
  await page.waitForFunction(()=>window.testGame?.api.artworkReady());
  const fire=page.locator('#splashLineFire');
  await page.evaluate(()=>{testGame.api.resetMenuPencil();testGame.api.updateMenuPencil(2)});
  assert.equal(await fire.getAttribute('opacity'),'0','fire waits for the nib');
  await page.evaluate(()=>testGame.api.updateMenuPencil(.5));
  assert.equal(await fire.getAttribute('opacity'),'1','fire pops onto drawn section');
  const drawing=await page.evaluate(()=>JSON.stringify(testGame.state));
  await page.evaluate(()=>testGame.api.updateMenuPencil(1));
  assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),drawing,'cover clock leaves combat alone');
  await page.evaluate(()=>{for(const el of document.querySelectorAll('.splash-art *'))for(const a of el.getAnimations()){a.pause();a.currentTime=2900}});
  assert.notEqual(await page.locator('.splash-twin-left').evaluate(el=>getComputedStyle(el).transform),await page.locator('.splash-twin-right').evaluate(el=>getComputedStyle(el).transform),'twins separate');
  assert.equal(await page.locator('.splash-grunt-frames').evaluate(el=>el.complete&&el.naturalWidth===640),true);
  const art=await page.locator('.splash-art').boundingBox();
  for(const selector of ['.splash-grunt','.splash-twin-left','.splash-twin-right']){
   const box=await page.locator(selector).boundingBox();assert(box.x>=art.x-1&&box.x+box.width<=art.x+art.width+1,'doodle stays on cover '+selector);
  }
  await page.screenshot({path:'/tmp/menu-doodle-animated-'+viewport.width+'.png'});
  await page.evaluate(()=>testGame.api.updateMenuPencil(14.5));
  assert.equal(await fire.getAttribute('opacity'),'0','new loop hides flame until drawn again');
  await page.click('#splashOptionsBtn');
  const hidden=await fire.getAttribute('transform');await page.evaluate(()=>testGame.api.updateMenuPencil(5));
  assert.equal(await fire.getAttribute('transform'),hidden,'hidden cover does not advance');
  await page.click('#closeOptionsBtn');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>testGame.api.enemyMotionReduced(),null,{polling:50});
  assert.equal(await fire.getAttribute('opacity'),'1');
  assert.equal(await page.locator('.splash-grunt-frames').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('.splash-twin-left').evaluate(el=>getComputedStyle(el).transform),'none');
  await page.screenshot({path:'/tmp/menu-doodle-still-'+viewport.width+'.png'});
  assert.deepEqual(errors,[]);console.log('PASS: cover routines, timed ignition, hidden/reduced motion and layout '+viewport.width);await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
