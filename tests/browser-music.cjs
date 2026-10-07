// Optional browser check; Playwright/Chromium are developer tools, not game dependencies.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  const wait=page.waitForFunction.bind(page);page.waitForFunction=(f,a,o)=>wait(f,a,{polling:50,...o});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.evaluate(()=>document.documentElement.dataset.build='browser-test');assert.equal(await page.locator('#gameMusic').evaluate(a=>a.paused),true,'intro waits for a tap');
  await page.click('#splashOptionsBtn');await page.waitForFunction(()=>!document.querySelector('#gameMusic').paused&&document.querySelector('#gameMusic').readyState>=2);await page.click('#closeOptionsBtn');
  assert.equal(await page.evaluate(()=>testGame.api.musicStatus().track),'splash');assert.ok(Math.abs(await page.locator('#gameMusic').evaluate(a=>a.duration)-117.432)<.1);
  await page.click('#startBtn');await page.waitForFunction(()=>!document.querySelector('#gameMusic').paused&&document.querySelector('#gameMusic').readyState>=2);
  for(const [wave,id,duration] of [[1,'margin-mischief',83.472],[6,'pop-quiz-panic',73.992],[11,'crayon-catastrophe',129.24],[16,'final-draft',86.424]]){
   await page.evaluate(wave=>{testGame.state.wave=wave;testGame.api.startWave()},wave);await page.waitForFunction(()=>!document.querySelector('#gameMusic').paused&&document.querySelector('#gameMusic').readyState>=2);
   assert.equal(await page.evaluate(()=>testGame.api.musicStatus().track),id);assert.ok(Math.abs(await page.locator('#gameMusic').evaluate(a=>a.duration)-duration)<.1);assert.equal(await page.locator('#gameMusic').evaluate(a=>a.loop),true);assert.ok(await page.locator('#gameMusic').evaluate(a=>a.src.includes('?v=')));
   const before=await page.locator('#gameMusic').evaluate(a=>({time:a.currentTime,src:a.currentSrc}));await page.evaluate(()=>testGame.api.startWave());const after=await page.locator('#gameMusic').evaluate(a=>({time:a.currentTime,src:a.currentSrc}));assert.equal(after.src,before.src);assert.ok(after.time>=before.time&&after.time-before.time<1,'same chapter keeps its stream');
  }
  await page.click('#pauseBtn');await page.click('#musicBtn');await page.click('#resumeBtn');await page.evaluate(()=>{testGame.state.wave=6;testGame.api.startWave()});assert.equal(await page.locator('#gameMusic').evaluate(a=>a.paused),true);assert.equal(await page.evaluate(()=>testGame.api.musicStatus().muted),true);
  await page.reload();assert.equal(await page.evaluate(()=>testGame.api.musicStatus().muted),true);await page.click('#splashOptionsBtn');await page.click('#splashMusicBtn');await page.waitForFunction(()=>!document.querySelector('#gameMusic').paused);
  assert.equal(await page.evaluate(()=>testGame.api.musicStatus().muted),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/splash-music-'+viewport.width+'.png'});
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' native decoding/playback for all five loops, versioned sources, same-chapter continuity, saved mute and explicit intro control');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
