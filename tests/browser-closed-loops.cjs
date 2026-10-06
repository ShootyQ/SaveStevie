// Single paper-fort image and rounded contact boundary in real browsers.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('doodleDefenderBestV4','1')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');await page.waitForFunction(()=>testGame.api.artworkReady());
   const result=await page.evaluate(()=>{
    const g=testGame;g.api.chooseUpgrade({...g.catalog.upgrades.find(u=>u.name==='Closed Loop'),rarity:'common'});
    const {x,y}=g.state.player;g.state.spawnTimer=999;
    const old={pts:[{x:x-20,y:y+20},{x:x+20,y:y+20}],hp:20,maxHp:60,thick:8,life:60,maxLife:60};g.state.walls=[old];
    const points=[[-60,-60],[0,-60],[60,-60],[60,0],[60,60],[0,60],[-60,60],[-60,0],[-60,-60]].map(([dx,dy])=>({x:x+dx,y:y+dy}));
    const ink=g.state.stats.ink;g.api.createWall(points);const wall=g.state.walls[1];wall.sealAge=.25;
    g.api.draw();return {spent:ink-g.state.stats.ink,repair:old.hp-20,closed:wall.closed,note:g.state.floaters.some(f=>f.text?.includes('SEALED!'))};
   });assert.ok(Math.abs(result.spent-148.8*.85)<1e-6);assert.equal(result.repair,6);assert.equal(result.closed,true);assert.equal(result.note,true);
   await page.screenshot({path:'/tmp/closed-loop-'+viewport.width+'.png'});
   const pure=await page.evaluate(()=>{const a=JSON.stringify(testGame.state);testGame.api.draw();return a===JSON.stringify(testGame.state)});assert.equal(pure,true);
   await page.click('#buildBtn');assert.match(await page.textContent('#buildUpgrades'),/10.0% damage inside/);assert.match(await page.textContent('#buildUpgrades'),/15.0% paid ink back/);await page.click('#closeBuildBtn');
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>testGame.api.draw());
   await page.evaluate(()=>{testGame.api.setDevMode(true);testGame.api.openUpgrade()});await page.selectOption('#devUpgrade','Fortress Geometry');await page.selectOption('#devRarity','legendary');
   assert.match(await page.textContent('#cards'),/damage inside/);assert.equal(await page.locator('#cards .ucard').evaluateAll(cards=>cards.every(c=>c.scrollWidth<=c.clientWidth+1)),true);
   await page.screenshot({path:'/tmp/closed-loop-reward-'+viewport.width+'.png'});
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' closed-loop refund/repair, completion pulse/note, current build and rarity previews, phone fit, reduced motion and pure rendering');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
