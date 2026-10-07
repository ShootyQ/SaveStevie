// Optional browser regression for enemy personality motion and canvas rendering.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  const result=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun();g.state.wave=9;g.api.startWave();g.state.spawnTimer=999;g.state.player.hp=g.state.player.maxHp=10000;
   const p=g.state.player,half=Math.min(80,g.state.H*.2),wx=p.x-60;
   const e=g.api.spawnEnemy(false,p.x-110,p.y,'sniper');e.hp=e.maxHp=1000;e.shootCd=.01;
   const wall={pts:[{x:wx,y:p.y-half},{x:wx,y:p.y+half}],hp:10000,maxHp:10000,thick:8,life:200,maxLife:200};g.state.walls=[wall];
   if(!g.api.shotBlocked(e.x,e.y,p.x,p.y,3))throw Error('Fixture must start blocked');
   const start={x:e.x,y:e.y};let frames=0;
   while(!g.state.enemyShots.length&&frames++<1500){
    g.api.update(.03);if(g.api.pointSegDist(e.x,e.y,wx,p.y-half,wx,p.y+half)<e.r+4)throw Error('Sniper crossed wall');
   }
   if(!g.state.enemyShots.length)throw Error('Sniper never reached a firing lane');
   if(!g.api.sniperCanAim(e))throw Error('Sniper fired without sight');
   const moved=Math.hypot(e.x-start.x,e.y-start.y);e.shootCd=.4;g.api.updateEnemyAnimations(.25);g.api.draw();window.sniper=e;
   return {moved,frames,pose:g.api.enemyActionFrame(e)};
  });
  assert.ok(result.moved>50);assert.equal(result.pose,'sniper-ready');
  await page.screenshot({path:`/tmp/smart-sniper-${viewport.width}.png`});
  await page.evaluate(()=>{
   const g=testGame,e=sniper,p=g.state.player;g.state.enemyShots=[];e.shootCd=.01;
   const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy),x=(p.x+e.x)/2,y=(p.y+e.y)/2;
   g.state.walls=[{pts:[{x:x-dy/d*40,y:y+dx/d*40},{x:x+dy/d*40,y:y-dx/d*40}],hp:1000,maxHp:1000,thick:8,life:100}];
   g.api.update(.03);if(g.state.enemyShots.length||e.shootCd<.65)throw Error('Cover failed to interrupt aim');
   e.freeze=1;const before={x:e.x,y:e.y};g.api.update(.1);if(e.x!==before.x||e.y!==before.y)throw Error('Frozen sniper moved');
   g.state.paused=true;const snapshot=JSON.stringify(g.state);g.api.update(.1);if(snapshot!==JSON.stringify(g.state))throw Error('Pause changed combat');
  });
  assert.deepEqual(errors,[]);console.log('PASS: smart sniper at',viewport.width,JSON.stringify(result));await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
