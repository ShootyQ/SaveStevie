// Real Web Audio decoding and game-event effects in desktop/phone browsers.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('doodleDefenderBestV4','1')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/',{waitUntil:'domcontentloaded',timeout:60000});await page.click('#startBtn');
   await page.evaluate(async()=>{testGame.api.setDevMode(true);testGame.api.resetRun();testGame.state.spawnTimer=9999;await testGame.api.unlockSoundEffects()});
   assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().ready),29);assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().failed),0);
   await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});
   const surge=await page.evaluate(()=>{const g=testGame;g.state.enemies=[];g.state.walls=[];g.state.projectiles=[];g.state.floaters=[];g.state.stats.rockDamage=0;g.state.player.x=g.state.W*.8;g.state.player.y=g.state.H*.5;g.state.synergies.add('Rail Ink');g.state.inks.electric=g.state.inks.repulsion=1;window.emitter=g.api.spawnEnemy(false,g.state.W*.4,g.state.H*.5,'grunt');emitter.hp=emitter.maxHp=1000;g.api.applyRepulsionContact(emitter,.8);window.near=g.api.spawnEnemy(false,emitter.x+35,emitter.y,'grunt');near.hp=near.maxHp=1000;window.far=g.api.spawnEnemy(false,emitter.x+90,emitter.y,'grunt');far.hp=far.maxHp=1000;g.api.updateRailInk(.45);g.api.updateEnemyAnimations(.45);g.api.draw();return {fx:g.api.railInkSnapshot(),near:near.hp,far:far.hp};});assert.equal(surge.fx[0].radius,42);assert(surge.near<1000&&surge.far===1000);await page.screenshot({path:'/tmp/stevie-rail-small-'+viewport.width+'.png'});
   const expanded=await page.evaluate(()=>{const g=testGame;for(let i=0;i<4;i++)g.api.hitPaper({damage:0,electricLevel:1},emitter);g.api.updateRailInk(.5);g.api.updateEnemyAnimations(.5);g.api.draw();return {fx:g.api.railInkSnapshot(),far:far.hp};});assert.equal(expanded.fx[0].radius,114);assert(expanded.far<1000);await page.screenshot({path:'/tmp/stevie-rail-expanded-'+viewport.width+'.png'});
   const pure=await page.evaluate(()=>{const g=testGame,s=JSON.stringify(g.state),fx=JSON.stringify(g.api.railInkSnapshot());g.api.draw();return s===JSON.stringify(g.state)&&fx===JSON.stringify(g.api.railInkSnapshot());});assert(pure);assert.deepEqual(errors,[]);console.log('PASS: repelled electric emitter, expanding damage front, electric-paper amplification and pure desktop/phone rendering at',viewport.width);await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
