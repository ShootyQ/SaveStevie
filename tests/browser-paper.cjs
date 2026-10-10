// Optional browser regression for paper wear and underground eraser counters.
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


  await reset();
  await page.evaluate(()=>{testGame.state.stats.inkRegen=0;testGame.state.stats.ink=0;testGame.api.setDrawingControl('eraserToggle',true);});await page.click('#eraserBtn');
  const points=await page.evaluate(()=>{const g=testGame,r=g.dom.canvas.getBoundingClientRect();const entry={x:50,y:110},exit={x:g.state.W<600?90:g.state.W/2-170,y:g.state.H<400?135:Math.min(240,g.state.H/2-120)};return {entry,exit,left:r.left,top:r.top};});
  const cdp=await page.context().newCDPSession(page);const touch=viewport.width<600;await page.evaluate(()=>{window.paperMoveCount=0;testGame.dom.canvas.addEventListener('pointermove',()=>paperMoveCount++);});
  const down=async p=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x+points.left,y:p.y+points.top,id:1}]});else{await page.mouse.move(p.x+points.left,p.y+points.top);await page.mouse.down({button:'right'});}};
  const move=async p=>{const before=await page.evaluate(()=>paperMoveCount);if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+points.left,y:p.y+points.top,id:1}]});else await page.mouse.move(p.x+points.left,p.y+points.top);await page.waitForFunction(n=>paperMoveCount>n,before,{polling:20});};
  const up=async()=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up({button:'right'});};
  for(const p of [points.entry,points.exit]){
   await down(p);const before=await page.evaluate(()=>testGame.state.paper.holes.length);
   for(let i=0;i<25;i++){await move({x:p.x+(i%2?0:10),y:p.y});await page.evaluate(()=>testGame.api.updatePaper(.1));if(i===23)assert.equal(await page.evaluate(()=>testGame.state.paper.holes.length),before);}
   await up();assert.equal(await page.evaluate(()=>testGame.state.paper.holes.length),before+1,'real rubbing opens local hole at 2.5 seconds');
  }
  await page.evaluate(()=>{const g=testGame,h=g.state.paper.holes[0];window.burrower=g.api.spawnEnemy(false,h.x,h.y,'grunt');burrower.hp=burrower.maxHp=100;const random=Math.random;Math.random=()=>0;g.api.updatePaperEnemy(burrower,.01);Math.random=random;g.api.updatePaperEnemy(burrower,.6);g.api.draw();});assert.equal(await page.evaluate(()=>burrower.paperTunnel.phase),'travel');
  await page.screenshot({path:'/tmp/paper-holes-'+viewport.width+'.png'});
  await down(await page.evaluate(()=>({x:burrower.x,y:burrower.y})));
  for(let i=0;i<20;i++){const p=await page.evaluate(n=>({x:burrower.x+(n%2?-6:10),y:burrower.y}),i);await move(p);await page.evaluate(()=>{testGame.api.updatePaper(.1);testGame.api.updatePaperEnemy(burrower,.1);});if(i===18)assert.equal(await page.evaluate(()=>burrower.paperTunnel.phase),'travel');}
  await up();assert.equal(await page.evaluate(()=>burrower.paperTunnel.phase),'emerge',JSON.stringify(await page.evaluate(()=>({t:burrower.paperTunnel,x:burrower.x,y:burrower.y,W:testGame.state.W,H:testGame.state.H}))));
  await page.evaluate(()=>{const t=burrower.paperTunnel;window.warningBefore=t.warning;testGame.state.paused=true;testGame.api.update(.2);});assert.equal(await page.evaluate(()=>burrower.paperTunnel.warning),await page.evaluate(()=>warningBefore));await page.evaluate(()=>{testGame.state.paused=false;for(let i=0;i<8;i++)testGame.api.updatePaperEnemy(burrower,.1);});assert.equal(await page.evaluate(()=>!!burrower.paperTunnel),false);assert(await page.evaluate(()=>burrower.stun>0));
  await page.evaluate(()=>{const g=testGame;g.state.enemyShots=[{x:80,y:150,r:3,damage:7}];});await down({x:70,y:150});await move({x:90,y:150});await up();assert.equal(await page.evaluate(()=>testGame.state.enemyShots.length),0);assert.equal(await page.evaluate(()=>testGame.state.stats.ink),0,'erase counters require no ink');
  await page.evaluate(()=>{const g=testGame;g.state.enemies=[];for(const [i,type] of ['grunt','scrubber','fast','sprinter','bouncer'].entries()){const e=g.api.spawnEnemy(false,45+i*(g.state.W-90)/4,170,type);e.paperTunnel={phase:'enter',entryTimer:.25,age:.25,exit:{x:e.x,y:e.y}};}g.api.draw();});await page.screenshot({path:'/tmp/paper-entry-animations-'+viewport.width+'.png'});await page.evaluate(()=>{for(const e of testGame.state.enemies){e.paperTunnel.phase='emerge';e.paperTunnel.warning=.2;}testGame.api.draw();});await page.screenshot({path:'/tmp/paper-exit-animations-'+viewport.width+'.png'});
  const snapshot=await page.evaluate(()=>JSON.stringify(testGame.state));await page.evaluate(()=>testGame.api.draw());assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),snapshot);await page.evaluate(()=>{testGame.state.wave=2;testGame.api.startWave({skipIntro:true});});assert.equal(await page.evaluate(()=>testGame.state.paper.holes.length+testGame.state.paper.patches.length),0,'next wave has clean paper');assert.deepEqual(errors,[]);
  console.log('PASS: real mouse/touch 2.5-second paper wear, hole routing, two-second forced/warned emergence, pause, empty-ink projectile erase and pure rendering at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
