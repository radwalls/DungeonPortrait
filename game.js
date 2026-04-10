const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const characterBtn = document.getElementById('characterBtn');
const inventoryBtn = document.getElementById('inventoryBtn');
const characterMenu = document.getElementById('characterMenu');
const inventoryMenu = document.getElementById('inventoryMenu');
const closeButtons = document.querySelectorAll('.close-btn');

const state = {
  paused: false,
  depth: 0,
  baseSpeed: 0.065,
  burstSpeed: 0,
  bobTime: 0,
  swordSwing: 0,
  swordRecover: 0,
  pulse: 0,
  enemies: [],
  nextEnemyAt: 18,
  touchStartY: null,
  touchStartX: null,
  portraitWarning: false,
};

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.portraitWarning = rect.height < rect.width;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function openMenu(menu) {
  state.paused = true;
  menu.classList.remove('hidden');
  menu.setAttribute('aria-hidden', 'false');
}

function closeMenu(menu) {
  menu.classList.add('hidden');
  menu.setAttribute('aria-hidden', 'true');
  state.paused = false;
}

characterBtn.addEventListener('click', () => openMenu(characterMenu));
inventoryBtn.addEventListener('click', () => openMenu(inventoryMenu));

closeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-close');
    closeMenu(document.getElementById(id));
  });
});

function spawnEnemy() {
  state.enemies.push({
    z: 1,
    x: Math.random() * 0.32 - 0.16,
    hp: 2,
    hitFlash: 0,
    emerge: 0,
    stagger: 0,
  });
  state.nextEnemyAt = state.depth + (14 + Math.random() * 12);
}

function triggerSwing() {
  if (state.swordRecover <= 0) {
    state.swordSwing = 1;
    state.swordRecover = 0.23;
  }
}

function tryHitEnemy(screenX, screenY) {
  const enemy = state.enemies.find((e) => {
    const projection = projectEnemy(e);
    if (!projection) return false;
    const { x, y, w, h } = projection;
    return screenX > x - w / 2 && screenX < x + w / 2 && screenY > y - h && screenY < y;
  });

  if (!enemy) return;

  triggerSwing();
  enemy.hp -= 1;
  enemy.hitFlash = 1;
  enemy.stagger = 0.14;
  enemy.z += 0.16;

  if (enemy.hp <= 0) {
    enemy.dead = true;
  }
}

function projectEnemy(enemy) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (enemy.z <= 0.15 || enemy.z > 1.1) return null;
  const scale = 1.25 - enemy.z;
  const px = w * 0.5 + enemy.x * w * scale;
  const py = h * (0.8 - (1 - enemy.z) * 0.5);
  const ew = w * (0.12 + (1 - enemy.z) * 0.16);
  const eh = h * (0.2 + (1 - enemy.z) * 0.32);
  return { x: px, y: py, w: ew, h: eh };
}

canvas.addEventListener('pointerdown', (e) => {
  if (state.paused) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  tryHitEnemy(x, y);
});

canvas.addEventListener('touchstart', (e) => {
  if (state.paused || e.touches.length === 0) return;
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  state.touchStartY = t.clientY - rect.top;
  state.touchStartX = t.clientX - rect.left;
});

canvas.addEventListener('touchend', (e) => {
  if (state.paused || state.touchStartY === null) return;
  const t = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const endY = t.clientY - rect.top;
  const endX = t.clientX - rect.left;

  const dy = endY - state.touchStartY;
  const dx = endX - state.touchStartX;

  if (dy < -48 && Math.abs(dx) < 70) {
    state.burstSpeed = Math.min(state.burstSpeed + 0.26, 0.52);
  }

  state.touchStartY = null;
  state.touchStartX = null;
});

