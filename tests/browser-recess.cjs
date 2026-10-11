const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes')});
  await page.route('http://stevie.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html'});
  });
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#startBtn');

  await page.click('#pauseBtn');
  await page.waitForSelector('#pauseOverlay',{state:'visible'});
  assert.equal(await page.locator('#resumeBtn').textContent(),'Back to game →');
  const layout=await page.evaluate(()=>{
   const book=document.querySelector('.pause-book'),overlay=document.querySelector('#pauseOverlay'),r=book.getBoundingClientRect();
   const buttons=[...book.querySelectorAll('#pauseActions button')].filter(b=>!b.hidden);
   return {width:r.width,height:r.height,viewport:innerWidth,scroll:book.scrollWidth<=book.clientWidth+1,tape:buttons.every(b=>getComputedStyle(b,'::after').backgroundImage.includes('tape.svg')),fullSheet:document.querySelector('.recess-page').offsetHeight>=book.scrollHeight-2,plain:!document.querySelector('#pauseTitle').classList.contains('paper-slip'),eggHidden:document.querySelector('.recess-margin').getAttribute('aria-hidden')};
  });
  assert(layout.fullSheet,'paper background covers entire scrollable menu');assert(layout.scroll,'no horizontal scroll');assert(layout.tape&&layout.plain);assert.equal(layout.eggHidden,'true');
  await page.screenshot({path:'/tmp/recess-'+viewport.width+'x'+viewport.height+'.png'});
  await page.locator('#pauseSettingsBtn').click();await page.waitForSelector('#optionsOverlay',{state:'visible'});
  await page.click('#closeOptionsBtn');await page.waitForSelector('#pauseOverlay',{state:'visible'});
  await page.locator('#returnMenuBtn').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/recess-bottom-'+viewport.width+'x'+viewport.height+'.png'});await page.locator('#returnMenuBtn').click();await page.waitForSelector('#quitConfirmation',{state:'visible'});
  await page.locator('#cancelQuitBtn').click();await page.locator('#resumeBtn').click();
  assert.equal(await page.locator('#pauseOverlay').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('PASS:',viewport,'taped actions, margin notes, settings/back, quit/cancel, resume, responsive overflow');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
