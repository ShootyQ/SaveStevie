// Optional browser regression: slotted rewards and permanent tool progression.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
  await page.evaluate(()=>{testGame.state.stats.ink=0;testGame.api.updateUI();});
  const canvas=await page.locator('#game').boundingBox();
  await page.mouse.move(canvas.x+40,canvas.y+40);await page.mouse.down();await page.mouse.move(canvas.x+70,canvas.y+40);await page.mouse.up();
  assert.equal(await page.evaluate(()=>testGame.state.walls.length),0,'empty ink cannot draw through real pointer events');
  await page.evaluate(()=>{
   const g=testGame,u=name=>g.catalog.upgrades.find(u=>u.name===name);
   for(let i=0;i<8;i++)g.api.chooseUpgrade(u('Poison Ink'));g.api.chooseUpgrade(u('Fire Ink'));
   let cursor=0;const names=['Frost Ink','Bigger Ink Tank','First Aid'];g.api.getUpgrade=()=>u(names[cursor++%names.length]);g.state.legendaryWave=0;g.api.openUpgrade();
  });
  assert.match(await page.textContent('#rewardTool'),/Pencil/);assert.match(await page.textContent('#rewardTool'),/Level 8/);assert.match(await page.textContent('#rewardTool'),/Plaguefire/);
  assert.equal(await page.locator('#rewardTool .tool-slot').count(),2);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('#rewardTool img')).every(i=>i.complete&&i.naturalWidth>0),null,{polling:50});
  const fits=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&Array.from(document.querySelectorAll('#rewardTool,.ucard')).every(c=>c.scrollWidth<=c.clientWidth+1));
  assert.equal(await fits(),true,'reward text and slots fit the viewport');
  await page.screenshot({path:'/tmp/tools-reward-'+viewport.width+'.png'});
  const wave=await page.evaluate(()=>testGame.state.wave);
  const frost=page.locator('.ucard').filter({has:page.getByRole('heading',{name:'Frost Ink',exact:true})});
  await frost.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#effectReplacement').isVisible(),true);
  assert.equal(await page.evaluate(()=>testGame.state.wave),wave,'replacement selection keeps the wave paused');
  await page.getByRole('button',{name:'Keep my effects',exact:true}).click();assert.equal(await page.evaluate(()=>testGame.state.inks.poison),8);
  await frost.click();await page.getByRole('button',{name:'Replace Fire Ink · level 1',exact:true}).click();
  assert.equal(await page.locator('#upgradeOverlay').isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>[testGame.state.inks.poison,testGame.state.inks.fire,testGame.state.inks.frost,testGame.state.wave]),[8,0,1,wave+1]);
  await page.click('#buildBtn');assert.match(await page.textContent('#buildTool'),/Venom Ice/);assert.doesNotMatch(await page.textContent('#buildTool'),/Plaguefire/);await page.click('#closeBuildBtn');
  await page.evaluate(()=>{
   const g=testGame;g.api.resetRun();
   for(let wave=1;wave<=20;wave++){
    g.state.wave=wave;g.state.betweenWaves=false;g.state.inUpgrade=false;g.api.startWave();g.state.timeLeft=0;
    if(wave%5===0)g.api.killEnemy(g.api.spawnEnemy(true,100,100));g.api.waveComplete();g.api.waveComplete();
   }
  });
  assert.equal(await page.textContent('#victoryRunScraps'),'61');assert.equal(await page.textContent('#victoryBankScraps'),'61');
  await page.click('#victoryNotebookBtn');for(let i=0;i<3;i++)await page.click('#notebookBuy-tool');
  assert.match(await page.textContent('#notebookLoadout'),/Mechanical Pencil/);assert.equal(await page.textContent('#notebookBank'),'36');
  await page.reload();assert.equal(await page.textContent('#splashScraps'),'36');await page.click('#startBtn');
  assert.equal(await page.evaluate(()=>testGame.state.tool.name),'Mechanical Pencil');
  await page.evaluate(()=>{testGame.api.gameOver();const key='saveStevieNotebookV1',p=JSON.parse(localStorage.getItem(key));p.levels.tool=10;localStorage.setItem(key,JSON.stringify(p));});
  await page.reload();await page.click('#startBtn');await page.evaluate(()=>testGame.api.openUpgrade());
  assert.match(await page.textContent('#rewardTool'),/Scented Sharpie/);assert.equal(await page.locator('#rewardTool .tool-slot').count(),4);
  await page.waitForFunction(()=>document.querySelector('#rewardTool img').complete&&document.querySelector('#rewardTool img').naturalWidth>0,null,{polling:50});
  assert.equal(await fits(),true);assert.deepEqual(errors,[]);
  console.log('PASS: '+viewport.width+' zero-ink drawing, tool/slot layout and art, keyboard rewards, replacement/cancel, synergies, campaign scraps, purchases and reload');await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
