const game = document.getElementById('game');
const camera = document.getElementById('camera');
const floor = document.querySelector('.floor');
const walls = document.querySelector('.walls');
const corridor = document.querySelector('.corridor');
const enemyLayer = document.getElementById('enemyLayer');
const forkLayer = document.getElementById('forkLayer');
const sword = document.getElementById('sword');
const swipeHint = document.getElementById('swipeHint');
const forkPrompt = document.getElementById('forkPrompt');
const forkLeft = document.getElementById('forkLeft');
const forkRight = document.getElementById('forkRight');

const characterBtn = document.getElementById('characterBtn');
const inventoryBtn = document.getElementById('inventoryBtn');
const characterMenu = document.getElementById('characterMenu');
const inventoryMenu = document.getElementById('inventoryMenu');
const closeButtons = document.querySelectorAll('[data-close]');

const state = {
  running: true,
  level: 1,
  segments: [],
  index: 0,
  turningChoice: null,
  isStepping: false,
  travelPulse: 0,
  enemies: [],
  pointerStart: null,
  lastTime: performance.now(),
  bobTime: 0,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function openMenu(menuEl) {
  state.running = false;
  menuEl.classList.add('open');
  menuEl.setAttribute('aria-hidden', 'false');
}

function closeMenus() {
  state.running = true;
  [characterMenu, inventoryMenu].forEach((menu) => {
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
  });
}

characterBtn.addEventListener('click', () => openMenu(characterMenu));
inventoryBtn.addEventListener('click', () => openMenu(inventoryMenu));
closeButtons.forEach((btn) => btn.addEventListener('click', closeMenus));

[characterMenu, inventoryMenu].forEach((menu) => {
  menu.addEventListener('click', (event) => {
    if (event.target === menu) {
      closeMenus();
    }
  });
});

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randomSegmentType(i, total) {
  if (i === total - 1) return 'exit';
  if (i < 2) return 'straight';
  const roll = Math.random();
  if (roll < 0.14) return 'left';
  if (roll < 0.28) return 'right';
  if (roll < 0.48) return 'intersection';
  return 'straight';
}

function spawnEnemyForSegment(segmentIndex) {
  if (Math.random() > 0.56 || state.segments[segmentIndex].type === 'exit') {
    return;
  }

  const enemy = document.createElement('button');
  enemy.className = 'enemy';
  enemy.type = 'button';
  enemy.innerHTML = `
    <span class="head"></span>
    <span class="body"></span>
    <span class="arm left"></span>
    <span class="arm right"></span>
    <span class="leg left"></span>
    <span class="leg right"></span>
  `;

  const unit = {
    el: enemy,
    hp: 2 + Math.floor(state.level / 2),
    segmentIndex,
    lane: rand(-12, 12),
    depth: 0.9,
  };

  enemy.style.left = `${50 + unit.lane}%`;
  enemy.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    attackEnemy(unit);
  });

  enemyLayer.appendChild(enemy);
  state.enemies.push(unit);
}

function generateDungeon() {
  const length = 13 + Math.floor(Math.random() * 8) + Math.floor(state.level / 2);
  state.segments = Array.from({ length }, (_, i) => ({
    type: randomSegmentType(i, length),
    texturePhase: Math.random() * 1000,
    light: rand(0.62, 0.95),
  }));
  state.index = 0;
  state.turningChoice = null;

  enemyLayer.innerHTML = '';
  state.enemies = [];
  for (let i = 1; i < state.segments.length; i += 1) {
    spawnEnemyForSegment(i);
  }

  swipeHint.textContent = `Level ${state.level}: swipe up to step forward`;
  applySegmentLook();
}

function attackEnemy(enemy) {
  if (!state.running || enemy.hp <= 0 || state.turningChoice) {
    return;
  }

  sword.classList.remove('swing');
  void sword.offsetWidth;
  sword.classList.add('swing');

  enemy.hp -= 1;
  enemy.el.classList.add('hurt');
  setTimeout(() => enemy.el.classList.remove('hurt'), 120);

  if (enemy.hp <= 0) {
    enemy.el.classList.add('dead');
    setTimeout(() => enemy.el.remove(), 220);
  }
}

function enemyBlockingCurrentPath() {
  return state.enemies.some((enemy) => enemy.hp > 0 && enemy.segmentIndex === state.index + 1);
}

function activeSegment() {
  return state.segments[state.index] || state.segments[state.segments.length - 1];
}

function setForkPrompt(visible) {
  if (visible) {
    forkPrompt.classList.add('active');
    forkPrompt.setAttribute('aria-hidden', 'false');
    forkLayer.classList.add('active');
    forkLayer.setAttribute('aria-hidden', 'false');
    swipeHint.textContent = 'Intersection: choose left or right';
  } else {
    forkPrompt.classList.remove('active');
    forkPrompt.setAttribute('aria-hidden', 'true');
    forkLayer.classList.remove('active');
    forkLayer.setAttribute('aria-hidden', 'true');
    swipeHint.textContent = `Level ${state.level}: swipe up to step forward`;
  }
}

