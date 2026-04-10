const game = document.getElementById('game');
const camera = document.getElementById('camera');
const floor = document.querySelector('.floor');
const walls = document.querySelector('.walls');
const ribs = document.querySelector('.tunnel-ribs');
const enemyLayer = document.getElementById('enemyLayer');
const sword = document.getElementById('sword');
const swipeHint = document.getElementById('swipeHint');

const characterBtn = document.getElementById('characterBtn');
const inventoryBtn = document.getElementById('inventoryBtn');
const characterMenu = document.getElementById('characterMenu');
const inventoryMenu = document.getElementById('inventoryMenu');
const closeButtons = document.querySelectorAll('[data-close]');

const forkOverlay = document.getElementById('forkOverlay');
const forkLeft = document.getElementById('forkLeft');
const forkRight = document.getElementById('forkRight');

const state = {
  running: true,
  moving: true,
  baseSpeed: 0.24,
  burstSpeed: 0,
  travel: 0,
  enemies: [],
  spawnClock: 0,
  spawnInterval: 2200,
  forkClock: 0,
  nextForkInterval: 8000,
  inForkChoice: false,
  pathBias: 0,
  lastTime: performance.now(),
  bobTime: 0,
  pointerStartY: null,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function isPaused() {
  return !state.running || state.inForkChoice;
}

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
    if (event.target === menu) closeMenus();
  });
});

function buildHumanoid(enemy) {
  const body = document.createElement('div');
  body.className = 'humanoid';

  ['head', 'torso', 'arm left', 'arm right', 'leg left', 'leg right'].forEach((partClass) => {
    const part = document.createElement('div');
    part.className = partClass;
    body.appendChild(part);
  });

  enemy.appendChild(body);
}

function spawnEnemy() {
  const enemy = document.createElement('button');
  enemy.className = 'enemy';
  enemy.type = 'button';
  enemy.setAttribute('aria-label', 'Dungeon enemy');
  buildHumanoid(enemy);

  const lane = clamp((Math.random() - 0.5) * 22 + state.pathBias, -22, 22);
  const unit = { el: enemy, lane, depth: 1.22, hp: 2, entered: false };

  enemy.style.left = `${50 + lane}%`;
  enemy.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    attackEnemy(unit);
  });

  enemyLayer.appendChild(enemy);
  state.enemies.push(unit);
}

function attackEnemy(enemy) {
  if (isPaused() || enemy.hp <= 0) return;

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

function showForkChoice() {
  state.inForkChoice = true;
  state.moving = false;
  state.burstSpeed = 0;
  forkOverlay.classList.add('open');
  forkOverlay.setAttribute('aria-hidden', 'false');
  swipeHint.textContent = 'Choose a tunnel branch';
}

function chooseFork(direction) {
  if (!state.inForkChoice) return;

  state.pathBias = direction === 'left' ? -8 : 8;
  state.inForkChoice = false;
  state.moving = true;
  state.forkClock = 0;
  state.nextForkInterval = 7500 + Math.random() * 4000;

  forkOverlay.classList.remove('open');
  forkOverlay.setAttribute('aria-hidden', 'true');
  swipeHint.textContent = 'Swipe up: advance • Swipe down: stop';
}

forkLeft.addEventListener('click', () => chooseFork('left'));
forkRight.addEventListener('click', () => chooseFork('right'));

function updateEnemies(dt, speed) {
  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.hp <= 0) return false;

    enemy.depth -= dt * speed * 0.11;

    const appear = clamp(1.3 - enemy.depth, 0, 1);
    const scale = clamp(0.32 + appear * 1.08, 0.32, 1.62);
    const opacity = clamp(appear * 1.5, 0, 1);

    enemy.el.style.setProperty('--enemy-scale', scale.toFixed(3));
    enemy.el.style.setProperty('--enemy-opacity', opacity.toFixed(3));

    if (!enemy.entered && appear > 0.34) {
      enemy.entered = true;
      enemy.el.animate(
        [
          { transform: `translateX(-50%) scale(${scale * 0.82}) translateY(16%)` },
          { transform: `translateX(-50%) scale(${scale}) translateY(0)` },
        ],
        { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
    }

    if (enemy.depth <= 0.14) {
      enemy.el.classList.add('hurt');
      enemy.depth = 0.16;
      state.moving = false;
      swipeHint.textContent = 'Enemy blocks the tunnel — tap to strike';
    }

    return true;
  });
}

