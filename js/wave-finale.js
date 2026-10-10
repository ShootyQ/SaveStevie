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
 finale={age:0,duration:boss?(reduced?1:2.8):(reduced?.6:1.65),boss,reduced,enemy:{type:enemy.type,r:enemy.r,color:enemy.color,x:game.api.clamp(enemy.x,enemy.r,game.state.W-enemy.r),y:game.api.clamp(enemy.y,enemy.r,game.state.H-enemy.r),hp:1,maxHp:1,freeze:0,stun:0,burn:0,poison:0,gravitySlow:0,charged:0},popped:false};
 game.state.drawing=false;game.state.currentWall=null;game.api.stopSoundEffects();game.api.setMsg(boss?'You did it! Stevie is safe!':'One last doodle…');return true;
}
function updateWaveFinale(dt){
 if(!finale||game.state.paused)return;
 if(!game.state.running||game.state.player.hp<=0){resetWaveFinale();return;}
 if(game.api.enemyMotionReduced()&&!finale.reduced){finale.reduced=true;finale.duration=finale.boss?1:.6;}
 finale.age=Math.min(finale.duration,finale.age+dt);
 const popAt=finale.reduced?.22:1.02;
 if(!finale.popped&&finale.age>=popAt){finale.popped=true;game.api.playSound('defeated');if(finale.boss)game.api.celebrateStevie();}
 if(finale.age>=finale.duration){finale=null;game.api.waveComplete();}
}
function waveFinaleSnapshot(){return finale?{age:finale.age,duration:finale.duration,reduced:finale.reduced,boss:finale.boss,popped:finale.popped,type:finale.enemy.type,x:finale.enemy.x,y:finale.enemy.y}:null}
function waveFinaleCamera(){
 const W=game.state.W,H=game.state.H;if(!finale||finale.reduced)return {x:W/2,y:H/2,zoom:1};
 const f=finale,envelope=smooth(f.age/.28)*(1-smooth((f.age-1.3)/.35)),zoom=1+envelope*.65;
 return {zoom,x:game.api.clamp(W/2+(f.enemy.x-W/2)*envelope,W/(2*zoom),W-W/(2*zoom)),y:game.api.clamp(H/2+(f.enemy.y-H/2)*envelope,H/(2*zoom),H-H/(2*zoom))};
}
function drawWaveFinale(drawEnemy){
 if(!finale)return;
 const f=finale,e=f.enemy,ctx=game.dom.ctx,popAt=f.reduced?.22:1.02;
 ctx.save();ctx.translate(e.x,e.y);
 if(f.age<popAt){
  const t=f.age/popAt,shake=f.reduced?0:Math.sin(f.age*55)*t*3;
  ctx.translate(shake,0);ctx.rotate(f.reduced?0:Math.sin(f.age*36)*t*.22);ctx.scale(1+t*.25,1-t*.13);
  if(!drawEnemy(e,1,false)){ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#8a4131';ctx.font='bold 18px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillText('?!',0,-e.r*2);
 }else{
  const t=game.api.clamp((f.age-popAt)/.38,0,1);ctx.globalAlpha=1-t;
  for(let i=0;i<12;i++){const a=i*Math.PI/6,r=e.r+(f.reduced?8:t*36);ctx.fillStyle=i%2?'#e9bf49':e.color;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,3*(1-t)+1,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;ctx.fillStyle='#52733d';ctx.font='bold 24px "Stevie Pencil", cursive';ctx.textAlign='center';ctx.fillText(t<.6?'POP!':'YAY!',0,-e.r-18);
 }
 ctx.restore();
}

function drawBossVictory(){
 if(!finale?.boss||!finale.popped)return;
 const f=finale,ctx=game.dom.ctx,W=game.state.W,H=game.state.H,t=f.age-(f.reduced?.22:1.02),width=Math.min(360,W-32),cx=W/2,cy=Math.max(150,H*.28);
 ctx.save();
 // Screen-space paper scraps stay legible during the close-up on phones.
 for(let i=0;i<28;i++){
  const x=16+(i*97%(Math.max(1,W-32))),y=f.reduced?cy-65+(i%5)*25:100+((i*53+t*(65+i%4*15))%Math.max(100,H-180));
  ctx.save();ctx.translate(x,y);ctx.rotate(f.reduced?0:i+t*(i%2?1:-1));ctx.fillStyle=['#d8b53c','#426ab5','#52844d','#bc5c71'][i%4];ctx.fillRect(-3,-5,6,10);ctx.restore();
 }
 ctx.fillStyle='#fff6db';ctx.strokeStyle='#52733d';ctx.lineWidth=3;ctx.fillRect(cx-width/2,cy-46,width,106);ctx.strokeRect(cx-width/2,cy-46,width,106);
 ctx.textAlign='center';ctx.fillStyle='#345c32';ctx.font='bold '+Math.min(32,width/10)+'px "Stevie Pencil", cursive';ctx.fillText('BOSS BEATEN!',cx,cy-8);
 ctx.fillStyle='#29343b';ctx.font='18px "Stevie Pencil", cursive';ctx.fillText('You saved Stevie!',cx,cy+22);
 const art=game.api.doodleArtwork(f.reduced||t>.6?'stevie-cheer-b':'stevie-cheer-a');
 if(art){const h=92,w=h*art.naturalWidth/art.naturalHeight,bounce=f.reduced?0:Math.abs(Math.sin(t*7))*6;ctx.drawImage(art,cx-w/2,cy+76-bounce,w,h);}
 ctx.restore();
}
const api={drawBossVictory,moveWaveFinale,beginWaveFinale,updateWaveFinale,waveFinaleActive,resetWaveFinale,waveFinaleSnapshot,waveFinaleCamera,drawWaveFinale,setWaveFinaleEnabled:value=>{enabled=!!value;if(!enabled)resetWaveFinale()}};
Object.assign(game.api,api);return api;
};
