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

  const points=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun({skipIntro:true});g.state.enemies=[];g.state.spawnTimer=999;
   const r=g.dom.canvas.getBoundingClientRect(),x=g.state.W/2;
   return [{x:r.left+x,y:r.top+120},{x:r.left+x,y:r.top+g.state.player.y-115}];
  });
  const session=viewport.width<500?await page.context().newCDPSession(page):null;
  const box=await page.locator('#eraserBtn').boundingBox(),modifier={id:1,x:box.x+box.width/2,y:box.y+box.height/2};
  for(const point of points){
   if(session){
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[modifier]});
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[modifier,{id:2,...point}]});
   }else{await page.mouse.move(point.x,point.y);await page.mouse.down({button:'right'});}
   for(let i=0;i<22;i++){
    const p={x:point.x+(i%2?8:-8),y:point.y};
    if(session)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[modifier,{id:2,...p}]});
    else await page.mouse.move(p.x,p.y);
    await page.evaluate(()=>testGame.api.updatePaper(.05));
   }
   if(session){await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[modifier]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else await page.mouse.up({button:'right'});
  }
  const tunnel=await page.evaluate(()=>{
   const g=testGame,holes=g.state.paper.holes;if(holes.length!==2)throw Error('Real rubbing did not open two holes: '+holes.length);
   const old=Math.random;Math.random=()=>0;
   const e=g.api.spawnEnemy(false,holes[0].x,holes[0].y,'grunt');g.api.updatePaperEnemy(e,.05);Math.random=old;
   if(!e.paperTunnel)throw Error('No tunnel from real holes');
   g.api.updatePaperEnemy(e,.5);g.api.updatePaperEnemy(e,.2);g.api.draw();return e.paperTunnel.phase;
  });
  assert.equal(tunnel,'travel');await page.screenshot({path:'/tmp/paper-shortcut-'+viewport.width+'.png'});
  const frames=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun({skipIntro:true});g.state.wave=5;g.api.startWave({skipIntro:true});g.state.enemies=[];g.state.timeLeft=0;g.api.update(.01);
   g.api.update(.2);const a=g.api.firstBossIntroPose().frame;g.api.draw();g.api.update(.13);const b=g.api.firstBossIntroPose().frame;g.api.draw();return [a,b];
  });assert.notEqual(frames[0],frames[1]);
  await page.screenshot({path:'/tmp/doom-entrance-'+viewport.width+'.png'});
  const win=await page.evaluate(()=>{
   const g=testGame;g.api.update(7);g.api.setWaveFinaleEnabled(true);const boss=g.state.enemies.find(e=>e.waveBoss);g.api.killEnemy(boss);g.api.update(1.2);g.api.draw();
   const before=JSON.stringify(g.api.waveFinaleSnapshot());g.api.draw();return {boss:g.api.waveFinaleSnapshot().boss,track:g.api.musicStatus().track,pure:before===JSON.stringify(g.api.waveFinaleSnapshot())};
  });assert(win.boss&&win.pure);assert.equal(win.track,'victory');
  await page.screenshot({path:'/tmp/boss-celebration-'+viewport.width+'.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{testGame.api.update(.01);testGame.api.drawBossVictory();});
  assert.deepEqual(errors,[]);console.log('PASS:',viewport.width,'real eraser holes, tunnel, animated entrance, boss celebration');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
