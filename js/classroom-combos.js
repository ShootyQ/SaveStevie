/* Lunchroom punchlines. Reservations and captures remain real, finite enemies. */
DoodleDefender.systems.classroomCombos=function(game){
 const a=game.api,s=game.state;
 let mouths=[],bones=[],scrambles=[],reserved=new Map(),snackRest=new WeakMap(),poolRest=new Map(),clock=0,serial=0;
 const active=()=>s.running&&!s.paused&&!s.inUpgrade&&!s.betweenWaves&&!s.awaitingSpec&&!document.hidden&&!a.infoOpen()&&!a.firstLessonActive()&&!a.synergyRevealActive()&&!a.waveFinaleActive()&&!a.bossEntranceActive()&&!a.wobbleRepairActive();
 const living=e=>e&&e.hp>0&&s.enemies.includes(e);
 const lunchCaptured=e=>mouths.some(m=>m.victim===e);
 const eligible=e=>living(e)&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!a.abilityImmune(e)&&!a.underPaper(e)&&!e.flight&&!e.hurdle&&!e.catapultHeld&&!a.bossFriendHeld(e)&&!a.heldUnderDesk(e)&&!a.gravityCaptured(e)&&!a.catapulterAway(e)&&!lunchCaptured(e)&&!reserved.has(e);
 const phase=(m,name)=>{m.phase=name;m.phaseAge=0;};
 function wakeLunchMouth(p){
  if(!active()||!s.synergies.has('The Floor Is Lunch')||mouths.length>=3)return false;
  const pool=a.plaguefireAt(p.x,p.y);if(!pool||(poolRest.get(pool.seed)||0)>clock||mouths.some(m=>Math.hypot(m.x-p.x,m.y-p.y)<65))return false;
  poolRest.set(pool.seed,clock+3);mouths.push({x:p.x,y:p.y,age:0,phaseAge:0,phase:'wake',id:++serial,victim:null});a.playSound('poison');return true;
 }
 function releaseScramble(q){for(const e of q.members)if(reserved.get(e)===q){reserved.delete(e);snackRest.set(e,clock+8);}q.done=true;}
 function tryLastCrumb(crumb,candidates){
  if(!active()||!s.synergies.has('The Last Crumb'))return null;
  let q=scrambles.find(q=>q.crumb===crumb&&!q.done);
  if(!q){
   if(scrambles.filter(q=>!q.done).length>=2)return null;
   const three=candidates.filter(e=>eligible(e)&&(snackRest.get(e)||0)<=clock).sort((e,f)=>Math.hypot(e.x-crumb.x,e.y-crumb.y)-Math.hypot(f.x-crumb.x,f.y-crumb.y)).slice(0,3);if(three.length<3)return null;
   q={x:crumb.x,y:crumb.y,crumb,members:three,phase:'chase',age:0,phaseAge:0,id:++serial};scrambles.push(q);for(const e of three)reserved.set(e,q);
  }
  if(q.phase!=='chase')return {winner:null};
  const winner=q.members.filter(living).filter(e=>Math.hypot(e.x-q.x,e.y-q.y)<=e.r+15).sort((e,f)=>Math.hypot(e.x-q.x,e.y-q.y)-Math.hypot(f.x-q.x,f.y-q.y))[0];
  if(winner){reserved.delete(winner);snackRest.set(winner,clock+8);q.members=q.members.filter(e=>e!==winner);q.winner=winner;q.phase='wait';q.phaseAge=0;crumb.left=0;a.floatText(winner.x,winner.y-winner.r-12,'MINE!','#8b6342');return {winner};}
  return {winner:null};
 }
 function crumbScrambleTarget(e){const q=reserved.get(e);return q&&!q.done&&(q.phase==='chase'||q.phase==='wait')?{x:q.x,y:q.y}:null;}
 function classroomWaiting(e){const q=reserved.get(e);return !!q&&!q.done&&(q.phase==='fight'||q.phase==='wait'&&Math.hypot(e.x-q.x,e.y-q.y)<=e.r+23);}
 function classroomHidden(e){return lunchCaptured(e)||reserved.get(e)?.phase==='fight';}
 function chewMeal(m){
  const e=m.victim;m.victim=null;phase(m,'burp');
  if(!living(e))return;
  const angle=Math.atan2(m.y-s.player.y,m.x-s.player.x)+Math.sin(m.id)*.45,range=80+Math.sin(m.id*3)*18;
  bones.push({x:m.x,y:m.y,to:{x:a.clamp(m.x+Math.cos(angle)*range,22,Math.max(22,s.W-22)),y:a.clamp(m.y+Math.sin(angle)*range,90,Math.max(90,s.H-25))},age:0,id:m.id});if(bones.length>12)bones.shift();
  // Complete digestion is one ordinary kill, with its normal rewards. Nothing
  // alive is launched and no death split survives the meal.
  a.recordCombatDamage(e.hp,'poison',{floorLunch:true});e.hp=0;e.x=m.x;e.y=m.y;if(e.type==='splitter')e.twiceyDeathSplitUsed=true;
  a.playSound('paperPop');a.floatText(m.x,m.y-35,'BUUURP!','#64823b');a.killEnemy(e);
 }
 function advancePresentation(dt){for(const b of bones)b.age+=dt;bones=bones.filter(b=>b.age<2.4);for(const m of mouths)if(m.phase==='burp'||m.phase==='retreat'){m.phaseAge+=dt;if(m.phase==='burp'&&m.phaseAge>=.45)phase(m,'retreat');}mouths=mouths.filter(m=>m.phase!=='retreat'||m.phaseAge<.4);}
 function updateClassroomCombos(dt){
  if(!active())return;clock+=dt;advancePresentation(dt);
  for(const q of scrambles){
   if(q.done)continue;q.age+=dt;q.phaseAge+=dt;
   if(!s.synergies.has('The Last Crumb')||q.members.some(e=>!living(e)||a.underPaper(e)||e.flight||a.heldUnderDesk(e)||a.gravityCaptured(e))){releaseScramble(q);continue;}
   if(q.phase==='chase'){if(q.crumb.left<=0||q.age>4)releaseScramble(q);continue;}
   if(q.phase==='wait'){
    if(q.phaseAge>4){releaseScramble(q);continue;}
    if(q.members.every(e=>Math.hypot(e.x-q.x,e.y-q.y)<=e.r+28)){q.phase='fight';q.phaseAge=0;a.playSound('paperCrumple');a.floatText(q.x,q.y-40,'YOU ATE IT!','#8c6e42');}
   }else if(q.phase==='fight'&&q.phaseAge>=1.25){
    for(const e of q.members)if(living(e)){a.dealDamage(e,e.hp*.5,'physical',{lastCrumb:true});e.stun=Math.max(e.stun,.35);a.animateEnemyAction(e,'bounce');}a.playSound('paperPop');releaseScramble(q);
   }
  }
  scrambles=scrambles.filter(q=>!q.done);
  for(const m of mouths){
   if(m.phase==='burp'||m.phase==='retreat')continue;m.age+=dt;m.phaseAge+=dt;
   if(m.victim&&!living(m.victim)){m.victim=null;phase(m,'retreat');continue;}
   if(m.phase==='wake'){if(m.phaseAge>=.3)phase(m,'open');continue;}
   if(m.phase==='gulp'){if(m.phaseAge>=.4)phase(m,'chew');continue;}
   if(m.phase==='chew'){if(m.phaseAge>=.8)chewMeal(m);continue;}
   if(m.age>=6||!s.synergies.has('The Floor Is Lunch')||!a.plaguefireAt(m.x,m.y)){phase(m,'retreat');continue;}
   const e=s.enemies.filter(eligible).filter(e=>Math.hypot(e.x-m.x,e.y-m.y)<=26+e.r&&!a.bossShotWallHit({x:m.x,y:m.y,r:3},e.x,e.y)).sort((e,f)=>Math.hypot(e.x-m.x,e.y-m.y)-Math.hypot(f.x-m.x,f.y-m.y))[0];
   if(e){m.victim=e;m.from={x:e.x,y:e.y};phase(m,'gulp');a.playSound('paperStretch');}
  }
 }
 function resetClassroomCombos(){mouths=[];bones=[];scrambles=[];reserved.clear();snackRest=new WeakMap();poolRest.clear();clock=serial=0;}
 function moveClassroomCombos(dx,dy){for(const p of [...mouths,...bones,...scrambles]){p.x+=dx;p.y+=dy;if(p.from){p.from.x+=dx;p.from.y+=dy;}if(p.to){p.to.x+=dx;p.to.y+=dy;}}}
 function frame(row,col,x,y,size,angle=0,sx=1,sy=1){const c=game.dom.ctx,img=a.doodleArtwork('lunchroom-antics');c.save();c.translate(x,y);c.rotate(angle);c.scale(sx,sy);if(img){const height=size*img.height/img.width;c.drawImage(img,col*img.width/4,row*img.height/4,img.width/4,img.height/4,-size/2,-height/2,size,height);}else{c.fillStyle=row===3?'#fff9ed':'#52672e';c.strokeStyle='#514d3d';c.lineWidth=2;c.beginPath();c.ellipse(0,0,size*.4,size*.24,0,0,Math.PI*2);c.fill();c.stroke();}c.restore();}
 function drawLunchGround(){const c=game.dom.ctx,reduced=a.enemyMotionReduced();c.save();for(const m of mouths){let row=0,col=3,alpha=1;if(m.phase==='wake')col=Math.min(3,Math.floor(m.phaseAge/.3*4));if(m.phase==='chew'){row=1;col=reduced?1:Math.floor(m.phaseAge*11)%3;}if(m.phase==='burp'){row=1;col=3;}if(m.phase==='retreat')alpha=1-m.phaseAge/.4;const squash=reduced?0:Math.sin(m.phaseAge*(m.phase==='chew'?20:4))*.06;c.globalAlpha=alpha;frame(row,col,m.x,m.y,94,0,1+squash,1-squash);}
  for(const b of bones){const t=Math.min(1,b.age/.65),x=b.x+(b.to.x-b.x)*t,y=b.y+(b.to.y-b.y)*t;c.globalAlpha=.18*Math.min(1,(2.4-b.age)*2);c.fillStyle='#635a42';c.beginPath();c.ellipse(x,y+4,12,4,0,0,Math.PI*2);c.fill();}c.restore();}
 function drawClassroomActors(){const c=game.dom.ctx,reduced=a.enemyMotionReduced();c.save();
  for(const m of mouths){const e=m.victim;if(!living(e)||m.phase!=='gulp')continue;const t=a.clamp(m.phaseAge/.4,0,1),x=m.from.x+(m.x-m.from.x)*t,y=m.from.y+(m.y-m.from.y)*t;c.save();c.translate(x-e.x,y-e.y);a.drawPaperDoodle(e,{visible:1,y:0,angle:reduced?0:t*1.2,sx:1-t*.9,sy:1-t*.95,reduced:false});c.restore();}
  for(const b of bones){const t=Math.min(1,b.age/.65),x=b.x+(b.to.x-b.x)*t,y=b.y+(b.to.y-b.y)*t-(reduced?0:Math.sin(t*Math.PI)*45);c.globalAlpha=Math.min(1,(2.4-b.age)*2);frame(2,t>=1?3:Math.min(2,Math.floor(t*4)),x,y,45,reduced?0:Math.sin(t*Math.PI)*.45);}
  c.globalAlpha=1;
  for(const q of scrambles){if(q.phase==='fight'){const wobble=reduced?0:Math.sin(q.phaseAge*24)*.06;frame(3,reduced?0:Math.floor(q.phaseAge*12)%4,q.x,q.y,108,reduced?0:Math.sin(q.phaseAge*17)*.06,1+wobble,1-wobble);if(!reduced){c.strokeStyle='#aaa08a';c.lineWidth=1.5;for(let i=0;i<3;i++){const angle=q.phaseAge*7+i*2.1;c.beginPath();c.arc(q.x+Math.cos(angle)*44,q.y+Math.sin(angle)*26,4,angle,angle+1.6);c.stroke();}}}else if(q.phase==='wait'){c.font='bold 14px "Stevie Pencil",cursive';c.textAlign='center';c.fillStyle='#8c6e42';c.fillText('…where’s mine?',q.x,q.y-28);}}
  c.restore();
 }
 function classroomCombosSnapshot(){return {clock,mouths:mouths.map(m=>({x:m.x,y:m.y,phase:m.phase,age:m.age,phaseAge:m.phaseAge,victim:m.victim?.type||null})),bones:bones.map(b=>({...b,to:{...b.to}})),scrambles:scrambles.map(q=>({x:q.x,y:q.y,phase:q.phase,age:q.age,members:q.members.map(e=>e.type)})),reserved:reserved.size};}
 Object.assign(a,{wakeLunchMouth,lunchCaptured,tryLastCrumb,crumbScrambleTarget,classroomWaiting,classroomHidden,updateClassroomCombos,resetClassroomCombos,moveClassroomCombos,drawLunchGround,drawClassroomActors,classroomCombosSnapshot,updateLunchPresentation:dt=>{if(s.running&&!s.paused)advancePresentation(dt);}});return {};
};