function applySegmentLook() {
  const segment = activeSegment();
  const bend = segment.type === 'left' ? 18 : segment.type === 'right' ? -18 : 0;
  corridor.style.transform = `translateX(${bend}px)`;

  const phase = segment.texturePhase;
  floor.style.backgroundPosition = `0 ${phase}px, 0 ${phase * 0.45}px, 0 ${phase * 0.82}px`;
  walls.style.backgroundPosition = `0 ${phase * 0.34}px, 0 ${phase * 0.13}px`;

  walls.style.filter = `brightness(${segment.light * 0.76}) contrast(1.15)`;
  floor.style.filter = `brightness(${segment.light * 0.85}) contrast(1.1)`;

  if (segment.type === 'intersection') {
    state.turningChoice = true;
    setForkPrompt(true);
  } else {
    state.turningChoice = false;
    setForkPrompt(false);
  }

  if (segment.type === 'exit') {
    swipeHint.textContent = 'Ancient stairs descend. Swipe up to enter lower level';
  }
}

function stepForward() {
  if (!state.running || state.isStepping || state.turningChoice) {
    return;
  }

  if (enemyBlockingCurrentPath()) {
    swipeHint.textContent = 'Enemy blocks the path. Tap the enemy.';
    return;
  }

  state.isStepping = true;

  camera.animate(
    [
      { transform: 'translate(0px, 0px) scale(1)' },
      { transform: 'translate(0px, 10px) scale(1.02)' },
      { transform: 'translate(0px, 0px) scale(1)' },
    ],
    { duration: 260, easing: 'ease-out' }
  );

  setTimeout(() => {
    const segment = activeSegment();
    if (segment.type === 'exit') {
      state.level += 1;
      generateDungeon();
      swipeHint.textContent = `You descend to level ${state.level}. Swipe up to continue.`;
      state.isStepping = false;
      return;
    }

    state.index = clamp(state.index + 1, 0, state.segments.length - 1);
    applySegmentLook();
    state.isStepping = false;
  }, 220);
}

function chooseTurn(direction) {
  if (!state.turningChoice) {
    return;
  }

  const nudge = direction === 'left' ? -1 : 1;
  const current = activeSegment();
  current.type = direction;
  current.texturePhase += 35 * nudge;

  corridor.animate(
    [
      { transform: 'translateX(0px)' },
      { transform: `translateX(${direction === 'left' ? 22 : -22}px)` },
      { transform: 'translateX(0px)' },
    ],
    { duration: 420, easing: 'ease-in-out' }
  );

  state.turningChoice = false;
  setForkPrompt(false);
  stepForward();
}

forkLeft.addEventListener('click', () => chooseTurn('left'));
forkRight.addEventListener('click', () => chooseTurn('right'));

function updateEnemyVisibility() {
  state.enemies.forEach((enemy) => {
    if (enemy.hp <= 0) return;

    const distance = enemy.segmentIndex - state.index;
    if (distance <= 0 || distance > 2) {
      enemy.el.style.setProperty('--enemy-opacity', '0');
      return;
    }

    const appear = distance === 1 ? 0.92 : 0.36;
    const scale = distance === 1 ? 1.24 : 0.56;
    enemy.el.style.setProperty('--enemy-scale', `${scale}`);
    enemy.el.style.setProperty('--enemy-opacity', `${appear}`);
  });
}

function updateAmbientMotion(dt) {
  state.bobTime += dt * 0.9;
  const bobY = Math.sin(state.bobTime * 4.4) * 0.9;
  const swayX = Math.sin(state.bobTime * 2.2) * 0.9;
  const tilt = Math.sin(state.bobTime * 1.5) * 0.3;
  camera.style.transform = `translate(${swayX}px, ${bobY}px) rotate(${tilt}deg)`;
}

function gameLoop(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  if (state.running) {
    updateAmbientMotion(dt);
    updateEnemyVisibility();
  }

  requestAnimationFrame(gameLoop);
}

function onPointerDown(event) {
  state.pointerStart = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event) {
  if (!state.pointerStart || !state.running) {
    state.pointerStart = null;
    return;
  }

  const deltaY = state.pointerStart.y - event.clientY;
  if (deltaY > 34) {
    stepForward();
  }

  state.pointerStart = null;
}

game.addEventListener('pointerdown', onPointerDown);
game.addEventListener('pointerup', onPointerUp);
game.addEventListener('pointercancel', () => {
  state.pointerStart = null;
});

generateDungeon();
requestAnimationFrame((time) => {
  state.lastTime = time;
  requestAnimationFrame(gameLoop);
});
