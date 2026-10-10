// Rubble Ruff cue and real erase controls for returning desktop/phone players.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='index.html'&&viewport.width<600)body=body.toString('utf8').replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  const enemy=await page.evaluate(()=>{const g=testGame;g.state.wave=2;const e=g.api.spawnEnemy(false,g.state.player.x+80,g.state.player.y-80,'scrubber');g.api.updateScrubberHint(0);g.api.updateUI();const snapshot=JSON.stringify(g.state);g.api.draw();return {x:e.x,y:e.y,w:g.state.W,h:g.state.H,pure:snapshot===JSON.stringify(g.state)}});assert(enemy.pure);
  assert.equal(await page.locator('#scrubberHint').isVisible(),true);assert.equal(await page.locator('#eraserBtn').evaluate(e=>e.classList.contains('scrubber-erase-cue')),true);
  assert.match(await page.textContent('#scrubberHintControl'),viewport.width<600?/other finger/:/Right-drag/);
  const age=await page.evaluate(()=>{const g=testGame,a=g.api.scrubberHintSnapshot().age;g.state.paused=true;g.api.update(2);g.state.paused=false;return [a,g.api.scrubberHintSnapshot().age]});assert.equal(age[0],age[1]);
  const hintBox=await page.locator('#scrubberHint').boundingBox(),controlBox=await page.locator('#eraserBtn').boundingBox();assert(hintBox.y+hintBox.height<=controlBox.y,'hint stays above controls');
  await page.screenshot({path:'/tmp/ruff-erase-cue-'+viewport.width+'.png'});
  const canvas=await page.locator('#game').boundingBox(),x=canvas.x+enemy.x*canvas.width/enemy.w,y=canvas.y+enemy.y*canvas.height/enemy.h;
  for(let pass=1;pass<=3;pass++){
  if(viewport.width<600){const cdp=await page.context().newCDPSession(page),button=await page.locator('#eraserBtn').boundingBox(),thumb={x:button.x+button.width/2,y:button.y+button.height/2,id:2},finger={x,y,id:1};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thumb]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thumb,finger]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[thumb,{...finger,x:x+5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x+5,y);await page.mouse.up({button:'right'});}
   await page.evaluate(()=>testGame.api.draw());
   if(pass<3){assert.equal(await page.evaluate(()=>testGame.state.enemies.find(e=>e.type==='scrubber').eraseHits),pass);await page.screenshot({path:'/tmp/ruff-wiped-'+pass+'-'+viewport.width+'.png'});}
  }
  assert.equal(await page.evaluate(()=>testGame.state.enemies.some(e=>e.type==='scrubber')),false,'rub over Ruff removes him');assert.equal(await page.locator('#scrubberHint').isVisible(),false);
  await page.evaluate(()=>{const g=testGame;g.api.spawnEnemy(false,g.state.player.x+80,g.state.player.y-80,'scrubber');g.api.updateScrubberHint(0)});assert.equal(await page.locator('#scrubberHint').isVisible(),false,'once per run');
  await page.evaluate(()=>{const g=testGame;g.api.resetRun();g.api.spawnEnemy(false,g.state.player.x+80,g.state.player.y-80,'scrubber');g.api.updateScrubberHint(0)});assert.equal(await page.locator('#scrubberHint').isVisible(),true);
  await page.evaluate(()=>testGame.api.updateScrubberHint(8.1));assert.equal(await page.locator('#scrubberHint').isVisible(),false);assert.deepEqual(errors,[]);
  console.log('PASS: returning-player platform cue, pure label, pause, actual rub removal, once-per-run/reset and expiry at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
