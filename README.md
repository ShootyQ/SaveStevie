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
- js/ability-effects.js animates bounded lightning and explosive-wall feedback.
- js/geometry.js contains math and intersection helpers.
- styles.css defines the responsive notebook layout, splash screen, and overlays.

Each system is a factory receiving the same game context. Mutable values live in game.state; DOM references in game.dom; upgrade tables in game.catalog. game.api connects systems without implicit shared variables. System methods are also grouped on game.renderer, game.walls, etc. Install every system before starting the loop.

This is a behavior-preserving first structural pass. The central simulation still coordinates interactions in loop.js; those can be extracted independently in future edits. Custom PNG doodles live in assets/art, with procedural canvas fallbacks while they load. Best-wave storage retains the original doodleDefenderBestV4 key.

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
`game.js`, `js/`, and `assets/` are published; test fixtures stay out of the site.

Open the deployed URL on your phone. Best-wave records are saved in that
browser's local storage and are not synced between devices.

## Damage feedback

Small outlined damage numbers launch upward with a stable arc per monster.
Damage type determines color:
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
Snipers unlock at wave 9 and telegraph with a blue aim line before launching
visible 30px arrows. Walls block their line of sight and intercept fired rounds.
Shots deal 7 damage before armor, and the game-over screen names the last hit. Human Pinball now makes contact explosions
push nearby monsters away. Existing saved best-wave records are preserved.

## Review your build

Use **Build** to pause and inspect every owned upgrade, its stack count,
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

Use **Updates** to read recent updates without leaving the game. It pauses
your run while open and restores your previous pause state when closed.
The entries in `index.html` (`#changelogEntries`) are the single source for
player-facing release notes; prepend an entry for every future feature, fix,
or balance change, as required by `AGENTS.md`.

## Monster status colors

Remaining-health fills show active effects: poison green, burn orange, freeze
cyan, charged blue, slow purple, and stun gold. Multiple effects share the fill
in colored sections. When effects expire, the original monster color returns.
This applies to regular monsters and The Eraser without changing combat stats.

## Performance checks

`node tests/validate.cjs` includes wall-query equivalence and particle-budget
randomness checks. The optional Playwright benchmark
`node tests/browser-performance.cjs` measures a seeded crowded, upgraded scene
and reports a combat-state digest for before/after comparisons. See
[performance notes](docs/performance.md) for prerequisites and measured results.

## Phone layout and fullscreen

The illustrated splash introduces drawing, defending, and upgrading. On phones
and touch devices the game fills the available viewport height, with safe-area
insets, 20px side rails for Android navigation gestures, and touch-sized controls.
Ink, Stevie health, wave number, and time remain visible during play. Score,
kills, luck, best wave, and pressure appear in the wave-clear summary; Build
retains detailed upgrades and synergies.

Starting a run on a touch device requests browser fullscreen when supported.
**Screen** toggles it manually; **Exit** returns to the browser. Unsupported or
denied fullscreen leaves the normal viewport-filling layout playable. Resizing
translates the scene together so Stevie stays aligned with existing defenses.

## Custom notebook artwork

Nine transparent, optimized PNGs in `assets/art/` supply Stevie, Grunt, Sniper,
Splitter, Tank, a pencil, and fire/frost/poison doodles. They appear in the arena,
splash, wall decorations, and matching upgrade cards. Other enemy types retain
their existing artwork. Canvas collision radii and combat rules are unchanged.

Images load once; status-tinted versions and wall glyphs are cached. Monsters
remain fully visible at every health level, with colored status sections and a
small health/status bar when needed. Delayed or failed gameplay image loads use the
original vector drawings. No game dependencies are added. See
`assets/art/README.md` for asset sources and export details.

## Barrier safety and readable hits

Gravity Trap, Black Hole, and gravity-ink pulls respect intact wall collisions.
Live barriers also block close-range monster contact with Stevie. This fixes
monsters being pulled through closed defenses; spawn pressure, speeds, damage,
armor, and upgrade stacking retain their current values.

Snipers launch large custom arrows with a vector fallback. A hit leaves a brief
red marker and ghost of the contact monster, plus a short source/damage notice
inside the arena. It pauses with the run; the game-over screen retains the last
hit. Lethal contact ends the run before later enemies can trigger kill healing.

The footer message is removed from the play layout. Mobile controls use a fixed
59px row, with all build details available through Build and wave summaries.

`node scripts/build-site.cjs` packages the Pages site into `_site/`; an optional
output-directory argument is supported. The package includes a content-derived
version on CSS, scripts, and image URLs so new deployments do not reuse an
older resource under the same filename. No package installation is required.

## Ability animations

