/* Wave 20, first playable White Brothers encounter. No ordinary add pressure. */
DoodleDefender.systems.whiteBrothersBoss=function(game){
 const api=game.api,rig=DoodleDefender.WhiteBrothersRig;
 const tuning={hp:1000,whiteCap:90,glueCap:90,brushSupply:32,whiteDamage:4,brushCap:6,planeCap:4,blobCap:8,trapCap:18,glueHold:2,glueRest:3};
 let fight=null,lastEraseHandled=false;
 const art={};
 for(const name of ['mr-out-animations','mr-glue-animations','whiteout-brush-sprites','mr-glue-effects','mr-glue-airplanes'])if(typeof Image!=='undefined'){
  const img=new Image();img.onload=()=>{art[name]=img;};img.src='assets/art/'+name+'.png';
 }
 function isWhiteBrother(e){return !!e&&(e.whiteBrother===true||(e.waveBoss&&e.type==='eraser'&&game.state.wave===20&&!game.state.endless));}
 function active(){return !!fight&&fight.host.hp>0&&game.state.enemies.includes(fight.host);}
 function playable(){return active()&&game.state.running&&!game.state.paused&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec&&!api.waveFinaleActive()&&!api.bossEntranceActive();}
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const near=(p,a,b,r)=>api.pointSegDist(p.x,p.y,a.x,a.y,b.x,b.y)<=r;
 function cue(text,color='#6f597e'){api.setMsg(text);if(text.length<36)api.floatText(game.state.player.x,game.state.player.y-60,text,color);}
 function resetWhiteBrothers(){fight=null;lastEraseHandled=false;}
 function initWhiteBrothers(host){
  if(fight?.host===host)return;
  resetWhiteBrothers();host.whiteBrother=true;host.whiteKind='out';host.hp=host.maxHp=tuning.hp;host.r=34;
  const W=game.state.W,H=game.state.H,p=game.state.player,glue=api.spawnEnemy(false,Math.min(W-45,p.x+W*.32),Math.max(70,p.y-H*.23),'mr-glue');
  glue.whiteBrother=true;glue.whiteKind='glue';glue.bossOwner=host;glue.hp=glue.maxHp=host.maxHp;glue.r=34;
  fight={host,glue,time:0,intro:2.8,white:0,glueInk:0,pencilStroke:false,glueStroke:false,brushes:[],planes:[],blobs:[],traps:[],strokes:[],smears:[],serial:0,paperBudget:12,
   actors:[{e:host,kind:'out',model:rig.create('wite'),angle:Math.PI*1.2,glued:0,resist:0,cast:0,cd:1.3,turn:0},{e:glue,kind:'glue',model:rig.create('glue'),angle:-.5,glued:0,resist:0,cast:0,cd:3.8,turn:0}],learned:new Set()};
  fight.actors.forEach(a=>rig.act(a.model,'intro'));
  api.setMsg('White Brothers! Draw across little brushes to collect whiteout. Erase floor glue to load your eraser.');
 }
 function clearWhiteBrothers(host){if(!fight||fight.host!==host)return;game.state.enemies=game.state.enemies.filter(e=>e!==fight.glue);resetWhiteBrothers();}
 function learn(id,text){if(fight&&!fight.learned.has(id)){fight.learned.add(id);cue(text);}}
 function hurt(amount,kind,target=fight?.host){
  if(!active()||fight.intro>0||!Number.isFinite(amount)||amount<=0)return;
  const host=fight.host,before=host.hp,actual=Math.min(before,amount);host.hp=Math.max(0,before-amount);fight.glue.hp=host.hp;
  api.damageNumber(target,actual,kind,before>0&&host.hp<=0);
  const actor=fight.actors.find(a=>a.e===target);if(actor)actor.flash=.16;
 }
 function routeWhiteBrotherDamage(e,amount,kind,source){
  if(!isWhiteBrother(e))return false;
  if(!active())return true;
  if(source?.whiteout)hurt(amount,'reflected',e);
  else if(source?.rock){const damage=Math.min(Math.max(0,amount),fight.paperBudget);fight.paperBudget-=damage;hurt(damage,'physical',e);}
  return true;
 }
 function boundary(e){const {W,H}=game.state,r=e.r+12;return {x:api.clamp(e.x,r,Math.max(r,W-r)),y:api.clamp(e.y,Math.min(80,H*.15)+r,Math.max(r,H-r-20))};}
 function eraseBodyPath(e,old){
  // Enemy erasing cuts actual gaps, bypassing explosions/refunds and other player counters.
  api.eraseWallPath(old,e,e.r+10,{enemy:true});
 }
 function makeBrushes(actor){
  const s=fight,p=game.state.player;
  for(let i=-1;i<=1&&s.brushes.length<tuning.brushCap;i++){
   const angle=Math.atan2(p.y-actor.e.y,p.x-actor.e.x)+i*.32;
   s.brushes.push({id:++s.serial,x:actor.e.x+Math.cos(angle)*44,y:actor.e.y+Math.sin(angle)*44,r:16,supply:tuning.brushSupply,age:0,glued:0,flee:false,angle});
  }
  learn('brush','Draw over their bristles—even with an empty ink tank!');
 }
 function addBlob(x,y){x=api.clamp(x,32,game.state.W-32);y=api.clamp(y,85,Math.max(85,game.state.H-32));if(fight.blobs.length>=tuning.blobCap)fight.blobs.shift();fight.blobs.push({id:++fight.serial,x,y,r:29,supply:36,age:0,life:30});}
 function throwPlane(actor){
  if(fight.planes.length>=tuning.planeCap)return;
  const p=game.state.player,angle=Math.atan2(p.y-actor.e.y,p.x-actor.e.x);
  fight.planes.push({id:++fight.serial,x:actor.e.x,y:actor.e.y,r:15,angle,age:0,life:16});
 }
 function moveActor(actor,dt){
  const e=actor.e,p=game.state.player,old={x:e.x,y:e.y};
  actor.glued=Math.max(0,actor.glued-dt);actor.resist=Math.max(0,actor.resist-dt);actor.flash=Math.max(0,(actor.flash||0)-dt);
  if(actor.glued>0){rig.act(actor.model,'tantrum');return;}
  actor.angle+=dt*.29;const radiusX=Math.max(70,game.state.W*.34),radiusY=Math.max(65,game.state.H*.32);
  const goal=boundary({...e,x:p.x+Math.cos(actor.angle)*radiusX,y:p.y+Math.sin(actor.angle)*radiusY}),d=distance(goal,e),speed=actor.cast>0?12:55,step=Math.min(d,speed*dt);
  if(d>0){e.x+=(goal.x-e.x)/d*step;e.y+=(goal.y-e.y)/d*step;}
  const min=api.refugeBounds(),safe=Math.max(min.halfWidth,min.halfHeight)+e.r+30,dist=distance(e,p);
  if(dist<safe){const angle=dist>1?Math.atan2(e.y-p.y,e.x-p.x):actor.angle;e.x=p.x+Math.cos(angle)*safe;e.y=p.y+Math.sin(angle)*safe;Object.assign(e,boundary(e));}
  eraseBodyPath(e,old);
 }
 function updateWhiteBrothers(e,dt){
  if(!isWhiteBrother(e)||!e.waveBoss||!playable())return;
  if(!fight)initWhiteBrothers(e);
  const s=fight;dt=Math.min(.1,Math.max(0,dt));s.time+=dt;s.paperBudget=Math.min(12,s.paperBudget+12*dt);
  if(s.intro>0){s.intro=Math.max(0,s.intro-dt);if(s.intro===0)addBlob(s.glue.x+35,s.glue.y+35);for(const a of s.actors)rig.update(a.model,dt);return;}
  for(const a of s.actors){
   moveActor(a,dt);rig.update(a.model,dt);if(a.glued>0)continue;
   a.cd-=dt;
   if(a.cast>0){a.cast-=dt;if(a.cast<=0){if(a.kind==='out')makeBrushes(a);else{addBlob(a.e.x+(a.turn%2?-1:1)*42,a.e.y+34);throwPlane(a);learn('glue','Erase a glue puddle, then rub the page to leave sticky traps!');}a.cd=a.kind==='out'?5.8:4.6;a.turn++;rig.act(a.model,'walk');}}
   else if(a.cd<=0){a.cast=a.kind==='out'?1:3.2;if(a.kind==='glue')api.playSound('paperTear');rig.act(a.model,a.kind==='out'?'attack':'throw');}
   else if(a.model.action!=='walk')rig.act(a.model,'walk');
   if(a.resist<=0){const trap=s.traps.find(t=>t.life>0&&distance(t,a.e)<t.r+a.e.r);if(trap){trap.life=0;a.glued=tuning.glueHold;a.resist=tuning.glueHold+tuning.glueRest;learn('pin','Stuck! Paint either brother with whiteout to rub out their shared health.');}}
  }
  const p=game.state.player;
  for(const b of s.brushes){
   b.age+=dt;b.glued=Math.max(0,b.glued-dt);
   if(!b.flee&&b.glued<=0&&s.traps.some(t=>distance(t,b)<t.r+b.r&&t.life>0)){b.glued=3;}
   if(b.flee){b.x+=Math.cos(b.angle)*140*dt;b.y+=Math.sin(b.angle)*140*dt;continue;}
   if(b.glued>0)continue;
   const angle=Math.atan2(p.y-b.y,p.x-b.x),speed=game.state.W<600?32:45;b.x+=Math.cos(angle)*speed*dt;b.y+=Math.sin(angle)*speed*dt;
   if(distance(b,p)<p.r+18){api.damageStevie(9,'Whiteout brush');s.smears.push({kind:'white',age:0,life:4,offset:(b.id%3-1)*12});b.flee=true;b.supply=0;b.angle=angle+Math.PI;}
  }
  s.brushes=s.brushes.filter(b=>b.age<24&&b.x>-65&&b.y>-65&&b.x<game.state.W+65&&b.y<game.state.H+65);
  for(const plane of s.planes){
   const old={x:plane.x,y:plane.y};plane.age+=dt;plane.life-=dt;
   const target=Math.atan2(p.y-plane.y,p.x-plane.x),turn=Math.atan2(Math.sin(target-plane.angle),Math.cos(target-plane.angle));plane.angle+=api.clamp(turn,-dt*.45,dt*.45);
   const speed=game.state.W<600?48:65;plane.x+=Math.cos(plane.angle)*speed*dt;plane.y+=Math.sin(plane.angle)*speed*dt;
   if(s.traps.some(t=>t.life>0&&near(t,old,plane,t.r+plane.r))){plane.life=0;api.floatText(plane.x,plane.y,'STUCK!','#8b6c98');}
   else if(near(p,old,plane,p.r+plane.r)){plane.life=0;api.damageStevie(12,'Sticky airplane');s.smears.push({kind:'plane',age:0,life:5,offset:(plane.id%3-1)*10});}
  }
  s.planes=s.planes.filter(p=>p.life>0&&p.x>-60&&p.x<game.state.W+60&&p.y>-60&&p.y<game.state.H+60);
  for(const list of [s.blobs,s.traps,s.strokes,s.smears])for(const item of list){item.age+=dt;item.life-=dt;}
  s.blobs=s.blobs.filter(b=>b.life>0&&b.supply>0);s.traps=s.traps.filter(t=>t.life>0);s.strokes=s.strokes.filter(t=>t.life>0);s.smears=s.smears.filter(t=>t.life>0).slice(-3);
 }
 function brushNear(a,b){return fight?.brushes.find(p=>!p.flee&&p.supply>0&&near(p,a,b,p.r+22));}
 function canStartWhitePencil(p){return playable()&&(fight.white>0||!!p&&!!brushNear(p,p));}
 function whitePencilPath(a,b,begin=false){
  if(!playable())return false;const s=fight,brush=brushNear(a,b),length=distance(a,b);
  if(!s.pencilStroke&&s.white<=0&&!brush)return false;
  s.pencilStroke=true;
  if(brush&&s.white<tuning.whiteCap){
   const amount=Math.min(brush.supply,tuning.whiteCap-s.white,begin?3:Math.min(22,length));brush.supply-=amount;s.white+=amount;
   if(amount>0)learn('loaded','Whiteout loaded! Scribble over either brother.');
   if(brush.supply<=.01){brush.flee=true;brush.angle=Math.atan2(brush.y-game.state.player.y,brush.x-game.state.player.x);api.floatText(brush.x,brush.y-24,'I’M OUT!','#6a6785');}
   return true;
  }
  if(s.white>0&&length>.1){
   const cost=Math.min(s.white,length*.24),coverage=cost/(length*.24);s.white-=cost;
   s.strokes.push({a:{...a},b:{x:a.x+(b.x-a.x)*coverage,y:a.y+(b.y-a.y)*coverage},age:0,life:1.8});if(s.strokes.length>70)s.strokes.shift();
   for(const actor of s.actors)if(near(actor.e,a,s.strokes.at(-1).b,actor.e.r+10))api.dealDamage(actor.e,cost*tuning.whiteDamage,'reflected',{whiteout:true});
   if(s.white<=.001){s.white=0;cue('Whiteout empty—normal pencil ready.');}
  }
  return true;
 }
 function whiteGluePath(a,b,r=20){
  lastEraseHandled=false;if(!playable())return null;const s=fight,blob=s.blobs.find(p=>p.supply>0&&near(p,a,b,p.r+r)),length=distance(a,b);
  if(!s.glueStroke&&s.glueInk<=0&&!blob)return null;
  s.glueStroke=true;lastEraseHandled=true;
  if(blob&&s.glueInk<tuning.glueCap){const amount=Math.min(blob.supply,tuning.glueCap-s.glueInk,Math.max(2,Math.min(24,length)));blob.supply-=amount;s.glueInk+=amount;learn('sticky','Sticky eraser! Rub under a brother or in a brush’s path.');return true;}
  if(s.glueInk>0){
   const cost=Math.min(s.glueInk,Math.max(2,length*.3)),end={x:b.x,y:b.y};s.glueInk-=cost;
   const count=Math.min(8,Math.max(1,Math.ceil(length/20)));for(let i=1;i<=count;i++){const u=i/count,p={x:a.x+(end.x-a.x)*u,y:a.y+(end.y-a.y)*u};if(!s.traps.some(t=>t.life>0&&distance(t,p)<16)){s.traps.push({...p,r:25,age:0,life:9});if(s.traps.length>tuning.trapCap)s.traps.shift();}}
   if(s.glueInk<=.001){s.glueInk=0;cue('Glue used up—normal eraser ready.');}
  }
  return true;
 }
 function resetWhiteToolsStroke(){if(fight){fight.pencilStroke=false;fight.glueStroke=false;}lastEraseHandled=false;}
 function moveWhiteBrothers(dx,dy){if(!fight)return;for(const list of [fight.brushes,fight.planes,fight.blobs,fight.traps])for(const p of list){p.x+=dx;p.y+=dy;}for(const t of fight.strokes){t.a.x+=dx;t.a.y+=dy;t.b.x+=dx;t.b.y+=dy;}}
 function sprite(ctx,name,index,cols,rows,x,y,w,h){const img=art[name];if(!img)return false;const cw=img.naturalWidth/cols,ch=img.naturalHeight/rows;ctx.drawImage(img,(index%cols)*cw,Math.floor(index/cols)*ch,cw,ch,x-w/2,y-h/2,w,h);return true;}
 function planeSprite(ctx,index,x,y,w,h){const img=art['mr-glue-airplanes'];if(!img)return false;const xs=[0,322,644,966,1287],ys=[0,326,629,938,1222],col=index%4,row=Math.floor(index/4);ctx.drawImage(img,xs[col],ys[row],xs[col+1]-xs[col],ys[row+1]-ys[row],x-w/2,y-h/2,w,h);return true;}
 function glueBlob(ctx,b,trap=false){if(sprite(ctx,'mr-glue-effects',8+(api.enemyMotionReduced()?0:Math.floor((fight.time+b.age)*4)%4),4,3,b.x,b.y,b.r*2.8,b.r*2.3))return;ctx.fillStyle=trap?'#d6c0e6':'#fff9df';ctx.strokeStyle='#9b86a5';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,b.r,b.r*.6,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
 function drawWhiteBrotherBody(e){
  if(!isWhiteBrother(e)&&!['eraser','mr-glue'].includes(e.type))return false;const ctx=game.dom.ctx,actor=fight?.actors.find(a=>a.e===e),model=actor?.model||rig.create(e.whiteKind==='glue'||e.type==='mr-glue'?'glue':'wite'),scale=e.r/85;
  ctx.save();ctx.scale(scale,scale);if(actor?.flash>0)ctx.globalAlpha=.65;
  if(actor?.kind==='glue'&&actor.cast>0&&art['mr-glue-airplanes']){const t=1-actor.cast/3.2,index=Math.min(11,Math.floor(t*12));planeSprite(ctx,index,0,0,225,235);}
  else rig.draw(ctx,{wite:art['mr-out-animations'],glue:art['mr-glue-animations']},model,{reduced:api.enemyMotionReduced()});ctx.restore();
  if(actor?.glued>0){ctx.fillStyle='#9d72b7';ctx.font='bold 12px "Stevie Pencil",cursive';ctx.textAlign='center';ctx.fillText('STUCK!',0,-e.r-13);}
  return true;
 }
 function drawWhiteBrothersFields(){
  if(!active())return;const ctx=game.dom.ctx,s=fight,reduced=api.enemyMotionReduced();ctx.save();
  for(const b of s.blobs){glueBlob(ctx,{...b,r:b.r*Math.max(.35,b.supply/36)});if(!s.learned.has('sticky')){ctx.fillStyle='#5d4378';ctx.textAlign='center';ctx.font='bold 12px \"Stevie Pencil\",cursive';ctx.fillText('Erase to collect',api.clamp(b.x,60,game.state.W-60),b.y-25);}}
  for(const t of s.traps){ctx.globalAlpha=Math.min(1,t.life);glueBlob(ctx,t,true);}ctx.globalAlpha=1;

  for(const b of s.brushes){if(!b.flee&&!s.learned.has('loaded')){ctx.fillStyle='#514167';ctx.textAlign='center';ctx.font='bold 12px \"Stevie Pencil\",cursive';ctx.fillText('Draw me!',api.clamp(b.x,45,game.state.W-45),b.y-27);}const f=b.flee?11:b.glued>0?(reduced?8:8+Math.floor(s.time*4)%2):b.supply<12?10:reduced?0:Math.floor(b.age*10)%8;
   if(!sprite(ctx,'whiteout-brush-sprites',f,4,3,b.x,b.y,46,46)){ctx.fillStyle=b.flee?'#9c9695':'#fffdf0';ctx.strokeStyle='#2c405d';ctx.fillRect(b.x-12,b.y-14,24,26);ctx.strokeRect(b.x-12,b.y-14,24,26);}
  }
  for(const p of s.planes){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);if(!planeSprite(ctx,12+(reduced?0:Math.floor(p.age*4)%4),0,reduced?0:Math.sin(p.age*3)*3,55,45)){ctx.fillStyle='#fff9df';ctx.beginPath();ctx.moveTo(23,0);ctx.lineTo(-20,-13);ctx.lineTo(-10,0);ctx.lineTo(-20,13);ctx.closePath();ctx.fill();}ctx.restore();}
  ctx.restore();
 }
 function drawWhiteBrothersHud(){
  if(!active())return;const ctx=game.dom.ctx,s=fight,W=game.state.W,p=game.state.player,width=Math.min(W-20,380),x=(W-width)/2;ctx.save();for(const t of s.strokes){ctx.globalAlpha=Math.min(.9,t.life);ctx.strokeStyle='#77708a';ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(t.a.x,t.a.y);ctx.lineTo(t.b.x,t.b.y);ctx.stroke();ctx.strokeStyle='#fffdf0';ctx.lineWidth=10;ctx.stroke();}ctx.globalAlpha=1;
  ctx.font='bold 13px "Stevie Pencil",cursive';ctx.textAlign='center';ctx.fillStyle='#fff9e8';ctx.fillRect(x,7,width,55);ctx.strokeStyle='#877c94';ctx.strokeRect(x,7,width,55);ctx.fillStyle='#44354f';ctx.fillText('WHITE BROTHERS · '+Math.ceil(s.host.hp)+' / '+s.host.maxHp,W/2,23);ctx.fillStyle='#b26380';ctx.fillRect(x+7,28,(width-14)*s.host.hp/s.host.maxHp,5);ctx.fillStyle='#44354f';ctx.fillText((s.white>0?'Pencil: WHITEOUT '+Math.ceil(s.white):'Pencil: normal ink')+'  |  '+(s.glueInk>0?'Eraser: GLUE '+Math.ceil(s.glueInk):'Eraser: normal'),W/2,51);
  for(const m of s.smears){ctx.globalAlpha=Math.min(.85,m.life);if(m.kind==='plane')planeSprite(ctx,13,p.x+m.offset,p.y,39,32);else{ctx.fillStyle='#fffdf0';ctx.beginPath();ctx.ellipse(p.x+m.offset,p.y-4,13,19,.3,0,Math.PI*2);ctx.fill();}}ctx.restore();
 }
 const exported={isWhiteBrother,whiteBrothersActive:active,initWhiteBrothers,clearWhiteBrothers,resetWhiteBrothers,routeWhiteBrotherDamage,updateWhiteBrothers,canStartWhitePencil,whitePencilPath,whiteGluePath,resetWhiteToolsStroke,whiteToolsEraseHandled:()=>lastEraseHandled,moveWhiteBrothers,drawWhiteBrotherBody,drawWhiteBrothersFields,drawWhiteBrothersHud,whiteBrothersFightSnapshot:()=>fight?{time:fight.time,intro:fight.intro,white:fight.white,glueInk:fight.glueInk,hp:fight.host.hp,maxHp:fight.host.maxHp,brushes:fight.brushes.map(b=>({...b})),planes:fight.planes.map(p=>({...p})),blobs:fight.blobs.map(b=>({...b})),traps:fight.traps.map(t=>({...t})),actors:fight.actors.map(a=>({kind:a.kind,x:a.e.x,y:a.e.y,glued:a.glued,resist:a.resist,cast:a.cast})),strokes:fight.strokes.length}:null};Object.assign(api,exported);return exported;
};
