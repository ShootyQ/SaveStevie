// Optional browser regression for erasing and real multi-touch tool switching.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='index.html'&&viewport.width<600)body=body.toString('utf8').replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  const reset=async()=>page.evaluate(()=>{
   const g=testGame;g.api.resetRun();g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.enemies=[];g.api.setDrawingControl('eraserToggle',false);g.api.setDrawingControl('eraserLeft',false);
   const r=g.dom.canvas.getBoundingClientRect(),x=g.state.W/2,y=Math.max(130,g.state.H*.4);window.linePoint={x,y};return {x:x+r.left,y:y+r.top};
  });
  let p=await reset();await page.mouse.move(p.x-80,p.y);await page.mouse.down();await page.mouse.move(p.x+80,p.y,{steps:10});await page.mouse.up();
  await page.evaluate(()=>{if(testGame.state.walls.length!==1)throw Error('normal drawing failed');testGame.state.stats.ink=0;});
  await page.mouse.move(p.x,p.y);await page.mouse.down({button:'right'});await page.mouse.move(p.x,p.y+20,{steps:4});
  await page.evaluate(()=>{const g=testGame;if(g.state.walls.length!==2||g.state.stats.ink<=0||!g.api.eraserActive())throw Error('right erase failed');const before=JSON.stringify(g.state);g.api.draw();if(before!==JSON.stringify(g.state))throw Error('cursor changed state');});
  await page.screenshot({path:'/tmp/eraser-right-'+viewport.width+'.png'});await page.mouse.up({button:'right'});
  assert.equal(await page.evaluate(()=>testGame.api.eraserActive()),false);
  p=await reset();const cdp=await page.context().newCDPSession(page),button=await page.locator('#eraserBtn').boundingBox(),thumb={x:button.x+button.width/2,y:button.y+button.height/2,id:2};
  const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  await touch('touchStart',[{x:p.x-80,y:p.y,id:1}]);await touch('touchMove',[{x:p.x+80,y:p.y,id:1}]);
  await touch('touchStart',[{x:p.x+80,y:p.y,id:1},thumb]);assert.equal(await page.evaluate(()=>testGame.api.eraserActive()),true);
  await touch('touchMove',[{x:p.x,y:p.y,id:1},thumb]);await page.waitForFunction(()=>testGame.state.walls.length===1&&testGame.state.walls[0].pts.at(-1).x<=linePoint.x-20,null,{polling:50});const ink=await page.evaluate(()=>testGame.state.stats.ink);await page.evaluate(()=>testGame.api.draw());
  await page.screenshot({path:'/tmp/eraser-touch-'+viewport.width+'.png'});
  await touch('touchEnd',[thumb]);assert.equal(await page.evaluate(()=>testGame.api.eraserActive()),false);
  await touch('touchMove',[{x:p.x,y:p.y+45,id:1}]);await touch('touchEnd',[]);
  assert((await page.evaluate(()=>testGame.state.stats.ink))<ink,'same finger draws after releasing thumb');
  const b=await page.locator('#eraserBtn').boundingBox();assert(b.width>=44&&b.height>=44&&b.x>=0&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,'touch target fits');
  await touch('touchStart',[thumb]);assert.equal(await page.evaluate(()=>testGame.api.eraserActive()),true);await touch('touchCancel',[]);assert.equal(await page.evaluate(()=>testGame.api.eraserActive()),false);
  await page.click('#pauseBtn');assert.equal(await page.evaluate(()=>testGame.api.eraserActive()),false);await page.click('#pauseSettingsBtn');await page.check('#eraserToggle');await page.check('#eraserLeft');await page.click('#closeOptionsBtn');await page.click('#resumeBtn');
  const left=await page.locator('#eraserBtn').boundingBox(),pause=await page.locator('#pauseBtn').boundingBox();assert(left.x<pause.x,'left-side preference moves button');
  await page.click('#eraserBtn');assert.equal(await page.evaluate(()=>testGame.api.eraserActive()),true);await page.click('#eraserBtn');assert.equal(await page.evaluate(()=>testGame.api.eraserActive()),false);
  await page.click('#eraserBtn');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>testGame.api.eraserActive()),false,'background cancels mode');
  await page.reload();assert.equal(await page.evaluate(()=>testGame.api.drawingControls().eraserToggle),true);assert.equal(await page.evaluate(()=>testGame.api.drawingControls().eraserLeft),true);
  assert.deepEqual(errors,[]);console.log('PASS: right erase, real two-finger hold/release mid-stroke, cancellation, pure cursor, phone controls, toggle/left/pause/background/reload at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