Chain lightning branches from its source to selected nearby monsters with
three cached jagged shapes, blue/gold pen strokes, and impact sparks. It lasts
340ms. Explosive wall breaks leave a short stroke echo, comic burst, uneven
expanding rings, and rotating ink fragments for 620ms; INFERNO uses orange.
Plain wall breaks and fading walls do not invent explosions.

Presentation records live outside combat state. Budgets are eight lightning
casts, six shown targets per cast, four explosions, 48 captured wall vertices,
four shockwave anchors, and 16 fragments per explosion. Secondary anchors use
original wall vertices; fragments are distributed along the stroke even for
two-point walls. Shockwave drawing caps its visual radius at 160px, while
combat keeps the full upgrade-adjusted radius. Endpoints remain at the instant
of impact and translate with the arena on resize. Drawing never advances
life or uses combat randomness. Pause/upgrade screens freeze effects; wave
transitions discard them. Reduced motion uses short, static, fading highlights
without flying fragments or expanding rings. No assets or dependencies added.

Validation covers actual target selection, immune/solo electrical procs,
explosion damage and synergies, random-state parity with visuals disabled,
finite/pure rendering, resize, lifetime, reset, and worst-case effect budgets.

## Monster compendium and introductions

Open **Monsters** from the toolbar to browse all 19 illustrated monsters,
including split children and bosses. Each entry includes a fun name, first
available wave, base stats from the combat definitions, abilities, and counter
advice. HP and movement speed scale with the wave; displayed contact damage is
before Stevie's armor. King Doodle-Doom's base HP includes its first-wave bonus.
Names also appear in contact-hit reports.

Before combat begins on a monster's first available wave, a paused notebook
page introduces every type newly unlocked in that wave together. Niblets are
introduced alongside their splitting parent; bosses are introduced on wave 5,
and the final Eraser on wave 20. Random selection can delay actual appearances.
Each new run shows these pages again while enabled. **Bring it on!** (or Escape)
continues; **Skip these introductions from now on** or the checkbox in the
compendium disables them. This preference is stored separately under
`saveStevieMonsterIntros`; best-wave records are preserved. If storage is
unavailable, the preference still works for the current visit.

The compendium restores any previous manual pause when closed. Introduction
pages prevent the toolbar pause button or another information dialog from
resuming combat underneath them. Both dialogs keep keyboard focus inside,
scroll within the notebook, and use existing artwork with the deployment's
resource version. No combat balance or spawn randomness changes.

## More ink animations and music

Fire, poison, and freeze now add small scribbled flames, rising bubbles, and
icy crystals around affected monsters. Combined statuses display together;
fire/poison immunity suppresses those damage ornaments. Only 24 affected
monsters receive ornaments at once. Successful void damage creates collapsing
purple spirals (at most 8), and actual vampire/Leech Ink/Necrotic Engine healing
sends small red beads back to Stevie (at most 6 trails, throttled to one new
trail per 0.12 seconds). Full health does not create a healing trail. These
private visuals use no combat randomness, freeze while gameplay is paused,
reset between waves, and move with the arena on resize. Reduced motion uses
static crystals, bubbles, and short fading rings instead of moving effects.

The supplied Save Stevie song plays on a loop after starting a run. The **♫**
button mutes/resumes it and saves the choice on this device. Wave changes and
menus keep the song playing; hiding the tab pauses it and returning resumes
from the same position. Music loads on demand, starts from a player gesture,
and cannot block gameplay if playback is unavailable. The MP3 is packaged and
versioned with the static site. See `assets/audio/README.md` for track details.

## Upgrade pictures and Luck

Every upgrade choice has a decorative picture. Existing ink and pencil artwork
is reused; 32 small original SVG doodles cover the remaining upgrades. Images
use the deployment resource version and a pen fallback if loading fails.

Luck increases the rarity odds of future rewards, including rerolls and boss
rewards. It does not increase damage or the probability of ink effects. The
reward screen shows current Luck and a tap-to-expand explanation; Your Build
and Lucky Scribble explain it too. Chaos specialization adds its separate +12
bonus to normal rarity rolls; boss rolls use the Luck stat. Loaded Deck keeps
normal rewards at Uncommon or better. Specialization and Collector weight the
selection within a rolled rarity. No selection formulas or balance changed.


## Late-wave rendering cache

Mixed monster types and stacked statuses now reuse their full-resolution tinted
art through a least-recently-used cache, capped at 192 entries and 16 MiB of
RGBA pixels. This prevents the previous 32-entry cache from rebuilding most
sprites every frame in a busy wave. The artwork, effects, and combat are
unchanged. The optional `tests/browser-performance.cjs` benchmark has a
`wave20` mode for this mixed-crowd rendering workload, with exact visual and
combat hashes. See `docs/performance.md` for measured results and limits.
