const state = {
  hp: 100,
  stamina: 100,
  depth: 1,
  gold: 0,
  bestDepth: Number(localStorage.getItem("dp_best_depth") || 1),
  gearLevel: Number(localStorage.getItem("dp_gear") || 0),
  inCombat: false,
  gameOver: false,
  enemy: null,
  runSeed: Math.random(),
};

const gearList = ["Rusty Dagger", "Iron Sword", "Tempered Blade", "Knight Relic"];
const enemies = [
  { name: "Skeleton", hp: 30, dmg: 10 },
  { name: "Ghoul", hp: 38, dmg: 13 },
  { name: "Cultist", hp: 44, dmg: 15 },
  { name: "Warden", hp: 56, dmg: 18 },
];

const els = {
  depth: document.getElementById("depth"),
  hp: document.getElementById("hp"),
  stamina: document.getElementById("stamina"),
  gold: document.getElementById("gold"),
  bestDepth: document.getElementById("bestDepth"),
  gear: document.getElementById("gear"),
  sceneTitle: document.getElementById("sceneTitle"),
  sceneText: document.getElementById("sceneText"),
  forwardBtn: document.getElementById("forwardBtn"),
  restartBtn: document.getElementById("restartBtn"),
  combatPanel: document.getElementById("combatPanel"),
  enemyName: document.getElementById("enemyName"),
  enemyHpBar: document.getElementById("enemyHpBar"),
  strikeBtn: document.getElementById("strikeBtn"),
  timingCursor: document.getElementById("timingCursor"),
  choicePanel: document.getElementById("choicePanel"),
};

let timing = { x: 0, dir: 1, raf: 0 };

