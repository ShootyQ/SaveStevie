/* Deterministic modular paper puppet. Animation only; no combat or DOM dependencies. */
DoodleDefender.WobblechompRig=(()=>{
 const WIDTH=1000,HEIGHT=720;
 const specs={
  arm:{cuts:'armCuts',col:1,row:0,w:185,h:185,pivot:{x:.65,y:.92}},
  leg:{cuts:'legCuts',col:2,row:0,w:180,h:180,pivot:{x:.12,y:.52}},
  stalk:{cuts:'stalkCuts',col:0,row:1,w:140,h:140,pivot:{x:.5,y:.85}}
 };
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
 const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 function create(){return {time:0,punchAge:null,spikeAge:null,beamAge:null,armCuts:0,legCuts:0,stalkCuts:0,reaction:0,impact:0,wrist:{x:310,y:365},angle:-.35,debris:null,fallenParts:[],spikes:[],marks:[],lastCut:null}}
 const busy=m=>m.punchAge!==null||m.spikeAge!==null||m.beamAge!==null;
 function attack(m,part,key){if(m[specs[part].cuts]===2||busy(m))return false;m[key]=0;return true}
 const punch=m=>attack(m,'arm','punchAge'),shootSpikes=m=>attack(m,'leg','spikeAge'),eyeBeam=m=>attack(m,'stalk','beamAge');
 function update(m,dt){
  dt=clamp(dt,0,.1);m.time+=dt;m.reaction=Math.max(0,m.reaction-dt);m.impact=Math.max(0,m.impact-dt);
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
  for(const s of m.spikes){s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt}m.spikes=m.spikes.filter(s=>s.life>0&&s.x>-40);
  for(const d of m.fallenParts)if(!d.settled){
   let left=dt;while(left>0){const step=Math.min(left,1/120);left-=step;d.vy+=650*step;d.x+=d.vx*step;d.y+=d.vy*step;d.angle+=d.spin*step;
    if(d.x<95||d.x>890){d.x=clamp(d.x,95,890);d.vx*=-.35}
    if(d.y>590){d.y=590;d.vy*=-.32;d.vx*=.6;d.spin*=.45;if(Math.abs(d.vy)<35){d.settled=true;d.vy=d.vx=d.spin=0}}
   }
  }
 }
 function part(root,end,angle,name,cuts){
  const s=specs[name],dx=end.x-root.x,dy=end.y-root.y,d=Math.hypot(dx,dy)||1;
  const ox=(.5-s.pivot.x)*s.w,oy=(.5-s.pivot.y)*s.h;
  return {name,cuts,root,end,angle,center:{x:end.x+Math.cos(angle)*ox-Math.sin(angle)*oy,y:end.y+Math.sin(angle)*ox+Math.cos(angle)*oy},joint:{a:{...root},b:{x:root.x+dx/d*48,y:root.y+dy/d*48}}};
 }
 function pose(m,reduced=false){
  const entry=(1-ease(m.time/.9))*70,bob=reduced?0:Math.sin(m.time*3)*(m.legCuts===2?5:3);
  const at=(x,y)=>({x:x+entry,y:y+bob});
  let legX=721,legY=m.legCuts?567:522,legAngle=m.legCuts ? .2 : 0;
  if(m.spikeAge!==null){const t=m.spikeAge;
   const lift=t<.95?ease(t/.95):t<1.3?1:1-ease((t-1.3)/.8);
   legX+=lift*45;legY-=lift*115;legAngle-=lift*.45;
  }
  let eyeX=m.stalkCuts?755:630,eyeY=m.stalkCuts?360:226,eyeAngle=m.stalkCuts?-.9:0;
  if(m.beamAge!==null){const t=m.beamAge,coil=t<.8?ease(t/.8):1-ease((t-2.1)/.7);eyeX+=coil*25;eyeY-=coil*25;eyeAngle-=coil*.3}
  if(!reduced){legAngle+=Math.sin(m.time*2.5)*.04;eyeAngle+=Math.sin(m.time*2)*.06}
  const parts={arm:part(at(466,418),at(m.wrist.x,m.wrist.y),m.angle,'arm',m.armCuts),leg:part(at(675,495),at(legX,legY),legAngle,'leg',m.legCuts),stalk:part(at(646,311),at(eyeX,eyeY),eyeAngle,'stalk',m.stalkCuts)};
  const arm=parts.arm;
  return {entry,bob,parts,root:arm.root,wrist:arm.end,joint:arm.joint,bodyAngle:reduced?0:Math.sin(m.time*2)*.025+(m.legCuts===2?-.07:0),angle:arm.angle};
 }
 function crossing(a,b,c,d){
  const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y,den=dx*ey-dy*ex;
  if(Math.abs(den)<1)return null;
  const x=c.x-a.x,y=c.y-a.y,t=(x*ey-y*ex)/den,u=(x*dy-y*dx)/den;
  return t>=0&&t<=1&&u>=0&&u<=1?t:null;
 }
 function cutStroke(m,points,reduced=false){
  if(!Array.isArray(points)||points.length<2||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);if(length<20)return false;
  const p=pose(m,reduced);let chosen=null;
  // First joint crossed wins; one released gesture can cut only one part once.
  for(let i=1;i<points.length&&!chosen;i++){
   let nearest=Infinity;for(const limb of Object.values(p.parts))if(limb.cuts<2){const t=crossing(points[i-1],points[i],limb.joint.a,limb.joint.b);if(t!==null&&t<nearest){chosen=limb;nearest=t}}
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
 function draw(ctx,image,m,{reduced=false,guide=true}={}){
  const p=pose(m,reduced);ctx.save();
  for(const limb of Object.values(p.parts))if(limb.cuts<2){
   const s=specs[limb.name];noodle(ctx,limb.joint.b,limb.end,limb.name==='arm'?(limb.cuts?70:35):limb.cuts?25:-10,limb.name==='stalk'?12:16);
   tile(ctx,image,s.col,s.row,limb.end.x,limb.end.y,s.w,s.h,limb.angle,s.pivot);
  }
  tile(ctx,image,m.reaction>0?2:0,m.reaction>0?1:0,570+p.entry,410+p.bob,320,320,p.bodyAngle);
  for(const limb of Object.values(p.parts)){
   if(limb.cuts<2)threads(ctx,limb);
   else{ctx.strokeStyle='#6e592a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(limb.root.x-8,limb.root.y-8);ctx.lineTo(limb.root.x+5,limb.root.y+5);ctx.moveTo(limb.root.x-7,limb.root.y+7);ctx.lineTo(limb.root.x+5,limb.root.y-7);ctx.stroke()}
  }
  for(const d of m.fallenParts){const s=specs[d.part];ctx.save();ctx.translate(d.x,d.y);ctx.rotate(reduced?0:d.angle);const a={x:(s.pivot.x-.5)*s.w,y:(s.pivot.y-.5)*s.h};noodle(ctx,a,{x:a.x+30,y:a.y+28},12,13);ctx.restore();tile(ctx,image,s.col,s.row,d.x,d.y,s.w,s.h,reduced?0:d.angle);}
  for(const s of m.spikes){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.fillStyle='#fff4d9';ctx.strokeStyle='#282014';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(-9,-8);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#e77929';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-3);ctx.lineTo(13,0);ctx.stroke();ctx.restore()}
  const beam=beamPose(m,p);
  if(beam){
   const line=()=>{ctx.beginPath();ctx.moveTo(beam.origin.x,beam.origin.y);ctx.lineTo(beam.target.x,beam.target.y);ctx.stroke()};
   if(beam.firing){ctx.lineCap='round';ctx.strokeStyle='#247c75';ctx.lineWidth=15;line();ctx.strokeStyle='#b6ef87';ctx.lineWidth=9;line();ctx.strokeStyle='#fffbe5';ctx.lineWidth=3;line()}
   else if(m.beamAge<.8){ctx.setLineDash([8,8]);ctx.strokeStyle='#9b632d';ctx.lineWidth=3;line();ctx.setLineDash([]);ctx.strokeStyle='#9b632d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(beam.origin.x,beam.origin.y,30,0,Math.PI*2);ctx.stroke()}
  }
  if(m.impact>0){ctx.strokeStyle='#bd7233';ctx.lineWidth=3;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.beginPath();ctx.moveTo(110+Math.cos(a)*18,505+Math.sin(a)*18);ctx.lineTo(110+Math.cos(a)*(30+m.impact*35),505+Math.sin(a)*(30+m.impact*35));ctx.stroke()}}
  for(const mark of m.marks){ctx.strokeStyle='#358174';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mark.x-20,mark.y+22);ctx.lineTo(mark.x+20,mark.y-22);ctx.stroke()}
  if(guide)for(const limb of Object.values(p.parts))if(limb.cuts<2){const {a,b}=limb.joint;ctx.strokeStyle='#28796d';ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc((a.x+b.x)/2,(a.y+b.y)/2,36,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
  ctx.restore();
 }
 return {WIDTH,HEIGHT,create,update,punch,shootSpikes,eyeBeam,busy,pose,cutStroke,draw};
})();
