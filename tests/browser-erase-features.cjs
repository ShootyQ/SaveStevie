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
  const result=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun({skipIntro:true});g.state.enemies=[];
   const x=g.state.W/2,y=g.state.H/2;
   g.state.inks.fire=g.state.inks.poison=1;g.state.synergies.add('Plaguefire');g.api.dropPlaguefire({x,y,burn:1,poison:1});g.api.updatePlaguefire(5);
   const canvas=new OffscreenCanvas(Math.ceil(g.state.W),Math.ceil(g.state.H)),ctx=canvas.getContext('2d'),original=g.dom.ctx;g.dom.ctx=ctx;g.api.drawPlaguefire();const before=ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data[3];g.dom.ctx=original;
   g.api.eraseWallPath({x,y:y-40},{x,y:y+40},12);
   ctx.clearRect(0,0,canvas.width,canvas.height);g.dom.ctx=ctx;g.api.drawPlaguefire();const after=ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data[3],outside=ctx.getImageData(Math.floor(x+20),Math.floor(y),1,1).data[3];g.dom.ctx=original;
   g.state.inks.electric=1;g.api.createWall([{x:x-80,y:y-70},{x:x+80,y:y-70}]);g.api.eraseWallPath({x,y:y-70},{x,y:y-70},20);
   const wallX=x-95,wallY=y-130;g.api.createWall([{x:wallX,y:wallY-50},{x:wallX,y:wallY+50}]);const e=g.api.spawnEnemy(false,wallX-35,wallY-35,'sprinter');g.api.eraseWallPath({x:wallX,y:wallY},{x:wallX,y:wallY},20);g.api.updateEnemyAnimations(.03);g.api.draw();
   return {before,after,outside,stun:e.stun,arcs:g.state.paper.arcs.length};
  });
  assert(result.before>0);assert.equal(result.after,0,'erased strip really clears hazard pixels');assert(result.outside>0,'neighboring fire stays visible');assert.equal(result.stun,1.4);assert.equal(result.arcs,2);assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/erase-features-'+viewport.width+'.png'});console.log('PASS:',viewport.width,'Trip Line, Spark Gap and Firebreak pixels',result);await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
