const STORAGE_KEY = "dungeon-descent-save-v1";

const state = {
  depth: 0,
  hp: 100,
  maxHp: 100,
  atk: 10,
  armor: 0,
  coins: 0,
  alive: true,
  inCombat: false,
  currentEnemy: null,
  upgrades: {
    blade: 0,
    mail: 0,
    vigor: 0,
  },
};

const ui = {
  depth: document.getElementById("depth"),
  coins: document.getElementById("coins"),
  hp: document.getElementById("hpValue"),
  atk: document.getElementById("atkValue"),
  armor: document.getElementById("armorValue"),
  eventTitle: document.getElementById("eventTitle"),
  eventText: document.getElementById("eventText"),
  choicePanel: document.getElementById("choicePanel"),
  combatPanel: document.getElementById("combatPanel"),
  enemyName: document.getElementById("enemyName"),
  enemyHp: document.getElementById("enemyHp"),
  timingCursor: document.getElementById("timingCursor"),
  statusLine: document.getElementById("statusLine"),
  strikeBtn: document.getElementById("strikeBtn"),
  newRunBtn: document.getElementById("newRunBtn"),
  viewport: document.getElementById("viewport"),
  bladeLvl: document.getElementById("bladeLvl"),
  mailLvl: document.getElementById("mailLvl"),
  vigorLvl: document.getElementById("vigorLvl"),
};

let cursorPos = 0;
let cursorDir = 1;
let combatTicker = null;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function loadSave() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (!data.upgrades) return;
    state.upgrades = { ...state.upgrades, ...data.upgrades };
    state.coins = data.coins || 0;
  } catch {
    // ignore broken save
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      upgrades: state.upgrades,
      coins: state.coins,
    })
  );
}

function applyUpgrades() {
  state.maxHp = 100 + state.upgrades.vigor * 10;
  state.hp = Math.min(state.hp, state.maxHp);
  state.atk = 10 + state.upgrades.blade * 2;
  state.armor = state.upgrades.mail * 2;
}

function startNewRun() {
  state.depth = 0;
  state.hp = 100 + state.upgrades.vigor * 10;
  state.maxHp = state.hp;
  state.alive = true;
  state.inCombat = false;
  state.currentEnemy = null;
  applyUpgrades();
  stopCombatTicker();
  ui.combatPanel.classList.add("hidden");
  ui.choicePanel.classList.add("hidden");
  updateStats();
  setEvent("The Gate Opens", "Swipe up to descend into the next chamber.");
  setStatus("A new run begins.");
}

function updateStats() {
  ui.depth.textContent = `Depth: ${state.depth}`;
  ui.coins.textContent = `Coins: ${state.coins}`;
  ui.hp.textContent = state.hp;
  ui.hp.classList.toggle("low-hp", state.hp <= Math.floor(state.maxHp * 0.3));
  ui.atk.textContent = state.atk;
  ui.armor.textContent = state.armor;
  ui.bladeLvl.textContent = `Lv ${state.upgrades.blade}`;
  ui.mailLvl.textContent = `Lv ${state.upgrades.mail}`;
  ui.vigorLvl.textContent = `Lv ${state.upgrades.vigor}`;
}

function setEvent(title, text) {
  ui.eventTitle.textContent = title;
  ui.eventText.textContent = text;
}

function setStatus(text) {
  ui.statusLine.textContent = text;
}

function descend() {
  if (!state.alive || state.inCombat) return;

  state.depth += 1;
  const roll = Math.random();

  if (roll < 0.45) {
    spawnEnemy();
  } else if (roll < 0.7) {
    triggerTrap();
  } else {
    triggerChoice();
  }
  updateStats();
}

function spawnEnemy() {
  const tier = Math.ceil(state.depth / 3);
  const templates = ["Ratling", "Skeleton", "Cultist", "Knight Wraith", "Abyss Hound"];
  const name = templates[Math.min(templates.length - 1, tier - 1)];
  const hp = 20 + tier * 8 + rand(0, 8);
  const damage = 5 + tier * 2;

  state.currentEnemy = { name, hp, damage };
  state.inCombat = true;
  setEvent("Enemy Encounter", `${name} blocks the corridor. Time your strikes.`);
  ui.choicePanel.classList.add("hidden");
  ui.combatPanel.classList.remove("hidden");
  ui.enemyName.textContent = name;
  ui.enemyHp.textContent = `HP: ${hp}`;
  startCombatTicker();
}

function triggerTrap() {
  const base = 6 + Math.floor(state.depth / 2);
  const damage = Math.max(1, base - state.armor);
  state.hp -= damage;
  setEvent("Trap!", `A hidden dart launcher fires. You take ${damage} damage.`);
  setStatus("Keep swiping to descend.");
  checkDeath();
}

