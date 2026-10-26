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
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  if(viewport.width>600)await page.keyboard.press('b');else{await page.click('#pauseBtn');await page.click('#pauseToolBtn');}
  assert(await page.locator('#buildTool').isVisible());assert.equal(await page.locator('#buildOverlay .desktop-page-nav').count(),0);assert.equal(await page.locator('#buildHighlights .build-stat').count(),6);
  const fits=()=>page.evaluate(()=>{const card=document.querySelector('#buildOverlay .cardbox'),body=card.querySelector('.build-inspector-body'),tool=document.querySelector('#buildTool'),close=document.querySelector('#closeBuildBtn'),r=card.getBoundingClientRect(),t=tool.getBoundingClientRect(),c=close.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&body.scrollWidth<=body.clientWidth+1&&t.top>=r.top&&t.top<innerHeight/2&&c.bottom<=innerHeight;});
  assert(await fits(),'tool visible immediately, sheet and close button fit');await page.screenshot({path:'/tmp/build-inspector-fresh-'+viewport.width+'.png'});
  await page.click('#closeBuildBtn');
  await page.evaluate(()=>{const g=testGame;g.api.closeInfo(false);for(const name of ['Fire Ink','Poison Ink','Bigger Ink Tank','Quick Refill','Thick Ink','Fine Tip','Lucky Scribble','Closed Loop','Architect','Patch Job','Living Fountain Pen','Pocket Rocks','Bandages','Helmet'])g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name===name),rarity:'rare'});g.api.checkSynergies();g.api.openInfo('build');g.api.prepareDesktopPages('build');});
  assert(await fits());assert.equal(await page.locator('#buildOverlay .desktop-page-nav').count(),0);assert(await page.locator('#buildUpgrades .build-entry').count()>10);
  await page.locator('.build-fold').last().locator('summary').click();assert(await page.locator('#buildStats').isVisible());assert.equal(await page.locator('#buildStats .build-stat').count(),25);
  await page.evaluate(()=>{const body=document.querySelector('.build-inspector-body');body.scrollTop=body.scrollHeight;testGame.api.prepareDesktopPages('build');});assert(await page.locator('#closeBuildBtn').isVisible());
  await page.screenshot({path:'/tmp/build-inspector-details-'+viewport.width+'.png'});await page.click('#closeBuildBtn');
  await page.evaluate(()=>testGame.api.openInfo('build'));assert(await fits(),'reopening resets scroll to pencil');assert.equal(await page.locator('#buildOverlay .desktop-page-nav').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: fresh/loaded build, visible pencil, no page splitting, expandable complete stats, internal scroll, persistent close and reopen at',viewport.width);await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
