/* Doodle construction crew: visible jobs, erasable tools, bounded sabotage. */
DoodleDefender.systems.hardhatCrew=function(game){
let bombs=[],flungWalls=[],grip=null,counterPops=[];
const yankTuning={hook:.65,pull:.7,windup:.3,pullSpeed:145,cooldown:1.1,flight:.8};
const types=new Set(['wallpuller','papertearer']);
function resetHardhatCrew(){endYankGrip(false);bombs=[];flungWalls=[];counterPops=[];}
const gripTuning={reach:240,slack:70,duration:4,speed:220,snags:2};
function yankGripActive(){return !!grip;}
function grippable(n){return n.hp>0&&!n.waveBoss&&!game.catalog.enemyDefs[n.type]?.boss&&!['boss','eraser','wallpuller','papertearer'].includes(n.type)&&!n.flight&&!game.api.underPaper(n)&&!game.api.abilityImmune(n)&&!game.api.heldByCatapulter(n)&&!game.api.bossFriendHeld(n)&&!game.api.heldUnderDesk?.(n);}
function beginYankGrip(p){
 if(!game.api.paperActive()||grip)return false;
 const e=game.state.enemies.find(e=>e.type==='wallpuller'&&e.hp>0&&e.stun<=0&&e.freeze<=0&&['hook','pull','windup'].includes(e.crew?.phase)&&e.crew.anchor&&Math.hypot(p.x-e.crew.anchor.x,p.y-e.crew.anchor.y)<=26);
 if(!e)return false;grip={owner:e,p:{...e.crew.anchor},age:0,stretch:0,snagged:new Map()};e.crew={phase:'gripped',cooldown:0};moveYankGrip(p);game.api.playSound('wall');yankText(e,'HEY! THAT’S MY END!');return true;
}
function moveYankGrip(p){if(!grip)return false;const e=grip.owner,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,k=Math.min(1,gripTuning.reach/d);grip.p={x:game.api.clamp(e.x+dx*k,12,game.state.W-12),y:game.api.clamp(e.y+dy*k,58,game.state.H-20)};grip.stretch=Math.max(grip.stretch,Math.min(1,Math.max(0,(d-gripTuning.slack)/(gripTuning.reach-gripTuning.slack))));return true;}
function endYankGrip(commit=true){
 if(!grip)return false;const g=grip;grip=null;const e=g.owner;
 if(game.state.enemies.includes(e)&&e.hp>0){e.crew={phase:'walk',cooldown:3};e.stun=Math.max(e.stun,commit?1.2:0);
  if(commit&&g.stretch>.08){game.api.dealDamage(e,e.maxHp*(.1+.25*g.stretch),'physical');if(e.hp>0)game.api.launchEnemy(e,g.p.x,g.p.y);game.api.playSound('wall');yankText(e,'SNAP!');counterPops.push({x:e.x,y:e.y,age:0});}}
 for(const n of g.snagged.keys())if(commit&&g.stretch>.08&&game.state.enemies.includes(n)&&grippable(n)){game.api.dealDamage(n,10+n.maxHp*.15,'physical');if(n.hp>0)game.api.launchEnemy(n,g.p.x,g.p.y);}
 return true;
}
function guardYankGrip(){if(grip&&(!game.api.paperActive()||!game.state.enemies.includes(grip.owner)||grip.owner.hp<=0||grip.owner.freeze>0||grip.owner.stun>0||grip.owner.flight))endYankGrip(false);}
function moveRopedEnemy(n,dx,dy){const p=game.state.player,b=game.api.refugeBounds(),clear=Math.hypot(b.halfWidth,b.halfHeight)+n.r+4;if(game.api.pointSegDist(p.x,p.y,n.x,n.y,n.x+dx,n.y+dy)<clear)return false;return game.api.moveEnemySafely(n,dx,dy);}
function updateYankGrip(dt){
 guardYankGrip();if(!grip)return;const g=grip,e=g.owner;g.age+=dt;if(g.age>=gripTuning.duration){endYankGrip(true);return;}
 const dx=g.p.x-e.x,dy=g.p.y-e.y,d=Math.hypot(dx,dy)||1,step=Math.min(Math.max(0,d-gripTuning.slack),gripTuning.speed*dt);if(step)moveRopedEnemy(e,dx/d*step,dy/d*step);
 for(const n of game.state.enemies){if(n===e||!grippable(n)||g.snagged.has(n)||g.snagged.size>=gripTuning.snags)continue;if(game.api.pointSegDist(n.x,n.y,e.x,e.y,g.p.x,g.p.y)<=n.r+7){const vx=g.p.x-e.x,vy=g.p.y-e.y,len=vx*vx+vy*vy||1;g.snagged.set(n,game.api.clamp(((n.x-e.x)*vx+(n.y-e.y)*vy)/len,.2,.9));game.api.floatText(n.x,n.y-20,'SNAGGED!','#386d79');}}
 for(const [n,t] of g.snagged){if(!game.state.enemies.includes(n)||!grippable(n)){g.snagged.delete(n);continue;}const tx=e.x+(g.p.x-e.x)*t,ty=e.y+(g.p.y-e.y)*t,nx=tx-n.x,ny=ty-n.y,len=Math.hypot(nx,ny)||1,k=Math.min(1,180*dt/len);moveRopedEnemy(n,nx*k,ny*k);n.stun=Math.max(n.stun,.12);}
}
function drawYankGrip(ctx){if(!grip)return;const g=grip,e=g.owner,t=Math.min(1,Math.hypot(g.p.x-e.x,g.p.y-e.y)/gripTuning.reach);ctx.strokeStyle='#477b87';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x,e.y);const dx=g.p.x-e.x,dy=g.p.y-e.y,d=Math.hypot(dx,dy)||1;for(let i=1;i<=24;i++){const q=i/24,w=Math.sin(q*Math.PI*12)*(1-t)*5;ctx.lineTo(e.x+dx*q-dy/d*w,e.y+dy*q+dx/d*w);}ctx.stroke();ctx.fillStyle='#d4eee9';ctx.strokeStyle='#386d79';ctx.beginPath();ctx.arc(g.p.x,g.p.y,15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#b67e32';ctx.beginPath();ctx.arc(g.p.x,g.p.y,19,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-g.age/gripTuning.duration));ctx.stroke();ctx.font='14px "Stevie Pencil",sans-serif';ctx.textAlign='center';ctx.fillStyle='#315965';ctx.fillText('Drag · release to snap',game.api.clamp(g.p.x,80,game.state.W-80),Math.max(72,g.p.y-26));for(const n of g.snagged.keys()){ctx.beginPath();ctx.arc(n.x,n.y,n.r+5,0,Math.PI*2);ctx.stroke();}}
function counterPop(x,y){counterPops.push({x,y,age:0});if(counterPops.length>8)counterPops.shift();game.api.burst(x,y,'#e1ae50',16);}
function crewText(x,y,text){game.api.floatText(game.api.clamp(x,90,game.state.W-90),game.api.clamp(y,95,game.state.H-65),text,'#855c3e');}
function yankText(e,text){game.state.floaters=game.state.floaters.filter(f=>!f.yankCaption);crewText(e.x,e.y-e.r-15,text);const f=game.state.floaters.at(-1);if(f)f.yankCaption=true;}
function nextRipSite(e){
 const {W,H,paper}=game.state,pad=54,top=Math.min(112,H*.32),corners=[{x:pad,y:top},{x:W-pad,y:top},{x:W-pad,y:H-pad},{x:pad,y:H-pad}],sites=[];
 for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/180));for(let j=0;j<steps;j++)sites.push({x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps});}
 let index=0;for(let i=1;i<sites.length;i++)if(Math.hypot(sites[i].x-e.x,sites[i].y-e.y)<Math.hypot(sites[index].x-e.x,sites[index].y-e.y))index=i;
 const pool=(paper.crewHoles||0)>=6?paper.holes.filter(h=>game.api.safePaperPoint(h)&&Math.hypot(h.x-e.x,h.y-e.y)>70&&Math.hypot(h.x-game.state.player.x,h.y-game.state.player.y)>170).sort((a,b)=>{const p=game.state.player,start=Math.atan2(e.y-p.y,e.x-p.x),angle=h=>(Math.atan2(h.y-p.y,h.x-p.x)-start+Math.PI*2)%(Math.PI*2);return angle(a)-angle(b);}):sites.slice(index+1).concat(sites.slice(0,index+1));
 e.ripGoal=pool.find(q=>game.api.safePaperPoint(q)&&Math.hypot(q.x-e.x,q.y-e.y)>70);if(e.ripGoal)e.ripGoal={x:e.ripGoal.x,y:e.ripGoal.y};
}
function crewPoint(e){
 if(e.type==='papertearer'){
  if(e.ripGoal){e.ripGoal.x=game.api.clamp(e.ripGoal.x,54,game.state.W-54);e.ripGoal.y=game.api.clamp(e.ripGoal.y,Math.min(112,game.state.H*.32),game.state.H-54);return e.ripGoal;}
  const {W,H,player:p}=game.state,pad=54,top=Math.min(112,H*.32),x=game.api.clamp(e.x,pad,W-pad),y=game.api.clamp(e.y,top,H-pad),sites=[{x:pad,y},{x:W-pad,y},{x,y:top},{x,y:H-pad}],far=Math.max(...sites.map(q=>Math.hypot(q.x-p.x,q.y-p.y)));
  return sites.filter(q=>Math.hypot(q.x-p.x,q.y-p.y)>=Math.min(far*.72,game.api.desktopUiEnabled?.()?Math.min(W,H)*.3:Math.max(W,H)*.25)&&game.api.safePaperPoint(q)).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0]||sites[0];
 }
