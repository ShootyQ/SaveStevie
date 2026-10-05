# Doodle Defender

Refactored from doodle_defender_v8.html. Open index.html directly in a modern browser. No installation or build required. Keep the folder together.

## Editing guide

- game.js composes systems and starts the game.
- js/state.js owns mutable run state and initial values.
- js/dom.js binds canvas and HUD elements.
- js/loop.js owns timing and simulation updates.
- js/renderer.js draws the original canvas artwork and handles resizing.
- js/enemies.js handles enemy creation, Steve, projectiles, and eraser attacks.
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

## Damage numbers

Enemies show floating numbers for damage received: slate for physical hits,
orange for fire, green for poison, blue for electricity, gold for explosions,
purple for void, and cyan for thermal shock. Rapid ticks of the same type
combine over 0.6 seconds; different types keep separate labels. Numbers remain
visible for 1.8 seconds, rise slowly, and fade during their final half-second. Values use
up to one decimal place and count remaining health rather than excess overkill.
Frost, gravity, and repulsion effects that only slow or move enemies do not
produce damage numbers.
