const game = document.getElementById('game');
const camera = document.getElementById('camera');
const viewStack = document.getElementById('viewStack');
const enemyLayer = document.getElementById('enemyLayer');
const sword = document.getElementById('sword');
const swipeHint = document.getElementById('swipeHint');
const levelToast = document.getElementById('levelToast');
const characterLevel = document.getElementById('characterLevel');

const characterBtn = document.getElementById('characterBtn');
const inventoryBtn = document.getElementById('inventoryBtn');
const characterMenu = document.getElementById('characterMenu');
const inventoryMenu = document.getElementById('inventoryMenu');
const closeButtons = document.querySelectorAll('[data-close]');

const DIRS = [
  { x: 0, y: -1, name: 'north' },
  { x: 1, y: 0, name: 'east' },
  { x: 0, y: 1, name: 'south' },
  { x: -1, y: 0, name: 'west' },
];

const state = {
  running: true,
  inputLocked: false,
  level: 1,
  gridSize: 13,
  map: [],
  player: { x: 1, y: 1, dir: 1 },
  exit: { x: 1, y: 1 },
  enemies: [],
  pointerStart: null,
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

function makeGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(1));
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function carveMaze(grid, x, y) {
  grid[y][x] = 0;
  const dirs = shuffle([
    { x: 2, y: 0 },
    { x: -2, y: 0 },
    { x: 0, y: 2 },
    { x: 0, y: -2 },
  ]);

  dirs.forEach((dir) => {
    const nx = x + dir.x;
    const ny = y + dir.y;

    if (ny < 1 || ny >= grid.length - 1 || nx < 1 || nx >= grid.length - 1) {
      return;
    }

    if (grid[ny][nx] === 1) {
      grid[y + dir.y / 2][x + dir.x / 2] = 0;
      carveMaze(grid, nx, ny);
    }
  });
}

function findFarthestCell(grid, sx, sy) {
  const q = [{ x: sx, y: sy, d: 0 }];
  const seen = new Set([`${sx},${sy}`]);
  let farthest = { x: sx, y: sy, d: 0 };

  while (q.length) {
    const next = q.shift();
    if (next.d > farthest.d) {
      farthest = next;
    }

    DIRS.forEach((dir) => {
      const nx = next.x + dir.x;
      const ny = next.y + dir.y;
      if (grid[ny]?.[nx] !== 0) {
        return;
      }
      const key = `${nx},${ny}`;
      if (!seen.has(key)) {
        seen.add(key);
        q.push({ x: nx, y: ny, d: next.d + 1 });
      }
    });
  }

  return farthest;
}

function buildLevel() {
  const size = clamp(11 + state.level * 2, 11, 21);
  const grid = makeGrid(size);
  carveMaze(grid, 1, 1);

  state.gridSize = size;
  state.map = grid;
  state.player = { x: 1, y: 1, dir: Math.floor(Math.random() * 4) };

  const farthest = findFarthestCell(grid, 1, 1);
  state.exit = { x: farthest.x, y: farthest.y };

  placeEnemies();
  updateLevelUI();
  renderView();
}

function updateLevelUI() {
  levelToast.textContent = `Level ${state.level}`;
  characterLevel.textContent = `Depth ${state.level} Delver`;
  levelToast.classList.remove('flash');
  void levelToast.offsetWidth;
  levelToast.classList.add('flash');
}

function tileAt(x, y) {
  if (x < 0 || y < 0 || y >= state.gridSize || x >= state.gridSize) {
    return 1;
  }
  if (state.exit.x === x && state.exit.y === y) {
    return 2;
  }
  return state.map[y][x];
}

function placeEnemies() {
  state.enemies = [];
  enemyLayer.innerHTML = '';

  const count = 3 + state.level;
  let attempts = 0;

  while (state.enemies.length < count && attempts < 300) {
    attempts += 1;
    const x = 1 + Math.floor(Math.random() * (state.gridSize - 2));
    const y = 1 + Math.floor(Math.random() * (state.gridSize - 2));

    if (state.map[y][x] !== 0 || (x === 1 && y === 1) || (x === state.exit.x && y === state.exit.y)) {
      continue;
    }

    const already = state.enemies.some((enemy) => enemy.x === x && enemy.y === y);
    if (!already) {
      state.enemies.push({ x, y, hp: 2 + Math.min(2, state.level), entered: false });
    }
  }
}

function createHumanoid(enemyObj, leftPercent, depth) {
  const enemy = document.createElement('button');
  enemy.className = 'enemy';
  enemy.type = 'button';
  enemy.style.left = `${leftPercent}%`;
  enemy.style.setProperty('--enemy-scale', (0.45 + depth * 0.24).toFixed(3));
  enemy.style.setProperty('--enemy-opacity', clamp(0.42 + depth * 0.34, 0, 1).toFixed(3));
  enemy.setAttribute('aria-label', 'Humanoid dungeon enemy');
  enemy.innerHTML = `
    <span class="head"></span>
    <span class="body"></span>
    <span class="arm left"></span>
    <span class="arm right"></span>
    <span class="leg left"></span>
    <span class="leg right"></span>
  `;

  enemy.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    hitEnemy(enemyObj, enemy);
  });

  enemyLayer.appendChild(enemy);
}

function hitEnemy(enemyObj, enemyEl) {
  if (!state.running || state.inputLocked) {
    return;
  }

  sword.classList.remove('swing');
  void sword.offsetWidth;
  sword.classList.add('swing');

  enemyObj.hp -= 1;
  enemyEl.classList.add('hurt');
  setTimeout(() => enemyEl.classList.remove('hurt'), 110);

  if (enemyObj.hp <= 0) {
    enemyEl.classList.add('dead');
    setTimeout(() => {
      const idx = state.enemies.indexOf(enemyObj);
      if (idx >= 0) state.enemies.splice(idx, 1);
      enemyEl.remove();
      renderView();
    }, 220);
  }
}

