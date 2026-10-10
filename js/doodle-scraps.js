/* Run-only Doodle Scraps: tiered discoveries stack without using ink reward slots. */
DoodleDefender.systems.doodleScraps=function(game){
 const notes=[
  ['fire','Hot Off the Page','Common','#c25a30','Ignite enemies. More copies strengthen the burn.'],
  ['electric','Static Scribble','Common','#386ac3','Spark enemies and charge crossed walls.'],
  ['poison','Questionable Lunch','Common','#528237','Add stacking poison. Stevie insists it is still good.'],
  ['frost','Cold Shoulder','Common','#387f98','Briefly chill enemies. Repeat copies improve the chill, with a control cap.'],
  ['eraser','Correction Notice','Common','#ae537a','Add eraser damage. Each hit wipes one chunk off Ruff.'],
  ['range','Long Distance Learning','Common','#4169a4','Reach farther enemies. Repeat copies extend range with diminishing returns.'],
  ['second','Second Draft','Uncommon','#66549b','Every few throws, send a second ball at a different enemy. Copies make this happen more often.'],
  ['underline','Follow the Underline','Uncommon','#40856a','Paper balls ride your lines, then launch from the far end with extra range.'],
  ['cling','Static Cling','Rare','#386ac3','Repeated electric hits make nearby monsters cling to each other in slow, sparking clumps. Includes basic electricity.'],
  ['ash','Ash Impostor','Rare','#c25a30','Hit a burning enemy to shed a smoky decoy that distracts nearby monsters. Includes basic fire if needed.'],
  ['bubble','Bubble Trouble','Rare','#528237','Repeated poison hits inflate a wandering bubble. Erase it to pop and stagger the monster. Includes basic poison if needed.'],
  ['cross','Cross Out','Rare','#ae537a','Erasing hostile pencils or spikes turns their remains into friendly paper throws.'],
  ['dots','Connect the Dots','Epic','#a758a3','Paper hits mark monsters with bright dots. Draw through two dots to snap a colorful tether between them!'],
  ['influence','Bad Influence','Epic','#c27c3d','Ash decoys carry your paper elements. Monsters biting one receive those effects. Includes Ash Impostor if needed.'],
  ['split','Split Decision','Uncommon','#66549b','On its first hit, a ball splits toward two different nearby enemies. Each copy adds one generation. Children carry your notes and retain 50% damage, improving slightly with copies.'],
  ['quick','Rapid Scribble','Uncommon','#408f8f','Throw paper balls 5% faster per copy. Additive speed bonuses have no rank cap.'],
  ['orbit','Round Trip','Legendary','#b38a28','Paper balls orbit struck monsters and repeatedly deal their paper damage until that monster dies. Split children can orbit too; laps never split again.'],
  ['credit','Extra Credit','Legendary','#b38a28','Every hit hops to another enemy within 90px and adds +1 physical damage per copy. No hop limit. If nobody is nearby, the ball waits for its next short hop.'],
  ['flowers','Wallflowers','Legendary','#56844b','Finished throws perch on nearby walls, then launch again when monsters approach. The balls keep your notes and can be reused while their wall survives.'],
  ['carbon','Carbon Copy','Legendary','#8260a8','Cross any wall to fire two straight paper duplicates out its sides. They deal double physical damage and carry your notes. Each ball copies once per wall; duplicates cannot make more carbon copies.'],
  ['ink','Extra Ink','Legendary','#292b34','Black paper balls splash ink on impact: fully heal nearby walls, extend both ends of open walls, and refill 5 ink per copy on hit. Free growth does not create paid ink to reclaim.']
 ].map(([id,name,rarity,color,desc],art)=>({id,name,rarity,color,desc,art}));
 let clock=0,lastDrop=-100,kills=0,found=0,drop=null,offers=[],element=null,counts={},waveBudget=0,waveDrops=0,waveKills=0,plannedWave=0;
 const frames=[];
 // Share the main artwork loader, including retries.
 function noteArt(art){const extra=art>=14,index=extra?art-14:art;return {name:extra?'doodle-scraps-extra':'doodle-scraps',index,rows:extra?2:4};}
 function prepareNoteArt(){let ready=true;for(const n of notes){const a=noteArt(n.art),img=game.api.doodleArtwork(a.name);if(!img){ready=false;continue;}if(frames[n.art]?.source===img)continue;const c=document.createElement('canvas');c.width=c.height=160;c.naturalWidth=c.naturalHeight=160;c.getContext('2d').drawImage(img,a.index%4*img.naturalWidth/4,Math.floor(a.index/4)*img.naturalHeight/a.rows,img.naturalWidth/4,img.naturalHeight/a.rows,0,0,160,160);c.source=img;frames[n.art]=c;}return ready;}
 function unlocked(){return game.api.notebookSnapshot().levels.doodleScraps>0;}
 function noteLevel(id){return counts[id]||0;}
 function paperPayload(){return {...counts};}
 function paperRange(payload=counts){return 210*(1+.8*(1-Math.pow(.75,payload.range||0)));}
 function paperThrowInterval(payload=counts){return game.state.stats.rockRate/(1+.05*(payload.quick||0));}
 function startDoodleWave(){drop=null;offers=[];waveDrops=0;waveKills=0;plannedWave=game.state.wave;game.api.resetDoodleTricks?.();game.api.resetPaperTricks?.();
  if(!unlocked()||game.api.devRunActive()||game.api.testLabActive?.()){waveBudget=0;return;}
  const roll=Math.random();waveBudget=roll<.1?3:roll<.35?2:roll<.75?1:0;
 }
 function resetDoodleScraps(){clock=0;lastDrop=-100;kills=0;found=0;drop=null;offers=[];element=null;counts={};waveBudget=0;waveDrops=0;waveKills=0;plannedWave=0;game.api.resetDoodleTricks?.();game.api.resetPaperTricks?.();}
 function doodleScrapsSnapshot(){return {unlocked:unlocked(),clock,found,kills,element,counts:{...counts},waveBudget,waveDrops,plannedWave,drop:drop?{...drop}:null,offers:offers.map(e=>e.id)};}
 function rollNotes(){const r=Math.random(),tier=r<.55?'Common':r<.83?'Uncommon':r<.96?'Rare':r<.997?'Epic':'Legendary',pool=notes.filter(n=>n.rarity===tier),chosen=[];while(chosen.length<2){const i=Math.floor(Math.random()*pool.length);chosen.push(pool.splice(i,1)[0]);}return chosen;}
 function dropDoodleScrap(e){
  if(!unlocked()||game.api.devRunActive()||game.api.testLabActive?.()||!game.state.running||e.waveBoss||game.catalog.enemyDefs?.[e.type]?.boss||['mini','jamling','wobble-tooth','boss','stapler','crayon','eraser'].includes(e.type))return false;
  if(plannedWave!==game.state.wave)startDoodleWave();kills++;waveKills++;
  if(drop||offers.length||waveDrops>=waveBudget||clock-lastDrop<10||waveKills<3+waveDrops*3)return false;
  const choices=rollNotes();let x=game.api.clamp(e.x,26,game.state.W-26),y=game.api.clamp(e.y,100,game.state.H-30);
  if(Math.hypot(x-game.state.player.x,y-game.state.player.y)<80)y=game.api.clamp(game.state.player.y-100,100,game.state.H-30);
  drop={x,y,life:45,reel:0,choices:choices.map(n=>n.id),rarity:choices[0].rarity,art:choices[0].art};lastDrop=clock;found++;waveDrops++;
  game.api.setMsg('A '+drop.rarity+' Doodle Scrap! Draw through it to collect.');return true;
 }
 function collectDoodleScrap(points,paid){if(!drop||drop.reel)return false;for(let i=1;i<points.length;i++)if(game.api.pointSegDist(drop.x,drop.y,points[i-1].x,points[i-1].y,points[i].x,points[i].y)<=24){drop.reel=.001;drop.fromX=drop.x;drop.fromY=drop.y;return true;}return false;}
 function openDoodleChoice(ids){offers=ids.map(id=>notes.find(n=>n.id===id));
  for(let i=0;i<2;i++){const n=offers[i],button=game.dom.$('doodleChoice'+i),art=noteArt(n.art);button.innerHTML='<span class="doodle-note-art" style="background-image:url(assets/art/'+art.name+'.png);background-size:400% '+art.rows*100+'%;background-position:'+(art.index%4/3*100)+'% '+(Math.floor(art.index/4)/(art.rows-1)*100)+'%" aria-hidden="true"></span><span class="doodle-note-tier">'+n.rarity+'</span><span>'+n.name+'</span>';button.setAttribute?.('data-rarity',n.rarity);game.dom.$('doodleDescription'+i).textContent=n.desc+(counts[n.id]?' You have '+counts[n.id]+'; this copy stacks.':'');}
  game.dom.$('doodleCurrent').textContent=Object.keys(counts).length?Object.values(counts).reduce((a,b)=>a+b,0)+' scraps collected. Everything stacks for this run! See Your tool on Pause for your full collection.':'Pick a Doodle Scrap for this run. Future finds stack; your normal wave upgrade is still yours.';
  game.dom.$('doodleKeep').textContent='Skip this scrap';game.api.openInfo('doodle');
 }
 function updateDoodleScraps(dt){clock+=dt;game.api.updateDoodleTricks?.(dt);game.api.updatePaperTricks?.(dt);if(!drop)return false;
  if(drop.reel){drop.reel+=dt;const t=Math.min(1,drop.reel/.45);drop.x=drop.fromX+(game.state.player.x-drop.fromX)*t;drop.y=drop.fromY+(game.state.player.y-drop.fromY)*t-Math.sin(t*Math.PI)*30;if(t===1&&!game.api.infoOpen()){const ids=drop.choices;drop=null;openDoodleChoice(ids);return true;}}
  else{drop.life-=dt;if(drop.life<=0)drop=null;}return false;
 }
 function chooseDoodle(index){if(!offers[index]||game.dom.$('doodleOverlay').style.display!=='grid')return false;const n=offers[index],oldInterval=paperThrowInterval();element=n.id;counts[n.id]=(counts[n.id]||0)+1;if(n.id==='quick'&&oldInterval>0)game.state.player.rockCd*=paperThrowInterval()/oldInterval;
  if(!game.state.stats.rockRate){game.state.stats.rockDamage=Math.max(4,game.state.stats.rockDamage);game.state.stats.rockRate=1.6;}
  game.api.setMsg(n.name+' added! All your Doodle Scraps stack.');game.api.closeInfo(false);return true;
 }
 function dismissDoodleChoice(){offers=[];}
 function applyDoodleHit(e,payload,secondary=false){if(!payload||e.hp<=0||game.api.underPaper(e))return;const n=typeof payload==='string'?{[payload]:1}:payload;
  const before={burn:e.burn>0,poison:e.poison>0,electric:e.charged>0||e.noteElectric>clock};
  const fire=Math.max(n.fire||0,n.ash||0,n.influence||0),poison=Math.max(n.poison||0,n.bubble||0),electric=Math.max(n.electric||0,n.cling||0);
  if(fire&&e.immunity!=='fire'){e.burn=Math.max(e.burn,2+Math.min(2,(fire-1)*.3));e.burnDps=Math.max(e.burnDps,5.5+Math.min(8,(fire-1)*1.5));}
  if(poison&&e.immunity!=='poison'){e.poison=Math.min(6,e.poison+1+Math.min(1,(poison-1)*.2));e.poisonDps=Math.max(e.poisonDps,4.5+Math.min(6,(poison-1)*1));}
  if(n.frost&&e.immunity!=='frost'){e.gravitySlow=Math.max(e.gravitySlow,Math.min(.45,.2+.04*(n.frost-1)));e.freeze=Math.max(e.freeze,Math.min(.5,.3+.03*(n.frost-1)));}
  if(electric&&e.immunity!=='electric'){game.api.chainLightning(e,Math.min(3,electric));e.noteElectric=clock+3;}
  if(n.eraser){if(e.type==='scrubber')game.api.eraseScrubber(e);else game.api.dealDamage(e,3+Math.min(9,(n.eraser-1)*2),'erase');}
  if(!secondary&&e.hp>0)game.api.doodleTrickHit?.(e,n,before,clock);
 }
 function moveDoodleScraps(dx,dy){if(drop){drop.x+=dx;drop.y+=dy;if(drop.fromX!==undefined){drop.fromX+=dx;drop.fromY+=dy;}if(!drop.reel){drop.x=game.api.clamp(drop.x,26,game.state.W-26);drop.y=game.api.clamp(drop.y,100,game.state.H-30);}}game.api.moveDoodleTricks?.(dx,dy);game.api.movePaperTricks?.(dx,dy);}
 function drawDoodleScraps(){if(!drop)return;prepareNoteArt();const ctx=game.dom.ctx;ctx.save();ctx.translate(drop.x,drop.y+(game.api.enemyMotionReduced()?0:Math.sin(clock*4)*2));ctx.rotate(game.api.enemyMotionReduced()?0:Math.sin(clock*2)*.08);const colors={Common:'#877650',Uncommon:'#40856a',Rare:'#386ac3',Epic:'#a758a3',Legendary:'#a58221'};ctx.strokeStyle=colors[drop.rarity];ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.stroke();if(frames[drop.art])ctx.drawImage(frames[drop.art],-26,-26,52,52);else{ctx.fillStyle='#fff2ba';ctx.fillRect(-16,-18,32,36);}ctx.fillStyle=colors[drop.rarity];ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(drop.rarity+' · Draw to collect',0,39);ctx.restore();}
 for(let i=0;i<2;i++)game.dom.$('doodleChoice'+i).onclick=()=>chooseDoodle(i);game.dom.$('doodleKeep').onclick=()=>game.api.closeInfo(false);
 const api={doodleCatalogue:()=>notes.map(n=>({...n})),noteArtworkReady:prepareNoteArt,noteLevel,paperPayload,paperRange,paperThrowInterval,startDoodleWave,doodleClock:()=>clock,doodleScrapsSnapshot,resetDoodleScraps,dropDoodleScrap,collectDoodleScrap,updateDoodleScraps,chooseDoodle,dismissDoodleChoice,applyDoodleHit,moveDoodleScraps,drawDoodleScraps,paperElementName:()=>notes.filter(n=>counts[n.id]).map(n=>n.name+' ×'+counts[n.id]).join(', ')||'Ordinary paper',paperElement:()=>element};Object.assign(game.api,api);return api;
};
