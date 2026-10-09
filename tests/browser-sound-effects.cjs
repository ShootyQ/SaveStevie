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
   assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().ready),27);assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().failed),0);
   const box=await page.locator('#game').boundingBox();await page.mouse.move(box.x+35,box.y+100);await page.mouse.down();await page.mouse.move(box.x+100,box.y+110,{steps:5});await page.mouse.up();
   const drawn=await page.evaluate(()=>({s:testGame.api.soundEffectsSnapshot(),walls:testGame.state.walls.length}));assert.ok(drawn.walls>0);assert.ok(drawn.s.played>=2,'scribble and finished-wall sounds play');
   await page.evaluate(()=>{
    const g=testGame,w=g.state.walls[0],p=w.pts[0];g.api.damageWall(w,1,p.x,p.y);
    const e=g.api.spawnEnemy(false,g.state.W*.25,g.state.H*.25,'tank');e.hp=e.maxHp=1000;g.api.chainLightning(e,1);
    g.state.projectiles=[{x:e.x,y:e.y,target:e,speed:290,damage:10,life:1}];g.api.updateProjectiles(.01);g.api.killEnemy(e);
   });const effects=await page.evaluate(()=>testGame.api.soundEffectsSnapshot());assert.ok(effects.played>=6);assert.ok(effects.voices.length<=6);
   const added=await page.evaluate(()=>{
    const g=testGame;g.api.resetSoundEffects();g.state.inks.fire=g.state.inks.poison=g.state.inks.frost=1;
    const e=g.api.spawnEnemy(false,60,60,'tank');e.hp=e.maxHp=1000;g.api.applyInkContact(e,2);
    const kinds=g.api.soundEffectsSnapshot().voices.map(v=>v.kind);g.api.resetSoundEffects();g.state.wave=5;g.api.spawnEnemy(true,30,30);
    return {kinds,entrance:g.api.soundEffectsSnapshot().voices.some(v=>v.kind==='bossEnter')};
   });
   for(const kind of ['fire','poison','frost'])assert.ok(added.kinds.includes(kind),kind+' contact plays its sound');assert.equal(added.entrance,true);
   const wobble=await page.evaluate(()=>{
    const g=testGame,rig=DoodleDefender.WobblechompRig;g.api.resetRun();g.state.wave=10;g.api.startWave();g.state.enemies=[];g.state.walls=[];g.state.enemyShots=[];g.state.player.hp=g.state.player.maxHp=10000;g.state.stats.ink=g.state.stats.maxInk=1000;
    const e=g.api.spawnEnemy(true),s=g.api.bossBrain(e).wobble,kinds=()=>g.api.soundEffectsSnapshot().voices.map(v=>v.kind),events={};
    const prepare=kind=>{g.api.resetSoundEffects();s.model=rig.create();s.model.time=1;s.attack=null;s.gap=0;s.blockStun=0;s.cutWindow=null;s.turn={punch:0,spikes:1,teeth:2,beam:3,roll:5}[kind];g.api.updateWobbleBoss(e,.001)};
    prepare('punch');events.windup=kinds();g.api.updateWobbleBoss(e,.9);events.punch=kinds();
    prepare('spikes');g.api.updateWobbleBoss(e,1);events.spikes=kinds();
    prepare('teeth');events.teeth=kinds();
    prepare('beam');g.api.updateWobbleBoss(e,.3);events.laser=kinds();const played=g.api.soundEffectsSnapshot().played;for(let i=0;i<10;i++)g.api.updateWobbleBoss(e,.001);events.oneLaser=g.api.soundEffectsSnapshot().played===played;
    const snap=g.api.wobbleSnapshot(e),a=snap.beamOrigin,b=snap.beamTip,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),x=(a.x+b.x)/2,y=(a.y+b.y)/2;g.api.createWall([{x:x-dy/l*24,y:y+dx/l*24},{x:x+dy/l*24,y:y-dx/l*24}]);events.counterStopsLaser=!kinds().includes('wobbleLaser');
    const j=g.api.wobbleSnapshot(e).parts.stalk.joint,cx=(j.a.x+j.b.x)/2,cy=(j.a.y+j.b.y)/2;g.api.createWall([{x:cx-22,y:cy},{x:cx+22,y:cy}]);events.tear=kinds();
    prepare('roll');g.api.updateWobbleBoss(e,.9);events.roll=kinds();e.freeze=1;g.api.updateWobbleBoss(e,.01);events.freezeStopsRoll=!kinds().includes('wobbleRoll');e.freeze=0;
    s.phase=2;s.transition=0;s.rollVX=145;s.rollVY=0;s.toothClock=99;s.hitCooldown=0;s.armedFor=0;s.rollDistance=0;s.trail=[];s.model.phaseTwoRoll=true;s.model.rollAge=1.2;g.api.updateWobbleBoss(e,.01);events.phaseTwo=kinds();g.state.paused=true;g.api.syncSoundEffects();events.pauseStops=kinds().length===0;g.state.paused=false;g.api.updateWobbleBoss(e,.01);events.resume=kinds();g.api.killEnemy(e);events.deathStopsRoll=!kinds().includes('wobbleRoll');g.api.resetRun();return events;
   });
   for(const [event,kind] of Object.entries({windup:'wobbleWindup',punch:'wobblePunch',spikes:'wobbleSpike',teeth:'wobbleTeeth',laser:'wobbleLaser',tear:'wobbleTear',roll:'wobbleRoll',phaseTwo:'wobbleRoll',resume:'wobbleRoll'}))assert(wobble[event].includes(kind),event+' plays supplied clip');
   assert(!wobble.punch.includes('wobbleWindup'));for(const event of ['oneLaser','counterStopsLaser','freezeStopsRoll','pauseStops','deathStopsRoll'])assert(wobble[event],event);
   await page.evaluate(()=>testGame.api.sustainSound('wobbleLaser'));await page.waitForTimeout(1150);assert(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().voices.some(v=>v.kind==='wobbleLaser')),'laser loops beyond its one-second sample');
   await page.evaluate(()=>{testGame.state.paused=true;testGame.api.syncSoundEffects()});assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().voices.length),0);
   await page.evaluate(()=>{testGame.state.paused=false;testGame.api.openOptions()});await page.locator('#effectsVolume').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});assert.equal(await page.evaluate(()=>testGame.api.audioSettings().effectsVolume),0);
   await page.screenshot({path:'/tmp/sound-options-'+viewport.width+'.png'});
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' twenty-seven real decoded effects, pointer scribbles, pencil/wall/rock/zap/defeat events, seven Wobblechomp event sounds, looping/interruption/resume, bounded overlap, pause and live volume');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
