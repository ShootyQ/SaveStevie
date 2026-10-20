const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1100,height:820},{width:393,height:851}]){
   const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('http://stevie.test/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1);
    try{return route.fulfill({body:fs.readFileSync(path.join(root,name)),contentType:({'.js':'text/javascript','.json':'application/json','.png':'image/png','.html':'text/html'})[path.extname(name)]||'text/plain'});}
    catch{return route.fulfill({status:404,body:'Missing asset'});}
   });
   await page.goto('http://stevie.test/docs/bootstomp-preview.html',{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>window.bootstompPreview,null,{timeout:120000});
   const result=await page.evaluate(()=>{
    const p=bootstompPreview,a=p.atlas;const initial=p.snapshot();
    for(const [name,c] of Object.entries(a.clips)){
     p.select('clip:'+name);if(p.snapshot().frame!==c.frames[0])throw Error('Wrong starting frame: '+name);
     const total=c.durations.reduce((x,y)=>x+y,0);p.seek(total-.0001);
     if(p.snapshot().frame!==c.frames.at(-1))throw Error('Wrong ending frame: '+name);
    }
    p.select('scene:Left stomp — countered');p.seek(3.2);if(!p.snapshot().flipX)throw Error('Left stumble lost its direction');
    p.seek(3.7);if(!p.snapshot().flipX)throw Error('Left fall reverses direction');
    p.select('scene:Lace — caught');p.seek(.869);if(p.snapshot().event==='lace_twang')throw Error('Countered lace throws passenger');
    p.select('scene:Defeat');p.seek(3);if(p.snapshot().frame!=='reaction:15')throw Error('Defeat stands back up');
    p.select('clip:erase_left_boot');p.seek(1.8);
    return {paused:initial.paused,clips:Object.keys(a.clips).length,width:document.documentElement.scrollWidth};
   });
   assert(result.paused,'reduced motion starts paused');assert(result.clips>=25);assert(result.width<=viewport.width,'phone preview does not overflow');
   await page.screenshot({path:'/tmp/bootstomp-erasure-'+viewport.width+'.png',fullPage:true});
   await page.selectOption('#clip','scene:Right stomp — countered');await page.locator('#scrub').fill('580');
   await page.screenshot({path:'/tmp/bootstomp-fallen-'+viewport.width+'.png',fullPage:true});
   await page.click('#play');assert.equal(await page.locator('#play').innerText(),'Pause');await page.click('#play');assert.deepEqual(errors,[]);
   console.log('PASS: '+viewport.width+'px '+result.clips+' complete clips, left/right continuity, counter timing, erasure references, defeat, controls and reduced motion.');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
