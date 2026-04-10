const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const characterBtn = document.getElementById("character-btn");
const inventoryBtn = document.getElementById("inventory-btn");
const menuScreen = document.getElementById("menu-screen");
const menuTitle = document.getElementById("menu-title");
const menuBody = document.getElementById("menu-body");
const closeMenuBtn = document.getElementById("close-menu");

let w = 360;
let h = 640;
let centerX = w / 2;
let centerY = h * 0.5;
let horizon = h * 0.38;

const world = {
  z: 0,
  baseSpeed: 0.72,
  boost: 0,
  paused: false,
};

const sword = {
  swing: 0,
  phase: 0,
};

const swipe = {
  active: false,
  startX: 0,
  startY: 0,
};

const enemyState = {
  enemies: [],
  spawnCooldown: 0,
  flash: 0,
};

function resize() {
  w = window.innerWidth;
  h = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  centerX = w * 0.5;
  centerY = h * 0.52;
  horizon = h * 0.36;
}
window.addEventListener("resize", resize);
resize();

function openMenu(kind) {
  world.paused = true;
  menuScreen.hidden = false;
  if (kind === "character") {
    menuTitle.textContent = "Character";
    menuBody.innerHTML = `
      <p>Class: Warden of the Depths</p>
      <ul>
        <li>Strength: 9</li>
        <li>Resolve: 7</li>
        <li>Agility: 6</li>
        <li>Insight: 5</li>
      </ul>
      <p>Notes: The corridor ahead reeks of wet stone and old ash.</p>
    `;
  } else {
    menuTitle.textContent = "Inventory";
    menuBody.innerHTML = `
      <ul>
        <li>Iron Longsword</li>
        <li>Oil Flask x2</li>
        <li>Tower Key Fragment</li>
        <li>Torch Ember</li>
      </ul>
      <p>Collected objects are kept here to avoid cluttering the dungeon view.</p>
    `;
  }
}

function closeMenu() {
  world.paused = false;
  menuScreen.hidden = true;
}

characterBtn.addEventListener("click", () => openMenu("character"));
inventoryBtn.addEventListener("click", () => openMenu("inventory"));
closeMenuBtn.addEventListener("click", closeMenu);

function spawnEnemy() {
  enemyState.enemies.push({
    lane: Math.random() * 0.5 - 0.25,
    z: world.z + 110 + Math.random() * 55,
    hp: 2,
    reveal: 0,
    hitPulse: 0,
    screen: null,
  });
}

function onPointerDown(e) {
  const p = e.touches?.[0] || e;
  swipe.active = true;
  swipe.startX = p.clientX;
  swipe.startY = p.clientY;
}

function triggerAttack() {
  sword.swing = 0.35;
  sword.phase = 0;
}

function tryHitEnemy(x, y) {
  for (const enemy of enemyState.enemies) {
    if (!enemy.screen) continue;
    const { ex, ey, ew, eh } = enemy.screen;
    if (x >= ex && x <= ex + ew && y >= ey && y <= ey + eh) {
      triggerAttack();
      enemy.hp -= 1;
      enemy.hitPulse = 0.35;
      enemyState.flash = 0.08;
      return true;
    }
  }
  return false;
}

function onPointerUp(e) {
  const p = e.changedTouches?.[0] || e;
  const dx = p.clientX - swipe.startX;
  const dy = p.clientY - swipe.startY;
  const distance = Math.hypot(dx, dy);

  if (distance < 16) {
    tryHitEnemy(p.clientX, p.clientY);
  } else if (dy < -45 && Math.abs(dx) < 90) {
    world.boost = Math.min(world.boost + 0.8, 1.5);
  }

  swipe.active = false;
}

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("touchstart", onPointerDown, { passive: true });
canvas.addEventListener("touchend", onPointerUp, { passive: true });

function project(lane, z) {
  const rel = z - world.z;
  const depth = Math.max(6, rel);
  const scale = 420 / depth;
  const x = centerX + lane * scale * 230;
  const y = horizon + 120 * scale;
  return { x, y, scale, rel };
}

