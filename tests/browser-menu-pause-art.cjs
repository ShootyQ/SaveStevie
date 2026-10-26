const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes')});
  await page.route('http://stevie.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html'});
  });
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});
  await page.keyboard.press('Escape');assert(!await page.locator('#pauseOverlay').isVisible());
  await page.evaluate(()=>testGame.api.openInfo('pause'));assert(!await page.locator('#pauseOverlay').isVisible());
  await page.click('#splashOptionsBtn');await page.evaluate(()=>{testGame.api.openInfo('pause');window.dispatchEvent(new Event('savestevie:background'));});
  assert(await page.locator('#optionsOverlay').isVisible());assert(!await page.locator('#pauseOverlay').isVisible());await page.click('#closeOptionsBtn');
  await page.click('#startBtn');await page.keyboard.press('Escape');assert(await page.locator('#pauseOverlay').isVisible(),'active run can pause');
  await page.click('#pauseSettingsBtn');await page.click('#closeOptionsBtn');assert(await page.locator('#pauseOverlay').isVisible(),'settings returns to existing active pause');await page.click('#resumeBtn');
  await page.evaluate(()=>{testGame.api.returnToMenu();window.dispatchEvent(new Event('savestevie:background'));});await page.keyboard.press('Escape');assert(!await page.locator('#pauseOverlay').isVisible());
  await page.click('#startBtn');await page.evaluate(()=>{const g=testGame;let i=0;g.api.getUpgrade=()=>{const name=['Stevie Has Had Enough','Pocket Rocks','Better Rocks'][i++%3];return {...g.catalog.upgrades.find(u=>u.name===name),rarity:'common'};};g.api.openUpgrade();});
  await page.waitForFunction(()=>[...document.querySelectorAll('#cards img')].every(i=>i.complete&&i.naturalWidth),null,{polling:50});
  const card=page.locator('#cards .ucard').first();await card.screenshot({path:'/tmp/stevie-enough-card-'+viewport.width+'.png'});
  const crop=await page.evaluate(()=>{const g=testGame,a=g.api.upgradeArtworkInfo({name:'Stevie Has Had Enough'}),span=document.querySelector('#cards .upgrade-illustration'),img=span.querySelector('img'),box=span.getBoundingClientRect(),rect=img.getBoundingClientRect();return {crop:a.crop,x:(box.x-rect.x)/rect.width*img.naturalWidth,y:(box.y-rect.y)/rect.height*img.naturalHeight,size:box.width/rect.width*img.naturalWidth};});
  assert(Math.abs(crop.x-439)<1&&Math.abs(crop.y-423)<1&&Math.abs(crop.size-376)<1,'actual image matches clean crop');
  assert.deepEqual(errors,[]);console.log('PASS: menu Escape/direct/background guards, active pause and settings return, corrected reward artwork at',viewport.width);await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
