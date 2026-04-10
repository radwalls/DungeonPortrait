const game = document.getElementById('game');
const camera = document.getElementById('camera');
const floor = document.querySelector('.floor');
const walls = document.querySelector('.walls');
const tunnelArch = document.querySelector('.tunnel-arch');
const enemyLayer = document.getElementById('enemyLayer');
const sword = document.getElementById('sword');
const swipeHint = document.getElementById('swipeHint');
const forkPrompt = document.getElementById('forkPrompt');
const forkLeft = document.getElementById('forkLeft');
const forkRight = document.getElementById('forkRight');
const exitMarker = document.getElementById('exitMarker');

const characterBtn = document.getElementById('characterBtn');
const inventoryBtn = document.getElementById('inventoryBtn');
const characterMenu = document.getElementById('characterMenu');
const inventoryMenu = document.getElementById('inventoryMenu');
const closeButtons = document.querySelectorAll('[data-close]');

const state = {
  running: true,
  moving: false,
  burstSpeed: 0,
  travel: 0,
  tileTravel: 0,
  tileIndex: 0,
  tileSize: 1.1,
  routeBias: 0,
  dungeonTiles: [],
  level: 1,
  enemies: [],
  spawnClock: 0,
  spawnInterval: 2600,
  blockedByFork: false,
  pointerStartY: null,
  bobTime: 0,
  lastTime: performance.now(),
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function generateDungeon(level) {
  const length = 22 + level * 4;
  const tiles = [];

  for (let i = 0; i < length; i += 1) {
    const roll = Math.random();
    let type = 'hall';

    if (i > 3 && i < length - 3 && roll > 0.75) {
      type = 'fork';
    } else if (roll > 0.55) {
      type = 'turn';
    }

    tiles.push({
      type,
      style: Math.random() > 0.5 ? 'tight' : 'wide',
      torch: Math.random() > 0.45,
    });
  }

  tiles[length - 1] = { type: 'exit', style: 'tight', torch: true };
  return tiles;
}

function startNewLevel(level) {
  state.level = level;
  state.travel = 0;
  state.tileTravel = 0;
  state.tileIndex = 0;
  state.routeBias = 0;
  state.blockedByFork = false;
  state.moving = false;
  state.burstSpeed = 0;
  state.dungeonTiles = generateDungeon(level);
  state.spawnClock = 0;
  enemyLayer.innerHTML = '';
  state.enemies = [];
  forkPrompt.classList.remove('active');
  swipeHint.textContent = `Level ${level}: swipe up to advance`;
  renderTileMood();
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
  const tile = state.dungeonTiles[state.tileIndex];
  if (!tile || tile.type === 'exit' || state.blockedByFork) {
    return;
  }

  const enemy = document.createElement('button');
  enemy.className = 'enemy';
  enemy.type = 'button';
  enemy.setAttribute('aria-label', 'Humanoid dungeon enemy');
  createHumanoidParts(enemy);

  const sideOffset = (Math.random() - 0.5) * 18 + state.routeBias;
  const lane = clamp(sideOffset, -18, 18);

  const unit = {
    el: enemy,
    depth: 1.22,
    hp: 2 + Math.floor(state.level / 3),
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
  if (!state.running || enemy.hp <= 0) return;

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

function showFork() {
  state.blockedByFork = true;
  state.moving = false;
  state.burstSpeed = 0;
  forkPrompt.classList.add('active');
  forkPrompt.setAttribute('aria-hidden', 'false');
  swipeHint.textContent = 'Y-fork ahead. Choose a route.';
}

function chooseRoute(direction) {
  state.blockedByFork = false;
  state.moving = true;
  state.burstSpeed = 0.28;
  state.routeBias = direction === 'left' ? -5 : 5;

  forkPrompt.classList.remove('active');
  forkPrompt.setAttribute('aria-hidden', 'true');

  walls.animate(
    [
      { transform: 'translateX(0px)' },
      { transform: `translateX(${direction === 'left' ? 14 : -14}px)` },
      { transform: 'translateX(0px)' },
    ],
    { duration: 400, easing: 'ease-in-out' }
  );

  swipeHint.textContent = `Route ${direction}. Swipe down to stop.`;
}

forkLeft.addEventListener('click', () => chooseRoute('left'));
forkRight.addEventListener('click', () => chooseRoute('right'));

function renderTileMood() {
  const tile = state.dungeonTiles[state.tileIndex] || { type: 'hall', style: 'tight', torch: false };

  const wallNarrow = tile.style === 'tight' ? 'polygon(9% 0%, 91% 0%, 75% 100%, 25% 100%)' : 'polygon(5% 0%, 95% 0%, 79% 100%, 21% 100%)';
  walls.style.clipPath = wallNarrow;

  if (tile.type === 'turn') {
    const shift = Math.random() > 0.5 ? -8 : 8;
    walls.style.transform = `translateX(${shift}px)`;
  } else {
    walls.style.transform = 'translateX(0px)';
  }

  tunnelArch.style.opacity = tile.torch ? '0.98' : '0.9';
}

function triggerExit() {
  exitMarker.classList.add('active');
  state.moving = false;
  state.burstSpeed = 0;
  swipeHint.textContent = `Descending... entering level ${state.level + 1}`;

  setTimeout(() => {
    exitMarker.classList.remove('active');
    startNewLevel(state.level + 1);
  }, 1400);
}

function updateDungeonProgress(dt) {
  const movingSpeed = state.moving ? 0.34 : 0;
  const speed = movingSpeed + state.burstSpeed;

  if (speed <= 0) {
    if (state.bobTime > 0.001) state.bobTime *= 0.95;
    return;
  }

  state.travel += dt * speed;
  state.tileTravel += dt * speed;

  const floorShift = (state.travel * 170) % 1000;
  floor.style.backgroundPosition = `0 ${floorShift}px, 0 ${floorShift * 0.42}px, 0 ${floorShift * 0.7}px`;

  const wallShift = (state.travel * 36) % 280;
  walls.style.backgroundPosition = `0 ${wallShift}px, 0 ${wallShift * 0.35}px`;

  state.bobTime += dt * (0.95 + speed * 1.4);
  const bobY = Math.sin(state.bobTime * 7.2) * (1.3 + speed * 1.4);
  const swayX = Math.sin(state.bobTime * 3.5) * 1.7;
  const tilt = Math.sin(state.bobTime * 2.2) * 0.75;
  camera.style.transform = `translate(${swayX}px, ${bobY}px) rotate(${tilt}deg)`;

  if (state.burstSpeed > 0) {
    state.burstSpeed = Math.max(0, state.burstSpeed - dt * 0.6);
  }

  if (state.tileTravel >= state.tileSize) {
    state.tileTravel = 0;
    state.tileIndex += 1;

    const nextTile = state.dungeonTiles[state.tileIndex];
    if (!nextTile) return;

    renderTileMood();

    if (nextTile.type === 'fork') {
      showFork();
    } else if (nextTile.type === 'exit') {
      triggerExit();
    }
  }
}

function updateEnemies(dt) {
  const pace = state.moving ? 1 : 0.45;

  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.hp <= 0) return false;

    enemy.depth -= dt * pace * 0.11;

    const appear = clamp(1.3 - enemy.depth, 0, 1);
    const scale = clamp(0.32 + appear * 1.1, 0.32, 1.65);
    const opacity = clamp(appear * 1.4, 0, 1);
    enemy.el.style.setProperty('--enemy-scale', scale.toFixed(3));
    enemy.el.style.setProperty('--enemy-opacity', opacity.toFixed(3));

    if (enemy.depth <= 0.14) {
      state.moving = false;
      swipeHint.textContent = 'Enemy blocks your way. Tap to strike.';
      enemy.depth = 0.15;
    }

    return true;
  });
}

