/* A finite construction crew that borrows existing basic doodles. */
DoodleDefender.systems.catapulter=function(game){
 let appearances=0;
 const basics=new Set(['grunt','fast','bouncer']);
 const tuning={cap:3,setup:2.5,warning:1.25,cooldown:4,flight:1.05};
 function canSpawnCatapulter(){return game.state.wave>=11&&game.state.wave%5!==0&&appearances<tuning.cap&&!game.state.enemies.some(e=>e.type==='catapulter'&&e.hp>0);}
 function registerCatapulter(){return ++appearances;}
 function resetCatapulterRun(){appearances=0;}
 function say(e,text){if(e.catapult){e.catapult.speech=text;e.catapult.speechLeft=2;}}
 function site(e){const p=game.state.player,dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1,reach=Math.min(240,Math.max(135,Math.min(game.state.W,game.state.H)*.4));return {x:game.api.clamp(p.x+dx/d*reach,48,game.state.W-48),y:game.api.clamp(p.y+dy/d*reach,115,game.state.H-80)};}
 function release(e){const c=e.catapult;if(c?.passenger){delete c.passenger.catapultHeld;c.passenger=null;}if(c){c.target=null;c.phase='ready';c.left=1;}}
 function heldByCatapulter(e){const id=e.catapultHeld;if(!id)return false;const owner=game.state.enemies.find(n=>n.catapultId===id);if(!owner){delete e.catapultHeld;return false;}const c=owner.catapult;if(owner.hp<=0||!game.state.enemies.includes(owner)||c?.phase!=='aim'||c.passenger!==e||owner.stun>0||owner.freeze>0||game.api.underPaper(owner)){delete e.catapultHeld;return false;}e.x=c.x+(c.x<game.state.player.x?-32:32);e.y=c.y-34;return true;}
 function updateCatapulter(e,dt){
  if(e.type!=='catapulter')return false;
  const c=e.catapult||(e.catapult={phase:'walk',left:tuning.setup,wear:0,inside:false,age:0,goal:site(e)});c.age+=dt;c.speechLeft=Math.max(0,(c.speechLeft||0)-dt);
  if(c.phase==='tantrum'||c.phase==='flee'){
   if(c.phase==='tantrum'){c.left-=dt;if(c.left<=1e-8)c.phase='flee';return true;}
   const sign=e.x<game.state.player.x?-1:1;e.x+=sign*115*dt;e.y+=Math.sin(c.age*13)*dt*9;
   if(e.x<-e.r*3||e.x>game.state.W+e.r*3)game.state.enemies=game.state.enemies.filter(n=>n!==e);
   return true;
  }
  if(e.stun>0||e.freeze>0){if(c.phase==='aim')release(e);return true;}
  const hit=game.api.nearestWallHit(e)||game.api.gravityWallHit(e);if(hit)game.api.dealDamage(e,game.api.applyInkContact(e,dt,hit.wall)*dt,'physical');if(e.hp<=0)return true;
  if(c.phase==='walk'){
   const dx=c.goal.x-e.x,dy=c.goal.y-e.y,d=Math.hypot(dx,dy),step=Math.min(d,e.speed*dt);
   if(d>6){if(!game.api.moveEnemySafely(e,dx/(d||1)*step,dy/(d||1)*step)){c.blocked=(c.blocked||0)+dt;if(c.blocked>2&&Math.hypot(e.x-game.state.player.x,e.y-game.state.player.y)>125){c.goal={x:game.api.clamp(e.x,48,game.state.W-48),y:game.api.clamp(e.y,115,game.state.H-80)};}}return true;}
   c.x=game.api.clamp(e.x+(e.x<game.state.player.x?45:-45),48,game.state.W-48);c.y=e.y+20;c.phase='build';c.left=tuning.setup;say(e,'SOME ASSEMBLY REQUIRED!');return true;
  }
  c.left-=dt;
  if(c.phase==='build'){if(c.left<=1e-8){c.phase='ready';c.left=.5;say(e,'ERASE MY CATAPULT? RUDE.');}return true;}
  if(c.phase==='aim'){
   if(!c.passenger||c.passenger.hp<=0||!game.state.enemies.includes(c.passenger)){release(e);return true;}
   if(c.left<=1e-8){const n=c.passenger;delete n.catapultHeld;n.x=c.x+(c.x<game.state.player.x?-32:32);n.y=c.y-34;n.flight={catapult:true,startX:n.x,startY:n.y,targetX:c.target.x,targetY:c.target.y,age:0,duration:tuning.flight,height:72,spin:n.x<c.target.x?1:-1};c.passenger=null;c.phase='ready';c.target=null;c.left=tuning.cooldown;c.kick=.35;game.api.floatText(n.x,n.y-30,'Weeeeeee!','#854488');game.api.playSound('wall');}return true;
  }
  c.kick=Math.max(0,(c.kick||0)-dt);if(c.left>0)return true;
  const n=game.state.enemies.filter(n=>n!==e&&basics.has(n.type)&&n.hp>0&&!n.waveBoss&&!n.bossOwner&&!n.flight&&!n.catapultHeld&&!game.api.bossFriendHeld(n)&&!game.api.underPaper(n)&&n.stun<=0&&n.freeze<=0&&Math.hypot(n.x-c.x,n.y-c.y)<120&&game.api.bouncePathClear(n,c.x,c.y,0)).sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
  if(n){c.passenger=n;n.catapultHeld=e.catapultId;n.x=c.x+(c.x<game.state.player.x?-32:32);n.y=c.y-34;c.target={x:game.state.player.x,y:game.state.player.y};c.phase='aim';c.left=tuning.warning;say(e,'INCOMING! DRAW A CATCHER!');}return true;
 }
 function updateCatapultFlight(e,dt){
  const f=e.flight;if(!f?.catapult)return false;
  if(e.hp<=0){delete e.flight;game.api.killEnemy(e);return true;}
  const before=f.age/f.duration;f.age=Math.min(f.duration,f.age+dt);const t=f.age/f.duration;
  // Check the whole swept descent, even when a slow frame skips across a wall.
  const start=Math.max(before,.55),steps=Math.ceil(Math.max(0,t-start)*Math.hypot(f.targetX-f.startX,f.targetY-f.startY)/5);
  for(let i=0;i<=steps&&t>=start;i++){const u=steps?start+(t-start)*i/steps:t;e.x=f.startX+(f.targetX-f.startX)*u;e.y=f.startY+(f.targetY-f.startY)*u;const hit=game.api.nearestWallHit(e);if(hit){delete e.flight;if(game.api.touchesRefuge(e)){const p=game.state.player,dx=f.startX-p.x,dy=f.startY-p.y,d=Math.hypot(dx,dy)||1;e.x=p.x+dx/d*110;e.y=p.y+dy/d*110;}e.stun=Math.max(e.stun,1.2);game.api.damageWall(hit.wall,e.dmg*2,e.x,e.y);game.api.burst(e.x,e.y,'#cfb47b',9);game.api.floatText(e.x,e.y-25,'CAUGHT!','#456d49');return true;}}
  e.x=f.startX+(f.targetX-f.startX)*t;e.y=f.startY+(f.targetY-f.startY)*t;
  if(t>=1){delete e.flight;if(game.api.touchesRefuge(e)){game.api.damageStevie(e.dmg*2*(1-game.state.stats.playerArmor),'Catapult '+game.api.monsterName(e.type)+' impact',e);game.state.enemies=game.state.enemies.filter(n=>n!==e);game.api.burst(e.x,e.y,e.color,10);}else{e.stun=Math.max(e.stun,.8);game.api.floatText(e.x,e.y,'THUD!','#854488');}}return true;
 }
 function eraseCatapults(a,b,r){let changed=false;for(const e of game.state.enemies){const c=e.catapult;if(e.type!=='catapulter'||e.hp<=0||!c||!['build','ready','aim'].includes(c.phase))continue;const touches=game.api.pointSegDist(c.x,c.y,a.x,a.y,b.x,b.y)<=r+32;if(!touches){c.inside=false;continue;}if(!c.inside){c.wear++;changed=true;game.api.burst(c.x,c.y,'#ddaf62',8);if(c.wear>=3){release(e);c.phase='tantrum';c.left=1.5;say(e,'I’M TIRED OF IT ALL!');}else say(e,c.wear===1?'HEY! THAT WAS MY SPOON!':'THAT’S MY GOOD RUBBER BAND!');}c.inside=Math.hypot(b.x-c.x,b.y-c.y)<=r+32;}return changed;}
 function resetCatapultEraseStroke(){for(const e of game.state.enemies)if(e.catapult)e.catapult.inside=false;}
 function drawCatapults(){const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();ctx.save();for(const e of game.state.enemies){const c=e.catapult;if(e.type!=='catapulter'||!c||e.hp<=0||game.api.underPaper(e))continue;
   if(['build','ready','aim'].includes(c.phase)){const image=game.api.doodleArtwork('school-catapult');if(image){const scale=!reduced&&c.phase==='build'?.3+.7*(1-c.left/tuning.setup):1;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(reduced?0:Math.sin(c.age*(c.phase==='build'?18:5))*(c.phase==='build'?.07:.015)+(c.kick||0)*-.35);ctx.scale(scale*(c.x<game.state.player.x?1:-1),scale);ctx.globalAlpha=1-c.wear*.18;ctx.drawImage(image,-48,-38,96,64);ctx.restore();}for(let i=0;i<3;i++){ctx.fillStyle=i<c.wear?'#bdb3a1':'#9b6d2f';ctx.fillRect(c.x-15+i*12,c.y+31,8,4);}}
   if(c.phase==='aim'&&c.target)mark(c.target,c.left/tuning.warning);
   if(c.speechLeft>0)bubble(e,c.speech);
   if(c.phase==='tantrum'){ctx.font='bold 20px cursive';ctx.fillStyle='#a54860';ctx.fillText('?!',e.x+20,e.y-30);}
  }
  for(const e of game.state.enemies)if(e.flight?.catapult)mark({x:e.flight.targetX,y:e.flight.targetY},1-e.flight.age/e.flight.duration);
  ctx.restore();
 }
 function bubble(e,text){const ctx=game.dom.ctx;ctx.font='16px "Stevie Pencil", cursive';const lines=[''];for(const word of text.split(' ')){const i=lines.length-1,next=lines[i]?lines[i]+' '+word:word;if(ctx.measureText(next).width>185&&lines[i])lines.push(word);else lines[i]=next;}const width=Math.max(90,...lines.map(line=>ctx.measureText(line).width))+18,height=lines.length*18+10,x=game.api.clamp(e.x,width/2+8,game.state.W-width/2-8),y=Math.max(80,e.y-50-height);ctx.save();ctx.fillStyle='#fff8df';ctx.strokeStyle='#95668d';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-width/2,y,width,height,6);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-5,y+height);ctx.lineTo(e.x,e.y-34);ctx.lineTo(x+5,y+height);ctx.fill();ctx.stroke();ctx.fillStyle='#714069';ctx.textAlign='center';lines.forEach((line,i)=>ctx.fillText(line,x,y+19+i*18));ctx.restore();}
 function mark(p,remaining){const ctx=game.dom.ctx;ctx.strokeStyle='#af4770';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(p.x,p.y,38,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(p.x,p.y,43,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-remaining));ctx.stroke();}
 function moveCatapults(dx,dy){for(const e of game.state.enemies){const c=e.catapult;if(!c)continue;for(const q of [c.goal,c.target])if(q){q.x+=dx;q.y+=dy;}if(Number.isFinite(c.x)){c.x+=dx;c.y+=dy;}}}
 const api={canSpawnCatapulter,registerCatapulter,resetCatapulterRun,updateCatapulter,heldByCatapulter,updateCatapultFlight,eraseCatapults,resetCatapultEraseStroke,drawCatapults,moveCatapults,catapulterSnapshot:()=>({appearances,cap:tuning.cap})};Object.assign(game.api,api);return api;
};
