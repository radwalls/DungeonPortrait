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
  dungeon: [],
  cellIndex: 0,
  moving: false,
  moveProgress: 0,
  chosenForkRoute: null,
  routeName: 'center',
  pointerStartY: null,
  lastTime: performance.now(),
  bobTime: 0,
  enemies: [],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildDungeon(level) {
  const cells = [];
  const length = 10 + level * 2;

  for (let i = 0; i < length; i += 1) {
    const roll = Math.random();
    let type = 'hall';

    if (i === length - 1) {
      type = 'exit';
    } else if (i > 1 && roll > 0.78) {
      type = 'fork';
    } else if (roll > 0.52) {
      type = randomChoice(['turn_left', 'turn_right', 'hall']);
    }

    const hasEnemy = Math.random() > 0.62 && i > 0 && type !== 'exit';
    cells.push({
      type,
      hasEnemy,
      styleSeed: Math.floor(Math.random() * 1000),
    });
  }

  return cells;
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

function clearEnemies() {
  state.enemies.forEach((enemy) => enemy.el.remove());
  state.enemies = [];
}

function createHumanoidEnemy(lane = 0) {
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
    hp: 3,
    lane,
  };

  enemy.style.left = `${50 + lane}%`;
  enemy.style.setProperty('--enemy-scale', '1.06');
  enemy.style.setProperty('--enemy-opacity', '0.98');

  enemy.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    attackEnemy(unit);
  });

  enemyLayer.appendChild(enemy);
  state.enemies.push(unit);

  enemy.animate(
    [
      { opacity: 0, transform: 'translateX(-50%) scale(0.66) translateY(8%)' },
      { opacity: 1, transform: 'translateX(-50%) scale(1.06) translateY(0)' },
    ],
    { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' }
  );
}

