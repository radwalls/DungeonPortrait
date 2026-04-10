const game = document.getElementById('game');
const camera = document.getElementById('camera');
const floor = document.querySelector('.floor');
const walls = document.querySelector('.walls');
const arch = document.querySelector('.arch');
const enemyLayer = document.getElementById('enemyLayer');
const forkLayer = document.getElementById('forkLayer');
const sword = document.getElementById('sword');
const swipeHint = document.getElementById('swipeHint');

const characterBtn = document.getElementById('characterBtn');
const inventoryBtn = document.getElementById('inventoryBtn');
const characterMenu = document.getElementById('characterMenu');
const inventoryMenu = document.getElementById('inventoryMenu');
const closeButtons = document.querySelectorAll('[data-close]');

const state = {
  running: true,
  isWalking: true,
  baseSpeed: 0.24,
  burstSpeed: 0,
  travel: 0,
  pathOffset: 0,
  enemies: [],
  spawnClock: 0,
  spawnInterval: 2300,
  lastTime: performance.now(),
  bobTime: 0,
  pointerStartY: null,
  forkClock: 0,
  forkInterval: 6200,
  choosingFork: false,
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

function createHumanoid(enemy) {
  enemy.innerHTML = `
    <span class="head"></span>
    <span class="eyes"></span>
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
  enemy.setAttribute('aria-label', 'Dungeon enemy');
  createHumanoid(enemy);

  const sideOffset = (Math.random() - 0.5) * 24;
  const lane = clamp(sideOffset, -20, 20);

  const unit = {
    el: enemy,
    lane,
    depth: 1.24,
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
  if (!state.running || enemy.hp <= 0 || state.choosingFork) {
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

function updateEnemies(dt, speed) {
  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.hp <= 0) {
      return false;
    }

    enemy.depth -= dt * speed * 0.11;

    const appear = clamp(1.3 - enemy.depth, 0, 1);
    const scale = clamp(0.32 + appear * 1.08, 0.32, 1.7);
    const opacity = clamp(appear * 1.4, 0, 1);

    enemy.el.style.setProperty('--enemy-scale', scale.toFixed(3));
    enemy.el.style.setProperty('--enemy-opacity', opacity.toFixed(3));

    if (!enemy.entered && appear > 0.4) {
      enemy.entered = true;
      enemy.el.animate(
        [
          { transform: `translateX(-50%) scale(${scale * 0.85}) translateY(13%)` },
          { transform: `translateX(-50%) scale(${scale}) translateY(0)` },
        ],
        { duration: 340, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
    }

    if (enemy.depth <= 0.14) {
      enemy.el.classList.add('hurt');
      enemy.el.style.filter = 'brightness(1.25) saturate(0.6)';
      enemy.depth = 0.18;
      state.burstSpeed = 0;
      state.isWalking = false;
    }

    return true;
  });
}

function clearForkChoices() {
  forkLayer.innerHTML = '';
  state.choosingFork = false;
}

function chooseFork(direction) {
  state.pathOffset += direction === 'left' ? -6 : 6;
  state.pathOffset = clamp(state.pathOffset, -14, 14);
  state.choosingFork = false;
  state.isWalking = true;
  state.burstSpeed = Math.max(state.burstSpeed, 0.22);
  clearForkChoices();
}

function spawnForkChoice() {
  if (state.choosingFork) {
    return;
  }

  state.choosingFork = true;
  state.isWalking = false;

  const choice = document.createElement('div');
  choice.className = 'fork-choice active';
  choice.innerHTML = `
    <button class="fork-wedge left" type="button">Left path</button>
    <button class="fork-wedge right" type="button">Right path</button>
  `;

  choice.querySelector('.fork-wedge.left').addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    chooseFork('left');
  });

  choice.querySelector('.fork-wedge.right').addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    chooseFork('right');
  });

  forkLayer.innerHTML = '';
  forkLayer.appendChild(choice);
}

function updateEnvironment(dt, speed) {
  state.travel += dt * speed;

  const floorShift = (state.travel * 154) % 1000;
  floor.style.backgroundPosition = `0 ${floorShift}px, 0 ${floorShift * 0.42}px, 0 ${floorShift * 0.78}px`;

  const wallShift = (state.travel * 33) % 240;
  walls.style.backgroundPosition = `0 ${wallShift}px, 0 ${wallShift * 0.25}px`;

  arch.style.transform = `translateX(${state.pathOffset * 0.75}px)`;

  state.bobTime += dt * (0.9 + speed * 1.6);
  const bobY = Math.sin(state.bobTime * 7.5) * (0.9 + speed * 1.3);
  const swayX = Math.sin(state.bobTime * 3.4) * (1.3 + speed * 1.2) + state.pathOffset * 0.3;
  const tilt = Math.sin(state.bobTime * 2.1) * (0.4 + speed * 0.6);
  camera.style.transform = `translate(${swayX}px, ${bobY}px) rotate(${tilt}deg)`;

  if (state.burstSpeed > 0) {
    state.burstSpeed = Math.max(0, state.burstSpeed - dt * 0.5);
  }
}

function gameLoop(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  if (state.running) {
    const speed = state.isWalking ? state.baseSpeed + state.burstSpeed : 0;

    if (state.isWalking && !state.choosingFork) {
      state.spawnClock += dt * 1000;
      state.forkClock += dt * 1000;

      if (state.spawnClock >= state.spawnInterval && state.enemies.length < 2) {
        state.spawnClock = 0;
        spawnEnemy();
        state.spawnInterval = 1900 + Math.random() * 1600;
      }

      if (state.forkClock >= state.forkInterval) {
        state.forkClock = 0;
        state.forkInterval = 5200 + Math.random() * 3400;
        spawnForkChoice();
      }
    }

    updateEnvironment(dt, speed);
    updateEnemies(dt, speed);
  }

  requestAnimationFrame(gameLoop);
}

function indicateMotionChange() {
  swipeHint.style.opacity = '0.2';
  clearTimeout(indicateMotionChange.timer);
  indicateMotionChange.timer = setTimeout(() => {
    swipeHint.style.opacity = '';
  }, 540);
}

function triggerForwardBurst() {
  if (!state.running || state.choosingFork) {
    return;
  }
  state.isWalking = true;
  state.burstSpeed = Math.min(0.8, state.burstSpeed + 0.5);
  indicateMotionChange();
}

function haltWalk() {
  if (!state.running || state.choosingFork) {
    return;
  }
  state.isWalking = false;
  state.burstSpeed = 0;
  indicateMotionChange();
}

function onPointerDown(event) {
  state.pointerStartY = event.clientY;
}

function onPointerUp(event) {
  if (state.pointerStartY == null || state.choosingFork) {
    return;
  }

  const deltaY = state.pointerStartY - event.clientY;
  if (deltaY > 34) {
    triggerForwardBurst();
  } else if (deltaY < -34) {
    haltWalk();
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
