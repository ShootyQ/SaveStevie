const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
for(const {viewport,native,touch} of [{viewport:{width:393,height:851},native:false,touch:true},{viewport:{width:851,height:393},native:true,touch:true},{viewport:{width:1280,height:800},native:false,touch:false}]){
 const page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));});
 await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf','.svg':'image/svg+xml'})[path.extname(name)]||'text/html'});});
 await page.goto('http://stevie.test/');await page.waitForFunction(()=>window.testGame,null,{polling:100});
 await page.evaluate(native=>{document.documentElement.classList.toggle('native-app',native);testGame.api.setFirstLessonsEnabled(false);testGame.api.resetRun({skipIntro:true});testGame.state.spawnTimer=999;testGame.api.draw();},native);
 await page.waitForTimeout(100);
 const box=await page.locator('#game').boundingBox();
 if(touch){assert(Math.abs(box.x)<1&&Math.abs(box.y)<1,'paper starts at screen edge');assert(Math.abs(box.width-viewport.width)<1&&Math.abs(box.height-viewport.height)<1,'paper fills viewport');assert.equal(await page.locator('#fullscreenBtn').isVisible(),false);
  const erase=await page.locator('#eraserBtn').boundingBox(),pause=await page.locator('#pauseBtn').boundingBox();assert(erase.width>=44&&erase.height>=44);assert(pause.width>=44&&pause.height>=44);
  // Empty toolbar space must pass touches through to the paper.
  assert.equal(await page.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight-30).id),'game');
  const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:erase.x+erase.width/2,y:erase.y+erase.height/2}]});assert.equal(await page.locator('#eraserBtn').getAttribute('aria-pressed'),'true');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.locator('#eraserBtn').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>testGame.api.setDrawingControl('eraserLeft',false));const right=await page.locator('#eraserBtn').boundingBox();assert(right.x>viewport.width/2,'right-handed placement remains available');await page.evaluate(()=>{testGame.api.setDrawingControl('eraserLeft',true);testGame.api.setDrawingControl('eraserSize','extra-large');});const large=await page.locator('#eraserBtn').boundingBox();assert(large.width>erase.width&&large.height>erase.height,'larger touch target setting remains available');await page.evaluate(()=>testGame.api.setDrawingControl('eraserSize','large'));
  await page.screenshot({path:'/tmp/floating-'+viewport.width+'.png'});await page.locator('#pauseBtn').click();assert(await page.locator('#pauseOverlay').isVisible());
 }else{assert(await page.evaluate(()=>document.documentElement.classList.contains('desktop-ui')));assert(box.y>0,'PC retains HUD tray');assert.equal(await page.locator('.bottom').isVisible(),false);}
 console.log('PASS floating controls',viewport,native);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
