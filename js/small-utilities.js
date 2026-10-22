/* Small one-time toys and outward-flying Connect the Dots outlines. */
DoodleDefender.systems.smallUtilities=function(game){
 const a=game.api,s=game.state,has=n=>!!s.stacks[n];
 const active=()=>s.running&&!s.paused&&!s.inUpgrade&&!s.betweenWaves&&!s.awaitingSpec&&!document.hidden&&!a.infoOpen()&&!a.firstLessonActive()&&!a.synergyRevealActive()&&!a.waveFinaleActive()&&!a.bossEntranceActive()&&!a.wobbleRepairActive();
 const ordinary=e=>e.hp>0&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!a.abilityImmune(e)&&!a.underPaper(e)&&!e.flight&&!e.hurdle&&!e.catapultHeld&&!a.bossFriendHeld(e)&&!a.heldUnderDesk(e)&&!a.chonksProtected(e)&&!['wallpuller','papertearer','catapulter','scrubber','sniper','gnawer','tank','sprinter','flanker','sapper','hardhat'].includes(e.type);
 let rays=[],knockdowns=new Map();
 let dots=[],next=1,trace=null,total=0,best=0,loops=0,crumbs=[],crumbInk=0,clock=0,chewing=new Map(),rest=new WeakMap(),queues=[],queueRest=new WeakMap(),flash=null;
 const wallAlive=w=>s.walls.includes(w)&&w.hp>0&&w.life>0;
 const position=p=>({x:a.clamp(p.x,26,Math.max(26,s.W-26)),y:a.clamp(p.y,85,Math.max(85,s.H-35))});
 function dropNumber(e){
  if(!has('Connect the Dots')||!active()||e.waveBoss||game.catalog.enemyDefs[e.type]?.boss||Math.random()>=.05)return false;
  // Spread coincident deaths so every number remains individually targetable.
  let p=position(e);for(let i=0;i<36&&dots.some(d=>Math.hypot(d.x-p.x,d.y-p.y)<42);i++){const angle=i*2.399963,r=24+7*i;p=position({x:e.x+Math.cos(angle)*r,y:e.y+Math.sin(angle)*r});}
  dots.push({...p,n:next++,age:0});total++;return true;
 }
 function beginDotTrace(p){
  if(!active()||!has('Connect the Dots'))return false;
  const first=dots[0];if(!first||Math.hypot(p.x-first.x,p.y-first.y)>24)return false;
  trace={last:{...p},count:1,points:[{x:first.x,y:first.y}]};return true;
 }
 function moveDotTrace(p){
  if(!trace)return false;if(trace.finished)return true;if(!active()){trace=null;return true;}
  const from=trace.last,dx=p.x-from.x,dy=p.y-from.y,len2=dx*dx+dy*dy;
  const crossed=(d,min)=>{const t=len2?a.clamp(((d.x-from.x)*dx+(d.y-from.y)*dy)/len2,0,1):0;return t>=min&&Math.hypot(d.x-from.x-dx*t,d.y-from.y-dy*t)<=22?t:null;};
  let min=0;
  while(trace.count<dots.length){const d=dots[trace.count],t=crossed(d,min);if(t===null)break;trace.points.push({x:d.x,y:d.y});trace.count++;min=t;}
  // Closing is allowed before the newest number: unused numbers belong to this batch.
  if(trace.count>=3&&crossed(dots[0],min)!==null&&Math.hypot(from.x-dots[0].x,from.y-dots[0].y)>26){
   const count=trace.count;launchDotLines(trace.points);best=Math.max(best,count);loops++;a.recordSkillPlay?.('DOT TO DOT!',Math.min(600,count*50),p.x,p.y);flash={points:[...trace.points,{x:dots[0].x,y:dots[0].y}],left:1.2,count};dots=[];next=1;trace.last={...p};trace.finished=true;a.playSound('pencilLift');a.floatText(p.x,p.y-30,count+' DOTS!','#416da6');a.setMsg('Connected '+count+' dots! Lines blast outward: knockback + 1 second stun! Next drop starts at 1.');return true;
  }
  trace.last={...p};return true;
 }
 function launchDotLines(points){
  const center=points.reduce((v,p)=>({x:v.x+p.x/points.length,y:v.y+p.y/points.length}),{x:0,y:0}),hit=new Set();
  for(let i=0;i<points.length;i++){
   const p=points[i],q=points[(i+1)%points.length],length=Math.hypot(q.x-p.x,q.y-p.y);if(length<1)continue;
   let vx=(q.y-p.y)/length,vy=-(q.x-p.x)/length;
   if(vx*((p.x+q.x)/2-center.x)+vy*((p.y+q.y)/2-center.y)<0){vx=-vx;vy=-vy;}
   rays.push({p:{...p},q:{...q},vx,vy,age:0,life:(Math.hypot(s.W,s.H)+length)/620+.2,hit});
  }
 }
 // Test the whole swept quadrilateral, including rounded edges, so a fast line
 // cannot skip monsters between frames. No collision or hit state lives in draw.
 function sweptDotHit(e,quad){
  let positive=false,negative=false;
  for(let i=0;i<4;i++){const p=quad[i],q=quad[(i+1)%4];if(a.pointSegDist(e.x,e.y,p.x,p.y,q.x,q.y)<=e.r+4)return true;const cross=(q.x-p.x)*(e.y-p.y)-(q.y-p.y)*(e.x-p.x);positive=positive||cross>0;negative=negative||cross<0;}
  return !(positive&&negative);
 }
 function dotTarget(e){return e.hp>0&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!a.abilityImmune(e)&&!a.underPaper(e)&&!e.flight&&!e.hurdle&&!e.catapultHeld&&!a.bossFriendHeld(e)&&!a.heldUnderDesk(e)&&!a.catapulterAway(e)&&!e.gravityCaptured;}
 function updateDotLines(dt){
  for(const [e,k] of knockdowns){
   if(!s.enemies.includes(e)||!dotTarget(e)){knockdowns.delete(e);continue;}
   const elapsed=1-k.left,travel=Math.max(0,Math.min(dt,.22-elapsed))*440;k.left-=dt;
   // Small safe steps stop at walls, the paper edge and Stevie's fort.
   for(let remaining=travel;remaining>0;remaining-=6){const step=Math.min(6,remaining),x=a.clamp(e.x+k.vx*step,e.r+8,Math.max(e.r+8,s.W-e.r-8)),y=a.clamp(e.y+k.vy*step,85,Math.max(85,s.H-e.r-12));if(Math.hypot(x-s.player.x,y-s.player.y)<Math.hypot(e.x-s.player.x,e.y-s.player.y)-.01||!a.moveEnemySafely(e,x-e.x,y-e.y))break;}
   if(k.left<=0)knockdowns.delete(e);
  }
  for(const r of rays){
   const oldP={...r.p},oldQ={...r.q},distance=620*dt;r.p.x+=r.vx*distance;r.p.y+=r.vy*distance;r.q.x+=r.vx*distance;r.q.y+=r.vy*distance;r.age+=dt;
   for(const e of s.enemies){if(r.hit.has(e)||!dotTarget(e)||!sweptDotHit(e,[oldP,oldQ,r.q,r.p]))continue;
    r.hit.add(e);let vx=r.vx,vy=r.vy;const dx=e.x-s.player.x,dy=e.y-s.player.y,d=Math.hypot(dx,dy)||1;if(vx*dx+vy*dy<0){vx=dx/d;vy=dy/d;}
    e.stun=Math.max(e.stun||0,1);knockdowns.set(e,{left:1,vx,vy});a.burst(e.x,e.y,'#497ca8',5);
   }
  }
  rays=rays.filter(r=>r.age<r.life);
 }
 function dotKnockdownPose(e){const k=knockdowns.get(e);if(!k)return null;const t=1-k.left,fall=Math.min(1,t/.12),stand=a.clamp((t-.72)/.28,0,1),tilt=fall*(1-stand),side=k.vx<0?-1:1;return {x:0,y:tilt*5,angle:side*1.25*tilt,sx:1+tilt*.12,sy:1-tilt*.12};}
 function endDotTrace(){trace=null;}
 function leaveEraserCrumbs(p,paid){
  if(!has('Eraser Crumbs')||!active()||!Number.isFinite(paid)||paid<=0)return;
  crumbInk+=paid;if(crumbInk<6)return;crumbInk%=6;if(crumbs.length>=3)return;
  crumbs.push({...position(p),left:8,seed:clock});
 }
 function updateSmallUtilities(dt){
  if(!active())return;clock+=dt;a.updateClassroomCombos(dt);updateDotLines(dt);if(flash){flash.left-=dt;if(flash.left<=0)flash=null;}
  for(const d of dots)d.age+=dt;
  for(const [e,c] of chewing){c.left-=dt;if(c.left<=0||!s.enemies.includes(e)||!ordinary(e)){chewing.delete(e);rest.set(e,clock+5);}}
  for(const c of crumbs){c.left-=dt;if(c.left<=0)continue;
   const candidates=s.enemies.filter(e=>ordinary(e)&&!chewing.has(e)&&!smallUtilityWaiting(e)&&(rest.get(e)||0)<=clock&&Math.hypot(e.x-c.x,e.y-c.y)<140),scramble=a.tryLastCrumb(c,candidates);
   const e=scramble?scramble.winner:s.enemies.find(e=>ordinary(e)&&!chewing.has(e)&&(rest.get(e)||0)<=clock&&!a.crumbScrambleTarget(e)&&Math.hypot(e.x-c.x,e.y-c.y)<e.r+15);
   if(e){c.left=0;chewing.set(e,{x:e.x,y:e.y,left:.9});a.animateEnemyAction(e,'bite',c);}
  }
  crumbs=crumbs.filter(c=>c.left>0);
  queues=queues.filter(q=>q.until>clock&&wallAlive(q.wall));
  for(const q of queues)q.waiters=q.waiters.filter(e=>s.enemies.includes(e)&&ordinary(e)&&a.nearestWallHit(e)?.wall===q.wall);
  if(has('Please Form a Line')){
   const groups=new Map();for(const e of s.enemies){if(!ordinary(e)||chewing.has(e))continue;const w=a.nearestWallHit(e)?.wall;if(w){if(!groups.has(w))groups.set(w,[]);groups.get(w).push(e);}}
   for(const [w,es] of groups){if(es.length<3||queues.some(q=>q.wall===w)||(queueRest.get(w)||0)>clock)continue;
    // Nearest monster keeps chewing; only two others wait, once per cooldown.
    es.sort((e,f)=>Math.hypot(e.x-s.player.x,e.y-s.player.y)-Math.hypot(f.x-s.player.x,f.y-s.player.y));
    queues.push({wall:w,waiters:es.slice(1,3),until:clock+1.25,x:es[0].x,y:es[0].y-38});queueRest.set(w,clock+7);
   }
  }
 }
 function smallUtilityWaiting(e){return ordinary(e)&&(a.classroomWaiting(e)||chewing.has(e)||queues.some(q=>wallAlive(q.wall)&&q.waiters.includes(e)));}
 function resetSmallWave(){a.resetClassroomCombos();rays=[];knockdowns.clear();dots=[];next=1;crumbs=[];crumbInk=0;chewing.clear();rest=new WeakMap();queues=[];queueRest=new WeakMap();trace=null;flash=null;}
 function resetSmallUtilities(){resetSmallWave();dots=[];next=1;total=best=loops=clock=0;}
 function moveSmallUtilities(dx,dy){a.moveClassroomCombos(dx,dy);for(const r of rays)for(const p of [r.p,r.q]){p.x+=dx;p.y+=dy;}for(const d of [...dots,...crumbs])Object.assign(d,position({x:d.x+dx,y:d.y+dy}));trace=null;for(const q of queues){q.x+=dx;q.y+=dy;}if(flash)for(const p of flash.points){p.x+=dx;p.y+=dy;}}
 function art(ctx,x,y,w,h,col,row){const img=a.doodleArtwork('small-utilities');if(!img)return false;ctx.drawImage(img,col*img.width/2,row*img.height/2,img.width/2,img.height/2,x-w/2,y-h/2,w,h);return true;}
 function drawSmallUtilities(){
  if(!s.running)return;const c=game.dom.ctx,reduced=a.enemyMotionReduced();c.save();c.textAlign='center';c.textBaseline='middle';c.font='bold 17px "Stevie Pencil", cursive';
  const path=(pts,color,alpha=1)=>{if(!pts.length)return;c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=2;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.globalAlpha=1;};
  if(flash)path(flash.points,'#497ca8',flash.left/1.2);
  for(const r of rays){const alpha=Math.min(1,(r.life-r.age)*4);c.save();c.lineCap='round';for(let i=3;i>=0;i--){c.globalAlpha=alpha*(i?.12:1);c.strokeStyle=i?'#7aa6c0':'#315f85';c.lineWidth=i?5:3;c.beginPath();c.moveTo(r.p.x-r.vx*i*9,r.p.y-r.vy*i*9);c.lineTo(r.q.x-r.vx*i*9,r.q.y-r.vy*i*9);c.stroke();}c.restore();}
  for(const [e,k] of knockdowns){c.fillStyle='#d09930';c.font='bold 16px "Stevie Pencil", cursive';for(let i=0;i<3;i++){const angle=i*Math.PI*2/3+(reduced?0:(1-k.left)*5);c.fillText('*',e.x+Math.cos(angle)*16,e.y-e.r-8+Math.sin(angle)*5);}}
  if(trace&&!trace.finished)path([...trace.points,trace.last],'#62605a');
  for(const d of dots){const expected=trace&&!trace.finished?(dots[trace.count]?.n||1):1,lit=d.n===expected,pulse=reduced?0:Math.sin(d.age*4)*2;
   if(lit){c.strokeStyle='#3d83ba';c.lineWidth=2;c.beginPath();c.arc(d.x,d.y,23+pulse,0,Math.PI*2);c.stroke();}
   if(!art(c,d.x,d.y,43,43,1,1)){c.fillStyle='#fff9e7';c.fillRect(d.x-16,d.y-16,32,32);}
   c.fillStyle=lit?'#245f99':'#405e7e';c.font='bold '+(String(d.n).length>3?12:17)+'px "Stevie Pencil", cursive';c.fillText(String(d.n),d.x+1,d.y-1);
  }
  for(const p of crumbs){c.globalAlpha=Math.min(1,p.left);for(let i=0;i<5;i++){c.save();c.translate(p.x+Math.cos(i*2.4)*9,p.y+Math.sin(i*2.4)*6);c.rotate(i*.9);c.fillStyle=i%2?'#df8b9c':'#efb4bf';c.strokeStyle='#9a5667';c.fillRect(-3,-2,6,4);c.strokeRect(-3,-2,6,4);c.restore();}c.globalAlpha=1;}
  for(const [e,v] of chewing){c.fillStyle='#9c4c64';c.font='15px "Stevie Pencil", cursive';c.fillText(reduced?'nom':'nom'+'.'.repeat(1+Math.floor(clock*5)%3),e.x,e.y-e.r-12);}
  for(const q of queues){c.save();const bob=reduced?0:Math.sin(clock*6)*2;if(!art(c,q.x,q.y+bob,65,65,1,0)){c.fillStyle='#fff1c9';c.fillRect(q.x-30,q.y-17,60,34);c.fillStyle='#66513d';c.font='10px "Stevie Pencil", cursive';c.fillText('ONE AT A TIME',q.x,q.y);}c.restore();}
  if(has('Connect the Dots')){c.font='13px "Stevie Pencil", cursive';c.textAlign='left';c.fillStyle='#315f85';const text='Dots: '+dots.length+' · next '+next+' · best '+best+' · dropped '+total;c.fillText(text,12,72);if(dots.length){c.fillText('Close 1 → 2 → 3… → 1 to blast the lines!',12,89);}}
  c.restore();
 }
 function smallUtilitiesSnapshot(){return {rays:rays.map(r=>({p:{...r.p},q:{...r.q},vx:r.vx,vy:r.vy,age:r.age,hits:r.hit.size})),knockdowns:knockdowns.size,dots:dots.map(d=>({...d})),next,total,best,loops,trace:trace?{count:trace.count,finished:!!trace.finished}:null,crumbs:crumbs.map(c=>({...c})),chewing:chewing.size,queues:queues.map(q=>({waiting:q.waiters.length,left:q.until-clock})),clock};}
 Object.assign(a,{dotKnockdownPose,dropNumber,beginDotTrace,moveDotTrace,endDotTrace,dotTraceActive:()=>!!trace,leaveEraserCrumbs,updateSmallUtilities,smallUtilityWaiting,resetSmallWave,resetSmallUtilities,moveSmallUtilities,drawSmallUtilities,smallUtilitiesSnapshot});return {};
};
