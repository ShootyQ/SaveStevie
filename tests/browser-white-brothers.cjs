const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:800,height:600},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');localStorage.setItem('saveStevieNotebookV1',JSON.stringify({version:2,scraps:10,lifetimeScraps:10,scrapTutorialDone:true,levels:{starterEraser:1,doodleScraps:1}}));if(innerWidth>=600)window.stevieDesktop={applyDisplay:async preferences=>({preferences,saved:true}),getDisplay:async()=>({preferences:{mode:'windowed',resolution:'1280x720',uiScale:1,renderScale:1,frameLimit:60}}),onDisplayChanged(){}};});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>testGame.api.artworkStatus().ready);
  const desktop=viewport.width>=600;
  await page.click('#splashOptionsBtn');if(desktop){await page.click('#desktopTestPanelTab');await page.click('#desktopTestExtrasTab');}else await page.click('#testLabBtn');await page.click('#openWhiteBrothersBtn');await page.waitForFunction(()=>testGame.api.whiteBrothersSnapshot().ready);
  assert(await page.locator('#whiteBrothersOverlay').isVisible());assert.equal(await page.locator('#whiteBrothersOverlay .desktop-page-nav').count(),0);
  const before=await page.evaluate(()=>JSON.stringify(testGame.state));
  for(const action of ['idle','walk','intro','attack','throw','hit','dizzy','tantrum','defeat']){
   await page.click('#brothers-'+action);await page.evaluate(()=>{for(let i=0;i<17;i++)testGame.api.advanceWhiteBrothersPreview(.05);});
   const snap=await page.evaluate(()=>testGame.api.whiteBrothersSnapshot());assert(snap.models.every(m=>m.action===action));
   if(['idle','attack','defeat'].includes(action))await page.screenshot({path:'/tmp/white-brothers-'+action+'-'+viewport.width+'.png'});
  }
  await page.selectOption('#brothersCharacter','wite');await page.click('#brothers-walk');assert.equal(await page.evaluate(()=>testGame.api.whiteBrothersSnapshot().models[1].action),'defeat','individual selector leaves sibling alone');
  await page.click('#brothersPauseBtn');const paused=await page.evaluate(()=>JSON.stringify(testGame.api.whiteBrothersSnapshot().models));await page.evaluate(()=>testGame.api.advanceWhiteBrothersPreview(1));assert.equal(await page.evaluate(()=>JSON.stringify(testGame.api.whiteBrothersSnapshot().models)),paused);
  await page.check('#brothersReduced');assert.equal(await page.evaluate(()=>testGame.api.whiteBrothersSnapshot().reduced),true);
  assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),before,'preview never mutates combat/progress');
  for(const id of ['closeWhiteBrothersBtn','brothers-idle','brothers-defeat','brothersPauseBtn']){const r=await page.locator('#'+id).boundingBox();assert(r.y>=0&&r.y+r.height<=viewport.height,'studio control reachable '+id);}
  await page.keyboard.press('Escape');assert(await page.locator('#whiteBrothersOverlay').isHidden());assert(await page.locator('#optionsOverlay').isVisible());assert.equal(await page.evaluate(()=>testGame.api.whiteBrothersSnapshot().opened),false);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+'px nine animations, individual control, pause/reduced motion, pure studio and Settings return');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
