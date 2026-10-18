const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>testGame.api.artworkStatus().ready);
  const setup=()=>{const g=testGame,a=g.api;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.setSynergyRevealsEnabled(false);a.resetRun();g.state.wave=5;a.startWave();g.state.timeLeft=0;g.state.enemies=[];g.state.spawnTimer=9999;a.update(.01);};
  await page.evaluate(setup);await page.evaluate(()=>{testGame.api.update(.9);testGame.api.draw();});await page.screenshot({path:'/tmp/king-walk-'+viewport.width+'.png'});
  await page.evaluate(()=>{testGame.api.update(3.6);testGame.api.draw();});assert.equal(await page.evaluate(()=>testGame.api.firstBossIntroPose().stage),'roar');await page.screenshot({path:'/tmp/king-roar-'+viewport.width+'.png'});
  await page.evaluate(()=>{const a=testGame.api;a.update(2.2);for(const e of [...testGame.state.enemies])a.killEnemy(e);a.update(1.85);a.draw();});
  assert.equal(await page.evaluate(()=>testGame.api.bossVictoryPose().stage),'jump');await page.screenshot({path:'/tmp/boss-victory-'+viewport.width+'.png'});
  const before=await page.evaluate(()=>JSON.stringify(testGame.api.waveFinaleSnapshot()));await page.evaluate(()=>{testGame.state.paused=true;testGame.api.update(.3);});assert.equal(await page.evaluate(()=>JSON.stringify(testGame.api.waveFinaleSnapshot())),before);
  await page.evaluate(()=>{testGame.state.paused=false;testGame.api.update(.8);testGame.api.draw();});await page.screenshot({path:'/tmp/boss-dance-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+'px King walk/roar, single Stevie victory routine, pause, viewport fit and no page errors');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
