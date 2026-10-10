// Optional browser regression for enemy personality motion and canvas rendering.
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
  const result=await page.evaluate(()=>{
   const g=testGame;g.state.wave=5;g.state.enemies=[];g.state.spawnTimer=9999;
   const e=g.api.spawnEnemy(false,g.state.W*.3,g.state.H*.35,'boss');e.waveBoss=true;const b=g.api.bossBrain(e);g.api.updateEnemyAnimations(0);
   let drawn=null;const drawImage=g.dom.ctx.drawImage.bind(g.dom.ctx);g.dom.ctx.drawImage=(image,...args)=>{if(image.width===160&&image.height<160)drawn=image;return drawImage(image,...args)};
   const sequences={},pixels={};const capture=name=>{const state=JSON.stringify(g.state);g.api.draw();if(state!==JSON.stringify(g.state))throw Error('Drawing mutated combat');sequences[name]=g.api.enemySpriteFrame(e);pixels[name]=drawn.toDataURL();};
   for(let i=0;i<4;i++){e.x+=e.r*.51;g.api.updateEnemyAnimations(.05);capture('walk'+i);}
   b.cast={kind:'mirror-orb',x:g.state.player.x,y:g.state.player.y,duration:.95,left:.95};
   for(let i=0;i<4;i++){b.cast.left=.95*(1-(i+.05)/4);g.api.updateEnemyAnimations(.01);capture('charge'+i);}
   b.cast.left=0;g.api.updateBossEncounter(e,.01);
   for(let i=0;i<4;i++){b.action.age=i*.12;g.api.updateEnemyAnimations(.01);capture('throw'+i);}
   const shot=g.state.enemyShots[0];shot.reflected=true;shot.x=e.x;shot.y=e.y;g.api.updateFirstBossShot(shot,.01);g.api.updateEnemyAnimations(0);capture('recoil0');
   for(let i=1;i<4;i++){g.api.updateEnemyAnimations(.313);capture('recoil'+i);}
   e.freeze=1;const frozen=g.api.enemySpriteFrame(e);g.api.updateEnemyAnimations(.2);const stillFrozen=g.api.enemySpriteFrame(e);e.freeze=0;
   b.cast=null;b.action=null;g.api.animateEnemyAction(e,'king-return');g.api.updateEnemyAnimations(0);capture('preview');
   const rgba=drawn.getContext('2d').getImageData(0,0,drawn.width,drawn.height).data;let visible=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>0)visible++;
   return {sequences,distinct:Object.fromEntries(['walk','charge','throw','recoil'].map(n=>[n,new Set([0,1,2,3].map(i=>pixels[n+i])).size])),frozen,stillFrozen,visible};
  });
  for(const group of ['walk','charge','throw','recoil'])assert.equal(result.distinct[group],4,group+' has four distinct rendered art frames');assert.equal(result.frozen,result.stillFrozen);assert(result.visible>1000,'real transparent sprite artwork rendered');
  await page.screenshot({path:'/tmp/king-doodle-animations-'+viewport.width+'.png'});assert.deepEqual(errors,[]);
  console.log('PASS: four real King sequences, actual cast and returned shot, freeze, canvas purity and visible sprites at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
