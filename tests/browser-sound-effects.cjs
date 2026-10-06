// Real Web Audio decoding and game-event effects in desktop/phone browsers.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('doodleDefenderBestV4','1')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
   await page.evaluate(async()=>{testGame.api.setDevMode(true);testGame.api.resetRun();testGame.state.spawnTimer=9999;await testGame.api.unlockSoundEffects()});
   assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().ready),11);assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().failed),0);
   const box=await page.locator('#game').boundingBox();await page.mouse.move(box.x+35,box.y+100);await page.mouse.down();await page.mouse.move(box.x+100,box.y+110,{steps:5});await page.mouse.up();
   const drawn=await page.evaluate(()=>({s:testGame.api.soundEffectsSnapshot(),walls:testGame.state.walls.length}));assert.ok(drawn.walls>0);assert.ok(drawn.s.played>=2,'scribble and finished-wall sounds play');
   await page.evaluate(()=>{
    const g=testGame,w=g.state.walls[0],p=w.pts[0];g.api.damageWall(w,1,p.x,p.y);
    const e=g.api.spawnEnemy(false,g.state.W*.25,g.state.H*.25,'tank');e.hp=e.maxHp=1000;g.api.chainLightning(e,1);
    g.state.projectiles=[{x:e.x,y:e.y,target:e,speed:290,damage:10,life:1}];g.api.updateProjectiles(.01);g.api.killEnemy(e);
   });const effects=await page.evaluate(()=>testGame.api.soundEffectsSnapshot());assert.ok(effects.played>=6);assert.ok(effects.voices.length<=6);
   await page.evaluate(()=>{testGame.state.paused=true;testGame.api.syncSoundEffects()});assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().voices.length),0);
   await page.evaluate(()=>{testGame.state.paused=false;testGame.api.openOptions()});await page.locator('#effectsVolume').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});assert.equal(await page.evaluate(()=>testGame.api.audioSettings().effectsVolume),0);
   await page.screenshot({path:'/tmp/sound-options-'+viewport.width+'.png'});
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' eleven real decoded effects, pointer scribbles, pencil/wall/rock/zap/defeat events, bounded overlap, pause and live volume');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