function randomOf(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function updateHud() {
  els.depth.textContent = state.depth;
  els.hp.textContent = Math.max(0, Math.round(state.hp));
  els.stamina.textContent = Math.max(0, Math.round(state.stamina));
  els.gold.textContent = state.gold;
  els.bestDepth.textContent = state.bestDepth;
  els.gear.textContent = gearList[state.gearLevel];
}

function setScene(title, text) {
  els.sceneTitle.textContent = title;
  els.sceneText.textContent = text;
}

function startCombat() {
  state.inCombat = true;
  els.combatPanel.classList.remove("hidden");
  const baseEnemy = randomOf(enemies);
  const scale = 1 + state.depth * 0.08;
  state.enemy = {
    name: baseEnemy.name,
    hp: Math.round(baseEnemy.hp * scale),
    maxHp: Math.round(baseEnemy.hp * scale),
    dmg: Math.round(baseEnemy.dmg * scale),
  };
  els.enemyName.textContent = `${state.enemy.name} (Depth ${state.depth})`;
  setScene("Enemy Encounter", `A ${state.enemy.name} blocks your path. Time your strike!`);
  updateEnemyBar();
  startTimingBar();
}

function updateEnemyBar() {
  const pct = (state.enemy.hp / state.enemy.maxHp) * 100;
  els.enemyHpBar.style.width = `${Math.max(0, pct)}%`;
}

function startTimingBar() {
  cancelAnimationFrame(timing.raf);
  timing.x = 0;
  timing.dir = 1;
  const speed = 1.6 + Math.min(2.2, state.depth * 0.05);

  const tick = () => {
    timing.x += speed * timing.dir;
    if (timing.x >= 100) {
      timing.x = 100;
      timing.dir = -1;
    } else if (timing.x <= 0) {
      timing.x = 0;
      timing.dir = 1;
    }
    els.timingCursor.style.left = `${timing.x}%`;
    timing.raf = requestAnimationFrame(tick);
  };
  timing.raf = requestAnimationFrame(tick);
}

function strike() {
  if (!state.inCombat || state.gameOver) return;

  const perfect = timing.x >= 42 && timing.x <= 58;
  const close = timing.x >= 33 && timing.x <= 67;
  const bonus = state.gearLevel * 3;
  const dmg = perfect ? 18 + bonus : close ? 11 + bonus : 5 + bonus;
  state.enemy.hp -= dmg;

  if (state.enemy.hp <= 0) {
    winCombat(perfect);
    return;
  }

  const retaliation = Math.max(4, state.enemy.dmg - (perfect ? 6 : 0));
  state.hp -= retaliation;
  state.stamina = Math.max(0, state.stamina - 5);
  setScene(
    "Steel on Bone",
    perfect
      ? `Perfect hit for ${dmg}. You take ${retaliation} in return.`
      : `You hit for ${dmg}, but the counter hits for ${retaliation}.`
  );

  updateEnemyBar();
  updateHud();
  if (state.hp <= 0) {
    endRun("You collapse in the darkness.");
  }
}

function winCombat(perfect) {
  state.inCombat = false;
  cancelAnimationFrame(timing.raf);
  els.combatPanel.classList.add("hidden");

  const reward = Math.round(8 + state.depth * 1.2 + (perfect ? 6 : 0));
  state.gold += reward;
  state.stamina = Math.min(100, state.stamina + 8);
  setScene("Enemy Defeated", `You survive and gather ${reward} gold.`);
  updateHud();
  maybeShowChoices();
}

function maybeShowChoices() {
  els.choicePanel.innerHTML = "";
  els.choicePanel.classList.remove("hidden");

  const choices = [
    {
      text: "Touch the glowing shrine (+14 HP)",
      apply: () => {
        state.hp = Math.min(100, state.hp + 14);
        setScene("Shrine Blessing", "Warm light mends your wounds.");
      },
    },
    {
      text: "Scavenge side chamber (+12 stamina)",
      apply: () => {
        state.stamina = Math.min(100, state.stamina + 12);
        setScene("Quick Breather", "You catch your breath amid old crates.");
      },
    },
    {
      text: "Press on immediately (+1 depth)",
      apply: () => {
        state.depth += 1;
        setScene("Forced March", "You leap over cracked stairs and descend fast.");
      },
    },
  ];

  for (const choice of choices) {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice.text;
    btn.addEventListener("click", () => {
      choice.apply();
      els.choicePanel.classList.add("hidden");
      updateHud();
      checkProgression();
    });
    els.choicePanel.appendChild(btn);
  }
}

function descend() {
  if (state.gameOver || state.inCombat) return;

  state.depth += 1;
  state.stamina = Math.max(0, state.stamina - 8);

  const roll = Math.random();
  if (roll < 0.48) {
    startCombat();
  } else if (roll < 0.75) {
    const trap = Math.round(8 + Math.random() * 10 + state.depth * 0.3);
    state.hp -= trap;
    state.gold += Math.round(4 + Math.random() * 8);
    setScene("A Hidden Trap", `A dart trap hits for ${trap}, but you find loose coins nearby.`);
  } else {
    const stash = Math.round(10 + Math.random() * 12 + state.depth * 0.8);
    state.gold += stash;
    setScene("Silent Corridor", `No enemies. You discover a stash of ${stash} gold.`);
  }

  if (state.hp <= 0 || state.stamina <= 0) {
    endRun(state.hp <= 0 ? "Your wounds are too deep." : "Exhaustion takes you.");
    return;
  }

  checkProgression();
  updateHud();
}

function checkProgression() {
  if (state.depth > state.bestDepth) {
    state.bestDepth = state.depth;
    localStorage.setItem("dp_best_depth", String(state.bestDepth));
  }

  const unlocked = Math.min(gearList.length - 1, Math.floor(state.bestDepth / 6));
  if (unlocked > state.gearLevel) {
    state.gearLevel = unlocked;
    localStorage.setItem("dp_gear", String(state.gearLevel));
    setScene("Gear Unlocked", `You unlock ${gearList[state.gearLevel]} for future runs.`);
  }
}

function endRun(reason) {
  state.gameOver = true;
  state.inCombat = false;
  cancelAnimationFrame(timing.raf);
  els.combatPanel.classList.add("hidden");
  els.choicePanel.classList.add("hidden");
  setScene("Run Ended", `${reason} Reached depth ${state.depth}. Gold: ${state.gold}.`);
  els.forwardBtn.classList.add("hidden");
  els.restartBtn.classList.remove("hidden");
  updateHud();
}

function resetRun() {
  state.hp = 100;
  state.stamina = 100;
  state.depth = 1;
  state.gold = 0;
  state.gameOver = false;
  state.inCombat = false;
  state.enemy = null;
  els.choicePanel.classList.add("hidden");
  els.combatPanel.classList.add("hidden");
  els.restartBtn.classList.add("hidden");
  els.forwardBtn.classList.remove("hidden");
  setScene("The Descent Begins", "Swipe up or tap Descend to delve deeper.");
  updateHud();
}

let touchStartY = null;
document.addEventListener("touchstart", (e) => {
  touchStartY = e.changedTouches[0].clientY;
});

document.addEventListener("touchend", (e) => {
  if (touchStartY == null) return;
  const endY = e.changedTouches[0].clientY;
  const diff = touchStartY - endY;
  touchStartY = null;
  if (diff > 45) descend();
});

els.forwardBtn.addEventListener("click", descend);
els.restartBtn.addEventListener("click", resetRun);
els.strikeBtn.addEventListener("click", strike);

setScene("The Descent Begins", "Swipe up or tap Descend to delve deeper.");
updateHud();
