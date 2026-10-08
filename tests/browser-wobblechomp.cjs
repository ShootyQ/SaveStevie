// Optional Playwright check: the modular animation preview never changes combat.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500}),errors=[],touch=viewport.width<500?await page.context().newCDPSession(page):null;page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes')});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.ttf')?'font/ttf':'text/html'});
  });
  const snap=()=>page.evaluate(()=>testGame.api.wobblePreviewSnapshot());
  const advance=seconds=>page.evaluate(seconds=>{for(let t=0;t<seconds;t+=.05)testGame.api.advanceWobblePreview(.05)},seconds);
  async function cut(scribble=false,cancel=false){
   const points=await page.evaluate(scribble=>{
    const s=testGame.api.wobblePreviewSnapshot(),j=DoodleDefender.WobblechompRig.pose(s.model,s.reduced).joint;
    const x=(j.a.x+j.b.x)/2,y=(j.a.y+j.b.y)/2,dx=j.b.x-j.a.x,dy=j.b.y-j.a.y,l=Math.hypot(dx,dy);
    const a={x:x-dy/l*65,y:y+dx/l*65},b={x:x+dy/l*65,y:y-dx/l*65},r=document.getElementById('wobbleCanvas').getBoundingClientRect();
    return (scribble?[a,b,a,b]:[a,b]).map(p=>({x:r.left+s.view.x+p.x*s.view.scale,y:r.top+s.view.y+p.y*s.view.scale}));
   },scribble);
   if(touch){
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});
    for(const p of points.slice(1))await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});
    await touch.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});return;
   }
   await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();
   for(const p of points.slice(1))await page.mouse.move(p.x,p.y,{steps:5});
   if(cancel)await page.locator('#wobbleCanvas').dispatchEvent('pointercancel',{pointerId:1});
   await page.mouse.up();
  }
  await page.goto('http://127.0.0.1:8001/');if(touch)await page.evaluate(()=>document.documentElement.classList.add('native-app'));
  await page.click('#startBtn');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});
  await page.click('#pauseBtn');await page.click('#pauseSettingsBtn');await page.click('#testLabBtn');await page.click('#openWobblePreviewBtn');
  await page.waitForFunction(()=>testGame.api.wobblePreviewSnapshot().ready,null,{polling:50});await page.locator('#wobbleAutoPunch').uncheck();await advance(1);
  const combat=await page.evaluate(()=>JSON.stringify(testGame.state)),storage=await page.evaluate(()=>JSON.stringify({...localStorage}));
  await page.screenshot({path:'/tmp/wobble-idle-'+viewport.width+'.png'});
  assert.equal(await page.locator('#optionsOverlay').evaluate(el=>el.inert),true);
  assert.equal(await page.locator('#wobblePreviewOverlay').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.click('#wobblePunchBtn');await advance(1.4);assert.ok((await snap()).model.wrist.x<170);
  await page.screenshot({path:'/tmp/wobble-punch-'+viewport.width+'.png'});
  await cut(true);assert.equal((await snap()).model.armCuts,1,'one cut per scribble');await advance(1);
  await page.screenshot({path:'/tmp/wobble-dangling-'+viewport.width+'.png'});
  await page.click('#wobblePauseBtn');const paused=(await snap()).model;await advance(1);assert.deepEqual((await snap()).model,paused);await page.click('#wobblePauseBtn');
  await cut(false,true);assert.equal((await snap()).model.armCuts,1,'cancel never cuts');
  await cut();assert.equal((await snap()).model.armCuts,2);await advance(5);assert.equal((await snap()).model.debris.settled,true);assert.equal(await page.locator('#wobblePunchBtn').isDisabled(),true);
  await page.screenshot({path:'/tmp/wobble-detached-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),combat);assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),storage);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#wobblePreviewOverlay').isVisible(),false);assert.equal(await page.locator('#optionsOverlay').isVisible(),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'openWobblePreviewBtn');
  await page.click('#openWobblePreviewBtn');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'wobbleAutoPunch');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'closeWobblePreviewBtn');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal((await snap()).reduced,true);await advance(1);await cut();
  await page.setViewportSize({width:740,height:420});assert.equal((await snap()).model.armCuts,1);await cut();assert.equal((await snap()).model.armCuts,2,'cuts after resize');
  await page.click('#wobbleResetBtn');assert.equal((await snap()).model.armCuts,0);
  await page.evaluate(()=>window.dispatchEvent(new Event('savestevie:background')));assert.equal((await snap()).paused,true);
  await page.click('#closeWobblePreviewBtn');await page.click('#closeOptionsBtn');await page.click('#resumeBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),false);
  assert.deepEqual(errors,[]);console.log('PASS '+viewport.width+': punch, two gestures, cancel, debris, pause, resize, reduced motion, focus, background and unchanged combat/save');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