function enemyAhead(maxDepth = 3) {
  const dir = DIRS[state.player.dir];
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const tx = state.player.x + dir.x * depth;
    const ty = state.player.y + dir.y * depth;
    const enemy = state.enemies.find((unit) => unit.x === tx && unit.y === ty && unit.hp > 0);
    if (enemy) {
      return { enemy, depth };
    }
    if (tileAt(tx, ty) === 1) {
      break;
    }
  }
  return null;
}

function renderView() {
  viewStack.innerHTML = '';
  enemyLayer.innerHTML = '';

  const dir = DIRS[state.player.dir];
  const left = DIRS[(state.player.dir + 3) % 4];
  const right = DIRS[(state.player.dir + 1) % 4];

  for (let depth = 4; depth >= 1; depth -= 1) {
    const cx = state.player.x + dir.x * depth;
    const cy = state.player.y + dir.y * depth;
    const tile = tileAt(cx, cy);

    const width = 30 + depth * 15;
    const height = 20 + depth * 12;
    const top = 26 + depth * 8;

    if (tile === 1 || tile === 2) {
      const front = document.createElement('div');
      front.className = 'depth-segment forward-wall';
      front.style.width = `${width}%`;
      front.style.height = `${height}%`;
      front.style.top = `${top}%`;
      viewStack.appendChild(front);

      if (tile === 2) {
        const glow = document.createElement('div');
        glow.className = 'exit-glow';
        glow.style.width = `${width * 0.45}%`;
        glow.style.height = `${height * 0.45}%`;
        glow.style.top = `${top + height * 0.28}%`;
        viewStack.appendChild(glow);
      }

      break;
    }

    const leftTile = tileAt(cx + left.x, cy + left.y);
    const rightTile = tileAt(cx + right.x, cy + right.y);

    if (leftTile === 1) {
      const sideWall = document.createElement('div');
      sideWall.className = 'depth-segment side-wall left';
      sideWall.style.left = `${50 - width * 0.52}%`;
      sideWall.style.height = `${height}%`;
      sideWall.style.top = `${top}%`;
      viewStack.appendChild(sideWall);
    }

    if (rightTile === 1) {
      const sideWall = document.createElement('div');
      sideWall.className = 'depth-segment side-wall right';
      sideWall.style.left = `${50 + width * 0.26}%`;
      sideWall.style.height = `${height}%`;
      sideWall.style.top = `${top}%`;
      viewStack.appendChild(sideWall);
    }
  }

  const seenEnemy = enemyAhead(4);
  if (seenEnemy) {
    const lateral = (Math.random() - 0.5) * 4;
    createHumanoid(seenEnemy.enemy, 50 + lateral, 5 - seenEnemy.depth);
  }

  if (state.player.x === state.exit.x && state.player.y === state.exit.y) {
    descendLevel();
  }
}

function animateCamera(dx = 0, rot = 0) {
  camera.animate(
    [
      { transform: 'translate(0px, 0px) rotate(0deg)' },
      { transform: `translate(${dx}px, 2px) rotate(${rot}deg)` },
      { transform: 'translate(0px, 0px) rotate(0deg)' },
    ],
    { duration: 190, easing: 'ease-out' }
  );
}

function descendLevel() {
  state.inputLocked = true;
  swipeHint.textContent = 'You found the stairwell. Descending...';
  setTimeout(() => {
    state.level += 1;
    buildLevel();
    state.inputLocked = false;
    swipeHint.textContent = 'Swipe up: step forward • Swipe left/right: turn';
  }, 600);
}

function canMoveTo(x, y) {
  return tileAt(x, y) !== 1;
}

function stepForward() {
  if (!state.running || state.inputLocked) {
    return;
  }

  const enemyBlock = enemyAhead(1);
  if (enemyBlock) {
    swipeHint.textContent = 'Enemy in front. Tap enemy to attack.';
    return;
  }

  const dir = DIRS[state.player.dir];
  const nx = state.player.x + dir.x;
  const ny = state.player.y + dir.y;
  if (!canMoveTo(nx, ny)) {
    swipeHint.textContent = 'Stone wall blocks your path.';
    animateCamera(0, 0.4);
    return;
  }

  state.player.x = nx;
  state.player.y = ny;
  animateCamera(0, 0.1);
  renderView();
}

function turn(delta) {
  if (!state.running || state.inputLocked) {
    return;
  }

  state.player.dir = (state.player.dir + delta + 4) % 4;
  animateCamera(delta < 0 ? -14 : 14, delta < 0 ? -1.5 : 1.5);
  renderView();
}

function onPointerDown(event) {
  state.pointerStart = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event) {
  if (!state.pointerStart || !state.running || state.inputLocked) {
    state.pointerStart = null;
    return;
  }

  const dx = event.clientX - state.pointerStart.x;
  const dy = event.clientY - state.pointerStart.y;

  if (Math.abs(dy) > Math.abs(dx) && dy < -30) {
    stepForward();
  } else if (Math.abs(dx) > Math.abs(dy) && dx > 28) {
    turn(1);
  } else if (Math.abs(dx) > Math.abs(dy) && dx < -28) {
    turn(-1);
  }

  state.pointerStart = null;
}

game.addEventListener('pointerdown', onPointerDown);
game.addEventListener('pointerup', onPointerUp);
game.addEventListener('pointercancel', () => {
  state.pointerStart = null;
});

buildLevel();
