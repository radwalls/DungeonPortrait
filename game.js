const state = {
  hp: 100,
  depth: 1,
  gold: 0,
  gearLevel: 1,
  progress: 0,
  inCombat: false,
  enemy: null,
  markerPos: 0,
  markerDir: 1,
  combatTimer: null,
  swipeStartY: null,
  runOver: false,
};

const ui = {
  depth: document.getElementById("depth"),
  hp: document.getElementById("hp"),
  gold: document.getElementById("gold"),
  gearLevel: document.getElementById("gearLevel"),
  xpBar: document.getElementById("xpBar"),
  eventTitle: document.getElementById("eventTitle"),
  eventText: document.getElementById("eventText"),
  choiceZone: document.getElementById("choiceZone"),
  combatZone: document.getElementById("combatZone"),
  marker: document.getElementById("timingMarker"),
  strikeBtn: document.getElementById("strikeBtn"),
  descendBtn: document.getElementById("descendBtn"),
  restartBtn: document.getElementById("restartBtn"),
  tunnel: document.getElementById("tunnel"),
  game: document.getElementById("game"),
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedEvent() {
  const roll = Math.random();
  if (roll < 0.45) return "enemy";
  if (roll < 0.67) return "trap";
  if (roll < 0.84) return "treasure";
  return "choice";
}

function updateHud() {
  ui.depth.textContent = state.depth;
  ui.hp.textContent = Math.max(0, Math.floor(state.hp));
  ui.gold.textContent = state.gold;
  ui.gearLevel.textContent = state.gearLevel;
  ui.xpBar.value = state.progress;
}

function setEvent(title, text) {
  ui.eventTitle.textContent = title;
  ui.eventText.textContent = text;
}

function clearChoices() {
  ui.choiceZone.innerHTML = "";
}

function addChoice(label, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  ui.choiceZone.appendChild(btn);
}

function animateDescent() {
  ui.tunnel.style.transform = "translateY(26px) scale(1.05)";
  ui.tunnel.classList.add("flash");
  setTimeout(() => {
    ui.tunnel.style.transform = "translateY(0) scale(1)";
    ui.tunnel.classList.remove("flash");
  }, 280);
}

function gainProgress(amount) {
  state.progress += amount;
  while (state.progress >= 100) {
    state.progress -= 100;
    state.gearLevel += 1;
    setEvent("Gear Improved", `Your equipment hardens. Gear level is now ${state.gearLevel}.`);
  }
}

function encounterEnemy() {
  clearChoices();
  ui.combatZone.classList.remove("hidden");

  const enemy = {
    name: ["Ghoul", "Skeleton Guard", "Cultist Knight", "Cave Stalker"][randomInt(0, 3)],
    hp: randomInt(18, 28) + state.depth * 2,
    power: randomInt(6, 11) + Math.floor(state.depth / 3),
    speed: Math.max(1.6, 2.8 - state.depth * 0.06),
  };

  state.enemy = enemy;
  state.inCombat = true;

  setEvent(
    `Enemy: ${enemy.name}`,
    `It lunges from the darkness. Time your taps. Misses hurt.`
  );

  startTiming(enemy.speed);
}

function startTiming(speed) {
  state.markerPos = 0;
  state.markerDir = 1;
  clearInterval(state.combatTimer);

  state.combatTimer = setInterval(() => {
    state.markerPos += state.markerDir * 3.2;
    if (state.markerPos >= 100) {
      state.markerPos = 100;
      state.markerDir = -1;
    }
    if (state.markerPos <= 0) {
      state.markerPos = 0;
      state.markerDir = 1;
    }
    ui.marker.style.left = `${state.markerPos}%`;
  }, speed * 10);
}

function handleStrike() {
  if (!state.inCombat || !state.enemy || state.runOver) return;

  const perfect = state.markerPos >= 43 && state.markerPos <= 58;
  const good = state.markerPos >= 36 && state.markerPos <= 66;

  if (perfect || good) {
    const dmgBase = perfect ? randomInt(11, 16) : randomInt(7, 12);
    const damage = dmgBase + state.gearLevel * 2;
    state.enemy.hp -= damage;

    setEvent(
      `Hit ${state.enemy.name}`,
      `You deal ${damage} damage${perfect ? " (perfect timing)" : ""}. Enemy HP: ${Math.max(0, state.enemy.hp)}.`
    );

    if (state.enemy.hp <= 0) {
      const gold = randomInt(8, 18) + Math.floor(state.depth * 1.3);
      state.gold += gold;
      gainProgress(24);
      endCombat(`You slay the ${state.enemy.name} and take ${gold} gold.`);
      return;
    }
  } else {
    const retaliation = Math.max(3, state.enemy.power - state.gearLevel);
    state.hp -= retaliation;
    setEvent(
      "Missed!",
      `${state.enemy.name} punishes your mistimed swing for ${retaliation} damage.`
    );

    if (state.hp <= 0) {
      gameOver();
      return;
    }
  }

  updateHud();
}

function endCombat(text) {
  clearInterval(state.combatTimer);
  state.inCombat = false;
  state.enemy = null;
  ui.combatZone.classList.add("hidden");
  setEvent("Path Clears", text);
  updateHud();
}

function triggerTrap() {
  clearChoices();
  ui.combatZone.classList.add("hidden");

  const damage = randomInt(8, 16) + Math.floor(state.depth / 2);
  state.hp -= Math.max(4, damage - state.gearLevel);
  gainProgress(10);

  setEvent("Trap!", `Spikes burst from the floor. You suffer ${damage} damage.`);
  updateHud();

  if (state.hp <= 0) gameOver();
}

function triggerTreasure() {
  clearChoices();
  ui.combatZone.classList.add("hidden");

  const gold = randomInt(12, 25) + state.depth;
  state.gold += gold;
  gainProgress(16);

  if (Math.random() < 0.25) {
    state.hp = Math.min(100 + state.gearLevel * 6, state.hp + 12);
    setEvent("Treasure Cache", `You find ${gold} gold and a tonic restoring 12 HP.`);
  } else {
    setEvent("Treasure Cache", `You find ${gold} gold hidden in old bones.`);
  }

  updateHud();
}

function triggerChoice() {
  clearChoices();
  ui.combatZone.classList.add("hidden");

  setEvent("Fork in the Dark", "Two paths split ahead. One is safer, one richer.");

  addChoice("Cautious Route", () => {
    const heal = randomInt(6, 12);
    state.hp = Math.min(100 + state.gearLevel * 6, state.hp + heal);
    gainProgress(8);
    setEvent("Cautious Route", `You avoid danger and recover ${heal} HP.`);
    updateHud();
    clearChoices();
  });

  addChoice("Risky Shortcut", () => {
    if (Math.random() < 0.55) {
      const loot = randomInt(20, 35);
      state.gold += loot;
      gainProgress(20);
      setEvent("Risk Pays", `You outmaneuver ambushers and gain ${loot} gold.`);
    } else {
      const dmg = randomInt(10, 18);
      state.hp -= dmg;
      setEvent("Risk Backfires", `A blade trap catches you for ${dmg} damage.`);
      if (state.hp <= 0) {
        gameOver();
        return;
      }
    }
    updateHud();
    clearChoices();
  });
}

function descend() {
  if (state.inCombat || state.runOver) return;

  state.depth += 1;
  gainProgress(6);
  animateDescent();
  updateHud();

  const eventType = weightedEvent();
  if (eventType === "enemy") return encounterEnemy();
  if (eventType === "trap") return triggerTrap();
  if (eventType === "treasure") return triggerTreasure();
  triggerChoice();
}

function gameOver() {
  clearInterval(state.combatTimer);
  state.runOver = true;
  state.inCombat = false;
  ui.combatZone.classList.add("hidden");
  clearChoices();

  setEvent(
    "You Have Fallen",
    `Depth reached: ${state.depth}. Gold recovered: ${state.gold}. Tap Start New Run to descend again.`
  );

  ui.descendBtn.classList.add("hidden");
  ui.restartBtn.classList.remove("hidden");
  updateHud();
}

function resetRun() {
  Object.assign(state, {
    hp: 100,
    depth: 1,
    gold: 0,
    gearLevel: 1,
    progress: 0,
    inCombat: false,
    enemy: null,
    markerPos: 0,
    markerDir: 1,
    runOver: false,
  });

  clearInterval(state.combatTimer);
  ui.combatZone.classList.add("hidden");
  clearChoices();

  ui.descendBtn.classList.remove("hidden");
  ui.restartBtn.classList.add("hidden");

  setEvent("A New Descent", "Swipe up or tap Descend to push deeper into the dungeon.");
  updateHud();
}

ui.strikeBtn.addEventListener("click", handleStrike);
ui.descendBtn.addEventListener("click", descend);
ui.restartBtn.addEventListener("click", resetRun);

ui.game.addEventListener("touchstart", (event) => {
  state.swipeStartY = event.changedTouches[0].clientY;
});

ui.game.addEventListener("touchend", (event) => {
  const endY = event.changedTouches[0].clientY;
  const delta = state.swipeStartY - endY;
  if (delta > 45) descend();
});

updateHud();
