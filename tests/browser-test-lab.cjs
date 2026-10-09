// Scratch-page controls, native full-display layout, safe areas and saved progress.
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
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');
   await page.evaluate(()=>{document.documentElement.classList.add('native-app');document.documentElement.style.setProperty('--safe-area-inset-top','24px');document.documentElement.style.setProperty('--safe-area-inset-bottom','18px');testGame.api.resize()});
   const geometry=await page.evaluate(()=>{const app=document.querySelector('#app').getBoundingClientRect(),canvas=document.querySelector('#game').getBoundingClientRect(),hud=document.querySelector('.hud').getBoundingClientRect();return {app:{x:app.x,y:app.y,w:app.width,h:app.height},canvas:{x:canvas.x,y:canvas.y,w:canvas.width,h:canvas.height},hudTop:hud.top,scroll:document.documentElement.scrollWidth<=innerWidth}});
   assert.equal(geometry.app.x,0);assert.equal(geometry.app.y,0);assert.equal(geometry.app.w,viewport.width);assert.equal(geometry.app.h,viewport.height);assert.equal(geometry.canvas.w,viewport.width);assert.equal(geometry.canvas.h,viewport.height);assert.ok(geometry.hudTop>=24);assert.equal(geometry.scroll,true);
   await page.screenshot({path:'/tmp/android-menu-'+viewport.width+'.png'});
   await page.click('#splashOptionsBtn');await page.click('#testLabBtn');await page.click('[data-test-wave="20"]');
   await page.selectOption('#testTool','6');await page.selectOption('#testUpgrade','Fire Ink');await page.selectOption('#testRarity','rare');await page.fill('#testCopies','2');await page.click('#addTestUpgrade');
   await page.selectOption('#testUpgrade','Poison Ink');await page.selectOption('#testRarity','uncommon');await page.fill('#testCopies','3');await page.click('#addTestUpgrade');
   await page.selectOption('#testUpgrade','Triple Stroke');assert.equal(await page.inputValue('#testRarity'),'legendary');assert.equal(await page.locator('#testRarity').isDisabled(),true);assert.equal(await page.locator('#testCopies').isDisabled(),true);await page.click('#addTestUpgrade');
   assert.equal(await page.locator('.test-loadout-row').count(),3);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/android-test-setup-'+viewport.width+'.png'});
   const saved=await page.evaluate(()=>({best:localStorage.getItem('doodleDefenderBestV4'),notebook:localStorage.getItem('saveStevieNotebookV1')}));
   await page.click('#startTestBtn');
   assert.deepEqual(await page.evaluate(()=>({wave:testGame.state.wave,boss:testGame.state.enemies[0].type,fire:testGame.state.inks.fire,poison:testGame.state.inks.poison,triple:testGame.state.stats.tripleLine,dev:testGame.api.devRunActive(),phase:testGame.api.bossWavePhase(),timer:testGame.state.timeLeft})),{wave:20,boss:'eraser',fire:6,poison:6,triple:true,dev:true,phase:'fight',timer:0});
   assert.equal(await page.locator('#optionsOverlay').isVisible(),false);assert.equal(await page.locator('#fullscreenBtn').isVisible(),false);
   assert.equal(await page.evaluate(()=>{const b=document.querySelector('.bottom').getBoundingClientRect();return Math.abs(b.bottom-innerHeight)<1&&b.height<=75}),true);
   await page.evaluate(()=>{testGame.api.draw()});await page.screenshot({path:'/tmp/android-test-fight-'+viewport.width+'.png'});
   await page.click('#pauseBtn');await page.click('#pauseRestartTestBtn');assert.equal(await page.locator('#pauseOverlay').isVisible(),false);assert.equal(await page.evaluate(()=>testGame.state.inks.fire),6);
   await page.click('#pauseBtn');await page.click('#pauseSettingsBtn');await page.locator('#repeatTestBtn').scrollIntoViewIfNeeded();await page.click('#repeatTestBtn');assert.equal(await page.evaluate(()=>testGame.state.wave),20);
   await page.evaluate(()=>{testGame.api.awardScraps(100);testGame.api.setDevMode(false);testGame.api.gameOver()});assert.deepEqual(await page.evaluate(()=>({best:localStorage.getItem('doodleDefenderBestV4'),notebook:localStorage.getItem('saveStevieNotebookV1')})),saved);
   await page.click('#deathRestartTestBtn');assert.equal(await page.locator('#gameOverOverlay').isVisible(),false);assert.equal(await page.evaluate(()=>testGame.state.wave),20);await page.evaluate(()=>{testGame.api.setWaveFinaleEnabled(false);testGame.api.killEnemy(testGame.state.enemies[0]);testGame.api.waveComplete()});await page.click('#victoryRestartTestBtn');assert.equal(await page.locator('#victoryOverlay').isVisible(),false);assert.equal(await page.evaluate(()=>testGame.state.inks.fire),6);
   await page.evaluate(()=>{testGame.api.openOptions();testGame.api.openTestLab()});await page.fill('#testWave','19');await page.selectOption('#testPhase','boss');await page.click('#startTestBtn');assert.equal(await page.locator('#optionsOverlay').isVisible(),true);assert.match(await page.textContent('#testLabNotice'),/boss wave/i);
   await page.fill('#testWave','14');await page.selectOption('#testPhase','wave');await page.click('#startTestBtn');assert.equal(await page.evaluate(()=>testGame.state.wave),14);assert.equal(await page.evaluate(()=>testGame.state.enemies.length),0);assert.equal(await page.evaluate(()=>testGame.state.timeLeft),60);
   await page.evaluate(()=>testGame.api.waveComplete());await page.click('#waveRestartTestBtn');assert.equal(await page.locator('#waveOverlay').isVisible(),false);assert.equal(await page.evaluate(()=>testGame.state.wave),14);
   await page.setViewportSize({width:viewport.height,height:viewport.width});await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-area-inset-top','0px');document.documentElement.style.setProperty('--safe-area-inset-bottom','0px');document.documentElement.style.setProperty('--safe-area-inset-left','28px');testGame.api.resize();testGame.api.draw()});
   assert.equal(await page.evaluate(()=>{const r=document.querySelector('#game').getBoundingClientRect();return r.width===innerWidth&&r.height===innerHeight&&document.querySelector('.hud').getBoundingClientRect().left>=28}),true);
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' native full-display canvas, safe controls, selected boss/build/rarities, repeat/full-wave tests, rotation and protected records');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
