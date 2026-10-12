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
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
   await page.evaluate(async()=>{testGame.api.setDevMode(true);testGame.api.resetRun();testGame.state.spawnTimer=9999;await testGame.api.unlockSoundEffects()});
   assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().ready),29);assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().failed),0);
   await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});
   const pressure=await page.evaluate(()=>{const g=testGame;g.state.enemies=[];g.state.walls=[];g.state.projectiles=[];g.state.floaters=[];g.state.stats.rockDamage=0;g.state.player.x=g.state.W*.8;g.state.player.y=g.state.H*.5;g.state.synergies.add('Thermal Shock');g.state.inks.fire=g.state.inks.frost=1;window.host=g.api.spawnEnemy(false,g.state.W*.4,g.state.H*.5,'grunt');window.neighbour=g.api.spawnEnemy(false,host.x+45,host.y,'grunt');host.hp=host.maxHp=1000;host.burn=2;host.burnDps=10;host.freeze=1;g.api.resetSoundEffects();const before=g.api.soundEffectsSnapshot().played;g.api.applySynergies(host,.02);g.api.updateThermalShockEnemy(host,.3);g.api.updateEnemyAnimations(.3);g.api.draw();return {phase:host.thermalShock?.phase,sx:g.api.enemyAnimationPose(host).sx,played:g.api.soundEffectsSnapshot().played-before,voices:g.api.soundEffectsSnapshot().voices.map(v=>v.kind)};});assert.equal(pressure.phase,'pressure');assert(pressure.sx>1.05&&pressure.played===1&&pressure.voices.includes('thermalHeat'));await page.screenshot({path:'/tmp/stevie-thermal-pressure-'+viewport.width+'.png'});
   const pop=await page.evaluate(()=>{const g=testGame,before=g.api.soundEffectsSnapshot().played;g.api.updateThermalShockEnemy(host,.2);g.api.updateThermalShockTime(.12);g.api.updateEnemyAnimations(.2);g.api.draw();return {phase:host.thermalShock?.phase,hp:host.hp,stun:neighbour.stun,pops:g.api.thermalShockSnapshot().length,played:g.api.soundEffectsSnapshot().played-before,voices:g.api.soundEffectsSnapshot().voices.map(v=>v.kind)};});assert.equal(pop.phase,'soot');assert.equal(pop.hp,974);assert(pop.stun>0&&pop.pops===1&&pop.played===1&&pop.voices.includes('thermalPop'));await page.screenshot({path:'/tmp/stevie-thermal-pop-'+viewport.width+'.png'});
   const pure=await page.evaluate(()=>{const g=testGame,before=JSON.stringify(g.state),fx=JSON.stringify(g.api.thermalShockSnapshot());g.api.draw();return before===JSON.stringify(g.state)&&fx===JSON.stringify(g.api.thermalShockSnapshot());});assert(pure);assert.deepEqual(errors,[]);console.log('PASS: thermal pressure/cracks, steam/chips/soot, neighbour stagger, both real decoded reaction sounds and pure render at',viewport.width);await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
