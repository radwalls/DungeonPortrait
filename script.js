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
  manualStop: false,
  blockedByFork: false,
  baseSpeed: 0.24,
  burstSpeed: 0,
  travel: 0,
  nextForkAt: 16,
  routeBias: 0,
  routeName: 'center',
  enemies: [],
  spawnClock: 0,
  spawnInterval: 2500,
  lastTime: performance.now(),
  bobTime: 0,
  pointerStartY: null,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function currentSpeed() {
  if (state.manualStop || state.blockedByFork) {
    return 0;
  }
  return state.baseSpeed + state.burstSpeed;
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
    if (event.target === menu) {
      closeMenus();
    }
  });
});

function createHumanoidParts(enemy) {
  enemy.innerHTML = `
    <span class="head"></span>
    <span class="body"></span>
    <span class="arm left"></span>
    <span class="arm right"></span>
    <span class="leg left"></span>
    <span class="leg right"></span>
  `;
}

function spawnEnemy() {
  const enemy = document.createElement('button');
  enemy.className = 'enemy';
  enemy.type = 'button';
  enemy.setAttribute('aria-label', 'Humanoid dungeon enemy');

  createHumanoidParts(enemy);

  const sideOffset = (Math.random() - 0.5) * 16 + state.routeBias;
  const lane = clamp(sideOffset, -18, 18);

  const unit = {
    el: enemy,
    lane,
    depth: 1.2,
    hp: 3,
    entered: false,
  };

  enemy.style.left = `${50 + lane}%`;

  enemy.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    attackEnemy(unit);
  });

  enemyLayer.appendChild(enemy);
  state.enemies.push(unit);
}

function attackEnemy(enemy) {
  if (!state.running || enemy.hp <= 0) {
    return;
  }

  sword.classList.remove('swing');
  void sword.offsetWidth;
  sword.classList.add('swing');

  enemy.hp -= 1;
  enemy.el.classList.add('hurt');
  setTimeout(() => enemy.el.classList.remove('hurt'), 110);

  if (enemy.hp <= 0) {
    enemy.el.classList.add('dead');
    setTimeout(() => enemy.el.remove(), 220);
  }
}

function showForkChoice() {
  state.blockedByFork = true;
  state.burstSpeed = 0;
  forkPrompt.classList.add('active');
  forkPrompt.setAttribute('aria-hidden', 'false');
  forkLayer.classList.add('active');
  forkLayer.setAttribute('aria-hidden', 'false');
  swipeHint.textContent = 'Fork ahead: choose a route';
}

function chooseRoute(direction) {
  state.blockedByFork = false;
  state.manualStop = false;
  state.routeName = direction;
  state.routeBias = direction === 'left' ? -5 : 5;
  state.nextForkAt = state.travel + 15 + Math.random() * 10;

  corridor.animate(
    [
      { transform: 'translateX(0px)' },
      { transform: `translateX(${direction === 'left' ? 20 : -20}px)` },
      { transform: 'translateX(0px)' },
    ],
    { duration: 480, easing: 'ease-in-out' }
  );

  forkPrompt.classList.remove('active');
  forkPrompt.setAttribute('aria-hidden', 'true');
  forkLayer.classList.remove('active');
  forkLayer.setAttribute('aria-hidden', 'true');
  swipeHint.textContent = `Path: ${direction}. Swipe up surge • swipe down halt`;
}

forkLeft.addEventListener('click', () => chooseRoute('left'));
forkRight.addEventListener('click', () => chooseRoute('right'));

