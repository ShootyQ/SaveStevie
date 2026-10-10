/* Stevie teaches on the real page. Combat stays paused; only the guided tool is live. */
DoodleDefender.systems.firstLessons=function(game){
 const $=game.dom.$,key='saveStevieLessonsV1';
 let seen={draw:false,erase:false},enabled=true,kind=null,step=0,practiced=false,pointer=null,modifier=null,held=false,toggled=false,rightErase=false,cursor=null,points=[],last=null,baseline=null,eraseSeeded=false,seedCenter=null,scrapStage=null,lastScrapTarget=null;
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(!saved&&game.api.notebookSnapshot().lifetimeScraps>0)seen={draw:true,erase:true};if(saved&&typeof saved==='object')for(const k of ['draw','erase'])seen[k]=saved[k]===true;}catch{}
 const drawSteps=[
  ['Hey! I’m Stevie.','My doodles have come to life! You draw the walls; I try very hard not to get eaten. Let’s practice right here on our page.'],
  ['Draw me some cover!','Drag across the marked paper. Watch your real ink bar change! Short walls cost less ink and have less HP; longer walls use more ink and have more HP.'],
  ['This is your ink.','See this bar? Every new line needs at least 6 ink. Ink refills during play. Save a little for surprises—my doodles are terrible at following plans.'],
  ['That health bar is me!','Keep the doodles away from my fort. They hurt walls to get through; your walls hurt them back. If my health runs out, our run ends—but earned scraps stay yours.'],
  ['Watch the wave timer.','When this reaches zero, new doodles stop arriving. Clear the rest, then choose an upgrade! Your practice wall stays as cover. Ready for the real thing?']
 ];
 const eraseSteps=[
  ['Meet your eraser.','Wrong wall? Open a gap and recover some ink. Here’s the actual Erase control you’ll use. I’ll reset our practice ink before the wave starts.'],
  ['Erase this bit of wall.','Rub through the marked wall on our real page. Healthy paid walls return 25% of their ink; damaged walls return less.'],
  ['YOU can erase HIM!','Rubble Ruff carries an eraser and wipes out your walls. Rub over HIM three separate times to wipe off his chunks. Lift between passes. Paper balls and wall effects also hurt him.'],
  ['Careful: this is paper!','About 1 second of rubbing one spot makes a hole. Two holes can make a shortcut: some monsters go in the farther one and pop out closer to me. Rub a moving bump for 2 seconds to bring it up. Each wave gets fresh paper.']
 ];
 function firstLessonActive(){return kind!==null&&$('lessonOverlay').style.display==='grid';}
 function lessonCanPaint(tool=kind){return firstLessonActive()&&step===1&&tool===kind&&!document.hidden;}
 function lessonSnapshot(){return {seen:{...seen},kind,step,practiced,eraserCursor:cursor?{...cursor}:null,active:firstLessonActive(),practice:practiceZone(),scrapStage};}
 function touchDevice(){return document.documentElement?.classList?.contains('native-app')||window.matchMedia?.('(pointer: coarse)').matches;}
 function instruction(){return !touchDevice()?'Right-drag to erase; left-drag draws.':game.api.drawingControls().eraserToggle?'Tap Erase, then rub the wall. Tap again to draw.':'Hold Erase with one thumb and rub the wall with your other finger.';}
 function practiceZone(){
  const {W,H,player}=game.state,short=(window.innerHeight||H)<500,width=Math.min(short?Math.min(180,W*.25):240,W-60),y=game.api.clamp(player.y-110,96,Math.max(96,H-90));
  return {x:(W-width)/2,y,width,height:64};
 }
 function canvasRect(p){const r=game.dom.canvas.getBoundingClientRect();return {left:r.left+p.x,top:r.top+p.y,width:p.width,height:p.height};}
 function spotlight(selector=null){
  for(const name of ['.inkbox','.hpbox','.timer','#eraserBtn'])document.querySelector?.(name)?.classList.remove('lesson-spotlight');
  if(selector)document.querySelector?.(selector)?.classList.add('lesson-spotlight');
 }
 function guideTarget(){
  if(step===1)return canvasRect(practiceZone());
  const selector=kind==='draw'?{2:'.inkbox',3:'.hpbox',4:'.timer'}[step]:step<=2?'#eraserBtn':null;
  const node=selector?document.querySelector?.(selector):null;
  if(node)return node.getBoundingClientRect();
  const p=game.state.player;return canvasRect({x:p.x-40,y:p.y-45,width:80,height:90});
 }
 // One spotlight/arrow layout is shared by combat lessons and the menu trail.
 function placeGuide(id,target,extra=[]){
  const layer=$(id),card=$(id==='lessonOverlay'?'lessonCard':'scrapCoachCard');
  if(layer.style.display!=='grid'||!target)return;
  const W=window.innerWidth||game.state.W,H=window.innerHeight||game.state.H,margin=10,pad=5;
  const normalize=r=>{const left=game.api.clamp(r.left-pad,0,W),top=game.api.clamp(r.top-pad,0,H);return {left,top,right:game.api.clamp(r.left+r.width+pad,0,W),bottom:game.api.clamp(r.top+r.height+pad,0,H)};};
  const focus=normalize(target),holes=[focus,...extra.map(normalize)];
  const rect=r=>'M '+r.left+' '+r.top+' H '+r.right+' V '+r.bottom+' H '+r.left+' Z';
  $(id+'Shade').setAttribute?.('d','M 0 0 H '+W+' V '+H+' H 0 Z '+holes.map(rect).join(' '));
  $(id+'Focus').setAttribute?.('d',holes.map(rect).join(' '));
  const gap=22;
  const belowLimit=Math.min(H-margin,...extra.filter(r=>r.top>focus.bottom).map(r=>r.top-10)),available=belowLimit-focus.bottom-gap;
  const maxHeight=W<600&&available>=140?available+'px':'';
  if(card.style.maxHeight!==maxHeight)card.style.maxHeight=maxHeight;
  const box=card.getBoundingClientRect(),w=box.width||340,h=box.height||220;
  const cx=(focus.left+focus.right)/2,cy=(focus.top+focus.bottom)/2;
  const candidates=[
   {x:focus.right+gap,y:game.api.clamp(cy-h/2,margin,Math.max(margin,H-h-margin))},{x:focus.left-gap-w,y:game.api.clamp(cy-h/2,margin,Math.max(margin,H-h-margin))},
   {x:cx-w/2,y:focus.bottom+gap},{x:cx-w/2,y:focus.top-gap-h}
  ];
  let p=candidates.find(p=>p.x>=margin&&p.y>=margin&&p.x+w<=W-margin&&p.y+h<=H-margin&&!holes.slice(1).some(r=>p.x<r.right&&p.x+w>r.left&&p.y<r.bottom&&p.y+h>r.top));
  if(!p)p={x:game.api.clamp(cx-w/2,margin,Math.max(margin,W-w-margin)),y:focus.bottom+h+gap<H?focus.bottom+gap:Math.max(margin,focus.top-h-gap)};
  card.style.left=p.x+'px';card.style.top=p.y+'px';card.classList?.toggle('coach-points-right',cx>p.x+w/2);
  // The leader starts beside Stevie's raised hand and lands on the real target.
  const start={x:cx>p.x+w/2?p.x+w-18:p.x+28,y:p.y+Math.min(h-16,35)};
  const end={x:game.api.clamp(start.x,focus.left,focus.right),y:game.api.clamp(start.y,focus.top,focus.bottom)};
  const dx=end.x-start.x,dy=end.y-start.y,d=Math.hypot(dx,dy)||1,tx=dx/d,ty=dy/d;
  $(id+'Arrow').setAttribute?.('d','M '+start.x+' '+start.y+' Q '+(start.x+dx*.45)+' '+(start.y+dy*.15)+' '+end.x+' '+end.y+' M '+(end.x-tx*12-ty*6)+' '+(end.y-ty*12+tx*6)+' L '+end.x+' '+end.y+' L '+(end.x-tx*12+ty*6)+' '+(end.y-ty*12-tx*6));
 }
 function updateStevieGuides(){
  if(firstLessonActive()){
   const extra=[];
   if(lessonCanPaint('erase'))extra.push($('eraserBtn').getBoundingClientRect());
   if(step===1&&(window.innerHeight||game.state.H)>=500){const ink=document.querySelector?.('.inkbox');if(ink)extra.push(ink.getBoundingClientRect());}
   placeGuide('lessonOverlay',guideTarget(),extra);
  }
  if(scrapStage){const target=$(lastScrapTarget);placeGuide('scrapCoach',target.getBoundingClientRect());}
 }
 function showScrapCoach(stage){
  scrapStage=stage;
  if(!stage){$('scrapCoach').style.display='none';lastScrapTarget=null;return;}
  const data={cover:['splashHubBtn','Our scraps are safe!','Tap Notebook right here. I saved you a free first upgrade!'],hub:['hubNotebookBtn','This page is for permanent upgrades.','Tap Spend scraps. These upgrades stay with us between adventures.'],shop:['notebookBuy-starterEraser','Your first purchase!','Tap this highlighted Buy button to claim the Starter Eraser. It costs 0 scraps and helps every future run recover more ink.']};
  const [target,title,text]=data[stage];$('scrapCoachTitle').textContent=title;$('scrapCoachText').textContent=text;$('scrapCoachProgress').textContent='Stevie’s scrap trail · '+({cover:1,hub:2,shop:3}[stage])+' of 3';$('scrapCoach').style.display='grid';
  if(lastScrapTarget!==target){lastScrapTarget=target;$(target).scrollIntoView?.({block:'center',behavior:'instant'});$(target).focus?.({preventScroll:true});}
  updateStevieGuides();
 }
 function rememberPractice(){baseline={walls:JSON.parse(JSON.stringify(game.state.walls)),stats:{...game.state.stats}};}
 function restorePractice(){
  game.api.finishLiveWall();game.state.currentWall=null;game.state.drawing=false;
  if(baseline){game.state.walls=JSON.parse(JSON.stringify(baseline.walls));Object.assign(game.state.stats,baseline.stats);}
  eraseSeeded=false;seedCenter=null;game.api.updateUI();
 }
 function seedEraseWall(){
  const z=practiceZone(),y=z.y+z.height/2;
  const t=game.api.createWall([{x:z.x+10,y},{x:z.x+z.width-10,y}]);
  if(t){t.base.lessonSeed=true;seedCenter={x:z.x+z.width/2,y};}
  // The real wall uses normal paid-ink/refund calculations during the warm-up.
  eraseSeeded=true;game.api.updateUI();
 }
 function readout(){
  const used=Math.max(0,(baseline?.stats.ink??game.state.stats.ink)-game.state.stats.ink),wall=game.state.walls.at(-1);
  $('lessonMetrics').textContent=kind==='draw'?'Real ink used: '+used.toFixed(1)+(wall?' · Wall HP: '+wall.maxHp.toFixed(1):''):'Real ink: '+game.state.stats.ink.toFixed(1)+' / '+game.state.stats.maxInk;
 }
 function renderLesson(){
  cancelLessonGesture();const steps=kind==='draw'?drawSteps:eraseSteps,[heading,text]=steps[step];
  $('lessonTitle').textContent=heading;$('lessonText').textContent=text+(kind==='erase'&&step<=1?' '+instruction():'');
  $('lessonProgress').textContent='Stevie’s '+(kind==='draw'?'drawing':'erasing')+' lesson · '+(step+1)+' of '+steps.length;
  $('lessonPauseNote').textContent='Game paused · take your time';
  $('lessonBack').hidden=step===0;$('lessonMetrics').hidden=step!==1;$('lessonFeedback').hidden=step!==1;
  $('lessonFeedback').textContent=practiced?'Nice! You used the real controls.':'Your turn—use the highlighted part of the page.';
  $('lessonNext').disabled=step===1&&!practiced;$('lessonNext').textContent=step===steps.length-1?'Let’s play!':step===1?'Nice! Next →':'Got it →';
  $('lessonRetry').hidden=step!==1;
  spotlight(kind==='draw'?{2:'.inkbox',3:'.hpbox',4:'.timer'}[step]:step<=2?'#eraserBtn':null);
  readout();updateStevieGuides();game.api.draw?.();
 }
 function beginFirstLesson(){
  const type=game.state.wave===1?'draw':game.state.wave===2?'erase':null;
  if(!enabled||!type||seen[type]||game.api.devRunActive()||game.api.devModeEnabled()||game.api.testLabActive?.())return false;
  kind=type;step=0;practiced=false;eraseSeeded=false;rememberPractice();game.api.openInfo('lesson');renderLesson();return true;
 }
 function finishFirstLesson(){
  if(!firstLessonActive())return;cancelLessonGesture();if(kind==='erase')restorePractice();
  seen[kind]=true;try{localStorage.setItem(key,JSON.stringify(seen));}catch{}
  spotlight();kind=null;baseline=null;game.api.closeInfo(false);game.api.introduceWave();
 }
 function nextLesson(){
  if(!firstLessonActive()||$('lessonNext').disabled||pointer!==null)return;
  const steps=kind==='draw'?drawSteps:eraseSteps;
  if(step===steps.length-1){finishFirstLesson();return;}
  step++;if(kind==='erase'&&step===1&&!eraseSeeded)seedEraseWall();renderLesson();$('lessonTitle').focus?.({preventScroll:true});
 }
 function practicedEnough(text){practiced=true;$('lessonNext').disabled=false;$('lessonFeedback').textContent=text;readout();game.api.updateUI();}
 function pos(e){const r=game.dom.canvas.getBoundingClientRect();return {x:game.api.clamp(e.clientX-r.left,0,game.state.W),y:game.api.clamp(e.clientY-r.top,0,game.state.H)};}
 function length(){return points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);}
 function erase(a,b){
  cursor={...b,r:20};
  if(game.api.eraseWallPath(a,b,20,{lesson:true}))practicedEnough('A real gap! Watch ink return to the INK bar.');readout();game.api.draw?.();
 }
 function lessonPointerDown(e){
  if(!lessonCanPaint()||pointer!==null||e.button!==0&&e.button!==2)return;
  if(kind==='draw'&&e.button!==0)return;
  if(kind==='erase'&&e.button!==2&&!held&&!toggled)return;
  const p=pos(e),z=practiceZone();if(p.x<z.x||p.x>z.x+z.width||p.y<z.y||p.y>z.y+z.height)return;
  if(kind==='draw'&&!game.api.canStartStroke()){$('lessonFeedback').textContent='Out of ink? Tap Try again for a fresh practice.';return;}
  e.preventDefault?.();pointer=e.pointerId;rightErase=e.button===2;last=p;points=[p];game.dom.canvas.setPointerCapture?.(pointer);syncTool();
  if(kind==='draw'){game.state.drawing=true;game.state.currentWall=points;}else erase(p,p);
 }
 function lessonPointerMove(e){
  if(!lessonCanPaint())return;
  if(pointer===null){if(kind==='erase'&&(held||toggled)){cursor={...pos(e),r:20};game.api.draw?.();}return;}
  if(e.pointerId!==pointer)return;
  const p=pos(e);
  if(kind==='draw'){if(Math.hypot(p.x-last.x,p.y-last.y)>3){points.push(p);points=game.api.updateLiveWall(points);game.state.currentWall=points;readout();game.api.updateUI();game.api.draw?.();}}
  else if(held||toggled||rightErase)erase(last,p);
  last=p;
 }
 function lessonPointerUp(e){
  if(e.pointerId!==pointer)return;
  if(kind==='draw'){game.api.finishLiveWall();game.state.currentWall=null;game.state.drawing=false;if(length()>=24)practicedEnough('That’s real cover! It stays on the page when we start.');}
  const id=pointer;pointer=null;rightErase=false;cursor=null;last=null;
  if(game.dom.canvas.hasPointerCapture?.(id))game.dom.canvas.releasePointerCapture(id);
  syncTool();readout();game.api.draw?.();
 }
 function lessonEraserDown(e){
  if(!lessonCanPaint('erase')||modifier!==null||game.api.drawingControls().eraserToggle||e.button>0)return;
  e.preventDefault?.();held=true;modifier=e.pointerId;$('eraserBtn').setPointerCapture?.(modifier);syncTool();
 }
 function lessonEraserUp(e){if(e.pointerId!==modifier)return;modifier=null;held=false;cursor=null;syncTool();game.api.draw?.();}
 function lessonEraserClick(e){if(lessonCanPaint('erase')&&(game.api.drawingControls().eraserToggle||e.detail===0)){toggled=!toggled;cursor=null;syncTool();}}
 function syncTool(){const active=held||toggled||rightErase;game.dom.canvas.style.cursor=active?'none':'crosshair';$('eraserBtn').textContent=active?'Erasing':'Erase';$('eraserBtn').setAttribute?.('aria-pressed',String(active));$('eraserBtn').classList?.toggle('is-erasing',active);}
 function cancelLessonGesture(){
  if(kind===null)return;
  const id=pointer;pointer=null;game.api.finishLiveWall();game.state.currentWall=null;game.state.drawing=false;held=toggled=rightErase=false;modifier=null;cursor=null;last=null;
  if(id!==null&&game.dom.canvas.hasPointerCapture?.(id))game.dom.canvas.releasePointerCapture(id);
  syncTool();
 }
 function moveFirstLesson(dx,dy){
  if(kind===null)return;
  if(baseline)for(const wall of baseline.walls){wall.pts=wall.pts.map(p=>({x:p.x+dx,y:p.y+dy}));if(wall.rockCharge){wall.rockCharge.x+=dx;wall.rockCharge.y+=dy;}if(wall.stitchPoints)wall.stitchPoints=wall.stitchPoints.map(p=>({x:p.x+dx,y:p.y+dy}));}
  if(seedCenter){
   const z=practiceZone(),next={x:z.x+z.width/2,y:z.y+z.height/2},sx=next.x-seedCenter.x-dx,sy=next.y-seedCenter.y-dy;
   for(const wall of game.state.walls)if(wall.lessonSeed)wall.pts=wall.pts.map(p=>({x:p.x+sx,y:p.y+sy}));
   seedCenter=next;
  }
  updateStevieGuides();
 }
 function drawFirstLesson(){
  if(!firstLessonActive()||step!==1)return;
  const ctx=game.dom.ctx,z=practiceZone();ctx.save();ctx.strokeStyle='#417b64';ctx.lineWidth=2;ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(z.x+10,z.y+z.height/2);ctx.lineTo(z.x+z.width-10,z.y+z.height/2);ctx.stroke();ctx.setLineDash([]);
  if(cursor){ctx.strokeStyle='#793a51';ctx.fillStyle='#f7d5dc44';ctx.beginPath();ctx.arc(cursor.x,cursor.y,20,0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.restore();
 }
 function dismissFirstLesson(){cancelLessonGesture();if(kind==='erase')restorePractice();spotlight();kind=null;baseline=null;}
 function resetFirstLessons(){seen={draw:false,erase:false};try{localStorage.setItem(key,JSON.stringify(seen));}catch{}spotlight();}
 function handleStevieGuideKey(e){
  if(scrapStage){if(e.key==='Tab'){e.preventDefault?.();$(lastScrapTarget).focus?.();return true;}if(e.key==='Escape'){e.preventDefault?.();return true;}}
  if(firstLessonActive()&&e.key==='Tab'){
   const controls=Array.from($('lessonOverlay').querySelectorAll?.('button:not([disabled]):not([hidden])')||[]);
   if(lessonCanPaint('erase'))controls.push($('eraserBtn'));
   const i=controls.indexOf(document.activeElement);e.preventDefault?.();controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length]?.focus?.();return true;
  }
  return false;
 }
 $('lessonNext').onclick=nextLesson;$('lessonSkip').onclick=finishFirstLesson;
 $('lessonBack').onclick=()=>{if(!firstLessonActive()||step===0||pointer!==null)return;step--;renderLesson();};
 $('lessonRetry').onclick=()=>{if(!lessonCanPaint())return;cancelLessonGesture();restorePractice();practiced=false;if(kind==='erase')seedEraseWall();renderLesson();};
 window.addEventListener('blur',cancelLessonGesture);
 window.addEventListener('resize',()=>{if(firstLessonActive())cancelLessonGesture();updateStevieGuides();});
 window.addEventListener('scroll',updateStevieGuides,true);
 window.visualViewport?.addEventListener('resize',updateStevieGuides);
 const api={adoptLessonBackup:value=>{seen={draw:value.draw,erase:value.erase};},dismissFirstLesson,cancelLessonGesture,beginFirstLesson,finishFirstLesson,firstLessonActive,lessonSnapshot,resetFirstLessons,lessonCanPaint,lessonPointerDown,lessonPointerMove,lessonPointerUp,lessonEraserDown,lessonEraserUp,lessonEraserClick,drawFirstLesson,moveFirstLesson,showScrapCoach,updateStevieGuides,handleStevieGuideKey,setFirstLessonsEnabled:value=>{enabled=!!value;}};
 Object.assign(game.api,api);return api;
};
