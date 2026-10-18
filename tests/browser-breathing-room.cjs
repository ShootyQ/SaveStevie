const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>testGame.api.artworkStatus().ready);
  await page.evaluate(()=>{const g=testGame,a=g.api;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.resetRun();g.state.enemies=[];g.state.walls=[];const p=g.state.player;window.pew=a.spawnEnemy(false,p.x,p.y-180,'sniper');pew.shootCd=0;a.updateSniper(pew,.02);for(let i=0;i<60;i++)a.updateSniper(pew,.05);a.draw();});
  assert.equal(await page.evaluate(()=>testGame.state.enemyShots.filter(s=>s.sniperOwner===pew&&!s.reflected).length),1);
  await page.evaluate(()=>{const g=testGame,a=g.api;g.state.enemyShots=[];a.updateSniper(pew,.4);});assert.equal(await page.evaluate(()=>testGame.state.enemyShots.length),0);
  await page.evaluate(()=>{testGame.api.updateSniper(pew,.5);testGame.api.draw();});assert.equal(await page.evaluate(()=>testGame.state.enemyShots.length),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+'px bounded Pew Pew throws, cooldown, viewport fit and no browser errors');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
