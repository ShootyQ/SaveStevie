const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes')});
  await page.route('http://stevie.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html'});
  });
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});
  const result=await page.evaluate(()=>{
   const g=testGame,a=g.api,s=g.state;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.setSynergyRevealsEnabled(false);a.setWaveFinaleEnabled(false);a.resetRun({skipIntro:true});s.enemies=[];s.walls=[];s.timeLeft=300;s.spawnTimer=999;s.stats.rockRate=0;s.synergies=new Set(['Plaguefire']);s.inks.fire=s.inks.poison=1;
   const x=s.W*.25,y=s.H*.35;a.dropPlaguefire({x,y,burn:1,poison:1});a.updatePlaguefire(11);const e=a.spawnEnemy(false,x,y,'grunt');e.hp=e.maxHp=1000;const random=Math.random;Math.random=()=>0;
   a.update(.016);const entered=!!e.paperTunnel,visibleAtEntry=!a.underPaper(e),noEraserHoles=s.paper.holes.length===0;let hiddenOnPaper=false,hiddenOnDesk=false;
   for(let i=0;i<400;i++){a.update(.016);if(a.underPaper(e)){hiddenOnPaper=true;if(a.plaguefirePaperMissing(e))hiddenOnDesk=true;}if(hiddenOnPaper)break;}
   Math.random=random;
   // A broad damaged page, with overlapping burns and ordinary threats for readability.
   s.enemies=[];a.resetPlaguefire();for(let b=0;b<7;b++){for(let i=0;i<12;i++){const j=b*12+i;a.dropPlaguefire({x:38+(j*73)%(s.W-76),y:115+(j*97)%(s.H-170),burn:1,poison:1});}a.updatePlaguefire(10);}
   for(let i=0;i<12;i++){a.dropPlaguefire({x:40+(i*89)%(s.W-80),y:120+(i*71)%(s.H-180),burn:1,poison:1});}a.updatePlaguefire(6);
   for(let i=0;i<12;i++)a.spawnEnemy(false,30+(i*79)%(s.W-60),120+(i*109)%(s.H-180),'grunt');s.stats.ink=2000;a.createWall([{x:s.W*.2,y:s.H*.45},{x:s.W*.4,y:s.H*.5}]);a.updateEnemyAnimations(.016);a.draw();
   const before=JSON.stringify(a.plaguefireSnapshot()),state=JSON.stringify(s),r=Math.random;Math.random=()=>{throw Error('render RNG')};a.drawPlaguefire();Math.random=r;
   const pure=state===JSON.stringify(s)&&before===JSON.stringify(a.plaguefireSnapshot());a.draw();return {entered,visibleAtEntry,noEraserHoles,hiddenOnPaper,hiddenOnDesk,pure};
  });
  assert(result.entered&&result.visibleAtEntry&&result.noEraserHoles&&result.hiddenOnPaper&&!result.hiddenOnDesk&&result.pure,JSON.stringify(result));
  await page.screenshot({path:'/tmp/plaguefire-readable-desk-'+viewport.width+'.png'});assert.deepEqual(errors,[]);console.log('PASS: full-loop burn entrance, visible desk crossing, intact-paper hiding, pure cached animation and crowded readable desk at',viewport.width);await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
