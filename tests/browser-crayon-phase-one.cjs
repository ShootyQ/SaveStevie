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
   try{body=fs.readFileSync(path.join(root,name))}catch(error){if(name==='index.html')throw error;return route.fulfill({status:404,body:''})}
   if(name==='index.html'&&(viewport.width<500||viewport.height<450))body=body.toString().replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html'});
  });
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#startBtn');

  const targets=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun({skipIntro:true});g.state.wave=15;g.api.startWave({skipIntro:true});g.state.spawnTimer=9999;g.state.timeLeft=999;g.state.stats.ink=g.state.stats.maxInk=1000;
   window.crayon=g.api.spawnEnemy(true,100,130);for(let i=0;i<96;i++)g.api.updateCrayonBoss(crayon,.05);
   const s=g.api.crayonSnapshot(crayon),n=s.snakes[0],tip=n.pts.at(-1),r=g.dom.canvas.getBoundingClientRect();window.trailId=n.id;
   g.api.draw();return {tip:{x:r.left+tip.x,y:r.top+tip.y},left:r.left,top:r.top};
  });
  await page.screenshot({path:'/tmp/crayon-trails-'+viewport.width+'.png'});
  const session=viewport.width<500?await page.context().newCDPSession(page):null;
  const box=await page.locator('#eraserBtn').boundingBox(),modifier={id:1,x:box.x+box.width/2,y:box.y+box.height/2};
  async function erase(p){
   if(session){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[modifier]});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[modifier,{id:2,x:p.x-8,y:p.y-8}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[modifier,{id:2,x:p.x+8,y:p.y+8}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(p.x-8,p.y-8);await page.mouse.down({button:'right'});await page.mouse.move(p.x+8,p.y+8);await page.mouse.up({button:'right'});}
  }
  await erase(targets.tip);
  const shield=await page.evaluate(()=>{const g=testGame,s=g.api.crayonSnapshot(crayon),n=s.snakes.find(n=>n.id===trailId);if(!n?.cut)throw Error('Real eraser failed to leave cut trail');return Array.from({length:6},(_,i)=>{const a=(i+.5)*Math.PI/3;return {x:crayon.x+Math.cos(a)*(crayon.r+13),y:crayon.y+Math.sin(a)*(crayon.r+13)}})});
  for(const p of shield)await erase({x:p.x+targets.left,y:p.y+targets.top});
  const stroke=await page.evaluate(()=>{const g=testGame,s=g.api.crayonSnapshot(crayon);if(s.shield.some(Boolean))throw Error('Real eraser did not open shield');const n=s.snakes.find(n=>n.id===trailId),p=n.pts.at(-1),r=g.dom.canvas.getBoundingClientRect();return {a:{x:p.x+r.left,y:p.y+r.top},b:{x:crayon.x+r.left,y:crayon.y+r.top},hp:crayon.hp}});
  if(session)await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:2,...stroke.a}]});else{await page.mouse.move(stroke.a.x,stroke.a.y);await page.mouse.down();}
  for(let i=1;i<=14;i++){const p={x:stroke.a.x+(stroke.b.x-stroke.a.x)*i/14,y:stroke.a.y+(stroke.b.y-stroke.a.y)*i/14};if(session)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:2,...p}]});else await page.mouse.move(p.x,p.y);}
  if(session)await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
  await page.evaluate(()=>{const g=testGame;if(!g.api.crayonSnapshot(crayon).returns.length)throw Error('Actual drawing did not send wax back');g.api.draw()});
  await page.screenshot({path:'/tmp/crayon-return-'+viewport.width+'.png'});
  const hp=await page.evaluate(()=>{const g=testGame;for(let i=0;i<50;i++)g.api.updateCrayonBoss(crayon,.05);g.api.draw();return crayon.hp});assert(hp<stroke.hp,'real erasing and drawing earn a return hit');
  await page.click('#pauseBtn');const before=await page.evaluate(()=>JSON.stringify(testGame.api.crayonSnapshot(crayon)));await page.evaluate(()=>testGame.api.updateCrayonBoss(crayon,2));assert.equal(await page.evaluate(()=>JSON.stringify(testGame.api.crayonSnapshot(crayon))),before);
  assert.deepEqual(errors,[]);console.log('PASS:',viewport.width,'real mouse/touch trail cutting, shield erasing, drawn wax return, moving hit and pause');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
