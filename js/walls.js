/* walls: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.walls = function createWallsSystem(game) {
function loopUtilityTuning(levels=(game.state.stacks['Closed Loop']||0)+(game.state.stacks['Fortress Geometry']||0)){
 if(levels<=0)return {refund:0,repair:0,damage:0};
 const fall=Math.pow(.8,levels-1);return {refund:.35-.2*fall,repair:.3-.15*fall,damage:.25-.15*fall};
}
function insideLoop(e,w){
 const bounds=game.api.wallGeometry(w.pts);if(e.x<bounds.minX||e.x>bounds.maxX||e.y<bounds.minY||e.y>bounds.maxY)return false;
 let inside=false;for(let i=0,j=w.pts.length-1;i<w.pts.length;j=i++){
  const a=w.pts[i],b=w.pts[j];if((a.y>e.y)!==(b.y>e.y)&&e.x<(b.x-a.x)*(e.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }return inside;
}
function loopDamageMultiplier(enemy){const t=loopUtilityTuning();return t.damage&&game.state.walls.some(w=>w.closed&&w.hp>0&&w.life>0&&insideLoop(enemy,w))?1+t.damage:1}
function rewardClosedLoop(wall,paid){
 const t=loopUtilityTuning();if(!t.refund||paid<=0)return;
 const refund=Math.min(paid*t.refund,game.state.stats.maxInk-game.state.stats.ink);game.state.stats.ink+=refund;wall.eraseInk=Math.max(0,(wall.eraseInk||0)-refund);
 const requests=[];
 for(const w of game.state.walls){if(w===wall||w.hp<=0||w.hp>=w.maxHp)continue;
  const touched=w.pts.some(p=>insideLoop(p,wall))||w.pts.some(p=>{const near=game.api.nearestPointOnWall(p,wall);return near&&Math.hypot(near.x-p.x,near.y-p.y)<=wall.thick+w.thick});
  if(touched)requests.push({w,amount:(w.maxHp-w.hp)*t.repair});
 }
 const total=requests.reduce((n,r)=>n+r.amount,0),scale=total?Math.min(1,paid*.5/total):0;
 for(const r of requests)r.w.hp=Math.min(r.w.maxHp,r.w.hp+r.amount*scale);
 const center=game.api.wallGeometry(wall.pts);wall.sealAge=0;
 game.api.floatText((center.minX+center.maxX)/2,(center.minY+center.maxY)/2,'SEALED! +'+refund.toFixed(1)+' ink','#456d49');
}
// Clip a wall segment against the swept eraser (a capsule), including sparse
// two-point strokes. Parameter intervals keep every surviving edge exact.
function eraserIntervals(p,q,a,b,r){
 const vx=q.x-p.x,vy=q.y-p.y,v2=vx*vx+vy*vy,cuts=[];
 if(v2<1e-10)return cuts;
 for(const center of [a,b]){
  const dx=p.x-center.x,dy=p.y-center.y,B=2*(dx*vx+dy*vy),C=dx*dx+dy*dy-r*r,D=B*B-4*v2*C;
  if(D>0){const root=Math.sqrt(D),lo=Math.max(0,(-B-root)/(2*v2)),hi=Math.min(1,(-B+root)/(2*v2));if(hi>lo)cuts.push([lo,hi]);}
 }
 const length=Math.hypot(b.x-a.x,b.y-a.y);
 if(length>1e-8){
  const tx=(b.x-a.x)/length,ty=(b.y-a.y)/length,dx=p.x-a.x,dy=p.y-a.y;
  let lo=0,hi=1;
  for(const [origin,delta,min,max] of [[dx*tx+dy*ty,vx*tx+vy*ty,0,length],[-dx*ty+dy*tx,-vx*ty+vy*tx,-r,r]]){
   if(Math.abs(delta)<1e-10){if(origin<min||origin>max){hi=-1;break;}}
   else{const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
  }
  if(hi>lo)cuts.push([lo,hi]);
 }
 cuts.sort((x,y)=>x[0]-y[0]);const merged=[];
 for(const cut of cuts){const last=merged.at(-1);if(last&&cut[0]<=last[1]+1e-8)last[1]=Math.max(last[1],cut[1]);else merged.push(cut);}
 return merged;
}
function eraseWallPath(a,b,r=20,options={}){
 if(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.state.awaitingSpec||game.api.synergyRevealActive()||game.api.waveFinaleActive()||game.api.wobbleRepairActive()||game.api.bossEntranceActive())return false;
 if(![a.x,a.y,b.x,b.y,r].every(Number.isFinite)||r<=0)return false;
 let changed=false,recovered=0;const result=[];
 for(const wall of game.state.walls){
  const bounds=game.api.wallGeometry(wall.pts),pad=r+wall.thick/2;
  if(bounds.maxX<Math.min(a.x,b.x)-pad||bounds.minX>Math.max(a.x,b.x)+pad||bounds.maxY<Math.min(a.y,b.y)-pad||bounds.minY>Math.max(a.y,b.y)+pad){result.push(wall);continue;}
  let touched=false,total=0,piece=[],pieces=[];
  const finish=()=>{if(piece.length>=2)pieces.push(piece);piece=[];};
  for(let i=1;i<wall.pts.length;i++){
   const p=wall.pts[i-1],q=wall.pts[i],length=Math.hypot(q.x-p.x,q.y-p.y);total+=length;if(length<1e-8)continue;
   const point=t=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t}),cuts=eraserIntervals(p,q,a,b,pad);
   let start=0;
   const keep=(lo,hi)=>{if(hi-lo<1e-8)return;const from=point(lo),to=point(hi);if(piece.length&&Math.hypot(piece.at(-1).x-from.x,piece.at(-1).y-from.y)>.001)finish();if(!piece.length)piece.push(from);piece.push(to);};
   for(const [lo,hi] of cuts){touched=true;keep(start,lo);finish();start=hi;}
   keep(start,1);
  }
  finish();
  if(!touched){result.push(wall);continue;}
  changed=true;
  // A closed stroke can wrap across its first point; retain that connected piece.
  if(pieces.length>1){const first=pieces[0],last=pieces.at(-1);if(Math.hypot(first[0].x-last.at(-1).x,first[0].y-last.at(-1).y)<.001){pieces[0]=last.concat(first.slice(1));pieces.pop();}}
  let kept=0;const firstPiece=result.length;
  for(const pts of pieces){
   let length=0;for(let i=1;i<pts.length;i++)length+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
   if(length<2||total<=0)continue;
   const fraction=length/total;kept+=fraction;result.push({...wall,pts,hp:wall.hp*fraction,maxHp:wall.maxHp*fraction,eraseInk:(wall.eraseInk||0)*fraction,closed:false});
  }
  if(!options.enemy)game.api.eraseWallReaction(wall,result.slice(firstPiece),a,b,r,(wall.eraseInk||0)*Math.max(0,1-kept));
  if(!options.enemy&&wall.eraseInk>0&&wall.maxHp>0)recovered+=wall.eraseInk*Math.max(0,1-kept)*game.api.clamp(wall.hp/wall.maxHp,0,1)*game.api.clamp(game.state.stats.eraseRefund??.25,0,.6);
 }
 if(changed){game.state.walls=result;game.state.stats.ink=Math.min(game.state.stats.maxInk,game.state.stats.ink+recovered);game.api.updateUI();}
 if(!options.enemy){
  const ground=eraseBurningGround(a,b,r),plague=game.api.erasePlaguefire(a,b,r);
  if((ground||plague)&&game.state.paper.clock>=(game.state.paper.firebreakCueAt??0)){game.state.paper.firebreakCueAt=game.state.paper.clock+.7;game.api.floatText(b.x,b.y-20,'FIREBREAK!','#a56930');}
  changed=ground||plague||changed;
  changed=game.api.eraseProjectiles(a,b,r)||changed;
  changed=game.api.eraseDoodlePath(a,b,r)||changed;
  for(const e of [...game.state.enemies])if(e.type==='scrubber'&&!game.api.underPaper(e)&&e.hp>0){
   const touches=game.api.pointSegDist(e.x,e.y,a.x,a.y,b.x,b.y)<=r+e.r*.7;
   if(!touches){e.eraseBrushInside=false;continue;}
   // Many pointer samples within one rub still remove just one chunk.
   if(!e.eraseBrushInside)changed=game.api.eraseScrubber(e)||changed;
   e.eraseBrushInside=true;
  }
 }
 return changed;
}

function nearestWallHit(e){
  for(const wall of game.state.walls){
    const bounds=game.api.wallGeometry(wall.pts),radius=e.r+wall.thick/2;
    if(e.x<bounds.minX-radius||e.x>bounds.maxX+radius||e.y<bounds.minY-radius||e.y>bounds.maxY+radius)continue;
    for(let i=1;i<wall.pts.length;i++){
      const segment=bounds.segments[i-1];
      if(e.x<segment.minX-radius||e.x>segment.maxX+radius||e.y<segment.minY-radius||e.y>segment.maxY+radius)continue;
      const a=segment.a,b=segment.b;
      if(game.api.pointSegDist(e.x,e.y,a.x,a.y,b.x,b.y)<e.r+wall.thick/2)return {wall,seg:i};
    }
  }
  return null;
}

function wallNear(x,y,r){
  for(const w of game.state.walls){
    const b=game.api.wallGeometry(w.pts);
    if(x<b.minX-r||x>b.maxX+r||y<b.minY-r||y>b.maxY+r)continue;
    for(const p of w.pts)if(game.api.withinRadius(x,y,p.x,p.y,r))return true;
  }
  return false;
}

// Ground coordinates stay on the page; vertical height is presentation only.
let napalm=[],landingPuffs=[];
function resetLaunchEffects(){napalm=[];landingPuffs=[]}
function landingPoint(e,x,y,inferno){
 const {W,H,player}=game.state,margin=e.r+24,top=e.r+76,bottom=Math.max(top,H-e.r-64);
 const length=Math.min(240,140+game.state.inks.repulsion*10+(inferno?50:0));
 const direction=Math.atan2(e.y-y,e.x-x),clear=player.r+e.r+75;
 let best=null,score=-Infinity;
 for(let i=0;i<32;i++){
  const angle=direction+i*Math.PI/16;
  const tx=game.api.clamp(e.x+Math.cos(angle)*length,margin,Math.max(margin,W-margin));
  const ty=game.api.clamp(e.y+Math.sin(angle)*length,top,bottom);
  if(Math.hypot(tx-player.x,ty-player.y)<clear)continue;
  const distance=Math.hypot(tx-e.x,ty-e.y),value=distance+Math.cos(angle-direction)*45;
  if(value>score){score=value;best={x:tx,y:ty}}
 }
 return best;
}
function launchEnemy(e,x,y,inferno=false){
 if(e.hp<=0||e.flight||game.api.underPaper(e))return false;
 if(isInkBoss(e)){game.api.animateEnemyAction(e,'slam');return false}
 const target=landingPoint(e,x,y,inferno);if(!target)return false;
 e.flight={startX:e.x,startY:e.y,targetX:target.x,targetY:target.y,age:0,duration:inferno?1.05:.85,
  height:Math.min(inferno?100:76,Math.max(16,Math.min(e.y,target.y)-e.r*2-50)),spin:target.x<e.x?-1:1,
  damage:(inferno?26:16)+game.state.inks.repulsion*3,stun:inferno?1.6:1.2};
 game.api.floatText(e.x,e.y,'WHOOSH!','#36786b');return true;
}
function flingBossFriend(e,target){
 if(e.hp<=0||e.flight||isInkBoss(e))return false;
 e.flight={startX:e.x,startY:e.y,targetX:target.x,targetY:target.y,age:0,duration:.65,
  height:Math.min(90,Math.max(16,Math.min(e.y,target.y)-e.r*2-50)),spin:target.x<e.x?-1:1,damage:0,stun:0,bossThrown:true};
 game.api.floatText(e.x,e.y,'WHEEEE!','#a55b39');return true;
}
function enemyFlightHeight(e){const f=e.flight;return f?Math.sin(Math.min(1,f.age/f.duration)*Math.PI)*f.height:0}
function updateEnemyFlight(e,dt){
 const f=e.flight;if(!f)return false;
 f.age=Math.min(f.duration,f.age+dt);const t=f.age/f.duration;
 e.x=f.startX+(f.targetX-f.startX)*t;e.y=f.startY+(f.targetY-f.startY)*t;
 if(t>=1){
  // Re-evaluate after a resize so landings still miss Stevie and the paper edges.
  const target=landingPoint(e,e.x,e.y,false);
  const margin=e.r+24;e.x=game.api.clamp(e.x,margin,Math.max(margin,game.state.W-margin));e.y=game.api.clamp(e.y,e.r+76,Math.max(e.r+76,game.state.H-e.r-64));
  if(Math.hypot(e.x-game.state.player.x,e.y-game.state.player.y)<game.state.player.r+e.r+75&&target){e.x=target.x;e.y=target.y}
  delete e.flight;if(f.stun>0)e.stun=Math.max(e.stun,f.stun);if(f.damage>0)game.api.dealDamage(e,f.damage,'physical');
  landingPuffs.push({x:e.x,y:e.y,r:e.r,age:0});if(landingPuffs.length>16)landingPuffs.shift();
  if(!f.bossThrown)game.api.animateEnemyAction(e,'slam');game.api.burst(e.x,e.y,'#9b8866',6);game.api.floatText(e.x,e.y,f.bossThrown?'GO GET HIM!':'THUD!','#766245');
  if(e.hp<=0)game.api.killEnemy(e);
 }
 return true;
}
function leaveNapalm(wall){
 const points=[],bounds=game.api.wallGeometry(wall.pts);
 // Sample evenly by distance so a long two-point stroke leaves a real trail.
 for(const seg of bounds.segments){const length=Math.hypot(seg.b.x-seg.a.x,seg.b.y-seg.a.y),count=Math.max(1,Math.ceil(length/24));
  for(let i=0;i<count;i++){const t=i/count;points.push({x:seg.a.x+(seg.b.x-seg.a.x)*t,y:seg.a.y+(seg.b.y-seg.a.y)*t});if(points.length>=64)break}if(points.length>=64)break}
 points.push({...wall.pts.at(-1)});
 napalm.push({points,minX:bounds.minX,maxX:bounds.maxX,minY:bounds.minY,maxY:bounds.maxY,age:0,life:4,r:18,dps:(10+game.state.inks.fire*4)*(game.state.synergies.has('INFERNO')?1.25:1)});
 if(napalm.length>12)napalm.shift();
}
function eraseBurningGround(a,b,r){
 let changed=false;
 for(const p of napalm)changed=game.api.clearFirePatch(p,a,b,r,{minX:p.minX-p.r,maxX:p.maxX+p.r,minY:p.minY-p.r,maxY:p.maxY+p.r},(x,y)=>p.points.some(q=>Math.hypot(q.x-x,q.y-y)<=p.r))||changed;
 if(changed)game.api.burst(b.x,b.y,'#cbbba4',4);return changed;
}
function updateLaunchEffects(dt){
 for(const p of napalm)p.age+=dt;napalm=napalm.filter(p=>p.age<p.life);
 for(const p of landingPuffs)p.age+=dt;landingPuffs=landingPuffs.filter(p=>p.age<.45);
 for(const e of game.state.enemies){
  if(e.hp<=0||e.flight||game.api.abilityImmune(e))continue;
  let dps=0;for(const patch of napalm)if(!game.api.firePatchCleared(patch,e.x,e.y)&&e.x>=patch.minX-patch.r-e.r&&e.x<=patch.maxX+patch.r+e.r&&e.y>=patch.minY-patch.r-e.r&&e.y<=patch.maxY+patch.r+e.r&&patch.points.some(p=>(p.x-e.x)**2+(p.y-e.y)**2<(patch.r+e.r)**2))dps=Math.max(dps,patch.dps);
  if(dps){e.burn=Math.max(e.burn,.5);e.burnDps=Math.max(e.burnDps,dps)}
 }
}
function moveLaunchEffects(dx,dy){
 for(const patch of napalm){game.api.moveFirePatch(patch,dx,dy);patch.minX+=dx;patch.maxX+=dx;patch.minY+=dy;patch.maxY+=dy;for(const p of patch.points){p.x+=dx;p.y+=dy}}
 for(const p of landingPuffs){p.x+=dx;p.y+=dy}
 for(const e of game.state.enemies)if(e.flight){e.flight.startX+=dx;e.flight.targetX+=dx;e.flight.startY+=dy;e.flight.targetY+=dy}
}
function drawLaunchGround(){
 const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();
 for(const patch of napalm){
  ctx.save();game.api.clipFirePatch(ctx,patch);ctx.globalAlpha=Math.min(1,(patch.life-patch.age)*2);ctx.lineWidth=2;
  patch.points.forEach((p,i)=>{
   ctx.fillStyle='#72523d';ctx.beginPath();ctx.ellipse(p.x,p.y,patch.r,6,0,0,Math.PI*2);ctx.fill();
   const h=reduced?12:12+Math.sin(patch.age*11+i*2.4)*5;
   ctx.beginPath();ctx.moveTo(p.x-6,p.y);ctx.quadraticCurveTo(p.x-10,p.y-9,p.x-2,p.y-h);ctx.quadraticCurveTo(p.x+5,p.y-7,p.x+6,p.y);ctx.closePath();ctx.fillStyle='#ee8036';ctx.fill();ctx.strokeStyle='#97452a';ctx.stroke();
   ctx.fillStyle='#ffdd77';ctx.beginPath();ctx.moveTo(p.x-3,p.y);ctx.lineTo(p.x,p.y-h*.65);ctx.lineTo(p.x+3,p.y);ctx.fill();
  });ctx.restore();
 }
 for(const e of game.state.enemies)if(e.flight){
  if(e.flight.bossThrown){ctx.save();ctx.strokeStyle='#b76b42';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(e.flight.targetX,e.flight.targetY,e.r+9,0,Math.PI*2);ctx.stroke();ctx.restore()}
  const h=enemyFlightHeight(e),scale=1-h/180;ctx.save();ctx.globalAlpha=.18+h/600;ctx.fillStyle='#514531';ctx.beginPath();ctx.ellipse(e.x,e.y+e.r*.7,e.r*scale,e.r*.35*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 for(const p of landingPuffs){const t=p.age/.45;ctx.save();ctx.globalAlpha=(1-t)*.7;ctx.strokeStyle='#948363';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,p.r+24*t,5+10*t,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
}
function launchEffectsSnapshot(){return {napalm:napalm.map(p=>({...p,points:p.points.map(q=>({...q}))})),landings:landingPuffs.map(p=>({...p}))}}

function damageWall(wall,amount,x,y){
  if(amount>0&&wall.hp>0)game.api.playSound('wall');
  if(wall.hp<=0||!game.state.walls.includes(wall))return;
  wall.hp-=amount;
  if(wall.hp<=0){
    if(game.state.stats.explode||game.state.inks.blast>0){
      let radius=70+game.state.inks.blast*12;
      let dmg=35+game.state.inks.blast*20;

      if(game.state.synergies.has('Heavy Artillery')){
        radius+=wall.thick*3;
        dmg+=wall.thick*2.2;
      }
      if(game.state.synergies.has('Demolition Grid')&&wall.intersections>0){
        radius+=30+wall.intersections*8;
        dmg+=25+wall.intersections*10;
      }
      game.api.animateWallExplosion(wall,x,y,radius,game.state.synergies.has('INFERNO'));

      if(game.state.synergies.has('Napalm Scribbles')||game.state.synergies.has('INFERNO'))leaveNapalm(wall);
      for(const e of game.state.enemies){
        const near=wall.pts.some(p=>game.api.withinRadius(p.x,p.y,e.x,e.y,radius));
        if(near){
          if(game.state.synergies.has('Singularity Ink')&&!game.api.isFirstBoss(e)){
            const dx=x-e.x,dy=y-e.y,m=Math.hypot(dx,dy)||1;
            game.api.moveEnemySafely(e,dx/m*24,dy/m*24);
          }
          if(game.state.synergies.has('Cannon Ink')||game.state.synergies.has('INFERNO')){
            launchEnemy(e,x,y,game.state.synergies.has('INFERNO'));
          }
          game.api.dealDamage(e,dmg,'blast');
          if(game.state.synergies.has('INFERNO')||game.state.synergies.has('Napalm Scribbles')){
            e.burn=Math.max(e.burn,2.8);
            e.burnDps=Math.max(e.burnDps,10+game.state.inks.fire*4);
          }
        }
      }
      game.api.burst(x,y,game.state.synergies.has('INFERNO')?'#ff8b3d':'#d8a72e',game.state.synergies.has('INFERNO')?28:18);
    }
    game.state.walls=game.state.walls.filter(w=>w!==wall);
  }
}

function repairTouchedWalls(points,excluded=null){
  if(!game.state.stats.repairDraw)return;
  for(const w of game.state.walls){
    if(excluded?.has(w))continue;
    let touched=false;
    outer: for(const p of points){
      for(let i=1;i<w.pts.length;i++){
        if(game.api.pointSegDist(p.x,p.y,w.pts[i-1].x,w.pts[i-1].y,w.pts[i].x,w.pts[i].y)<10){touched=true;break outer}
      }
    }
    if(touched){
      const before=w.hp;
      w.hp=Math.min(w.maxHp,w.hp+game.state.stats.repairDraw);
      if(game.state.synergies.has('Blood Patch')){
        const repaired=Math.max(0,w.hp-before);
        game.api.healStevie(repaired*.08);
      }
    }
  }
}

function canStartStroke(){const s=game.state.stats;return game.api.wobbleInfiniteInk?.()||(s.firstFree&&!s.firstStrokeUsed)||s.ink+(s.freehandLevel>0?s.freehandBank:0)>=6;}

const stitchReach=16;
function stitchFactor(count){return [.75,.5,.25][count-1]||0;}
function stitchEndpoint(point,excluded=new Set()){
 let best=null,distance=stitchReach;
 for(const wall of game.state.walls){
  if(excluded.has(wall)||wall.closed||wall.hp<=0||wall.life<=0||wall.pts.length<2)continue;
  for(const index of [0,wall.pts.length-1]){const p=wall.pts[index],d=Math.hypot(point.x-p.x,point.y-p.y);if(d<=distance){distance=d;best={wall,index,point:{...p}};}}
 }
 return best;
}
function resizeConnectorHp(t,closed=false){
 const w=t.base,newHp=game.api.wallHpForLength(t.length,closed,t.newIntersections)*t.factor,maxHp=t.oldMaxHp+newHp;
 w.hp+=maxHp-w.maxHp;w.maxHp=maxHp;t.connectorHp=newHp;
 for(const copy of t.copies)if(game.state.walls.includes(copy)){
  const max=newHp*game.catalog.balance.copyDurability;copy.hp=Math.max(0,copy.hp+max-copy.maxHp);copy.maxHp=max;
  if(max===0||copy.hp<=0)game.state.walls=game.state.walls.filter(a=>a!==copy);
 }
}
function joinStitchStart(t,end,reverse=false){
 const fresh=t.base,old=end.wall;
 if(reverse)t.strokePts=[...t.strokePts].reverse();
 const prefix=end.index===old.pts.length-1?[...old.pts]:[...old.pts].reverse();
 t.startCount=old.stitchCount||0;t.factor=stitchFactor(t.startCount+1);t.oldMaxHp=old.maxHp;t.oldIntersections=old.intersections||0;t.prefix=prefix;
 const hp=game.api.wallHpForLength(t.length,false,t.newIntersections)*t.factor,damage=fresh.maxHp-fresh.hp;
 old.hp+=Math.max(0,hp-damage);old.maxHp+=hp;old.eraseInk=(old.eraseInk||0)+(fresh.eraseInk||0);
 old.life=Math.min(old.life,fresh.life);old.maxLife=Math.min(old.maxLife,fresh.maxLife);
 old.pts=prefix.concat(t.strokePts.slice(1));old.closed=false;old.intersections=t.oldIntersections+t.newIntersections;
 old.stitchCount=t.startCount+1;old.stitchPoints=[...(old.stitchPoints||[]),{...end.point}];
 game.state.walls=game.state.walls.filter(w=>w!==fresh);t.base=old;t.connectorHp=hp;
 for(const copy of t.copies)copy.stitchCount=old.stitchCount;
 resizeConnectorHp(t);
}
function finishStitch(t){
 if(t.infinite)return;
 if(!game.state.stats.doodleStitch)return;
 const excluded=new Set([t.base,...t.copies]),last=t.strokePts.at(-1),previous=t.strokePts.at(-2);
 let end=stitchEndpoint(last,excluded);
 // An extension can close the original open wall, but never snap to its own tip.
 if(t.prefix){const p=t.base.pts[0],d=Math.hypot(last.x-p.x,last.y-p.y);if(d<=stitchReach&&(!end||d<Math.hypot(last.x-end.point.x,last.y-end.point.y)))end={wall:t.base,index:0,point:{...p}};}
 if(!end)return;
 const extra=Math.hypot(previous.x-end.point.x,previous.y-end.point.y)-Math.hypot(previous.x-last.x,previous.y-last.y),length=t.length+extra;
 if(length<8)return;
 const cost=Math.max(6,length*game.state.stats.lineCost),delta=t.free?0:Math.max(0,cost-t.cost),bank=game.state.stats.freehandLevel>0?game.state.stats.freehandBank:0;
 if(delta>game.state.stats.ink+bank+1e-8)return; // A snapped bridge must be affordable too.
 const used=Math.min(delta,bank),paid=delta-used;game.state.stats.freehandBank-=used;game.state.stats.ink=Math.max(0,game.state.stats.ink-paid);t.paid+=paid;t.base.eraseInk+=paid;t.cost=Math.max(t.cost,cost);t.length=length;
 t.strokePts=t.strokePts.map((p,i)=>i===t.strokePts.length-1?{...end.point}:p);
 t.base.pts=t.prefix?t.prefix.concat(t.strokePts.slice(1)):t.strokePts;
 resizeConnectorHp(t);
 if(!t.prefix){joinStitchStart(t,end,true);return;}
 const w=t.base,other=end.wall;
 if(other===w){w.stitchPoints.push({...end.point});return;}
 const tail=end.index===0?[...other.pts]:[...other.pts].reverse();
 w.pts=w.pts.concat(tail.slice(1));w.hp+=other.hp;w.maxHp+=other.maxHp;t.oldMaxHp+=other.maxHp;t.oldIntersections+=other.intersections||0;
 w.sparkReadyAt=Math.max(w.sparkReadyAt||0,other.sparkReadyAt||0);w.life=Math.min(w.life,other.life);w.maxLife=Math.min(w.maxLife,other.maxLife);w.eraseInk+=(other.eraseInk||0);
 w.stitchCount=t.startCount+(other.stitchCount||0)+1;t.factor=stitchFactor(w.stitchCount);w.intersections=t.oldIntersections+t.newIntersections;
 w.stitchPoints=[...(w.stitchPoints||[]),...(other.stitchPoints||[]),{...end.point}];
 game.state.walls=game.state.walls.filter(a=>a!==other);resizeConnectorHp(t);
 for(const copy of t.copies)copy.stitchCount=w.stitchCount;
}
function closeCreatedWall(t){
 const w=t.base;w.closed=game.api.dist(w.pts[0].x,w.pts[0].y,w.pts.at(-1).x,w.pts.at(-1).y)<22&&w.pts.length>6;
 resizeConnectorHp(t,w.closed);
 if(w.hp<=0)game.state.walls=game.state.walls.filter(a=>a!==w);
}

let liveStroke=null;
function wallHpForLength(length,closed=false,intersections=0){return game.state.stats.wallHp*(length/180)*(closed?game.state.stats.closedBonus:1)*(1+intersections*game.state.stats.intersectBonus);}
function createWall(points,options={}){
  if(points.length<2)return;
  const start=game.state.stats.doodleStitch&&!game.api.wobbleInfiniteInk?.()?stitchEndpoint(points[0]):null;
  if(start)points=points.map((p,i)=>i===0?{...start.point}:{...p});
  let length=0;
  for(let i=1;i<points.length;i++)length+=game.api.dist(points[i-1].x,points[i-1].y,points[i].x,points[i].y);
  if(length<8)return;

  const infinite=game.api.wobbleInfiniteInk?.();
  const firstStrokeFree=infinite||game.state.stats.firstFree&&!game.state.stats.firstStrokeUsed;
  const bank=!infinite&&game.state.stats.freehandLevel>0?game.state.stats.freehandBank:0;
  const available=Math.max(0,game.state.stats.ink)+bank;
  // Every paid stroke costs at least six ink. Never manufacture a two-point
  // wall when the available ink cannot pay for those points.
  if(!firstStrokeFree&&available<6){game.api.setMsg('Let your ink refill to 6 before drawing.');return;}
  if(!firstStrokeFree&&length*game.state.stats.lineCost>available){
    let remaining=available/game.state.stats.lineCost;
    const clipped=[points[0]];
    for(let i=1;i<points.length&&remaining>0;i++){
      const a=points[i-1],b=points[i],segment=game.api.dist(a.x,a.y,b.x,b.y);
      if(segment<=remaining){clipped.push(b);remaining-=segment;}
      else{const t=remaining/segment;clipped.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});remaining=0;}
    }
    points=clipped;length=0;
    for(let i=1;i<points.length;i++)length+=game.api.dist(points[i-1].x,points[i-1].y,points[i].x,points[i].y);
    if(points.length<2||length<8)return;
  }
  const cost=Math.max(6,length*game.state.stats.lineCost);
  const bankUsed=firstStrokeFree?0:Math.min(cost,bank);
  const actualPaid=firstStrokeFree?0:Math.max(0,cost-bankUsed);
  game.state.stats.freehandBank-=bankUsed;
  game.state.stats.ink=infinite?game.state.stats.maxInk:Math.max(0,game.state.stats.ink-actualPaid);
  game.api.playSound('pencil');
  game.state.stats.strokeCount++;
  game.state.stats.firstStrokeUsed=true;

  const closed=!options.live&&!start&&game.api.dist(points[0].x,points[0].y,points.at(-1).x,points.at(-1).y)<22&&points.length>6;
  const intersections=game.api.countIntersections(points,start?new Set([start.wall]):null);

  // Longer doodles are sturdier. Tiny lines are quick emergency barriers;
  // long strokes cost more ink but can take much more punishment.
  const hp=game.api.wallHpForLength(length,closed,intersections);
  const life=infinite?Math.min(10,game.state.stats.wallLife):game.state.stats.wallLife;
  const base={eraseInk:actualPaid,...(infinite?{wobbleBumper:true,wobbleDraft:!!options.live}:{}),pts:points.map(p=>({...p})),hp,maxHp:hp,thick:game.state.stats.lineWidth,life,maxLife:life,closed,intersections};
  game.state.walls.push(base);

  const copies=[];
  // One gesture creates one wall, even with retired flags in a legacy loadout.
  if(infinite){const bumpers=game.state.walls.filter(w=>w.wobbleBumper);if(bumpers.length>40){const remove=new Set(bumpers.slice(0,bumpers.length-40));game.state.walls=game.state.walls.filter(w=>!remove.has(w))}}
  const t={base,copies,free:firstStrokeFree,infinite,cost,paid:actualPaid,length,strokePts:base.pts,prefix:null,oldMaxHp:0,oldIntersections:0,newIntersections:intersections,factor:1};
  if(start)joinStitchStart(t,start);
  if(!options.live){finishStitch(t);closeCreatedWall(t);finishWallEffects(t.base,t.paid,copies,t.strokePts);game.api.collectDoodleScrap(t.strokePts,t.paid);}
  game.api.updateUI();return t;
}
function chargeFreehand(actualPaid){
  if(game.state.stats.freehandLevel>0&&actualPaid>=5){
    game.state.stats.freehandCharge+=actualPaid;
    if(game.state.stats.freehandCharge>=game.state.stats.freehandThreshold&&game.state.stats.freehandBank<=0){
      game.state.stats.freehandCharge-=game.state.stats.freehandThreshold;
      game.state.stats.freehandBank=game.state.stats.freehandBankSize;
      game.api.setMsg('FREE INK READY — '+game.state.stats.freehandBankSize+' ink banked!');
      game.api.floatText(game.state.player.x,game.state.player.y-55,'FREE INK!','#8456c9');
    }
  }

}
function finishWallEffects(base,actualPaid,copies=[],points=base.pts){if(base.wobbleBumper){base.wobbleDraft=false;return}chargeFreehand(actualPaid);
  game.api.repairTouchedWalls(points,new Set([base,...copies]));

  game.api.cutWobbleStroke(points);
  game.api.cutTwiceyStroke(points);
  game.api.connectDoodleDots(points);
  if(base.closed)rewardClosedLoop(base,actualPaid);
}
// A held stroke owns real wall objects. Growing changes those objects, rather
// than replacing them, so combat damage and remaining lifetime are retained.
function updateLiveWall(points){
 if(!liveStroke){liveStroke=createWall(points,{live:true})||null;return liveStroke?.strokePts||points;}
 const t=liveStroke,w=t.base;
 if((!game.state.walls.includes(w)||w.hp<=0)&&!game.state.enemies.some(e=>game.api.isWobbleBoss(e)&&e.hp>0&&game.api.wobblePhase(e)===1))return null;
 let remaining=t.free?Infinity:(t.cost+Math.max(0,game.state.stats.ink)+(game.state.stats.freehandLevel>0?game.state.stats.freehandBank:0))/game.state.stats.lineCost;
 const clipped=[points[0]];let length=0;
 for(let i=1;i<points.length&&remaining>0;i++){
  const a=points[i-1],b=points[i],d=game.api.dist(a.x,a.y,b.x,b.y);if(d<=0)continue;
  const used=Math.min(d,remaining);clipped.push({x:a.x+(b.x-a.x)*used/d,y:a.y+(b.y-a.y)*used/d});length+=used;remaining-=used;
 }
 if(length<=t.length)return t.strokePts;
 const cost=Math.max(6,length*game.state.stats.lineCost),delta=t.free?0:Math.max(0,cost-t.cost),bank=game.state.stats.freehandLevel>0?Math.min(delta,game.state.stats.freehandBank):0,paid=delta-bank;
 game.state.stats.freehandBank-=bank;game.state.stats.ink=t.infinite?game.state.stats.maxInk:Math.max(0,game.state.stats.ink-paid);
 t.cost=cost;t.paid+=paid;t.length=length;w.eraseInk+=paid;
 const excluded=new Set([w,...t.copies]);t.newIntersections=Math.max(t.newIntersections,game.api.countIntersections(clipped,excluded));
 t.strokePts=clipped;w.pts=t.prefix?t.prefix.concat(clipped.slice(1)):clipped;w.intersections=t.oldIntersections+t.newIntersections;resizeConnectorHp(t);

 for(let c=0;c<t.copies.length;c++){
  const copy=t.copies[c];if(!game.state.walls.includes(copy))continue;
  copy.pts=clipped.map((p,i)=>{const a=i<clipped.length-1?p:clipped[i-1],b=i<clipped.length-1?clipped[i+1]:p,dx=b.x-a.x,dy=b.y-a.y,m=Math.hypot(dx,dy)||1;return {x:p.x+dy/m*12*(c+1),y:p.y-dx/m*12*(c+1)}});

 }
 game.api.updateUI();return t.strokePts;
}
function finishLiveWall(){
 const t=liveStroke;liveStroke=null;if(!t)return false;
 const w=t.base;if(game.state.walls.includes(w)&&w.hp>0){
  finishStitch(t);closeCreatedWall(t);finishWallEffects(t.base,t.paid,t.copies,t.strokePts);game.api.collectDoodleScrap(t.strokePts,t.paid);game.api.updateUI();
 }else{chargeFreehand(t.paid);game.api.cutWobbleStroke(t.strokePts);}
 return true;
}
function cancelLiveWall(){const t=liveStroke;liveStroke=null;if(t)chargeFreehand(t.paid);}
function liveWallActive(){return liveStroke!==null;}

function applyInkContact(e,dt,wall=null){
  if(game.api.underPaper(e))return 0;
  if(game.api.abilityImmune(e))return game.state.stats.wallDamage;
  let dps=game.state.stats.wallDamage;

  if(game.state.synergies.has('Ring of Fire')&&wall&&wall.closed){
    e.burn=Math.max(e.burn,2.3);
    e.burnDps=Math.max(e.burnDps,8+game.state.inks.fire*3);
  }

  if(game.state.synergies.has('Needlepoint')&&game.state.stacks['Fine Tip']){
    e.poison=Math.min(6,e.poison+dt*(1.8+game.state.inks.poison*.85));
    e.poisonDps=Math.max(e.poisonDps,4+game.state.inks.poison*3);
  }

  if(game.state.synergies.has('Event Horizon')&&game.api.gravityWallHit(e)&&game.state.inks.void>0){
    const c=.006*game.state.inks.void*dt*60;
    if(Math.random()<c){
      if(e.type==='boss'||e.type==='eraser'||game.catalog.enemyDefs[e.type]?.boss)game.api.dealDamage(e,65+game.state.inks.void*30,'void');
      else game.api.dealDamage(e,e.hp,'void');
      game.api.burst(e.x,e.y,'#46345e',14);
    }
  }

  if(game.state.inks.chaos>0)applyChaosContact(e,dt);

  if(game.state.inks.fire>0){
    if(e.immunity!=='fire')game.api.playSound('fire');
    e.burn=Math.max(e.burn,1.5+game.state.inks.fire*.6);
    e.burnDps=Math.max(e.burnDps,3+game.state.inks.fire*3);
  }
  if(game.state.inks.poison>0){
    if(e.immunity!=='poison')game.api.playSound('poison');
    e.poison=Math.min(6,e.poison+dt*(1+game.state.inks.poison*.55));
    e.poisonDps=2+game.state.inks.poison*2.5;
  }
  game.api.applyFrostContact(e,dt);
  if(wall?.rockCharge?.life>0&&e.chainCd<=0){
    const c=wall.rockCharge;if(Math.hypot(e.x-c.x,e.y-c.y)<=48+e.r)game.api.chainLightning(e,c.level);
  }
  if(game.state.inks.electric>0&&e.chainCd<=0){
    game.api.chainLightning(e,game.state.inks.electric);
  }
  game.api.applyVampireContact(e,dt);
  if(game.state.inks.repulsion>0)applyRepulsionContact(e,dt);
  if(game.state.inks.void>0&&e.hp>0){
    const n=game.state.inks.void,t=remainingInkTuning(n);
    game.api.dealDamage(e,t.voidDps*dt,'void');
    if(e.hp>0&&!isInkBoss(e)&&e.immunity!=='void'&&e.hp<=e.maxHp*t.voidExecute)game.api.dealDamage(e,e.hp,'void');
  }
  return dps;
}

const contactCharges=new WeakMap();
function remainingInkTuning(n){return {repulsionDamage:8+4*n,repulsionPush:35+5*n,repulsionInterval:.8,voidDps:4+2*n,voidExecute:Math.min(.3,.12+.025*n),chaosInterval:Math.max(.45,1.4/(1+.18*(n-1))),chaosDamage:2+n}}
function isInkBoss(e){return e.type==='boss'||e.type==='eraser'||game.catalog.enemyDefs[e.type]?.boss}
function contactPulses(e,kind,dt,interval){
  let data=contactCharges.get(e);if(!data){data={};contactCharges.set(e,data)}
  data[kind]=(data[kind]||0)+dt;
  const count=Math.floor((data[kind]+1e-9)/interval);data[kind]-=count*interval;return count;
}
function applyRepulsionContact(e,dt){
  if(game.api.abilityImmune(e))return;
  const t=remainingInkTuning(game.state.inks.repulsion),boss=isInkBoss(e),scale=boss?.5:1;
  const pulses=contactPulses(e,'repulsion',dt,t.repulsionInterval);
  for(let i=0;i<pulses&&e.hp>0;i++){
    const dx=e.x-game.state.player.x,dy=e.y-game.state.player.y,m=Math.hypot(dx,dy)||1;
    game.api.dealDamage(e,t.repulsionDamage,'physical');
    game.api.animateInkAccent(e,'repulsion',dx,dy);
    game.api.moveEnemySafely(e,dx/m*t.repulsionPush*scale,dy/m*t.repulsionPush*scale);
    e.stun=Math.max(e.stun,.12*scale);
    if(game.state.synergies.has('Rail Ink'))e.charged=Math.max(e.charged,1.1);
  }
}
function applyChaosContact(e,dt){
  if(game.api.abilityImmune(e))return;
  const n=game.state.inks.chaos,t=remainingInkTuning(n);
  const pulses=contactPulses(e,'chaos',dt,t.chaosInterval);
  for(let i=0;i<pulses&&e.hp>0;i++){
    const kind=game.api.pick(['fire','frost','electric','poison','blast','vampire','gravity','repulsion','void']);
    game.api.animateInkAccent(e,'chaos',0,0,kind);game.api.applyOneInk(kind,e,dt,true);
    if(e.hp>0)game.api.dealDamage(e,t.chaosDamage,kind==='void'?'void':'physical');
  }
}

function applyOneInk(kind,e,dt,chaos=false){
  if(game.api.abilityImmune(e))return;
  if(game.api.underPaper(e))return;
  const n=chaos?Math.max(1,game.state.inks.chaos):1;
  if(kind==='fire'&&e.immunity!=='fire'){e.burn=Math.max(e.burn,1.8);e.burnDps=Math.max(e.burnDps,6+n)}
  if(kind==='frost'&&e.immunity!=='frost')e.freeze=Math.max(e.freeze,(.3+Math.min(.3,.03*n))*(isInkBoss(e)?.5:1));
  if(kind==='electric')game.api.chainLightning(e,Math.max(1,Math.ceil(n/2)));
  if(kind==='poison'&&e.immunity!=='poison'){e.poison=Math.min(6,e.poison+1);e.poisonDps=Math.max(e.poisonDps,5+n)}
  if(kind==='repulsion'){
    const dx=e.x-game.state.player.x,dy=e.y-game.state.player.y,m=Math.hypot(dx,dy)||1;
    game.api.animateInkAccent(e,'repulsion',dx,dy);game.api.moveEnemySafely(e,dx/m*30*(isInkBoss(e)?.5:1),dy/m*30*(isInkBoss(e)?.5:1));
  }
  if(kind==='void')game.api.dealDamage(e,12+3*n,'void');
  if(kind==='blast')for(const target of game.state.enemies){if(target.hp>0&&game.api.withinRadius(target.x,target.y,e.x,e.y,65+3*n))game.api.dealDamage(target,10+3*n,'blast')}
  if(kind==='vampire'){
    const hp=e.hp;game.api.dealDamage(e,8+2*n,'vampire');const before=game.state.player.hp;
    if(game.state.player.hp>0)game.api.healStevie(Math.max(0,Math.min(hp,hp-e.hp))*.25);
    game.api.animateLeech(e,game.state.player.hp-before);
  }
  if(kind==='gravity'&&!game.api.isFirstBoss(e)){const p=game.api.nearestWallPoint(e.x,e.y,42);if(p){const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;game.api.moveEnemySafely(e,dx/d*8,dy/d*8)}}
}

function electricTuning(level){
  const power=Math.min(level,6)+Math.max(0,level-6)*.35;
  return {damage:3+1.2*power,count:Math.min(6,1+Math.floor(level/3)),range:Math.min(190,110+level*12),radius:360,cooldown:Math.max(.8,1.15-level*.025),stun:Math.min(.18,.09+level*.01),fieldDps:2+power*.9};
}
function chainLightning(source,level){
  if(source.hp<=0||game.api.abilityImmune(source)||game.api.underPaper(source)||(source.chainCd||0)>0)return;
  const t=electricTuning(level);let {count,range}=t,mult=1;
  if(game.state.synergies.has('Cryoshock')&&source.freeze>0){range+=25;count++;mult+=.15}
  if(game.state.synergies.has('Tesla Well')&&game.api.gravityWallHit(source)){range+=20;count++;mult+=.1}
  if(game.state.synergies.has('THE STORM')){range+=30;count++;mult+=.15}
  count=Math.min(8,count);range=Math.min(220,range);
  const nearby=[],visited=new Set([source]);let from=source;
  for(let hop=0;hop<count;hop++){
    let next=null,best=range*range;
    for(const e of game.state.enemies){
      if(e.hp<=0||game.api.abilityImmune(e)||game.api.underPaper(e)||visited.has(e)||(e.chainCd||0)>0||e.immunity==='electric'||Math.hypot(e.x-source.x,e.y-source.y)>t.radius)continue;
      const d=(e.x-from.x)**2+(e.y-from.y)**2;
      if(d<=best&&(!next||d<best)){next=e;best=d}
    }
    if(!next)break;nearby.push(next);visited.add(next);from=next;
  }
  game.api.playSound('electric');game.api.animateChainLightning(source,nearby);
  [source,...nearby].forEach((e,hop)=>{
    // All hits share the same recovery, including Thunderstones and Chaos.
    e.chainCd=t.cooldown;
    if(e.immunity==='electric')return;
    if(!(e.shockRest>0)){
      const duration=t.stun*(isInkBoss(e)?.5:1);
      e.stun=Math.max(e.stun||0,duration);e.shockRest=1.25;
      game.api.animateElectricShock(e,duration);
    }
    game.api.dealDamage(e,t.damage*mult*Math.pow(.72,hop),'electric');
    game.api.burst(e.x,e.y,'#7ea7ff',hop?4:5);
  });
}

function applySynergies(e,dt){
  if(game.api.abilityImmune(e))return;
  if(game.state.synergies.has('Cryoshock')&&e.freeze>0)game.api.dealDamage(e,electricTuning(game.state.inks.electric).fieldDps*dt,'electric');
  if(game.state.synergies.has('Black Ice')&&e.freeze>0)e.gravitySlow=Math.max(e.gravitySlow,.62);
  if(game.state.synergies.has('Leech Ink')&&e.poison>0){
    const before=game.state.player.hp;game.api.healStevie(e.poisonDps*dt*.018);
    game.api.animateLeech(e,game.state.player.hp-before);
  }

  if(game.state.synergies.has('Thermal Shock')&&e.freeze>0&&e.burn>0){
    if(!e.thermalCd||e.thermalCd<=0){
      game.api.dealDamage(e,18+4*(game.state.inks.fire+game.state.inks.frost),'frost');
      e.stun=Math.max(e.stun,.55);
      e.thermalCd=1.25;
      game.api.burst(e.x,e.y,'#ffcf7a',8);
      game.api.floatText(e.x,e.y,'CRACK','#b96c24');
    }
  }

  if(game.state.synergies.has('Tesla Well')&&game.api.gravityWallHit(e)){
    game.api.dealDamage(e,electricTuning(game.state.inks.electric).fieldDps*.7*dt,'electric');
  }

  if(game.state.synergies.has('Venom Ice')&&e.freeze>0){
    e.poison=Math.min(6,e.poison+dt*.18);
  }

  if(game.state.synergies.has('NECROTIC ENGINE')&&e.poison>0&&game.api.gravityWallHit(e)){
    const before=game.state.player.hp;game.api.healStevie(e.poisonDps*dt*.02);
    game.api.animateLeech(e,game.state.player.hp-before);
  }

  if(game.state.synergies.has('THE STORM')&&e.freeze>0&&game.api.gravityWallHit(e)){
    game.api.dealDamage(e,electricTuning(game.state.inks.electric).fieldDps*dt,'electric');
    if(Math.random()<.9*dt)game.api.burst(e.x,e.y,'#a8c3ff',3);
  }
}
const api = { stitchFactor,wallHpForLength,updateLiveWall,finishLiveWall,cancelLiveWall,liveWallActive,eraserIntervals, eraseWallPath, flingBossFriend, launchEnemy, enemyFlightHeight, updateEnemyFlight, resetLaunchEffects, updateLaunchEffects, moveLaunchEffects, drawLaunchGround, launchEffectsSnapshot, electricTuning, loopUtilityTuning, insideLoop, loopDamageMultiplier, remainingInkTuning, applyRepulsionContact, applyChaosContact, canStartStroke, nearestWallHit, wallNear, damageWall, repairTouchedWalls, createWall, applyInkContact, applyOneInk, chainLightning, applySynergies };
Object.assign(game.api, api);
return api;
};
