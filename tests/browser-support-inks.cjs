// Solo Gravity, Frost and Vampire combat/animation checks in real browsers.
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
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
   await page.evaluate(()=>{testGame.api.setDevMode(true);testGame.api.resetRun()});
   // Real approaching monsters are pulled to a sparse two-point wall.
   const gravity=await page.evaluate(()=>{
    const g=testGame;g.state.inks.gravity=1;g.state.stacks['Gravity Ink']=1;g.state.spawnTimer=9999;g.state.timeLeft=300;
    const x=g.state.W*.35,y=g.state.H*.4;
    g.state.walls=[{pts:[{x:20,y},{x:g.state.W-20,y}],thick:8,hp:10000,maxHp:10000,life:300,maxLife:300,closed:false,intersections:0}];
    const e=g.api.spawnEnemy(false,x,y-35,'tank');e.hp=e.maxHp=10000;e.speed=0;
    for(let i=0;i<35;i++)g.api.update(.033);g.api.draw();
    return {enemy:{x:e.x,y:e.y},wallY:y,held:g.api.supportInkSnapshot().enemies[0].held,mult:g.api.gravityDamageMultiplier(e)};
   });assert.equal(gravity.held,true);assert.equal(gravity.mult,1);assert.ok(gravity.enemy.y<gravity.wallY);
   await page.screenshot({path:'/tmp/gravity-held-'+viewport.width+'.png'});
   await page.evaluate(()=>{const g=testGame;g.api.startWave();g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.inks.gravity=0;g.state.inks.frost=1;g.state.stacks={'Frost Ink':1};const y=g.state.H*.4;g.state.walls=[{pts:[{x:20,y},{x:g.state.W-20,y}],thick:8,hp:10000,maxHp:10000,life:300,maxLife:300,closed:false,intersections:0}];const e=g.api.spawnEnemy(false,g.state.W*.35,y-18,'tank');e.hp=e.maxHp=10000;e.speed=0;for(let i=0;i<20;i++)g.api.update(.033);g.api.draw()});
   assert.ok(await page.evaluate(()=>testGame.api.supportInkSnapshot().enemies[0].cold>.5));await page.screenshot({path:'/tmp/frost-charging-'+viewport.width+'.png'});
   const frozen=await page.evaluate(()=>{const g=testGame;for(let i=0;i<20;i++)g.api.update(.033);g.api.draw();const e=g.state.enemies[0],hp=e.hp,wallHp=g.state.walls[0].hp;g.api.update(.1);return {freeze:e.freeze,damaged:e.hp<hp,wallSafe:g.state.walls[0].hp===wallHp}});assert.ok(frozen.freeze>0);assert.equal(frozen.damaged,true);assert.equal(frozen.wallSafe,true);await page.screenshot({path:'/tmp/frost-frozen-'+viewport.width+'.png'});
   await page.evaluate(()=>{const g=testGame;g.api.startWave();g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.inks.frost=0;g.state.inks.vampire=1;g.state.stacks={'Vampire Ink':1};const y=g.state.H*.4;g.state.walls=[{pts:[{x:20,y},{x:g.state.W-20,y}],thick:8,hp:10000,maxHp:10000,life:300,maxLife:300,closed:false,intersections:0}];const e=g.api.spawnEnemy(false,g.state.W*.35,y-18,'tank');e.hp=e.maxHp=10000;e.speed=0;g.state.player.hp=30;for(let i=0;i<12;i++)g.api.update(.033);g.api.draw()});
   assert.ok(await page.evaluate(()=>testGame.state.player.hp>30));assert.ok(await page.evaluate(()=>testGame.api.supportInkSnapshot().bites.length>0));assert.ok(await page.evaluate(()=>testGame.api.abilityEffectsSnapshot().leeches.length>0));await page.screenshot({path:'/tmp/vampire-drain-'+viewport.width+'.png'});
   const paused=await page.evaluate(()=>{const g=testGame;g.state.paused=true;const a=JSON.stringify(g.api.supportInkSnapshot());g.api.update(.2);g.api.draw();return {a,b:JSON.stringify(g.api.supportInkSnapshot())}});assert.equal(paused.a,paused.b);
   const old=await page.evaluate(()=>JSON.stringify(testGame.api.supportInkSnapshot()));await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>JSON.stringify(testGame.api.supportInkSnapshot())),old,'reduced motion does not reset combat');await page.evaluate(()=>testGame.api.draw());
   // Dev rewards show the new rules for all three effects.
   await page.evaluate(()=>{testGame.state.paused=false;testGame.api.openUpgrade()});
   for(const [name,phrase] of [['Gravity Ink','wall segments'],['Vampire Ink','life-drain damage'],['Frost Ink','contact slow']]){await page.selectOption('#devUpgrade',name);await page.selectOption('#devRarity','rare');await page.locator('#cards .ucard').first().click();assert.match(await page.textContent('#upgradeDetailsBody'),new RegExp(phrase));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&Array.from(document.querySelectorAll('.ucard')).every(c=>c.scrollWidth<=c.clientWidth+1)),true);}
   const beforeResize=await page.evaluate(()=>({player:{x:testGame.state.player.x,y:testGame.state.player.y},bite:testGame.api.supportInkSnapshot().bites[0]}));await page.setViewportSize({width:viewport.width+20,height:viewport.height+20});const afterResize=await page.evaluate(()=>({player:{x:testGame.state.player.x,y:testGame.state.player.y},bite:testGame.api.supportInkSnapshot().bites[0]}));assert.ok(Math.abs((afterResize.bite.x-beforeResize.bite.x)-(afterResize.player.x-beforeResize.player.x))<.001);
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' Gravity wall hold, Frost charge/freeze and wall protection, Vampire damage/healing visuals, pause, reduced motion, updated dev previews and resize');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
