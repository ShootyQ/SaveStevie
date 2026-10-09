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

  const p=await reset();
  await page.evaluate(()=>{const g=testGame;g.state.wave=2;g.api.startWave();g.state.spawnTimer=0;g.api.spawnWaveEnemies(0);if(!g.state.enemies.some(e=>e.type==='scrubber'))throw Error('wave 2 missing newcomer');g.state.enemies=[];g.state.spawnTimer=9999;g.api.createWall([{x:linePoint.x-80,y:linePoint.y},{x:linePoint.x+80,y:linePoint.y}]);window.scrubber=g.api.spawnEnemy(false,linePoint.x,linePoint.y-18,'scrubber');const ink=g.state.stats.ink;g.api.updateScrubber(scrubber,.1);if(g.state.walls.length!==2||g.state.stats.ink!==ink)throw Error('scrub gap or no-refund rule failed');g.api.updateEnemyAnimations(.05);g.api.draw();});
  await page.screenshot({path:'/tmp/scrubber-'+viewport.width+'.png'});
  const kills=await page.evaluate(()=>testGame.state.kills);
  if(viewport.width<600){const cdp=await page.context().newCDPSession(page),button=await page.locator('#eraserBtn').boundingBox(),thumb={x:button.x+button.width/2,y:button.y+button.height/2,id:2},finger={x:p.x,y:p.y-18,id:1};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thumb]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thumb,finger]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(p.x,p.y-18);await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});}
  assert.equal(await page.evaluate(()=>testGame.state.enemies.includes(scrubber)),false);assert.equal(await page.evaluate(()=>testGame.state.kills),kills+1);
  await page.evaluate(()=>{testGame.api.discoverMonster('scrubber');testGame.api.openCompendium()});assert.match(await page.textContent('#monsterCards'),/Rubble Ruff/);assert.equal(await page.locator('img[src*="scrubber.png"]').evaluate(e=>e.complete&&e.naturalWidth>0),true);
  assert.deepEqual(errors,[]);console.log('PASS: wave-two spawn, real scrub gap without refund, sprite rendering, mouse/two-finger erase kill and Notebook entry at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
