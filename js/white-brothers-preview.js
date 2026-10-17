/* Isolated two-monster animation studio. No encounter or save mutations. */
DoodleDefender.systems.whiteBrothersPreview=function(game){
 const $=game.dom.$,rig=DoodleDefender.WhiteBrothersRig,canvas=$('brothersCanvas'),ctx=canvas.getContext('2d'),media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const names={idle:'Scheming idle',walk:'Clawed walk',intro:'Make an entrance',attack:'Brush sweep / glue squeeze',throw:'Fling the mess',hit:'Ouch!',dizzy:'Dizzy brothers',tantrum:'Absolutely furious',defeat:'Deflated defeat'},sequence=['intro','walk','idle','attack','throw','hit','dizzy','tantrum','defeat'];
 let models=[rig.create('wite'),rig.create('glue')],image=null,ready=false,loading=false,opened=false,paused=false,showcase=true,index=0,frame=null,last=null,view=null;
 const reduced=()=>!!media?.matches||!!$('brothersReduced').checked;
 function selected(){return models.filter(m=>$('brothersCharacter').value==='both'||m.kind===$('brothersCharacter').value);}
 function sync(){
  $('brothersPauseBtn').textContent=paused?'Resume':'Pause';$('brothersPauseBtn').setAttribute?.('aria-pressed',String(paused));$('brothersShowcaseBtn').textContent=showcase?'Stop showcase':'Play showcase';$('brothersShowcaseBtn').setAttribute?.('aria-pressed',String(showcase));
  $('brothersStatus').textContent=(!ready?'Loading monster artwork… ':showcase?'Showcase · ':'')+models.map(m=>(m.kind==='wite'?'Mr. Out: ':'Mr. Glue: ')+names[m.action]).join(' · ');
 }
 function render(){
  if(!opened||!view)return;const {width,height,dpr,scale,x,y}=view;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.fillStyle='#f7f1e4';ctx.fillRect(0,0,1000,530);ctx.strokeStyle='#abc2d34d';ctx.lineWidth=1;for(let y=22;y<530;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke();}
  ctx.strokeStyle='#c97e7666';ctx.beginPath();ctx.moveTo(40,0);ctx.lineTo(40,530);ctx.stroke();
  ctx.textAlign='center';ctx.font='34px "Stevie Pencil",cursive';ctx.fillStyle='#315d8c';ctx.fillText('Mr. Out',270,62);ctx.fillText('Mr. Glue',730,62);
  models.forEach((m,i)=>{const x=i?730:270;ctx.fillStyle='#6e635b22';ctx.beginPath();ctx.ellipse(x,426,82,12,0,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(x,302);rig.draw(ctx,ready?image:null,m,{reduced:reduced()});ctx.restore();ctx.fillStyle='#685644';ctx.font='20px "Stevie Pencil",cursive';ctx.fillText(names[m.action],x,482);});
  ctx.restore();
 }
 function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(2,window.devicePixelRatio||1),scale=Math.min(r.width/1000,r.height/530);view={width:r.width,height:r.height,dpr,scale,x:(r.width-1000*scale)/2,y:(r.height-530*scale)/2};canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);render();}
 function load(){if(ready||loading)return;loading=true;image=new Image();image.onload=()=>{loading=false;ready=true;sync();render();};image.onerror=()=>{loading=false;$('brothersStatus').textContent='Artwork could not load. Close and reopen to retry.';};const version=document.documentElement?.dataset?.build;image.src='assets/art/white-brothers-torsos.png'+(version?'?v='+encodeURIComponent(version):'');}
 function advance(dt){
  if(!opened||paused||document.hidden||game.api.windowFocusBlocked?.())return;
  dt=Math.min(.05,Math.max(0,dt))*Number($('brothersSpeed').value||1);for(const m of models)rig.update(m,dt);
  if(showcase&&models.every(m=>m.age>=rig.durations[m.action])){index=(index+1)%sequence.length;for(const m of models)rig.act(m,sequence[index]);}
  else if(!showcase&&$('brothersLoop').checked)for(const m of selected())if(m.age>=rig.durations[m.action])rig.act(m,m.action);
  sync();render();
 }
 function tick(now){frame=null;if(!opened)return;advance(last===null?0:(now-last)/1000);last=now;frame=requestAnimationFrame(tick);}
 function start(){opened=true;paused=false;showcase=true;index=0;models=[rig.create('wite'),rig.create('glue')];for(const m of models)rig.act(m,'intro');last=null;load();resize();sync();if(frame===null)frame=requestAnimationFrame(tick);}
 function stop(){opened=false;if(frame!==null)window.cancelAnimationFrame?.(frame);frame=null;last=null;}
 function action(name){if(!Object.hasOwn(names,name))return false;showcase=false;for(const m of selected())rig.act(m,name);sync();render();return true;}
 $('openWhiteBrothersBtn').onclick=()=>game.api.openInfo('whiteBrothers');$('closeWhiteBrothersBtn').onclick=()=>game.api.closeInfo();
 for(const name of Object.keys(names))$('brothers-'+name).onclick=()=>action(name);
 $('brothersPauseBtn').onclick=()=>{paused=!paused;last=null;sync();};$('brothersShowcaseBtn').onclick=()=>{showcase=!showcase;index=0;if(showcase)for(const m of models)rig.act(m,sequence[0]);sync();};
 $('brothersResetBtn').onclick=()=>{models=[rig.create('wite'),rig.create('glue')];showcase=false;paused=false;last=null;sync();render();};
 for(const id of ['brothersCharacter','brothersSpeed','brothersReduced','brothersLoop'])$(id).onchange=()=>{last=null;render();};
 window.addEventListener('resize',()=>{if(opened)resize();});window.addEventListener('blur',()=>{if(opened){paused=true;last=null;sync();}});document.addEventListener?.('visibilitychange',()=>{last=null;if(opened&&document.hidden){paused=true;sync();}});media?.addEventListener?.('change',render);
 const api={startWhiteBrothersPreview:start,stopWhiteBrothersPreview:stop,advanceWhiteBrothersPreview:advance,whiteBrothersAction:action,whiteBrothersSnapshot:()=>({opened,paused,ready,showcase,reduced:reduced(),models:models.map(m=>({...m})),view:view?{...view}:null})};Object.assign(game.api,api);return api;
};
