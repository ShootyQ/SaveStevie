const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:851,height:393},{width:393,height:851,native:true}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');localStorage.setItem('saveStevieNotebookV1',JSON.stringify({version:2,scraps:0,lifetimeScraps:0,scrapTutorialDone:true,levels:{starterEraser:1}}))});
  await page.route('http://stevie.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html'});
  });
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#startBtn');if(viewport.native)await page.evaluate(()=>document.documentElement.classList.add('native-app'));

  const run=await page.evaluate(()=>{
   const g=testGame;g.api.setWaveFinaleEnabled(false);g.api.resetRun({skipIntro:true});g.state.spawnTimer=9999;
   for(let i=0;i<10;i++){const e=g.api.spawnEnemy(false,25,120,'grunt');e.hp=0;g.api.killEnemy(e);}
   g.api.updateUI();g.api.draw();return {score:g.state.score,...g.api.scoringSnapshot()};
  });
  assert.equal(run.mult,2);assert.equal(run.streak,10);assert.equal(run.last.points,60);
  assert(await page.locator('#scoreHud').isVisible());assert((await page.locator('#liveScoreStreak').textContent()).includes('×2'));
  const hud=await page.locator('#scoreHud').boundingBox(),panel=await page.locator('.panel').boundingBox();assert(hud.x>=panel.x&&hud.x+hud.width<=panel.x+panel.width&&hud.y+hud.height<=panel.y+panel.height,'score fits paper');const nav=await page.locator('.bottom').boundingBox();assert(hud.y+hud.height<=nav.y,'score does not overlap controls');
  await page.screenshot({path:'/tmp/scoring-live-'+viewport.width+(viewport.native?'-native':'')+'.png'});
  await page.click('#pauseBtn');assert.equal(await page.locator('#scoreHud').isVisible(),false);
  await page.locator('#pauseScoreTitle').click();assert((await page.locator('#pauseScorecard').textContent()).includes('Distance bonus'));
  await page.screenshot({path:'/tmp/scoring-pause-'+viewport.width+(viewport.native?'-native':'')+'.png'});
  const frozen=await page.evaluate(()=>{const before=testGame.api.scoringSnapshot().left;testGame.api.update(9);return before===testGame.api.scoringSnapshot().left;});assert(frozen);
  await page.locator('#resumeBtn').click();
  await page.evaluate(()=>{const g=testGame;g.api.damageStevie(1,'Scoring check');g.api.updateUI();g.api.update(.1);});
  const hit=await page.locator('#hitNotice').boundingBox(),score=await page.locator('#scoreHud').boundingBox();assert(hit.y+hit.height<=score.y,'damage notice clears score tracker');
  await page.evaluate(()=>{testGame.api.gameOver();testGame.api.updateUI();});
  await page.locator('#gameOverOverlay .score-details summary').click();
  assert((await page.locator('#deathScorecard').textContent()).includes('Streak bonus'));assert.equal(await page.evaluate(()=>testGame.api.bestRunScore()),run.score);
  await page.screenshot({path:'/tmp/scoring-end-'+viewport.width+(viewport.native?'-native':'')+'.png'});
  await page.click('#againBtn');await page.click('#splashHubBtn');await page.click('#hubStatsBtn');
  assert((await page.locator('#statisticsProgress').textContent()).includes('Best score'));
  assert.deepEqual(errors,[]);console.log('PASS:',viewport,'live score, capped streak, pause freeze, hit layout, final ledger and saved stats');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