function updateEnemies(dt) {
  const speed = currentSpeed();

  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.hp <= 0) {
      return false;
    }

    enemy.depth -= dt * Math.max(0.1, speed) * 0.12;

    const appear = clamp(1.25 - enemy.depth, 0, 1);
    const scale = clamp(0.32 + appear * 1.1, 0.32, 1.75);
    const opacity = clamp(appear * 1.45, 0, 1);

    enemy.el.style.setProperty('--enemy-scale', scale.toFixed(3));
    enemy.el.style.setProperty('--enemy-opacity', opacity.toFixed(3));

    if (!enemy.entered && appear > 0.35) {
      enemy.entered = true;
      enemy.el.animate(
        [
          { transform: `translateX(-50%) scale(${scale * 0.84}) translateY(14%)` },
          { transform: `translateX(-50%) scale(${scale}) translateY(0)` },
        ],
        { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
    }

    if (enemy.depth <= 0.14) {
      enemy.el.classList.add('hurt');
      enemy.depth = 0.16;
      state.manualStop = true;
      swipeHint.textContent = 'Enemy blocks the tunnel. Tap to strike.';
    }

    return true;
  });

  if (!state.enemies.length && !state.blockedByFork && state.manualStop) {
    state.manualStop = false;
    swipeHint.textContent = `Path: ${state.routeName}. Swipe up surge • swipe down halt`;
  }
}

function updateEnvironment(dt) {
  const speed = currentSpeed();
  state.travel += dt * speed;

  const floorShift = (state.travel * 150) % 1000;
  floor.style.backgroundPosition = `0 ${floorShift}px, 0 ${floorShift * 0.45}px, 0 ${floorShift * 0.8}px`;

  const wallShift = (state.travel * 30) % 220;
  walls.style.backgroundPosition = `0 ${wallShift}px, 0 ${wallShift * 0.34}px`;

  state.bobTime += dt * (0.84 + speed * 1.6);
  const bobY = Math.sin(state.bobTime * 7.4) * (1.4 + speed * 1.3);
  const swayX = Math.sin(state.bobTime * 3.6) * 1.7;
  const tilt = Math.sin(state.bobTime * 2.2) * 0.8;
  camera.style.transform = `translate(${swayX}px, ${bobY}px) rotate(${tilt}deg)`;

  if (state.burstSpeed > 0) {
    state.burstSpeed = Math.max(0, state.burstSpeed - dt * 0.55);
  }
}

function maybeSpawnFork() {
  if (!state.blockedByFork && state.travel >= state.nextForkAt) {
    showForkChoice();
  }
}

function gameLoop(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  if (state.running) {
    state.spawnClock += dt * 1000;

    if (!state.blockedByFork && state.spawnClock >= state.spawnInterval && state.enemies.length < 2) {
      state.spawnClock = 0;
      spawnEnemy();
      state.spawnInterval = 1900 + Math.random() * 1400;
    }

    maybeSpawnFork();
    updateEnvironment(dt);
    updateEnemies(dt);
  }

  requestAnimationFrame(gameLoop);
}

function setStopped(stopped) {
  state.manualStop = stopped;
  if (stopped) {
    state.burstSpeed = 0;
    swipeHint.textContent = 'You hold your ground. Swipe up to walk again.';
  } else {
    swipeHint.textContent = `Path: ${state.routeName}. Swipe up surge • swipe down halt`;
  }
}

function triggerForwardBurst() {
  if (!state.running || state.blockedByFork) {
    return;
  }

  if (state.manualStop) {
    setStopped(false);
  }

  state.burstSpeed = Math.min(0.85, state.burstSpeed + 0.5);
  swipeHint.style.opacity = '0.18';
  clearTimeout(triggerForwardBurst.hintTimer);
  triggerForwardBurst.hintTimer = setTimeout(() => {
    swipeHint.style.opacity = '';
  }, 580);
}

function onPointerDown(event) {
  state.pointerStartY = event.clientY;
}

function onPointerUp(event) {
  if (state.pointerStartY == null || !state.running || state.blockedByFork) {
    state.pointerStartY = null;
    return;
  }

  const deltaY = state.pointerStartY - event.clientY;
  if (deltaY > 36) {
    triggerForwardBurst();
  } else if (deltaY < -36) {
    setStopped(true);
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
