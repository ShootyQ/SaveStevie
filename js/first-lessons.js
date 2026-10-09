/* Stevie's first-run lessons pause real combat; practice uses a separate page. */
DoodleDefender.systems.firstLessons=function(game){
 const key='saveStevieLessonsV1';let seen={draw:false,erase:false},enabled=true,kind=null,step=0,points=[],removed=new Set(),practiced=false,pointer=null,last=null,held=false,modifier=null;
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(!saved&&game.api.notebookSnapshot().lifetimeScraps>0)seen={draw:true,erase:true};if(saved&&typeof saved==='object')for(const k of ['draw','erase'])seen[k]=saved[k]===true;}catch{}
 const drawSteps=[
  ['Hey! I’m Stevie.','My doodles have come to life! Draw a wall between them and me to keep me safe. We’ll try it together first. Nothing moves or hurts you while this lesson is open.'],
  ['One little line. Big help!','Drag across the practice paper. Your wall works as soon as you draw. Try a short line, then a longer one: more length uses more ink and adds more wall HP.'],
  ['Ink is your drawing fuel.','Watch the INK bar above. Every line needs at least 6 ink to start. Ink refills during play, so leave yourself enough for the next monster! Short walls help when ink is low.'],
  ['That health bar is me!','Keep monsters away from my fort. They attack your walls to get through, and monsters touching walls take damage. If my health runs out, the run ends. Scraps you earned are still yours.'],
  ['Survive. Clear. Upgrade!','The timer counts down until new monsters stop arriving. Then clear the remaining doodles to finish the wave and pick an upgrade. Throwing upgrades let me toss paper balls to help! You can pause any time. Ready?']
 ];
 const eraseSteps=[
  ['Make room for a better wall.','A wall in the wrong place? Erase a section to open a gap and recover some ink. You normally get back 25% of its paid ink; damaged walls return less. Let’s try it safely.'],
  ['Your turn: rub out a gap.','Rub across the middle of this wall. '],
  ['Meet Rubble Ruff!','This little rascal carries an eraser and wipes out your walls. Here’s the trick: YOU can erase HIM! Rub directly over him. You can also erase small hostile pencils and spikes; walls can reflect Pew Pew’s pencils back at him.'],
  ['Go easy on the paper.','Rubbing the same spot for about 7 seconds makes a hole. Some monsters slip under the page if another hole is closer to me. See a moving bump? Rub near it for 2 seconds to force it back up. For now, a quick erase is all you need!']
 ];
 function steps(){return kind==='draw'?drawSteps:eraseSteps;}
 function practiceLength(){let n=0;for(let i=1;i<points.length;i++)n+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);return n;}
 function practiceReadout(){
  const length=practiceLength(),ink=length?Math.max(6,length*.31):0;
  const refund=removed.size*8*.31*(game.state.stats.eraseRefund??.25);
  game.dom.$('lessonMetrics').textContent=kind==='draw'?'Ink used: '+ink.toFixed(1)+' · Wall HP: '+game.api.wallHpForLength(length).toFixed(1):'Ink recovered: '+refund.toFixed(1)+' · Your real ink is unchanged';
 }
 function syncPracticeTool(){button.textContent=held?'Erasing':'Erase';button.setAttribute?.('aria-pressed',String(held));button.classList?.toggle('is-erasing',held);}
 function touchDevice(){return document.documentElement?.classList?.contains('native-app')||window.matchMedia?.('(pointer: coarse)').matches;}
 function eraseInstruction(practice=false){if(practice&&touchDevice())return game.api.drawingControls().eraserToggle?'Tap Erase, then rub the wall. Tap again to draw.':'Hold Erase with one thumb; rub the wall with your other finger.';return touchDevice()?(game.api.drawingControls().eraserToggle?'Tap Erase to switch tools, rub the wall, then tap it again to draw.':'Hold Erase with one thumb and rub a wall with your other finger. Release your thumb to draw again, even during the same stroke.'):'Hold the right mouse button and drag to erase. Left-drag draws. You can also use the Erase button.';}
 function firstLessonActive(){return game.dom.$('lessonOverlay').style.display==='grid';}
 function lessonSnapshot(){return {seen:{...seen},kind,step,practiced,active:firstLessonActive()};}
 function spotlight(selector=null){
  for(const name of ['.inkbox','.hpbox','.timer'])document.querySelector?.(name)?.classList.remove('lesson-spotlight');
  if(selector)document.querySelector?.(selector)?.classList.add('lesson-spotlight');
 }
 function paintPractice(){
  const canvas=game.dom.$('lessonCanvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,420,150);ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,420,150);ctx.strokeStyle='#d1dde0';ctx.lineWidth=1;
  for(let y=22;y<150;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(420,y);ctx.stroke();}
  ctx.strokeStyle='#c98482';ctx.beginPath();ctx.moveTo(38,0);ctx.lineTo(38,150);ctx.stroke();
  if(kind==='draw'&&points.length<2){ctx.save();ctx.setLineDash?.([6,7]);ctx.strokeStyle='#a99e89';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(100,75);ctx.lineTo(320,75);ctx.stroke();ctx.restore();ctx.fillStyle='#647466';ctx.font='14px sans-serif';ctx.fillText('Try a line across here',115,112);}
  ctx.strokeStyle='#41483e';ctx.lineWidth=8;ctx.lineCap='round';
  for(let i=1;i<points.length;i++)if(!removed.has(i)){ctx.beginPath();ctx.moveTo(points[i-1].x,points[i-1].y);ctx.lineTo(points[i].x,points[i].y);ctx.stroke();}
  practiceReadout();
 }
 function renderLesson(){
  practiced=false;pointer=null;last=null;held=false;modifier=null;removed=new Set();points=[];const practice=step===1;
  let [heading,body]=steps()[step];if(kind==='erase'&&step<=1)body+=' '+eraseInstruction(step===1);
  game.dom.$('lessonTitle').textContent=heading;game.dom.$('lessonText').textContent=body;game.dom.$('lessonProgress').textContent='Stevie’s '+(kind==='draw'?'drawing':'erasing')+' lesson · '+(step+1)+' of '+steps().length;
  game.dom.$('lessonPauseNote').textContent='Take your time — the game is paused.';
  game.dom.$('lessonTrack').textContent=steps().map((_,i)=>i===step?'●':'○').join(' ');
  game.dom.$('lessonBack').hidden=step===0;
  const tip=kind==='draw'?['Draw between a doodle and Stevie.','Short = less ink, less HP. Long = more ink, more HP.','Save a little ink for surprises.','Walls buy time. Stevie’s paper balls help finish the job.','After every wave, choose a new upgrade.'][step]:['Erase a little. Recover a little ink.','Hold or switch to Erase, then rub.','Look for the doodle carrying an eraser.','Quick corrections keep the page intact.'][step];
  game.dom.$('lessonTakeaway').textContent=tip;
  game.dom.$('lessonPortrait').src=kind==='erase'&&step===2?'assets/art/scrubber.png':'assets/art/stevie-cheer-a.png';
  game.dom.$('lessonPortrait').alt=kind==='erase'&&step===2?'Rubble Ruff':'Stevie';
  game.dom.$('lessonPractice').hidden=!practice;game.dom.$('lessonExample').hidden=!practice;game.dom.$('lessonErase').hidden=kind!=='erase';game.dom.$('lessonFeedback').textContent=kind==='draw'?'Follow the dotted guide, or draw your own wall.':'Erase just a piece; you don’t need to erase the whole wall.';
  game.dom.$('lessonNext').disabled=practice;game.dom.$('lessonNext').textContent=step===steps().length-1?'Let’s play!':step===0?'Show me →':practice?'Nice! Next →':'Got it →';
  syncPracticeTool();
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
 function nextLesson(){if(!firstLessonActive()||game.dom.$('lessonNext').disabled)return;if(step===steps().length-1){finishFirstLesson();return;}step++;renderLesson();game.dom.$('lessonTitle').focus?.();game.dom.$('lessonCard').scrollTop=0;}
 function resetFirstLessons(){seen={draw:false,erase:false};try{localStorage.setItem(key,JSON.stringify(seen));}catch{}spotlight();}
 function practicedEnough(){practiced=true;game.dom.$('lessonNext').disabled=false;}
 function pos(e){const r=game.dom.$('lessonCanvas').getBoundingClientRect();return {x:game.api.clamp((e.clientX-r.left)*420/r.width,0,420),y:game.api.clamp((e.clientY-r.top)*150/r.height,0,150)};}
 function erasePractice(a,b){
  for(let i=1;i<points.length;i++)if(game.api.eraserIntervals(points[i-1],points[i],a,b,24).length)removed.add(i);
  if(removed.size>=3){practicedEnough();game.dom.$('lessonFeedback').textContent='Nice! A gap and '+(removed.size*8*.31*(game.state.stats.eraseRefund??.25)).toFixed(1)+' ink recovered in our practice.';}paintPractice();
 }
 const canvas=game.dom.$('lessonCanvas'),button=game.dom.$('lessonErase');
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  if(!firstLessonActive()||step!==1||pointer!==null||e.button!==0&&e.button!==2)return;
  if(kind==='erase'&&e.button!==2&&!held)return;
  e.preventDefault?.();pointer=e.pointerId;last=pos(e);if(kind==='draw'){points=[last];removed=new Set();}else erasePractice(last,last);canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||!firstLessonActive())return;const p=pos(e);if(kind==='draw'){points.push(p);paintPractice();if(practiceLength()>=16)practicedEnough();}else if(held||e.buttons===2)erasePractice(last,p);last=p;});
 canvas.addEventListener('pointerup',e=>{
  if(e.pointerId!==pointer)return;pointer=null;
  if(kind==='draw'){let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);if(length>=16){practicedEnough();game.dom.$('lessonFeedback').textContent='That wall costs about '+Math.max(6,length*.31).toFixed(1)+' ink and has '+game.api.wallHpForLength(length).toFixed(1)+' HP. Try another length!';}}
 });
 canvas.addEventListener('pointercancel',()=>{pointer=null;held=false;modifier=null;syncPracticeTool();});
 button.addEventListener('pointerdown',e=>{if(game.api.drawingControls().eraserToggle)return;e.preventDefault?.();held=true;modifier=e.pointerId;syncPracticeTool();button.setPointerCapture(e.pointerId);});
 const release=e=>{if(e.pointerId===modifier){held=false;modifier=null;syncPracticeTool();}};for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
 button.onclick=e=>{if(game.api.drawingControls().eraserToggle||e.detail===0){held=!held;syncPracticeTool();}};
 game.dom.$('lessonBack').onclick=()=>{if(!firstLessonActive()||step===0)return;step--;renderLesson();game.dom.$('lessonTitle').focus?.();game.dom.$('lessonCard').scrollTop=0;};
 game.dom.$('lessonNext').onclick=nextLesson;game.dom.$('lessonSkip').onclick=finishFirstLesson;
 game.dom.$('lessonExample').onclick=()=>{if(kind==='draw'){points=[{x:110,y:75},{x:270,y:75}];paintPractice();game.dom.$('lessonFeedback').textContent='Stevie’s example: a wall between the doodles and me. Try your own shorter line, too!';practicedEnough();}else erasePractice({x:210,y:75},{x:210,y:75});};
 function cancelLessonGesture(){held=false;modifier=null;pointer=null;last=null;syncPracticeTool();}
 function dismissFirstLesson(){cancelLessonGesture();spotlight();kind=null;}
 window.addEventListener('blur',cancelLessonGesture);window.addEventListener('resize',cancelLessonGesture);
 const api={dismissFirstLesson,cancelLessonGesture,beginFirstLesson,finishFirstLesson,firstLessonActive,lessonSnapshot,resetFirstLessons,setFirstLessonsEnabled:value=>{enabled=!!value;}};Object.assign(game.api,api);return api;
};