const p=game.state.player,dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;return {x:game.api.clamp(p.x+dx/d*195,e.r+18,game.state.W-e.r-18),y:game.api.clamp(p.y+dy/d*195,110,game.state.H-e.r-20)};}
function moveCrew(e,goal,dt){
 const dx=e.x-goal.x,dy=e.y-goal.y,d=Math.hypot(dx,dy)||1;
 // Yank hooks from a distance; his destination must not be inside the wall.
 const approach=e.type==='wallpuller'?{x:goal.x+dx/d*Math.min(75,d),y:goal.y+dy/d*Math.min(75,d)}:goal;
 return game.api.navigateSpecialist(e,approach,dt,e.type==='papertearer'?1.6:1);
}
function cancelCrewJob(e,stumble=false){e.crew={phase:'walk',cooldown:stumble?3:1};if(stumble){e.stun=Math.max(e.stun,1);crewText(e.x,e.y-e.r-14,'JOB CANCELLED!');}}
function fireBombPoint(e){
 const p=game.state.player,dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;
 if((game.state.paper.crewHoles||0)>=6){const reuse=game.state.paper.holes.filter(h=>Math.hypot(h.x-p.x,h.y-p.y)<d-72).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];return reuse?{x:reuse.x,y:reuse.y}:null;}
 for(const distance of [110,125,140]){const q={x:p.x+dx/d*distance,y:p.y+dy/d*distance};
  if(d-distance>=72&&game.api.safePaperPoint(q)&&Math.hypot(q.x-game.api.refugePoint(q.x,q.y).x,q.y-game.api.refugePoint(q.x,q.y).y)>38)return q;
 }return null;
}
function makeCrewHole(point){
 const paper=game.state.paper;if((paper.crewHoles||0)>=6)return game.api.surfaceHoleAt(point.x,point.y);
 const before=paper.holes.length,hole=game.api.addPaperHole(point);if(paper.holes.length>before)paper.crewHoles=(paper.crewHoles||0)+1;return hole;
}
function shiftWall(w,dx,dy){
 w.pts=w.pts.map(p=>({x:p.x+dx,y:p.y+dy}));if(w.circleShape){w.circleShape.x+=dx;w.circleShape.y+=dy;}
 if(w.stitchPoints)w.stitchPoints=w.stitchPoints.map(p=>({x:p.x+dx,y:p.y+dy}));if(w.rockCharge)w.rockCharge={...w.rockCharge,x:w.rockCharge.x+dx,y:w.rockCharge.y+dy};
}
function flingWall(e,c){
 const w=c.wall;if(!game.state.walls.includes(w))return;
 const b=game.api.wallGeometry(w.pts),x=(b.minX+b.maxX)/2,y=(b.minY+b.maxY)/2,dir=c.dir||{x:-1,y:0};
 const pts=w.pts.filter((_,i)=>i===0||i===w.pts.length-1||i%Math.max(1,Math.ceil(w.pts.length/120))===0).map(p=>({x:p.x-x,y:p.y-y}));
 const radius=Math.max(...pts.map(p=>Math.hypot(p.x,p.y))),horizontal=Math.abs(dir.x)>=Math.abs(dir.y);
 const dx=horizontal?(dir.x<0?-radius-80-x:game.state.W+radius+80-x):dir.x*(game.state.H+radius*2);
 const dy=horizontal?dir.y*(game.state.W+radius*2):(dir.y<0?-radius-80-y:game.state.H+radius+80-y);
 flungWalls.push({x,y,dx,dy,pts,thick:w.thick,age:0,life:yankTuning.flight,spin:dir.x<0?-Math.PI*1.5:Math.PI*1.5});if(flungWalls.length>4)flungWalls.shift();
 game.state.walls=game.state.walls.filter(n=>n!==w);game.api.playSound('wall');yankText(e,'YEEET!');
}
function drawFlungWalls(ctx){
 const reduced=game.api.enemyMotionReduced();
 for(const f of flungWalls){const t=game.api.clamp(f.age/f.life,0,1),travel=t*t*(3-2*t);ctx.save();ctx.translate(f.x+f.dx*travel,f.y+f.dy*travel-Math.sin(t*Math.PI)*85);if(!reduced)ctx.rotate(f.spin*t);ctx.scale(1-t*.3,1-t*.3);ctx.globalAlpha=Math.min(1,(1-t)*4);ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();for(const [i,p] of f.pts.entries())if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);ctx.strokeStyle='#fff3cb';ctx.lineWidth=f.thick+5;ctx.stroke();ctx.strokeStyle='#404345';ctx.lineWidth=f.thick;ctx.stroke();ctx.restore();}
}
function yankPose(e){
 const still={x:0,y:0,angle:0,sx:1,sy:1};if(e.type!=='wallpuller'||game.api.enemyMotionReduced()||e.freeze>0||e.stun>0)return still;
 const c=e.crew||{},face=game.api.enemyFacing(e),walk=game.api.enemyWalkClock(e)*19;
 if(c.phase==='gripped'&&grip?.owner===e)return {x:0,y:Math.sin(grip.age*12)*2,angle:game.api.clamp((grip.p.x-e.x)/220,-.4,.4),sx:1+grip.stretch*.12,sy:1-grip.stretch*.08};
 if(c.phase==='hook'){const t=game.api.clamp(1-c.left/yankTuning.hook,0,1);return {x:face*t*5,y:-Math.sin(t*Math.PI)*3,angle:face*t*.25,sx:1+t*.12,sy:1-t*.08};}
 if(c.phase==='pull'){const t=game.api.clamp(1-c.left/yankTuning.pull,0,1);return {x:-face*5,y:3+Math.sin(t*Math.PI*5)*2,angle:-face*.35,sx:1.12,sy:.85};}
 if(c.phase==='windup'){const t=game.api.clamp(1-c.left/yankTuning.windup,0,1);return {x:-face*t*7,y:5*t,angle:-face*t*.65,sx:1+t*.2,sy:1-t*.25};}
 if(c.phase==='tossRecover'){c.left-=dt;if(c.left<=0){nextRipSite(e);e.crew={phase:'walk',cooldown:1.5};}return true;}
 if(c.phase==='recover'){const t=game.api.clamp(1-c.left/.45,0,1),kick=Math.sin(t*Math.PI);return {x:face*kick*10,y:-kick*8,angle:face*kick*.5,sx:1-kick*.15,sy:1+kick*.2};}
 return {x:0,y:-Math.abs(Math.sin(walk))*5,angle:Math.sin(walk)*.09,sx:1+Math.sin(walk)*.06,sy:1-Math.sin(walk)*.06};
}
function papertearerPose(e){
 const still={x:0,y:0,angle:0,sx:1,sy:1};if(game.api.enemyMotionReduced()||e.freeze>0||e.stun>0)return still;
 const c=e.crew||{},face=game.api.enemyFacing(e),walk=game.api.enemyWalkClock(e)*17;
 if(c.phase==='tear'){const snip=Math.sin(c.left*24);return {x:face*3,y:5+snip,angle:face*.18,sx:1.1,sy:.86};}
 if(c.phase==='bomb'){const t=game.api.clamp(1-c.left/1.2,0,1);return {x:-face*t*4,y:-t*3,angle:-face*t*.28,sx:1-t*.08,sy:1+t*.1};}
 if(c.phase==='tossRecover'){const t=1-c.left/.55,k=Math.sin(t*Math.PI);return {x:face*k*6,y:2*k,angle:face*k*.3,sx:1+k*.1,sy:1-k*.1};}
 return {...still,y:-Math.abs(Math.sin(walk))*3,angle:Math.sin(walk)*.06};
}
function drawPapertearerTools(ctx,e){
 const c=e.crew||{};if(!['tear','bomb','tossRecover'].includes(c.phase))return;
 const reduced=game.api.enemyMotionReduced()||e.freeze>0||e.stun>0,face=game.api.enemyFacing(e),p=papertearerPose(e);ctx.save();ctx.translate(e.x+p.x,e.y+p.y);ctx.rotate(p.angle);ctx.scale(face,1);
 const wind=c.phase==='bomb'?game.api.clamp(1-c.left/1.2,0,1):0,h={x:e.r*.95+wind*5,y:c.phase==='tear'?e.r*.8:-e.r*(.2+wind*.9)};
 ctx.strokeStyle='#39383c';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(e.r*.45,0);ctx.quadraticCurveTo(e.r*1.3,9,h.x,h.y);ctx.stroke();ctx.strokeStyle='#f0d79d';ctx.lineWidth=3;ctx.stroke();
 ctx.translate(h.x,h.y);ctx.strokeStyle='#33343a';ctx.lineWidth=1.6;
 if(c.phase==='tear'){const open=reduced?.25:.25+Math.abs(Math.sin(c.left*20))*.55;for(const side of [-1,1]){ctx.save();ctx.rotate(side*open);ctx.fillStyle='#b7c7ce';ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(24,side*2);ctx.lineTo(5,side*5);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#d46b49';ctx.beginPath();ctx.ellipse(-7,side*4,6,4,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}ctx.fillStyle='#fff7df';for(let i=0;i<3;i++)ctx.fillRect(-8-i*7,8+((i+c.left*4)%1)*9,4,3);}
 else if(c.phase==='bomb'){ctx.fillStyle='#705041';ctx.beginPath();ctx.arc(2,-3,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#e79937';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(3,-12);ctx.quadraticCurveTo(11,-23,14,-15);ctx.stroke();ctx.fillStyle='#f4c04b';ctx.fillRect(12,-18,4,4);}
 else{ctx.fillStyle='#fff4db';ctx.beginPath();ctx.ellipse(5,-5,6,4,.2,0,Math.PI*2);ctx.fill();ctx.stroke();}
 ctx.restore();
}
function updateHardhat(e,dt){
 if(!types.has(e.type))return false;
 const c=e.crew??={phase:'walk',cooldown:1};
 const hit=game.api.nearestWallHit(e)||game.api.gravityWallHit(e);if(hit)game.api.dealDamage(e,game.api.applyInkContact(e,dt,hit.wall)*dt,'physical');
 if(e.hp<=0){cancelCrewJob(e);return true;}
 if(c.phase==='gripped'){if(grip?.owner!==e)e.crew={phase:'walk',cooldown:2};return true;}
 if(e.freeze>0||e.stun>0||e.flight||game.api.underPaper(e)){if(c.phase!=='walk')cancelCrewJob(e);return true;}
 if(e.x<e.r+10||e.x>game.state.W-e.r-10||e.y<100||e.y>game.state.H-e.r-15){cancelCrewJob(e);moveCrew(e,crewPoint(e),dt);return true;}
 if(c.wall&&!game.state.walls.includes(c.wall)){cancelCrewJob(e);return true;}
 if(['hook','pull','windup'].includes(c.phase)){
  const q=game.api.nearestPointOnWall(e,c.wall);if(!q||Math.hypot(q.x-e.x,q.y-e.y)>170){cancelCrewJob(e);return true;}
  c.anchor={...q};c.left-=dt;
  if(c.phase==='hook'){if(c.left<=0){const p=game.state.player,dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1;c.phase='pull';c.left=yankTuning.pull;c.dir={x:dx/d,y:dy/d};yankText(e,'MINE!');}return true;}
  if(c.phase==='windup'){if(c.left<=0){flingWall(e,c);e.crew={phase:'recover',left:.45,cooldown:yankTuning.cooldown};}return true;}
  const dir=c.dir||{x:-1,y:0},step=Math.min(dt,Math.max(0,c.left+dt))*yankTuning.pullSpeed;
  const bounds=game.api.wallGeometry(c.wall.pts),sx=game.api.clamp(dir.x*step,Math.min(0,20-bounds.minX),Math.max(0,game.state.W-20-bounds.maxX)),sy=game.api.clamp(dir.y*step,Math.min(0,100-bounds.minY),Math.max(0,game.state.H-20-bounds.maxY));
  shiftWall(c.wall,sx,sy);e.x=game.api.clamp(e.x+sx,e.r+12,game.state.W-e.r-12);e.y=game.api.clamp(e.y+sy,100,game.state.H-e.r-15);c.anchor.x+=sx;c.anchor.y+=sy;
  if(c.left<=0){c.phase='windup';c.left=yankTuning.windup;yankText(e,'GOING UP!');}return true;
 }
 if(c.phase==='tossRecover'){c.left-=dt;if(c.left<=0){nextRipSite(e);e.crew={phase:'walk',cooldown:1.5};}return true;}
 if(c.phase==='recover'){c.left-=dt;if(c.left<=0)e.crew={phase:'walk',cooldown:yankTuning.cooldown};return true;}
 if(c.phase==='tear'||c.phase==='bomb'){
  c.left-=dt;if(c.left>0)return true;
  if(c.phase==='tear'){const hole=makeCrewHole(c.aim);if(hole){c.entryId=hole.id;crewText(hole.x,hole.y-25,'RIP!');}const aim=fireBombPoint(e);if(aim){c.phase='bomb';c.left=1.2;c.aim=aim;return true;}}
  else if(bombs.length<3){const d=Math.hypot(e.x-c.aim.x,e.y-c.aim.y);bombs.push({owner:e,existingStrokes:new Set(game.state.walls.map(w=>w.strokeId)),returned:false,from:{x:e.x,y:e.y},to:{...c.aim},entryId:c.entryId,age:0,life:game.api.clamp(d/380+.35,1,2),arc:Math.min(140,Math.max(60,d*.18))});e.crew={phase:'tossRecover',left:.55,cooldown:6};return true;}
  cancelCrewJob(e);nextRipSite(e);e.crew.cooldown=1.5;return true;
 }
 c.cooldown=Math.max(0,c.cooldown-dt);
 if(e.type==='wallpuller'){
  let target=null,distance=Infinity,largest=-1;
  const nearby=[],all=[];
  for(const wall of game.state.walls){if(wall===game.api.liveWallObject()||wall.wobbleBumper||wall.sneakyDraft||wall.shapeTurret||wall.hp<=0||wall.life<=0)continue;
   const q=game.api.nearestPointOnWall(e,wall);if(!q)continue;const d=Math.hypot(q.x-e.x,q.y-e.y),length=wall.pts.reduce((sum,p,i)=>sum+(i?Math.hypot(p.x-wall.pts[i-1].x,p.y-wall.pts[i-1].y):0),0),candidate={wall,q,d,length};all.push(candidate);if(d<=260)nearby.push(candidate);
  }
  for(const candidate of nearby.length?nearby:all){if(nearby.length?(candidate.length>largest||candidate.length===largest&&candidate.d<distance):candidate.d<distance){target=candidate;distance=candidate.d;largest=candidate.length;}}
  if(target){if(distance<=110&&c.cooldown===0){e.crew={phase:'hook',left:yankTuning.hook,wall:target.wall,anchor:{...target.q}};yankText(e,'ERASE THE ROPE!');return true;}if(distance>65)moveCrew(e,target.q,dt);return true;}
 }
 const goal=crewPoint(e);moveCrew(e,goal,dt);
 if(e.type==='papertearer'&&Math.hypot(goal.x-e.x,goal.y-e.y)<8&&c.cooldown===0&&game.api.safePaperPoint(e)){e.crew={phase:'tear',left:1.3,aim:{x:e.x,y:e.y}};crewText(e.x,e.y-e.r-15,'TEARING!');}
 return true;
}
function bombPosition(b){const t=game.api.clamp(b.age/b.life,0,1);return {x:b.from.x+(b.to.x-b.from.x)*t,y:b.from.y+(b.to.y-b.from.y)*t-Math.sin(t*Math.PI)*(b.arc||60)};}
function updateHardhatBombs(dt){
 if(!game.api.paperActive()){endYankGrip(false);return;}
 updateYankGrip(dt);for(const p of counterPops)p.age+=dt;counterPops=counterPops.filter(p=>p.age<.45);
 for(const f of flungWalls)f.age+=dt;flungWalls=flungWalls.filter(f=>f.age<f.life);
 for(const b of bombs){
  const old=bombPosition(b);b.age+=dt;
  if(b.returned){if(b.owner?.hp>0&&game.state.enemies.includes(b.owner))b.to={x:b.owner.x,y:b.owner.y};
   if(b.age>=b.life){counterPop(b.to.x,b.to.y);if(b.owner?.hp>0&&game.state.enemies.includes(b.owner)){game.api.dealDamage(b.owner,b.owner.maxHp*.4,'physical');b.owner.stun=Math.max(b.owner.stun,1.5);cancelCrewJob(b.owner,true);}game.api.playSound('wallBreak');}continue;}
  const next=bombPosition(b),fresh=game.state.walls.filter(w=>!w.sneakyDraft&&!w.shapeTurret&&!b.existingStrokes.has(w.strokeId)&&(w.blastAge??Infinity)<=.75),hit=game.api.bossShotWallHit({x:old.x,y:old.y,r:9},next.x,next.y,null,fresh);
  if(hit){game.api.recordSkillPlay?.('RETURN TO SENDER!',200,next.x,next.y);b.returned=true;b.from={x:hit.x??next.x,y:hit.y??next.y};b.to=b.owner?{x:b.owner.x,y:b.owner.y}:{...b.from};b.age=0;b.life=.55;b.arc=45;game.api.playSound('wall');crewText(b.from.x,b.from.y-24,'RETURN TO SENDER!');continue;}
  if(b.age>=b.life){const hole=makeCrewHole(b.to);if(hole){const entry=game.state.paper.holes.find(h=>h.id===b.entryId),p=game.state.player;if(entry&&entry!==hole&&Math.hypot(entry.x-p.x,entry.y-p.y)>Math.hypot(hole.x-p.x,hole.y-p.y)+45){const squad=game.api.specialistReinforcements(entry,2,{kind:'tunnel',entryId:entry.id,exitId:hole.id});if(squad.length)crewText(entry.x,entry.y-30,'SHORTCUT! THIS WAY!');}game.api.burst(hole.x,hole.y,'#ee8036',8);crewText(hole.x,hole.y-25,'NEW SHORTCUT!');game.api.playSound('wall');game.api.playSound('fire');}}
 }
 bombs=bombs.filter(b=>b.age<b.life);
}
function eraseHardhatTools(a,b,r){
 let changed=false;
 for(const e of game.state.enemies){const c=e.crew;if(!types.has(e.type)||e.hp<=0||game.api.underPaper(e)||!c)continue;
  const nearRope=(['hook','pull','windup'].includes(c.phase))&&c.anchor&&game.api.eraserIntervals({x:e.x,y:e.y},c.anchor,a,b,r).length>0;
  const mark=(c.phase==='tear'||c.phase==='bomb')&&game.api.pointSegDist(c.aim.x,c.aim.y,a.x,a.y,b.x,b.y)<=r+12;
  if(nearRope||mark){cancelCrewJob(e,true);if(mark&&e.type==='papertearer')game.api.dealDamage(e,e.maxHp*.2,'physical');changed=true;}
 }
 bombs=bombs.filter(bomb=>{const q=bombPosition(bomb);if(game.api.pointSegDist(q.x,q.y,a.x,a.y,b.x,b.y)>r+12)return true;game.api.burst(q.x,q.y,'#cbbba4',5);changed=true;return false;});return changed;
}
function drawMark(ctx,p,color){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p.x-8,p.y);ctx.lineTo(p.x+8,p.y);ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x,p.y+8);ctx.stroke();}
function drawHardhatCrew(){
 const ctx=game.dom.ctx;ctx.save();
 for(const e of game.state.enemies){const c=e.crew;if(!types.has(e.type)||!c||e.hp<=0||game.api.underPaper(e))continue;
  if(['hook','pull','windup'].includes(c.phase)&&c.anchor){
   const reduced=game.api.enemyMotionReduced(),t=c.phase==='hook'?game.api.clamp(1-c.left/yankTuning.hook,0,1):1,hand={x:e.x+game.api.enemyFacing(e)*e.r*.65,y:e.y-(c.phase==='windup'?e.r:0)},end=c.anchor,sag=reduced?0:c.phase==='hook'?18*Math.sin(t*Math.PI):c.phase==='pull'?Math.sin(c.left*35)*3:0;
   ctx.strokeStyle=c.phase==='hook'?'#96713d':'#b85431';ctx.lineWidth=3;ctx.setLineDash(c.phase==='hook'?[5,4]:[]);ctx.beginPath();ctx.moveTo(hand.x,hand.y);ctx.quadraticCurveTo((hand.x+end.x)/2,(hand.y+end.y)/2+sag,end.x,end.y);ctx.stroke();ctx.setLineDash([]);
   ctx.fillStyle='#e8fbef';ctx.strokeStyle='#387e76';ctx.lineWidth=2;ctx.beginPath();ctx.arc(end.x,end.y,14,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='13px "Stevie Pencil",sans-serif';ctx.textAlign='center';ctx.fillStyle='#315965';ctx.fillText('Grab & drag!',game.api.clamp(end.x,50,game.state.W-50),Math.max(75,end.y-22));ctx.fillStyle='#42bfba';ctx.strokeStyle='#293e3d';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(hand.x,hand.y,6,4,-.25,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  if(e.type==='papertearer')drawPapertearerTools(ctx,e);
  if(c.phase==='tear'||c.phase==='bomb')drawMark(ctx,c.aim,c.phase==='tear'?'#855c3e':'#cc642f');
 }
 drawFlungWalls(ctx);
 for(const b of bombs){drawMark(ctx,b.to,b.returned?'#3b8794':'#cc642f');const q=bombPosition(b);if(b.returned){ctx.strokeStyle='#54a0ac';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.from.x,b.from.y);ctx.lineTo(q.x,q.y);ctx.stroke();}ctx.fillStyle=b.returned?'#438b94':'#5f4130';ctx.strokeStyle='#292c2d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#ee8036';ctx.beginPath();ctx.moveTo(q.x,q.y-5);ctx.lineTo(q.x+4,q.y-17);ctx.lineTo(q.x+9,q.y-6);ctx.closePath();ctx.fill();}
 drawYankGrip(ctx);for(const p of counterPops){ctx.globalAlpha=1-p.age/.45;ctx.strokeStyle='#dba24b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,12+p.age*85,0,Math.PI*2);ctx.stroke();}ctx.restore();
}
function moveHardhatCrew(dx,dy){if(grip){grip.p.x+=dx;grip.p.y+=dy;}for(const p of counterPops){p.x+=dx;p.y+=dy;}for(const f of flungWalls){f.x+=dx;f.y+=dy;}for(const e of game.state.enemies){const c=e.crew;for(const q of [c?.aim,c?.anchor,e.ripGoal])if(q){q.x+=dx;q.y+=dy;}}for(const b of bombs)for(const q of [b.from,b.to]){q.x+=dx;q.y+=dy;}}
function hardhatSnapshot(){return {flungWalls:flungWalls.map(f=>({...f,pts:f.pts.map(p=>({...p}))})),grip:grip?{ownerType:grip.owner.type,p:{...grip.p},age:grip.age,stretch:grip.stretch,snagged:grip.snagged.size}:null,bombs:bombs.map(({owner,...b})=>({...b,ownerType:owner?.type,from:{...b.from},to:{...b.to}}))};}
const api={beginYankGrip,moveYankGrip,endYankGrip,yankGripActive,guardYankGrip,crewWorkPoint:crewPoint,papertearerPose,drawPapertearerTools,yankPose,yankTuning:()=>({...yankTuning}),updateHardhat,updateHardhatBombs,eraseHardhatTools,drawHardhatCrew,moveHardhatCrew,resetHardhatCrew,hardhatSnapshot};Object.assign(game.api,api);return api;
};
