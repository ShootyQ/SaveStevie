// Optional browser check; Playwright/Chromium are developer tools, not game dependencies.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  const wait=page.waitForFunction.bind(page);page.waitForFunction=(f,a,o)=>wait(f,a,{polling:50,...o});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
  await page.evaluate(()=>{testGame.state.inks.fire=1;testGame.state.inks.poison=1;testGame.api.checkSynergies();testGame.api.update(.016)});
  assert.equal(await page.locator('#synergySplash').isVisible(),true);assert.equal(await page.textContent('#synergySplashName'),'Plaguefire');
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('#synergyRevealArt img')).every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.locator('#synergyRevealArt img').count(),2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const bounds=await page.locator('.synergy-reveal-paper').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1);
  const time=await page.evaluate(()=>testGame.state.timeLeft);await page.evaluate(()=>testGame.api.update(3));assert.equal(await page.evaluate(()=>testGame.state.timeLeft),time);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'continueSynergyBtn');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'continueSynergyBtn');
  await page.screenshot({path:'/tmp/synergy-'+viewport.width+'.png'});await page.click('#continueSynergyBtn');assert.equal(await page.locator('#synergySplash').isVisible(),false);
  await page.evaluate(()=>{testGame.state.inks.fire=0;testGame.api.checkSynergies();testGame.state.inks.fire=1;testGame.api.checkSynergies();testGame.api.update(.016)});assert.equal(await page.locator('#synergySplash').isVisible(),false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{testGame.api.resetRun();testGame.state.tool.slots=4;testGame.state.inks.electric=1;testGame.state.inks.frost=1;testGame.state.inks.gravity=1;testGame.api.checkSynergies();testGame.api.update(.016)});
  let names=[];while(await page.locator('#synergySplash').isVisible()){names.push(await page.textContent('#synergySplashName'));assert.equal(await page.locator('.synergy-reveal-paper').evaluate(e=>getComputedStyle(e).animationName),'none');await page.click('#continueSynergyBtn')}
  assert.ok(names.includes('THE STORM'));assert.equal(new Set(names).size,names.length);
  await page.evaluate(()=>{
   const g=testGame;g.api.resetRun();g.api.setDevMode(true);
   g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Fire Ink'),rarity:'common'});
   g.api.openUpgrade();g.api.chooseUpgrade({...g.catalog.upgrades.find(u=>u.name==='Poison Ink'),rarity:'common'});
   g.api.update(.016);
  });
  assert.equal(await page.locator('#synergySplash').isVisible(),true,'real reward-taking path shows reveal');
  assert.equal(await page.textContent('#synergySplashName'),'Plaguefire');await page.click('#continueSynergyBtn');
  await page.evaluate(()=>{
   const g=testGame;g.api.startTestRun({wave:14,phase:'wave',toolRank:6,notebook:false,upgrades:[{name:'Fire Ink',rarity:'common',copies:1},{name:'Poison Ink',rarity:'common',copies:1}]});g.api.update(.016);
  });
  assert.equal(await page.locator('#synergySplash').isVisible(),true,'Scratch Page reveals loadout synergy');
  assert.equal(await page.textContent('#synergySplashName'),'Plaguefire');await page.click('#continueSynergyBtn');
  await page.evaluate(()=>{
   const g=testGame;g.api.setMonsterIntrosEnabled(true);g.api.setDevMode(false);g.api.resetRun();
  });
  await page.click('#continueMonsterIntroBtn');
  await page.evaluate(()=>{
   const g=testGame;g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Fire Ink'),rarity:'common'});
   g.state.wave=2;g.api.openUpgrade();g.api.chooseUpgrade({...g.catalog.upgrades.find(u=>u.name==='Poison Ink'),rarity:'common'});g.api.update(.016);
  });
  assert.equal(await page.locator('#monsterIntroOverlay').isVisible(),true);assert.equal(await page.locator('#synergySplash').isVisible(),false);
  await page.click('#continueMonsterIntroBtn');await page.evaluate(()=>testGame.api.update(.016));
  assert.equal(await page.locator('#synergySplash').isVisible(),true,'normal run shows reveal after monster intro');
  await page.click('#continueSynergyBtn');
  await page.evaluate(()=>{
   const g=testGame;g.api.setMonsterIntrosEnabled(false);g.api.resetRun();g.state.inks.fire=g.state.inks.poison=1;g.api.checkSynergies();
   g.api.setSynergyRevealsEnabled(false);g.api.setSynergyRevealsEnabled(true);g.api.update(.016);
  });
  assert.equal(await page.locator('#synergySplash').isVisible(),true,'active synergy recovers its missing notification');
  assert.equal(await page.textContent('#synergySplashName'),'Plaguefire');
  const recoveredTime=await page.evaluate(()=>testGame.state.timeLeft);await page.evaluate(()=>testGame.api.update(2));assert.equal(await page.evaluate(()=>testGame.state.timeLeft),recoveredTime);
  await page.click('#continueSynergyBtn');await page.evaluate(()=>testGame.api.update(.016));assert.equal(await page.locator('#synergySplash').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' synergy artwork/layout, frozen combat, keyboard/touch continue, once-per-run queue, major reveals and reduced motion');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
