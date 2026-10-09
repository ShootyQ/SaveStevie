// Browser regression: audio preferences, statistics and pencil workbench.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');
  await page.click('#splashOptionsBtn');
  assert.equal(await page.locator('#optionsOverlay').isVisible(),true);
  await page.locator('#musicVolume').evaluate(e=>{e.value=23;e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#effectsVolume').evaluate(e=>{e.value=81;e.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.evaluate(()=>document.querySelector('#gameMusic').volume),.23);
  assert.equal(await page.textContent('#effectsVolumeValue'),'81%');
  await page.screenshot({path:'/tmp/workbench-options-'+viewport.width+'.png'});
  await page.keyboard.press('Escape');await page.reload();await page.click('#splashOptionsBtn');
  assert.equal(await page.locator('#musicVolume').inputValue(),'23');
  assert.equal(await page.locator('#effectsVolume').inputValue(),'81');
  await page.click('#optionsStatsBtn');assert.equal(await page.locator('#statisticsOverlay').isVisible(),true);
  assert.match(await page.textContent('#statisticsProgress'),/Scraps earned, all time/);
  await page.screenshot({path:'/tmp/workbench-stats-'+viewport.width+'.png'});
  await page.keyboard.press('Escape');await page.click('#startBtn');
  await page.click('#pauseBtn');await page.click('#pauseSettingsBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#pauseOverlay').isVisible(),true);await page.click('#resumeBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),false);
  await page.evaluate(()=>{
   const g=testGame,u=name=>g.catalog.upgrades.find(u=>u.name===name);
   const original=JSON.stringify(g.state),p=g.api.upgradePreview(u('Bigger Ink Tank'));
   if(Number(p.after)-Number(p.before)!==35||JSON.stringify(g.state)!==original)throw Error('Preview is inaccurate or mutates state');
   g.api.chooseUpgrade(u('Poison Ink'));g.api.chooseUpgrade(u('Fire Ink'));
   let cursor=0;const names=['Poison Ink','Bigger Ink Tank','First Aid'];g.api.getUpgrade=()=>u(names[cursor++%names.length]);g.state.legendaryWave=0;g.api.openUpgrade();
  });
  await page.locator('#cards .ucard').first().click();assert.match(await page.textContent('#upgradeDetailsBody'),/NOW/);assert.match(await page.textContent('#upgradeDetailsBody'),/AFTER/);
  await page.waitForFunction(()=>document.querySelector('.instrument-art').naturalWidth>0,null,{polling:50});
  const wave=await page.evaluate(()=>testGame.state.wave);
  await page.click('#inspectToolBtn');assert.equal(await page.locator('#buildOverlay').isVisible(),true);
  assert.match(await page.textContent('#buildTool'),/Plaguefire/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#upgradeOverlay').isVisible(),true);
  assert.equal(await page.evaluate(()=>testGame.state.wave),wave);assert.equal(await page.evaluate(()=>testGame.state.inUpgrade),true);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'inspectToolBtn');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'/tmp/workbench-reward-'+viewport.width+'.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: '+viewport.width+' saved/live audio options, statistics, pause restoration, read-only previews, custom pencil and reward inspection');await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