function attackEnemy(enemy) {
  if (!state.running || enemy.hp <= 0 || state.moving) {
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

  state.enemies = state.enemies.filter((unit) => unit.hp > 0);
  if (!state.enemies.length) {
    swipeHint.textContent = 'Path clear. Swipe up to take a step.';
  }
}

function showForkChoice() {
  state.chosenForkRoute = null;
  forkPrompt.classList.add('active');
  forkPrompt.setAttribute('aria-hidden', 'false');
  forkLayer.classList.add('active');
  forkLayer.setAttribute('aria-hidden', 'false');
  swipeHint.textContent = 'Y-fork ahead. Choose left or right route.';
}

function hideForkChoice() {
  forkPrompt.classList.remove('active');
  forkPrompt.setAttribute('aria-hidden', 'true');
  forkLayer.classList.remove('active');
  forkLayer.setAttribute('aria-hidden', 'true');
}

function chooseRoute(direction) {
  state.chosenForkRoute = direction;
  state.routeName = direction;
  hideForkChoice();
  corridor.animate(
    [
      { transform: 'translateX(0px)' },
      { transform: `translateX(${direction === 'left' ? 22 : -22}px)` },
      { transform: 'translateX(0px)' },
    ],
    { duration: 430, easing: 'ease-in-out' }
  );
  swipeHint.textContent = `Route ${direction}. Swipe up to continue.`;
}

forkLeft.addEventListener('click', () => chooseRoute('left'));
forkRight.addEventListener('click', () => chooseRoute('right'));

function applyCellLook(cell) {
  const seed = cell.styleSeed;
  const hue = 210 + (seed % 8);
  walls.style.filter = `brightness(${0.69 + (seed % 7) * 0.01})`;
  floor.style.filter = `brightness(${0.8 + (seed % 6) * 0.01})`;
  corridor.style.background = `radial-gradient(circle at 50% 38%, hsla(${hue}, 18%, 28%, 0.35), #020205 76%)`;
}

function loadCurrentCell() {
  clearEnemies();
  const cell = state.dungeon[state.cellIndex];
  applyCellLook(cell);

  if (cell.type === 'fork') {
    showForkChoice();
  } else {
    hideForkChoice();
  }

  if (cell.hasEnemy) {
    const lane = state.routeName === 'left' ? -6 : state.routeName === 'right' ? 6 : 0;
    createHumanoidEnemy(lane + (Math.random() - 0.5) * 8);
  }

  if (cell.type === 'turn_left') {
    swipeHint.textContent = 'Tunnel bends left. Swipe up to step deeper.';
  } else if (cell.type === 'turn_right') {
    swipeHint.textContent = 'Tunnel bends right. Swipe up to step deeper.';
  } else if (cell.type === 'exit') {
    swipeHint.textContent = 'Stairs descend. Swipe up to enter lower level.';
  } else if (!cell.hasEnemy && cell.type !== 'fork') {
    swipeHint.textContent = 'Swipe up to move one step forward.';
  }
}

function descendLevel() {
  state.level += 1;
  state.cellIndex = 0;
  state.routeName = 'center';
  state.dungeon = buildDungeon(state.level);
  loadCurrentCell();

  swipeHint.textContent = `You descend to level ${state.level}. Swipe up to proceed.`;
  camera.animate(
    [
      { transform: 'translateY(0px) rotate(0deg)' },
      { transform: 'translateY(12px) rotate(1deg)' },
      { transform: 'translateY(0px) rotate(0deg)' },
    ],
    { duration: 600, easing: 'ease-out' }
  );
}

function canMoveForward() {
  const cell = state.dungeon[state.cellIndex];
  if (!cell || state.moving || !state.running) {
    return false;
  }
  if (state.enemies.length > 0) {
    swipeHint.textContent = 'Enemy in front. Tap to attack.';
    return false;
  }
  if (cell.type === 'fork' && !state.chosenForkRoute) {
    swipeHint.textContent = 'Pick a fork route first.';
    return false;
  }
  return true;
}

function moveForwardStep() {
  if (!canMoveForward()) {
    return;
  }

  const cell = state.dungeon[state.cellIndex];
  if (cell.type === 'exit') {
    descendLevel();
    return;
  }

  state.moving = true;
  state.moveProgress = 0;

  const startWallPos = Number.parseFloat(walls.dataset.offset || '0');
  const startFloorPos = Number.parseFloat(floor.dataset.offset || '0');

  const durationMs = 320;
  const start = performance.now();

  function stepFrame(now) {
    const t = clamp((now - start) / durationMs, 0, 1);
    const eased = 1 - (1 - t) ** 2;

    const wallPos = startWallPos + eased * 34;
    const floorPos = startFloorPos + eased * 135;
    walls.style.backgroundPosition = `0 ${wallPos}px, 0 ${wallPos * 0.35}px`;
    floor.style.backgroundPosition = `0 ${floorPos}px, 0 ${floorPos * 0.44}px, 0 ${floorPos * 0.8}px`;
    walls.dataset.offset = String(wallPos);
    floor.dataset.offset = String(floorPos);

    state.moveProgress = eased;
    if (t < 1) {
      requestAnimationFrame(stepFrame);
      return;
    }

    state.cellIndex += 1;
    state.chosenForkRoute = null;
    state.moving = false;
    loadCurrentCell();
  }

  requestAnimationFrame(stepFrame);
}

function onPointerDown(event) {
  state.pointerStartY = event.clientY;
}

function onPointerUp(event) {
  if (state.pointerStartY == null || !state.running) {
    state.pointerStartY = null;
    return;
  }

  const deltaY = state.pointerStartY - event.clientY;
  if (deltaY > 32) {
    moveForwardStep();
  }

  state.pointerStartY = null;
}

function animateIdle(dt) {
  state.bobTime += dt * (state.moving ? 6 : 2.2);
  const bobStrength = state.moving ? 2.4 : 0.8;
  const swayStrength = state.moving ? 1.8 : 0.6;
  const bobY = Math.sin(state.bobTime) * bobStrength;
  const swayX = Math.sin(state.bobTime * 0.56) * swayStrength;
  camera.style.transform = `translate(${swayX}px, ${bobY}px)`;
}

function gameLoop(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  if (state.running) {
    animateIdle(dt);
  }

  requestAnimationFrame(gameLoop);
}

function init() {
  state.dungeon = buildDungeon(state.level);
  loadCurrentCell();
  requestAnimationFrame((time) => {
    state.lastTime = time;
    requestAnimationFrame(gameLoop);
  });
}

game.addEventListener('pointerdown', onPointerDown);
game.addEventListener('pointerup', onPointerUp);
game.addEventListener('pointercancel', () => {
  state.pointerStartY = null;
});

init();
