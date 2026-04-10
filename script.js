const game = document.getElementById('game');
const camera = document.getElementById('camera');
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

const state = {
  running: true,
  baseSpeed: 0.25,
  burstSpeed: 0,
  travel: 0,
  enemies: [],
  spawnClock: 0,
  spawnInterval: 2600,
  lastTime: performance.now(),
  bobTime: 0,
  pointerStartY: null,
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

function spawnEnemy() {
  const enemy = document.createElement('button');
  enemy.className = 'enemy';
  enemy.type = 'button';
  enemy.setAttribute('aria-label', 'Dungeon enemy');

  const sideOffset = (Math.random() - 0.5) * 22;
  const lane = clamp(sideOffset, -18, 18);

  const unit = {
    el: enemy,
    lane,
    depth: 1.25,
    hp: 2,
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

function updateEnemies(dt) {
  const speed = state.baseSpeed + state.burstSpeed;

  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.hp <= 0) {
      return false;
    }

    enemy.depth -= dt * speed * 0.11;

    const appear = clamp(1.3 - enemy.depth, 0, 1);
    const scale = clamp(0.32 + appear * 1.06, 0.32, 1.6);
    const opacity = clamp(appear * 1.4, 0, 1);

    enemy.el.style.setProperty('--enemy-scale', scale.toFixed(3));
    enemy.el.style.setProperty('--enemy-opacity', opacity.toFixed(3));

    if (!enemy.entered && appear > 0.4) {
      enemy.entered = true;
      enemy.el.animate(
        [
          { transform: `translateX(-50%) scale(${scale * 0.86}) translateY(12%)` },
          { transform: `translateX(-50%) scale(${scale}) translateY(0)` },
        ],
        { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
    }

    if (enemy.depth <= 0.14) {
      enemy.el.classList.add('hurt');
      enemy.el.style.filter = 'brightness(1.3) saturate(0.6)';
      enemy.depth = 0.18;
      state.burstSpeed = 0;
    }

    return true;
  });
}

function updateEnvironment(dt) {
  const speed = state.baseSpeed + state.burstSpeed;
  state.travel += dt * speed;

  const floorShift = (state.travel * 140) % 1000;
  floor.style.backgroundPosition = `0 ${floorShift}px, 0 ${floorShift * 0.4}px, 0 ${floorShift * 0.8}px`;

  const wallShift = (state.travel * 36) % 240;
  walls.style.backgroundPosition = `0 ${wallShift}px, 0 ${wallShift * 0.3}px`;

  state.bobTime += dt * (0.9 + speed * 1.6);
  const bobY = Math.sin(state.bobTime * 7.5) * (1.5 + speed * 1.2);
  const swayX = Math.sin(state.bobTime * 3.8) * 1.8;
  const tilt = Math.sin(state.bobTime * 2.4) * 0.7;
  camera.style.transform = `translate(${swayX}px, ${bobY}px) rotate(${tilt}deg)`;

  if (state.burstSpeed > 0) {
    state.burstSpeed = Math.max(0, state.burstSpeed - dt * 0.5);
  }
}

function gameLoop(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  if (state.running) {
    state.spawnClock += dt * 1000;
    if (state.spawnClock >= state.spawnInterval && state.enemies.length < 2) {
      state.spawnClock = 0;
      spawnEnemy();
      state.spawnInterval = 1800 + Math.random() * 1600;
    }

    updateEnvironment(dt);
    updateEnemies(dt);
  }

  requestAnimationFrame(gameLoop);
}

function triggerForwardBurst() {
  if (!state.running) {
    return;
  }
  state.burstSpeed = Math.min(0.8, state.burstSpeed + 0.5);
  swipeHint.style.opacity = '0.15';
  clearTimeout(triggerForwardBurst.hintTimer);
  triggerForwardBurst.hintTimer = setTimeout(() => {
    swipeHint.style.opacity = '';
  }, 600);
}

function onPointerDown(event) {
  state.pointerStartY = event.clientY;
}

function onPointerUp(event) {
  if (state.pointerStartY == null) {
    return;
  }
  const deltaY = state.pointerStartY - event.clientY;
  if (deltaY > 36) {
    triggerForwardBurst();
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
