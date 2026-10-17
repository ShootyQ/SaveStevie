/* Complete hand-drawn character frames. The historical API name is retained. */
DoodleDefender.WhiteBrothersRig=(()=>{
 const durations={idle:2.6,walk:2.6,intro:2.4,attack:1,throw:1.8,hit:.7,dizzy:2.4,tantrum:2.4,defeat:2.8};
 const sequences={idle:[0,1],walk:[2,3,4,5],intro:[6,7,8],attack:[9,10,11],throw:[12,13,14],hit:[15,16],dizzy:[17,18],tantrum:[19,20],defeat:[21,22,23]};
 const columns=6,rows=4;
 function create(kind){return {kind:kind==='glue'?'glue':'wite',time:0,age:0,started:0,action:'idle'};}
 function act(m,action){if(!Object.hasOwn(durations,action))return false;m.action=action;m.age=0;m.started=m.time;return true;}
 function update(m,dt){dt=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));m.time+=dt;m.age=Math.min(durations[m.action],m.age+dt);}
 function pose(m,reduced=false){
  const frames=sequences[m.action]||sequences.idle;
  if(reduced)return {frame:frames[m.action==='defeat'?frames.length-1:0]};
  const elapsed=Math.max(0,m.time-(m.started||0));
  if(m.action==='idle')return {frame:frames[elapsed%3.5>3.25?1:0]};
  const fps={walk:8,dizzy:4,tantrum:6}[m.action];
  if(fps)return {frame:frames[Math.floor(elapsed*fps)%frames.length]};
  return {frame:frames[Math.min(frames.length-1,Math.floor(m.age/durations[m.action]*frames.length))]};
 }
 function draw(ctx,images,m,{reduced=false}={}){
  const image=images?.[m.kind]||images;
  if(!image?.naturalWidth||!image?.naturalHeight)return false;
  const frame=pose(m,reduced).frame,w=image.naturalWidth/columns,h=image.naturalHeight/rows;
  // One full image cell, preserving registration, drawn without puppet transforms.
  ctx.drawImage(image,(frame%columns)*w,Math.floor(frame/columns)*h,w,h,-128,-128,256,256);
  return true;
 }
 return {durations,sequences,columns,rows,create,act,update,pose,draw};
})();
