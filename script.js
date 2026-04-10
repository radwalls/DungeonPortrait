const game = document.getElementById('game');
const camera = document.getElementById('camera');
const corridor = document.querySelector('.corridor');
const floor = document.querySelector('.floor');
const walls = document.querySelector('.walls');
const enemyLayer = document.getElementById('enemyLayer');
const sword = document.getElementById('sword');
const swipeHint = document.getElementById('swipeHint');

const characterBtn = document.getElementById('characterBtn');
const inventoryBtn = document.getElementById('inventoryBtn');
const characterMenu = document.getElementById('characterMenu');
const inventoryMenu = document.getElementById('inventoryMenu');
const closeButtons = document.querySelectorAll('[data-close]');

const forkChoice = document.getElementById('forkChoice');
const forkLeft = document.getElementById('forkLeft');
const forkRight = document.getElementById('forkRight');

const state = {
  running: true,
  isWalking: true,
  baseSpeed: 0.23,
  burstSpeed: 0,
  travel: 0,
  enemies: [],
  spawnClock: 0,
  spawnInterval: 2400,
  lastTime: performance.now(),
  bobTime: 0,
  pointerStartY: null,
  distanceToFork: 22,
  forkActive: false,
  turnBias: 0,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function openMenu(menuEl) {
  state.running = false;
  menuEl.classList.add('open');
  menuEl.setAttribute('aria-hidden', 'false');
}

function closeMenus() {
  [characterMenu, inventoryMenu].forEach((menu) => {
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
  });
  state.running = true;
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

function enemyMarkup() {
  return `
    <span class="enemy-shadow"></span>
    <span class="enemy-head"></span>
    <span class="enemy-eyes"></span>
    <span class="enemy-torso"></span>
    <span class="enemy-arm left"></span>
    <span class="enemy-arm right"></span>
    <span class="enemy-leg left"></span>
    <span class="enemy-leg right"></span>
  `;
}

function spawnEnemy() {
  if (state.forkActive) {
    return;
  }

  const enemy = document.createElement('button');
  enemy.className = 'enemy';
  enemy.type = 'button';
  enemy.setAttribute('aria-label', 'Humanoid dungeon enemy');
  enemy.innerHTML = enemyMarkup();

  const sideOffset = (Math.random() - 0.5) * 20;
  const lane = clamp(sideOffset + state.turnBias * 4, -20, 20);

  const unit = {
    el: enemy,
    depth: 1.28,
    hp: 2,
    entered: false,
    lane,
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
  setTimeout(() => enemy.el.classList.remove('hurt'), 120);

  if (enemy.hp <= 0) {
    enemy.el.classList.add('dead');
    setTimeout(() => enemy.el.remove(), 260);
  }
}

function setForkActive(enabled) {
  state.forkActive = enabled;
  forkChoice.classList.toggle('active', enabled);
  forkChoice.setAttribute('aria-hidden', enabled ? 'false' : 'true');
  if (enabled) {
    state.isWalking = false;
    state.burstSpeed = 0;
    swipeHint.textContent = 'Choose a path to continue';
  } else {
    swipeHint.textContent = 'Swipe up to surge / resume • Swipe down to halt';
  }
}

function chooseFork(direction) {
  if (!state.forkActive) {
    return;
  }
  setForkActive(false);
  state.turnBias = direction;
  state.isWalking = true;
  state.distanceToFork = 18 + Math.random() * 18;
  corridor.style.setProperty('--turn-shift', `${direction * 12}px`);
  setTimeout(() => {
    corridor.style.setProperty('--turn-shift', `${direction * 4}px`);
  }, 280);
}

forkLeft.addEventListener('click', () => chooseFork(-1));
forkRight.addEventListener('click', () => chooseFork(1));

function updateEnemies(dt, movementSpeed) {
  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.hp <= 0) {
      return false;
    }

    enemy.depth -= dt * movementSpeed * 0.12;

    const appear = clamp(1.3 - enemy.depth, 0, 1);
    const scale = clamp(0.28 + appear * 1.08, 0.28, 1.7);
    const opacity = clamp(appear * 1.45, 0, 1);

    enemy.el.style.setProperty('--enemy-scale', scale.toFixed(3));
    enemy.el.style.setProperty('--enemy-opacity', opacity.toFixed(3));

    if (!enemy.entered && appear > 0.35) {
      enemy.entered = true;
      enemy.el.animate(
        [
          { transform: `translateX(-50%) scale(${scale * 0.8}) translateY(14%)` },
          { transform: `translateX(-50%) scale(${scale}) translateY(0)` },
        ],
        { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
    }

    if (enemy.depth <= 0.16) {
      enemy.el.classList.add('hurt');
      enemy.depth = 0.2;
      state.burstSpeed = 0;
    }

    return true;
  });
}

function updateEnvironment(dt, movementSpeed) {
  state.travel += dt * movementSpeed;

  const floorShift = (state.travel * 160) % 1000;
  floor.style.backgroundPosition = `0 ${floorShift}px, 0 ${floorShift * 0.45}px, 0 ${floorShift * 0.82}px`;

  const wallShift = (state.travel * 44) % 250;
  walls.style.backgroundPosition = `0 ${wallShift}px, 0 ${wallShift * 0.4}px`;

  state.bobTime += dt * (0.8 + movementSpeed * 1.9);
  const bobY = Math.sin(state.bobTime * 7) * (1.3 + movementSpeed * 1.3);
  const swayX = Math.sin(state.bobTime * 3.5) * 1.8 + state.turnBias * 1.5;
  const tilt = Math.sin(state.bobTime * 2.1) * 0.9 + state.turnBias * 0.4;
  camera.style.transform = `translate(${swayX}px, ${bobY}px) rotate(${tilt}deg)`;

  if (state.burstSpeed > 0) {
    state.burstSpeed = Math.max(0, state.burstSpeed - dt * 0.52);
  }

  state.turnBias *= 0.994;
}

function updateForks(dt, movementSpeed) {
  if (state.forkActive || movementSpeed <= 0.01) {
    return;
  }

  state.distanceToFork -= dt * movementSpeed * 1.6;
  if (state.distanceToFork <= 0) {
    setForkActive(true);
  }
}

function gameLoop(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  if (state.running) {
    const movementSpeed = state.isWalking ? state.baseSpeed + state.burstSpeed : 0;

    if (state.isWalking) {
      state.spawnClock += dt * 1000;
      if (state.spawnClock >= state.spawnInterval && state.enemies.length < 3) {
        state.spawnClock = 0;
        spawnEnemy();
        state.spawnInterval = 1500 + Math.random() * 1500;
      }
    }

    updateForks(dt, movementSpeed);
    updateEnvironment(dt, movementSpeed);
    updateEnemies(dt, movementSpeed);
  }

  requestAnimationFrame(gameLoop);
}

function triggerForwardBurst() {
  if (!state.running || state.forkActive) {
    return;
  }

  state.isWalking = true;
  state.burstSpeed = Math.min(0.8, state.burstSpeed + 0.52);
  swipeHint.style.opacity = '0.14';
  clearTimeout(triggerForwardBurst.hintTimer);
  triggerForwardBurst.hintTimer = setTimeout(() => {
    swipeHint.style.opacity = '';
  }, 500);
}

function haltWalking() {
  if (!state.running || state.forkActive) {
    return;
  }
  state.isWalking = false;
  state.burstSpeed = 0;
}

function onPointerDown(event) {
  state.pointerStartY = event.clientY;
}

function onPointerUp(event) {
  if (state.pointerStartY == null) {
    return;
  }

  const deltaY = state.pointerStartY - event.clientY;
  if (deltaY > 34) {
    triggerForwardBurst();
  } else if (deltaY < -34) {
    haltWalking();
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
