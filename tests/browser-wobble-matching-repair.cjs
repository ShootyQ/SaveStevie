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


  await page.evaluate(()=>{const g=testGame;g.api.resetRun({skipIntro:true});g.api.beginWobbleRepair({});});
  await page.click('#wobbleRepairHelp');
  for(let part=0;part<3;part++){
   await page.locator('#wobbleRepairPad').scrollIntoViewIfNeeded();
   const box=await page.locator('#wobbleRepairPad').boundingBox(),snap=await page.evaluate(()=>testGame.api.wobbleRepairSnapshot()),a=snap.anchor;
   const raw=[snap.sockets[0],{x:a.x+(part===0?-65:part===1?-20:-15),y:a.y+(part===0?-25:part===1?65:-65)},{x:a.x+(part===0?-130:part===1?55:15),y:a.y+(part===0?10:part===1?80:-90)},{x:a.x+(part===0?-60:part===1?30:25),y:a.y+(part===0?25:part===1?35:-30)},snap.sockets[1]];
   const points=raw.map(p=>({x:box.x+p.x/480*box.width,y:box.y+p.y/320*box.height}));
   const touch=viewport.width<500?await page.context().newCDPSession(page):null;
   const draw=async pts=>{
    if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pts[0]]});for(const p of pts.slice(1))await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    else{await page.mouse.move(pts[0].x,pts[0].y);await page.mouse.down();for(const p of pts.slice(1))await page.mouse.move(p.x,p.y,{steps:4});await page.mouse.up();}
   };
   await draw(points.slice(0,3));assert(await page.locator('#wobbleRepairAttach').isDisabled(),'unfinished outline cannot attach');
   await draw(points.slice(2));const ready=await page.evaluate(()=>testGame.api.wobbleRepairSnapshot());assert(ready.connected);assert.equal(ready.strokes.length,1,'continued outline remains one silhouette');
   assert.deepEqual(ready.strokes[0][0],ready.sockets[0]);assert.deepEqual(ready.strokes[0].at(-1),ready.sockets[1]);
   const pixels=await page.evaluate(()=>{
    const c=document.getElementById('wobbleRepairPad'),d=c.getContext('2d').getImageData(0,0,480,320).data;
    let yellow=0,orange=0;for(let i=0;i<d.length;i+=4){if(d[i]===255&&d[i+1]===240&&d[i+2]===0&&d[i+3])yellow++;if(d[i]===255&&d[i+1]===135&&d[i+2]===0&&d[i+3])orange++;}return {yellow,orange};
   });assert(pixels.yellow>40&&pixels.orange>10,'custom outline contains yellow fill and orange spots');
   await page.screenshot({path:'/tmp/wobble-matching-draw-'+part+'-'+viewport.width+'.png'});
   await page.click('#wobbleRepairAttach');await page.evaluate(()=>{for(let i=0;i<9;i++)testGame.api.updateWobbleRepair(.1)});
  }
  assert.equal(await page.evaluate(()=>testGame.api.wobbleRepairSnapshot().stage),'walk');
  await page.screenshot({path:'/tmp/wobble-matching-walk-'+viewport.width+'.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>testGame.api.updateWobbleRepair(.1));
  assert.deepEqual(errors,[]);console.log('PASS:',viewport.width,'two-socket outlines, continuation, yellow/spotted fill and attached walk');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
