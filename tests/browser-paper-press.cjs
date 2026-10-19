const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>testGame.api.artworkStatus().ready);
  const setup=async()=>{await page.evaluate(()=>{const g=testGame,a=g.api;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.setSynergyRevealsEnabled(false);a.resetRun();g.state.enemies=[];g.state.walls=[];g.state.spawnTimer=999999;g.state.timeLeft=300;g.state.stats.rockDamage=0;});return page.evaluate(()=>({x:testGame.state.W*.35,y:testGame.state.player.y-140}));};
  const tick=async t=>page.evaluate(t=>{for(let i=0;i<Math.round(t/.05);i++)testGame.api.update(.05);testGame.api.draw();},t);
  const point=await setup(),box=await page.locator('#game').boundingBox(),x=box.x+point.x,y=box.y+point.y;
  let cdp,button;
  if(viewport.width<600){cdp=await page.context().newCDPSession(page);const r=await page.locator('#eraserBtn').boundingBox();button={id:11,x:r.x+r.width/2,y:r.y+r.height/2};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[button,{id:12,x,y}]});}
  else{await page.mouse.move(x,y);await page.mouse.down({button:'right'});}
  await tick(.35);assert.equal(await page.evaluate(()=>testGame.api.paperPressSnapshot().press.depth),0);await tick(2.6);
  await page.evaluate(p=>{const g=testGame;window.bouncer=g.api.spawnEnemy(false,p.x+50,p.y,'grunt');},point);await tick(.3);
  assert(await page.evaluate(()=>testGame.api.paperPressCaptures(bouncer)));await page.screenshot({path:'/tmp/paper-dent-'+viewport.width+'.png'});
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[button]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else await page.mouse.up({button:'right'});
  assert(await page.evaluate(()=>!!bouncer.flight?.paperBounce));await tick(.15);await page.screenshot({path:'/tmp/paper-boing-'+viewport.width+'.png'});await tick(.4);assert.equal(await page.evaluate(()=>bouncer.hp),18);
  // Cancellation must not become an accidental launch.
  const next=await setup();
  if(cdp){await page.evaluate(()=>testGame.api.setDrawingControl('eraserToggle',true));await page.locator('#eraserBtn').tap();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:13,x:box.x+next.x,y:box.y+next.y}]});}
  else{await page.mouse.move(box.x+next.x,box.y+next.y);await page.mouse.down({button:'right'});}
  await tick(.6);assert(await page.evaluate(()=>testGame.api.paperPressSnapshot().press.depth>0));
  if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else{await page.keyboard.press('Escape');await page.mouse.up({button:'right'});}
  assert.equal(await page.evaluate(()=>testGame.api.paperPressSnapshot().press),null);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+'px real mouse/touch hold, pull, release, light damage and safe pause/cancel');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
