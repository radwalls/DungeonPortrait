# Dungeon Portrait

A first-person medieval dungeon crawler built for portrait mobile play.

## How to run

Open `index.html` in a browser (mobile or desktop). For desktop testing:

- `ArrowUp` = descend
- `Space` = strike

## Core gameplay loop

- **Swipe up to descend** through a procedurally rolled dungeon path.
- Encounter random **combat**, **traps**, and **choice events**.
- During combat, tap **at the right timing window** to land clean hits.
- Survive deeper floors to earn more gold and unlock stronger gear/relics.

## Progression

Progression is persisted in `localStorage`:

- Number of total runs
- Best depth
- Unlocked gear/relic milestones

This keeps each run tense while still granting long-term upgrades.
