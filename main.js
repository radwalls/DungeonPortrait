const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  width: 0,
  height: 0,
  paused: false,
  zOffset: 0,
  speed: 0.14,
  burst: 0,
  bob: 0,
  swordSwing: 0,
  time: 0,
  enemy: null,
  kills: 0,
  touchStart: null,
};

const corridor = {
  segmentDepth: 1.7,
  segments: 24,
  halfWidthNear: 0.9,
};

function resize() {
  const dpr = window.devicePixelRatio || 1;
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = Math.round(state.width * dpr);
  canvas.height = Math.round(state.height * dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function openMenu(id) {
  state.paused = true;
  document.getElementById(id).classList.add('open');
}

function closeMenu(id) {
  document.getElementById(id).classList.remove('open');
  state.paused = false;
}

document.getElementById('character-btn').addEventListener('click', () => openMenu('character-menu'));
document.getElementById('inventory-btn').addEventListener('click', () => openMenu('inventory-menu'));

document.querySelectorAll('.close-menu').forEach((button) => {
  button.addEventListener('click', () => closeMenu(button.dataset.close));
});

function project(x, y, z, camShiftY = 0) {
  const depth = Math.max(0.08, z);
  const f = Math.min(state.height, state.width) * 0.76;
  return {
    x: state.width * 0.5 + (x / depth) * f,
    y: state.height * 0.52 + ((y + camShiftY) / depth) * f,
  };
}

function maybeSpawnEnemy() {
  if (state.enemy || Math.random() > 0.014) return;
  state.enemy = {
    z: 8 + Math.random() * 6,
    lane: (Math.random() - 0.5) * 0.35,
    hitFlash: 0,
    hp: 2,
    emerging: 0,
  };
}

function update(dt) {
  state.time += dt;
  if (state.paused) return;

  maybeSpawnEnemy();
  const burstDecay = 0.95;
  state.burst *= burstDecay;
  const currentSpeed = state.speed + state.burst;
  state.zOffset += currentSpeed * dt * 7.4;
  state.bob += dt * (1.3 + currentSpeed * 1.1);

  if (state.swordSwing > 0) {
    state.swordSwing = Math.max(0, state.swordSwing - dt * 3.8);
  }

  if (state.enemy) {
    state.enemy.z -= currentSpeed * dt * 2.6;
    state.enemy.emerging = Math.min(1, state.enemy.emerging + dt * 0.8);
    state.enemy.hitFlash = Math.max(0, state.enemy.hitFlash - dt * 4);

    if (state.enemy.z < 0.95) {
      state.enemy.z = 0.95;
    }

    if (state.enemy.hp <= 0) {
      state.enemy = null;
      state.kills += 1;
    }
  }
}

function drawDungeon(camShiftY) {
  const flicker = (Math.sin(state.time * 5.8) + Math.sin(state.time * 9.6) * 0.5) * 0.5;
  const warm = 34 + flicker * 10;

  const grad = ctx.createLinearGradient(0, 0, 0, state.height);
  grad.addColorStop(0, '#030406');
  grad.addColorStop(0.35, '#080a0e');
  grad.addColorStop(1, '#020203');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, state.width, state.height);

  for (let i = corridor.segments; i >= 1; i--) {
    const zNear = i * corridor.segmentDepth - (state.zOffset % corridor.segmentDepth);
    const zFar = zNear + corridor.segmentDepth;

    const leftNear = project(-corridor.halfWidthNear, -0.7, zNear, camShiftY);
    const rightNear = project(corridor.halfWidthNear, -0.7, zNear, camShiftY);
    const leftFar = project(-corridor.halfWidthNear, -0.7, zFar, camShiftY);
    const rightFar = project(corridor.halfWidthNear, -0.7, zFar, camShiftY);

    const roofLeftNear = project(-corridor.halfWidthNear, 0.7, zNear, camShiftY);
    const roofRightNear = project(corridor.halfWidthNear, 0.7, zNear, camShiftY);
    const roofLeftFar = project(-corridor.halfWidthNear, 0.7, zFar, camShiftY);
    const roofRightFar = project(corridor.halfWidthNear, 0.7, zFar, camShiftY);

    const depthShade = Math.max(0, 80 - i * 2.3);
    const floorLight = Math.max(8, 20 - i * 0.5);

    ctx.fillStyle = `rgb(${floorLight + 12}, ${floorLight + 8}, ${floorLight + 6})`;
    ctx.beginPath();
    ctx.moveTo(leftNear.x, leftNear.y);
    ctx.lineTo(rightNear.x, rightNear.y);
    ctx.lineTo(rightFar.x, rightFar.y);
    ctx.lineTo(leftFar.x, leftFar.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgb(${depthShade}, ${depthShade * 0.7}, ${depthShade * 0.55})`;
    ctx.beginPath();
    ctx.moveTo(leftNear.x, roofLeftNear.y);
    ctx.lineTo(rightNear.x, roofRightNear.y);
    ctx.lineTo(rightFar.x, roofRightFar.y);
    ctx.lineTo(leftFar.x, roofLeftFar.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgb(${depthShade * 0.55}, ${depthShade * 0.45}, ${depthShade * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(leftNear.x, roofLeftNear.y);
    ctx.lineTo(leftNear.x, leftNear.y);
    ctx.lineTo(leftFar.x, leftFar.y);
    ctx.lineTo(leftFar.x, roofLeftFar.y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(rightNear.x, roofRightNear.y);
    ctx.lineTo(rightNear.x, rightNear.y);
    ctx.lineTo(rightFar.x, rightFar.y);
    ctx.lineTo(rightFar.x, roofRightFar.y);
    ctx.closePath();
    ctx.fill();

    if (i % 5 === 0) {
      const torchZ = zNear + corridor.segmentDepth * 0.4;
      const t = project(-0.88, 0.1, torchZ, camShiftY);
      const glow = ctx.createRadialGradient(t.x, t.y, 1, t.x, t.y, 30);
      glow.addColorStop(0, `rgba(${230 + warm}, ${140 + warm * 0.6}, 70, 0.62)`);
      glow.addColorStop(1, 'rgba(255, 100, 30, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const vignette = ctx.createRadialGradient(
    state.width * 0.5,
    state.height * 0.52,
    Math.min(state.width, state.height) * 0.15,
    state.width * 0.5,
    state.height * 0.52,
    Math.max(state.width, state.height) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, state.width, state.height);
}

function drawEnemy(camShiftY) {
  if (!state.enemy) return;
  const enemy = state.enemy;
  const p = project(enemy.lane, -0.18, enemy.z, camShiftY);
  const scale = Math.min(360, 190 / enemy.z);
  const appear = enemy.emerging;

  ctx.save();
  ctx.globalAlpha = 0.2 + appear * 0.8;

  const shadow = ctx.createRadialGradient(p.x, p.y + scale * 0.45, 2, p.x, p.y + scale * 0.45, scale * 0.9);
  shadow.addColorStop(0, 'rgba(0,0,0,0.8)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + scale * 0.45, scale * 0.33, scale * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = enemy.hitFlash > 0 ? '#8b1b1b' : '#22252a';
  ctx.fillRect(p.x - scale * 0.22, p.y - scale * 0.1, scale * 0.44, scale * 0.58);

  ctx.fillStyle = '#14161a';
  ctx.beginPath();
  ctx.arc(p.x, p.y - scale * 0.18, scale * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#cbc6b7';
  ctx.fillRect(p.x - scale * 0.07, p.y - scale * 0.21, scale * 0.05, scale * 0.02);
  ctx.fillRect(p.x + scale * 0.02, p.y - scale * 0.21, scale * 0.05, scale * 0.02);

  ctx.restore();

  state.enemy.screenRect = {
    x: p.x - scale * 0.25,
    y: p.y - scale * 0.32,
    w: scale * 0.5,
    h: scale * 0.92,
  };
}

function drawSword() {
  const sway = Math.sin(state.time * 2.3) * 8;
  const bobShift = Math.sin(state.bob * 1.6) * 8;
  const swing = state.swordSwing;
  const pivotX = state.width * 0.73 + sway;
  const pivotY = state.height * 0.9 + bobShift;
  const angle = -0.4 + Math.sin((1 - swing) * Math.PI) * 1.1;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angle);

  ctx.fillStyle = '#423325';
  ctx.fillRect(-22, -18, 54, 20);

  const blade = ctx.createLinearGradient(-5, -240, 24, 10);
  blade.addColorStop(0, '#f4ede1');
  blade.addColorStop(1, '#8f949a');
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(16, -228);
  ctx.lineTo(28, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(14, -206, 2, 175);

  ctx.restore();
}

function render() {
  const camShiftY = Math.sin(state.bob * 2.1) * 0.03;
  drawDungeon(camShiftY);
  drawEnemy(camShiftY);
  drawSword();
}

function triggerAttack() {
  state.swordSwing = 1;
}

function hitEnemy() {
  if (!state.enemy || !state.enemy.screenRect) return false;
  state.enemy.hp -= 1;
  state.enemy.hitFlash = 1;
  triggerAttack();
  return true;
}

function handleTap(x, y) {
  if (!state.enemy || !state.enemy.screenRect || state.paused) return;
  const r = state.enemy.screenRect;
  const inside = x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  if (inside) hitEnemy();
}

function onPointerDown(event) {
  const point = event.touches ? event.touches[0] : event;
  state.touchStart = { x: point.clientX, y: point.clientY, t: performance.now() };
}

function onPointerUp(event) {
  const point = event.changedTouches ? event.changedTouches[0] : event;
  if (!state.touchStart || state.paused) return;

  const dx = point.clientX - state.touchStart.x;
  const dy = point.clientY - state.touchStart.y;
  const dt = performance.now() - state.touchStart.t;

  const isSwipeUp = dy < -45 && Math.abs(dy) > Math.abs(dx) * 1.15 && dt < 500;
  const isTap = Math.hypot(dx, dy) < 20 && dt < 280;

  if (isSwipeUp) {
    state.burst = Math.min(0.22, state.burst + 0.12);
  } else if (isTap) {
    handleTap(point.clientX, point.clientY);
  }

  state.touchStart = null;
}

canvas.addEventListener('touchstart', onPointerDown, { passive: true });
canvas.addEventListener('touchend', onPointerUp);
canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mouseup', onPointerUp);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
