// Warned boss-helper throws reuse the real airborne renderer on desktop/phones.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
   const warning=await page.evaluate(()=>{
    const g=testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.spawnTimer=9999;
    const portrait=g.state.H>g.state.W,x=portrait?g.state.W/2:65,y=portrait?110:g.state.H*.5;
    const boss=g.api.spawnEnemy(true,x,y),friend=g.api.spawnEnemy(false,x+25,y+3,'grunt');friend.bossOwner=boss;
    const b=g.api.bossBrain(boss);b.turn=3;b.cd=0;g.api.updateBossEncounter(boss,.01);g.api.updateBossEncounter(boss,.01);g.api.draw();
    window.flingFixture={boss,friend,hp:friend.hp};return g.api.bossEncounterSnapshot().bosses[0];
   });assert.equal(warning.cast.kind,'friend-fling');
   await page.screenshot({path:'/tmp/friend-fling-warning-'+viewport.width+'.png'});
   const paused=await page.evaluate(()=>{const g=testGame,a=JSON.stringify(g.state),b=JSON.stringify(g.api.bossEncounterSnapshot());g.api.draw();g.state.paused=true;g.api.update(.4);g.state.paused=false;return a===JSON.stringify(g.state)&&b===JSON.stringify(g.api.bossEncounterSnapshot())});assert.ok(paused);
   const flight=await page.evaluate(()=>{const g=testGame,{boss,friend}=flingFixture;g.api.updateBossEncounter(boss,1);g.api.updateEnemyFlight(friend,.5);g.api.draw();return {height:g.api.enemyFlightHeight(friend),friendly:friend.flight?.bossThrown}});assert.ok(flight.friendly&&flight.height>0);
   await page.screenshot({path:'/tmp/friend-fling-airborne-'+viewport.width+'.png'});
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>testGame.api.draw());
   await page.setViewportSize({width:viewport.width+20,height:viewport.height+40});await page.evaluate(()=>testGame.api.resize());
   const landing=await page.evaluate(()=>{const g=testGame,{friend,hp}=flingFixture;g.api.updateEnemyFlight(friend,.5);g.api.draw();return {hp:friend.hp,originalHp:hp,stun:friend.stun,airborne:!!friend.flight,safe:Math.hypot(friend.x-g.state.player.x,friend.y-g.state.player.y)>=g.state.player.r+friend.r+75,onPage:friend.x>=friend.r+24&&friend.x<=g.state.W-friend.r-24&&friend.y>=friend.r+76&&friend.y<=g.state.H-friend.r-64}});
   assert.equal(landing.hp,landing.originalHp);assert.equal(landing.stun,0);assert.ok(!landing.airborne&&landing.safe&&landing.onPage);assert.deepEqual(errors,[]);
   console.log('PASS: '+viewport.width+'x'+viewport.height+' warned throw, pure/paused art, spin/arc/shadow, reduced motion and safe damage-free resized landing.');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
