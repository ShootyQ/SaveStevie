// Electric chains, shock visuals and desk holes in real browsers.
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
   const result=await page.evaluate(()=>{
    const g=testGame;g.api.resetRun();g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.enemies=[];g.state.inks.electric=8;g.state.stacks={'Electric Ink':8};
    const y=g.state.H*.45;for(let i=0;i<6;i++){const e=g.api.spawnEnemy(false,30+i*Math.min(45,(g.state.W-60)/5),y+(i%2)*35,'tank');e.hp=e.maxHp=1000;e.speed=0}
    g.api.chainLightning(g.state.enemies[0],8);g.api.updateAbilityEffects(.08);g.api.draw();
    return {targets:g.api.abilityEffectsSnapshot().lightning[0].targets.length,shocked:g.state.enemies.every(e=>e.stun>0)};
   });assert.equal(result.targets,3);assert.equal(result.shocked,false);
   await page.screenshot({path:'/tmp/electric-chain-'+viewport.width+'.png'});
   await page.evaluate(()=>{const g=testGame;g.state.synergies.add('Plaguefire');const e=g.state.enemies[0];e.burn=e.poison=2;g.api.dropPlaguefire(e);g.api.updatePlaguefire(10);g.api.draw()});
   assert.equal(await page.evaluate(()=>testGame.api.plaguefireSnapshot().scars.length),1);await page.screenshot({path:'/tmp/desk-hole-'+viewport.width+'.png'});
   const pure=await page.evaluate(()=>{const g=testGame,a=JSON.stringify(g.state);g.api.draw();return a===JSON.stringify(g.state)});assert.equal(pure,true);
   await page.evaluate(()=>{testGame.api.setDevMode(true);testGame.api.openUpgrade()});await page.selectOption('#devUpgrade','Electric Ink');await page.selectOption('#devRarity','rare');
   await page.locator('#cards .ucard').first().click();assert.match(await page.textContent('#upgradeDetailsBody'),/per hop/);assert.equal(await page.locator('#devUpgrade option').evaluateAll(nodes=>nodes.some(n=>n.value==='Shock Ink')),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&Array.from(document.querySelectorAll('.ucard')).every(c=>c.scrollWidth<=c.clientWidth+1)),true);
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>testGame.api.draw());
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' Electric jumping chains, shock, desk holes, pure drawing, reduced motion and fitting reward previews');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