function gameLoop(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  if (state.running) {
    if (!state.blockedByFork) {
      state.spawnClock += dt * 1000;
      if (state.spawnClock >= state.spawnInterval && state.enemies.length < 2) {
        state.spawnClock = 0;
        spawnEnemy();
        state.spawnInterval = 2000 + Math.random() * 1600;
      }
    }

    updateDungeonProgress(dt);
    updateEnemies(dt);
  }

  requestAnimationFrame(gameLoop);
}

function stopMovement() {
  state.moving = false;
  state.burstSpeed = 0;
  swipeHint.textContent = `Level ${state.level}: stopped. Swipe up to move.`;
}

function stepForward() {
  if (!state.running || state.blockedByFork) return;

  state.moving = true;
  state.burstSpeed = Math.min(0.8, state.burstSpeed + 0.45);
  swipeHint.textContent = `Level ${state.level}: moving`;

  clearTimeout(stepForward.stopTimer);
  stepForward.stopTimer = setTimeout(() => {
    if (state.moving && !state.blockedByFork) {
      stopMovement();
    }
  }, 1500);
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
  if (deltaY > 34) {
    stepForward();
  } else if (deltaY < -34) {
    stopMovement();
  }

  state.pointerStartY = null;
}

game.addEventListener('pointerdown', onPointerDown);
game.addEventListener('pointerup', onPointerUp);
game.addEventListener('pointercancel', () => {
  state.pointerStartY = null;
});

startNewLevel(1);
requestAnimationFrame((time) => {
  state.lastTime = time;
  requestAnimationFrame(gameLoop);
});
