/* A reusable, deterministic paper-puppet rig. No combat or DOM dependencies. */
DoodleDefender.WobblechompRig=(()=>{
 const WIDTH=1000,HEIGHT=720,SHOULDER={x:466,y:418};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const mix=(a,b,t)=>a+(b-a)*t;
 const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 function create(){return {time:0,punchAge:null,armCuts:0,reaction:0,impact:0,wrist:{x:310,y:365},angle:-.35,debris:null,marks:[]}}
 function punch(m){if(m.armCuts===2||m.punchAge!==null)return false;m.punchAge=0;return true}
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
  if(m.debris&&!m.debris.settled){
   let left=dt;while(left>0){const step=Math.min(left,1/120);left-=step;const d=m.debris;d.vy+=650*step;d.x+=d.vx*step;d.y+=d.vy*step;d.angle+=d.spin*step;
    if(d.x<95||d.x>890){d.x=clamp(d.x,95,890);d.vx*=-.35}
    if(d.y>590){d.y=590;d.vy*=-.32;d.vx*=.6;d.spin*=.45;if(Math.abs(d.vy)<35){d.settled=true;d.vy=d.vx=d.spin=0}}
   }
  }
 }
 function pose(m,reduced=false){
  const entry=(1-ease(m.time/.9))*70,bob=reduced?0:Math.sin(m.time*3)*3;
  const root={x:SHOULDER.x+entry,y:SHOULDER.y+bob};
  const wrist={x:m.wrist.x+entry,y:m.wrist.y+bob};
  const dx=wrist.x-root.x,dy=wrist.y-root.y,d=Math.hypot(dx,dy)||1;
  const joint={a:{...root},b:{x:root.x+dx/d*48,y:root.y+dy/d*48}};
  return {entry,bob,root,wrist,joint,bodyAngle:reduced?0:Math.sin(m.time*2)*.025,angle:m.angle};
 }
 function intersects(a,b,c,d){
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const p=cross(a,b,c),q=cross(a,b,d),r=cross(c,d,a),s=cross(c,d,b);
  // A real crossing, not a tap or a stroke running along the arm.
  return p*q<=0&&r*s<=0&&Math.abs(p-q)>1&&Math.abs(r-s)>1;
 }
 function cutStroke(m,points,reduced=false){
  if(m.armCuts===2||!Array.isArray(points)||points.length<2||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
  if(length<20)return false;
  const p=pose(m,reduced),j=p.joint;
  if(!points.slice(1).some((b,i)=>intersects(points[i],b,j.a,j.b)))return false;
  m.armCuts++;m.reaction=.8;m.punchAge=null;m.marks.push({x:(j.a.x+j.b.x)/2,y:(j.a.y+j.b.y)/2,life:.5});
  if(m.armCuts===2){const a=p.angle;m.debris={x:p.wrist.x+-Math.cos(a)*27.75+Math.sin(a)*77.7,y:p.wrist.y-Math.sin(a)*27.75-Math.cos(a)*77.7,vx:-90,vy:-100,angle:a,spin:-2.4,settled:false}}
  return true;
 }
 function tile(ctx,image,col,row,x,y,w,h,angle=0,pivot=false){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(image,col*image.naturalWidth/3,row*image.naturalHeight/2,image.naturalWidth/3,image.naturalHeight/2,pivot?-w*.65:-w/2,pivot?-h*.92:-h/2,w,h);ctx.restore();
 }
 function noodle(ctx,a,b,bend=0,width=15){
  ctx.lineCap='round';const draw=()=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+(b.x-a.x)*.35,a.y+bend,b.x-(b.x-a.x)*.2,b.y+bend,b.x,b.y)};
  ctx.strokeStyle='#17140e';ctx.lineWidth=width+7;draw();ctx.stroke();ctx.strokeStyle='#ead326';ctx.lineWidth=width;draw();ctx.stroke();
  ctx.strokeStyle='#fff5b099';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x+2,a.y-2);ctx.lineTo(mix(a.x,b.x,.35),mix(a.y,b.y,.35)-3);ctx.stroke();
 }
 function draw(ctx,image,m,{reduced=false,guide=true}={}){
  const p=pose(m,reduced),entry=p.entry,bob=p.bob;
  ctx.save();
  // Static leg/stalk layers already have independent anchors for the next slices.
  noodle(ctx,{x:681+entry,y:484+bob},{x:702+entry,y:517+bob},8,14);
  tile(ctx,image,2,0,752+entry,522+bob,180,180,reduced?0:Math.sin(m.time*2.5)*.04);
  noodle(ctx,{x:646+entry,y:311+bob},{x:630+entry,y:218+bob},reduced?-10:-10+Math.sin(m.time*2)*5,12);
  tile(ctx,image,0,1,630+entry,177+bob,140,140,reduced?0:Math.sin(m.time*2)*.06);
  if(m.armCuts<2){
   const end=p.joint.b;noodle(ctx,end,p.wrist,m.armCuts?70:35,16);
   ctx.save();ctx.translate(p.root.x,p.root.y);ctx.rotate(Math.atan2(end.y-p.root.y,end.x-p.root.x));
   ctx.strokeStyle='#282014';ctx.lineWidth=3;ctx.lineCap='round';
   for(const y of m.armCuts?[0]:[-7,0,7]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(15,y+2);ctx.lineTo(33,y-2);ctx.lineTo(48,y);ctx.stroke()}
   if(m.armCuts){ctx.strokeStyle='#875d27';for(const y of [-7,7]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(11,y+6);ctx.moveTo(38,y-5);ctx.lineTo(48,y);ctx.stroke()}}
   ctx.restore();tile(ctx,image,1,0,p.wrist.x,p.wrist.y,185,185,p.angle,true);
  }
  tile(ctx,image,m.reaction>0?2:0,m.reaction>0?1:0,570+entry,410+bob,320,320,p.bodyAngle);
  if(m.armCuts===2){ctx.strokeStyle='#6e592a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(p.root.x-8,p.root.y-8);ctx.lineTo(p.root.x+5,p.root.y+5);ctx.moveTo(p.root.x-7,p.root.y+7);ctx.lineTo(p.root.x+5,p.root.y-7);ctx.stroke()}
  if(m.debris){const d=m.debris;ctx.save();ctx.translate(d.x,d.y);ctx.rotate(reduced?0:d.angle);noodle(ctx,{x:27.75,y:77.7},{x:60,y:105},12,13);ctx.restore();tile(ctx,image,1,0,d.x,d.y,185,185,reduced?0:d.angle);}
  if(m.impact>0){ctx.strokeStyle='#bd7233';ctx.lineWidth=3;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.beginPath();ctx.moveTo(110+Math.cos(a)*18,505+Math.sin(a)*18);ctx.lineTo(110+Math.cos(a)*(30+m.impact*35),505+Math.sin(a)*(30+m.impact*35));ctx.stroke()}}
  for(const mark of m.marks){ctx.strokeStyle='#358174';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mark.x-20,mark.y+22);ctx.lineTo(mark.x+20,mark.y-22);ctx.stroke()}
  if(guide&&m.armCuts<2){const x=(p.joint.a.x+p.joint.b.x)/2,y=(p.joint.a.y+p.joint.b.y)/2;ctx.strokeStyle='#28796d';ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(x,y,36,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
  ctx.restore();
 }
 return {WIDTH,HEIGHT,create,update,punch,pose,cutStroke,draw};
})();
