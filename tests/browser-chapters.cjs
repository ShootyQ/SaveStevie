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
  await page.waitForFunction(()=>testGame.api.artworkReady());
  for(const [wave,id] of [[1,'margin-mischief'],[6,'pop-quiz-panic'],[11,'crayon-catastrophe'],[16,'final-draft'],[21,'final-draft']]){
   await page.evaluate(wave=>{const g=testGame;g.api.resetRun();g.state.wave=wave;g.api.startWave();g.api.updateUI();const p=g.state.player;for(const [i,type]of ['grunt','tank','sniper','wardling'].entries()){const e=g.api.spawnEnemy(false,p.x-110+i*70,p.y-90,type);e.hp=e.maxHp*.6;e.burn=i%2?1:0;e.poison=i%2?0:1}g.api.draw()},wave);
   const background=await page.locator('#game').evaluate(c=>({image:getComputedStyle(c).backgroundImage,size:getComputedStyle(c).backgroundSize,chapter:c.dataset.chapter}));
   assert.equal(background.chapter,id);assert.ok(background.image.includes(id+'.png?v='));assert.ok(background.size.startsWith('cover'));
   await page.evaluate(()=>new Promise((resolve,reject)=>{const url=document.querySelector('#game').style.backgroundImage.match(/url\("?([^"\)]+)"?\)/)[1],i=new Image;i.onload=()=>resolve();i.onerror=()=>reject(Error('Background did not load: '+url));i.src=url}));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'background does not expand phone layout');
   if(wave<=20)await page.screenshot({path:'/tmp/chapter-'+id+'-'+viewport.width+'.png'});
   await page.evaluate(()=>testGame.api.waveComplete());assert.ok((await page.textContent('#waveChapter')).includes(await page.evaluate(()=>testGame.api.chapterForWave().name)));
  }
  await page.evaluate(()=>testGame.api.resetRun());assert.equal(await page.locator('#game').getAttribute('data-chapter'),'margin-mischief');
  // Failed image leaves the grid/paper fallback and playable canvas intact.
  await page.route('**/assets/art/backgrounds/pop-quiz-panic.png*',r=>r.fulfill({status:404,body:''}));
  await page.evaluate(()=>{testGame.state.wave=6;testGame.api.updateUI();document.querySelector('#game').style.backgroundImage=document.querySelector('#game').style.backgroundImage.replace('.png?v=','.png?failed=1&v=');testGame.api.draw()});
  assert.equal(await page.locator('#game').evaluate(c=>getComputedStyle(c).backgroundColor!=='rgba(0, 0, 0, 0)'),true);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' chapter backgrounds load/version, wave switching/endless/reset, readable live playfield, clear-screen labels, and missing-art fallback');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
