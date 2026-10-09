// Real Plaguefire triggers, animated canvas pixels, burnout and mobile rendering.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
   const initial=await page.evaluate(()=>{
    const g=testGame;for(const name of ['Fire Ink','Poison Ink'])g.api.chooseUpgrade(g.catalog.upgrades.find(u=>u.name===name));
    g.state.spawnTimer=10000;
    const e=g.api.spawnEnemy(false,g.state.W*.3,g.state.H*.45,'grunt');e.burn=2;e.poison=2;e.hp=.1;g.api.dealDamage(e,.2,'fire');g.api.update(.016);g.api.draw();
    return g.api.plaguefireSnapshot();
   });
   assert.equal(initial.patches.length,1,'normal kill path drops a pool');
   const pixels=await page.evaluate(()=>{
    const g=testGame;g.api.updatePlaguefire(3);g.api.draw();const a=g.dom.canvas.toDataURL();
    g.api.updatePlaguefire(.2);g.api.draw();return {a,b:g.dom.canvas.toDataURL(),snap:g.api.plaguefireSnapshot()};
   });
   assert.notEqual(pixels.a,pixels.b,'bubbles/flames animate');assert.ok(pixels.snap.patches[0].r>initial.patches[0].r);
   await page.screenshot({path:'/tmp/plaguefire-pool-'+viewport.width+'.png'});
   const frozen=await page.evaluate(()=>{
    const g=testGame;g.state.paused=true;const a=JSON.stringify(g.api.plaguefireSnapshot());g.api.update(.2);g.api.draw();const b=JSON.stringify(g.api.plaguefireSnapshot());g.state.paused=false;return {a,b};
   });assert.equal(frozen.a,frozen.b);
   const beforeReduced=await page.evaluate(()=>JSON.stringify(testGame.api.plaguefireSnapshot()));await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.evaluate(()=>JSON.stringify(testGame.api.plaguefireSnapshot())),beforeReduced,'motion preference does not erase combat pools');
   const calm=await page.evaluate(()=>{
    const g=testGame;g.api.draw();const a=g.dom.canvas.toDataURL();g.api.updatePlaguefire(.1);g.api.draw();return {a,b:g.dom.canvas.toDataURL()};
   });assert.notEqual(calm.a,calm.b,'reduced motion retains truthful growth');
   await page.emulateMedia({reducedMotion:'no-preference'});
   const burnout=await page.evaluate(()=>{
    const g=testGame;g.state.enemies=[];g.api.updatePlaguefire(6.7);g.api.draw();return {snap:g.api.plaguefireSnapshot(),pixels:g.dom.canvas.toDataURL()};
   });assert.equal(burnout.snap.patches.length,0);assert.equal(burnout.snap.scars.length,1);assert.notEqual(burnout.pixels,pixels.b,'burnout reveals a different charred hole');
   await page.screenshot({path:'/tmp/plaguefire-hole-'+viewport.width+'.png'});
   const beforeResize=await page.evaluate(()=>({player:{x:testGame.state.player.x,y:testGame.state.player.y},scar:testGame.api.plaguefireSnapshot().scars[0]}));
   await page.setViewportSize({width:viewport.width+20,height:viewport.height+20});
   const afterResize=await page.evaluate(()=>({player:{x:testGame.state.player.x,y:testGame.state.player.y},scar:testGame.api.plaguefireSnapshot().scars[0]}));
   assert.ok(Math.abs((afterResize.scar.x-beforeResize.scar.x)-(afterResize.player.x-beforeResize.player.x))<.001);assert.ok(Math.abs((afterResize.scar.y-beforeResize.scar.y)-(afterResize.player.y-beforeResize.player.y))<.001);
   await page.evaluate(()=>testGame.api.startWave());assert.equal(await page.evaluate(()=>testGame.api.plaguefireSnapshot().scars.length),0);
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' actual death drop, animated growing pool, pause, reduced motion, charred hole, resize and fresh-wave reset');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
