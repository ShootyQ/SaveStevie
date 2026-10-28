/* Wave 10: committed stomps, real paper-pressure counter, persistent rub-outs.
 * Simulation owns all clocks/randomness. Rendering only selects drawn frames. */
DoodleDefender.systems.bootstompBoss=function(game){
 const a=game.api,atlas=DoodleDefender.bootstompArt;
 const tune={charge:2.95,laceHold:1.6,laceDamage:10,threshold:.8,dentGrow:.25,exposure:2.72,swipeDistance:18,swipeGap:.6,rippleDamage:14,rippleSpeed:370,helperCap:14,introHang:.22,introFall:.7,introSettle:.75,challengeDuration:1.44,helperRate:.7};
 const names=['left_fist','right_fist','left_boot','right_boot','star'];
 let brains=new WeakMap(),ripples=[],lastErase=false,serial=0,frameCache=new Map(),rubOwner=null;
 const isBootstomp=e=>!!e&&e.type==='bootstomp';
 const hosts=()=>game.state.enemies.filter(e=>isBootstomp(e)&&e.hp>0);
 const playable=()=>game.state.running&&!game.state.paused&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec&&!document.hidden&&!a.waveFinaleActive()&&!a.synergyRevealActive()&&!a.infoOpen();
 // Half the original artwork scale; keep the existing generous rub/footprint tolerance.
 const size=()=>Math.min(.38,Math.max(.22,Math.min(game.state.W/440,game.state.H/540)*.38));
 const ground=()=>62*size()/.76;
 function safePoint(angle=0){
  const {W,H,player:p}=game.state,mx=Math.min(115,W*.28),top=Math.min(145,H*.32),bottom=Math.max(top,H-95);
  const candidates=[];
  for(let i=0;i<16;i++){const t=angle+i*Math.PI/8,x=a.clamp(W/2+Math.cos(t)*(W/2-mx),mx,W-mx),y=a.clamp(H/2+Math.sin(t)*(H/2-85),top,bottom);candidates.push({x,y,score:Math.hypot(x-p.x,y-p.y)*.2-i*15});}
  const clear=candidates.filter(q=>Math.hypot(q.x-p.x,q.y-p.y)>Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+100);
  return (clear.length?clear:candidates).sort((x,y)=>y.score-x.score)[0];
 }
 function initBootstomp(e){
  if(brains.has(e))return brains.get(e);
  const p=safePoint(-Math.PI/2);p.x=a.clamp(game.state.W*.25,75,game.state.W-75);e.x=p.x;e.y=p.y;e.r=30;e.speed=110;e.hp=e.maxHp=150;e.waveBoss=true;
  const b={phase:'intro',age:0,time:0,wear:Object.fromEntries(names.map(n=>[n,0])),laceDamage:0,laceTripped:false,laceCount:0,turn:0,attack:0,side:'right',target:null,dent:null,goal:null,helperCd:1,helperSerial:0,swipeCd:0,rubs:{},reaction:0,passenger:null,kickCd:0,kickCount:0,shockCount:0,finished:false,motion:{distance:0,vx:0,vy:0,lean:0,blend:0,weight:0,lagX:0,lagY:0,feet:null,marks:[],stepCd:0},introGoal:{x:p.x,y:p.y},introStart:{x:p.x,y:-170}};b.enterDuration=tune.introHang+tune.introFall+tune.introSettle;e.x=p.x;e.y=p.y;brains.set(e,b);
  a.resetCircleShapes();a.setMsg('Bootstomp! Briefly press his footprint to leave a dent, then lift and defend. Rub his orange eraser crew to redirect them; they scrub him when he falls!');return b;
 }
 function state(e){return brains.get(e)||initBootstomp(e);}
 function setPhase(e,phase){const b=state(e);b.phase=phase;b.age=0;}
 function clipAt(e){
  const b=state(e),left=b.side==='left';
  if(b.phase==='intro'){
   const landAt=tune.introHang+tune.introFall;
   if(b.age<landAt)return [a.enemyMotionReduced()?'idle':'intro_drop',b.age];
   if(b.age<b.enterDuration)return ['intro_land',b.age-landAt];
   return ['intro_challenge',b.age-b.enterDuration];
  }
  if(b.phase==='walk')return [a.enemyMotionReduced()?'idle':'walk',a.enemyMotionReduced()?0:b.motion.distance/strideLength*.72];
  if(b.phase==='shockwave')return b.age<.7?['windup_right',b.age*3/.7]:['impact_'+(b.shockCount===1?'right':'left'),b.age-(b.shockCount===1?.7:1.25)];
  if(b.phase==='kick')return ['shoe_scrape',b.age];
  if(b.phase==='windup')return ['windup_'+b.side,b.age*3/tune.charge];
  if(b.phase==='impact')return ['impact_'+b.side,b.age];
  if(b.phase==='stumble')return ['stumble_'+b.side,b.age];
  if(b.phase==='fall')return [left?'faceplant_left':'faceplant',b.age];
  // Hold the exposed drawing still: swapping flinch poses moved the rub
  // targets underneath a finger between consecutive swipes.
  if(b.phase==='down')return [left?'fallen_left':'fallen',0];
  if(b.phase==='recover')return [left?'recover_left':'recover',b.age];
  if(b.phase==='scrape')return ['shoe_scrape',b.age];
  if(b.phase==='tantrum')return ['tantrum',b.age];
  if(b.phase==='lace')return ['lace_flick',Math.min(.86,b.age*.65)];
  if(b.phase==='lace_throw')return ['lace_flick',.88+b.age];
  if(b.phase==='lace_rebound')return ['lace_rebound',b.age];
  if(b.phase==='defeat')return ['defeat',b.age];
  return ['idle',b.age];
 }
 function pose(e,override=null){
  const b=state(e),[name,t]=override||clipAt(e),clip=atlas.clips[name];let elapsed=clip.loop?t%clip.durations.reduce((x,y)=>x+y,0):t,index=clip.frames.length-1;
  for(let i=0;i<clip.frames.length;i++){if(elapsed<clip.durations[i]){index=i;break;}elapsed-=clip.durations[i];}
  // The large boot kick is excluded while players aim at the exposed patches.
  let key=clip.frames[index];if(b.phase==='down'&&key==='fall:9')key='fall:8';
  const f=atlas.frames[key],scale=atlas.pages[f.page].scale*size();return {key,f,clip,name,scale,flip:!!clip.flipX||(b.phase==='down'&&b.reaction>0&&b.side==='left')||(b.phase.startsWith('lace')&&b.lace?.side===-1)};
 }
 // Track distance and alternating footfalls for pose timing and step sounds.
 // Distance, rather than elapsed time, drives the whole-pose walk cycle.
 const strideLength=76,stanceFraction=.62;
 function footBases(){const f=atlas.frames['arrival:15'],scale=atlas.pages[f.page].scale*size();return ['left_boot','right_boot'].map(n=>{const q=f.parts[n];return {x:(q[0]-f.pivot[0])*scale,y:ground()+(q[1]-f.pivot[1])*scale};});}
 function updateWalkMotion(e,old,dt){
  if(dt<=0)return;
  const b=state(e),m=b.motion,dx=e.x-old.x,dy=e.y-old.y,d=Math.hypot(dx,dy),moving=d>.00001&&['intro','walk','tantrum'].includes(old.phase),blend=1-Math.exp(-Math.max(0,dt)*14),bases=footBases();
  m.stepCd=Math.max(0,m.stepCd-dt);m.marks=m.marks.filter(p=>(p.age+=dt)<.28);m.weight=Math.max(0,m.weight-dt*7);
  m.vx+=(moving?dx/Math.max(dt,.00001)-m.vx:-m.vx)*blend;m.vy+=(moving?dy/Math.max(dt,.00001)-m.vy:-m.vy)*blend;
  m.lean+=(a.clamp(m.vx/110,-1,1)*.065-m.lean)*blend;m.lagX+=(a.clamp(-m.vx*.025,-4,4)-m.lagX)*blend;m.lagY+=(a.clamp(-m.vy*.015,-2,2)-m.lagY)*blend;m.blend+=((moving?1:0)-m.blend)*blend;
  if(!m.feet)m.feet=bases.map((p,i)=>({x:old.x+p.x,y:old.y+p.y,lift:0,u:i*.5,planted:false,startX:old.x+p.x,startY:old.y+p.y}));
  if(!moving){for(const f of m.feet){f.lift*=1-blend;f.planted=true;}return;}
  m.distance+=d;const nx=dx/d,ny=dy/d,half=strideLength*stanceFraction/2;
  for(const [i,f] of m.feet.entries()){
   const u=(m.distance/strideLength+i*.5)%1,base=bases[i];
   if(u<stanceFraction){
    if(!f.planted||u<f.u||d>strideLength/2){f.x=e.x+base.x+nx*half*(1-2*u/stanceFraction);f.y=e.y+base.y+ny*half*(1-2*u/stanceFraction);f.planted=true;m.weight=1;
     if(!a.enemyMotionReduced()){m.marks.push({x:f.x,y:f.y+14,age:0});if(m.marks.length>6)m.marks.shift();if(m.stepCd<=0){a.playSound('chonksStep');m.stepCd=.22;}}}
    f.lift=0;
   }else{
    if(f.planted||d>strideLength/2){f.startX=f.x;f.startY=f.y;}f.planted=false;
    const t=(u-stanceFraction)/(1-stanceFraction),smooth=t*t*(3-2*t),ahead=(1-u)*strideLength+half;
    f.x=f.startX+(e.x+base.x+nx*ahead-f.startX)*smooth;f.y=f.startY+(e.y+base.y+ny*ahead-f.startY)*smooth;f.lift=Math.sin(t*Math.PI)*12;
   }
   f.u=u;
  }
 }
 function partPoints(e,p=pose(e)){
  const result={},parts=p.f.parts;for(const n of names){const q=parts[n],x=(q[0]-p.f.pivot[0])*p.scale;result[n]={x:e.x+(p.flip?-x:x),y:e.y+ground()+(q[1]-p.f.pivot[1])*p.scale,rx:q[2]*p.scale,ry:q[3]*p.scale};}return result;
 }
 function landing(e,side){
  const p=pose(e,['impact_'+side,.1]),q=partPoints(e,p).right_boot;return {x:q.x,y:e.y+ground()-5,r:29};
 }
 function beginStomp(e){const b=state(e);b.side=b.turn%2?'left':'right';b.turn++;b.target=landing(e,b.side);b.dent=null;setPhase(e,'windup');a.setMsg('Press the footprint briefly, then lift your finger and keep defending!');}
 function pressure(e){const b=state(e);if(b.dent)return 1;const {press:p,tuning:t}=a.paperPressSnapshot();return p&&b.target&&Math.hypot(p.x-b.target.x,p.y-b.target.y)<=b.target.r?Math.max(0,Math.min(1,(p.age-a.bootstompDentDelay())/tune.dentGrow)):0;}
 function prepareBootstompDent(p,depth){if(depth<tune.threshold)return;for(const e of hosts()){const b=state(e);if(b.phase!=='windup'||!b.target||b.dent||Math.hypot(p.x-b.target.x,p.y-b.target.y)>b.target.r)continue;b.dent={...b.target};a.floatText(b.target.x,b.target.y-48,'DENT READY!','#3f7961');a.setMsg('Dent ready! Lift your finger and defend Stevie until the stomp.');}}
 // The root stays at its safe landing site: the fall is a visual height, so an
 // airborne boss cannot clear a vertical corridor of walls on the way down.
 function introPose(e){const b=state(e),landAt=tune.introHang+tune.introFall,t=a.clamp((b.age-tune.introHang)/tune.introFall,0,1),after=Math.max(0,b.age-landAt),reduced=a.enemyMotionReduced(),impact=b.age>=landAt?Math.exp(-after*12):0;
  return {fall:t,landed:b.age>=landAt,offsetY:reduced?0:-(b.introGoal.y-b.introStart.y)*(1-t*t),angle:reduced?0:b.age<landAt?.12+Math.sin(t*7)*.07:Math.sin(after*18)*.1*Math.exp(-after*5),sx:reduced?1:1+impact*.15,sy:reduced?1:1-impact*.22,impact,after};
 }
 function bootstompPressTarget(p){return hosts().some(e=>{const b=state(e);return b.phase==='windup'&&b.target&&Math.hypot(p.x-b.target.x,p.y-b.target.y)<=b.target.r;});}
 function rubBounds(e){const p=pose(e),q=p.f.inkBounds,x0=(q[0]-p.f.pivot[0])*p.scale,x1=(q[2]-p.f.pivot[0])*p.scale;return {left:e.x+(p.flip?-x1:x0),right:e.x+(p.flip?-x0:x1),top:e.y+ground()+(q[1]-p.f.pivot[1])*p.scale,bottom:e.y+ground()+(q[3]-p.f.pivot[1])*p.scale};}
 function rubTouchesBody(e,from,to,r=12){const q=rubBounds(e),inside=p=>p.x>=q.left-r&&p.x<=q.right+r&&p.y>=q.top-r&&p.y<=q.bottom+r;if(inside(from)||inside(to))return true;const corners=[{x:q.left-r,y:q.top-r},{x:q.right+r,y:q.top-r},{x:q.right+r,y:q.bottom+r},{x:q.left-r,y:q.bottom+r}];return corners.some((p,i)=>a.segmentIntersection(from,to,p,corners[(i+1)%4]));}
 function bootstompRubTarget(p){return hosts().some(e=>state(e).phase==='down'&&rubTouchesBody(e,p,p));}
 function captureBootstompRub(from,to=from,r=12){
  if(!playable())return false;if(rubOwner)return true;
  rubOwner=hosts().find(e=>state(e).phase==='down'&&rubTouchesBody(e,from,to,r))||null;
  if(rubOwner){a.cancelPaperRub();a.cancelPaperPress();lastErase=true;}
  return !!rubOwner;
 }
 function sweep(e,from,to,r=e.r+8){
  for(const w of [...game.state.walls]){if(w.hp<=0)continue;let hit=false;
   for(let i=1;i<w.pts.length;i++){const p=w.pts[i-1],q=w.pts[i];if(a.segmentIntersection(from,to,p,q)||Math.min(a.pointSegDist(from.x,from.y,p.x,p.y,q.x,q.y),a.pointSegDist(to.x,to.y,p.x,p.y,q.x,q.y),a.pointSegDist(p.x,p.y,from.x,from.y,to.x,to.y),a.pointSegDist(q.x,q.y,from.x,from.y,to.x,to.y))<=r+w.thick/2){hit=true;break;}}
   if(hit){w.hp=0;game.state.walls=game.state.walls.filter(x=>x!==w);}
  }
 }
 function advance(e,target,dt,speed=110){const final=target,p=game.state.player;
  // Desktop relocation follows short chords around the inset perimeter instead
  // of taking a shortcut through the fort's immediate surroundings.
  if(a.desktopUiEnabled?.()){
   const {W,H}=game.state,rx=Math.max(60,W/2-Math.min(115,W*.28)),ry=Math.max(60,H/2-100);
   const angle=Math.atan2((e.y-p.y)/ry,(e.x-p.x)/rx),end=Math.atan2((target.y-p.y)/ry,(target.x-p.x)/rx),turn=Math.atan2(Math.sin(end-angle),Math.cos(end-angle));
   if(Math.abs(turn)>.3){const next=angle+Math.sign(turn)*.3;target={x:a.clamp(p.x+Math.cos(next)*rx,Math.min(115,W*.28),W-Math.min(115,W*.28)),y:a.clamp(p.y+Math.sin(next)*ry,Math.min(145,H*.32),Math.max(Math.min(145,H*.32),H-95))};}
  }
  const clear=Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+e.r+18;
  if(a.pointSegDist(p.x,p.y,e.x,e.y,target.x,target.y)<clear){const angle=Math.atan2(e.y-p.y,e.x-p.x),end=Math.atan2(target.y-p.y,target.x-p.x),turn=Math.atan2(Math.sin(end-angle),Math.cos(end-angle));target={x:a.clamp(p.x+Math.cos(angle+Math.sign(turn)*.48)*(clear+22),e.r+35,game.state.W-e.r-35),y:a.clamp(p.y+Math.sin(angle+Math.sign(turn)*.48)*(clear+22),130,game.state.H-90)};}
  const d=Math.hypot(target.x-e.x,target.y-e.y),step=Math.min(d,speed*dt),old={x:e.x,y:e.y};if(d){const nx=e.x+(target.x-e.x)/d*step,ny=e.y+(target.y-e.y)/d*step;if(Math.hypot(nx-p.x,ny-p.y)>=clear){e.x=nx;e.y=ny;}}sweep(e,old,e);return Math.hypot(final.x-e.x,final.y-e.y)<4;}
 function helpers(e,dt){const b=state(e);if(['defeat','intro'].includes(b.phase))return;b.helperCd-=dt;if(b.helperCd>0)return;
  b.helperCd=a.firstBossTuning(e).helperGap/(2*tune.helperRate);
  if(game.state.enemies.filter(n=>n.bossOwner===e&&!n.bootstompBuffer&&n.hp>0).length>=tune.helperCap-3)return;
  const i=b.helperSerial++%4,{W,H}=game.state;
  const n=a.spawnEnemy(false,i===1?W+26:i===3?-26:W*(i===0?.25:.75),i===0?-26:i===2?H+26:H*(i===1?.3:.7),'grunt');if(n){n.bossOwner=e;n.bootstompBlue=true;}
 }
 function chooseAttack(e){const b=state(e);b.attack++;
  // Stomps remain the main opportunity; specials interrupt the rhythm without
  // ever changing a committed foot target or destroying it during that charge.
  if(b.attack%2!==0){beginStomp(e);return;}
  if(b.attack%4===2){
   const friend=game.state.enemies.find(n=>n.bossOwner===e&&!n.bootstompBuffer&&n.hp>0&&!n.flight&&!a.underPaper(n));
   if(friend){const side=e.x>game.state.W/2?-1:1;b.passenger=friend;b.laceCount++;b.lace={side,x:e.x+side*45,y:e.y-8,ex:a.clamp(e.x+side*135,24,game.state.W-24),y2:e.y-18};setPhase(e,'lace');a.setMsg('Draw across the stretched shoelace! Snap it back to hurt him and knock him down.');return;}
  }
  if(b.attack%4===0&&names.filter(n=>b.wear[n]===3).length>=2){b.scrape={a:{x:e.x-75,y:e.y+ground()-10},b:{x:e.x+105,y:e.y+ground()-10},done:false};setPhase(e,'scrape');return;}
  b.shockCount=0;setPhase(e,'shockwave');a.setMsg('DOUBLE STOMP! Draw walls across the paper waves to catch them.');
 }
 // Kicks happen during relocation: nearby helpers go over walls toward alternate
 // flanks, never onto the fort. Existing flights supply the arc and ground shadow.
 function kickFriend(e){const b=state(e);if(b.kickCd>0)return false;
  const p=game.state.player,clear=Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight);
  const n=game.state.enemies.filter(n=>n.bossOwner===e&&!n.bootstompBuffer&&n.hp>0&&!n.flight&&!n.hurdle&&!n.catapultHeld&&!a.underPaper(n)&&!a.bossFriendHeld(n)&&n.freeze<=0&&n.stun<=0&&Math.hypot(n.x-e.x,n.y-e.y)<170&&Math.hypot(n.x-p.x,n.y-p.y)>clear+n.r+75).sort((n,m)=>Math.hypot(n.x-e.x,n.y-e.y)-Math.hypot(m.x-e.x,m.y-e.y))[0];
  if(!n)return false;b.passenger=n;b.kickCd=4;setPhase(e,'kick');a.setMsg('Bootstomp is lining up a kick! Watch the landing mark.');return true;
 }
 function kickLanding(e,n){const b=state(e),p=game.state.player,angle=Math.atan2(e.y-p.y,e.x-p.x)+(b.kickCount%2?-.65:.65),r=Math.max(p.r+n.r+82,Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+n.r+40),margin=n.r+25;
  return {x:a.clamp(p.x+Math.cos(angle)*r,margin,game.state.W-margin),y:a.clamp(p.y+Math.sin(angle)*r,n.r+80,game.state.H-margin)};
 }
 function launchRipple(e,blocked=false){const b=state(e),p=blocked?landing(e,b.shockCount===1?'right':'left'):b.target;ripples.push({id:++serial,owner:e,x:p.x,y:p.y,blocked,reduced:false,age:0});if(ripples.length>8)ripples.shift();a.playSound('woodImpact');}
 function updateRipples(e,dt){for(const q of ripples.filter(q=>q.owner===e)){
  const p=game.state.player,dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy),step=Math.min(d,tune.rippleSpeed*dt),nx=q.x+(dx/(d||1))*step,ny=q.y+(dy/(d||1))*step;
  if(!q.reduced){const hit=a.bossShotWallHit({x:q.x,y:q.y,r:6},nx,ny);if(hit){if(q.blocked){q.done=true;a.damageWall(hit.wall,hit.wall.maxHp*.4,q.x,q.y);a.burst(nx,ny,'#b6a17a',8);a.floatText(nx,ny-14,'CAUGHT!','#648171');continue;}q.reduced=true;a.damageWall(hit.wall,hit.wall.maxHp*.4,q.x,q.y);a.floatText(q.x,q.y-14,'SOFTENED','#648171');}}
  a.bootstompCrewWaveContact(e,q,{x:q.x,y:q.y},{x:nx,y:ny});q.x=nx;q.y=ny;q.age+=dt;if(d<=step+p.r+4){a.damageStevie(tune.rippleDamage*(q.reduced?.5:1)*(1-game.state.stats.playerArmor),'Bootstomp paper ripple',e);q.done=true;}
 }ripples=ripples.filter(q=>!q.done&&q.owner.hp>0);}
 function bootstompFriendHeld(n){const host=n.bossOwner;if(!isBootstomp(host)||host.hp<=0)return false;const b=brains.get(host);return b?.passenger===n&&['lace','kick'].includes(b.phase)&&n.hp>0&&game.state.enemies.includes(host);}
 function updateBootstomp(e,dt){
  if(!playable()||!isBootstomp(e))return;const b=state(e);if(e.hp<=0)return;const old={x:e.x,y:e.y,phase:b.phase};try{
  b.age+=dt;b.time+=dt;b.kickCd=Math.max(0,b.kickCd-dt);b.swipeCd=Math.max(0,b.swipeCd-dt);b.reaction=Math.max(0,b.reaction-dt);e.freeze=e.stun=e.gravitySlow=e.burn=e.poison=e.charged=0;
  if(b.phase==='defeat'){if(b.age>=3.09){e.hp=0;a.killEnemy(e);}return;}
  updateRipples(e,dt);helpers(e,dt);a.updateBootstompCrewSpawns(e,dt);a.updateBootstompCrewWaves(e,dt);if(b.phase!=='intro')sweep(e,e,e);
  if(b.phase==='intro'){
   const landAt=tune.introHang+tune.introFall;
   if(b.age>=landAt&&b.age-dt<landAt){a.playSound('woodImpact');a.playSound('paperCrumple');a.burst(e.x,e.y+ground(),'#c9b797',14);a.floatText(e.x,e.y-80,'THUMP.','#80664b');}
   if(b.age>=landAt)sweep(e,e,e);
   const challengeAge=b.age-b.enterDuration;
   if(challengeAge>=.45&&challengeAge-dt<.45)a.playSound('paperCrumple');
   if(challengeAge>=1.05&&challengeAge-dt<1.05)a.playSound('chonksStep');
   if(b.age>=b.enterDuration+tune.challengeDuration){setPhase(e,'idle');a.setMsg('Bootstomp · Leave a dent, then redirect his eraser crew to scrub him!');}return;
  }
  if(b.phase==='shockwave'){
   if(b.shockCount===0&&b.age>=.7){b.shockCount=1;launchRipple(e,true);}
   if(b.shockCount===1&&b.age>=1.25){b.shockCount=2;launchRipple(e,true);}
   if(b.age>=1.9){b.goal=safePoint(b.turn*.9);setPhase(e,'walk');}return;
  }
  if(b.phase==='kick'){
   const n=b.passenger;if(!n||n.hp<=0||!game.state.enemies.includes(n)){b.passenger=null;setPhase(e,'walk');return;}
   if(b.age>=.65){const target=kickLanding(e,n);b.passenger=null;if(a.flingBossFriend(n,target)){b.kickCount++;a.playSound('boingBounce');a.floatText(e.x,e.y-65,'BOOT DELIVERY!','#a55b39');}setPhase(e,'walk');}return;
  }
  if(b.phase==='idle'){if(b.age>=.8)chooseAttack(e);return;}
  if(b.phase==='windup'){
   if(b.age>=tune.charge){if(pressure(e)>=tune.threshold){b.dent=null;a.cancelPaperPress();setPhase(e,'stumble');a.playSound('boingBounce');a.floatText(e.x,e.y-75,'BAD FOOTING!','#386db0');}else{b.dent=null;a.cancelPaperPress();setPhase(e,'impact');launchRipple(e);}}return;
  }
  if(b.phase==='stumble'){if(b.age>=.48){setPhase(e,'fall');a.playSound('woodImpact');}return;}
  if(b.phase==='fall'){if(b.age>=.72){if(b.laceTripped){b.laceTripped=false;const before=e.hp;b.laceDamage+=tune.laceDamage;syncProgress(e);const damage=Math.min(before,tune.laceDamage);a.damageNumber(e,damage,'physical',b.finished);a.recordCombatDamage?.(damage,'physical',{bossCounter:true});a.burst(e.x,e.y+ground(),'#c9b797',12);a.playSound('woodImpact');if(b.finished)return;}setPhase(e,'down');b.rubs={};a.floatText(e.x,e.y-85,'SEND IN THE ERASERS!','#4268a2');a.setMsg('Rub the orange eraser crew to turn them green. They scrub his patches while he is down!');}return;}
  if(b.phase==='down'){if(b.age>=tune.exposure){setPhase(e,'recover');b.rubs={};}return;}
  if(b.phase==='recover'||b.phase==='impact'||b.phase==='lace_rebound'||b.phase==='lace_throw'){
   const duration={recover:.94,impact:.65,lace_rebound:.85,lace_throw:.25}[b.phase];if(b.age>=duration){if(b.phase==='lace_rebound'&&b.laceTripped){setPhase(e,'fall');return;}b.goal=safePoint(b.turn*.9);setPhase(e,b.phase==='recover'?'tantrum':'walk');}return;
  }
  if(b.phase==='tantrum'){advance(e,b.goal,dt,names.filter(n=>b.wear[n]===3).length>=4?190:155);if(b.age>=.65)setPhase(e,'walk');return;}
  if(b.phase==='walk'){if(kickFriend(e))return;if(advance(e,b.goal||safePoint(b.turn),dt)||b.age>2){setPhase(e,'idle');}return;}
  if(b.phase==='scrape'){if(b.age>=.38&&!b.scrape.done){b.scrape.done=true;sweep(e,b.scrape.a,b.scrape.b,23);a.playSound('monsterWall');}if(b.age>=.98){b.goal=safePoint(b.turn*.9);setPhase(e,'tantrum');}return;}
  if(b.phase==='lace'){
   const n=b.passenger;if(!n||n.hp<=0||!game.state.enemies.includes(n)){b.passenger=null;setPhase(e,'lace_rebound');return;}
   n.x=b.lace.ex;n.y=b.lace.y2;
   if(b.age>=tune.laceHold){b.passenger=null;const p=game.state.player,angle=Math.atan2(e.y-p.y,e.x-p.x),r=Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+n.r+35,target={x:a.clamp(p.x+Math.cos(angle)*r,n.r+25,game.state.W-n.r-25),y:a.clamp(p.y+Math.sin(angle)*r,n.r+80,game.state.H-n.r-25)};a.flingBossFriend(n,target);a.playSound('boingBounce');setPhase(e,'lace_throw');}return;
  }
  }finally{updateWalkMotion(e,old,dt);}
 }
 function syncProgress(e){
  const b=state(e),total=names.reduce((sum,n)=>sum+b.wear[n],0),damage=e.maxHp*total/15+b.laceDamage;
  e.hp=Math.max(1,e.maxHp-damage);
  if(total===15||damage>=e.maxHp-1e-7){b.finished=true;b.passenger=null;setPhase(e,'defeat');a.clearBootstompCrew(e);ripples=[];game.state.enemies=game.state.enemies.filter(n=>n.bossOwner!==e);a.endDraw();a.setMsg('Bootstomp is out of excuses. And quite a lot of drawing.');}
 }
 function eraseBootstompPath(from,to,r){lastErase=captureBootstompRub(from,to,r*.65);return false;}
 function bootstompCrewScrub(e,n){
  if(!playable()||!isBootstomp(e)||!n?.bootstompBuffer||!n.bufferFriendly||n.bossOwner!==e||n.bufferSpent||n.hp<=0||!game.state.enemies.includes(n))return false;
  const b=state(e);if(b.phase!=='down')return false;const parts=partPoints(e),part=names.filter(k=>b.wear[k]<3&&Math.hypot(n.x-parts[k].x,n.y-parts[k].y)<Math.max(parts[k].rx,parts[k].ry)+n.r+14).sort((x,y)=>Math.hypot(n.x-parts[x].x,n.y-parts[x].y)-Math.hypot(n.x-parts[y].x,n.y-parts[y].y))[0];if(!part)return false;
  const before=e.hp;b.wear[part]++;b.reaction=.54;b.reactTotal=.54;a.burst(parts[part].x,parts[part].y,'#e1b58e',12);a.playSound('erase');a.floatText(parts[part].x,parts[part].y-18,b.wear[part]===3?'SCRUBBED OUT!':'SCRUB!','#3e947c');syncProgress(e);const damage=Math.min(before,e.maxHp/15);a.damageNumber(e,damage,'physical',b.finished);a.recordCombatDamage?.(damage,'physical',{bossCounter:true});return true;
 }
 function resetBootstompRub(){lastErase=false;rubOwner=null;for(const e of hosts())state(e).rubs={};}
 function counterBootstompStroke(points){
  if(!playable()||points.length<2)return false;
  for(const e of hosts()){const b=state(e);if(b.phase!=='lace'||b.age<.2||!b.lace)continue;const p={x:b.lace.x,y:b.lace.y},q={x:b.lace.ex,y:b.lace.y2};
   for(let i=1;i<points.length;i++)if(Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y)>=6&&(a.segmentIntersection(points[i-1],points[i],p,q)||Math.min(a.pointSegDist(points[i].x,points[i].y,p.x,p.y,q.x,q.y),a.pointSegDist(points[i-1].x,points[i-1].y,p.x,p.y,q.x,q.y))<5)){
    b.passenger=null;b.laceTripped=true;b.side=b.lace.side===-1?'left':'right';setPhase(e,'lace_rebound');a.playSound('boingBounce');a.floatText(e.x,e.y-70,'SNAP! DOWN HE GOES!','#9b6846');return true;
   }
  }return false;
 }
 function clearBootstomp(e){a.clearBootstompCrew?.(e);ripples=ripples.filter(q=>q.owner!==e);const b=brains.get(e);if(b)b.passenger=null;}
 function resetBootstomp(){a.resetBootstompCrew?.();rubOwner=null;brains=new WeakMap();ripples=[];lastErase=false;frameCache.clear();}
 function moveBootstomp(dx,dy){a.moveBootstompCrew?.(dx,dy);for(const e of hosts()){const b=state(e);for(const p of [...(b.motion.feet||[]),...b.motion.marks]){p.x+=dx;p.y+=dy;if(p.startX!==undefined){p.startX+=dx;p.startY+=dy;}}for(const p of [b.target,b.goal,b.scrape?.a,b.scrape?.b,b.introGoal,b.introStart])if(p){p.x+=dx;p.y+=dy;}if(b.lace){b.lace.x+=dx;b.lace.ex+=dx;b.lace.y+=dy;b.lace.y2+=dy;}}for(const q of ripples){q.x+=dx;q.y+=dy;}}
 function resizeBootstomp(){for(const e of hosts()){const b=state(e);if(b.phase==='intro'){const p=safePoint(-Math.PI/2);p.x=a.clamp(game.state.W*.25,75,game.state.W-75);b.introGoal={...p};b.introStart={x:p.x,y:-170};e.x=p.x;e.y=p.y;continue;}b.motion.feet=null;e.x=a.clamp(e.x,Math.min(110,game.state.W*.28),Math.max(game.state.W*.72,game.state.W-110));e.y=a.clamp(e.y,Math.min(145,game.state.H*.32),Math.max(145,game.state.H-95));if(b.phase==='windup'){b.age=0;b.target=landing(e,b.side);b.dent=null;}if(['lace','kick'].includes(b.phase)){b.passenger=null;setPhase(e,'lace_rebound');}}}
 function sprite(e,p){
  const b=state(e),code=names.map(n=>b.wear[n]).join(''),key=p.key+'/'+code;
  if(frameCache.has(key))return frameCache.get(key);const image=a.doodleArtwork('bootstomp/'+p.f.page);if(!image)return null;
  const c=document.createElement('canvas'),[x,y,w,h]=p.f.rect;c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(image,x,y,w,h,0,0,w,h);
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';
  for(const [j,n] of names.entries()){const rank=b.wear[n];if(!rank)continue;const q=p.f.parts[n],factor=1.13;ctx.globalAlpha=[0,.4,.72,.95][rank];ctx.beginPath();for(let i=0;i<20;i++){const angle=i*Math.PI/10,k=1+.065*Math.sin(i*2.4+j);const xx=q[0]+Math.cos(angle)*q[2]*factor*k,yy=q[1]+Math.sin(angle)*q[3]*factor*k;if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.closePath();ctx.fill();}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';frameCache.set(key,c);if(frameCache.size>40)frameCache.delete(frameCache.keys().next().value);return c;
 }
 function drawBootstomp(e){if(!isBootstomp(e))return false;const b=state(e),p=pose(e),ctx=game.dom.ctx;
  ctx.save();const image=sprite(e,p);ctx.translate(0,ground());if(b.phase==='intro'){const q=introPose(e);ctx.translate(0,q.offsetY);ctx.rotate(q.angle);ctx.scale(q.sx,q.sy);}if(p.flip)ctx.scale(-1,1);if(image)ctx.drawImage(image,-p.f.pivot[0]*p.scale,-p.f.pivot[1]*p.scale,p.f.rect[2]*p.scale,p.f.rect[3]*p.scale);else a.drawPaperDoodle?.('bootstomp',-70,-130,140,140);ctx.restore();
  if(b.phase==='lace'&&b.lace){ctx.save();ctx.strokeStyle='#49322b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(b.lace.x-e.x,b.lace.y-e.y);ctx.lineTo(b.lace.ex-e.x,b.lace.y2-e.y);ctx.stroke();ctx.strokeStyle='#f5e8ce';ctx.lineWidth=1;ctx.stroke();ctx.restore();}
  if(b.phase==='down'){const points=partPoints(e,p);ctx.save();ctx.lineWidth=1.5;for(const n of names){if(b.wear[n]>=3)continue;const q=points[n];ctx.strokeStyle=b.swipeCd>0?'#8298a0':'#557bb0';ctx.beginPath();ctx.arc(q.x-e.x,q.y-e.y,Math.max(8,q.rx)+4,-Math.PI/2,-Math.PI/2+Math.PI*2*(3-b.wear[n])/3);ctx.stroke();}ctx.restore();}
  if(b.phase!=='intro'&&b.phase!=='defeat'){const y=Math.max(-e.y+22,['walk','idle','intro'].includes(b.phase)?-86*size()/.38:ground()+(p.f.inkBounds[1]-p.f.pivot[1])*p.scale-15),w=130*size()/.76;ctx.save();ctx.fillStyle='#fff7e8';ctx.fillRect(-w/2-3,y-3,w+6,13);for(let i=0;i<5;i++){ctx.fillStyle='#d3c6ae';ctx.fillRect(-w/2+i*w/5,y,w/5-3,6);ctx.fillStyle='#4268b3';ctx.fillRect(-w/2+i*w/5,y,(w/5-3)*(3-b.wear[names[i]])/3,6);}ctx.restore();}return true;
 }
 function drawBootstompFields(){const ctx=game.dom.ctx;ctx.save();for(const e of hosts()){const b=state(e);if(b.phase==='intro'){
   const p=introPose(e);ctx.save();ctx.translate(e.x,e.y+ground());ctx.fillStyle='#66533f';ctx.globalAlpha=p.landed?.12:.08+p.fall*.12;ctx.beginPath();ctx.ellipse(0,0,17+p.fall*17,5+p.fall*3,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
   if(p.landed&&p.after<.5&&!a.enemyMotionReduced()){const t=p.after/.5;ctx.strokeStyle='#9b8c73';ctx.globalAlpha=(1-t)*.65;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,27+t*45,8+t*13,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*(27+t*28),Math.sin(a)*(8+t*8));ctx.lineTo(Math.cos(a)*(33+t*40),Math.sin(a)*(11+t*12));ctx.stroke();}}
   ctx.restore();
  }if(b.phase==='windup'&&b.target){const p=b.target,ready=pressure(e)>=tune.threshold;ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=ready?'#477c72':'#866e51';ctx.fillStyle=ready?'#8ebcab44':'#ead5a033';ctx.lineWidth=2;ctx.setLineDash(ready?[]:[5,4]);ctx.beginPath();ctx.ellipse(0,0,29,39,b.side==='left'?-.15:.15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);if(ready){ctx.fillStyle='#8c806b44';ctx.beginPath();ctx.ellipse(0,4,22,27,0,0,Math.PI*2);ctx.fill();}for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(-18,i*11);ctx.lineTo(18,i*11);ctx.stroke();}ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillStyle=ready?'#346e5a':'#67533e';ctx.fillText(ready?'READY · GO DRAW!':'PRESS HERE',0,Math.min(55,game.state.H-p.y-10));ctx.restore();}
   if(b.phase==='shockwave'&&b.age<.7){ctx.save();ctx.strokeStyle='#a66c44';ctx.lineWidth=3;ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(e.x,e.y+ground());ctx.lineTo(game.state.player.x,game.state.player.y);ctx.stroke();ctx.setLineDash([]);ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillStyle='#855332';ctx.fillText('DOUBLE STOMP!',e.x,e.y-75);ctx.restore();}
   if(b.phase==='kick'&&b.passenger){const p=kickLanding(e,b.passenger);ctx.save();ctx.strokeStyle='#a66c44';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.ellipse(p.x,p.y,20,12,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#855332';ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillText('INCOMING!',p.x,p.y-20);ctx.restore();}
   if(b.phase==='lace'&&b.lace){ctx.strokeStyle='#4d3630';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.lace.x,b.lace.y);ctx.lineTo(b.lace.ex,b.lace.y2);ctx.stroke();ctx.strokeStyle='#f7efdc';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#755d43';ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillText('DRAW ACROSS THE LACE',(b.lace.x+b.lace.ex)/2,b.lace.y-28);}
   if(b.phase==='scrape'&&b.scrape&&!b.scrape.done){ctx.strokeStyle='#a66f47';ctx.lineWidth=22;ctx.globalAlpha=.2;ctx.beginPath();ctx.moveTo(b.scrape.a.x,b.scrape.a.y);ctx.lineTo(b.scrape.b.x,b.scrape.b.y);ctx.stroke();ctx.globalAlpha=1;}
  }
  for(const p of ripples){const d=Math.hypot(game.state.player.x-p.x,game.state.player.y-p.y),dx=(game.state.player.x-p.x)/(d||1),dy=(game.state.player.y-p.y)/(d||1);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(dy,dx)+Math.PI/2);ctx.fillStyle='#fff8e7';ctx.strokeStyle=p.reduced?'#839b9e':'#797568';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-55,5);ctx.bezierCurveTo(-25,-12,25,-12,55,5);ctx.lineTo(55,11);ctx.bezierCurveTo(25,2,-25,2,-55,11);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}ctx.restore();
 }
 const snapshot=e=>{if(!isBootstomp(e))return null;const b=state(e);return {introDuration:b.enterDuration,introStart:{...b.introStart},introGoal:{...b.introGoal},phase:b.phase,age:b.age,time:b.time,side:b.side,target:b.target?{...b.target}:null,dent:b.dent?{...b.dent}:null,wear:{...b.wear},laceDamage:b.laceDamage,laceCount:b.laceCount,parts:partPoints(e),swipeCd:b.swipeCd,pressure:pressure(e),lace:b.lace?{...b.lace}:null,passenger:b.passenger?.type||null,kickCount:b.kickCount,shockCount:b.shockCount,ripples:ripples.filter(q=>q.owner===e).map(({owner,...q})=>({...q})),frame:pose(e).key,rubbing:rubOwner===e,intro:b.phase==='intro'?introPose(e):null,motion:{distance:b.motion.distance,lean:b.motion.lean,blend:b.motion.blend,feet:b.motion.feet?.map(f=>({...f}))||[],marks:b.motion.marks.map(p=>({...p}))},tuning:{...tune}};};
 Object.assign(a,{isBootstomp,initBootstomp,updateBootstomp,prepareBootstompDent,bootstompDentDelay:()=>.25,bootstompCrewScrub,bootstompDentGrowTime:()=>tune.dentGrow,bootstompPressTarget,bootstompRubTarget,captureBootstompRub,bootstompRubActive:()=>!!rubOwner,bootstompFriendHeld,eraseBootstompPath,resetBootstompRub,bootstompEraseHandled:()=>lastErase,counterBootstompStroke,clearBootstomp,resetBootstomp,moveBootstomp,resizeBootstomp,drawBootstomp,drawBootstompFields,bootstompSnapshot:snapshot});return {};
};
