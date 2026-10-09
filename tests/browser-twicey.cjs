// Optional browser regression for Twicey splitting, reunion and canvas rendering.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  const position=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun();g.state.wave=8;g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.player.hp=g.state.player.maxHp=10000;g.state.stats.rockDamage=0;g.state.stats.wallDamage=0;g.state.enemies=[];
   const p=g.state.player,e=g.api.spawnEnemy(false,p.x,p.y-95,'splitter');window.twicey=e;g.api.updateEnemyAnimations(.1);g.api.draw();const r=g.dom.canvas.getBoundingClientRect();return {x:e.x+r.left,y:e.y+r.top};
  });
  await page.screenshot({path:'/tmp/twicey-whole-'+viewport.width+'.png'});
  await page.mouse.move(position.x-30,position.y);await page.mouse.down();await page.mouse.move(position.x+30,position.y,{steps:8});await page.mouse.up();
  const roles=await page.evaluate(()=>{const g=testGame;if(g.state.enemies.length!==2)throw Error('Pointer seam did not split');g.state.walls=[];g.state.enemies[0].twicey.timer=0;g.api.update(.02);g.api.draw();return g.state.enemies.map(e=>e.twicey.role);});assert.deepEqual(roles,['runner','chewer']);
  await page.screenshot({path:'/tmp/twicey-halves-'+viewport.width+'.png'});
  const result=await page.evaluate(()=>{
   const g=testGame,[a,b]=g.state.enemies,p=g.state.player;window.pair=[a,b];a.x=p.x-45;b.x=p.x+45;a.y=b.y=p.y-95;a.twicey.age=b.twicey.age=6;
   g.state.walls=[{pts:[{x:p.x,y:p.y-140},{x:p.x,y:p.y-50}],thick:8,hp:10000,maxHp:10000,life:1000,maxLife:1000}];
   for(let i=0;i<30;i++)g.api.update(.03);if(g.state.enemies.length!==2||a.x>=p.x||b.x<=p.x)throw Error('Reunion bypassed barrier');
   const before=JSON.stringify(g.state);g.api.draw();if(before!==JSON.stringify(g.state))throw Error('Art changed combat');return {a:a.twicey.phase,b:b.twicey.phase};
  });assert.deepEqual(result,{a:'reunite',b:'reunite'});await page.screenshot({path:'/tmp/twicey-reunion-'+viewport.width+'.png'});
  await page.evaluate(()=>{
   const g=testGame,[a,b]=pair;g.state.paused=true;const before=JSON.stringify(g.state);g.api.update(.5);if(before!==JSON.stringify(g.state))throw Error('Pause failed');g.state.paused=false;
   g.state.walls=[];a.x=g.state.player.x-5;b.x=g.state.player.x+5;a.y=b.y=g.state.player.y-95;const hp=a.hp+b.hp;g.api.update(.02);if(g.state.enemies.length!==1||g.state.enemies[0].hp!==hp||g.state.enemies[0].stun<1.5)throw Error('Reunion healing/dizzy failed');g.api.draw();
  });await page.screenshot({path:'/tmp/twicey-dizzy-'+viewport.width+'.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>testGame.api.enemyMotionReduced(),null,{polling:50});await page.evaluate(()=>{testGame.api.updateEnemyAnimations(.1);testGame.api.draw();});
  assert.deepEqual(errors,[]);console.log('PASS: Twicey pointer seam, half roles, solid reunion barrier, pure rendering, pause, dizzy health preservation and reduced motion at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
