/* Last-defeat presentation. Combat/rewards remain in their existing systems. */
DoodleDefender.systems.waveFinale=function createWaveFinale(game){
let finale=null,enabled=true;
const smooth=t=>{t=game.api.clamp(t,0,1);return t*t*(3-2*t)};
function waveFinaleActive(){return !!finale}
function resetWaveFinale(){finale=null}
function moveWaveFinale(dx,dy,width=game.state.W,height=game.state.H){if(finale){finale.enemy.x=game.api.clamp(finale.enemy.x+dx,finale.enemy.r,width-finale.enemy.r);finale.enemy.y=game.api.clamp(finale.enemy.y+dy,finale.enemy.r,height-finale.enemy.r)}}
function beginWaveFinale(enemy){
 if(!enabled||finale||!game.state.running||game.state.player.hp<=0||game.state.betweenWaves||game.state.inUpgrade)return false;
 const clear=game.state.wave%5===0?enemy.waveBoss&&game.api.bossFightResolved():game.state.timeLeft===0&&game.state.enemies.length===0;
 if(!clear)return false;
 const reduced=game.api.enemyMotionReduced(),boss=!!enemy.waveBoss;
 finale={age:0,duration:boss?(reduced?1.4:4.15):(reduced?.6:1.65),boss,reduced,enemy:{deskSwallowed:enemy.deskSwallowed===true,whiteBrother:enemy.whiteBrother,whiteKind:enemy.whiteKind,type:enemy.type,r:enemy.r,color:enemy.color,x:game.api.clamp(enemy.x,enemy.r,game.state.W-enemy.r),y:game.api.clamp(enemy.y,enemy.r,game.state.H-enemy.r),hp:1,maxHp:1,freeze:0,stun:0,burn:0,poison:0,gravitySlow:0,charged:0},popped:false};
 game.state.drawing=false;game.state.currentWall=null;game.api.stopSoundEffects();game.api.setMsg(boss?'You did it! Stevie is safe!':'One last doodle…');return true;
}
function updateWaveFinale(dt){
 if(!finale||game.state.paused)return;
 if(!game.state.running||game.state.player.hp<=0){resetWaveFinale();return;}
 if(game.api.enemyMotionReduced()&&!finale.reduced){finale.reduced=true;finale.duration=finale.boss?1.4:.6;}
 finale.age=Math.min(finale.duration,finale.age+dt);
 const popAt=finale.reduced?.22:1.02;
 if(!finale.popped&&finale.age>=popAt){finale.popped=true;game.api.playSound('defeated');if(finale.boss)game.api.celebrateStevie();}
 if(finale.age>=finale.duration){finale=null;game.api.waveComplete();}
}
function waveFinaleSnapshot(){return finale?{age:finale.age,duration:finale.duration,reduced:finale.reduced,boss:finale.boss,popped:finale.popped,type:finale.enemy.type,x:finale.enemy.x,y:finale.enemy.y}:null}
// A single world-space Stevie performs the celebration; the overlay never draws a second boy.
function bossVictoryPose(){
 if(!finale?.boss||!finale.popped)return null;
 const f=finale,t=f.age-(f.reduced?.22:1.02);
 const stage=t<.55?'relief':t<1.25?'jump':t<2.2?'dance':'wave';
 const start={relief:0,jump:.55,dance:1.25,wave:2.2}[stage],duration={relief:.55,jump:.7,dance:.95,wave:.93}[stage];
 return {stage,time:t,frame:f.reduced?15:({relief:0,jump:4,dance:8,wave:12}[stage]+Math.min(3,Math.floor(Math.max(0,t-start)/duration*4))),reduced:f.reduced};
}
function waveFinaleCamera(){
 const W=game.state.W,H=game.state.H;if(!finale||finale.reduced)return {x:W/2,y:H/2,zoom:1};
 const f=finale;
 if(f.boss&&f.age>1.02){
  const t=smooth((f.age-1.02)/.65),envelope=smooth(1.02/.28),oldZoom=1+envelope*.65;
  const zoom=oldZoom+(1.35-oldZoom)*t,p=game.state.player;
  const oldX=game.api.clamp(W/2+(f.enemy.x-W/2)*envelope,W/(2*oldZoom),W-W/(2*oldZoom)),oldY=game.api.clamp(H/2+(f.enemy.y-H/2)*envelope,H/(2*oldZoom),H-H/(2*oldZoom));
  return {zoom,x:game.api.clamp(oldX+(p.x-oldX)*t,W/(2*zoom),W-W/(2*zoom)),y:game.api.clamp(oldY+(p.y-oldY)*t,H/(2*zoom),H-H/(2*zoom))};
 }
 const envelope=smooth(f.age/.28)*(1-smooth((f.age-1.3)/.35)),zoom=1+envelope*.65;
 return {zoom,x:game.api.clamp(W/2+(f.enemy.x-W/2)*envelope,W/(2*zoom),W-W/(2*zoom)),y:game.api.clamp(H/2+(f.enemy.y-H/2)*envelope,H/(2*zoom),H-H/(2*zoom))};
}
function drawWaveFinale(drawEnemy){
 if(!finale)return;
 const f=finale,e=f.enemy,ctx=game.dom.ctx,popAt=f.reduced?.22:1.02;
 ctx.save();ctx.translate(e.x,e.y);
 if(e.deskSwallowed){ctx.fillStyle='#795183';ctx.font='bold 21px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillText(f.age<popAt?'…GULP.':'PAGE SAVED!',0,-e.r-24);ctx.restore();return;}
 if(e.type==='bootstomp'){ctx.restore();return;}
 if(f.age<popAt){
  const t=f.age/popAt,shake=f.reduced?0:Math.sin(f.age*55)*t*3;
  ctx.translate(shake,0);ctx.rotate(f.reduced?0:Math.sin(f.age*36)*t*.22);ctx.scale(1+t*.25,1-t*.13);
  if(!drawEnemy(e,1,false)){ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#8a4131';ctx.font='bold 18px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillText('?!',0,-e.r*2);
 }else{
  const t=game.api.clamp((f.age-popAt)/.38,0,1);ctx.globalAlpha=1-t;
  for(let i=0;i<12;i++){const a=i*Math.PI/6,r=e.r+(f.reduced?8:t*36);ctx.fillStyle=i%2?'#e9bf49':e.color;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,3*(1-t)+1,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;if(f.boss){ctx.restore();return;}ctx.fillStyle='#52733d';ctx.font='bold 24px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillText(t<.6?'POP!':'YAY!',0,-e.r-18);
 }
 ctx.restore();
}

function victoryStar(ctx,x,y,r,angle){
 ctx.beginPath();for(let i=0;i<10;i++){const a=angle+i*Math.PI/5,d=i%2?r*.43:r;if(i)ctx.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);else ctx.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}ctx.closePath();ctx.fill();ctx.stroke();
}
function drawBossVictory(){
 const pose=bossVictoryPose();if(!pose)return;
 const f=finale,ctx=game.dom.ctx,W=game.state.W,H=game.state.H,t=pose.time,width=Math.min(500,W-32),cx=W/2,cy=Math.min(H*.22,160),stamp=f.reduced?1:smooth(t/.22);
 ctx.save();
 // Finite paper confetti paths: no combat particle pool and no random rolls.
 for(let i=0;i<42;i++){
  const x=cx+Math.sin(i*2.4)*(W*.48)*Math.min(1,.15+t*.65),y=f.reduced?cy+95+(i%5)*30:cy+30+Math.sin(i*1.7)*45-t*(60+i%5*12)+t*t*85;
  if(y<30||y>H-20)continue;
  ctx.save();ctx.translate(x,y);ctx.rotate(f.reduced?i:i+t*(i%2?2:-2));ctx.fillStyle=['#dfb845','#426ab5','#52844d','#bd6478','#f1e8ce'][i%5];ctx.fillRect(-3,-5,6,10);ctx.restore();
 }
 ctx.save();ctx.translate(cx,cy);ctx.rotate(f.reduced?0:-.025);ctx.scale(stamp,stamp);
 // Torn notebook ribbon, rather than the old rectangular popup.
 ctx.fillStyle='#fff7df';ctx.strokeStyle='#9e865e';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(-width/2,-48);for(let i=1;i<=12;i++)ctx.lineTo(-width/2+i*width/12,-48+(i%2?3:-2));ctx.lineTo(width/2-7,-20);ctx.lineTo(width/2,5);ctx.lineTo(width/2-8,35);ctx.lineTo(width/2,63);for(let i=11;i>=0;i--)ctx.lineTo(-width/2+i*width/12,63+(i%2?2:-2));ctx.lineTo(-width/2+8,35);ctx.lineTo(-width/2,10);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#9db9c755';ctx.lineWidth=1;for(const y of [-20,8,36]){ctx.beginPath();ctx.moveTo(-width/2+10,y);ctx.lineTo(width/2-10,y);ctx.stroke();}
 ctx.textAlign='center';ctx.fillStyle='#345c32';ctx.font='bold '+Math.min(42,width/8.6)+'px "Stevie Pencil", cursive';ctx.fillText('BOSS BEATEN!',0,-4);
 ctx.fillStyle='#785b3e';ctx.font='bold '+Math.min(20,width/18)+'px "Stevie Pencil", cursive';ctx.fillText(game.api.monsterName(f.enemy.type)+' · defeated',0,27);
 ctx.fillStyle='#426ab5';ctx.font='bold 16px "Stevie Pencil", cursive';ctx.fillText('WAVE '+game.state.wave+' CLEARED',0,51);
 ctx.restore();
 ctx.fillStyle='#edc34d';ctx.strokeStyle='#987639';ctx.lineWidth=2;
 for(let i=0;i<5;i++){const x=cx+(i-2)*Math.min(52,width/6),y=cy-70-Math.sin(i*Math.PI/4)*10;victoryStar(ctx,x,y,(i===2?17:12)*(f.reduced?1:Math.min(1,Math.max(0,t-i*.04)*5)),-Math.PI/2);}
 const camera=waveFinaleCamera(),p=game.state.player,px=W/2+(p.x-camera.x)*camera.zoom,py=H/2+(p.y-camera.y)*camera.zoom;
 ctx.globalAlpha=f.reduced?1:smooth((t-.45)/.3);ctx.fillStyle='#fff6db';ctx.strokeStyle='#426ab5';ctx.lineWidth=2;
 const by=Math.min(H-50,py+94),bw=Math.min(230,W-40);
 ctx.beginPath();ctx.roundRect(px-bw/2,by-20,bw,37,12);ctx.fill();ctx.stroke();ctx.fillStyle='#345c32';ctx.textAlign='center';ctx.font='bold 18px "Stevie Pencil", cursive';ctx.fillText('I meant to do that!',px,by+4);
 ctx.restore();
}
const api={bossVictoryPose,drawBossVictory,moveWaveFinale,beginWaveFinale,updateWaveFinale,waveFinaleActive,resetWaveFinale,waveFinaleSnapshot,waveFinaleCamera,drawWaveFinale,setWaveFinaleEnabled:value=>{enabled=!!value;if(!enabled)resetWaveFinale()}};
Object.assign(game.api,api);return api;
};
