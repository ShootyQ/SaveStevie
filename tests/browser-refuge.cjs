// Paper-ball refuge artwork and contact boundary in real browsers.
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
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
   await page.evaluate(()=>{testGame.api.setDevMode(true);testGame.api.resetRun()});
   await page.waitForFunction(()=>testGame.api.artworkReady());
   await page.evaluate(()=>{testGame.api.setDevMode(true);testGame.api.resetRun();testGame.state.spawnTimer=9999;testGame.api.draw()});
   await page.screenshot({path:'/tmp/paper-fort-'+viewport.width+'.png'});
   const contact=await page.evaluate(()=>{const g=testGame,b=g.api.refugeBounds(),e=g.api.spawnEnemy(false,b.right+11.1,g.state.player.y,'grunt'),hp=g.state.player.hp;const outside=g.api.contactStevie(e);e.x-=.2;const inside=g.api.contactStevie(e);g.api.draw();return {outside,inside,damage:hp-g.state.player.hp,hit:g.api.refugeSnapshot().hitPoint,bounds:b}});assert.equal(contact.outside,false);assert.equal(contact.inside,true);assert.equal(contact.damage,6);assert.equal(contact.hit.x,contact.bounds.right);
   await page.screenshot({path:'/tmp/paper-fort-hit-'+viewport.width+'.png'});
   const paused=await page.evaluate(()=>{const g=testGame;g.state.paused=true;const a=JSON.stringify(g.api.refugeSnapshot());g.api.update(.3);g.api.draw();return a===JSON.stringify(g.api.refugeSnapshot())});assert.equal(paused,true);
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>testGame.api.draw());
   const before=await page.evaluate(()=>testGame.api.refugeSnapshot());await page.setViewportSize({width:viewport.width+20,height:viewport.height+20});const after=await page.evaluate(()=>testGame.api.refugeSnapshot());assert.ok(Math.abs((after.hitPoint.x-before.hitPoint.x)-(after.bounds.left-before.bounds.left))<.01);
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' five paper-ball sprites, rectangular boundary contact, impact feedback, pause, reduced motion and resize');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
