const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
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

  const target=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun({skipIntro:true});g.state.wave=6;g.api.startWave({skipIntro:true});g.state.spawnTimer=9999;
   const h=g.api.spawnEnemy(false,g.state.player.x,g.state.player.y-150,'tank');
   for(const x of [-20,0,20])g.api.spawnEnemy(false,h.x+x,h.y-55,'grunt');
   for(let i=0;i<20;i++)g.api.update(.016);g.api.draw();
   const hp=h.hp;g.api.dealDamage(h,1000,'physical');if(h.hp!==hp)throw Error('Armored Chonks damaged');
   const r=g.dom.canvas.getBoundingClientRect(),q=g.api.chonksShieldAnchor(h);
   if(!g.api.doodleArtwork('chonks-shield'))throw Error('Custom shield artwork missing');
   if(Math.hypot(q.x-h.x,q.y-h.y)>h.r*1.6)throw Error('Shield detached from body');
   window.shieldHost=h;return {x:r.left+q.x,y:r.top+q.y};
  });
  await page.screenshot({path:'/tmp/chonks-shield-'+viewport.width+'.png'});
  const session=viewport.width<500?await page.context().newCDPSession(page):null;
  const box=await page.locator('#eraserBtn').boundingBox(),modifier={id:1,x:box.x+box.width/2,y:box.y+box.height/2};
  if(session){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[modifier]});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[modifier,{id:2,...target}]});}
  else{await page.mouse.move(target.x,target.y);await page.mouse.down({button:'right'});}
  for(let i=0;i<14;i++){
   const p={x:target.x+(i%2?8:-8),y:target.y};
   if(session)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[modifier,{id:2,...p}]});else await page.mouse.move(p.x,p.y);
   await page.evaluate(()=>testGame.api.updateChonksShield(.05));
  }
  if(session)await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up({button:'right'});
  await page.evaluate(()=>{
   const g=testGame,h=shieldHost;if(g.api.hasChonksShield(h))throw Error('Real eraser did not remove shield');
   const hp=h.hp;g.api.dealDamage(h,1,'physical');if(h.hp!==hp-1)throw Error('Normal damage did not resume');g.api.draw();
  });
  await page.screenshot({path:'/tmp/chonks-erased-'+viewport.width+'.png'});
  await page.click('#pauseBtn');const wear=await page.evaluate(()=>shieldHost.chonks.shieldWear);await page.evaluate(()=>testGame.api.update(1));assert.equal(await page.evaluate(()=>shieldHost.chonks.shieldWear),wear);
  assert.deepEqual(errors,[]);console.log('PASS:',viewport.width,'visible convoy, immunity, actual mouse/touch shield rubbing, vulnerability and pause');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
