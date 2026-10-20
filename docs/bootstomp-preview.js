/* Authoring preview only. Not loaded by the game. */
(async()=>{
 const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const response=await fetch('../assets/art/bootstomp/animations.json');if(!response.ok)throw Error('Animation catalogue unavailable');
 const atlas=await response.json(),images={};
 await Promise.all(Object.entries(atlas.pages).map(async([key,page])=>{const image=new Image();image.src='../assets/art/bootstomp/'+page.image;await image.decode();images[key]=image;}));
 const selector=$('clip'),scenes=document.createElement('optgroup'),actions=document.createElement('optgroup');scenes.label='Connected sequences';actions.label='Individual clips / erase states';
 for(const key of Object.keys(atlas.scenes)){const option=document.createElement('option');option.value='scene:'+key;option.textContent=key;scenes.appendChild(option);}
 for(const key of Object.keys(atlas.clips)){const option=document.createElement('option');option.value='clip:'+key;option.textContent=key.replaceAll('_',' ');actions.appendChild(option);}
 selector.append(scenes,actions);selector.value='scene:Right stomp — countered';
 let time=0,last=null,paused=reduced.matches,snapshot=null;
 const duration=clip=>clip.durations.reduce((a,b)=>a+b,0);
 function playlist(){const value=selector.value;return value.startsWith('scene:')?atlas.scenes[value.slice(6)]:[[value.slice(5),duration(atlas.clips[value.slice(5)])+.65]];}
 function length(){return playlist().reduce((sum,[,seconds])=>sum+seconds,0);}
 function phase(){let t=Math.min(time,length()-.000001);for(const [name,seconds] of playlist()){if(t<seconds)return {name,t};t-=seconds;}return {name:'idle',t:0};}
 function frameAt(clip,t){const total=duration(clip);let cursor=clip.loop?t%total:Math.min(t,total-.000001);for(let i=0;i<clip.frames.length;i++){if(cursor<clip.durations[i])return i;cursor-=clip.durations[i];}return clip.frames.length-1;}
 function paper(){ctx.fillStyle='#f7f1e2';ctx.fillRect(0,0,720,460);ctx.strokeStyle='#b3cad377';ctx.lineWidth=1;for(let y=24;y<460;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(720,y);ctx.stroke();}ctx.strokeStyle='#c8797977';ctx.beginPath();ctx.moveTo(55,0);ctx.lineTo(55,460);ctx.stroke();}
 function footprint(x,prepared){ctx.save();ctx.translate(x,354);ctx.scale(1,.42);ctx.strokeStyle=prepared?'#577c85':'#8a8373';ctx.lineWidth=2;ctx.setLineDash(prepared?[]:[5,4]);ctx.beginPath();ctx.ellipse(0,0,48,64,-.13,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-23,-38+i*18);ctx.lineTo(23,-38+i*18);ctx.stroke();}if(prepared){ctx.strokeStyle='#797c7e';for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*78,Math.sin(a)*91);ctx.quadraticCurveTo(Math.cos(a+.14)*64,Math.sin(a+.14)*76,Math.cos(a)*47,Math.sin(a)*57);ctx.stroke();}}ctx.restore();}
 function ridge(progress){const y=350+progress*140,h=Math.sin(Math.PI*progress)*15;ctx.save();ctx.fillStyle='#fff8e9';ctx.strokeStyle='#76838b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(190,y-h*3,510,y-h*3,720,y);ctx.bezierCurveTo(510,y-h,190,y-h,0,y+6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
 function draw(){
  paper();const active=phase(),clip=atlas.clips[active.name],index=frameAt(clip,active.t),key=clip.frames[index],frame=atlas.frames[key],page=atlas.pages[frame.page];
  const [sx,sy,sw,sh]=frame.rect,scale=page.scale*.94;let x=365;
  if(active.name==='intro_enter')x=150+215*Math.min(1,active.t/1.2);
  if(active.name.startsWith('windup_'))footprint(x+(clip.landingFoot==='left'?-85:80),selector.value.includes('countered')&&active.t>=2.4);
  if(active.name==='shoe_scrape'){ctx.strokeStyle='#68645e';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x-60+i*10,359+i*3);ctx.lineTo(x+50+Math.min(active.t,.5)*90,359+i*3);ctx.stroke();}}
  ctx.save();ctx.translate(x,355);if(clip.flipX)ctx.scale(-1,1);
  ctx.drawImage(images[frame.page],sx,sy,sw,sh,-frame.pivot[0]*scale,-frame.pivot[1]*scale,sw*scale,sh*scale);ctx.restore();
  if(active.name.startsWith('impact_')&&active.t>.08)ridge(Math.min(1,(active.t-.08)/.57));
  const event=clip.events?.[String(index)]||'';$('phase').textContent=active.name.replaceAll('_',' ');$('cue').textContent=event?'Sound / action cue: '+event.replaceAll('_',' '):'';
  $('scrub').value=String(Math.round(time/length()*1000));snapshot={selection:selector.value,clip:active.name,frame:key,index,time,paused,flipX:!!clip.flipX,event};
 }
 function sync(){ $('play').textContent=paused?'Play':'Pause';$('play').setAttribute('aria-pressed',String(paused));}
 selector.onchange=()=>{time=0;draw();};$('play').onclick=()=>{paused=!paused;sync();};$('restart').onclick=()=>{time=0;draw();};$('scrub').oninput=()=>{paused=true;time=Number($('scrub').value)/1000*(length()-.000001);sync();draw();};
 reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;sync();}});
 document.addEventListener('visibilitychange',()=>{last=null;});
 window.bootstompPreview={select(value){selector.value=value;if(!selector.value)throw Error('Unknown preview selection');time=0;draw();},seek(seconds){time=Math.max(0,Math.min(length()-.000001,seconds));draw();},pause(value=true){paused=value;sync();draw();},snapshot:()=>({...snapshot}),atlas};
 for(const id of ['clip','play','restart','scrub'])$(id).disabled=false;$('status').textContent='';sync();draw();
 function tick(now){const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;if(!paused&&!document.hidden){time=(time+dt*Number($('speed').value))%length();draw();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})().catch(error=>{document.getElementById('status').textContent='Could not load the animation study. Serve the project folder and try again. '+error.message;});
