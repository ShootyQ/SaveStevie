const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:800},{width:393,height:851}].filter(v=>!process.env.BOOTSTOMP_WIDTH||v.width===Number(process.env.BOOTSTOMP_WIDTH))){
  const touch=viewport.width<600,page=await browser.newPage({viewport,hasTouch:touch}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>testGame.api.artworkStatus().ready,null,{timeout:120000,polling:100}).catch(async e=>{console.error(await page.evaluate(()=>testGame.api.artworkStatus()));throw e;});
  await page.evaluate(()=>{const g=testGame,a=g.api;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.setSynergyRevealsEnabled(false);a.setWaveFinaleEnabled(false);a.resetRun();g.state.wave=10;a.startWave();g.state.enemies=[];g.state.timeLeft=0;g.state.stats.rockRate=0;g.state.stats.ink=g.state.stats.maxInk=1000;g.state.stats.playerArmor=0;g.state.player.hp=g.state.player.maxHp=10000;a.spawnWaveEnemies(0);});
  const tick=async seconds=>page.evaluate(seconds=>{const g=testGame;for(let t=0;t<seconds-.000001;t+=.05){for(const n of g.state.enemies)if(n.bossOwner)n.stun=999;g.api.update(Math.min(.05,seconds-t));}g.api.draw();},seconds);
  const snapshot=()=>page.evaluate(()=>{const e=testGame.state.enemies.find(e=>e.type==='bootstomp');return e&&testGame.api.bootstompSnapshot(e);});
  const until=async phase=>{for(let i=0;i<180;i++){const s=await snapshot();if(s?.phase===phase)return s;await tick(.1);}throw Error('Did not reach '+phase);};
  await until('intro');await tick(.6);await page.screenshot({path:'/tmp/bootstomp-live-intro-'+viewport.width+'.png'});
  const s=await until('windup'),box=await page.locator('#game').boundingBox(),p={x:box.x+s.target.x,y:box.y+s.target.y};let cdp,button;
  if(touch){cdp=await page.context().newCDPSession(page);const r=await page.locator('#eraserBtn').boundingBox();button={id:1,x:r.x+r.width/2,y:r.y+r.height/2};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[button,{id:2,x:p.x,y:p.y}]});}
  else{await page.mouse.move(p.x,p.y);await page.mouse.down({button:'right'});}
  await tick(2.6);assert((await snapshot()).pressure>=.8);await page.screenshot({path:'/tmp/bootstomp-live-hold-'+viewport.width+'.png'});await tick(.8);assert.equal((await snapshot()).phase,'stumble');
  if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up({button:'right'});
  await until('down');await page.screenshot({path:'/tmp/bootstomp-live-down-'+viewport.width+'.png'});
  const patchAlpha=()=>page.evaluate(()=>{const g=testGame,e=g.state.enemies.find(e=>e.type==='bootstomp'),q=g.api.bootstompSnapshot(e).parts.left_boot,c=document.createElement('canvas');c.width=Math.ceil(g.state.W);c.height=Math.ceil(g.state.H);const ctx=c.getContext('2d'),old=g.dom.ctx;g.dom.ctx=ctx;ctx.translate(e.x,e.y);try{g.api.drawBootstomp(e);}finally{g.dom.ctx=old}const x=Math.max(0,Math.floor(q.x-q.rx*.45)),y=Math.max(0,Math.floor(q.y-q.ry*.45)),w=Math.max(1,Math.ceil(q.rx*.9)),h=Math.max(1,Math.ceil(q.ry*.9)),pixels=ctx.getImageData(x,y,w,h).data;let max=0;for(let i=3;i<pixels.length;i+=4)max=Math.max(max,pixels[i]);return max;});
  assert((await patchAlpha())>150,'unrubbed boot starts clearly visible');
  for(let i=0;i<3;i++){
   const target=(await snapshot()).parts.left_boot,x=box.x+target.x,y=box.y+target.y;
   if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[button,{id:3,x:x-15,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[button,{id:3,x:x+15,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(x-15,y);await page.mouse.down({button:'right'});await page.mouse.move(x+15,y,{steps:5});await page.mouse.up({button:'right'});}
   await tick(.61);
  }
  assert.equal((await snapshot()).wear.left_boot,3);const ghostAlpha=await patchAlpha();assert(ghostAlpha>0&&ghostAlpha<=20,'erased boot retains only a faint ghost: '+ghostAlpha);await page.screenshot({path:'/tmp/bootstomp-live-erased-'+viewport.width+'.png'});
  await until('windup');assert.equal((await snapshot()).wear.left_boot,3,'standing preserves missing boot');
  await page.screenshot({path:'/tmp/bootstomp-live-standing-'+viewport.width+'.png'});
  const hp=await page.evaluate(()=>testGame.state.player.hp);await page.evaluate(()=>{const g=testGame,e=g.state.enemies.find(e=>e.type==='bootstomp'),s=g.api.bootstompSnapshot(e),p=g.state.player,x=(s.target.x+p.x)/2,y=(s.target.y+p.y)/2,dx=p.x-s.target.x,dy=p.y-s.target.y,d=Math.hypot(dx,dy)||1;g.api.createWall([{x:x-dy/d*105,y:y+dx/d*105},{x:x+dy/d*105,y:y-dx/d*105}]);});await tick(5);assert.equal(hp-await page.evaluate(()=>testGame.state.player.hp),7,'wall mitigates real ripple once');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+'px real '+(touch?'two-finger touch':'mouse')+' hold, trip, three rubs, persistent faint boot ghost, rendered frames and ripple wall mitigation.');await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