function updateEnvironment(dt, speed) {
  state.travel += dt * speed;

  const floorShift = (state.travel * 150) % 1000;
  floor.style.backgroundPosition = `0 ${floorShift}px, 0 ${floorShift * 0.4}px, 0 ${floorShift * 0.8}px`;

  const wallShift = (state.travel * 28) % 240;
  walls.style.backgroundPosition = `0 ${wallShift}px, 0 ${wallShift * 0.3}px`;

  const ribShift = (state.travel * 120) % 300;
  ribs.style.backgroundPosition = `0 ${ribShift}px`;

  state.bobTime += dt * (0.6 + speed * 1.5);
  const bobY = Math.sin(state.bobTime * 7.2) * (1.3 + speed * 1.1);
  const swayX = Math.sin(state.bobTime * 3.2) * (1.6 + Math.abs(state.pathBias) * 0.06);
  const tilt = Math.sin(state.bobTime * 2.1) * 0.8 + state.pathBias * 0.03;
  camera.style.transform = `translate(${swayX}px, ${bobY}px) rotate(${tilt}deg)`;

  state.pathBias *= 0.994;

  if (state.burstSpeed > 0) {
    state.burstSpeed = Math.max(0, state.burstSpeed - dt * 0.55);
  }
}

function gameLoop(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  if (!isPaused()) {
    const speed = state.moving ? state.baseSpeed + state.burstSpeed : 0;

    state.spawnClock += dt * 1000;
    if (state.spawnClock >= state.spawnInterval && state.enemies.length < 3) {
      state.spawnClock = 0;
      spawnEnemy();
      state.spawnInterval = 1700 + Math.random() * 1800;
    }

    state.forkClock += dt * 1000;
    if (state.forkClock >= state.nextForkInterval && state.enemies.length === 0) {
      showForkChoice();
    }

    updateEnvironment(dt, speed);
    updateEnemies(dt, speed);
  }

  requestAnimationFrame(gameLoop);
}

function triggerForwardBurst() {
  if (isPaused()) return;

  state.moving = true;
  state.burstSpeed = Math.min(0.8, state.burstSpeed + 0.48);
  swipeHint.textContent = 'Swipe up: advance • Swipe down: stop';
  swipeHint.style.opacity = '0.15';
  clearTimeout(triggerForwardBurst.hintTimer);
  triggerForwardBurst.hintTimer = setTimeout(() => {
    swipeHint.style.opacity = '';
  }, 550);
}

function stopWalking() {
  if (isPaused()) return;
  state.moving = false;
  state.burstSpeed = 0;
  swipeHint.textContent = 'Stopped — swipe up to move';
}

function onPointerDown(event) {
  state.pointerStartY = event.clientY;
}

function onPointerUp(event) {
  if (state.pointerStartY == null || isPaused()) return;

  const deltaY = state.pointerStartY - event.clientY;
  if (deltaY > 36) {
    triggerForwardBurst();
  } else if (deltaY < -36) {
    stopWalking();
  }

  state.pointerStartY = null;
}

game.addEventListener('pointerdown', onPointerDown);
game.addEventListener('pointerup', onPointerUp);
game.addEventListener('pointercancel', () => {
  state.pointerStartY = null;
});

requestAnimationFrame((time) => {
  state.lastTime = time;
  requestAnimationFrame(gameLoop);
});
