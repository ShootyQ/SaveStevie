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
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#startBtn');
  const counts=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun({skipIntro:true});g.state.enemies=[];g.state.particles=[];g.state.floaters=[];
   const keys=Object.keys(g.state.inks),ctx=g.dom.ctx,drawImage=ctx.drawImage.bind(ctx);let glyphs=0;
   ctx.drawImage=(...args)=>{if(args.length===5&&args[3]===40&&args[4]===40)glyphs++;return drawImage(...args)};
   const counts=[];
   for(const length of [100,400,2000]){
    keys.forEach(k=>g.state.inks[k]=0);g.state.walls=[{pts:[{x:30,y:250},{x:30+length,y:250}],thick:8,hp:100,maxHp:100,life:50,maxLife:50}];glyphs=0;g.api.draw();const baseline=glyphs;
    for(const k of ['fire','frost','electric','blast'])g.state.inks[k]=2;
    glyphs=0;g.api.draw();counts.push(glyphs-baseline);
   }
   keys.forEach(k=>g.state.inks[k]=2);glyphs=0;g.api.draw();counts.push(glyphs);
   ctx.drawImage=drawImage;g.state.walls=[];
   g.state.stats.doubleLine=g.state.stats.tripleLine=true;g.api.createWall([{x:20,y:200},{x:100,y:200}]);if(g.state.walls.length!==1)throw Error('legacy flags create copies');
   for(let j=0;j<4;j++){
    const r=Math.min(g.state.W*.4,180)+j*14,pts=Array.from({length:81},(_,i)=>({x:g.state.W/2+Math.cos(i/80*Math.PI*2)*r,y:g.state.H/2+Math.sin(i/80*Math.PI*2)*r}));
    g.state.walls.push({pts,thick:8,hp:100,maxHp:100,life:50,maxLife:50,closed:true});
   }
   for(const k of keys)g.state.inks[k]=['fire','frost','electric','blast'].includes(k)?2:0;
   g.api.draw();return counts;
  });
  assert.deepEqual(counts.slice(0,3),[4,8,12]);assert(counts[3]<=18,'all inks obey total glyph budget');assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/wall-clarity-'+viewport.width+'.png'});console.log('PASS:',viewport.width,'wall glyph counts',counts,'and single-wall legacy flags');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
