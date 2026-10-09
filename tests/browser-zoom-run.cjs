const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});
   await page.click('#splashOptionsBtn');await page.click('#testLabBtn');assert.ok(!(await page.locator('#testUpgrade option').allTextContents()).some(n=>['Permanent Marker','Archival Ink'].includes(n)));await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.click('#startBtn');
   const result=await page.evaluate(()=>{
    const g=testGame;g.state.spawnTimer=999;const e=g.api.spawnEnemy(false,90,140,'fast');e.hp=e.maxHp=1000;g.state.enemies=[e];g.api.updateEnemyAnimations(0);
    const names=[],pixels=[],bodies=[];const random=Math.random;Math.random=()=>{throw Error('run art consumes no combat RNG')};
    try{
     for(const direction of [1,-1])for(let i=0;i<4;i++){
      e.x+=6*direction;g.api.updateEnemyAnimations(.1);names.push(g.api.enemySpriteFrame(e));const state=JSON.stringify(g.state);g.api.draw();if(state!==JSON.stringify(g.state))throw Error('draw mutated state');pixels.push(g.dom.canvas.toDataURL());
     }
     const frozen=g.api.enemySpriteFrame(e);e.freeze=1;g.api.updateEnemyAnimations(.3);if(g.api.enemySpriteFrame(e)!==frozen)throw Error('freeze advances feet');e.freeze=0;e.stun=1;g.api.updateEnemyAnimations(.3);if(g.api.enemySpriteFrame(e)!==frozen)throw Error('stun advances feet');e.stun=0;
     for(const status of ['none','burn','poison','freeze','electricFlash','blastFlash','voidFlash']){
      for(const key of ['burn','poison','freeze','electricFlash','blastFlash','voidFlash'])e[key]=key===status?2:0;
      for(const direction of [1,-1])for(let i=0;i<4;i++){
       e.x+=6*direction;g.api.updateEnemyAnimations(.1);g.api.draw();const dpr=g.state.dpr,data=g.dom.ctx.getImageData(Math.round((e.x-22)*dpr),Math.round((e.y-25)*dpr),Math.round(44*dpr),Math.round(45*dpr)).data;let ink=0;
       for(let p=0;p<data.length;p+=4)if(Math.max(data[p],data[p+1],data[p+2])-Math.min(data[p],data[p+1],data[p+2])>65)ink++;bodies.push(ink);
      }
     }
    }finally{Math.random=random}
    for(const key of ['burn','poison','freeze','electricFlash','blastFlash','voidFlash'])e[key]=0;
    window.zoomFixture=e;g.api.draw();return {names,pixels,bodies,cache:g.api.rendererCacheStats()};
   });assert.equal(new Set(result.names).size,8);assert.equal(new Set(result.pixels).size,8);assert.ok(result.bodies.every(n=>n>10),'all directional/status frames retain visible colored pixels');assert.ok(result.cache.tintEntries<=result.cache.tintLimits.entries);
   await page.screenshot({path:'/tmp/zoom-run-'+viewport.width+'.png'});
   const paused=await page.evaluate(()=>{const g=testGame;g.state.paused=true;const frame=g.api.enemySpriteFrame(zoomFixture);g.api.update(.5);return frame===g.api.enemySpriteFrame(zoomFixture)});assert.ok(paused);
   await page.emulateMedia({reducedMotion:'reduce'});const still=await page.evaluate(()=>{const g=testGame,e=zoomFixture;g.state.paused=false;const frames=[];for(let i=0;i<4;i++){e.x+=6;g.api.updateEnemyAnimations(.1);frames.push(g.api.enemySpriteFrame(e));g.api.draw()}return frames});assert.equal(new Set(still).size,1);
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' retired test choices, eight directional run sprites, distinct rendered frames, visible status tints, bounded cache, no RNG/state mutation, pause/freeze/stun and reduced motion.');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
