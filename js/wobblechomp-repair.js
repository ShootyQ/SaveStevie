/* A won fight becomes a drawing celebration; rewards are granted by killEnemy once. */
DoodleDefender.systems.wobbleRepair=function(game){
 const $=game.dom.$,rig=DoodleDefender.WobblechompRig,overlay=$('wobbleRepairOverlay'),pad=$('wobbleRepairPad'),scene=$('wobbleRepairScene');
 const parts=[{name:'arm',rig:'arm',words:'Could you draw me a new punchy arm? I promise to wave with it.',hint:'Start at 1, draw LEFT around your arm, then return to 2. We’ll color inside!'},{name:'leg',rig:'leg',words:'A leg next? Something good for happy little stomps.',hint:'Start at 1, draw DOWN around your leg and foot, then return to 2.'},{name:'eye',rig:'stalk',words:'And an eye stalk! I want to see my new friends.',hint:'Start at 1, draw UP around your stalk, then return to 2. We’ll add an eye!'}];
 const view={x:240,y:170,scale:.6};
 function rootPoint(index){const q=rig.pose(repair.model,game.api.enemyMotionReduced()).parts[parts[index].rig].root;return {x:view.x+(q.x-570)*view.scale,y:view.y+(q.y-410)*view.scale};}
 function drawingAnchor(){return repair.anchor??rootPoint(repair.index);}
 function sockets(index=repair.index,root=drawingAnchor()){const dx=index===0?0:12,dy=index===0?12:0;return [{x:root.x-dx,y:root.y-dy},{x:root.x+dx,y:root.y+dy}];}
 function connected(){const pts=repair.strokes[0],ends=sockets();return !!pts&&pts.length>=3&&Math.hypot(pts[0].x-ends[0].x,pts[0].y-ends[0].y)<.01&&Math.hypot(pts.at(-1).x-ends[1].x,pts.at(-1).y-ends[1].y)<.01;}

 let repair=null,stroke=null,pointer=null,art=null,backgroundPaused=false;
 function snapshot(){return repair?{stage:repair.stage,index:repair.index,age:repair.age,attached:repair.drawings.length,anchor:{...drawingAnchor()},sockets:sockets().map(p=>({...p})),connected:connected(),roots:parts.map((_,i)=>rootPoint(i)),origins:repair.origins.map(p=>({...p})),strokes:repair.strokes.map(a=>a.map(p=>({...p}))),drawings:repair.drawings.map(a=>a.map(b=>b.map(p=>({...p}))))}:null}
 function sync(){if(!repair)return;const drawing=repair.stage==='draw',part=parts[repair.index];$('wobbleRepairTitle').textContent=repair.stage==='plea'?'You won! …but wait.':repair.stage==='walk'?'A happy ending.':repair.stage==='attach'?'A perfect fit!':'Draw a new '+part.name;
  $('wobbleRepairSpeech').textContent=repair.stage==='plea'?'“You win… sniff. I liked having bits. Could you help me draw them back?”':repair.stage==='walk'?'“I’m all doodled together! Thank you, Stevie!”':repair.stage==='attach'?'“That one is very me!”':part.words;
  $('wobbleRepairHint').textContent=drawing?part.hint:'Your boss win is already earned. This is a little victory doodle.';
  scene.hidden=drawing;$('wobbleRepairDrawing').hidden=!drawing;$('wobbleRepairHelp').hidden=repair.stage!=='plea';$('wobbleRepairContinue').hidden=repair.stage!=='plea';$('wobbleRepairAttach').disabled=!connected()||pointer!==null;
 }
 function begin(e){if(repair)return;const model=rig.create();model.time=1;model.armCuts=model.legCuts=model.stalkCuts=2;backgroundPaused=false;repair={stage:'plea',index:0,age:0,model,anchor:null,origins:[],strokes:[],drawings:[]};game.state.drawing=false;game.state.currentWall=null;game.api.stopSoundEffects();overlay.style.display='grid';
  if(typeof Image!=='undefined'&&!art){const img=new Image();img.onload=()=>{art=img;render()};img.src='assets/art/wobblechomp-parts.png'+(document.documentElement?.dataset?.build?'?v='+document.documentElement.dataset.build:'')}
  sync();render();$('wobbleRepairHelp').focus?.();
 }
 function clearPointer(){if(pointer!==null&&pad.hasPointerCapture?.(pointer))pad.releasePointerCapture(pointer);pointer=null;stroke=null}
 function reset(){clearPointer();repair=null;overlay.style.display='none'}
 function finish(){if(!repair)return;reset();game.api.waveComplete()}
 function startDrawing(){if(!repair||repair.stage!=='plea')return;repair.stage='draw';repair.age=0;repair.anchor=rootPoint(0);sync();render();$('wobbleRepairPreset').focus?.()}
 function attach(){if(!repair||repair.stage!=='draw'||pointer!==null||!connected())return;repair.origins.push({...drawingAnchor()});repair.drawings.push(repair.strokes.map(a=>a.map(p=>({...p}))));repair.strokes=[];repair.stage='attach';repair.age=0;sync();render()}
 function preset(){if(!repair||repair.stage!=='draw')return;clearPointer();const a=drawingAnchor();
  const [start,end]=sockets();
  repair.strokes=[repair.index===0?[start,{x:a.x-45,y:a.y-22},{x:a.x-105,y:a.y-10},{x:a.x-133,y:a.y-35},{x:a.x-155,y:a.y-20},{x:a.x-151,y:a.y+14},{x:a.x-125,y:a.y+32},{x:a.x-96,y:a.y+13},{x:a.x-45,y:a.y+10},end]:repair.index===1?[start,{x:a.x-15,y:a.y+42},{x:a.x-20,y:a.y+77},{x:a.x+64,y:a.y+84},{x:a.x+78,y:a.y+66},{x:a.x+21,y:a.y+56},end]:[start,{x:a.x-20,y:a.y-35},{x:a.x+5,y:a.y-87},{x:a.x+25,y:a.y-87},{x:a.x+5,y:a.y-33},end]];sync();render();}

 function pos(e){const r=pad.getBoundingClientRect();return {x:game.api.clamp((e.clientX-r.left)*480/r.width,0,480),y:game.api.clamp((e.clientY-r.top)*320/r.height,0,320)}}
 pad.addEventListener('pointerdown',e=>{if(!repair||repair.stage!=='draw'||pointer!==null||document.hidden||backgroundPaused||game.state.paused||repair.strokes.length>=16)return;e.preventDefault?.();const p=pos(e),a=sockets()[0];
  if(!repair.strokes.length&&Math.hypot(p.x-a.x,p.y-a.y)>30){$('wobbleRepairHint').textContent='Start at dot 1, draw around your new part, and finish at dot 2.';return}
  if(repair.strokes.length&&!connected()){
   const last=repair.strokes[0].at(-1);if(Math.hypot(p.x-last.x,p.y-last.y)>30){$('wobbleRepairHint').textContent='Continue from your unfinished line and bring it back to dot 2, or tap Try again.';return;}
   stroke=repair.strokes.shift();stroke.push(p);
  }else stroke=repair.strokes.length?[p]:[{...a},p];
  pointer=e.pointerId;pad.setPointerCapture?.(pointer);sync();render();
 });
 pad.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||!stroke||document.hidden||backgroundPaused||game.state.paused)return;const p=pos(e),last=stroke.at(-1);if(stroke.length<400&&Math.hypot(p.x-last.x,p.y-last.y)>2)stroke.push(p);render()});
 pad.addEventListener('pointerup',e=>{if(e.pointerId!==pointer||!stroke)return;let length=0;for(let i=1;i<stroke.length;i++)length+=Math.hypot(stroke[i].x-stroke[i-1].x,stroke[i].y-stroke[i-1].y);if(length>=20){if(!repair.strokes.length){const end=sockets()[1];if(stroke.length>=3&&Math.hypot(stroke.at(-1).x-end.x,stroke.at(-1).y-end.y)<=30)stroke.push({...end});}repair.strokes.push(stroke);}clearPointer();sync();if(repair.strokes.length&&!connected())$('wobbleRepairHint').textContent='Bring your outline back to dot 2. You can continue from its loose end.';render()});
 for(const name of ['pointercancel','lostpointercapture'])pad.addEventListener(name,()=>{if(pointer!==null){clearPointer();sync();render()}});
 function paint(ctx,strokes,eye=false){
  ctx.lineJoin=ctx.lineCap='round';
  for(const [index,pts] of strokes.entries()){
   if(pts.length<2)continue;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
   // The first stroke is the silhouette. Its two roots close against the body.
   if(index===0&&pts.length>=3){
    ctx.closePath();ctx.fillStyle='#fff000';ctx.fill();
    ctx.save();ctx.clip();
    const loX=Math.min(...pts.map(p=>p.x)),hiX=Math.max(...pts.map(p=>p.x)),loY=Math.min(...pts.map(p=>p.y)),hiY=Math.max(...pts.map(p=>p.y));
    ctx.fillStyle='#ff8700';
    for(let x=Math.floor(loX/28)*28;x<=hiX;x+=28)for(let y=Math.floor(loY/30)*30;y<=hiY;y+=30){ctx.beginPath();ctx.ellipse(x+9+Math.sin(y)*4,y+13,7,9,.4,0,Math.PI*2);ctx.fill();}
    // Small deterministic pencil flecks match the original colored-pencil art.
    ctx.strokeStyle='#fffbd5';ctx.lineWidth=.8;ctx.globalAlpha=.65;ctx.beginPath();
    for(let x=Math.floor(loX/5)*5;x<=hiX;x+=5)for(let y=Math.floor(loY/6)*6;y<=hiY;y+=6){const n=Math.sin(x*13+y*7);ctx.moveTo(x+n*2,y);ctx.lineTo(x+2+n*2,y-2);}
    ctx.stroke();ctx.restore();ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.strokeStyle='#17140e';ctx.lineWidth=4;ctx.stroke();
   }else{ctx.strokeStyle='#17140e';ctx.lineWidth=3;ctx.stroke();}
  }
  if(eye&&strokes[0]?.length){
   const pts=strokes[0],root={x:(pts[0].x+pts.at(-1).x)/2,y:(pts[0].y+pts.at(-1).y)/2},p=pts.reduce((a,b)=>Math.hypot(b.x-root.x,b.y-root.y)>Math.hypot(a.x-root.x,a.y-root.y)?b:a,pts[0]);
   ctx.fillStyle='#fffbed';ctx.strokeStyle='#17140e';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(p.x,p.y,20,24,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#17140e';ctx.beginPath();ctx.arc(p.x+7,p.y+3,8,0,Math.PI*2);ctx.fill();
  }
 }
 function paintBody(ctx,walk=false){
  const reduced=game.api.enemyMotionReduced(),move=walk&&!reduced?repair.age*95:0,hop=walk&&!reduced?-Math.abs(Math.sin(repair.age*12))*5:0;
  ctx.save();ctx.translate(move,hop);
  // Every drawing is rooted at the puppet's actual current joint. Canvas input
  // and the final body share exactly the same scale and handedness.
  repair.drawings.forEach((strokes,i)=>{const root=rootPoint(i),origin=repair.origins[i];ctx.save();ctx.translate(root.x,root.y);
   const angle=reduced?0:walk?(i===0?Math.sin(repair.age*9)*.22:i===1?Math.sin(repair.age*12)*.16:Math.sin(repair.age*3)*.07):repair.stage==='attach'&&i===repair.drawings.length-1?Math.sin(repair.age*9)*(1-Math.min(1,repair.age/.85))*.25:0;
   // Bend away from the joint; both attachment points stay planted on the body.
   const bent=strokes.map(pts=>pts.map(p=>{const x=p.x-origin.x,y=p.y-origin.y,t=game.api.clamp((Math.hypot(x,y)-18)/40,0,1),a=angle*t;return {x:origin.x+x*Math.cos(a)-y*Math.sin(a),y:origin.y+x*Math.sin(a)+y*Math.cos(a)};}));
   ctx.translate(-origin.x,-origin.y);paint(ctx,bent,i===2);ctx.restore();
  });
  if(art){ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);ctx.translate(-570,-410);rig.draw(ctx,art,repair.model,{guide:false,effects:false,debris:false,reduced});ctx.restore()}else{ctx.fillStyle='#fff000';ctx.beginPath();ctx.arc(view.x,view.y,65,0,Math.PI*2);ctx.fill()}
  if(repair.stage==='plea'){ctx.fillStyle='#6ebad1';for(let i=0;i<2;i++){const y=165+(reduced?8:(repair.age*35+i*18)%35);ctx.beginPath();ctx.ellipse(view.x-24+i*12,y,3,6,0,0,Math.PI*2);ctx.fill()}}
  if(walk){ctx.fillStyle='#b44c62';ctx.font='24px sans-serif';ctx.fillText('♥',view.x-65,65);ctx.fillStyle='#385c4a';ctx.font='18px "Stevie Pencil",cursive';ctx.fillText('friends!',view.x-25,35)}ctx.restore();
 }
 function paper(ctx){ctx.clearRect(0,0,480,320);ctx.strokeStyle='#bad0db';ctx.lineWidth=1;ctx.globalAlpha=.4;for(let y=22;y<320;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(480,y);ctx.stroke()}ctx.globalAlpha=1;}
 function render(){if(!repair||!scene.getContext)return;const ctx=scene.getContext('2d');paper(ctx);paintBody(ctx,repair.stage==='walk');
  const pctx=pad.getContext('2d');paper(pctx);if(repair.stage!=='draw')return;paintBody(pctx);
  const a=drawingAnchor();pctx.save();pctx.strokeStyle='#a4ab8a';pctx.lineWidth=10;pctx.globalAlpha=.3;pctx.setLineDash([6,10]);pctx.beginPath();pctx.moveTo(a.x,a.y);if(repair.index===0)pctx.bezierCurveTo(a.x-25,a.y-20,a.x-100,a.y+15,a.x-140,a.y);else if(repair.index===1)pctx.bezierCurveTo(a.x+15,a.y+30,a.x,a.y+75,a.x+65,a.y+75);else pctx.bezierCurveTo(a.x+25,a.y-20,a.x-20,a.y-60,a.x+18,a.y-85);pctx.stroke();pctx.restore();
  paint(pctx,[...repair.strokes,...(stroke?[stroke]:[])],repair.index===2);
  for(const [i,p] of sockets().entries()){
   pctx.strokeStyle=i?'#b64c73':'#28796d';pctx.lineWidth=2;pctx.fillStyle='#fffbed';pctx.beginPath();pctx.arc(p.x,p.y,10,0,Math.PI*2);pctx.fill();pctx.stroke();pctx.fillStyle=pctx.strokeStyle;pctx.textAlign='center';pctx.font='bold 12px sans-serif';pctx.fillText(String(i+1),p.x,p.y+4);
  }

 }
 function update(dt){if(!repair||game.state.paused||document.hidden||backgroundPaused||game.api.infoOpen())return;repair.age+=Math.min(dt,.1);if(repair.stage!=='draw')rig.update(repair.model,Math.min(dt,.1));if(repair.stage==='attach'&&repair.age>=.85){repair.index++;repair.stage=repair.index===3?'walk':'draw';repair.age=0;sync();if(repair.stage==='draw'){repair.anchor=rootPoint(repair.index);$('wobbleRepairPreset').focus?.()}}if(repair.stage==='walk'){rig.stepWalk(repair.model,100*Math.min(dt,.1),Math.min(dt,.1));if(repair.age>=3){finish();return}}render()}
 window.addEventListener('savestevie:background',()=>{if(repair){backgroundPaused=true;clearPointer();sync();render()}});window.addEventListener('focus',()=>{backgroundPaused=false});window.addEventListener('savestevie:foreground',()=>{backgroundPaused=false});document.addEventListener?.('visibilitychange',()=>{backgroundPaused=!!document.hidden;if(backgroundPaused)clearPointer();sync();render()});
 $('wobbleRepairHelp').onclick=startDrawing;$('wobbleRepairContinue').onclick=finish;$('wobbleRepairAttach').onclick=attach;$('wobbleRepairPreset').onclick=preset;$('wobbleRepairClear').onclick=()=>{if(repair?.stage==='draw'){clearPointer();repair.strokes=[];sync();render()}};
 const api={beginWobbleRepair:begin,wobbleRepairActive:()=>!!repair,updateWobbleRepair:update,resetWobbleRepair:reset,wobbleRepairSnapshot:snapshot};Object.assign(game.api,api);return api;
};
