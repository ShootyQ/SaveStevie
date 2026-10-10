/* Paper-ball lifecycles. Descendants capture notes; persistent shots last until their page ends. */
DoodleDefender.systems.paperTricks=function(game){
 const maxBalls=512;let splashes=[];
 const living=e=>e&&e.hp>0&&game.state.enemies.includes(e);
 const activeWall=w=>w&&w.hp>0&&w.life>0&&game.state.walls.includes(w);
 function resetPaperTricks(){splashes=[];}
 function nearest(x,y,r,exclude=null,family=null){let best=null,distance=r;for(const e of game.state.enemies){if(!living(e)||e===exclude||family&&(family.hit.has(e)||family.claimed.has(e)))continue;const d=Math.hypot(e.x-x,e.y-y);if(d<distance){distance=d;best=e;}}return best;}
 function initPaperTricks(p){const n=p.doodlePayload;if(!n)return;p.splitLeft=n.split||0;if(n.split)p.family={hit:new Set(),claimed:new Set(p.target?[p.target]:[]),created:1};}
 function inherit(p,target,x,y,damage,extra={}){
  if(game.state.projectiles.length>=maxBalls)return null;
  const q={x,y,target,speed:p.speed,damage,life:Math.max(1.2,game.api.paperRange(p.doodlePayload)/p.speed+.5),electricLevel:p.electricLevel,paperElement:p.paperElement,doodlePayload:{...p.doodlePayload},splitLeft:p.splitLeft||0,family:p.family,noCarbon:p.noCarbon,scale:p.scale||1,copiedWalls:new Set(p.copiedWalls||[]),...extra};
  if(q.family){if(q.family.created>=maxBalls)return null;q.family.created++;if(target)q.family.claimed.add(target);}
  game.state.projectiles.push(q);return q;
 }
 function launch(p,target){p.target=target;p.manual=false;p.rail=null;p.paperMode=null;p.orbitTarget=null;p.perchWall=null;p.guided=true;p.life=Math.max(1.2,game.api.paperRange(p.doodlePayload)/p.speed+.5);p.hitDelay=.1;}
 function splitPaper(p,e){
  if(p.hasSplit||!p.family)return;p.hasSplit=true;p.family.hit.add(e);p.family.claimed.delete(e);if(!p.splitLeft)return;
  const retain=.5+Math.min(.15,.03*((p.doodlePayload.split||1)-1));
  for(let i=0;i<2;i++){const target=nearest(e.x,e.y,150+game.api.paperRange(p.doodlePayload)*.2,e,p.family);if(!target)break;inherit(p,target,e.x,e.y,p.damage*retain,{splitLeft:p.splitLeft-1,scale:Math.max(.45,(p.scale||1)*.82),paperTrail:[{x:e.x,y:e.y}],splitChild:true});}
  game.api.burst(e.x,e.y,'#9b66b0',4);
 }
 function nearestPerch(p,r=150){let best=null,distance=r;for(const w of game.state.walls){if(!activeWall(w))continue;const q=game.api.nearestPointOnWall(p,w),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<distance){distance=d;best={wall:w,point:q};}}return best;}
 function parkPaper(p){if(!p.doodlePayload?.flowers)return false;const perch=nearestPerch(p);if(!perch)return false;p.x=perch.point.x;p.y=perch.point.y;p.perchWall=perch.wall;p.target=null;p.manual=false;p.rail=null;p.paperMode='perch';p.life=1.2;p.paperTrail=[];return true;}
 function waitPaper(p,exclude=null){p.paperMode='wait';p.target=null;p.lastCreditTarget=exclude;p.manual=false;p.rail=null;p.life=1.2;p.hitDelay=.15;return true;}
 function lostPaper(p){if(p.doodlePayload?.credit){const target=nearest(p.x,p.y,90,null);if(target){launch(p,target);return true;}if(parkPaper(p))return true;return waitPaper(p);}return parkPaper(p);}
 function afterPaperHit(p,e){
  const n=p.doodlePayload;if(!n)return false;splitPaper(p,e);
  if(n.ink&&!game.api.underPaper(e))extraInkHit(p,e);
  if(n.credit){p.damage+=n.credit;p.creditHops=(p.creditHops||0)+1;const next=nearest(e.x,e.y,90,e);if(next){launch(p,next);return true;}}
  if(n.orbit&&living(e)&&!game.api.underPaper(e)){p.paperMode='orbit';p.orbitTarget=e;p.target=e;p.orbitAngle=Math.atan2(p.y-e.y,p.x-e.x);p.orbitTick=.45/(1+.25*(n.orbit-1));p.life=1.2;p.rail=null;p.manual=false;return true;}
  if(parkPaper(p))return true;
  if(n.credit)return waitPaper(p,e);
  return false;
 }
 function copyPaperWalls(p,a,b){if(!p.doodlePayload?.carbon||p.noCarbon)return;
  p.copiedWalls??=new Set();
  // Every crossed wall can emit once per ball. Copies and their descendants cannot copy again.
  for(const w of game.state.walls){if(!activeWall(w)||p.copiedWalls.has(w))continue;let hit=null;
   for(const seg of game.api.wallGeometry(w.pts).segments){const cuts=game.api.eraserIntervals(a,b,seg.a,seg.b,w.thick/2+4);if(cuts.length&&(!hit||cuts[0][0]<hit.t))hit={t:cuts[0][0],seg};}
   if(!hit)continue;p.copiedWalls.add(w);const {seg,t}=hit,dx=seg.b.x-seg.a.x,dy=seg.b.y-seg.a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
   for(let rank=0;rank<p.doodlePayload.carbon;rank++)for(const sign of [-1,1]){const angle=rank*.14*sign,ux=(nx*Math.cos(angle)-ny*Math.sin(angle))*sign,uy=(nx*Math.sin(angle)+ny*Math.cos(angle))*sign;inherit(p,null,x+ux*(w.thick/2+5),y+uy*(w.thick/2+5),p.damage*2,{manual:true,vx:ux*410,vy:uy*410,speed:410,life:game.api.paperRange(p.doodlePayload)/410+.3,noCarbon:true,carbonCopy:true,guided:true,paperTrail:[{x,y}]});}
   game.api.burst(x,y,'#7868ae',5);
  }
 }
 function growWall(w,pixels){if(w.closed||game.api.liveWallActive())return 0;const pts=w.pts.map(q=>({...q})),oldLength=game.api.wallGeometry(w.pts).segments.reduce((sum,s)=>sum+Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y),0);if(oldLength<=0)return 0;
  for(const [i,other] of [[0,1],[pts.length-1,pts.length-2]]){const q=pts[i],a=pts[other],dx=q.x-a.x,dy=q.y-a.y,d=Math.hypot(dx,dy);if(!d)continue;const ux=dx/d,uy=dy/d;let length=pixels;for(const [pos,v,min,max] of [[q.x,ux,6,game.state.W-6],[q.y,uy,55,game.state.H-6]]){if(v>0)length=Math.min(length,Math.max(0,(max-pos)/v));if(v<0)length=Math.min(length,Math.max(0,(min-pos)/v));}q.x+=ux*length;q.y+=uy*length;}
  const newLength=pts.slice(1).reduce((sum,q,i)=>sum+Math.hypot(q.x-pts[i].x,q.y-pts[i].y),0);if(newLength<=oldLength+.01)return 0;w.pts=pts;const gain=w.maxHp*(newLength/oldLength-1);w.maxHp+=gain;return gain;
 }
 function extraInkHit(p,e){const level=p.doodlePayload.ink,radius=115+15*(level-1);let repaired=0;
  for(const w of game.state.walls){if(!activeWall(w))continue;const q=game.api.nearestPointOnWall(e,w);if(Math.hypot(q.x-e.x,q.y-e.y)>radius)continue;const old=w.hp;growWall(w,24*level);w.hp=w.maxHp;repaired+=w.hp-old;}
  const refund=Math.min(5*level,game.state.stats.maxInk-game.state.stats.ink);game.state.stats.ink+=refund;
  splashes.push({x:e.x,y:e.y,r:radius,life:.6,repaired,refund});if(splashes.length>24)splashes.shift();game.api.burst(e.x,e.y,'#25283b',8);game.api.updateUI();
 }
 function updatePaperTricks(dt){splashes=splashes.filter(s=>(s.life-=dt)>0);}
 function updatePaperMotion(p,dt){
  if(!p.doodlePayload)return false;p.hitDelay=Math.max(0,(p.hitDelay||0)-dt);
  if(p.paperMode==='orbit'){
   const e=p.orbitTarget;if(!living(e)||game.api.underPaper(e))return lostPaper(p)?'handled':'remove';
   const from={x:p.x,y:p.y};p.orbitAngle+=dt*5;p.x=e.x+Math.cos(p.orbitAngle)*(e.r+12);p.y=e.y+Math.sin(p.orbitAngle)*(e.r+12);copyPaperWalls(p,from,p);p.orbitTick-=dt;
   if(p.orbitTick<=0){p.orbitTick+=.45/(1+.25*(p.doodlePayload.orbit-1));game.api.hitPaper(p,e);if(p.doodlePayload.ink)extraInkHit(p,e);
    if(p.doodlePayload.credit){p.damage+=p.doodlePayload.credit;p.creditHops=(p.creditHops||0)+1;const target=nearest(e.x,e.y,90,e);if(target)launch(p,target);}
    if(!living(e)&&p.paperMode==='orbit')return lostPaper(p)?'handled':'remove';
   }return 'handled';
  }
  if(p.paperMode==='perch'){
   if(!activeWall(p.perchWall)){const perch=nearestPerch(p,28);if(perch){p.perchWall=perch.wall;p.x=perch.point.x;p.y=perch.point.y;}else return p.doodlePayload.credit?waitPaper(p)&&'handled':'remove';}
   const point=game.api.nearestPointOnWall(p,p.perchWall);p.x=point.x;p.y=point.y;
   if(!p.hitDelay){const target=nearest(p.x,p.y,110+20*(p.doodlePayload.flowers-1),p.lastCreditTarget);if(target){p.lastCreditTarget=null;launch(p,target);}}return 'handled';
  }
  if(p.paperMode==='wait'){if(!p.hitDelay){const target=nearest(p.x,p.y,90,p.lastCreditTarget);if(target){p.lastCreditTarget=null;launch(p,target);}}return 'handled';}
  return false;
 }
 function paperTrail(p,dt){if(!p.doodlePayload||!(p.splitChild||p.carbonCopy||p.doodlePayload.credit||p.paperMode==='orbit'))return;p.trailClock=(p.trailClock||0)+dt;if(p.trailClock<.03)return;p.trailClock=0;p.paperTrail??=[];p.paperTrail.push({x:p.x,y:p.y});if(p.paperTrail.length>8)p.paperTrail.shift();}
 function drawPaperTricks(){const ctx=game.dom.ctx;ctx.save();for(const s of splashes){const t=1-s.life/.6;ctx.globalAlpha=s.life/.6;ctx.strokeStyle='#25283b';ctx.lineWidth=2;ctx.setLineDash([4,7]);ctx.beginPath();ctx.arc(s.x,s.y,s.r*t,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#25283b';for(let i=0;i<8;i++){const angle=i*Math.PI/4,reach=20+t*42;ctx.beginPath();ctx.ellipse(s.x+Math.cos(angle)*reach,s.y+Math.sin(angle)*reach,3+3*(1-t),2,angle,0,Math.PI*2);ctx.fill();}if(s.repaired){ctx.strokeStyle='#398b69';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,12+t*36,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#25283b';if(s.refund)ctx.fillText('+'+s.refund+' INK',s.x,s.y-20-t*15);}
  if(!game.api.enemyMotionReduced())for(const p of game.state.projectiles){if(!p.paperTrail?.length)continue;ctx.strokeStyle=p.doodlePayload?.ink?'#25283b':p.carbonCopy?'#7868ae':p.paperMode==='orbit'?'#d6a530':'#9b66b0';ctx.lineWidth=p.carbonCopy?2:1.5;ctx.globalAlpha=.45;ctx.beginPath();ctx.moveTo(p.paperTrail[0].x,p.paperTrail[0].y);for(const q of p.paperTrail.slice(1))ctx.lineTo(q.x,q.y);ctx.lineTo(p.x,p.y);ctx.stroke();}ctx.restore();
 }
 function movePaperTricks(dx,dy){for(const s of splashes){s.x+=dx;s.y+=dy;}for(const p of game.state.projectiles)for(const q of p.paperTrail||[]){q.x+=dx;q.y+=dy;}}
 const api={paperBallLimit:()=>maxBalls,initPaperTricks,afterPaperHit,lostPaper,copyPaperWalls,updatePaperMotion,paperTrail,resetPaperTricks,updatePaperTricks,drawPaperTricks,movePaperTricks,paperTricksSnapshot:()=>({splashes:splashes.map(s=>({...s})),orbits:game.state.projectiles.filter(p=>p.paperMode==='orbit').length,perched:game.state.projectiles.filter(p=>p.paperMode==='perch').length,waiting:game.state.projectiles.filter(p=>p.paperMode==='wait').length})};Object.assign(game.api,api);return api;
};
