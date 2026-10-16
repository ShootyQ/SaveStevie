/* Articulated notebook monsters. Pure posing/drawing; no combat or game RNG. */
DoodleDefender.WhiteBrothersRig=(()=>{
 const durations={idle:2.6,walk:2.6,intro:2.4,attack:2,throw:1.8,hit:.7,dizzy:2.4,tantrum:2.4,defeat:2.8};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
 function create(kind){return {kind:kind==='glue'?'glue':'wite',time:0,age:0,action:'idle'};}
 function act(m,action){if(!Object.hasOwn(durations,action))return false;m.action=action;m.age=0;return true;}
 function update(m,dt){dt=clamp(Number.isFinite(dt)?dt:0,0,.1);m.time+=dt;m.age=Math.min(durations[m.action],m.age+dt);}
 function pose(m,reduced=false){
  const a=m.action,t=reduced?(a==='defeat'?1:a==='intro'?1:.62):clamp(m.age/durations[a],0,1),beat=reduced?0:Math.sin(m.time*9),p={x:0,y:0,angle:0,sx:1,sy:1,left:0,right:0,leftFoot:0,rightFoot:0,face:'grin',blink:!reduced&&m.time%4.1>3.94,progress:t,effect:0};
  if(!reduced){p.y=Math.sin(m.time*3)*1.5;p.sy=1+Math.sin(m.time*3)*.012;}
  if(a==='walk'&&!reduced){p.y=-Math.abs(beat)*7;p.angle=beat*.05;p.leftFoot=beat*19;p.rightFoot=-beat*19;p.left=-beat*.3;p.right=beat*.3;}
  if(a==='intro'){p.face='roar';p.left=-.8;p.right=.95;if(!reduced){p.x=(m.kind==='wite'?-1:1)*(1-ease(t/.55))*160;p.y-=Math.sin(Math.min(1,t/.7)*Math.PI)*42;p.sx=1+.13*Math.sin(t*Math.PI*3)*(1-t);p.sy=1-.1*Math.sin(t*Math.PI*3)*(1-t);}}
  if(a==='attack'){p.face='angry';const wind=Math.sin(clamp(t/.38,0,1)*Math.PI/2),strike=ease((t-.38)/.3);p.effect=Math.sin(clamp((t-.4)/.5,0,1)*Math.PI);if(m.kind==='wite'){p.right=-1.8*wind+3*strike;p.left=-.4;p.angle=reduced?0:-.12*wind+.27*strike;}else{p.left=.75;p.right=-.75;p.sx=1-.24*p.effect;p.sy=1+.12*p.effect;p.face='strain';}}
  if(a==='throw'){p.face='roar';p.right=-1.7*Math.sin(t*Math.PI);p.left=-.4;p.effect=clamp((t-.35)/.6,0,1);p.angle=reduced?0:Math.sin(t*Math.PI)*-.13;}
  if(a==='hit'){p.face='hurt';p.effect=Math.sin(t*Math.PI);if(!reduced){p.x=-Math.sin(t*Math.PI)*12;p.angle=-Math.sin(t*Math.PI)*.16;p.sx=1+.1*p.effect;p.sy=1-.13*p.effect;}}
  if(a==='dizzy'){p.face='dizzy';p.left=.6;p.right=-.6;if(!reduced){p.angle=Math.sin(m.time*5)*.14;p.x=Math.sin(m.time*3)*5;}}
  if(a==='tantrum'){p.face='roar';p.left=-1.1;p.right=1.1;if(!reduced){p.y=-Math.abs(beat)*10;p.leftFoot=beat*15;p.rightFoot=-beat*15;p.left+=beat*.4;p.right-=beat*.4;p.angle=beat*.07;}}
  if(a==='defeat'){const fall=ease((t-.15)/.65);p.face='defeat';p.y+=86*fall;p.sx=1+.55*fall;p.sy=1-.76*fall;p.left=-1.2*fall;p.right=1.2*fall;}
  return p;
 }
 function line(ctx,points,color,width){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#29272b';ctx.lineWidth=width+4;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
 function hand(ctx,x,y,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.strokeStyle='#29272b';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-11,-5);ctx.lineTo(-7,-15);ctx.lineTo(-2,-7);ctx.lineTo(3,-18);ctx.lineTo(7,-6);ctx.lineTo(15,-12);ctx.lineTo(14,3);ctx.quadraticCurveTo(2,14,-9,6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
 function star(ctx,x,y,r,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.strokeStyle='#524149';ctx.lineWidth=1.4;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.45:r;i?ctx.lineTo(Math.cos(a)*q,Math.sin(a)*q):ctx.moveTo(Math.cos(a)*q,Math.sin(a)*q);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
 function blob(ctx,x,y,r,color){ctx.fillStyle=color;ctx.strokeStyle='#65536c';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<14;i++){const a=i*Math.PI/7,q=r*(i%2?.75:1);i?ctx.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q):ctx.moveTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}ctx.closePath();ctx.fill();ctx.stroke();}
 function face(ctx,p,glue){
  ctx.save();ctx.translate(glue?2:0,-20);ctx.strokeStyle='#25242a';ctx.lineWidth=3;
  for(const side of [-1,1]){const x=side*22,y=side===-1?-12:-16,rx=side===-1?17:14;ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.ellipse(x,y,rx,p.blink?2:19,side*.13,0,Math.PI*2);ctx.fill();ctx.stroke();
   if(!p.blink){if(p.face==='dizzy'){ctx.beginPath();for(let i=0;i<30;i++){const a=i*.3,r=i*.23;i?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x,y);}ctx.lineWidth=1.6;ctx.stroke();ctx.lineWidth=3;}else if(['hurt','defeat'].includes(p.face)){ctx.beginPath();ctx.moveTo(x-5,y-5);ctx.lineTo(x+5,y+5);ctx.moveTo(x+5,y-5);ctx.lineTo(x-5,y+5);ctx.stroke();}else{ctx.fillStyle='#25242a';ctx.beginPath();ctx.ellipse(x+3,y+2,5,8,0,0,Math.PI*2);ctx.fill();}}
   ctx.beginPath();ctx.moveTo(x-15,y-25+(side===-1?-3:4));ctx.lineTo(x+14,y-24+(side===-1?7:-6));ctx.lineWidth=5;ctx.stroke();ctx.lineWidth=3;
  }
  const open=['roar','strain','defeat'].includes(p.face),y=23;ctx.fillStyle='#42323b';ctx.beginPath();ctx.moveTo(-32,y-8);ctx.quadraticCurveTo(0,y+4,33,y-12);ctx.quadraticCurveTo(30,y+(open?35:16),0,y+(open?34:16));ctx.quadraticCurveTo(-28,y+(open?31:14),-32,y-8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff7d8';for(const x of [-22,-8,8,24]){ctx.beginPath();ctx.moveTo(x-5,y-4);ctx.lineTo(x+5,y-4);ctx.lineTo(x+1,y+(x%3?8:13));ctx.closePath();ctx.fill();ctx.stroke();}
  if(open){ctx.fillStyle='#da8f9c';ctx.beginPath();ctx.ellipse(5,y+24,13,5,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();
 }
 function draw(ctx,image,m,{reduced=false}={}){
  const p=pose(m,reduced),glue=m.kind==='glue',color=glue?'#e0d5e9':'#eee8d3';
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(p.sx,p.sy);
  // Clawed legs and jointed arms are independent of the textured torso.
  for(const side of [-1,1]){const foot=side<0?p.leftFoot:p.rightFoot;line(ctx,[[side*35,68],[side*43,99-Math.max(0,foot)*.2],[side*58+foot*.3,117-Math.max(0,foot)]],color,13);hand(ctx,side*58+foot*.3,119-Math.max(0,foot),color);}
  const wrists=[];
  for(const side of [-1,1]){const angle=side<0?p.left:p.right,root={x:side*64,y:8},elbow={x:root.x+side*Math.cos(angle)*28,y:root.y+Math.sin(angle)*32+13},wrist={x:elbow.x+side*Math.cos(angle+.25)*35,y:elbow.y+Math.sin(angle+.25)*35};wrists.push(wrist);line(ctx,[[root.x,root.y],[elbow.x,elbow.y],[wrist.x,wrist.y]],color,12);}
  if(image&&image.naturalWidth){const cw=image.naturalWidth/2;ctx.drawImage(image,glue?cw:0,0,cw,image.naturalHeight,-112,-143,224,244);}else{ctx.fillStyle=glue?'#f1e8d8':'#f4efe0';ctx.strokeStyle='#29272b';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<24;i++){const a=i*Math.PI/12,r=i%2?66:82;i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(r,0);}ctx.closePath();ctx.fill();ctx.stroke();}
  face(ctx,p,glue);
  for(let i=0;i<2;i++){const w=wrists[i];hand(ctx,w.x,w.y,color);}
  const w=wrists[1];
  if(!glue){ctx.save();ctx.translate(w.x,w.y);ctx.rotate(p.right*.7-.3);line(ctx,[[0,6],[10,-55]],'#7e5aa7',8);ctx.fillStyle='#ebe7d7';ctx.strokeStyle='#28252e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1,-50);ctx.lineTo(22,-48);ctx.lineTo(29,-79);ctx.lineTo(2,-83);ctx.closePath();ctx.fill();ctx.stroke();for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(5+i*4,-54);ctx.lineTo(7+i*4,-77);ctx.stroke();}ctx.restore();}
  else{ctx.strokeStyle='#a189b6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(wrists[0].x,wrists[0].y);ctx.quadraticCurveTo(0,95,wrists[1].x,wrists[1].y);ctx.stroke();}
  if(m.action==='attack'&&p.effect>0){ctx.globalAlpha=p.effect;if(glue){ctx.strokeStyle='#b5a0cb';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(4,-100);ctx.quadraticCurveTo(135,-120,158,60);ctx.stroke();blob(ctx,158,70,23,'#d6c4e6');}else{ctx.strokeStyle='#898484';ctx.lineWidth=21;ctx.beginPath();ctx.ellipse(100,24,87,36,.3,-1.2,1.3);ctx.stroke();ctx.strokeStyle='#fffdf0';ctx.lineWidth=17;ctx.stroke();}ctx.globalAlpha=1;}
  if(m.action==='throw'&&p.effect>0&&p.effect<1){const t=p.effect;blob(ctx,90+t*110,-25-Math.sin(t*Math.PI)*100+t*65,15,glue?'#d6c4e6':'#fffdf0');}
  if(m.action==='dizzy')for(let i=0;i<3;i++){const a=(reduced?0:m.time*3)+i*Math.PI*2/3;star(ctx,Math.cos(a)*55,-146+Math.sin(a)*11,8,'#efcd54');}
  if(m.action==='hit'&&p.effect>0)star(ctx,79,-46,14*p.effect,'#efcd54');
  ctx.restore();
 }
 return {durations,create,act,update,pose,draw};
})();
