/* Stevie's first-run lessons pause real combat; practice uses a separate page. */
DoodleDefender.systems.firstLessons=function(game){
 const key='saveStevieLessonsV1';let seen={draw:false,erase:false},enabled=true,kind=null,step=0,points=[],removed=new Set(),practiced=false,pointer=null,last=null,held=false,modifier=null;
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(!saved&&game.api.notebookSnapshot().lifetimeScraps>0)seen={draw:true,erase:true};if(saved&&typeof saved==='object')for(const k of ['draw','erase'])seen[k]=saved[k]===true;}catch{}
 const drawSteps=[
  ['Psst! Help me keep my page safe.','I’m Stevie! Draw walls between my doodles and me. Monsters touching your walls take damage, and their attacks wear the walls down. Your wall is active while you draw, so it can block attacks before you lift your finger. Everything is paused while we practice.'],
  ['Try drawing a little wall.','Drag across the practice paper below. Short lines use less ink but have less durability (wall HP). Longer lines cost more and stand up to more hits. Every line costs at least 6 ink.'],
  ['This is our ink well.','The INK bar tells you how much drawing ink is left. It refills while we play. If you have less than 6 ink, give it a moment to refill before starting another line.'],
  ['Keep an eye on me!','STEVIE is my health bar. Monsters that reach my fort can hurt me. If it empties, this adventure ends—but our earned scraps stay saved.'],
  ['Watch the wave timer.','When the timer reaches zero, new monsters stop arriving. Clear the ones still here to finish the wave and choose an upgrade. Boss waves have a boss afterward. Pause lets you take a break any time.']
 ];
 function touchDevice(){return document.documentElement?.classList?.contains('native-app')||window.matchMedia?.('(pointer: coarse)').matches;}
 function eraseInstruction(){return touchDevice()?(game.api.drawingControls().eraserToggle?'Tap Erase to switch tools, rub the wall, then tap it again to draw.':'Hold Erase with one thumb and rub a wall with your other finger. Release your thumb to draw again, even during the same stroke.'):'Hold the right mouse button and drag to erase. Left-drag draws. You can also use the Erase button.';}
 function firstLessonActive(){return game.dom.$('lessonOverlay').style.display==='grid';}
 function lessonSnapshot(){return {seen:{...seen},kind,step,practiced,active:firstLessonActive()};}
 function spotlight(selector=null){
  for(const name of ['.inkbox','.hpbox','.timer'])document.querySelector?.(name)?.classList.remove('lesson-spotlight');
  if(selector)document.querySelector?.(selector)?.classList.add('lesson-spotlight');
 }
 function paintPractice(){
  const canvas=game.dom.$('lessonCanvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,420,150);ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,420,150);ctx.strokeStyle='#d1dde0';ctx.lineWidth=1;
  for(let y=22;y<150;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(420,y);ctx.stroke();}
  ctx.strokeStyle='#41483e';ctx.lineWidth=8;ctx.lineCap='round';
  for(let i=1;i<points.length;i++)if(!removed.has(i)){ctx.beginPath();ctx.moveTo(points[i-1].x,points[i-1].y);ctx.lineTo(points[i].x,points[i].y);ctx.stroke();}
 }
 function renderLesson(){
  practiced=false;pointer=null;last=null;held=false;modifier=null;removed=new Set();points=[];const practice=step===1;
  let heading,body;if(kind==='draw')[heading,body]=drawSteps[step];else{heading=step===0?'A little room for corrections.':'Your turn: rub out a gap.';body=(step===0?'Erasing opens routes and recovers 25% of the paid ink in a healthy section. Damaged walls return less. Free lines and extra copies return nothing. Upgrades can improve recovery. Wave 2 also brings Rubble Ruff: he erases our walls, but you can rub over HIM to wipe him out! ':'')+eraseInstruction();}
  game.dom.$('lessonTitle').textContent=heading;game.dom.$('lessonText').textContent=body;game.dom.$('lessonProgress').textContent='Stevie’s tips · Wave '+game.state.wave+' · '+(step+1)+' / '+(kind==='draw'?5:2);
  game.dom.$('lessonPractice').hidden=!practice;game.dom.$('lessonExample').hidden=!practice;game.dom.$('lessonErase').hidden=kind!=='erase';game.dom.$('lessonFeedback').textContent=kind==='draw'?'Draw a wall here. This is a safe practice page.':'Rub out the middle of this practice wall.';
  game.dom.$('lessonNext').disabled=practice;game.dom.$('lessonNext').textContent=step===(kind==='draw'?4:1)?'Let’s play!':'Next →';
  if(kind==='erase')for(let i=0;i<=30;i++)points.push({x:90+i*8,y:75});
  spotlight(kind==='draw'?{2:'.inkbox',3:'.hpbox',4:'.timer'}[step]:null);paintPractice();
 }
 function beginFirstLesson(){
  const type=game.state.wave===1?'draw':game.state.wave===2?'erase':null;
  if(!enabled||!type||seen[type]||game.api.devRunActive()||game.api.devModeEnabled()||game.api.testLabActive?.())return false;
  kind=type;step=0;renderLesson();game.api.openInfo('lesson');return true;
 }
 function finishFirstLesson(){
  if(!firstLessonActive())return;seen[kind]=true;try{localStorage.setItem(key,JSON.stringify(seen));}catch{}
  spotlight();held=false;modifier=null;pointer=null;kind=null;game.api.closeInfo(false);game.api.introduceWave();
 }
 function nextLesson(){if(!firstLessonActive()||game.dom.$('lessonNext').disabled)return;if(step===(kind==='draw'?4:1)){finishFirstLesson();return;}step++;renderLesson();game.dom.$('lessonTitle').focus?.();}
 function resetFirstLessons(){seen={draw:false,erase:false};try{localStorage.setItem(key,JSON.stringify(seen));}catch{}spotlight();}
 function practicedEnough(){practiced=true;game.dom.$('lessonNext').disabled=false;}
 function pos(e){const r=game.dom.$('lessonCanvas').getBoundingClientRect();return {x:game.api.clamp((e.clientX-r.left)*420/r.width,0,420),y:game.api.clamp((e.clientY-r.top)*150/r.height,0,150)};}
 function erasePractice(a,b){
  for(let i=1;i<points.length;i++)if(game.api.eraserIntervals(points[i-1],points[i],a,b,24).length)removed.add(i);
  if(removed.size>=3){practicedEnough();game.dom.$('lessonFeedback').textContent='Nice! A gap and '+(removed.size*8*.31*.25).toFixed(1)+' ink recovered in our practice.';}paintPractice();
 }
 const canvas=game.dom.$('lessonCanvas'),button=game.dom.$('lessonErase');
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  if(!firstLessonActive()||step!==1||pointer!==null||e.button!==0&&e.button!==2)return;
  if(kind==='erase'&&e.button!==2&&!held)return;
  e.preventDefault?.();pointer=e.pointerId;last=pos(e);if(kind==='draw'){points=[last];removed=new Set();}else erasePractice(last,last);canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||!firstLessonActive())return;const p=pos(e);if(kind==='draw'){points.push(p);paintPractice();}else if(held||e.buttons===2)erasePractice(last,p);last=p;});
 canvas.addEventListener('pointerup',e=>{
  if(e.pointerId!==pointer)return;pointer=null;
  if(kind==='draw'){let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);if(length>=16){practicedEnough();game.dom.$('lessonFeedback').textContent='That wall costs about '+Math.max(6,length*.31).toFixed(1)+' ink and has '+game.api.wallHpForLength(length).toFixed(1)+' HP. Try another length!';}}
 });
 canvas.addEventListener('pointercancel',()=>{pointer=null;held=false;modifier=null;});
 button.addEventListener('pointerdown',e=>{if(game.api.drawingControls().eraserToggle)return;e.preventDefault?.();held=true;modifier=e.pointerId;button.setPointerCapture(e.pointerId);});
 const release=e=>{if(e.pointerId===modifier){held=false;modifier=null;}};for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
 button.onclick=e=>{if(game.api.drawingControls().eraserToggle||e.detail===0)held=!held;};
 game.dom.$('lessonNext').onclick=nextLesson;game.dom.$('lessonSkip').onclick=finishFirstLesson;
 game.dom.$('lessonExample').onclick=()=>{if(kind==='draw'){points=[{x:110,y:75},{x:270,y:75}];paintPractice();game.dom.$('lessonFeedback').textContent='Stevie’s example: 49.6 ink, about 58 HP. A shorter wall costs less but is easier to break.';practicedEnough();}else erasePractice({x:210,y:75},{x:210,y:75});};
 function cancelLessonGesture(){held=false;modifier=null;pointer=null;last=null;}
 function dismissFirstLesson(){cancelLessonGesture();spotlight();kind=null;}
 window.addEventListener('blur',cancelLessonGesture);window.addEventListener('resize',cancelLessonGesture);
 const api={dismissFirstLesson,cancelLessonGesture,beginFirstLesson,finishFirstLesson,firstLessonActive,lessonSnapshot,resetFirstLessons,setFirstLessonsEnabled:value=>{enabled=!!value;}};Object.assign(game.api,api);return api;
};
