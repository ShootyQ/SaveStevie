// Single sweeping laser, fading scorch and world-anchored detached parts.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500}),errors=[],touch=viewport.width<500?await page.context().newCDPSession(page):null;page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.wav')?'audio/wav':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');
  await page.evaluate(()=>{const g=testGame;g.api.startTestRun({wave:10,phase:'boss',toolRank:0,notebook:false,upgrades:[]});g.state.player.hp=10000;g.state.stats.ink=1000;const e=g.state.enemies[0],s=g.api.bossBrain(e).wobble;s.gap=0;s.turn=3;const p=g.state.player;for(let i=0;i<6;i++)g.api.createWall([{x:30+i*(g.state.W-80)/6,y:p.y-75},{x:50+i*(g.state.W-80)/6,y:p.y-75}]);g.api.updateWobbleBoss(e,.55);g.api.draw()});
  await page.waitForFunction(()=>testGame.api.wobbleArtworkReady(),null,{polling:50});
  const beam=await page.evaluate(()=>{const g=testGame,e=g.state.enemies[0],ctx=g.dom.ctx,stroke=ctx.stroke;let lasers=0;ctx.stroke=function(...args){if(this.strokeStyle==='#28796d'&&this.lineWidth===5)lasers++;return stroke.apply(this,args)};const before=JSON.stringify(g.api.wobbleSnapshot(e));try{g.api.drawWobbleFields()}finally{ctx.stroke=stroke}return {lasers,pure:before===JSON.stringify(g.api.wobbleSnapshot(e)),scorches:g.api.wobbleSnapshot(e).scorches.length}});
  assert.equal(beam.lasers,1);assert(beam.scorches>0);assert(beam.pure);await page.evaluate(()=>testGame.api.draw());await page.screenshot({path:'/tmp/wobble-single-laser-'+viewport.width+'.png'});
  const fixed=await page.evaluate(()=>{const g=testGame,e=g.state.enemies[0],s=g.api.bossBrain(e).wobble;g.state.walls=[];s.model=DoodleDefender.WobblechompRig.create();s.model.time=1;s.attack=null;s.gap=0;s.turn=0;g.api.updateWobbleBoss(e,.001);
   for(let i=0;i<2;i++){if(i){s.gap=0;s.turn=0;g.api.updateWobbleBoss(e,.001)}const j=g.api.wobbleSnapshot(e).parts.arm.joint,dx=j.b.x-j.a.x,dy=j.b.y-j.a.y,d=Math.hypot(dx,dy),x=(j.a.x+j.b.x)/2,y=(j.a.y+j.b.y)/2;g.api.createWall([{x:x-dy/d*24,y:y+dx/d*24},{x:x+dy/d*24,y:y-dx/d*24}])}
   s.gap=999;g.api.updateWobbleBoss(e,3);const d=s.debris[0],anchor={x:d.x,y:d.y};e.x+=20;s.facing*=-1;g.api.updateWobbleBoss(e,.3);g.api.draw();return {settled:d.settled,fixed:d.x===anchor.x&&d.y===anchor.y}});assert(fixed.settled&&fixed.fixed);await page.screenshot({path:'/tmp/wobble-fallen-arm-'+viewport.width+'.png'});
  await page.click('#pauseBtn');const paused=await page.evaluate(()=>JSON.stringify(testGame.api.wobbleSnapshot(testGame.state.enemies[0])));await page.evaluate(()=>testGame.api.update(1));assert.equal(await page.evaluate(()=>JSON.stringify(testGame.api.wobbleSnapshot(testGame.state.enemies[0]))),paused);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' single laser, scorches, pure drawing, detached arm anchoring and pause');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
