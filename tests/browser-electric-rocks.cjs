// First-play lessons, native/desktop practice and required starter purchase.
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
  for(const powered of [false,true]){
   const result=await page.evaluate(powered=>{
    const g=testGame;g.api.resetRun();g.state.timeLeft=60;g.state.enemies=[];
    g.catalog.upgrades.find(u=>u.name==='Electric Rocks').apply();g.state.inks.electric=powered?1:0;
    const x=g.state.player.x,y=g.state.player.y;
    g.api.createWall([{x:x+55,y:y-105},{x:x+55,y:y-15}]);
    const e=g.api.spawnEnemy('grunt');e.x=x+120;e.y=y-110;e.hp=e.maxHp=100;e.chainCd=0;
    g.api.updateStevie(.1);g.api.updateProjectiles(.3);
    const snapshot=JSON.stringify(g.state);g.api.draw();
    return {pure:snapshot===JSON.stringify(g.state),charge:g.state.walls[0].rockCharge?.life,cd:g.state.walls[0].rockPulseCd,hp:e.hp,rocks:g.state.projectiles.length,blue:g.state.projectiles[0]?.electricLevel};
   },powered);
   assert.equal(result.pure,true);assert.equal(result.rocks,1);assert.equal(result.blue,1);
   if(powered){assert.equal(result.cd,1.1);assert.equal(result.hp,96)}else{assert.equal(result.charge,2.4);assert.equal(result.hp,100)}
   await page.screenshot({path:'/tmp/electric-rock-'+(powered?'burst':'charge')+'-'+viewport.width+'.png'});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>testGame.api.draw());assert.deepEqual(errors,[]);
  console.log('PASS: real electric throw crosses a live wall, charges/bursts, continues flight and renders purely at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
