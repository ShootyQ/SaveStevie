const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
 const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('saveStevieNotebookV1',JSON.stringify({version:2,scraps:100,lifetimeScraps:100,scrapTutorialDone:true,levels:{starterEraser:1}}));localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMusicMuted','yes');requestAnimationFrame=()=>0;});
 await page.route('http://127.0.0.1:8001/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.ttf')?'font/ttf':'text/html'});});
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#splashHubBtn');await page.click('#hubBetaScrapsBtn');
 assert(await page.locator('#betaScrapsOverlay').isVisible());assert(await page.locator('#betaTreeViewport').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const v=await page.locator('#betaTreeViewport').boundingBox();assert.equal(v.width,viewport.width);assert.equal(v.height,viewport.height,'map fills the screen');assert.equal(await page.locator('.beta-tree-toolbar,.beta-branch-nav,.beta-tree-details').count(),0,'no external toolbar or panel');assert(await page.locator('#betaNodeNote').isHidden());
 await page.screenshot({path:'/tmp/full-page-tree-'+viewport.width+'.png'});
 const openNode=async id=>{await page.click('#betaFit');await page.click('#beta-node-'+id);assert(await page.locator('#betaNodeNote').isVisible());};
 await openNode('start');await page.screenshot({path:'/tmp/full-page-tree-note-'+viewport.width+'.png'});await page.click('#betaBuyNode');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().betaPencilClaimed),true);assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),100);
 await page.click('#betaFoldNote');assert(await page.locator('#betaNodeNote').isHidden());
 await openNode('inkTank');await page.click('#betaBuyNode');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().levels.inkTank),1);assert.equal(await page.locator('#betaTreeBank').textContent(),'95');
 await openNode('tool');await page.click('#betaBuyNode');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().levels.tool),1);assert.equal(await page.locator('#betaHeldTool [data-tool-rank]').getAttribute('data-tool-rank'),'1');
 await page.keyboard.press('Escape');assert(await page.locator('#betaNodeNote').isHidden(),'first Escape folds the map note');assert(await page.locator('#betaScrapsOverlay').isVisible());
 const position={x:v.x+v.width*.5,y:v.y+v.height*.5};await page.mouse.move(position.x,position.y);const z1=await page.evaluate(()=>testGame.api.betaViewSnapshot().scale);await page.mouse.wheel(0,-90);assert((await page.evaluate(()=>testGame.api.betaViewSnapshot().scale))>z1);
 const before=await page.evaluate(()=>testGame.api.betaViewSnapshot()),bank=await page.evaluate(()=>testGame.api.notebookSnapshot().scraps);await page.mouse.down();await page.mouse.move(position.x+50,position.y+30,{steps:6});await page.mouse.up();const after=await page.evaluate(()=>testGame.api.betaViewSnapshot());assert(after.x!==before.x||after.y!==before.y,'drag pans');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),bank,'drag cannot purchase');
 const cdp=await context.newCDPSession(page),cx=v.x+v.width*.5,cy=v.y+v.height*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-25,y:cy,id:1},{x:cx+25,y:cy,id:2}]});const pinchBefore=await page.evaluate(()=>testGame.api.betaViewSnapshot().scale);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-65,y:cy,id:1},{x:cx+65,y:cy,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert((await page.evaluate(()=>testGame.api.betaViewSnapshot().scale))>pinchBefore,'two-finger pinch zooms');
 await openNode('shapeLater');assert(await page.locator('#betaBuyNode').isDisabled());await page.screenshot({path:'/tmp/full-page-tree-shapes-'+viewport.width+'.png'});
 if(viewport.width<700){
  await page.locator('#betaNodeNote').evaluate(n=>n.style.maxHeight='180px');const note=await page.locator('#betaNodeNote').boundingBox(),touchX=note.x+note.width*.5,touchY=note.y+130;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchX,y:touchY,id:3}]});
  for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchX,y:touchY-i*16,id:3}]});await page.waitForTimeout(25);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert((await page.locator('#betaNodeNote').evaluate(n=>n.scrollTop))>0,'unfolded paper scrolls on touch independently of map gestures');await page.locator('#betaNodeNote').evaluate(n=>n.style.maxHeight='');
 }

 await page.click('#closeBetaScrapsBtn');assert(await page.locator('#hubOverlay').isVisible());await page.click('#hubNotebookBtn');assert.match(await page.locator('#notebookLoadout').textContent(),/180 ink/);assert.match(await page.locator('#notebookBuy-tool').textContent(),/rank 2 · 8 scraps/);await page.click('#closeNotebookBtn');await page.click('#hubSettingsBtn');await page.click('#optionsBetaScrapsBtn');assert(await page.locator('#betaScrapsOverlay').isVisible());await page.keyboard.press('Escape');assert(await page.locator('#hubOverlay').isVisible(),'keeps original hub back target');
 assert.deepEqual(errors,[]);console.log('PASS '+viewport.width+': fullscreen paper map, on-map notes/purchases, Escape folding, wheel/drag/touch pinch, locked shapes, bounds and existing shop.');await context.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
