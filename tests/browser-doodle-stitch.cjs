// Optional browser regression for Doodle Stitch rewards and mouse/touch connections.
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
  await page.evaluate(()=>{const g=testGame;g.api.setWaveFinaleEnabled(false);g.state.legendaryWave=0;g.api.getUpgrade=()=>({...g.catalog.upgrades.find(u=>u.name==='Doodle Stitch'),rarity:'common'});g.api.waveComplete();g.api.proceedAfterWave();});
  const card=page.getByRole('button',{name:'Doodle Stitch, common. Inspect upgrade.',exact:true});await card.click();assert.match(await page.textContent('#upgradeDetailsBody'),/75%/);assert.equal(await page.evaluate(()=>testGame.state.stats.doodleStitch),false);assert.equal(await card.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0&&e.src.includes('doodle-stitch.svg')),true);await page.click('#takeUpgradeBtn');assert.equal(await page.evaluate(()=>testGame.state.stats.doodleStitch),true);
  await page.evaluate(()=>{const g=testGame;g.state.enemies=[];g.state.spawnTimer=9999;g.state.stats.ink=g.state.stats.maxInk=1000;g.api.createWall([{x:linePoint.x-80,y:linePoint.y},{x:linePoint.x,y:linePoint.y}]);window.parentWall=g.state.walls[0];parentWall.hp=3;parentWall.life=10;});
  let hp=3;const cdp=await page.context().newCDPSession(page);
  for(let i=1;i<=4;i++){
   const y=p.y+(i-1)*40;
   if(viewport.width<600){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:y+40,id:1}]});await page.waitForFunction(({n,y})=>parentWall.stitchCount===n&&parentWall.pts.at(-1).y>=y-1,{n:i,y:await page.evaluate(n=>linePoint.y+n*40,i)},{polling:50});}
   else{await page.mouse.move(p.x,y);await page.mouse.down();await page.mouse.move(p.x,y+40,{steps:4});}
   hp+=65*40/180*([.75,.5,.25][i-1]||0);const during=await page.evaluate(()=>({hp:parentWall.hp,count:parentWall.stitchCount,walls:testGame.state.walls.length,life:parentWall.life}));assert(Math.abs(during.hp-hp)<1e-4,JSON.stringify({viewport,i,during,hp}));assert.equal(during.count,i);assert.equal(during.walls,1);assert.equal(during.life,10);
   const ink=await page.evaluate(()=>testGame.state.stats.ink);
   if(viewport.width<600)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();assert.equal(await page.evaluate(()=>testGame.state.stats.ink),ink,'release does not pay twice');
  }
  await page.evaluate(()=>testGame.api.draw());await page.screenshot({path:'/tmp/doodle-stitch-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>parentWall.stitchPoints.length),4);const before=await page.evaluate(()=>JSON.stringify(testGame.state));await page.evaluate(()=>testGame.api.draw());assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),before,'knot drawing is pure');assert.deepEqual(errors,[]);
  console.log('PASS: Doodle Stitch card/art/inspection, one-time unlock, real desktop/touch extensions, live 75/50/25/0 HP, preserved damage/lifetime, one payment and visible knots at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
