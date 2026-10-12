const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes')});
  await page.route('http://stevie.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html'});
  });
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#startBtn');

  await page.evaluate(()=>{if(innerWidth<500||innerHeight<500){document.documentElement.classList.add('native-app');document.documentElement.style.setProperty('--safe-area-inset-top','80px')}testGame.api.openOptions()});
  for(const [size,height] of [['normal',44],['large',60],['extra-large',76]]){
   await page.selectOption('#eraserSize',size);
   const result=await page.evaluate(()=>{const e=document.querySelector('#eraserBtn').getBoundingClientRect(),p=document.querySelector('#pauseBtn').getBoundingClientRect();return {height:e.height,width:e.width,pauseLeft:p.left,eraseRight:e.right}});
   assert.equal(result.height,height);assert(result.width>=100);if(viewport.width<500)assert(result.eraseRight<=result.pauseLeft,'enlarged eraser does not overlap Pause');
  }
  await page.click('#closeOptionsBtn');
  await page.evaluate(()=>{
   const g=testGame;g.api.resetRun({skipIntro:true});g.state.wave=6;g.api.startWave({skipIntro:true});g.state.spawnTimer=9999;
   for(const [name,rarity] of [['Pocket Rocks','common'],['Better Rocks','rare'],['Really Good Rocks','rare']])g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name===name),rarity});
   if(g.state.stats.inkRegen!==6)throw Error('Base ink regen was not increased');
   if(g.state.stats.rockDamage<10||g.state.stats.rockDamage>20)throw Error('Representative paper damage outside target: '+g.state.stats.rockDamage);
   g.api.renderBuild();const text=document.querySelector('#buildUpgrades').textContent;if(/rock/i.test(text))throw Error('Legacy rock label is visible');
   if((innerWidth<500||innerHeight<500)&&document.querySelector('.hud').getBoundingClientRect().top>25)throw Error('Stale hidden status-bar inset left HUD gap');
   g.api.draw();
  });
  await page.screenshot({path:'/tmp/paper-balance-controls-'+viewport.width+'.png'});
  await page.reload();await page.waitForFunction(()=>testGame.api.artworkReady());assert.equal(await page.evaluate(()=>testGame.api.drawingControls().eraserSize),'extra-large','size persists across reload');
  assert.deepEqual(errors,[]);console.log('PASS:',viewport.width,'three button sizes, no control overlap, saved preference, paper labels/damage and compact HUD');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
