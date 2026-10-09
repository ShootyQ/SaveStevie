// Optional browser check; Playwright/Chromium are developer tools, not game dependencies.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..')),native=process.env.NATIVE_APP==='1';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  const wait=page.waitForFunction.bind(page);page.waitForFunction=(f,a,o)=>wait(f,a,{polling:50,...o});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='index.html'&&native)body=body.toString('utf8').replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
  await page.waitForFunction(()=>testGame.api.artworkReady());
  await page.evaluate(()=>testGame.api.returnToMenu());
  await page.screenshot({path:'/tmp/'+(native?'android-':'web-')+'main-menu-'+viewport.width+'.png'});
  assert.equal(await page.textContent('#appVersion'),'Alpha '+require(path.join(root,'package.json')).version);
  for(const selector of ['.splash-title','.splash-title span','.splash-tagline','#appVersion','.copyright-notice']){
   const contrast=await page.locator('#startOverlay '+selector).evaluate((el,native)=>{
    const rgb=getComputedStyle(el).color.match(/\d+/g).slice(0,3).map(Number),bg=native?[247,241,223]:[48,70,86];
    const light=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const a=light(rgb),b=light(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   },native);assert(contrast>=4.5,'readable cover text '+selector+' contrast '+contrast);
  }
  const footer=await page.locator('.splash-footer').boundingBox();assert(footer.y>=0&&footer.y+footer.height<=viewport.height+1,'Alpha footer fits');
  assert.equal(await page.locator('#startOverlay').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  assert.equal(await page.locator('.bottom').isVisible(),false);
  assert.deepEqual(await page.locator('#startOverlay button:visible').allTextContents(),['Play →','Notebook','Settings']);
  for(const id of ['startBtn','splashHubBtn','splashOptionsBtn']){const b=await page.locator('#'+id).boundingBox();assert.ok(b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,'cover action fits '+id)}
  await page.click('#splashHubBtn');assert.equal(await page.locator('#hubOverlay').isVisible(),true);
  for(const [button,overlay,close] of [['hubMonstersBtn','compendiumOverlay','closeCompendiumBtn'],['hubToolBtn','buildOverlay','closeBuildBtn'],['hubNotebookBtn','notebookOverlay','closeNotebookBtn'],['hubSettingsBtn','optionsOverlay','closeOptionsBtn'],['hubStatsBtn','statisticsOverlay','closeStatisticsBtn'],['hubChangelogBtn','changelogOverlay','closeChangelogBtn']]){
   await page.click('#'+button);assert.equal(await page.locator('#'+overlay).isVisible(),true);assert.equal(await page.locator('#hubOverlay').isVisible(),false);await page.click('#'+close);assert.equal(await page.locator('#hubOverlay').isVisible(),true);
  }
  await page.screenshot({path:'/tmp/notebook-hub-'+viewport.width+'.png'});
  await page.click('#closeHubBtn');assert.equal(await page.locator('#startOverlay').isVisible(),true);assert.equal(await page.evaluate(()=>testGame.state.paused),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'splashHubBtn');
  await page.click('#startBtn');assert.equal(await page.locator('.bottom').isVisible(),true);
  assert.deepEqual(await page.locator('.bottom button').evaluateAll(buttons=>buttons.filter(b=>getComputedStyle(b).display!=='none').map(b=>b.id)),native?['pauseBtn','eraserBtn']:['fullscreenBtn','pauseBtn','eraserBtn']);

  await page.evaluate(()=>window.dispatchEvent(new Event('savestevie:background')));
  assert.equal(await page.locator('#pauseOverlay').isVisible(),true,'backgrounding pauses combat');
  await page.click('#resumeBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),false);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#pauseOverlay').isVisible(),true);
  const snapshot=await page.evaluate(()=>JSON.stringify(testGame.state));await page.evaluate(()=>testGame.api.update(2));assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),snapshot);
  await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#returnMenuBtn').evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Tab');assert.equal(await page.locator('#resumeBtn').evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.textContent('#pauseBtn'),'Resume');
  await page.click('#pauseSettingsBtn');assert.equal(await page.locator('#optionsOverlay').isVisible(),true);await page.locator('#musicVolume').fill('22');
  await page.evaluate(()=>window.dispatchEvent(new Event('savestevie:background')));
  assert.equal(await page.locator('#optionsOverlay').isVisible(),true,'backgrounding preserves settings');
  await page.click('#closeOptionsBtn');assert.equal(await page.locator('#pauseOverlay').isVisible(),true);assert.equal(await page.evaluate(()=>testGame.state.paused),true);
  await page.click('#pauseToolBtn');await page.keyboard.press('Escape');assert.equal(await page.locator('#pauseOverlay').isVisible(),true);
  await page.click('#returnMenuBtn');assert.match(await page.textContent('#quitConfirmation'),/Scraps.*stay saved/);await page.keyboard.press('Escape');assert.equal(await page.locator('#quitConfirmation').isVisible(),false);
  await page.screenshot({path:'/tmp/pause-menu-'+viewport.width+'.png'});
  await page.click('#resumeBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),false);assert.equal(await page.textContent('#pauseBtn'),'Pause');
  await page.evaluate(()=>testGame.api.awardScraps(3));const scraps=await page.evaluate(()=>testGame.api.notebookSnapshot().scraps);
  await page.click('#pauseBtn');await page.click('#returnMenuBtn');await page.click('#confirmQuitBtn');
  assert.equal(await page.locator('#startOverlay').isVisible(),true);assert.equal(await page.evaluate(()=>testGame.state.running),false);assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),scraps);
  await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');assert.equal(await page.locator('#notebookOverlay').isVisible(),true);await page.click('#closeNotebookBtn');await page.click('#closeHubBtn');
  await page.evaluate(()=>testGame.api.buyNotebookPerk('starterEraser'));await page.click('#startBtn');assert.equal(await page.evaluate(()=>testGame.state.wave),1);
  await page.click('#pauseBtn');await page.click('#returnMenuBtn');await page.click('#confirmQuitBtn');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),scraps,'empty quit does not farm scraps');
  await page.reload();assert.equal(await page.textContent('#splashScraps'),String(scraps));
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' main menu, pause/submenus, Escape/cancel/resume, saved scraps, no quit farming, fresh run and reload');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
