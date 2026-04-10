const state = {
  depth: 1,
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  gold: 0,
  gear: "Rusty Blade",
  relic: "None",
  inCombat: false,
  enemy: null,
  timingWindow: [35, 70],
  totalRuns: Number(localStorage.getItem("dp_runs")) || 0,
  unlocks: JSON.parse(localStorage.getItem("dp_unlocks") || "[]"),
};

const enemies = [
  { name: "Rat Fiend", hp: 22, damage: 9, speed: 1100, reward: 8 },
  { name: "Crypt Ghoul", hp: 30, damage: 12, speed: 950, reward: 12 },
  { name: "Bone Knight", hp: 40, damage: 16, speed: 820, reward: 18 },
  { name: "Warden Shade", hp: 52, damage: 20, speed: 760, reward: 24 },
];

const events = [
  {
    title: "Forked Passage",
    text: "A wet tunnel descends while a torchlit stair climbs slightly before turning down.",
    choices: [
      { label: "Take wet tunnel (risk trap)", fn: () => maybeTrap(0.5, 14, 8) },
      { label: "Take torchlit stair (pay 4 stamina)", fn: () => changeStamina(-4, "You preserve focus.") },
    ],
  },
  {
    title: "Abandoned Cache",
    text: "A cracked chest lies under rubble.",
    choices: [
      { label: "Open it", fn: () => (Math.random() < 0.7 ? addGold(14) : maybeTrap(1, 10, 0)) },
      { label: "Leave it", fn: () => log("You keep moving, unease following behind.") },
    ],
  },
  {
    title: "Whispering Shrine",
    text: "A faded idol offers power at a price.",
    choices: [
      { label: "Offer blood (+max HP)", fn: () => { state.hp -= 8; state.maxHp += 6; log("Your life thins, but your body hardens."); syncUI(); } },
      { label: "Refuse", fn: () => log("The whispers fade to disappointed silence.") },
    ],
  },
];

const ui = {
  depth: document.querySelector("#depth"),
  hpBar: document.querySelector("#hpBar"),
  hpText: document.querySelector("#hpText"),
  staminaBar: document.querySelector("#staminaBar"),
  staminaText: document.querySelector("#staminaText"),
  gold: document.querySelector("#gold"),
  gear: document.querySelector("#gear"),
  relic: document.querySelector("#relic"),
  log: document.querySelector("#log"),
  tapStrike: document.querySelector("#tapStrike"),
  enemy: document.querySelector("#enemy"),
  enemyName: document.querySelector("#enemyName"),
  enemyHealth: document.querySelector("#enemyHealth"),
  eventPanel: document.querySelector("#eventPanel"),
  eventTitle: document.querySelector("#eventTitle"),
  eventText: document.querySelector("#eventText"),
  choices: document.querySelector("#choices"),
  pulse: document.querySelector("#pulse"),
};

let touchStart = null;
let enemyAttackTimer = null;
let strikeMeter = 0;
let strikeInterval = null;

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function log(message) {
  ui.log.textContent = message;
}

function syncUI() {
  state.hp = clamp(state.hp, 0, state.maxHp);
  state.stamina = clamp(state.stamina, 0, state.maxStamina);
  ui.depth.textContent = state.depth;
  ui.hpText.textContent = `${Math.ceil(state.hp)} / ${state.maxHp}`;
  ui.staminaText.textContent = `${Math.ceil(state.stamina)} / ${state.maxStamina}`;
  ui.hpBar.style.width = `${(state.hp / state.maxHp) * 100}%`;
  ui.staminaBar.style.width = `${(state.stamina / state.maxStamina) * 100}%`;
  ui.gold.textContent = state.gold;
  ui.gear.textContent = state.gear;
  ui.relic.textContent = state.relic;

  if (state.hp <= 0) {
    gameOver();
  }
}

function regen() {
  if (state.inCombat) return;
  state.stamina = clamp(state.stamina + 0.9, 0, state.maxStamina);
  syncUI();
}

function addGold(amount) {
  state.gold += amount;
  log(`You pocket ${amount} gold.`);
  if (state.gold >= 30 && !state.unlocks.includes("iron_blade")) {
    state.unlocks.push("iron_blade");
    state.gear = "Iron Blade";
    state.timingWindow = [28, 72];
    log("Unlocked: Iron Blade. Your strikes are more forgiving.");
  }
  if (state.depth >= 8 && !state.unlocks.includes("ember_relic")) {
    state.unlocks.push("ember_relic");
    state.relic = "Ember Relic";
  }
  localStorage.setItem("dp_unlocks", JSON.stringify(state.unlocks));
  syncUI();
}

function maybeTrap(chance, dmg, reward) {
  if (Math.random() < chance) {
    state.hp -= dmg;
    flashPulse();
    log(`A trap snaps! You take ${dmg} damage.`);
  } else {
    addGold(reward || 0);
    log("You avoid the trap and press deeper.");
  }
  syncUI();
}

function changeStamina(amount, message) {
  state.stamina += amount;
  if (message) log(message);
  syncUI();
}

function beginCombat() {
  state.inCombat = true;
  const scaling = 1 + state.depth * 0.14;
  const template = enemies[Math.min(enemies.length - 1, Math.floor(state.depth / 3))];
  state.enemy = {
    ...template,
    hp: Math.round(template.hp * scaling),
    maxHp: Math.round(template.hp * scaling),
    damage: Math.round(template.damage * scaling),
  };
  ui.enemy.hidden = false;
  ui.enemyName.textContent = state.enemy.name;
  ui.enemyHealth.style.width = "100%";
  startEnemyAttacks();
  startStrikeMeter();
  log(`${state.enemy.name} lunges from the dark. Time your strikes.`);
}

