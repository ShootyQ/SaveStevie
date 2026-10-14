const sizes=['800x600','1024x768','1280x720','1280x900','1600x900','1920x1080','2560x1440'];
const defaults={mode:'windowed',resolution:'1280x720',uiScale:1,renderScale:1,frameLimit:60};
function normalizeDisplay(input={},fallback=defaults){
 const out={...fallback};if(!input||typeof input!=='object')return out;
 if(['windowed','fullscreen'].includes(input.mode))out.mode=input.mode;
 if(sizes.includes(input.resolution))out.resolution=input.resolution;
 for(const [key,allowed] of [['uiScale',[.85,1,1.15,1.3]],['renderScale',[.5,.75,1]],['frameLimit',[30,60,120,0]]])if(allowed.includes(input[key]))out[key]=input[key];return out;
}
module.exports={sizes,defaults,normalizeDisplay};
