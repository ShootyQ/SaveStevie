const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>testGame.api.artworkStatus().ready);
  const result=await page.evaluate(()=>{const g=testGame,a=g.api;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.resetRun();g.state.enemies=[];g.state.walls=[];g.state.player.x=g.state.W/2;g.state.player.y=g.state.H-60;const x=g.state.W/2;g.state.walls=[200,480].map(y=>({pts:[{x:x-70,y},{x:x+70,y}],thick:8,hp:10000,maxHp:10000,life:1000,maxLife:1000}));const e=a.spawnEnemy(false,x,150,'sprinter');let jumps=0,air=false;for(let i=0;i<400;i++){a.updateDash(e,.02);a.updateEnemyAnimations(.02);if(e.hurdle&&!air)jumps++;air=!!e.hurdle;if(jumps===2&&e.hurdle.age>.12)break;}a.draw();return {jumps,r:e.r,air:!!e.hurdle};});
  assert.equal(result.jumps,2);assert.equal(result.r,11.9);assert(result.air);await page.screenshot({path:'/tmp/dash-recharge-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+'px smaller Dash with recharged second hurdle and no page errors');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