function startEnemyAttacks() {
  clearInterval(enemyAttackTimer);
  enemyAttackTimer = setInterval(() => {
    if (!state.inCombat || !state.enemy) return;
    const chip = Math.max(4, Math.round(state.enemy.damage * (0.4 + Math.random() * 0.6)));
    state.hp -= chip;
    flashPulse();
    log(`${state.enemy.name} hits you for ${chip}.`);
    syncUI();
  }, Math.max(450, state.enemy.speed - state.depth * 20));
}

function startStrikeMeter() {
  clearInterval(strikeInterval);
  strikeMeter = 0;
  let dir = 1;
  strikeInterval = setInterval(() => {
    strikeMeter += dir * 8;
    if (strikeMeter >= 100 || strikeMeter <= 0) dir *= -1;
    ui.tapStrike.textContent = `Strike (${Math.round(strikeMeter)}%)`;
  }, 60);
}

function strike() {
  if (!state.inCombat || !state.enemy) return;
  if (state.stamina < 7) {
    log("Too exhausted. Wait a heartbeat.");
    return;
  }
  state.stamina -= 7;

  const [low, high] = state.timingWindow;
  const inWindow = strikeMeter >= low && strikeMeter <= high;

  if (!inWindow) {
    log("Poor timing. Your blade glances off.");
    syncUI();
    return;
  }

  const base = 10 + Math.floor(state.depth * 1.5);
  const crit = Math.random() < 0.18;
  const dmg = base + (crit ? 10 : 0);
  state.enemy.hp -= dmg;
  ui.enemyHealth.style.width = `${clamp((state.enemy.hp / state.enemy.maxHp) * 100, 0, 100)}%`;
  log(`Clean strike for ${dmg}${crit ? " (critical)" : ""}.`);

  if (state.enemy.hp <= 0) {
    winCombat();
  }
  syncUI();
}

function winCombat() {
  clearInterval(enemyAttackTimer);
  clearInterval(strikeInterval);
  const reward = state.enemy.reward + Math.round(state.depth * 1.2);
  addGold(reward);
  state.inCombat = false;
  state.enemy = null;
  ui.enemy.hidden = true;
  ui.tapStrike.textContent = "Tap to Strike";
  log(`Enemy defeated. You salvage ${reward} gold.`);
}

function descend() {
  if (state.inCombat) {
    log("You cannot descend while fighting.");
    return;
  }

  state.depth += 1;
  state.stamina -= 3;

  const roll = Math.random();
  if (roll < 0.45) beginCombat();
  else if (roll < 0.78) showEvent();
  else {
    addGold(5 + Math.round(state.depth * 0.8));
    log("A quiet stretch. You descend deeper with growing dread.");
  }

  syncUI();
}

function showEvent() {
  const event = events[Math.floor(Math.random() * events.length)];
  ui.eventPanel.hidden = false;
  ui.eventTitle.textContent = event.title;
  ui.eventText.textContent = event.text;
  ui.choices.innerHTML = "";
  event.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = choice.label;
    btn.addEventListener("click", () => {
      ui.eventPanel.hidden = true;
      choice.fn();
      if (Math.random() < 0.25) {
        beginCombat();
      }
    });
    ui.choices.appendChild(btn);
  });
  log("A decision blocks your path.");
}

function flashPulse() {
  ui.pulse.style.opacity = "1";
  setTimeout(() => {
    ui.pulse.style.opacity = "0";
  }, 150);
}

function gameOver() {
  clearInterval(enemyAttackTimer);
  clearInterval(strikeInterval);
  state.totalRuns += 1;
  localStorage.setItem("dp_runs", String(state.totalRuns));
  const best = Number(localStorage.getItem("dp_best")) || 1;
  if (state.depth > best) localStorage.setItem("dp_best", String(state.depth));
  const bestDepth = Number(localStorage.getItem("dp_best")) || state.depth;

  ui.tapStrike.disabled = true;
  log(`You fall at depth ${state.depth}. Best depth: ${bestDepth}. Refresh to start another run.`);
}

function setupGestures() {
  const view = document.querySelector("#view");
  view.addEventListener("touchstart", (ev) => {
    const t = ev.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  });
  view.addEventListener("touchend", (ev) => {
    if (!touchStart) return;
    const t = ev.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;

    if (Math.abs(dy) > Math.abs(dx) && dy < -35) {
      descend();
    } else if (Math.abs(dx) > 40 && !state.inCombat && !ui.eventPanel.hidden) {
      const index = dx < 0 ? 0 : 1;
      ui.choices.querySelectorAll("button")[index]?.click();
    }

    touchStart = null;
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowUp") descend();
    if (ev.key === " ") strike();
  });
}

ui.tapStrike.addEventListener("click", strike);

setupGestures();
syncUI();
setInterval(regen, 180);

if (state.totalRuns >= 3 && !state.unlocks.includes("vanguard_mail")) {
  state.unlocks.push("vanguard_mail");
  state.maxHp += 20;
  state.hp += 20;
  state.gear = "Vanguard Mail";
  localStorage.setItem("dp_unlocks", JSON.stringify(state.unlocks));
  log("Legacy unlock: Vanguard Mail grants +20 max HP this run.");
  syncUI();
}
