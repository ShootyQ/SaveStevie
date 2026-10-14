/* Native desktop preferences; web/Android keep their existing presentation. */
DoodleDefender.systems.desktopDisplay=function(game){
 const bridge=window.stevieDesktop;
 let preferences={mode:'windowed',resolution:'1280x720',uiScale:1,renderScale:1,frameLimit:60},lastDraw=-Infinity,busy=false;
 function renderDesktopDisplay(snapshot){
  const section=game.dom.$('desktopDisplaySection');section.hidden=!bridge;if(!bridge)return;
  if(snapshot?.preferences)preferences={...snapshot.preferences};
  for(const [key,id] of [['mode','desktopWindowMode'],['resolution','desktopResolution'],['uiScale','desktopUiScale'],['renderScale','desktopRenderScale'],['frameLimit','desktopFrameLimit']])game.dom.$(id).value=String(preferences[key]);
  game.dom.$('desktopResolution').disabled=preferences.mode==='fullscreen';
  const size=snapshot?.windowSize,screen=snapshot?.screenSize;
  game.dom.$('desktopDisplayStatus').textContent=(preferences.mode==='fullscreen'&&screen?'Fullscreen · '+screen.width+' × '+screen.height:size?'Window · '+size.width+' × '+size.height:'Choose your display settings.')+(snapshot?.saved===false?' Changes work for this visit; settings could not be saved.':'');
 }
 async function applyDesktopDisplay(reset=false){
  if(!bridge||busy)return;busy=true;game.dom.$('desktopApplyDisplay').disabled=true;
  try{
   const input=reset?{mode:'windowed',resolution:'1280x720',uiScale:1,renderScale:1,frameLimit:60}:{mode:game.dom.$('desktopWindowMode').value,resolution:game.dom.$('desktopResolution').value,uiScale:Number(game.dom.$('desktopUiScale').value),renderScale:Number(game.dom.$('desktopRenderScale').value),frameLimit:Number(game.dom.$('desktopFrameLimit').value)};
   const snapshot=await bridge.applyDisplay(input);renderDesktopDisplay(snapshot);lastDraw=-Infinity;game.api.resize?.();
  }catch{game.dom.$('desktopDisplayStatus').textContent='Could not apply display settings. Please try again.';}
  finally{busy=false;game.dom.$('desktopApplyDisplay').disabled=false;}
 }
 function desktopRenderScale(){return bridge?preferences.renderScale:1;}
 function shouldDrawDesktopFrame(time){
  if(!bridge||!preferences.frameLimit)return true;const interval=1000/preferences.frameLimit;
  if(time-lastDraw<interval-.01)return false;lastDraw=Number.isFinite(lastDraw)?Math.max(lastDraw+interval,time-((time-lastDraw)%interval)):time;return true;
 }
 const api={renderDesktopDisplay,applyDesktopDisplay,desktopRenderScale,shouldDrawDesktopFrame};Object.assign(game.api,api);
 game.dom.$('desktopApplyDisplay').onclick=()=>applyDesktopDisplay();game.dom.$('desktopResetDisplay').onclick=()=>applyDesktopDisplay(true);
 game.dom.$('desktopWindowMode').onchange=()=>{game.dom.$('desktopResolution').disabled=game.dom.$('desktopWindowMode').value==='fullscreen';};
 renderDesktopDisplay();if(bridge){bridge.getDisplay().then(snapshot=>{renderDesktopDisplay(snapshot);game.api.resize?.();}).catch(()=>{game.dom.$('desktopDisplayStatus').textContent='Desktop settings are temporarily unavailable.';});bridge.onDisplayChanged(snapshot=>{renderDesktopDisplay(snapshot);game.api.resize?.();});}
 return api;
};
