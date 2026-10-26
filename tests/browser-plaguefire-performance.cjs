// Crowded-wave drawing comparison; optional second argument supplies the old module.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),baseline=process.argv[2];
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const results=[];
  for(const old of baseline?[true,false]:[false]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return original.call(this,type,type==='2d'?{...options,willReadFrequently:true}:options);};requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMusicMuted','yes');});
   await page.route('http://127.0.0.1:8014/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(old&&name==='js/plaguefire.js'?baseline:path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.mp3':'audio/mpeg'})[path.extname(name)]||'text/html'});});
   await page.goto('http://127.0.0.1:8014/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.testGame?.api.artworkStatus().ready,null,{polling:100,timeout:30000});
   const result=await page.evaluate(()=>{
    const g=testGame,a=g.api,s=g.state;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.setSynergyRevealsEnabled(false);a.setWaveFinaleEnabled(false);a.resetRun();s.enemies=[];s.walls=[];s.synergies=new Set(['Plaguefire']);s.inks.fire=s.inks.poison=3;
    const drop=(x,y)=>a.dropPlaguefire({x,y,burn:2,poison:2});
    for(let batch=0;batch<2;batch++){for(let i=0;i<12;i++){const angle=i*Math.PI/6;drop(s.player.x+Math.cos(angle)*(65+batch*12),s.player.y+Math.sin(angle)*(65+batch*12));}a.updatePlaguefire(10);}
    for(let i=0;i<12;i++){const angle=i*Math.PI/6;drop(s.player.x+Math.cos(angle)*115,s.player.y+Math.sin(angle)*115);}a.updatePlaguefire(7);
    for(let i=0;i<80;i++){const angle=i*2.4,r=95+i%5*16,e=a.spawnEnemy(false,s.player.x+Math.cos(angle)*r,s.player.y+Math.sin(angle)*r,['grunt','fast','sniper','bouncer'][i%4]);if(!e)break;e.hp=e.maxHp=100000;}
    for(let i=0;i<12;i++){const angle=i*Math.PI/6,x=s.player.x+Math.cos(angle)*90,y=s.player.y+Math.sin(angle)*90;s.walls.push({pts:[{x:x-20,y:y-10},{x:x+20,y:y+10}],hp:100,maxHp:100,life:100,maxLife:100,thick:5});}
    const snap=a.plaguefireSnapshot();
    function measure(draw=()=>a.draw()){for(let i=0;i<10;i++)draw();const samples=[];for(let pass=0;pass<3;pass++){const start=performance.now();for(let i=0;i<20;i++){draw();g.dom.ctx.getImageData(0,0,1,1);}samples.push((performance.now()-start)/20);}return samples.sort((a,b)=>a-b)[1];}
    const withFields=measure(),plaguefireOnly=measure(()=>{g.dom.ctx.clearRect(0,0,s.W,s.H);a.drawPlaguefire();});a.resetPlaguefire();const withoutFields=measure();
    return{withFields,withoutFields,plaguefireOnly,scars:snap.scars.length,patches:snap.patches.length};
   });
   // Separate visual scene with the same scars and patches, after measuring.
   await page.evaluate(()=>{const g=testGame,a=g.api,s=g.state;s.enemies=[];s.walls=[];const drop=(x,y)=>a.dropPlaguefire({x,y,burn:2,poison:2});for(let b=0;b<2;b++){for(let i=0;i<12;i++){const t=i*Math.PI/6;drop(s.player.x+Math.cos(t)*(65+b*12),s.player.y+Math.sin(t)*(65+b*12));}a.updatePlaguefire(10);}for(let i=0;i<12;i++){const t=i*Math.PI/6;drop(s.player.x+Math.cos(t)*115,s.player.y+Math.sin(t)*115);}a.updatePlaguefire(7);for(let i=0;i<12;i++){const t=i*Math.PI/6,x=s.player.x+Math.cos(t)*80,y=s.player.y+Math.sin(t)*80;a.spawnEnemy(false,x,y,'grunt');s.walls.push({pts:[{x:x-16,y:y-6},{x:x+16,y:y+6}],hp:100,maxHp:100,life:100,maxLife:100,thick:5});}a.draw();});
   assert.equal(result.scars,24);assert.equal(result.patches,12);assert.deepEqual(errors,[]);
   await page.screenshot({path:'/tmp/plaguefire-'+(old?'before':'after')+'-'+viewport.width+'.png'});results.push({variant:old?'before':'after',...result});await page.close();
  }
  console.log(JSON.stringify({viewport:viewport.width,drawMilliseconds:results}));
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
