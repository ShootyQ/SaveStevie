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
  await page.evaluate(()=>{
   const g=testGame;g.api.queuePaperRub({x:75,y:220},{x:85,y:220});g.api.updatePaper(.3);
   const wear=JSON.stringify(g.state.paper.patches),holes=JSON.stringify(g.state.paper.holes);
   for(const wave of [2,3,4,5]){
    g.state.wave=wave;g.api.startWave({skipIntro:true});
    if(JSON.stringify(g.state.paper.holes)!==holes||JSON.stringify(g.state.paper.patches)!==wear)throw Error('Paper lost across wave '+wave);
   }
   g.api.draw();
  });
  await page.screenshot({path:'/tmp/opening-paper-'+viewport.width+'.png'});
  const tunnel=await page.evaluate(()=>{
   const g=testGame,holes=g.state.paper.holes;if(holes.length!==2)throw Error('Real rubbing did not open two holes: '+holes.length);
   const old=Math.random;Math.random=()=>0;
   const e=g.api.spawnEnemy(false,holes[0].x,holes[0].y,'grunt');g.api.updatePaperEnemy(e,.05);Math.random=old;
   if(!e.paperTunnel)throw Error('No tunnel from real holes');
   g.api.updatePaperEnemy(e,.5);g.api.updatePaperEnemy(e,.2);g.api.draw();return e.paperTunnel.phase;
  });
  assert.equal(tunnel,'travel');await page.screenshot({path:'/tmp/paper-shortcut-'+viewport.width+'.png'});
  await page.evaluate(()=>{
   const g=testGame;g.state.wave=6;g.api.startWave({skipIntro:true});
   if(g.state.paper.holes.length||g.state.paper.patches.length)throw Error('Wave six did not refresh');
   g.api.draw();
  });
  assert.deepEqual(errors,[]);console.log('PASS:',viewport.width,'real eraser input, wear/holes across waves 1–5, tunnel and fresh wave six');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
