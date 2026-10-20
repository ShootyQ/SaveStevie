const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
 const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('saveStevieNotebookV1',JSON.stringify({version:2,scraps:100,lifetimeScraps:100,scrapTutorialDone:true,levels:{starterEraser:1}}));localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMusicMuted','yes');requestAnimationFrame=()=>0;});
 await page.route('http://127.0.0.1:8001/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.ttf')?'font/ttf':'text/html'});});
 await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');
 assert(await page.locator('#betaScrapsOverlay').isVisible());assert(await page.locator('#betaTreeViewport').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

 assert.equal(await page.locator('.beta-tree-node .beta-node-action').count(),await page.locator('.beta-tree-node').count());
 assert.equal(await page.locator('#beta-node-start').getAttribute('data-buyable'),'true');
 const cost=await page.evaluate(()=>testGame.api.notebookSnapshot().scraps);
 await page.evaluate(()=>testGame.api.selectBetaNode('start'));
 assert.equal(await page.locator('#beta-node-start').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#beta-node-start').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),cost,'opening remains read-only');
 assert.equal(await page.locator('#betaBuyNode').evaluate(e=>getComputedStyle(e).borderStyle),'solid');
 await page.screenshot({path:'/tmp/beta-clear-start-'+viewport.width+'.png'});
 await page.click('#betaBuyNode');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().betaPencilClaimed),true);
 await page.evaluate(()=>testGame.api.selectBetaNode('inkTank'));
 assert.equal(await page.locator('#beta-node-inkTank').getAttribute('data-buyable'),'true');
 await page.click('#betaBuyNode');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),cost-5);
 await page.evaluate(()=>testGame.api.selectBetaNode('inkLater'));
 assert.equal(await page.locator('#betaBuyNode').isDisabled(),true);
 assert.match(await page.locator('#beta-node-inkLater .beta-node-action').textContent(),/Preview/);
 await page.evaluate(()=>{testGame.api.foldBetaNote();testGame.api.fitBetaTree()});
 await page.screenshot({path:'/tmp/beta-clear-map-'+viewport.width+'.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' visible node/action/selection/buy states, safe inspect, real shared purchase and locked preview');await context.close();
 }
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