function drawDungeon(time) {
  const bob = Math.sin(time * 0.0075) * 4;
  const sway = Math.sin(time * 0.0042) * 6;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0d0d11");
  sky.addColorStop(0.45, "#08080b");
  sky.addColorStop(1, "#030304");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(sway, bob);

  const floorGrad = ctx.createLinearGradient(centerX, horizon, centerX, h);
  floorGrad.addColorStop(0, "rgba(29, 26, 24, 0.85)");
  floorGrad.addColorStop(1, "rgba(5, 5, 6, 0.95)");
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.moveTo(centerX - w * 0.08, horizon);
  ctx.lineTo(centerX + w * 0.08, horizon);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  for (let i = 22; i >= 1; i--) {
    const z = world.z + i * 12;
    const near = project(-0.9, z);
    const far = project(-0.9, z + 12);
    const nearR = project(0.9, z);
    const farR = project(0.9, z + 12);

    const darkness = Math.max(0.1, Math.min(0.75, 1 - i / 22));
    ctx.fillStyle = `rgba(26, 23, 21, ${darkness})`;
    ctx.beginPath();
    ctx.moveTo(0, near.y - 90 * near.scale);
    ctx.lineTo(near.x, near.y - 90 * near.scale);
    ctx.lineTo(far.x, far.y - 90 * far.scale);
    ctx.lineTo(0, far.y - 90 * far.scale);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w, nearR.y - 90 * nearR.scale);
    ctx.lineTo(nearR.x, nearR.y - 90 * nearR.scale);
    ctx.lineTo(farR.x, farR.y - 90 * farR.scale);
    ctx.lineTo(w, farR.y - 90 * farR.scale);
    ctx.closePath();
    ctx.fill();

    if (i % 4 === 0) {
      const torch = project(i % 8 === 0 ? -0.74 : 0.74, z + 2.5);
      const glow = 35 * torch.scale;
      const torchGrad = ctx.createRadialGradient(torch.x, torch.y - 20 * torch.scale, 2, torch.x, torch.y, glow);
      torchGrad.addColorStop(0, "rgba(255, 181, 93, 0.8)");
      torchGrad.addColorStop(1, "rgba(255, 151, 55, 0)");
      ctx.fillStyle = torchGrad;
      ctx.beginPath();
      ctx.arc(torch.x, torch.y, glow, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  const vignette = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, Math.max(w, h) * 0.7);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawEnemy(enemy) {
  const p = project(enemy.lane, enemy.z);
  if (p.rel < 5 || p.rel > 170) {
    enemy.screen = null;
    return;
  }

  enemy.reveal = Math.min(1, enemy.reveal + 0.015);
  const alpha = Math.max(0, Math.min(1, (1 - p.rel / 140) * enemy.reveal));
  const bodyW = 80 * p.scale;
  const bodyH = 140 * p.scale;
  const x = p.x - bodyW * 0.5;
  const y = p.y - bodyH;

  enemy.screen = { ex: x, ey: y, ew: bodyW, eh: bodyH };

  ctx.save();
  ctx.globalAlpha = alpha;
  if (enemy.hitPulse > 0) {
    ctx.translate((Math.random() - 0.5) * 8, 0);
    ctx.fillStyle = "rgba(180, 44, 44, 0.8)";
  } else {
    ctx.fillStyle = "rgba(27, 34, 30, 0.93)";
  }

  ctx.fillRect(x, y + bodyH * 0.25, bodyW, bodyH * 0.75);
  ctx.beginPath();
  ctx.arc(p.x, y + bodyH * 0.18, bodyW * 0.23, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(236, 195, 120, 0.25)";
  ctx.fillRect(x + bodyW * 0.42, y + bodyH * 0.35, bodyW * 0.14, bodyH * 0.45);
  ctx.restore();
}

function drawSword(time) {
  const idleSwing = Math.sin(time * 0.0085) * 0.05;
  const totalSwing = sword.swing > 0 ? Math.sin(sword.phase * Math.PI) * 0.75 : 0;
  const angle = -0.35 + idleSwing - totalSwing;

  const handX = w * 0.77;
  const handY = h * 0.88;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle);

  ctx.fillStyle = "#2b1d13";
  ctx.fillRect(-26, 0, 52, 18);

  const bladeGrad = ctx.createLinearGradient(0, -150, 0, 10);
  bladeGrad.addColorStop(0, "#ccd2dc");
  bladeGrad.addColorStop(0.5, "#8e97a8");
  bladeGrad.addColorStop(1, "#4e5663");
  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-5, -145);
  ctx.lineTo(0, -162);
  ctx.lineTo(5, -145);
  ctx.lineTo(12, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.032, (now - last) / 1000);
  last = now;

  if (!world.paused) {
    const enemyBlocking = enemyState.enemies.some((e) => e.hp > 0 && e.z - world.z < 18);
    const speed = enemyBlocking ? 0 : world.baseSpeed + world.boost;
    world.z += speed * dt * 35;

    world.boost = Math.max(0, world.boost - dt * 1.4);
    sword.phase += dt * 5.5;
    sword.swing = Math.max(0, sword.swing - dt * 1.8);

    enemyState.spawnCooldown -= dt;
    if (enemyState.spawnCooldown <= 0) {
      spawnEnemy();
      enemyState.spawnCooldown = 3.8 + Math.random() * 2.4;
    }

    enemyState.enemies = enemyState.enemies.filter((e) => e.hp > 0 || e.z - world.z > 4);
    for (const e of enemyState.enemies) {
      if (e.hitPulse > 0) e.hitPulse -= dt;
    }

    enemyState.flash = Math.max(0, enemyState.flash - dt * 2.5);
  }

  drawDungeon(now);
  for (const enemy of enemyState.enemies) {
    drawEnemy(enemy);
  }
  drawSword(now);

  if (enemyState.flash > 0) {
    ctx.fillStyle = `rgba(255, 110, 80, ${enemyState.flash * 0.18})`;
    ctx.fillRect(0, 0, w, h);
  }

  requestAnimationFrame(tick);
}

spawnEnemy();
requestAnimationFrame(tick);
