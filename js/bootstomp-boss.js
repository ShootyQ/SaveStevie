/* Wave 10: committed stomps, real paper-pressure counter, persistent rub-outs.
 * Simulation owns all clocks/randomness. Rendering only selects drawn frames. */
DoodleDefender.systems.bootstompBoss=function(game){
 const a=game.api,atlas=DoodleDefender.bootstompArt;
 const tune={charge:3.25,threshold:.8,exposure:3.2,swipeDistance:18,swipeGap:.6,rippleDamage:14,rippleSpeed:370,helperCap:14,enterSpeed:88,challengeDuration:1.44,helperRate:.7};
 const names=['left_fist','right_fist','left_boot','right_boot','star'];
 let brains=new WeakMap(),ripples=[],lastErase=false,serial=0,frameCache=new Map();
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
  const p=safePoint(-Math.PI/2);e.x=p.x;e.y=p.y;e.r=30;e.speed=110;e.hp=e.maxHp=150;e.waveBoss=true;
  const b={phase:'intro',age:0,time:0,wear:Object.fromEntries(names.map(n=>[n,0])),turn:0,attack:0,side:'right',target:null,goal:null,helperCd:1,helperSerial:0,swipeCd:0,rubs:{},reaction:0,passenger:null,kickCd:0,kickCount:0,shockCount:0,finished:false,introGoal:{x:p.x,y:p.y},introStart:{x:p.x<game.state.W/2?-120:game.state.W+120,y:p.y}};b.enterDuration=Math.max(1.2,Math.abs(b.introGoal.x-b.introStart.x)/tune.enterSpeed);e.x=b.introStart.x;brains.set(e,b);
  a.resetCircleShapes();a.setMsg('Bootstomp! Hold the eraser in his footprint until he lands. When he falls, rub out his five patches!');return b;
 }
 function state(e){return brains.get(e)||initBootstomp(e);}
 function setPhase(e,phase){const b=state(e);b.phase=phase;b.age=0;}
 function clipAt(e){
  const b=state(e),left=b.side==='left';
  if(b.phase==='intro')return b.age<b.enterDuration?['intro_enter',(b.age*.5)%1.2]:['intro_challenge',b.age-b.enterDuration];
  if(b.phase==='walk')return ['walk',b.age];
  if(b.phase==='shockwave')return b.age<.7?['windup_right',b.age*3/.7]:['impact_'+(b.shockCount===1?'right':'left'),b.age-(b.shockCount===1?.7:1.25)];
  if(b.phase==='kick')return ['shoe_scrape',b.age];
  if(b.phase==='windup')return ['windup_'+b.side,b.age*3/tune.charge];
  if(b.phase==='impact')return ['impact_'+b.side,b.age];
  if(b.phase==='stumble')return ['stumble_'+b.side,b.age];
  if(b.phase==='fall')return [left?'faceplant_left':'faceplant',b.age];
  if(b.phase==='down'&&b.reaction>0)return [b.patchReaction?'patch_gone':'rub_flinch',b.reactTotal-b.reaction];
  if(b.phase==='down')return [left?'fallen_left':'fallen',b.age];
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
 function partPoints(e,p=pose(e)){
  const result={},parts=p.f.parts;for(const n of names){const q=parts[n],x=(q[0]-p.f.pivot[0])*p.scale;result[n]={x:e.x+(p.flip?-x:x),y:e.y+ground()+(q[1]-p.f.pivot[1])*p.scale,rx:q[2]*p.scale,ry:q[3]*p.scale};}return result;
 }
 function landing(e,side){
  const p=pose(e,['impact_'+side,.1]),q=partPoints(e,p)[side+'_boot'];return {x:q.x,y:e.y+ground()-5,r:29};
 }
 function beginStomp(e){const b=state(e);b.side=b.turn%2?'left':'right';b.turn++;b.target=landing(e,b.side);setPhase(e,'windup');a.setMsg('Hold Erase still in the footprint. Keep holding when the paper buckles!');}
 function pressure(e){const b=state(e),p=a.paperPressSnapshot().press;return p&&b.target&&Math.hypot(p.x-b.target.x,p.y-b.target.y)<=b.target.r?Math.max(0,Math.min(1,(p.age-.4)/2.5)):0;}
 function bootstompPressTarget(p){return hosts().some(e=>{const b=state(e);return b.phase==='windup'&&b.target&&Math.hypot(p.x-b.target.x,p.y-b.target.y)<=b.target.r;});}
 function bootstompRubTarget(p){return hosts().some(e=>state(e).phase==='down'&&Math.abs(p.x-e.x)<145*size()/.76&&p.y>e.y-115&&p.y<e.y+95);}
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
 function helpers(e,dt){const b=state(e);if(['down','fall','stumble','defeat','intro'].includes(b.phase))return;b.helperCd-=dt;if(b.helperCd>0)return;
  b.helperCd=a.firstBossTuning(e).helperGap/(2*tune.helperRate);
  if(game.state.enemies.filter(n=>n.bossOwner===e&&n.hp>0).length>=tune.helperCap)return;
  const i=b.helperSerial++%4,{W,H}=game.state;
  const n=a.spawnEnemy(false,i===1?W+26:i===3?-26:W*(i===0?.25:.75),i===0?-26:i===2?H+26:H*(i===1?.3:.7),'grunt');if(n)n.bossOwner=e;
 }
 function chooseAttack(e){const b=state(e);b.attack++;
  // Stomps remain the main opportunity; specials interrupt the rhythm without
  // ever changing a committed foot target or destroying it during that charge.
  if(b.attack%2!==0){beginStomp(e);return;}
  if(b.attack%6===0){
   const friend=game.state.enemies.find(n=>n.bossOwner===e&&n.hp>0&&!n.flight&&!a.underPaper(n));
   if(friend){const side=e.x>game.state.W/2?-1:1;b.passenger=friend;b.lace={side,x:e.x+side*45,y:e.y-8,ex:a.clamp(e.x+side*135,24,game.state.W-24),y2:e.y-18};setPhase(e,'lace');a.setMsg('Draw across the stretched shoelace to snap it back!');return;}
  }
  if(b.attack%4===0&&names.filter(n=>b.wear[n]===3).length>=2){b.scrape={a:{x:e.x-75,y:e.y+ground()-10},b:{x:e.x+105,y:e.y+ground()-10},done:false};setPhase(e,'scrape');return;}
  b.shockCount=0;setPhase(e,'shockwave');a.setMsg('DOUBLE STOMP! Draw walls across the paper waves to catch them.');
 }
 // Kicks happen during relocation: nearby helpers go over walls toward alternate
 // flanks, never onto the fort. Existing flights supply the arc and ground shadow.
 function kickFriend(e){const b=state(e);if(b.kickCd>0)return false;
  const p=game.state.player,clear=Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight);
  const n=game.state.enemies.filter(n=>n.bossOwner===e&&n.hp>0&&!n.flight&&!n.hurdle&&!n.catapultHeld&&!a.underPaper(n)&&!a.bossFriendHeld(n)&&n.freeze<=0&&n.stun<=0&&Math.hypot(n.x-e.x,n.y-e.y)<170&&Math.hypot(n.x-p.x,n.y-p.y)>clear+n.r+75).sort((n,m)=>Math.hypot(n.x-e.x,n.y-e.y)-Math.hypot(m.x-e.x,m.y-e.y))[0];
  if(!n)return false;b.passenger=n;b.kickCd=4;setPhase(e,'kick');a.setMsg('Bootstomp is lining up a kick! Watch the landing mark.');return true;
 }
 function kickLanding(e,n){const b=state(e),p=game.state.player,angle=Math.atan2(e.y-p.y,e.x-p.x)+(b.kickCount%2?-.65:.65),r=Math.max(p.r+n.r+82,Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+n.r+40),margin=n.r+25;
  return {x:a.clamp(p.x+Math.cos(angle)*r,margin,game.state.W-margin),y:a.clamp(p.y+Math.sin(angle)*r,n.r+80,game.state.H-margin)};
 }
 function launchRipple(e,blocked=false){const b=state(e),p=blocked?landing(e,b.shockCount===1?'right':'left'):b.target;ripples.push({id:++serial,owner:e,x:p.x,y:p.y,blocked,reduced:false,age:0});if(ripples.length>8)ripples.shift();a.playSound('woodImpact');}
 function updateRipples(e,dt){for(const q of ripples.filter(q=>q.owner===e)){
  const p=game.state.player,dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy),step=Math.min(d,tune.rippleSpeed*dt),nx=q.x+(dx/(d||1))*step,ny=q.y+(dy/(d||1))*step;
  if(!q.reduced){const hit=a.bossShotWallHit({x:q.x,y:q.y,r:6},nx,ny);if(hit){if(q.blocked){q.done=true;a.damageWall(hit.wall,hit.wall.maxHp*.4,q.x,q.y);a.burst(nx,ny,'#b6a17a',8);a.floatText(nx,ny-14,'CAUGHT!','#648171');continue;}q.reduced=true;a.damageWall(hit.wall,hit.wall.maxHp*.4,q.x,q.y);a.floatText(q.x,q.y-14,'SOFTENED','#648171');}}
  q.x=nx;q.y=ny;q.age+=dt;if(d<=step+p.r+4){a.damageStevie(tune.rippleDamage*(q.reduced?.5:1)*(1-game.state.stats.playerArmor),'Bootstomp paper ripple',e);q.done=true;}
 }ripples=ripples.filter(q=>!q.done&&q.owner.hp>0);}
 function bootstompFriendHeld(n){const host=n.bossOwner;if(!isBootstomp(host)||host.hp<=0)return false;const b=brains.get(host);return b?.passenger===n&&['lace','kick'].includes(b.phase)&&n.hp>0&&game.state.enemies.includes(host);}
 function updateBootstomp(e,dt){
  if(!playable()||!isBootstomp(e))return;const b=state(e);if(e.hp<=0)return;
  b.age+=dt;b.time+=dt;b.kickCd=Math.max(0,b.kickCd-dt);b.swipeCd=Math.max(0,b.swipeCd-dt);b.reaction=Math.max(0,b.reaction-dt);e.freeze=e.stun=e.gravitySlow=e.burn=e.poison=e.charged=0;
  if(b.phase==='defeat'){if(b.age>=3.09){e.hp=0;a.killEnemy(e);}return;}
  updateRipples(e,dt);helpers(e,dt);sweep(e,e,e);
  if(b.phase==='intro'){const t=Math.min(1,b.age/b.enterDuration),old={x:e.x,y:e.y};e.x=b.introStart.x+(b.introGoal.x-b.introStart.x)*t;e.y=b.introGoal.y;sweep(e,old,e);if(Math.floor(b.age/.6)!==Math.floor((b.age-dt)/.6)&&b.age<b.enterDuration)a.playSound('chonksStep');if(b.age>=b.enterDuration+tune.challengeDuration){setPhase(e,'idle');a.setMsg('Bootstomp · Hold his footprint, then rub out the fallen patches!');}return;}
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
   if(b.age>=tune.charge){if(pressure(e)>=tune.threshold){a.cancelPaperPress();setPhase(e,'stumble');a.playSound('boingBounce');a.floatText(e.x,e.y-75,'BAD FOOTING!','#386db0');}else{setPhase(e,'impact');launchRipple(e);}}return;
  }
  if(b.phase==='stumble'){if(b.age>=.48){setPhase(e,'fall');a.playSound('woodImpact');}return;}
  if(b.phase==='fall'){if(b.age>=.72){setPhase(e,'down');b.rubs={};a.floatText(e.x,e.y-85,'RUB THE PATCHES!','#4268a2');a.setMsg('Rub back and forth on a fist, boot or chest star! Three swipes erase each patch.');}return;}
  if(b.phase==='down'){if(b.age>=tune.exposure){setPhase(e,'recover');b.rubs={};}return;}
  if(b.phase==='recover'||b.phase==='impact'||b.phase==='lace_rebound'||b.phase==='lace_throw'){
   const duration={recover:.94,impact:.65,lace_rebound:.85,lace_throw:.25}[b.phase];if(b.age>=duration){b.goal=safePoint(b.turn*.9);setPhase(e,b.phase==='recover'?'tantrum':'walk');}return;
  }
  if(b.phase==='tantrum'){advance(e,b.goal,dt,names.filter(n=>b.wear[n]===3).length>=4?190:155);if(b.age>=.65)setPhase(e,'walk');return;}
  if(b.phase==='walk'){if(kickFriend(e))return;if(advance(e,b.goal||safePoint(b.turn),dt)||b.age>2){setPhase(e,'idle');}return;}
  if(b.phase==='scrape'){if(b.age>=.38&&!b.scrape.done){b.scrape.done=true;sweep(e,b.scrape.a,b.scrape.b,23);a.playSound('monsterWall');}if(b.age>=.98){b.goal=safePoint(b.turn*.9);setPhase(e,'tantrum');}return;}
  if(b.phase==='lace'){
   const n=b.passenger;if(!n||n.hp<=0||!game.state.enemies.includes(n)){b.passenger=null;setPhase(e,'lace_rebound');return;}
   n.x=b.lace.ex;n.y=b.lace.y2;
   if(b.age>=1.6){b.passenger=null;const p=game.state.player,angle=Math.atan2(e.y-p.y,e.x-p.x),r=Math.hypot(a.refugeBounds().halfWidth,a.refugeBounds().halfHeight)+n.r+35,target={x:a.clamp(p.x+Math.cos(angle)*r,n.r+25,game.state.W-n.r-25),y:a.clamp(p.y+Math.sin(angle)*r,n.r+80,game.state.H-n.r-25)};a.flingBossFriend(n,target);a.playSound('boingBounce');setPhase(e,'lace_throw');}return;
  }
 }
 function eraseBootstompPath(from,to,r){
  lastErase=false;if(!playable())return false;const length=Math.hypot(to.x-from.x,to.y-from.y);if(length<6)return false;
  for(const e of hosts()){const b=state(e);if(b.phase!=='down')continue;const parts=partPoints(e);
   const found=names.filter(n=>b.wear[n]<3&&a.pointSegDist(parts[n].x,parts[n].y,from.x,from.y,to.x,to.y)<=Math.max(parts[n].rx,parts[n].ry)+r*.65).sort((n,m)=>Math.hypot(to.x-parts[n].x,to.y-parts[n].y)-Math.hypot(to.x-parts[m].x,to.y-parts[m].y))[0];
   if(!found){b.rubs={};if(bootstompRubTarget(to))lastErase=true;continue;}lastErase=true;
   const dir={x:(to.x-from.x)/length,y:(to.y-from.y)/length},rub=b.rubs[found]||(b.rubs[found]={travel:0,dir:null,spent:false});
   if(rub.spent&&rub.dir&&dir.x*rub.dir.x+dir.y*rub.dir.y<-.35){rub.spent=false;rub.travel=0;}
   if(!rub.spent)rub.travel+=length;if(rub.spent||rub.travel<tune.swipeDistance||b.swipeCd>0)return false;
   rub.spent=true;rub.dir=dir;b.swipeCd=tune.swipeGap;b.wear[found]++;b.patchReaction=b.wear[found]===3&&b.wear.star===3;b.reactTotal=b.patchReaction?.68:.54;b.reaction=b.reactTotal;
   const total=names.reduce((sum,n)=>sum+b.wear[n],0);e.hp=Math.max(1,e.maxHp*(1-total/15));a.playSound(b.wear[found]===3?'paperPop':'paperHit');a.floatText(parts[found].x,parts[found].y-18,b.wear[found]===3?'RUBBED OUT!':(3-b.wear[found])+' swipes','#4872a2');
   if(total===15){b.finished=true;b.passenger=null;setPhase(e,'defeat');ripples=[];game.state.enemies=game.state.enemies.filter(n=>n.bossOwner!==e);a.endDraw();a.setMsg('Bootstomp is out of excuses. And quite a lot of drawing.');}
   return true;
  }return false;
 }
 function resetBootstompRub(){lastErase=false;for(const e of hosts())state(e).rubs={};}
 function counterBootstompStroke(points){
  if(!playable()||points.length<2)return false;
  for(const e of hosts()){const b=state(e);if(b.phase!=='lace'||b.age<.2||!b.lace)continue;const p={x:b.lace.x,y:b.lace.y},q={x:b.lace.ex,y:b.lace.y2};
   for(let i=1;i<points.length;i++)if(Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y)>=6&&(a.segmentIntersection(points[i-1],points[i],p,q)||Math.min(a.pointSegDist(points[i].x,points[i].y,p.x,p.y,q.x,q.y),a.pointSegDist(points[i-1].x,points[i-1].y,p.x,p.y,q.x,q.y))<5)){
    b.passenger=null;setPhase(e,'lace_rebound');a.playSound('boingBounce');a.floatText(e.x,e.y-70,'SNAP!','#9b6846');return true;
   }
  }return false;
 }
 function clearBootstomp(e){ripples=ripples.filter(q=>q.owner!==e);const b=brains.get(e);if(b)b.passenger=null;}
 function resetBootstomp(){brains=new WeakMap();ripples=[];lastErase=false;frameCache.clear();}
 function moveBootstomp(dx,dy){for(const e of hosts()){const b=state(e);for(const p of [b.target,b.goal,b.scrape?.a,b.scrape?.b,b.introGoal,b.introStart])if(p){p.x+=dx;p.y+=dy;}if(b.lace){b.lace.x+=dx;b.lace.ex+=dx;b.lace.y+=dy;b.lace.y2+=dy;}}for(const q of ripples){q.x+=dx;q.y+=dy;}}
 function resizeBootstomp(){for(const e of hosts()){const b=state(e);if(b.phase==='intro')continue;e.x=a.clamp(e.x,Math.min(110,game.state.W*.28),Math.max(game.state.W*.72,game.state.W-110));e.y=a.clamp(e.y,Math.min(145,game.state.H*.32),Math.max(145,game.state.H-95));if(b.phase==='windup'){b.age=0;b.target=landing(e,b.side);}if(['lace','kick'].includes(b.phase)){b.passenger=null;setPhase(e,'lace_rebound');}}}
 function sprite(e,p){
  const b=state(e),code=names.map(n=>b.wear[n]).join(''),key=p.key+'/'+code;
  if(frameCache.has(key))return frameCache.get(key);const image=a.doodleArtwork('bootstomp/'+p.f.page);if(!image)return null;
  const c=document.createElement('canvas'),[x,y,w,h]=p.f.rect;c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(image,x,y,w,h,0,0,w,h);
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';
  for(const [j,n] of names.entries()){const rank=b.wear[n];if(!rank)continue;const q=p.f.parts[n],factor=1.13;ctx.globalAlpha=[0,.4,.72,.95][rank];ctx.beginPath();for(let i=0;i<20;i++){const angle=i*Math.PI/10,k=1+.065*Math.sin(i*2.4+j);const xx=q[0]+Math.cos(angle)*q[2]*factor*k,yy=q[1]+Math.sin(angle)*q[3]*factor*k;if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.closePath();ctx.fill();}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';frameCache.set(key,c);if(frameCache.size>40)frameCache.delete(frameCache.keys().next().value);return c;
 }
 function drawBootstomp(e){if(!isBootstomp(e))return false;const b=state(e),p=pose(e),image=sprite(e,p),ctx=game.dom.ctx;ctx.save();ctx.translate(0,ground());if(p.flip)ctx.scale(-1,1);
  if(image)ctx.drawImage(image,-p.f.pivot[0]*p.scale,-p.f.pivot[1]*p.scale,p.f.rect[2]*p.scale,p.f.rect[3]*p.scale);
  else a.drawPaperDoodle?.('bootstomp',-70,-130,140,140);ctx.restore();
  if(b.phase==='lace'&&b.lace){ctx.save();ctx.strokeStyle='#49322b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(b.lace.x-e.x,b.lace.y-e.y);ctx.lineTo(b.lace.ex-e.x,b.lace.y2-e.y);ctx.stroke();ctx.strokeStyle='#f5e8ce';ctx.lineWidth=1;ctx.stroke();ctx.restore();}
  if(b.phase==='down'){const points=partPoints(e,p);ctx.save();ctx.lineWidth=1.5;for(const n of names){if(b.wear[n]>=3)continue;const q=points[n];ctx.strokeStyle=b.swipeCd>0?'#8298a0':'#557bb0';ctx.beginPath();ctx.arc(q.x-e.x,q.y-e.y,Math.max(8,q.rx)+4,-Math.PI/2,-Math.PI/2+Math.PI*2*(3-b.wear[n])/3);ctx.stroke();}ctx.restore();}
  if(b.phase!=='intro'&&b.phase!=='defeat'){const y=Math.max(-e.y+22,ground()+(p.f.inkBounds[1]-p.f.pivot[1])*p.scale-15),w=130*size()/.76;ctx.save();ctx.fillStyle='#fff7e8';ctx.fillRect(-w/2-3,y-3,w+6,13);for(let i=0;i<5;i++){ctx.fillStyle='#d3c6ae';ctx.fillRect(-w/2+i*w/5,y,w/5-3,6);ctx.fillStyle='#4268b3';ctx.fillRect(-w/2+i*w/5,y,(w/5-3)*(3-b.wear[names[i]])/3,6);}ctx.restore();}return true;
 }
 function drawBootstompFields(){const ctx=game.dom.ctx;ctx.save();for(const e of hosts()){const b=state(e);if(b.phase==='windup'&&b.target){const p=b.target,ready=pressure(e)>=tune.threshold;ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=ready?'#477c72':'#866e51';ctx.fillStyle=ready?'#8ebcab44':'#ead5a033';ctx.lineWidth=2;ctx.setLineDash(ready?[]:[5,4]);ctx.beginPath();ctx.ellipse(0,0,29,39,b.side==='left'?-.15:.15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(-18,i*11);ctx.lineTo(18,i*11);ctx.stroke();}ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillStyle=ready?'#346e5a':'#67533e';ctx.fillText(ready?'KEEP HOLDING!':'HOLD ERASE',0,Math.min(55,game.state.H-p.y-10));ctx.restore();}
   if(b.phase==='shockwave'&&b.age<.7){ctx.save();ctx.strokeStyle='#a66c44';ctx.lineWidth=3;ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(e.x,e.y+ground());ctx.lineTo(game.state.player.x,game.state.player.y);ctx.stroke();ctx.setLineDash([]);ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillStyle='#855332';ctx.fillText('DOUBLE STOMP!',e.x,e.y-75);ctx.restore();}
   if(b.phase==='kick'&&b.passenger){const p=kickLanding(e,b.passenger);ctx.save();ctx.strokeStyle='#a66c44';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.ellipse(p.x,p.y,20,12,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#855332';ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillText('INCOMING!',p.x,p.y-20);ctx.restore();}
   if(b.phase==='lace'&&b.lace){ctx.strokeStyle='#4d3630';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.lace.x,b.lace.y);ctx.lineTo(b.lace.ex,b.lace.y2);ctx.stroke();ctx.strokeStyle='#f7efdc';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#755d43';ctx.font='bold 12px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillText('DRAW ACROSS THE LACE',(b.lace.x+b.lace.ex)/2,b.lace.y-28);}
   if(b.phase==='scrape'&&b.scrape&&!b.scrape.done){ctx.strokeStyle='#a66f47';ctx.lineWidth=22;ctx.globalAlpha=.2;ctx.beginPath();ctx.moveTo(b.scrape.a.x,b.scrape.a.y);ctx.lineTo(b.scrape.b.x,b.scrape.b.y);ctx.stroke();ctx.globalAlpha=1;}
  }
  for(const p of ripples){const d=Math.hypot(game.state.player.x-p.x,game.state.player.y-p.y),dx=(game.state.player.x-p.x)/(d||1),dy=(game.state.player.y-p.y)/(d||1);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(dy,dx)+Math.PI/2);ctx.fillStyle='#fff8e7';ctx.strokeStyle=p.reduced?'#839b9e':'#797568';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-55,5);ctx.bezierCurveTo(-25,-12,25,-12,55,5);ctx.lineTo(55,11);ctx.bezierCurveTo(25,2,-25,2,-55,11);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}ctx.restore();
 }
 const snapshot=e=>{if(!isBootstomp(e))return null;const b=state(e);return {introDuration:b.enterDuration,introStart:{...b.introStart},introGoal:{...b.introGoal},phase:b.phase,age:b.age,time:b.time,side:b.side,target:b.target?{...b.target}:null,wear:{...b.wear},parts:partPoints(e),swipeCd:b.swipeCd,pressure:pressure(e),lace:b.lace?{...b.lace}:null,passenger:b.passenger?.type||null,kickCount:b.kickCount,shockCount:b.shockCount,ripples:ripples.filter(q=>q.owner===e).map(({owner,...q})=>({...q})),frame:pose(e).key,tuning:{...tune}};};
 Object.assign(a,{isBootstomp,initBootstomp,updateBootstomp,bootstompPressTarget,bootstompRubTarget,bootstompFriendHeld,eraseBootstompPath,resetBootstompRub,bootstompEraseHandled:()=>lastErase,counterBootstompStroke,clearBootstomp,resetBootstomp,moveBootstomp,resizeBootstomp,drawBootstomp,drawBootstompFields,bootstompSnapshot:snapshot});return {};
};