function drawEnvironment(t) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#08080b');
  grad.addColorStop(0.58, '#0b0b11');
  grad.addColorStop(1, '#050508');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const bob = Math.sin(state.bobTime * 7.5) * 4;
  const sway = Math.sin(state.bobTime * 3.2) * 6;

  const vanX = w * 0.5 + sway;
  const vanY = h * 0.25 + bob;

  for (let i = 18; i >= 1; i -= 1) {
    const d = i / 18;
    const corridorW = w * (0.94 - d * 0.76);
    const y = vanY + (h - vanY) * d;

    const left = vanX - corridorW / 2;
    const right = vanX + corridorW / 2;

    const tone = 13 + i * 2;
    ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone + 6})`;
    ctx.fillRect(left, y - h * 0.06, corridorW, h * 0.085);

    ctx.fillStyle = `rgba(0,0,0,${0.14 + d * 0.28})`;
    ctx.fillRect(0, y - h * 0.12, left + 4, h * 0.16);
    ctx.fillRect(right - 4, y - h * 0.12, w - right + 4, h * 0.16);

    if (i % 4 === 0) {
      const torchGlow = 0.6 + Math.sin(t * 0.007 + i) * 0.35;
      ctx.fillStyle = `rgba(230, 145, 40, ${0.07 * torchGlow})`;
      ctx.beginPath();
      ctx.arc(left + corridorW * 0.18, y - h * 0.08, 30 * (1 - d), 0, Math.PI * 2);
      ctx.arc(right - corridorW * 0.18, y - h * 0.08, 30 * (1 - d), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawEnemies() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  state.enemies.forEach((enemy) => {
    const p = projectEnemy(enemy);
    if (!p) return;

    const visibility = Math.min(1, Math.max(0, (0.95 - enemy.z) * 2.4 + enemy.emerge));
    const shift = Math.sin(state.pulse * 0.02 + enemy.z * 12) * 2;

    ctx.save();
    ctx.translate(p.x + shift, p.y);

    ctx.fillStyle = `rgba(12, 14, 18, ${0.92 * visibility})`;
    ctx.beginPath();
    ctx.ellipse(0, -p.h * 0.55, p.w * 0.18, p.h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-p.w * 0.28, 0);
    ctx.lineTo(-p.w * 0.17, -p.h * 0.64);
    ctx.lineTo(p.w * 0.17, -p.h * 0.64);
    ctx.lineTo(p.w * 0.28, 0);
    ctx.closePath();
    ctx.fill();

    if (enemy.hitFlash > 0) {
      ctx.fillStyle = `rgba(240, 70, 45, ${enemy.hitFlash * 0.65})`;
      ctx.fillRect(-p.w * 0.35, -p.h * 0.72, p.w * 0.7, p.h * 0.8);
    }

    ctx.restore();

    ctx.fillStyle = `rgba(0,0,0,${0.35 * visibility})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + p.h * 0.04, p.w * 0.45, p.h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.z < 0.28) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(w * 0.28, h * 0.7, w * 0.44, h * 0.3);
    }
  });
}

function drawSword() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  const swing = state.swordSwing;
  const angle = -0.35 + Math.sin(swing * Math.PI) * 1.05;
  const bobY = Math.sin(state.bobTime * 7.5) * 4;
  const baseX = w * 0.6 + Math.sin(state.bobTime * 4.6) * 6;
  const baseY = h * 0.88 + bobY;

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(angle);

  ctx.fillStyle = '#3e3021';
  ctx.fillRect(-14, 0, 28, 54);

  ctx.fillStyle = '#706050';
  ctx.fillRect(-44, -8, 88, 14);

  const blade = ctx.createLinearGradient(0, -250, 0, -20);
  blade.addColorStop(0, '#c4ccd7');
  blade.addColorStop(1, '#717a86');
  ctx.fillStyle = blade;

  ctx.beginPath();
  ctx.moveTo(-12, -20);
  ctx.lineTo(-8, -260);
  ctx.lineTo(0, -286);
  ctx.lineTo(8, -260);
  ctx.lineTo(12, -20);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -278);
  ctx.lineTo(0, -26);
  ctx.stroke();

  ctx.restore();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;

  if (!state.paused) {
    const speed = state.baseSpeed + state.burstSpeed;
    state.depth += speed * dt * 10;
    state.bobTime += speed * dt * 2.7;
    state.burstSpeed = Math.max(0, state.burstSpeed - dt * 0.9);

    if (state.depth >= state.nextEnemyAt) {
      spawnEnemy();
    }

    state.enemies.forEach((enemy) => {
      enemy.z -= speed * dt * 0.22;
      enemy.emerge = Math.min(1, enemy.emerge + dt * 0.8);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 4.2);
      enemy.stagger = Math.max(0, enemy.stagger - dt * 1.8);
    });

    state.enemies = state.enemies.filter((enemy) => !enemy.dead && enemy.z > 0.09);

    state.swordRecover = Math.max(0, state.swordRecover - dt);
    if (state.swordSwing > 0) {
      state.swordSwing = Math.max(0, state.swordSwing - dt * 4.3);
    }
    state.pulse += dt * 1000;
  }

  drawEnvironment(now);
  drawEnemies();
  drawSword();

  if (state.portraitWarning) {
    ctx.fillStyle = 'rgba(0,0,0,0.56)';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = '#d9d2c6';
    ctx.font = '600 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Rotate device to portrait mode', canvas.clientWidth / 2, canvas.clientHeight / 2);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
