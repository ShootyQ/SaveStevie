/* Doodle construction crew: visible jobs, erasable tools, bounded sabotage. */
DoodleDefender.systems.hardhatCrew=function(game){
let bombs=[];
const types=new Set(['wallpuller','papertearer']);
function resetHardhatCrew(){bombs=[];}
function crewText(x,y,text){game.api.floatText(game.api.clamp(x,90,game.state.W-90),game.api.clamp(y,95,game.state.H-65),text,'#855c3e');}
function crewPoint(e){const p=game.state.player,dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;return {x:game.api.clamp(p.x+dx/d*195,e.r+18,game.state.W-e.r-18),y:game.api.clamp(p.y+dy/d*195,110,game.state.H-e.r-20)};}
function moveCrew(e,goal,dt){const dx=goal.x-e.x,dy=goal.y-e.y,d=Math.hypot(dx,dy)||1,step=Math.min(d,e.speed*dt);game.api.moveEnemySafely(e,dx/d*step,dy/d*step);}
function cancelCrewJob(e,stumble=false){e.crew={phase:'walk',cooldown:stumble?3:1};if(stumble){e.stun=Math.max(e.stun,1);crewText(e.x,e.y-e.r-14,'JOB CANCELLED!');}}
function fireBombPoint(e){
 const p=game.state.player,dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;
 for(const distance of [110,125,140]){const q={x:p.x+dx/d*distance,y:p.y+dy/d*distance};
  if(d-distance>=72&&game.api.safePaperPoint(q)&&Math.hypot(q.x-game.api.refugePoint(q.x,q.y).x,q.y-game.api.refugePoint(q.x,q.y).y)>38)return q;
 }return null;
}
function makeCrewHole(point){
 const paper=game.state.paper;if((paper.crewHoles||0)>=6)return null;
 const before=paper.holes.length,hole=game.api.addPaperHole(point);if(paper.holes.length>before)paper.crewHoles=(paper.crewHoles||0)+1;return hole;
}
function updateHardhat(e,dt){
 if(!types.has(e.type))return false;
 const c=e.crew??={phase:'walk',cooldown:1};
 const hit=game.api.nearestWallHit(e)||game.api.gravityWallHit(e);if(hit)game.api.dealDamage(e,game.api.applyInkContact(e,dt,hit.wall)*dt,'physical');
 if(e.hp<=0){cancelCrewJob(e);return true;}
 if(e.freeze>0||e.stun>0||e.flight||game.api.underPaper(e)){if(c.phase!=='walk')cancelCrewJob(e);return true;}
 if(e.x<e.r+10||e.x>game.state.W-e.r-10||e.y<100||e.y>game.state.H-e.r-15){cancelCrewJob(e);moveCrew(e,crewPoint(e),dt);return true;}
 if(c.wall&&!game.state.walls.includes(c.wall)){cancelCrewJob(e);return true;}
 if(c.phase==='hook'||c.phase==='pull'){
  const q=game.api.nearestPointOnWall(e,c.wall);if(!q||Math.hypot(q.x-e.x,q.y-e.y)>125){cancelCrewJob(e);return true;}
  c.anchor={...q};
  c.left-=dt;if(c.phase==='hook'){if(c.left<=0){c.phase='pull';c.left=1.2;crewText(e.x,e.y-e.r-15,'HEAVE!');}return true;}
  const p=game.state.player,dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1,step=Math.min(dt,Math.max(0,c.left+dt))*60;
  const bounds=game.api.wallGeometry(c.wall.pts),inside=bounds.minX>=20&&bounds.maxX<=game.state.W-20&&bounds.minY>=100&&bounds.maxY<=game.state.H-20;
  // Already off-page loops still move; bound the hooked point rather than
  // letting a very large circle become immune to the worker's job.
  const sx=inside?game.api.clamp(dx/d*step,20-bounds.minX,game.state.W-20-bounds.maxX):game.api.clamp(dx/d*step,20-q.x,game.state.W-20-q.x),sy=inside?game.api.clamp(dy/d*step,100-bounds.minY,game.state.H-20-bounds.maxY):game.api.clamp(dy/d*step,100-q.y,game.state.H-20-q.y);
  c.wall.pts=c.wall.pts.map(a=>({x:a.x+sx,y:a.y+sy}));
  if(c.wall.stitchPoints)c.wall.stitchPoints=c.wall.stitchPoints.map(a=>({x:a.x+sx,y:a.y+sy}));
  if(c.wall.rockCharge)c.wall.rockCharge={...c.wall.rockCharge,x:c.wall.rockCharge.x+sx,y:c.wall.rockCharge.y+sy};
  if(c.left<=0){cancelCrewJob(e);e.crew.cooldown=4;}return true;
 }
 if(c.phase==='tear'||c.phase==='bomb'){
  c.left-=dt;if(c.left>0)return true;
  if(c.phase==='tear'){const hole=makeCrewHole(c.aim);if(hole){crewText(hole.x,hole.y-25,'RIP!');game.api.playSound('bossEnter');}const aim=fireBombPoint(e);if(aim&&(game.state.paper.crewHoles||0)<6){c.phase='bomb';c.left=1.2;c.aim=aim;return true;}}
  else if(bombs.length<3)bombs.push({from:{x:e.x,y:e.y},to:{...c.aim},age:0,life:.9});
  cancelCrewJob(e);e.crew.cooldown=6;return true;
 }
 c.cooldown=Math.max(0,c.cooldown-dt);
 if(e.type==='wallpuller'){
  let target=null,distance=Infinity;
  for(const wall of game.state.walls){if(wall.wobbleBumper||wall.hp<=0||wall.life<=0)continue;const q=game.api.nearestPointOnWall(e,wall),d=q?Math.hypot(q.x-e.x,q.y-e.y):Infinity;if(d<distance){distance=d;target={wall,q};}}
  if(target){if(distance<=90&&c.cooldown===0&&!game.state.drawing){e.crew={phase:'hook',left:1.1,wall:target.wall,anchor:{...target.q}};crewText(e.x,e.y-e.r-15,'ERASE THE ROPE!');return true;}if(distance>65)moveCrew(e,target.q,dt);return true;}
 }
 const goal=crewPoint(e);moveCrew(e,goal,dt);
 if(e.type==='papertearer'&&Math.hypot(goal.x-e.x,goal.y-e.y)<8&&c.cooldown===0&&game.api.safePaperPoint(e)&&(game.state.paper.crewHoles||0)<6){e.crew={phase:'tear',left:1.3,aim:{x:e.x,y:e.y}};crewText(e.x,e.y-e.r-15,'TEARING!');}
 return true;
}
function bombPosition(b){const t=game.api.clamp(b.age/b.life,0,1);return {x:b.from.x+(b.to.x-b.from.x)*t,y:b.from.y+(b.to.y-b.from.y)*t-Math.sin(t*Math.PI)*45};}
function updateHardhatBombs(dt){
 if(!game.api.paperActive())return;
 for(const b of bombs){b.age+=dt;if(b.age>=b.life){const hole=makeCrewHole(b.to);if(hole){game.api.burst(hole.x,hole.y,'#ee8036',8);crewText(hole.x,hole.y-25,'NEW SHORTCUT!');game.api.playSound('wall');game.api.playSound('fire');}}}bombs=bombs.filter(b=>b.age<b.life);
}
function eraseHardhatTools(a,b,r){
 let changed=false;
 for(const e of game.state.enemies){const c=e.crew;if(!types.has(e.type)||e.hp<=0||game.api.underPaper(e)||!c)continue;
  const nearRope=(c.phase==='hook'||c.phase==='pull')&&c.anchor&&game.api.eraserIntervals({x:e.x,y:e.y},c.anchor,a,b,r).length>0;
  const mark=(c.phase==='tear'||c.phase==='bomb')&&game.api.pointSegDist(c.aim.x,c.aim.y,a.x,a.y,b.x,b.y)<=r+12;
  if(nearRope||mark){cancelCrewJob(e,true);changed=true;}
 }
 bombs=bombs.filter(bomb=>{const q=bombPosition(bomb);if(game.api.pointSegDist(q.x,q.y,a.x,a.y,b.x,b.y)>r+7)return true;game.api.burst(q.x,q.y,'#cbbba4',5);changed=true;return false;});return changed;
}
function drawMark(ctx,p,color){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p.x-8,p.y);ctx.lineTo(p.x+8,p.y);ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x,p.y+8);ctx.stroke();}
function drawHardhatCrew(){
 const ctx=game.dom.ctx;ctx.save();
 for(const e of game.state.enemies){const c=e.crew;if(!types.has(e.type)||!c||e.hp<=0||game.api.underPaper(e))continue;
  if((c.phase==='hook'||c.phase==='pull')&&c.anchor){ctx.strokeStyle=c.phase==='pull'?'#b85431':'#96713d';ctx.lineWidth=3;ctx.setLineDash(c.phase==='hook'?[5,4]:[]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(c.anchor.x,c.anchor.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(c.anchor.x,c.anchor.y,7,0,Math.PI*1.6);ctx.stroke();}
  if(c.phase==='tear'||c.phase==='bomb')drawMark(ctx,c.aim,c.phase==='tear'?'#855c3e':'#cc642f');
 }
 for(const b of bombs){drawMark(ctx,b.to,'#cc642f');const q=bombPosition(b);ctx.fillStyle='#5f4130';ctx.strokeStyle='#292c2d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#ee8036';ctx.beginPath();ctx.moveTo(q.x,q.y-5);ctx.lineTo(q.x+4,q.y-17);ctx.lineTo(q.x+9,q.y-6);ctx.closePath();ctx.fill();}
 ctx.restore();
}
function moveHardhatCrew(dx,dy){for(const e of game.state.enemies){const c=e.crew;for(const q of [c?.aim,c?.anchor])if(q){q.x+=dx;q.y+=dy;}}for(const b of bombs)for(const q of [b.from,b.to]){q.x+=dx;q.y+=dy;}}
function hardhatSnapshot(){return {bombs:bombs.map(b=>({...b,from:{...b.from},to:{...b.to}}))};}
const api={updateHardhat,updateHardhatBombs,eraseHardhatTools,drawHardhatCrew,moveHardhatCrew,resetHardhatCrew,hardhatSnapshot};Object.assign(game.api,api);return api;
};
