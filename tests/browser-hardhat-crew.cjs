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
  const scene=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun({skipIntro:true});g.state.wave=14;g.state.spawnTimer=999;
   const p=g.state.player,x=Math.max(40,p.x-115),y=p.y-140;
   const tug=g.api.spawnEnemy(false,x,y,'wallpuller');g.api.createWall([{x:x+55,y:y-65},{x:x+55,y:y+65}]);g.api.updateHardhat(tug,1.1);
   const rip=g.api.spawnEnemy(false,p.x,p.y-195,'papertearer');g.api.updateHardhat(rip,1.1);g.api.updateHardhat(rip,1.4);
   g.api.updateEnemyAnimations(.03);g.api.draw();const r=g.dom.canvas.getBoundingClientRect();return {x:r.left+x+27,y:r.top+y,entry:g.state.paper.holes.length};
  });
  assert.equal(scene.entry,1);await page.screenshot({path:'/tmp/hardhat-jobs-'+viewport.width+'.png'});
  if(viewport.width>=500){await page.mouse.move(scene.x,scene.y-10);await page.mouse.down({button:'right'});await page.mouse.move(scene.x,scene.y+10,{steps:3});await page.mouse.up({button:'right'});}
  else{
   const box=await page.locator('#eraserBtn').boundingBox(),session=await page.context().newCDPSession(page),eraser={id:1,x:box.x+box.width/2,y:box.y+box.height/2},brush={id:2,x:scene.x,y:scene.y-10};
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[eraser]});
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[eraser,brush]});
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[eraser,{...brush,y:scene.y+10}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[eraser]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});

  }
  const result=await page.evaluate(()=>{
   const g=testGame,tug=g.state.enemies.find(e=>e.type==='wallpuller'),rip=g.state.enemies.find(e=>e.type==='papertearer');
   const cancelled=tug.crew.phase==='walk'&&tug.stun>0;g.api.updateHardhat(rip,1.3);g.api.updateHardhatBombs(1);g.api.updateEnemyAnimations(.03);g.api.draw();
   const state=JSON.stringify(g.state),jobs=JSON.stringify(g.api.hardhatSnapshot());g.api.draw();return {cancelled,holes:g.state.paper.holes.length,pure:state===JSON.stringify(g.state)&&jobs===JSON.stringify(g.api.hardhatSnapshot()),art:g.api.doodleArtwork('wallpuller').naturalWidth>0&&g.api.doodleArtwork('papertearer').naturalWidth>0};
  });
  assert(result.cancelled,'real mouse/touch eraser releases rope');assert.equal(result.holes,2);assert(result.pure);assert(result.art);assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/hardhat-crew-'+viewport.width+'.png'});console.log('PASS:',viewport.width,'hard-hat artwork, mouse/touch tool counters and real holes',result);await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
