/* Run-only discoveries, permanently unlocked in the Notebook. */
DoodleDefender.systems.doodleScraps=function(game){
 const elements=[
  {id:'fire',name:'Fire paper',color:'#c25a30',desc:'Paper balls ignite monsters for a short burn.'},
  {id:'electric',name:'Electric paper',color:'#386ac3',desc:'Paper balls spark a small chain of lightning. Crossing walls charges ink or releases sparks.'},
  {id:'poison',name:'Poison paper',color:'#528237',desc:'Paper balls add a little stacking poison.'},
  {id:'frost',name:'Frost paper',color:'#387f98',desc:'Paper balls briefly freeze and slow monsters.'},
  {id:'eraser',name:'Eraser paper',color:'#ae537a',desc:'Paper balls rub out 3 extra damage. Each hit wipes a chunk off Rubble Ruff (three chunks total)!'}
 ];
 let clock=0,lastDrop=-100,kills=0,found=0,drop=null,offers=[],element=null;
 function unlocked(){return game.api.notebookSnapshot().levels.doodleScraps>0;}
 function resetDoodleScraps(){clock=0;lastDrop=-100;kills=0;found=0;drop=null;offers=[];element=null;}
 function doodleScrapsSnapshot(){return {unlocked:unlocked(),clock,found,kills,element,drop:drop?{...drop}:null,offers:offers.map(e=>e.id)};}
 function dropDoodleScrap(e){
  if(!unlocked()||game.api.devRunActive()||game.api.testLabActive?.()||!game.state.running||e.waveBoss||game.catalog.enemyDefs?.[e.type]?.boss||['mini','jamling','wobble-tooth','boss','stapler','crayon','eraser'].includes(e.type))return false;
  kills++;if(drop||offers.length||found>=4||clock-lastDrop<20)return false;
  if(!(found===0&&kills>=8)&&Math.random()>=.08)return false;
  let x=game.api.clamp(e.x,26,game.state.W-26),y=game.api.clamp(e.y,100,game.state.H-30);
  if(Math.hypot(x-game.state.player.x,y-game.state.player.y)<80)y=game.api.clamp(game.state.player.y-100,100,game.state.H-30);
  drop={x,y,life:45,reel:0};lastDrop=clock;found++;
  game.api.setMsg('A Doodle Scrap! Draw through it to reel it in.');return true;
 }
 function collectDoodleScrap(points,paid){
  if(!drop||drop.reel)return false;
  for(let i=1;i<points.length;i++)if(game.api.pointSegDist(drop.x,drop.y,points[i-1].x,points[i-1].y,points[i].x,points[i].y)<=20){drop.reel=.001;drop.fromX=drop.x;drop.fromY=drop.y;return true;}
  return false;
 }
 function openDoodleChoice(){
  const pool=elements.filter(e=>e.id!==element);offers=[];
  while(offers.length<2){const i=Math.floor(Math.random()*pool.length);offers.push(pool.splice(i,1)[0]);}
  for(let i=0;i<2;i++){game.dom.$('doodleChoice'+i).textContent=offers[i].name;game.dom.$('doodleDescription'+i).textContent=offers[i].desc;}
  game.dom.$('doodleCurrent').textContent=element?'Using '+elements.find(e=>e.id===element).name+'. Pick a new element to replace it, or keep this one.':'Choose an element for Stevie’s paper balls. It lasts for this run; your normal wave upgrade is still yours.';
  game.dom.$('doodleKeep').textContent=element?'Keep my current paper':'Keep ordinary paper';
  game.api.openInfo('doodle');
 }
 function updateDoodleScraps(dt){
  clock+=dt;if(!drop)return false;
  if(drop.reel){drop.reel+=dt;const t=Math.min(1,drop.reel/.45);drop.x=drop.fromX+(game.state.player.x-drop.fromX)*t;drop.y=drop.fromY+(game.state.player.y-drop.fromY)*t-Math.sin(t*Math.PI)*30;
   if(t===1&&!game.api.infoOpen()){drop=null;openDoodleChoice();return true;}
  }else{drop.life-=dt;if(drop.life<=0)drop=null;}
  return false;
 }
 function chooseDoodle(index){
  if(!offers[index]||game.dom.$('doodleOverlay').style.display!=='grid')return false;
  element=offers[index].id;
  if(!game.state.stats.rockRate){game.state.stats.rockDamage=Math.max(4,game.state.stats.rockDamage);game.state.stats.rockRate=1.6;}
  game.api.setMsg(elements.find(e=>e.id===element).name+' ready! Find another scrap to swap.');
  game.api.closeInfo(false);return true;
 }
 function dismissDoodleChoice(){offers=[];}
 function applyDoodleHit(e,id){
  if(!id||e.hp<=0||game.api.underPaper(e))return;
  if(id==='fire'){e.burn=Math.max(e.burn,2);e.burnDps=Math.max(e.burnDps,5.5);}
  if(id==='poison'){e.poison=Math.min(6,e.poison+1);e.poisonDps=Math.max(e.poisonDps,4.5);}
  if(id==='frost'){e.gravitySlow=Math.max(e.gravitySlow,.2);e.freeze=Math.max(e.freeze,.3);}
  if(id==='electric')game.api.chainLightning(e,1);
  if(id==='eraser'){if(e.type==='scrubber'){game.api.eraseScrubber(e);return;}game.api.dealDamage(e,3,'erase');}
 }
 function moveDoodleScraps(dx,dy){if(!drop)return;drop.x+=dx;drop.y+=dy;if(drop.fromX!==undefined){drop.fromX+=dx;drop.fromY+=dy;}if(!drop.reel){drop.x=game.api.clamp(drop.x,26,game.state.W+2*dx-26);drop.y=game.api.clamp(drop.y,100,game.state.H+2*dy-30);}}
 function drawDoodleScraps(){
  if(!drop)return;const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();ctx.save();ctx.translate(drop.x,drop.y+(reduced?0:Math.sin(clock*4)*2));ctx.rotate(reduced?0:Math.sin(clock*2)*.09);ctx.fillStyle='#fff2ba';ctx.strokeStyle='#7f6138';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-13,-16);ctx.lineTo(8,-16);ctx.lineTo(14,-10);ctx.lineTo(13,15);ctx.lineTo(-14,13);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#456caa';ctx.beginPath();ctx.moveTo(-8,-5);ctx.lineTo(7,-5);ctx.moveTo(-8,1);ctx.lineTo(4,1);ctx.stroke();ctx.fillStyle='#5f4525';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('Draw to collect',0,31);ctx.restore();
 }
 for(let i=0;i<2;i++)game.dom.$('doodleChoice'+i).onclick=()=>chooseDoodle(i);
 game.dom.$('doodleKeep').onclick=()=>game.api.closeInfo(false);
 const api={doodleScrapsSnapshot,resetDoodleScraps,dropDoodleScrap,collectDoodleScrap,updateDoodleScraps,chooseDoodle,dismissDoodleChoice,applyDoodleHit,moveDoodleScraps,drawDoodleScraps,paperElementName:()=>elements.find(e=>e.id===element)?.name||'Ordinary paper',paperElement:()=>element};Object.assign(game.api,api);return api;
};
