/* renderer: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.renderer = function createRendererSystem(game) {
function resize(){
  const r=game.dom.canvas.getBoundingClientRect();
  game.state.dpr=Math.min(2,window.devicePixelRatio||1);
  game.dom.canvas.width=Math.floor(r.width*game.state.dpr);game.dom.canvas.height=Math.floor(r.height*game.state.dpr);
  game.state.W=r.width;game.state.H=r.height;game.dom.ctx.setTransform(game.state.dpr,0,0,game.state.dpr,0,0);
  game.state.player.x=game.state.W/2;game.state.player.y=game.state.H/2;
}

function draw(){
  game.dom.ctx.clearRect(0,0,game.state.W,game.state.H);game.dom.ctx.save();
  game.dom.ctx.strokeStyle='rgba(212,76,76,.35)';game.dom.ctx.lineWidth=2;
  game.dom.ctx.beginPath();game.dom.ctx.moveTo(47,0);game.dom.ctx.lineTo(47,game.state.H);game.dom.ctx.stroke();

  for(const w of game.state.walls){
    const hpRatio=game.api.clamp(w.hp/w.maxHp,0,1);
    const lifeRatio=game.api.clamp(w.life/w.maxLife,0,1);
    const visualRatio=Math.min(hpRatio,lifeRatio);
    let col=`rgba(31,42,51,${.08+.92*visualRatio})`;
    if(game.state.inks.chaos>0)col=`hsla(${(performance.now()/30+w.hp)%360},55%,30%,${.12+.88*visualRatio})`;
    game.dom.ctx.lineCap='round';game.dom.ctx.lineJoin='round';game.dom.ctx.lineWidth=w.thick;game.dom.ctx.strokeStyle=col;
    game.dom.ctx.beginPath();game.dom.ctx.moveTo(w.pts[0].x,w.pts[0].y);
    for(let i=1;i<w.pts.length;i++)game.dom.ctx.lineTo(w.pts[i].x,w.pts[i].y);
    game.dom.ctx.stroke();

    if(w.closed&&game.state.synergies.has('THE BLACK HOLE')){
      let cx=0,cy=0;for(const p of w.pts){cx+=p.x;cy+=p.y}cx/=w.pts.length;cy/=w.pts.length;
      game.dom.ctx.save();game.dom.ctx.globalAlpha=.16;game.dom.ctx.fillStyle='#493468';game.dom.ctx.beginPath();game.dom.ctx.arc(cx,cy,34+Math.sin(performance.now()/220)*5,0,Math.PI*2);game.dom.ctx.fill();game.dom.ctx.restore()
    }
    if(w.closed&&game.state.synergies.has('TESLA CAGE')&&w.intersections>0){
      game.dom.ctx.save();game.dom.ctx.globalAlpha=.18;game.dom.ctx.strokeStyle='#6f98ff';game.dom.ctx.lineWidth=3;
      game.dom.ctx.beginPath();game.dom.ctx.arc(w.pts[0].x,w.pts[0].y,16+Math.sin(performance.now()/180)*4,0,Math.PI*2);game.dom.ctx.stroke();game.dom.ctx.restore()
    }
  }
  if(game.state.currentWall&&game.state.currentWall.length>1){
    game.dom.ctx.lineWidth=game.state.stats.lineWidth;game.dom.ctx.strokeStyle='rgba(31,42,51,.72)';game.dom.ctx.lineCap='round';game.dom.ctx.lineJoin='round';
    game.dom.ctx.beginPath();game.dom.ctx.moveTo(game.state.currentWall[0].x,game.state.currentWall[0].y);game.state.currentWall.slice(1).forEach(p=>game.dom.ctx.lineTo(p.x,p.y));game.dom.ctx.stroke()
  }

  // Steve
  game.dom.ctx.translate(game.state.player.x,game.state.player.y);
  game.dom.ctx.fillStyle='#f3d7b5';game.dom.ctx.strokeStyle='#24323a';game.dom.ctx.lineWidth=3;
  game.dom.ctx.beginPath();game.dom.ctx.arc(0,-7,13,0,Math.PI*2);game.dom.ctx.fill();game.dom.ctx.stroke();
  game.dom.ctx.fillStyle='#3f75b7';game.dom.ctx.fillRect(-12,7,24,27);
  game.dom.ctx.fillStyle='#25313a';game.dom.ctx.beginPath();game.dom.ctx.arc(-4,-9,1.8,0,Math.PI*2);game.dom.ctx.arc(4,-9,1.8,0,Math.PI*2);game.dom.ctx.fill();
  game.dom.ctx.strokeStyle='#25313a';game.dom.ctx.lineWidth=2;game.dom.ctx.beginPath();game.dom.ctx.arc(0,-4,5,.25,Math.PI-.25);game.dom.ctx.stroke();
  game.dom.ctx.restore();

  for(const e of game.state.enemies){
    const hpRatio=game.api.clamp(e.hp/e.maxHp,0,1);
    game.dom.ctx.save();game.dom.ctx.translate(e.x,e.y);

    if(e.type==='eraser'){
      game.dom.ctx.rotate(Math.sin(performance.now()/350)*.08);
      game.dom.ctx.strokeStyle='#81344d';game.dom.ctx.lineWidth=3;

      // Empty paper-colored body first, then fill upward according to remaining HP.
      game.dom.ctx.fillStyle='#f7e7e9';game.dom.ctx.fillRect(-32,-20,64,40);
      game.dom.ctx.save();
      game.dom.ctx.beginPath();game.dom.ctx.rect(-32,20-40*hpRatio,64,40*hpRatio);game.dom.ctx.clip();
      game.dom.ctx.fillStyle='#ef8ba6';game.dom.ctx.fillRect(-32,-20,64,40);
      game.dom.ctx.restore();
      game.dom.ctx.strokeRect(-32,-20,64,40);

      game.dom.ctx.fillStyle='#fff';game.dom.ctx.fillRect(-12,-5,7,7);game.dom.ctx.fillRect(5,-5,7,7);
      game.dom.ctx.fillStyle='#3b2630';game.dom.ctx.fillRect(-4,9,8,3);
    }else{
      game.dom.ctx.strokeStyle='#2a3135';game.dom.ctx.lineWidth=2.5;

      // Enemy body is now the health meter: its color drains from top to bottom.
      game.dom.ctx.fillStyle='rgba(255,255,255,.42)';
      game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.fill();

      game.dom.ctx.save();
      game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.clip();
      game.dom.ctx.fillStyle=e.color;
      game.dom.ctx.fillRect(-e.r,e.r-(2*e.r*hpRatio),e.r*2,2*e.r*hpRatio);
      game.dom.ctx.restore();

      game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r,0,Math.PI*2);game.dom.ctx.stroke();

      game.dom.ctx.fillStyle='#fff';
      game.dom.ctx.beginPath();game.dom.ctx.arc(-e.r*.25,-2,2,0,Math.PI*2);game.dom.ctx.arc(e.r*.25,-2,2,0,Math.PI*2);game.dom.ctx.fill();
      game.dom.ctx.strokeStyle='#222';game.dom.ctx.beginPath();game.dom.ctx.moveTo(-4,5);game.dom.ctx.lineTo(4,5);game.dom.ctx.stroke();
      if(e.type==='boss'){game.dom.ctx.fillStyle='#d8a72e';game.dom.ctx.fillRect(-11,-e.r-8,22,5)}
      if(e.type==='bouncer'){
        game.dom.ctx.strokeStyle='#e8fffb';game.dom.ctx.lineWidth=2;
        game.dom.ctx.beginPath();game.dom.ctx.arc(0,0,e.r+4,0,Math.PI*1.2);game.dom.ctx.stroke()
      }
      if(e.type==='flanker'){
        game.dom.ctx.strokeStyle='#dbe5ff';game.dom.ctx.lineWidth=2;
        game.dom.ctx.beginPath();game.dom.ctx.moveTo(-e.r-4,0);game.dom.ctx.lineTo(-e.r-9,-5);game.dom.ctx.moveTo(-e.r-4,0);game.dom.ctx.lineTo(-e.r-9,5);game.dom.ctx.stroke()
      }
    }
    game.dom.ctx.restore();
  }

  for(const p of game.state.projectiles){
    game.dom.ctx.fillStyle='#5f5a53';game.dom.ctx.beginPath();game.dom.ctx.arc(p.x,p.y,4,0,Math.PI*2);game.dom.ctx.fill()
  }
  for(const p of game.state.particles){
    game.dom.ctx.globalAlpha=game.api.clamp(p.life*1.8,0,1);game.dom.ctx.fillStyle=p.color;game.dom.ctx.fillRect(p.x,p.y,3,3);game.dom.ctx.globalAlpha=1
  }
  for(const f of game.state.floaters){
    game.dom.ctx.globalAlpha=game.api.clamp(f.t*2,0,1);game.dom.ctx.fillStyle=f.color;game.dom.ctx.font='bold 13px system-ui';
    game.dom.ctx.textAlign='center';game.dom.ctx.fillText(f.text,f.x,f.y);game.dom.ctx.globalAlpha=1
  }
  if(game.state.paused){
    game.dom.ctx.fillStyle='rgba(20,25,28,.38)';game.dom.ctx.fillRect(0,0,game.state.W,game.state.H);
    game.dom.ctx.fillStyle='#fff';game.dom.ctx.textAlign='center';game.dom.ctx.font='900 38px system-ui';game.dom.ctx.fillText('PAUSED',game.state.W/2,game.state.H/2)
  }
}
const api = { resize, draw };
Object.assign(game.api, api);
return api;
};
