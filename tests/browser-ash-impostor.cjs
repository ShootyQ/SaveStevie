const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>testGame.api.artworkStatus().ready);
  await page.waitForFunction(()=>testGame.api.doodleArtwork('ash-impostor-animations'));
  const poses=await page.evaluate(()=>{const g=testGame,a=g.api;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.resetRun();g.state.enemies=[];g.state.walls=[];const owner=a.spawnEnemy(false,100,250,'grunt'),attacker=a.spawnEnemy(false,145,250,'grunt');owner.burn=2;a.doodleTrickHit(owner,{ash:1},{burn:true},0);const d=a.doodleTarget(attacker);d.x=g.state.W/2;d.y=g.state.player.y-110;const poses=[];for(const age of [.25,1,1,3.7]){d.life=4-age;d.reaction=poses.length===2?.25:0;poses.push(a.ashImpostorPose(d));a.draw();}window.ashDecoy=d;return poses;});
  assert.deepEqual(poses.map(p=>p.action),['entrance','taunt','startled','ash-out']);
  // Show all four full drawn actions at readable scale for visual inspection.
  await page.evaluate(()=>{const g=testGame,d=window.ashDecoy,c=g.dom.ctx;c.save();c.fillStyle='#f4efd9';c.fillRect(0,170,g.state.W,150);const ages=[.25,1,1,3.7];ages.forEach((age,i)=>{d.x=g.state.W*(i+.5)/4;d.y=250;d.life=4-age;d.reaction=i===2?.25:0;g.api.drawDoodleTricks();});c.restore();});
  await page.screenshot({path:'/tmp/ash-poses-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+'px Ash Impostor full drawn entrance, taunt, recoil and ash-out');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
