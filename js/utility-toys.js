/* One-time utility toys. Simulation owns clocks; all drawing is read-only. */
DoodleDefender.systems.utilityToys=function(game){
 const a=game.api,s=game.state;
 const owned=name=>!!s.stacks[name];
 const active=()=>s.running&&!s.paused&&!s.inUpgrade&&!s.betweenWaves&&!s.awaitingSpec&&!document.hidden&&!a.infoOpen()&&!a.firstLessonActive()&&!a.synergyRevealActive()&&!a.waveFinaleActive()&&!a.bossEntranceActive();
 const alive=w=>w&&w.hp>0&&w.life>0&&s.walls.includes(w);
 const ordinary=e=>e.hp>0&&!e.waveBoss&&!game.catalog.enemyDefs[e.type]?.boss&&!a.abilityImmune(e)&&!a.underPaper(e)&&!e.flight&&!e.hurdle&&!e.catapultHeld&&!a.bossFriendHeld(e);
 let gates=[],boulders=[],links=[],friends=[],mark=null,markCd=2,boulderCd=0,hold=null,clock=0,pops=[],eraseHandled=false,eraseGate=null;
 const length=pts=>pts.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-pts[i].x,p.y-pts[i].y),0);
 const clearRadius=()=>Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+18;
 function safePoint(p,pad=12){return p.x>=pad&&p.x<=s.W-pad&&p.y>=76&&p.y<=s.H-pad&&Math.hypot(p.x-s.player.x,p.y-s.player.y)>=clearRadius();}
 function safeShape(pts){return pts.every(p=>safePoint(p))&&pts.slice(1).every((p,i)=>a.pointSegDist(s.player.x,s.player.y,p.x,p.y,pts[i].x,pts[i].y)>=clearRadius());}
 function spin(pts,pivot,angle){const c=Math.cos(angle),d=Math.sin(angle);return pts.map(p=>({x:pivot.x+(p.x-pivot.x)*c-(p.y-pivot.y)*d,y:pivot.y+(p.x-pivot.x)*d+(p.y-pivot.y)*c}));}
 function cue(x,y,text,color='#477b63'){pops.push({x,y,text,color,left:.75});if(pops.length>12)pops.shift();}
 function utilityPointer(p,drawing){if(!drawing||!p){hold=null;if(!p)eraseGate=null;return;}if(!hold||Math.hypot(p.x-hold.x,p.y-hold.y)>7)hold={x:p.x,y:p.y,age:0};}
 function plainWall(w){return alive(w)&&!w.closed&&!w.sneakyDraft&&!w.wobbleBumper&&!w.shapeTurret&&!w.utilityLink&&!w.utilityGate&&!w.utilityBoulderUsed&&length(w.pts)>=55&&length(w.pts)<=260&&(w.eraseInk||0)>=6;}
 function tryGate(from,to,r){
  if(!owned('Margin of Error')||gates.length>=4||Math.hypot(to.x-from.x,to.y-from.y)<6)return false;
  for(const w of [...s.walls].reverse()){
   if(!plainWall(w)||a.liveWallObject()===w)continue;
   const atStart=Math.hypot(from.x-w.pts[0].x,from.y-w.pts[0].y)<=r+6,atEnd=Math.hypot(from.x-w.pts.at(-1).x,from.y-w.pts.at(-1).y)<=r+6;
   if(atStart===atEnd)continue;
   const pts=atStart?[...w.pts].reverse():[...w.pts],pivot={...pts[0]};let turn=0;
   for(const angle of [Math.PI*.4,-Math.PI*.4])if(Array.from({length:9},(_,i)=>spin(pts,pivot,angle*i/8)).every(safeShape)){turn=angle;break;}
   if(!turn)continue;
   w.utilityGate=true;w.eraseInk=0;eraseGate=w;gates.push({wall:w,pts:pts.map(p=>({...p})),pivot,turn,age:0,triggered:false,hit:new WeakSet()});cue(pivot.x,pivot.y-20,'HINGED!');a.playSound('pencilLift');return true;
  }return false;
 }
 function markPosition(e){return {x:a.clamp(e.x,65,s.W-65),y:Math.max(100,e.y-e.r-16)};}
 function recruitErase(from,to,r){
  if(!mark||!ordinary(mark.enemy))return false;
  const e=mark.enemy,p=markPosition(e);if(a.pointSegDist(p.x,p.y,from.x,from.y,to.x,to.y)>r+12)return false;
  const d=Math.hypot(to.x-from.x,to.y-from.y);if(d<6)return false;
  mark.rub+=d;mark.rubLeft=.8;if(mark.rub<24)return true;
  s.enemies=s.enemies.filter(n=>n!==e);for(const p of s.projectiles)if(p.target===e)p.life=0;
  friends.push({enemy:e,left:8,age:0,cd:.2,exit:false});e.burn=e.poison=e.freeze=e.stun=0;mark=null;markCd=12;
  cue(e.x,e.y+e.r+22,'CORRECTED!','#37885d');a.playSound('paperPop');return true;
 }
 function utilityErase(from,to,r){eraseHandled=false;if(!active())return false;eraseHandled=!!(alive(eraseGate)&&eraseGate.pts.slice(1).some((p,i)=>a.pointSegDist(to.x,to.y,p.x,p.y,eraseGate.pts[i].x,eraseGate.pts[i].y)<=r+eraseGate.thick/2))||recruitErase(from,to,r)||tryGate(from,to,r);return eraseHandled;}
 function makeBoulder(w){
  if(!owned("Stevie's Terrible Idea")||boulderCd>0||!hold||hold.age<1||!plainWall(w)||s.stats.ink<12)return false;
  const pts=w.pts,from=pts[0],to=pts.at(-1),d=Math.hypot(to.x-from.x,to.y-from.y);if(d<40)return false;
  const x=pts.reduce((sum,p)=>sum+p.x,0)/pts.length,y=pts.reduce((sum,p)=>sum+p.y,0)/pts.length;if(!safePoint({x,y},24)||!safeShape(w.pts))return false;
  s.stats.ink-=12;s.walls=s.walls.filter(p=>p!==w);w.eraseInk=0;w.utilityBoulderUsed=true;
  boulders.push({wall:w,x,y,origin:{x,y},vx:(to.x-from.x)/d*200,vy:(to.y-from.y)/d*200,age:0,hit:new WeakSet(),blast:false,inks:{...s.inks}});boulderCd=8;
  cue(x,y-30,'THIS IS A BAD IDEA!','#9a653d');a.playSound('paperCrumple');return true;
 }
 function utilityFinishWall(w,paid,stitched=false){
  if(!active()||!alive(w)||paid<6||stitched)return;
  if(makeBoulder(w)){hold=null;return;}
  if(!owned('Spitball Express')||w.closed||w.utilityBoulderUsed)return;
  const ts=a.circleTurretNodes(),from=ts.find(t=>Math.hypot(w.pts[0].x-t.circle.x,w.pts[0].y-t.circle.y)<=t.circle.r+18),to=ts.find(t=>t!==from&&Math.hypot(w.pts.at(-1).x-t.circle.x,w.pts.at(-1).y-t.circle.y)<=t.circle.r+18);
  if(!from||!to||length(w.pts)>500||length(w.pts)<30)return;
  links=links.filter(l=>l.from!==from);w.utilityLink=true;links.push({wall:w,from,to,packets:[]});if(links.length>3)links.shift();cue(to.circle.x,to.circle.y-28,'EXPRESS CONNECTED!','#4b789c');
 }
 function validLink(l){const ts=a.circleTurretNodes();return alive(l.wall)&&ts.includes(l.from)&&ts.includes(l.to)&&l.from.wall.hp>0&&l.to.wall.hp>0;}
 function sendExpress(t){
  if(!active()||!owned('Spitball Express'))return false;
  const l=links.find(l=>l.from===t&&validLink(l)&&l.packets.length<3);if(!l||!a.nearestEnemy(l.to.circle.x,l.to.circle.y,l.to.range))return false;
  const pts=[{...l.from.circle},...l.wall.pts.map(p=>({...p})),{...l.to.circle}],total=length(pts);l.packets.push({pts,total,travel:0,x:pts[0].x,y:pts[0].y});a.playSound('turretFire');return true;
 }
 function pointAt(pts,d){for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i],len=Math.hypot(q.x-p.x,q.y-p.y);if(d<=len)return{x:p.x+(q.x-p.x)*d/(len||1),y:p.y+(q.y-p.y)*d/(len||1)};d-=len;}return {...pts.at(-1)};}
 function push(e,distance){const p=s.player,dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1,margin=e.r+15,x=a.clamp(e.x+dx/d*distance,margin,s.W-margin),y=a.clamp(e.y+dy/d*distance,e.r+76,s.H-margin);if(Math.hypot(x-p.x,y-p.y)>=d){e.x=x;e.y=y;}e.stun=Math.max(e.stun,.3);}
 function unfold(b){const dx=b.x-b.origin.x,dy=b.y-b.origin.y,pts=b.wall.pts.map(p=>({x:p.x+dx,y:p.y+dy}));if(!safeShape(pts)||b.wall.hp<=0||b.wall.life<=0){a.burst(b.x,b.y,'#bca889',8);return;}
  b.wall.pts=pts;b.wall.hp*=.5;b.wall.closed=false;s.walls.push(b.wall);cue(b.x,b.y-25,'UNCRUMPLED!','#79664b');a.playSound('paperPop');
 }
 function updateBoulders(dt){for(const b of boulders){b.age+=dt;b.wall.life-=dt;if(b.unfoldAge!==undefined){b.unfoldAge+=dt;if(b.unfoldAge>=.35){unfold(b);b.done=true;}continue;}if(b.age<.35)continue;const old={x:b.x,y:b.y},next={x:b.x+b.vx*dt,y:b.y+b.vy*dt};
   const travel=Math.hypot(next.x-old.x,next.y-old.y),steps=Math.max(1,Math.ceil(travel/8));let stopped=false;
   for(let i=1;i<=steps;i++){const q={x:old.x+(next.x-old.x)*i/steps,y:old.y+(next.y-old.y)*i/steps};if(!safePoint(q,25)||!safeShape(b.wall.pts.map(p=>({x:p.x+q.x-b.origin.x,y:p.y+q.y-b.origin.y})))){stopped=true;break;}b.x=q.x;b.y=q.y;
    for(const e of s.enemies){if(!ordinary(e)||b.hit.has(e)||Math.hypot(e.x-b.x,e.y-b.y)>e.r+23)continue;b.hit.add(e);const dps=a.applyInkContact(e,.3,b.wall);a.dealDamage(e,Math.min(50,12+s.stats.wallDamage*.75)+dps*.3,'physical');push(e,30);a.burst(e.x,e.y,'#a38b65',5);a.playSound('paperHit');if(e.hp<=0)a.killEnemy(e);
     if(b.inks.blast&&!b.blast){b.blast=true;for(const n of [...s.enemies])if(ordinary(n)&&Math.hypot(n.x-b.x,n.y-b.y)<65){a.dealDamage(n,10+b.inks.blast*3,'blast');if(n.hp<=0)a.killEnemy(n);}a.burst(b.x,b.y,'#d79842',16);}
    }
   }if(stopped||b.age>=2.35||b.wall.life<=0)b.unfoldAge=0;
  }boulders=boulders.filter(b=>!b.done);
 }
 function updateFriends(dt){for(const f of friends){const e=f.enemy;f.age+=dt;f.left-=dt;f.cd-=dt;const target=a.nearestEnemy(e.x,e.y,380);
   if(f.left<=0||!s.enemies.some(n=>n.hp>0)){f.exit=true;const x=e.x<s.W/2?-40:s.W+40,dx=x-e.x;e.x+=Math.sign(dx)*130*dt;if(Math.abs(dx)<10||f.left<-3)f.done=true;continue;}
   if(target){const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1;if(d>95){const q={x:e.x+dx/d*70*dt,y:e.y+dy/d*70*dt};if(safePoint(q,e.r+12)){e.x=q.x;e.y=q.y;}}
    if(f.cd<=0&&Math.hypot(target.x-e.x,target.y-e.y)<180){const p=a.throwPaper(target,e,null,true);if(p){p.damage=Math.min(20,Math.max(6,e.dmg*1.5));p.correctionShot=true;p.paperElement=null;p.electricLevel=0;delete p.doodlePayload;f.cd=.8;a.playSound('paperHit');}}
   }
  }friends=friends.filter(f=>!f.done);
 }
 function updateUtilityToys(dt){if(!active())return;clock+=dt;markCd=Math.max(0,markCd-dt);boulderCd=Math.max(0,boulderCd-dt);
  if(hold&&s.drawing&&s.currentWall?.length>1&&owned("Stevie's Terrible Idea")){const tip=s.currentWall.at(-1);if(Math.hypot(tip.x-hold.x,tip.y-hold.y)>7){hold.x=tip.x;hold.y=tip.y;hold.age=0;}hold.age+=dt;}
  for(const p of pops)p.left-=dt;pops=pops.filter(p=>p.left>0);
  for(const g of gates){if(!alive(g.wall)){g.done=true;continue;}if(!g.triggered&&s.enemies.some(e=>ordinary(e)&&g.wall.pts.slice(1).some((p,i)=>a.pointSegDist(e.x,e.y,p.x,p.y,g.wall.pts[i].x,g.wall.pts[i].y)<=e.r+g.wall.thick/2+4))){g.triggered=true;for(const e of s.enemies)if(ordinary(e)&&g.wall.pts.slice(1).some((p,i)=>a.pointSegDist(e.x,e.y,p.x,p.y,g.wall.pts[i].x,g.wall.pts[i].y)<=e.r+g.wall.thick/2+4)){g.hit.add(e);push(e,48);}cue(g.pivot.x,g.pivot.y-20,'WRONG WAY!');a.playSound('woodImpact');}
   if(g.triggered){g.age+=dt;g.wall.pts=spin(g.pts,g.pivot,g.turn*Math.min(1,g.age/.6));for(const e of s.enemies)if(ordinary(e)&&!g.hit.has(e)&&g.wall.pts.slice(1).some((p,i)=>a.pointSegDist(e.x,e.y,p.x,p.y,g.wall.pts[i].x,g.wall.pts[i].y)<=e.r+g.wall.thick/2+8)){g.hit.add(e);push(e,48);}if(g.age>=.6)g.done=true;}
  }gates=gates.filter(g=>!g.done);updateBoulders(dt);
  links=links.filter(validLink);for(const l of links){for(const p of l.packets){p.travel+=220*dt;Object.assign(p,pointAt(p.pts,Math.min(p.total,p.travel)));if(p.travel>=p.total){const target=a.nearestEnemy(l.to.circle.x,l.to.circle.y,l.to.range);if(target){const shot=a.throwPaper(target,l.to.circle,null,true,{turret:true,turretRange:l.to.range});if(shot){shot.damage*=1.75;shot.expressCharged=true;shot.scale=1.25;a.burst(l.to.circle.x,l.to.circle.y,'#ddb04b',7);}}p.done=true;}}l.packets=l.packets.filter(p=>!p.done);}
  if(mark){mark.left-=dt;mark.rubLeft-=dt;if(mark.rubLeft<=0)mark.rub=0;if(!ordinary(mark.enemy)||!s.enemies.includes(mark.enemy)||mark.left<=0){mark=null;markCd=3;}}
  if(owned('Red Pen Corrections')&&!mark&&!friends.length){if(markCd<=0){const types=new Set(['grunt','fast','brute','elite','bouncer','flanker','sprinter','mini']),e=s.enemies.find(e=>ordinary(e)&&types.has(e.type)&&e.x>25&&e.x<s.W-25&&e.y>110&&e.y<s.H-25&&!a.chonksProtected(e));if(e)mark={enemy:e,left:8,rub:0,rubLeft:0};}}
  updateFriends(dt);
 }
 function resetUtilityToys(){gates=[];boulders=[];links=[];friends=[];mark=null;markCd=2;boulderCd=0;hold=null;clock=0;pops=[];eraseHandled=false;eraseGate=null;}
 function moveUtilityToys(dx,dy){const move=p=>{p.x+=dx;p.y+=dy;};for(const g of gates){move(g.pivot);g.pts.forEach(move);}for(const b of boulders){move(b);move(b.origin);b.wall.pts.forEach(move);}for(const l of links)for(const p of l.packets){move(p);p.pts.forEach(move);}for(const f of friends)move(f.enemy);for(const p of pops)move(p);if(hold)move(hold);}
 function drawUtilityToys(){const ctx=game.dom.ctx,reduced=a.enemyMotionReduced();ctx.save();ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';
  for(const g of gates){ctx.fillStyle='#e2b65b';ctx.strokeStyle='#665342';ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.pivot.x,g.pivot.y,6,0,Math.PI*2);ctx.fill();ctx.stroke();if(!g.triggered){ctx.strokeStyle='#608574';ctx.setLineDash([3,5]);const end=spin([g.pts.at(-1)],g.pivot,g.turn)[0];ctx.beginPath();ctx.moveTo(g.pts.at(-1).x,g.pts.at(-1).y);ctx.quadraticCurveTo(g.pivot.x,g.pivot.y,end.x,end.y);ctx.stroke();ctx.setLineDash([]);}}
  for(const b of boulders){if(b.age<.35||b.unfoldAge!==undefined){const k=b.unfoldAge!==undefined?Math.min(1,b.unfoldAge/.35):1-b.age/.35;ctx.save();ctx.strokeStyle='#615747';ctx.lineWidth=b.wall.thick*k;ctx.globalAlpha=Math.min(1,k*2);ctx.beginPath();b.wall.pts.forEach((p,i)=>{const x=b.x+(p.x-b.origin.x)*k,y=b.y+(p.y-b.origin.y)*k;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();ctx.restore();}const t=Math.min(1,b.age/.35),radius=22*(b.unfoldAge!==undefined?Math.max(0,1-b.unfoldAge/.35):reduced?1:Math.min(1,t)),bounce=reduced?0:Math.abs(Math.sin(b.age*13))*4;ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle='#50453830';ctx.beginPath();ctx.ellipse(0,10,24,8,0,0,Math.PI*2);ctx.fill();ctx.translate(0,-bounce);ctx.rotate(reduced?0:b.age*6);ctx.fillStyle='#fcf6e5';ctx.strokeStyle='#5a5448';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<12;i++){const angle=i*Math.PI/6,r=radius*(i%3===0?.83:1);if(i)ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);else ctx.moveTo(r,0);}ctx.closePath();ctx.fill();ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle='#9ca9b4';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-radius*.7,i*8);ctx.lineTo(radius*.7,i*8+3);ctx.stroke();}ctx.strokeStyle='#9c8b72';ctx.beginPath();ctx.moveTo(-12,-10);ctx.lineTo(2,-3);ctx.lineTo(-5,11);ctx.moveTo(15,-9);ctx.lineTo(6,5);ctx.lineTo(14,14);ctx.stroke();const colors={fire:'#db8247',frost:'#85c5d5',poison:'#78a55a',electric:'#e6b742',blast:'#d79842',vampire:'#af597a',gravity:'#8772a6',repulsion:'#6da394',void:'#645c83',chaos:'#d28aaf'};let j=0;for(const [k,c] of Object.entries(colors))if(b.inks[k]){ctx.strokeStyle=c;ctx.lineWidth=3;const angle=j++*1.7;ctx.beginPath();ctx.arc(0,0,radius+4,angle,angle+.65);ctx.stroke();}ctx.restore();}
  for(const l of links.filter(validLink)){ctx.strokeStyle='#ab935b';ctx.lineWidth=2;ctx.setLineDash([3,8]);ctx.beginPath();ctx.moveTo(l.wall.pts[0].x,l.wall.pts[0].y);for(const p of l.wall.pts.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);for(const p of l.packets){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(reduced?0:p.travel*.04);ctx.fillStyle='#f0cf68';ctx.strokeStyle='#7c6238';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-4,-3);ctx.lineTo(1,1);ctx.lineTo(4,-2);ctx.stroke();ctx.restore();}}
  for(const p of s.projectiles)if(p.expressCharged||p.correctionShot){ctx.strokeStyle=p.correctionShot?'#438766':'#d9a73a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*1.5);ctx.stroke();}
  if(mark&&s.enemies.includes(mark.enemy)){const e=mark.enemy,{x,y}=markPosition(e);ctx.strokeStyle='#be4d47';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,14,10,-.15,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-5,y-4);ctx.lineTo(x+5,y+4);ctx.moveTo(x+5,y-4);ctx.lineTo(x-5,y+4);ctx.stroke();ctx.fillStyle='#a84742';ctx.fillText('RUB RED MARK',x,y-16);}
  for(const f of friends){const e=f.enemy,bob=reduced?0:Math.sin(f.age*13)*2;a.drawPaperDoodle(e,{visible:1,reduced,y:bob,angle:reduced?0:Math.sin(f.age*8)*.06,sx:1,sy:1});ctx.fillStyle='#e4efdb';ctx.strokeStyle='#438766';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y-e.r-9,10,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(e.x-5,e.y-e.r-9);ctx.lineTo(e.x-1,e.y-e.r-5);ctx.lineTo(e.x+6,e.y-e.r-14);ctx.stroke();ctx.fillStyle='#438766';ctx.fillText(f.exit?'SEE YA!':Math.ceil(f.left)+'s · FRIEND',e.x,e.y-e.r-26);}
  if(hold&&owned("Stevie's Terrible Idea")&&s.drawing&&s.currentWall?.length>1&&hold.age>.35){ctx.fillStyle='#98613c';ctx.fillText(boulderCd>0?'CRUMPLE IN '+Math.ceil(boulderCd)+'s':hold.age>=1?(s.stats.ink>=12?'RELEASE · ROLL! +12 INK':'NEED 12 EXTRA INK'):'HOLD TO CRUMPLE…',a.clamp(hold.x,95,s.W-95),Math.max(95,hold.y-25));}
  for(const p of pops){ctx.globalAlpha=Math.min(1,p.left*3);ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y-(.75-p.left)*14);}ctx.restore();
 }
 const utilityToysSnapshot=()=>({gates:gates.map(g=>({pivot:{...g.pivot},triggered:g.triggered,age:g.age})),boulders:boulders.map(b=>({x:b.x,y:b.y,age:b.age})),links:links.map(l=>({from:{...l.from.circle},to:{...l.to.circle},packets:l.packets.map(p=>({x:p.x,y:p.y,travel:p.travel}))})),mark:mark?{...markPosition(mark.enemy),left:mark.left,rub:mark.rub}:null,friends:friends.map(f=>({x:f.enemy.x,y:f.enemy.y,type:f.enemy.type,left:f.left,exit:f.exit})),hold:hold?{...hold}:null,boulderCd});
 Object.assign(a,{utilityEraseHandled:()=>eraseHandled,resetUtilityEraseHandled:()=>{eraseHandled=false;},utilityPointer,utilityErase,utilityFinishWall,sendExpress,updateUtilityToys,resetUtilityToys,moveUtilityToys,drawUtilityToys,utilityToysSnapshot});return {};
};
