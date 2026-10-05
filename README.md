# Save Stevie - In Development

Refactored from doodle_defender_v8.html. Open index.html directly in a modern browser. No installation or build required. Keep the folder together.

## Editing guide

- game.js composes systems and starts the game.
- js/state.js owns mutable run state and initial values.
- js/dom.js binds canvas and HUD elements.
- js/loop.js owns timing and simulation updates.
- js/renderer.js draws the original canvas artwork and handles resizing.
- js/enemies.js handles enemy creation, Stevie, projectiles, and eraser attacks.
- js/waves.js handles run reset, wave progression, victory, and game over.
- js/walls.js handles drawing costs, wall durability, ink contact, and synergy combat effects.
- js/upgrades.js owns upgrade and synergy definitions and selection.
- js/ui.js updates the HUD and synergy splash.
- js/input.js owns pointer drawing and button/resize event wiring.
- js/effects.js creates particles and floating text.
- js/geometry.js contains math and intersection helpers.
- styles.css preserves the original layout and appearance.

Each system is a factory receiving the same game context. Mutable values live in game.state; DOM references in game.dom; upgrade tables in game.catalog. game.api connects systems without implicit shared variables. System methods are also grouped on game.renderer, game.walls, etc. Install every system before starting the loop.

This is a behavior-preserving first structural pass. The central simulation still coordinates interactions in loop.js; those can be extracted independently in future edits. Artwork remains procedural canvas drawing because v8 supplies no separate image assets. Best-wave storage retains the original doodleDefenderBestV4 key.

## Validation

All JavaScript files were syntax checked. The supplied validation harness checks browser startup, run reset, pointer drawing, ink accounting, upgrade selection, pause/resume, and simulation/rendering against the original using deterministic randomness.

Run `node tests/validate.cjs` to repeat the deterministic comparison. The original v8 source is included only as a test fixture. The harness uses a simulated DOM/canvas; it does not replace a visual check in a real browser.

## Play online and deploy

GitHub Pages hosts this static game over HTTPS, including on mobile browsers.
The expected URL after the first successful deployment is
https://shootyq.github.io/SaveStevie/.

One-time setup:

1. In this repository on GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Merge the deployment workflow into `main`. The push automatically validates
   the game and deploys it. Check **Actions → Deploy game to GitHub Pages** for
   the result and published URL.

Every subsequent push to `main` updates the site automatically. You can also
redeploy from the workflow's **Run workflow** button, selecting `main`.
Pull requests run validation without publishing. No package installation,
custom server, or additional secrets are needed. Only `index.html`, `styles.css`,
`game.js`, and `js/` are published; test fixtures stay out of the site.

Open the deployed URL on your phone. Best-wave records are saved in that
browser's local storage and are not synced between devices.

## Damage feedback

Small outlined damage numbers bounce in different directions by damage type:
slate physical, orange fire, green poison, blue electric, gold blast, purple
void, and cyan thermal shock. Each type collects rapid ticks over 0.55 seconds.
Numbers last 2 seconds and fade over their final half-second, without cards or
large combined totals. Placement avoids overlap and stays inside the playfield,
with a 48-label budget. Reduced-motion mode uses gentle drift without bouncing.

## Monster contact

Touching Stevie deals one hit using the monster's contact damage and Stevie's
armor reduction, then bursts and removes the monster. Contact removal grants
no kill rewards and produces no split children. Bosses follow this rule too;
Stevie must survive The Eraser's hit for its removal to clear the final fight.
Snipers keep their ranged attacks. Human Pinball now makes contact explosions
push nearby monsters away. Existing saved best-wave records are preserved.

## Review your build

Use **Your Build** to pause and inspect every owned upgrade, its stack count,
cumulative contribution, current combined stats, and active synergies. Closing
the screen restores the previous pause state. Reward cards show the next stack
and its cumulative effect; picking one confirms the new count and effect.

Repeatable upgrades stack additively or multiplicatively as described. One-time
unlocks stop appearing once acquired, and Helmet/Shock Ink stop appearing at
their caps. Repeated Pocket Rocks adds damage without slowing improved throws.

## Late-wave pressure and new enemies

Waves 1–5 keep their original spawn timing. Later waves ramp smoothly toward
3× the old spawn rate at wave 20, with 4-second surges every 12 seconds and
up to 28% faster movement. Seeded 60-second arrival checks measure wave 14
at 131 spawns (previously 59), wave 15 at 145 (61), and wave 20 at 235 (75),
before splits. These measure arrivals, not guaranteed concurrent enemies.
Normal enemies are capped at 180 concurrent actors; required bosses can still
spawn, once per wave. Upgrade economy and enemy HP scaling are unchanged.

**Your Build → Enemy field guide** describes six new variants and counters:
Wardling (wave 8), Sprinter (9), Brood (10), Bulwark (11), Medic (13), Sapper
(15). Wardlings block one marked damage type; other damage and crowd control
still work. Broods split into two Splitters and then four Minis. Bouncers now
look ahead during ricochets, steer around nearby wall segments, and stop
ricocheting when trapped. They cannot pathfind through a sealed enclosure.

Tune `game.catalog.pressureSettings` in `js/enemies.js` for spawn multiplier,
movement bonus, surge timing, and enemy budget. This is an initial balance
pass; human playtests across strong and weak builds are still needed.

## In-game changelog

Use **Changelog** to read recent updates without leaving the game. It pauses
your run while open and restores your previous pause state when closed.
The entries in `index.html` (`#changelogEntries`) are the single source for
player-facing release notes; prepend an entry for every future feature, fix,
or balance change, as required by `AGENTS.md`.
