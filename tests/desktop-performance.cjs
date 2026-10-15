const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
(async()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};let receive;
 const preferences={mode:'windowed',resolution:'1280x720',uiScale:1,renderScale:.5,frameLimit:30};
 const bridge={getDisplay:async()=>({preferences}),onDisplayChanged:fn=>{receive=fn;}};
 const game={dom:{$:node},api:{resize(){}}},sandbox={DoodleDefender:{systems:{}},window:{stevieDesktop:bridge},console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('js/desktop-display.js','utf8'),sandbox);sandbox.DoodleDefender.systems.desktopDisplay(game);await new Promise(resolve=>setImmediate(resolve));assert.equal(game.api.desktopRenderScale(),.5);
 let renders=0;for(let i=0;i<144;i++)if(game.api.shouldDrawDesktopFrame(i*1000/144))renders++;assert(renders>=29&&renders<=31,'30 FPS at 144Hz without changing update cadence');receive({preferences:{...preferences,frameLimit:0}});assert(game.api.shouldDrawDesktopFrame(1001));assert(game.api.shouldDrawDesktopFrame(1002));
 sandbox.window.stevieDesktop=undefined;const web={dom:{$:node},api:{}};sandbox.DoodleDefender.systems.desktopDisplay(web);assert.equal(web.api.desktopRenderScale(),1);assert(web.api.shouldDrawDesktopFrame(1));assert(web.api.shouldDrawDesktopFrame(2));assert.equal(node('desktopDisplaySection').hidden,true);
 console.log('PASS: desktop pixel scaling, bounded render cadence at high refresh, uncapped mode and unchanged web/Android defaults.');
})().catch(e=>{console.error(e);process.exitCode=1});
