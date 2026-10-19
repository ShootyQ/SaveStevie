const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');localStorage.setItem('saveStevieNotebookV1',JSON.stringify({version:2,scraps:100,lifetimeScraps:100,scrapTutorialDone:true,levels:{doodleScraps:1,starterEraser:1}}));});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.evaluate(()=>{testGame.api.setFirstLessonsEnabled(false);testGame.api.setMonsterIntrosEnabled(false)});await page.click('#startBtn');
  await page.evaluate(()=>{testGame.state.spawnTimer=9999;testGame.state.enemies=[];testGame.state.walls=[]});
  const initial=await page.evaluate(()=>({W:testGame.state.W,H:testGame.state.H}));assert(initial.W>1200);
  // Larger CSS viewports reproduce the world-size effect of desktop page zoom-out.
  let capped;
  for(const size of [{width:1920,height:1080},{width:3840,height:2160},{width:7680,height:4320}]){
   await page.setViewportSize(size);await page.waitForFunction(()=>{const r=testGame.dom.canvas.getBoundingClientRect();return Math.abs(testGame.state.W-r.width)<.5&&Math.abs(testGame.state.H-r.height)<.5},null,{polling:50});
   const arena=await page.evaluate(()=>({W:testGame.state.W,H:testGame.state.H}));assert(arena.W<=1280&&arena.H<=800);assert(arena.W>=1278&&arena.H>=798);
   if(capped)assert.deepEqual(arena,capped,'zooming farther out cannot move spawn edges');capped=arena;
   const spawns=await page.evaluate(()=>{const g=testGame,random=Math.random;const result=[];try{for(const side of [.01,.26,.51,.76]){let first=true;Math.random=()=>first?(first=false,side):.5;const e=g.api.spawnEnemy(false,null,null,'grunt');result.push({x:e.x,y:e.y});}}finally{Math.random=random;g.state.enemies=[];}return result});
   for(const e of spawns)assert(e.x>=-80&&e.x<=arena.W+80&&e.y>=-80&&e.y<=arena.H+80,'spawns stay at bounded arena edges');
  }
  await page.setViewportSize({width:1920,height:1080});await page.waitForFunction(()=>testGame.dom.canvas.getBoundingClientRect().width===testGame.state.W,null,{polling:50});
  const box=await page.locator('#game').boundingBox();await page.mouse.move(box.x+box.width/2-180,box.y+box.height/2-100);await page.mouse.down();await page.mouse.move(box.x+box.width/2-90,box.y+box.height/2-100,{steps:8});await page.mouse.up();
  const point=await page.evaluate(()=>testGame.state.walls[0]?.pts[0]);assert(point);assert(Math.abs(point.x-(capped.W/2-180))<2&&Math.abs(point.y-(capped.H/2-100))<2,'centered arena preserves input coordinates');
  await page.evaluate(()=>testGame.api.draw());await page.screenshot({path:'/tmp/bounded-desktop-arena.png'});
  await page.evaluate(()=>testGame.api.openInfo('betaScraps'));const scale=await page.evaluate(()=>testGame.api.betaViewSnapshot().scale);await page.evaluate(()=>testGame.api.zoomBetaTree(.7));assert((await page.evaluate(()=>testGame.api.betaViewSnapshot().scale))<scale,'scrap tree still zooms independently');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS: normal desktop sizing; 1080p/4K/zoom-out-sized viewports keep the same bounded arena and spawn edges; centered drawing and independent tree zoom');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
