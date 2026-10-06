// Optional browser check; Playwright/Chromium are developer tools, not game dependencies.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  const wait=page.waitForFunction.bind(page);page.waitForFunction=(f,a,o)=>wait(f,a,{polling:50,...o});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
  await page.evaluate(()=>testGame.api.setMonsterIntrosEnabled(true));
  for(const [wave,type,name] of [[10,'stapler','Staple Snack'],[15,'crayon','Count Crayon']]){
   await page.evaluate(wave=>{testGame.state.wave=wave;testGame.api.startWave()},wave);
   assert.equal(await page.evaluate(()=>testGame.state.paused),true);
   assert.match(await page.textContent('#monsterIntroCards'),new RegExp(name));
   await page.waitForFunction(type=>{const img=document.querySelector('#monsterIntroCards img[src*="/'+type+'.png"]');return img&&img.complete&&img.naturalWidth>0},type);
   assert.equal(await page.evaluate(()=>Array.from(document.querySelectorAll('#monsterIntroCards .monster-card')).every(c=>c.scrollWidth<=c.clientWidth+1)),true);
   await page.click('#continueMonsterIntroBtn');
   const spawned=await page.evaluate(()=>{const g=testGame,p=g.state.player;const e=g.api.spawnEnemy(true,p.x-90,p.y);g.state.walls=[{pts:[{x:p.x-45,y:p.y-80},{x:p.x-45,y:p.y+80}],hp:200,maxHp:200,thick:8,life:72,maxLife:72}];e.bossCd=0;g.api.updateBossAbility(e,.1);g.api.draw();return {type:e.type,windup:e.bossWindup}});
   assert.equal(spawned.type,type);assert.equal(spawned.windup,1.2);
   await page.screenshot({path:'/tmp/boss-'+type+'-'+viewport.width+'.png'});
  }
  await page.click('#compendiumBtn');assert.equal(await page.locator('#monsterCards .monster-card').count(),21);
  for(const type of ['stapler','crayon']){const img=page.locator('#monsterCards img[src*="/'+type+'.png"]');await img.scrollIntoViewIfNeeded();await page.waitForFunction(type=>{const i=document.querySelector('#monsterCards img[src*="/'+type+'.png"]');return i.complete&&i.naturalWidth>0},type);assert.equal(await img.getAttribute('src').then(s=>s.includes('?v=')),true);}
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' boss intro art/layout, pause/resume, spawning, live warnings and compendium assets');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
