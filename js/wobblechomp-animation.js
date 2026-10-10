/* Deterministic modular paper puppet. Animation only; no combat or DOM dependencies. */
DoodleDefender.WobblechompRig=(()=>{
 const WIDTH=1000,HEIGHT=720,ROLL_BURSTS=[1.45,2.25,3.05],ROLL_DROPS=[1.6,2.35,3.1];
 const specs={
  arm:{cuts:'armCuts',col:1,row:0,w:185,h:185,pivot:{x:.65,y:.92}},
  leg:{cuts:'legCuts',col:2,row:0,w:180,h:180,pivot:{x:.12,y:.52}},
  stalk:{cuts:'stalkCuts',col:0,row:1,w:140,h:140,pivot:{x:.5,y:.85}}
 };
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
 const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 function create(){return {time:0,walkPhase:0,walkBlend:0,walkFacing:1,phaseTwoRoll:false,ballAngle:0,punchAge:null,spikeAge:null,beamAge:null,teethAge:null,rollAge:null,rollDirection:1,rollBursts:0,rollDrops:0,teethVolley:2,teethPlan:[],teeth:[],armCuts:0,legCuts:0,stalkCuts:0,reaction:0,impact:0,wrist:{x:310,y:365},angle:-.35,debris:null,fallenParts:[],spikes:[],marks:[],lastCut:null}}
 const busy=m=>m.punchAge!==null||m.spikeAge!==null||m.beamAge!==null||m.teethAge!==null||m.rollAge!==null;
 function attack(m,part,key){if(m[specs[part].cuts]===2||busy(m))return false;m[key]=0;return true}
 const punch=m=>attack(m,'arm','punchAge'),shootSpikes=m=>attack(m,'leg','spikeAge'),eyeBeam=m=>attack(m,'stalk','beamAge');
 function shakeTeeth(m){
  if(busy(m))return false;m.teethAge=0;
  const spots=[[110,555],[220,625],[325,550],[435,615],[815,580],[895,640],[745,635],[145,650],[860,535],[360,660]],count=6+(m.teethVolley++%5);
  m.teethPlan=spots.slice(0,count).map(([x,y],i)=>({x,y,at:.85+i*.065,launched:false}));return true;
 }
 function tuckAndRoll(m){
  if(busy(m))return false;m.rollAge=0;m.rollDirection*=-1;m.rollBursts=m.rollDrops=0;return true;
 }
 function rollPose(m,reduced=false){
  if(m.rollAge===null)return null;
  if(m.phaseTwoRoll)return {phase:'rolling',tuck:1,x:570,y:410,angle:reduced?0:m.ballAngle,direction:1,scaleX:1,scaleY:1};
  const t=m.rollAge,first=m.rollDirection<0?160:790,second=m.rollDirection<0?790:160;
  let phase,tuck,x=570,direction=m.rollDirection;
  if(t<.55){phase='tucking';tuck=ease(t/.55)}
  else if(t<1.1){phase='winding';tuck=1}
  else if(t<3.45){phase='rolling';tuck=1;
   if(t<1.85)x=mix(570,first,ease((t-1.1)/.75));
   else if(t<2.95){x=mix(first,second,ease((t-1.85)/1.1));direction=-m.rollDirection}
   else x=mix(second,570,ease((t-2.95)/.5));
  }
  else if(t<3.85){phase='braking';tuck=1}
  else{phase='unfolding';tuck=1-ease((t-3.85)/.6)}
  const winding=phase==='winding'?Math.sin((t-.55)/.55*Math.PI):0;
  const angle=reduced?0:phase==='rolling'?(x-570)/105:winding*-.22;
  const bounce=!reduced&&phase==='rolling'?Math.abs(Math.sin(t*12))*(m.legCuts===2?8:3):0;
  return {phase,tuck,x,y:mix(410,500,tuck)-bounce,angle,direction,scaleX:reduced?1:1+winding*.1,scaleY:reduced?1:1-winding*.08};
 }
 function toothPose(t,reduced=false){
  const landed=t.age-t.flight;
  if(landed<0){const f=clamp(t.age/t.flight,0,1);return {x:mix(t.start.x,t.target.x,f),y:mix(t.start.y,t.target.y,f)-Math.sin(f*Math.PI)*(t.arc??125),angle:reduced?0:(t.index%2?1:-1)*f*3,scaleX:mix(.45,1,ease(f*3)),scaleY:mix(.45,1,ease(f*3)),phase:'flying'}}
  const bouncing=landed<.3,waiting=landed<.55,hop=reduced?0:bouncing?Math.sin(landed/.3*Math.PI)*24:waiting?0:Math.abs(Math.sin((landed-.55)*10+t.index))*7;
  const squash=!reduced&&landed<.09;
  return {x:t.x,y:t.y-hop,angle:reduced?0:waiting?0:Math.sin(landed*10+t.index)*.08,scaleX:squash?1.2:1,scaleY:squash?.8:1,phase:bouncing?'bouncing':waiting?'waiting':'scurrying'};
 }

 function stepWalk(m,distance,dt,direction=1){
  if(m.rollAge!==null)return;m.walkPhase=(m.walkPhase+Math.max(0,distance)/22*Math.PI)%(Math.PI*2);m.walkFacing=direction;
  const moving=dt>0?clamp(distance/dt/90,0,1):0;m.walkBlend=mix(m.walkBlend||0,moving,1-Math.exp(-dt*18));
 }
 function update(m,dt){
  dt=clamp(dt,0,.1);m.walkBlend=(m.walkBlend||0)*Math.exp(-dt*5);m.time+=dt;m.reaction=Math.max(0,m.reaction-dt);m.impact=Math.max(0,m.impact-dt);
  for(const mark of m.marks)mark.life-=dt;m.marks=m.marks.filter(mark=>mark.life>0);
  let x=310,y=m.armCuts?495:365,angle=m.armCuts?-.95:-.35;
  if(m.punchAge!==null){
   const before=m.punchAge,t=m.punchAge+=dt;
   if(t<.85){const f=ease(t/.85);x=mix(310,395,f);y=mix(m.armCuts?495:365,320,f);angle=mix(angle,-.65,f)}
   else if(t<1.15){const f=ease((t-.85)/.3);x=mix(395,140,f);y=mix(320,470,f);angle=mix(-.65,-1.05,f)}
   else if(t<2.65){x=140;y=470;angle=-1.05;if(before<1.15)m.impact=.35}
   else if(t<3.25){const f=ease((t-2.65)/.6);x=mix(140,310,f);y=mix(470,m.armCuts?495:365,f);angle=mix(-1.05,m.armCuts?-.95:-.35,f)}
   else m.punchAge=null;
  }
  const f=1-Math.exp(-dt*16);m.wrist.x=mix(m.wrist.x,x,f);m.wrist.y=mix(m.wrist.y,y,f);m.angle=mix(m.angle,angle,f);
  if(m.spikeAge!==null){
   const before=m.spikeAge,t=m.spikeAge+=dt;
   if(before<.95&&t>=.95){const c=pose(m,true).parts.leg.center;
    for(let i=0;i<5;i++){const a=Math.PI+.15+(i-2)*.14;m.spikes.push({x:c.x-15,y:c.y-40,vx:Math.cos(a)*460,vy:Math.sin(a)*460,angle:a,life:1.7})}
   }
   if(t>=2.1)m.spikeAge=null;
  }
  if(m.beamAge!==null){m.beamAge+=dt;if(m.beamAge>=2.8)m.beamAge=null}
  if(m.teethAge!==null){
   const before=m.teethAge,t=m.teethAge+=dt;
   for(let i=0;i<m.teethPlan.length;i++){const target=m.teethPlan[i];if(!target.launched&&t>=target.at){
    if(i===0)for(const old of m.teeth)old.life=Math.min(old.life,.35);
    target.launched=true;const mouth=pose(m,true).mouth;
    m.teeth.push({index:i,age:before-target.at,flight:.65+(i%3)*.08,start:{...mouth},target:{x:target.x,y:target.y},x:target.x,y:target.y,vx:(i%2?1:-1)*(55+i*7),life:7});
   }}
   if(t>=2.6){m.teethAge=null;m.teethPlan=[]}
  }
  if(m.rollAge!==null){
   m.rollAge+=dt;
   for(const [i,at] of ROLL_BURSTS.entries())if(m.rollBursts<=i&&m.rollAge>=at){
    m.rollBursts++;if(m.legCuts<2){const r=rollPose(m,true),angle=r.direction<0?Math.PI:0;
     for(let i=-1;i<=1;i++){const a=angle+i*.35;m.spikes.push({x:r.x+Math.cos(a)*90,y:r.y+Math.sin(a)*90,vx:Math.cos(a)*430,vy:Math.sin(a)*430,angle:a,life:1.7})}
    }
   }
   for(const [i,at] of ROLL_DROPS.entries())if(m.rollDrops<=i&&m.rollAge>=at){
    const r=rollPose(m,true),target={x:clamp(r.x-r.direction*55,80,920),y:630};m.rollDrops++;
    m.teeth.push({index:10+m.rollDrops,source:'roll',age:0,flight:.38,arc:40,start:{x:r.x,y:r.y+35},target,x:target.x,y:target.y,vx:-r.direction*75,life:7});
   }
   if(m.rollAge>=4.45)m.rollAge=null;
  }
  for(const t of m.teeth){
   t.age+=dt;t.life-=dt;
   if(t.age>=t.flight+.55){t.x+=t.vx*dt;if(t.x<70||t.x>930){t.x=clamp(t.x,70,930);t.vx*=-1}}
  }
  m.teeth=m.teeth.filter(t=>t.life>0);
  for(const s of m.spikes){s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt}m.spikes=m.spikes.filter(s=>s.life>0&&s.x>-40&&s.x<WIDTH+40);
  for(const d of m.fallenParts)if(!d.settled){
   let left=dt;while(left>0){const step=Math.min(left,1/120);left-=step;d.vy+=650*step;d.x+=d.vx*step;d.y+=d.vy*step;d.angle+=d.spin*step;
    if(d.x<95||d.x>890){d.x=clamp(d.x,95,890);d.vx*=-.35}
    if(d.y>590){d.y=590;d.vy*=-.32;d.vx*=.6;d.spin*=.45;if(Math.abs(d.vy)<35){d.settled=true;d.vy=d.vx=d.spin=0}}
   }
  }
 }
 function part(root,end,angle,name,cuts,scale=1){
  const s=specs[name],dx=end.x-root.x,dy=end.y-root.y,d=Math.hypot(dx,dy)||1;
  const ox=(.5-s.pivot.x)*s.w*scale,oy=(.5-s.pivot.y)*s.h*scale;
  return {name,cuts,root,end,angle,scale,center:{x:end.x+Math.cos(angle)*ox-Math.sin(angle)*oy,y:end.y+Math.sin(angle)*ox+Math.cos(angle)*oy},joint:{a:{...root},b:{x:root.x+dx/d*Math.min(48,d),y:root.y+dy/d*Math.min(48,d)}}};
 }
 function pose(m,reduced=false){
  const entry=(1-ease(m.time/.9))*70,bob=reduced?0:Math.sin(m.time*3)*(m.legCuts===2?5:3);
  const shake=!reduced&&m.teethAge!==null&&m.teethAge<.85?Math.sin(m.teethAge*48)*6:0;
  const blend=reduced||m.rollAge!==null?0:(m.walkBlend||0),step=Math.sin(m.walkPhase||0),lift=-Math.abs(step)*(m.legCuts===2?24:16)*blend,sway=step*6*blend;
  const walk={blend,lift,sway,sx:1+Math.abs(step)*.05*blend,sy:1-Math.abs(step)*.07*blend,lean:(step*.08+(m.walkFacing||1)*.07)*blend};
  const at=(x,y)=>({x:x+entry+shake+sway,y:y+bob+lift});
  let legX=721,legY=m.legCuts?567:522,legAngle=m.legCuts ? .2 : 0;
  if(m.spikeAge===null){legX+=Math.cos(m.walkPhase||0)*28*blend;legY-=Math.max(0,step)*30*blend;legAngle+=step*.18*blend}
  if(m.spikeAge!==null){const t=m.spikeAge;
   const lift=t<.95?ease(t/.95):t<1.3?1:1-ease((t-1.3)/.8);
   legX+=lift*45;legY-=lift*115;legAngle-=lift*.45;
  }
  let eyeX=m.stalkCuts?755:630,eyeY=m.stalkCuts?360:226,eyeAngle=m.stalkCuts?-.9:0;
  if(m.mobilePose&&m.stalkCuts===0){eyeX=755;eyeY=340;eyeAngle=-.6}
  if(m.beamAge!==null){const t=m.beamAge,coil=t<.8?ease(t/.8):1-ease((t-2.1)/.7);eyeX+=coil*25;eyeY-=coil*25;eyeAngle-=coil*.3}
  if(!reduced){legAngle+=Math.sin(m.time*2.5)*.04;eyeAngle+=Math.sin(m.time*2)*.06}
  const parts={arm:part(at(466,418),at(m.wrist.x+(m.punchAge===null?Math.cos(m.walkPhase||0)*14*blend:0),m.wrist.y),m.angle,'arm',m.armCuts),leg:part(at(675,495),at(legX,legY),legAngle,'leg',m.legCuts),stalk:part(at(646,311),at(eyeX,eyeY),eyeAngle,'stalk',m.stalkCuts)};
  // An exposed limb stretches forward; its joint and drawing hit target use the
  // same pose. The body stays small enough to leave mobile drawing room.
  for(const [name,limb] of Object.entries(parts))if(limb.cuts<2&&(m.cutFocus===name||({arm:'punchAge',leg:'spikeAge',stalk:'beamAge'}[name]&&m[{arm:'punchAge',leg:'spikeAge',stalk:'beamAge'}[name]]!==null))){
   const focused=m.cutFocus===name,offer={arm:{x:-190,y:45},leg:{x:165,y:25},stalk:{x:145,y:m.focusSideways?20:-145}}[name],end=focused?{x:limb.root.x+offer.x,y:limb.root.y+offer.y}:{...limb.end};
   parts[name]=part(limb.root,end,limb.angle,name,limb.cuts,focused?1.65:1.25);
   const d=Math.hypot(end.x-limb.root.x,end.y-limb.root.y)||1;parts[name].joint.b={x:limb.root.x+(end.x-limb.root.x)/d*Math.min(110,d),y:limb.root.y+(end.y-limb.root.y)/d*Math.min(110,d)};
  }
  const roll=rollPose(m,reduced);
  if(roll){
   const folds={arm:{root:{x:-75,y:0},end:{x:-75,y:-50},angle:-.35,scale:.55},leg:{root:{x:65,y:30},end:{x:60,y:55},angle:-.5,scale:.6},stalk:{root:{x:45,y:-50},end:{x:35,y:-75},angle:-.8,scale:.55}};
   const transform=(point,fold)=>{const x=mix(point.x-570-entry-shake,fold.x,roll.tuck)*roll.scaleX,y=mix(point.y-410-bob,fold.y,roll.tuck)*roll.scaleY;return {x:roll.x+entry+Math.cos(roll.angle)*x-Math.sin(roll.angle)*y,y:roll.y+Math.sin(roll.angle)*x+Math.cos(roll.angle)*y}};
   for(const [name,limb] of Object.entries(parts)){const fold=folds[name];parts[name]=part(transform(limb.root,fold.root),transform(limb.end,fold.end),mix(limb.angle,fold.angle,roll.tuck)+roll.angle,name,limb.cuts,mix(1,fold.scale,roll.tuck))}
  }
  const arm=parts.arm;
  return {roll,walk,entry:entry+shake,bob,mouth:at(570,428),parts,root:arm.root,wrist:arm.end,joint:arm.joint,bodyAngle:reduced?0:walk.lean+Math.sin(m.time*2)*.025+(m.legCuts===2?-.07:0)+(m.teethAge!==null&&m.teethAge<.85?Math.sin(m.teethAge*38)*.04:0),angle:arm.angle};
 }
 function crossing(a,b,c,d){
  const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y,den=dx*ey-dy*ex;
  if(Math.abs(den)<1)return null;
  const x=c.x-a.x,y=c.y-a.y,t=(x*ey-y*ex)/den,u=(x*dy-y*dx)/den;
  return t>=0&&t<=1&&u>=0&&u<=1?t:null;
 }
 function circleCrossing(a,b,center,radius){
  const dx=b.x-a.x,dy=b.y-a.y,ox=a.x-center.x,oy=a.y-center.y,A=dx*dx+dy*dy;
  if(A<1e-8)return null;const C=ox*ox+oy*oy-radius*radius;if(C<=0)return 0;
  const B=2*(ox*dx+oy*dy),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;
 }
 function cutStroke(m,points,reduced=false,allowedParts=null,hitRadii=null){
  if(m.rollAge!==null||!Array.isArray(points)||points.length<2||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);if(length<20)return false;
  const p=pose(m,reduced);let chosen=null;
  // First joint crossed wins; one released gesture can cut only one part once.
  for(let i=1;i<points.length&&!chosen;i++){
   let nearest=Infinity;for(const limb of Object.values(p.parts))if(limb.cuts<2&&(!allowedParts||allowedParts.includes(limb.name))){const radius=hitRadii?.[limb.name]||0,center={x:(limb.joint.a.x+limb.joint.b.x)/2,y:(limb.joint.a.y+limb.joint.b.y)/2};const t=radius>0?circleCrossing(points[i-1],points[i],center,radius):crossing(points[i-1],points[i],limb.joint.a,limb.joint.b);if(t!==null&&t<nearest){chosen=limb;nearest=t}}
  }
  if(!chosen)return false;
  const name=chosen.name,key=specs[name].cuts;m[key]++;m.lastCut=name;m.reaction=.8;
  m[{arm:'punchAge',leg:'spikeAge',stalk:'beamAge'}[name]]=null;
  const j=chosen.joint;m.marks.push({x:(j.a.x+j.b.x)/2,y:(j.a.y+j.b.y)/2,life:.5});
  if(m[key]===2){const d={part:name,...chosen.center,vx:name==='leg'?65:-90,vy:-100,angle:chosen.angle,spin:name==='stalk'?3:-2.4,settled:false};m.fallenParts.push(d);if(name==='arm')m.debris=d}
  return true;
 }
 function tile(ctx,image,col,row,x,y,w,h,angle=0,pivot=null){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(image,col*image.naturalWidth/3,row*image.naturalHeight/2,image.naturalWidth/3,image.naturalHeight/2,-w*(pivot?.x??.5),-h*(pivot?.y??.5),w,h);ctx.restore();
 }
 function noodle(ctx,a,b,bend=0,width=15){
  ctx.lineCap='round';const draw=()=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+(b.x-a.x)*.35,a.y+bend,b.x-(b.x-a.x)*.2,b.y+bend,b.x,b.y)};
  ctx.strokeStyle='#17140e';ctx.lineWidth=width+7;draw();ctx.stroke();ctx.strokeStyle='#ead326';ctx.lineWidth=width;draw();ctx.stroke();
  ctx.strokeStyle='#fff5b099';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x+2,a.y-2);ctx.lineTo(mix(a.x,b.x,.35),mix(a.y,b.y,.35)-3);ctx.stroke();
 }
 function threads(ctx,limb){
  const {a,b}=limb.joint;ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x));
  ctx.strokeStyle='#282014';ctx.lineWidth=3;ctx.lineCap='round';
  for(const y of limb.cuts?[0]:[-7,0,7]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(15,y+2);ctx.lineTo(33,y-2);ctx.lineTo(48,y);ctx.stroke()}
  if(limb.cuts){ctx.strokeStyle='#875d27';for(const y of [-7,7]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(11,y+6);ctx.moveTo(38,y-5);ctx.lineTo(48,y);ctx.stroke()}}
  ctx.restore();
 }
 function beamPose(m,p){
  if(m.beamAge===null||m.stalkCuts===2)return null;
  const t=m.beamAge,f=ease((t-.8)/1.3);return {origin:p.parts.stalk.center,target:{x:150,y:mix(300,590,f)},firing:t>=.8&&t<2.1};
 }
 function drawInkFoot(ctx,x,y,w,h,angle,pivot,level=1){
  if(level<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.translate(-w*pivot.x,-h*pivot.y);
  const spikes=[[[.40,.37],[.35,.48],[.46,.49]],[[.57,.36],[.52,.45],[.61,.47]],[[.75,.47],[.69,.53],[.80,.56]],[[.87,.62],[.83,.65],[.87,.70]]];
  for(const points of spikes){ctx.save();ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px*w,py*h):ctx.moveTo(px*w,py*h));ctx.closePath();ctx.clip();const low=Math.min(...points.map(p=>p[1])),high=Math.max(...points.map(p=>p[1]));ctx.fillStyle='#203b4d';ctx.fillRect(0,(low+(high-low)*(1-level))*h,w,h);ctx.strokeStyle='#70afb5';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(points[1][0]*w,(high-.02)*h);ctx.lineTo(points[2][0]*w,(high-.02)*h);ctx.stroke();ctx.restore()}
  ctx.restore();
 }
 function drawFallenPart(ctx,image,d,reduced=false){const s=specs[d.part];ctx.save();ctx.translate(d.x,d.y);ctx.rotate(reduced?0:d.angle);const a={x:(s.pivot.x-.5)*s.w,y:(s.pivot.y-.5)*s.h};noodle(ctx,a,{x:a.x+30,y:a.y+28},12,13);ctx.restore();tile(ctx,image,s.col,s.row,d.x,d.y,s.w,s.h,reduced?0:d.angle);if(d.part==='leg')drawInkFoot(ctx,d.x,d.y,s.w,s.h,reduced?0:d.angle,{x:.5,y:.5},d.inkLevel??1)}
 function draw(ctx,image,m,{reduced=false,guide=true,toothImage=null,effects=true,debris=true}={}){
  const p=pose(m,reduced);ctx.save();
  for(const limb of Object.values(p.parts))if(limb.cuts<2){
   ctx.save();if(m.cutFocus&&m.cutFocus!==limb.name)ctx.globalAlpha=.5;const s=specs[limb.name];noodle(ctx,limb.joint.b,limb.end,limb.name==='arm'?(limb.cuts?70:35):limb.cuts?25:-10,limb.name==='stalk'?12:16);
   tile(ctx,image,s.col,s.row,limb.end.x,limb.end.y,s.w*limb.scale,s.h*limb.scale,limb.angle,s.pivot);if(limb.name==='leg')drawInkFoot(ctx,limb.end.x,limb.end.y,s.w*limb.scale,s.h*limb.scale,limb.angle,s.pivot);ctx.restore();
  }
  const openMouth=m.reaction>0||(m.teethAge!==null&&m.teethAge>=.72&&m.teethAge<1.9);
  if(p.roll){const r=p.roll;ctx.save();ctx.translate(r.x+p.entry,r.y);ctx.rotate(r.angle);ctx.scale(r.scaleX,r.scaleY);
   ctx.globalAlpha=1-r.tuck;tile(ctx,image,openMouth?2:0,openMouth?1:0,0,0,320,320);
   ctx.globalAlpha=r.tuck;tile(ctx,image,1,1,0,0,280,280);ctx.restore();
  }else{
   if(p.walk.blend>0){ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#5d5340';ctx.beginPath();ctx.ellipse(570+p.entry,565+p.bob,100*p.walk.sx,13,0,0,Math.PI*2);ctx.fill();ctx.restore()}
   ctx.save();ctx.translate(570+p.entry+p.walk.sway,410+p.bob+p.walk.lift);ctx.rotate(p.bodyAngle);ctx.scale(p.walk.sx,p.walk.sy);tile(ctx,image,openMouth?2:0,openMouth?1:0,0,0,320,320);ctx.restore();
  }
  for(const limb of Object.values(p.parts)){
   if(p.roll)continue;
   if(limb.cuts<2)threads(ctx,limb);
   else{ctx.strokeStyle='#6e592a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(limb.root.x-8,limb.root.y-8);ctx.lineTo(limb.root.x+5,limb.root.y+5);ctx.moveTo(limb.root.x-7,limb.root.y+7);ctx.lineTo(limb.root.x+5,limb.root.y-7);ctx.stroke()}
  }
  if(debris)for(const d of m.fallenParts)drawFallenPart(ctx,image,d,reduced);
  if(effects)for(const s of m.spikes){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.fillStyle='#fff4d9';ctx.strokeStyle='#282014';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(-9,-8);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#e77929';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-3);ctx.lineTo(13,0);ctx.stroke();ctx.restore()}
  const beam=effects?beamPose(m,p):null;
  if(beam){
   const line=()=>{ctx.beginPath();ctx.moveTo(beam.origin.x,beam.origin.y);ctx.lineTo(beam.target.x,beam.target.y);ctx.stroke()};
   if(beam.firing){ctx.lineCap='round';ctx.strokeStyle='#247c75';ctx.lineWidth=15;line();ctx.strokeStyle='#b6ef87';ctx.lineWidth=9;line();ctx.strokeStyle='#fffbe5';ctx.lineWidth=3;line()}
   else if(m.beamAge<.8){ctx.setLineDash([8,8]);ctx.strokeStyle='#9b632d';ctx.lineWidth=3;line();ctx.setLineDash([]);ctx.strokeStyle='#9b632d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(beam.origin.x,beam.origin.y,30,0,Math.PI*2);ctx.stroke()}
  }
  if(effects&&m.teethAge!==null){
   ctx.strokeStyle='#9b632d';ctx.lineWidth=3;
   for(const target of m.teethPlan){const tooth=m.teeth.find(t=>t.index===m.teethPlan.indexOf(target)&&t.life>1);if(target.launched&&(!tooth||tooth.age>=tooth.flight))continue;
    ctx.setLineDash([5,4]);ctx.beginPath();ctx.ellipse(target.x,target.y+30,30,10,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
   }
   if(m.teethAge<.85&&!reduced){for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(p.mouth.x+sign*42,p.mouth.y-8);ctx.lineTo(p.mouth.x+sign*56,p.mouth.y-16);ctx.moveTo(p.mouth.x+sign*48,p.mouth.y+10);ctx.lineTo(p.mouth.x+sign*63,p.mouth.y+15);ctx.stroke()}}
  }
  if(toothImage)for(const t of m.teeth){
   const q=toothPose(t,reduced);ctx.save();ctx.globalAlpha=Math.min(1,t.life/.35);ctx.translate(q.x,q.y);ctx.rotate(q.angle);ctx.scale(q.scaleX*(t.vx>0?-1:1),q.scaleY);ctx.drawImage(toothImage,-37,-37,74,74);ctx.restore();
  }
  if(effects&&p.roll){const r=p.roll;
   if(r.phase==='tucking'||r.phase==='winding'){ctx.strokeStyle='#9b632d';ctx.lineWidth=3;ctx.setLineDash([10,8]);ctx.beginPath();ctx.moveTo(160,500);ctx.lineTo(790,500);ctx.stroke();ctx.setLineDash([]);const tip=m.rollDirection<0?160:790,dir=m.rollDirection;ctx.beginPath();ctx.moveTo(tip-dir*22,484);ctx.lineTo(tip,500);ctx.lineTo(tip-dir*22,516);ctx.stroke()}
   if(r.phase==='rolling'&&!reduced){ctx.strokeStyle='#8c7655';ctx.lineWidth=3;for(let i=0;i<3;i++){const x=r.x-r.direction*(125+i*12);ctx.beginPath();ctx.moveTo(x,r.y-20+i*22);ctx.lineTo(x-r.direction*35,r.y-20+i*22);ctx.stroke()}}
  }
  if(effects)for(const t of m.teeth)if(t.source==='roll'&&t.age<t.flight){ctx.strokeStyle='#9b632d';ctx.lineWidth=3;ctx.setLineDash([5,4]);ctx.beginPath();ctx.ellipse(t.target.x,t.target.y+30,30,10,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
  if(m.impact>0){ctx.strokeStyle='#bd7233';ctx.lineWidth=3;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.beginPath();ctx.moveTo(110+Math.cos(a)*18,505+Math.sin(a)*18);ctx.lineTo(110+Math.cos(a)*(30+m.impact*35),505+Math.sin(a)*(30+m.impact*35));ctx.stroke()}}
  for(const mark of m.marks){ctx.strokeStyle='#358174';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mark.x-20,mark.y+22);ctx.lineTo(mark.x+20,mark.y-22);ctx.stroke()}
  if(guide&&!p.roll)for(const limb of Object.values(p.parts))if(limb.cuts<2){const {a,b}=limb.joint;ctx.strokeStyle='#28796d';ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc((a.x+b.x)/2,(a.y+b.y)/2,36,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
  ctx.restore();
 }
 return {WIDTH,HEIGHT,create,update,stepWalk,punch,shootSpikes,eyeBeam,shakeTeeth,tuckAndRoll,rollPose,toothPose,busy,pose,cutStroke,draw,drawFallenPart};
})();