function triggerChoice() {
  ui.choicePanel.innerHTML = "";
  ui.choicePanel.classList.remove("hidden");

  const safeGold = 6 + rand(2, 8) + state.depth;
  const riskyGold = 14 + rand(4, 12) + state.depth * 2;
  const riskDamage = Math.max(2, 8 + Math.floor(state.depth / 2) - state.armor);

  setEvent("Fork in the Dark", "Choose your path: steady gains or dangerous riches.");

  addChoice(
    `Scout the side hall (+${safeGold} coins)`,
    () => {
      state.coins += safeGold;
      setStatus("You find a stash and return safely.");
      ui.choicePanel.classList.add("hidden");
      saveState();
      updateStats();
    }
  );

  addChoice(
    `Kick down iron door (+${riskyGold} coins, ${riskDamage} dmg)`,
    () => {
      state.coins += riskyGold;
      state.hp -= riskDamage;
      setStatus("You grab treasure, but the door trap cuts deep.");
      ui.choicePanel.classList.add("hidden");
      checkDeath();
      saveState();
      updateStats();
    }
  );
}

function addChoice(label, onClick) {
  const btn = document.createElement("button");
  btn.className = "choice-btn";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  ui.choicePanel.appendChild(btn);
}

function startCombatTicker() {
  stopCombatTicker();
  cursorPos = 0;
  cursorDir = 1;
  combatTicker = setInterval(() => {
    cursorPos += 3 * cursorDir;
    if (cursorPos >= 97) cursorDir = -1;
    if (cursorPos <= 0) cursorDir = 1;
    ui.timingCursor.style.left = `${cursorPos}%`;
  }, 40);
}

function stopCombatTicker() {
  if (combatTicker) clearInterval(combatTicker);
  combatTicker = null;
}

function strike() {
  if (!state.inCombat || !state.currentEnemy) return;

  const inZone = cursorPos >= 43 && cursorPos <= 57;
  const playerDamage = inZone ? state.atk + rand(4, 8) : Math.floor(state.atk / 2);
  state.currentEnemy.hp -= playerDamage;

  if (state.currentEnemy.hp <= 0) {
    const reward = 8 + state.depth * 2 + rand(0, 6);
    state.coins += reward;
    setEvent("Victory", `You slay the ${state.currentEnemy.name} and loot ${reward} coins.`);
    setStatus(inZone ? "Perfect hit!" : "Messy win, but a win.");
    state.inCombat = false;
    state.currentEnemy = null;
    ui.combatPanel.classList.add("hidden");
    stopCombatTicker();
    saveState();
    updateStats();
    return;
  }

  const enemyHit = Math.max(1, state.currentEnemy.damage - state.armor + rand(-1, 2));
  state.hp -= enemyHit;
  ui.enemyHp.textContent = `HP: ${state.currentEnemy.hp}`;
  setStatus(inZone ? `Solid strike. You take ${enemyHit} in return.` : `Bad timing! You take ${enemyHit}.`);
  checkDeath();
  updateStats();
}

function checkDeath() {
  if (state.hp > 0) return;
  state.hp = 0;
  state.alive = false;
  state.inCombat = false;
  stopCombatTicker();
  ui.combatPanel.classList.add("hidden");
  ui.choicePanel.classList.add("hidden");
  setEvent("You Have Fallen", `Your run ended at depth ${state.depth}. Spend coins on upgrades and try again.`);
  setStatus("Run over.");
  saveState();
}

function buyUpgrade(type) {
  const current = state.upgrades[type];
  const cost = 25 + current * 20;
  if (state.coins < cost) {
    setStatus(`Need ${cost} coins for that upgrade.`);
    return;
  }
  state.coins -= cost;
  state.upgrades[type] += 1;
  applyUpgrades();
  saveState();
  updateStats();
  setStatus(`Upgraded ${type} to level ${state.upgrades[type]}.`);
}

function bindInput() {
  let startY = 0;
  ui.viewport.addEventListener("touchstart", (event) => {
    startY = event.touches[0].clientY;
  });

  ui.viewport.addEventListener("touchend", (event) => {
    const dy = startY - event.changedTouches[0].clientY;
    if (dy > 35) descend();
  });

  ui.viewport.addEventListener("mousedown", (event) => {
    startY = event.clientY;
  });

  ui.viewport.addEventListener("mouseup", (event) => {
    const dy = startY - event.clientY;
    if (dy > 35) descend();
  });

  ui.strikeBtn.addEventListener("click", strike);
  ui.newRunBtn.addEventListener("click", startNewRun);

  document.querySelectorAll(".upgrade-btn").forEach((btn) => {
    btn.addEventListener("click", () => buyUpgrade(btn.dataset.upgrade));
  });
}

function init() {
  loadSave();
  applyUpgrades();
  updateStats();
  bindInput();
  startNewRun();
}

init();
