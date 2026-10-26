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
    let resizes=0,largeResizes=0;const width=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width');Object.defineProperty(HTMLCanvasElement.prototype,'width',{...width,set(v){resizes++;if(v>=300&&this.height>=300)largeResizes++;width.set.call(this,v);}});
    const drop=(i)=>a.dropPlaguefire({x:45+(i*73)%(s.W-90),y:120+(i*97)%(s.H-180),burn:2,poison:2});
    function scene(scars,active){a.resetPlaguefire();for(let i=0;i<scars;i+=12){for(let j=0;j<Math.min(12,scars-i);j++)drop(i+j);a.updatePlaguefire(10);}if(active)for(let i=0;i<12;i++){drop(200+i);a.updatePlaguefire(.07);}}
    function measure(advance){for(let i=0;i<20;i++){if(advance)a.updatePlaguefire(1/60);a.drawPlaguefire();}resizes=largeResizes=0;const times=[];for(let i=0;i<120;i++){const start=performance.now();if(advance)a.updatePlaguefire(1/60);g.dom.ctx.clearRect(0,0,s.W,s.H);a.drawPlaguefire();g.dom.ctx.getImageData(0,0,1,1);times.push(performance.now()-start);}times.sort((x,y)=>x-y);return {mean:times.reduce((x,y)=>x+y,0)/times.length,p95:times[Math.floor(times.length*.95)],canvasResizes:resizes,largeResizes};}
    const result={};for(const [name,scars,active] of [['empty',0,false],['deskOnly',120,false],['fireOnly',0,true],['mixed',120,true]]){scene(scars,active);result[name]=measure(true);if(active)result[name+'Frozen']=measure(false);}return result;
   });
   assert.deepEqual(errors,[]);if(!old)assert.equal(result.mixed.largeResizes,0,'growth never resizes the full desk canvas');results.push({variant:old?'before':'after',...result});await page.close();
  }
  console.log(JSON.stringify({viewport:viewport.width,frameMilliseconds:results}));
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
