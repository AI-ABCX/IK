// plugins/snake.js
import { cmd } from '../command.js';
import { sendHtmlApp } from '../lib/mb.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const SNAKE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Snake</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html, body { width:100%; height:100%; background:#0f0f1e; overflow:hidden; font-family:-apple-system,sans-serif; color:#fff; user-select:none; }
  #wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:8px; }
  #hud { display:flex; justify-content:space-between; width:100%; max-width:340px; font-size:13px; margin-bottom:8px; opacity:.8; }
  #score { color:#4ade80; font-weight:700; }
  #canvas { background:#1a1a2e; border-radius:12px; box-shadow:0 0 30px rgba(74,222,128,.2); touch-action:none; }
  #controls { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:10px; width:200px; }
  .btn { background:#2a2a3e; border:1px solid #3a3a4e; color:#fff; padding:12px 0; border-radius:8px; font-size:18px; font-weight:700; cursor:pointer; }
  .btn:active { background:#4ade80; color:#0f0f1e; }
  .btn.blank { visibility:hidden; }
  #overlay { position:absolute; inset:0; background:rgba(15,15,30,.92); display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:12px; }
  #overlay h2 { font-size:22px; margin-bottom:8px; color:#4ade80; }
  #overlay p { font-size:13px; opacity:.7; margin-bottom:14px; }
  #overlay button { background:#4ade80; color:#0f0f1e; border:none; padding:10px 24px; border-radius:8px; font-weight:700; font-size:14px; cursor:pointer; }
</style>
</head>
<body>
<div id="wrap">
  <div id="hud">
    <span>🍎 <span id="score">0</span></span>
    <span>🏆 <span id="best">0</span></span>
  </div>
  <div style="position:relative;">
    <canvas id="canvas" width="320" height="320"></canvas>
    <div id="overlay">
      <h2>🐍 SNAKE</h2>
      <p>Swipe or use buttons</p>
      <button onclick="startGame()">START</button>
    </div>
  </div>
  <div id="controls">
    <div class="btn blank"></div>
    <div class="btn" onclick="setDir(0,-1)">▲</div>
    <div class="btn blank"></div>
    <div class="btn" onclick="setDir(-1,0)">◀</div>
    <div class="btn" onclick="setDir(0,1)">▼</div>
    <div class="btn" onclick="setDir(1,0)">▶</div>
  </div>
</div>
<script>
(function(){
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const size = 16;
  const cells = canvas.width / size;
  let snake, dir, nextDir, food, score, best, running, speed, timer;
  best = parseInt(localStorage.getItem('snake_best') || '0', 10);
  document.getElementById('best').textContent = best;

  function reset(){
    snake = [{x:8,y:8},{x:7,y:8},{x:6,y:8}];
    dir = {x:1,y:0};
    nextDir = {x:1,y:0};
    score = 0;
    speed = 140;
    document.getElementById('score').textContent = 0;
    placeFood();
    running = true;
    document.getElementById('overlay').style.display = 'none';
    clearInterval(timer);
    timer = setInterval(tick, speed);
  }

  function placeFood(){
    while(true){
      const f = { x: Math.floor(Math.random()*cells), y: Math.floor(Math.random()*cells) };
      if(!snake.some(s=>s.x===f.x&&s.y===f.y)){ food = f; return; }
    }
  }

  function setDir(x,y){
    if(!running) return;
    if(dir.x === -x && dir.y === -y) return;
    nextDir = {x,y};
  }
  window.setDir = setDir;

  function tick(){
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if(head.x < 0 || head.x >= cells || head.y < 0 || head.y >= cells) return gameOver();
    if(snake.some(s=>s.x===head.x&&s.y===head.y)) return gameOver();
    snake.unshift(head);
    if(head.x === food.x && head.y === food.y){
      score++;
      document.getElementById('score').textContent = score;
      if(score > best){ best = score; localStorage.setItem('snake_best', best); document.getElementById('best').textContent = best; }
      if(speed > 70){ speed -= 3; clearInterval(timer); timer = setInterval(tick, speed); }
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function draw(){
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.03)';
    for(let i=0;i<=cells;i++){
      ctx.beginPath(); ctx.moveTo(i*size,0); ctx.lineTo(i*size,canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*size); ctx.lineTo(canvas.width,i*size); ctx.stroke();
    }
    // food
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(food.x*size+size/2, food.y*size+size/2, size/2-2, 0, Math.PI*2);
    ctx.fill();
    // snake
    snake.forEach((s,i)=>{
      ctx.fillStyle = i===0 ? '#4ade80' : '#22c55e';
      ctx.beginPath();
      const r = 4;
      const x = s.x*size+1, y = s.y*size+1, w = size-2;
      ctx.roundRect(x,y,w,w,r);
      ctx.fill();
    });
  }

  function gameOver(){
    running = false;
    clearInterval(timer);
    const ov = document.getElementById('overlay');
    ov.style.display = 'flex';
    ov.innerHTML = '<h2>💀 GAME OVER</h2><p>Score: '+score+'</p><button onclick="startGame()">PLAY AGAIN</button>';
  }
  window.startGame = reset;

  // Swipe
  let sx=0, sy=0;
  canvas.addEventListener('touchstart', e => { sx=e.touches[0].clientX; sy=e.touches[0].clientY; });
  canvas.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if(Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if(Math.abs(dx) > Math.abs(dy)) setDir(dx>0?1:-1, 0);
    else setDir(0, dy>0?1:-1);
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if(e.key==='ArrowUp') setDir(0,-1);
    if(e.key==='ArrowDown') setDir(0,1);
    if(e.key==='ArrowLeft') setDir(-1,0);
    if(e.key==='ArrowRight') setDir(1,0);
  });

  // polyfill roundRect
  if(!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
      this.beginPath();
      this.moveTo(x+r,y);
      this.arcTo(x+w,y,x+w,y+h,r);
      this.arcTo(x+w,y+h,x,y+h,r);
      this.arcTo(x,y+h,x,y,r);
      this.arcTo(x,y,x+w,y,r);
      this.closePath();
      return this;
    };
  }

  draw();
})();
</script>
</body>
</html>`;

cmd({
    pattern: "snake",
    desc: "Play Snake game inside WhatsApp",
    category: "fun",
    react: "🐍",
    filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        await sendHtmlApp(conn, from, SNAKE_HTML, {
            title: '🐍 Snake',
            label: 'Play Snake',
            height: 480,
            trustedSources: [],
            id: 'snake_game',
            bypassDownload: false,
        });

    } catch (e) {
        console.error('Snake error:', e);
        reply(`❌ Snake game error: ${e.message}`);
    }
});
