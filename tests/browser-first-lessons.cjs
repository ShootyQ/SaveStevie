// First-play lessons, native/desktop practice and required starter purchase.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}].filter(v=>!process.env.STEVIE_TEST_WIDTH||v.width===Number(process.env.STEVIE_TEST_WIDTH))){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='index.html'&&viewport.width<600)body=body.toString('utf8').replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');

  assert(await page.locator('#lessonOverlay').isVisible());assert.equal(await page.evaluate(()=>testGame.state.paused),true);
  const checkCard=async()=>{
   await page.evaluate(()=>testGame.api.updateStevieGuides());const b=await page.locator('#lessonCard').boundingBox();
   assert(b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,'coach stays on screen');
  };
  await checkCard();const initial=await page.evaluate(()=>({hp:testGame.state.player.hp,time:testGame.state.timeLeft,kills:testGame.state.kills}));
  await page.click('#lessonNext');assert(await page.locator('#lessonNext').isDisabled());await checkCard();
  const zone=await page.evaluate(()=>{const g=testGame,z=g.api.lessonSnapshot().practice,r=g.dom.canvas.getBoundingClientRect();return {x:r.x+z.x+12,y:r.y+z.y+z.height/2,endX:r.x+z.x+z.width-12};});
  await page.screenshot({path:'/tmp/on-page-before-draw-'+viewport.width+'.png'});

  const touch=viewport.width<600?await page.context().newCDPSession(page):null;
  if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:zone.x,y:zone.y}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:zone.endX,y:zone.y}]});}
  else{await page.mouse.move(zone.x,zone.y);await page.mouse.down();await page.mouse.move(zone.endX,zone.y,{steps:8});}
  assert.equal(await page.evaluate(()=>testGame.state.walls.length),1,'real wall appears mid-drag');assert(await page.evaluate(()=>testGame.state.stats.ink<testGame.state.stats.maxInk));
  if(touch)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
  assert(!await page.locator('#lessonNext').isDisabled());await page.evaluate(()=>{testGame.api.update(5);testGame.api.draw()});
  assert.deepEqual(await page.evaluate(()=>({hp:testGame.state.player.hp,time:testGame.state.timeLeft,kills:testGame.state.kills})),initial);
  await page.screenshot({path:'/tmp/on-page-draw-'+viewport.width+'.png'});
  for(const target of ['.inkbox','.hpbox','.timer']){
   await page.click('#lessonNext');await checkCard();assert(await page.locator(target).evaluate(e=>e.classList.contains('lesson-spotlight')));
   const pointed=await page.evaluate(selector=>{const r=document.querySelector(selector).getBoundingClientRect(),d=document.getElementById('lessonOverlayFocus').getAttribute('d');return d.includes(String(Math.max(0,r.left-5)))},target);assert(pointed,'spotlight follows real HUD bounds');
   await page.screenshot({path:'/tmp/on-page-'+target.slice(1)+'-'+viewport.width+'.png'});
  }
  await page.click('#lessonNext');assert(!await page.locator('#lessonOverlay').isVisible());assert.equal(await page.evaluate(()=>testGame.state.walls.length),1);
  await page.evaluate(()=>{const g=testGame;g.state.wave=2;g.api.startWave();});assert.equal(await page.evaluate(()=>testGame.api.lessonSnapshot().kind),'erase');
  await page.click('#lessonNext');await checkCard();
  const ez=await page.evaluate(()=>{const g=testGame,z=g.api.lessonSnapshot().practice,r=g.dom.canvas.getBoundingClientRect();return {x:r.x+z.x+z.width/2,y:r.y+z.y+z.height/2};});
  const before=await page.evaluate(()=>testGame.state.stats.ink);await page.screenshot({path:'/tmp/on-page-erase-before-'+viewport.width+'.png'});
  if(touch){
   const b=await page.locator('#eraserBtn').boundingBox(),thumb={id:2,x:b.x+b.width/2,y:b.y+b.height/2},finger={id:1,...ez};
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thumb]});await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thumb,finger]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[thumb,{...finger,y:finger.y+8}]});
   assert(await page.evaluate(()=>!!testGame.api.lessonSnapshot().eraserCursor));await page.screenshot({path:'/tmp/on-page-erase-'+viewport.width+'.png'});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   await page.mouse.move(ez.x,ez.y);await page.mouse.down({button:'right'});await page.mouse.move(ez.x,ez.y+8,{steps:3});assert(await page.evaluate(()=>!!testGame.api.lessonSnapshot().eraserCursor));await page.screenshot({path:'/tmp/on-page-erase-'+viewport.width+'.png'});await page.mouse.up({button:'right'});
  }
  assert(!await page.locator('#lessonNext').isDisabled());assert(await page.evaluate(before=>testGame.state.stats.ink>before,before));assert.equal(await page.evaluate(()=>testGame.state.walls.length),2);
  if(viewport.width===393){
   await page.setViewportSize({width:851,height:393});await page.evaluate(()=>{testGame.api.resize();testGame.api.draw();});
   const moved=await page.evaluate(()=>{const g=testGame,z=g.api.lessonSnapshot().practice;return g.state.walls.filter(w=>w.lessonSeed).every(w=>w.pts.every(p=>Math.abs(p.y-z.y-z.height/2)<.01));});
   assert(moved,'rotating moves real practice fragments into the current spotlight');
   await page.setViewportSize(viewport);await page.evaluate(()=>{testGame.api.resize();testGame.api.draw();});
  }
  for(let i=0;i<3;i++)await page.click('#lessonNext');
  assert.equal(await page.evaluate(()=>testGame.state.paused),false);assert.equal(await page.evaluate(()=>testGame.state.stats.ink),await page.evaluate(()=>testGame.state.stats.maxInk));assert.equal(await page.evaluate(()=>testGame.state.walls.length),0);
  await page.evaluate(()=>{testGame.api.awardScraps(1);testGame.api.gameOver()});await page.click('#againBtn');
  assert(await page.locator('#scrapCoach').isVisible());assert(await page.locator('#startBtn').isDisabled());
  await page.screenshot({path:'/tmp/on-page-scrap-cover-'+viewport.width+'.png'});await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'splashHubBtn');await page.click('#splashHubBtn');
  assert.match(await page.textContent('#scrapCoachProgress'),/2 of 3/);await page.click('#hubNotebookBtn');
  assert.match(await page.textContent('#scrapCoachProgress'),/3 of 3/);const balance=await page.evaluate(()=>testGame.api.notebookSnapshot().scraps);
  await page.screenshot({path:'/tmp/on-page-scrap-buy-'+viewport.width+'.png'});await page.click('#notebookBuy-starterEraser');
  assert(!await page.locator('#scrapCoach').isVisible());assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),balance);
  await page.reload();await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#startBtn');assert(!await page.locator('#lessonOverlay').isVisible());assert.equal(await page.evaluate(()=>testGame.state.stats.eraseRefund),.3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log('PASS:',viewport.width,'real-page tools, pause, HUD pointing, required actual menu buttons and saved lessons');await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
