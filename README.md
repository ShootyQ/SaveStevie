# Save Stevie - In Development

Refactored from doodle_defender_v8.html. Open index.html directly in a modern browser. No installation or build required. Keep the folder together.

## Android internal testing

The optional Capacitor wrapper bundles the game for offline Android play. Start
with the [Android testing guide](docs/android-testing.md) for phone installation,
signing, GitHub build artifacts and Google Play internal testing. Android tooling
uses npm; the hosted web game still needs no dependencies or build.

## Copyright

© 2026 ShootyQ. Save Stevie. All rights reserved.

No license to copy, modify, redistribute or commercially use this project is
granted by making this repository publicly accessible. Third-party components
remain subject to their respective licenses; the bundled Patrick Hand font
retains its [SIL Open Font License](assets/fonts/OFL-PatrickHand.txt).

## Editing guide

- game.js composes systems and starts the game.
- js/state.js owns mutable run state and initial values.
- js/dom.js binds canvas and HUD elements.
- js/loop.js owns timing and simulation updates.
- js/renderer.js draws the original canvas artwork and handles resizing.
- js/enemies.js handles enemy creation, Stevie, projectiles, and eraser attacks.
- js/balance.js centralizes HP tuning, regeneration returns and combat sustain budgets.
- js/chapters.js selects and versions four chapter background pages.
- js/notebook.js banks persistent scraps and applies purchased next-run perks.
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
unlocks stop appearing once acquired, and Helmet stop appearing at
their caps. Repeated Pocket Rocks adds damage without slowing improved throws.

## Late-wave pressure and new enemies

Waves 2–5 keep their original spawn timing; wave 1 is softened in the chapter tuning pass. Later waves ramp smoothly toward
3× the old spawn rate at wave 20, with 4-second surges every 12 seconds and
up to 28% faster movement. Seeded 60-second arrival checks measure wave 14
at 131 spawns (previously 59), wave 15 at 145 (61), and wave 20 at 235 (75)
before the later chapter-group additions and before splits. These measure arrivals, not guaranteed concurrent enemies.
Normal enemies are capped at 180 concurrent actors; required bosses can still
spawn, once per wave. The chapter tuning section below describes the current
upgrade economy and enemy HP scaling.

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

Cannon Ink (Blast + Repulsion) launches ordinary monsters for 0.85 seconds;
INFERNO (Fire + Blast + Repulsion) sends them farther for 1.05 seconds.
A rotating, lifted body and shrinking ground shadow show the arc. Landing
positions stay on the paper, clear of Stevie by his radius + monster radius +
75px, with room for the HUD and bottom controls. Landings deal 16 + 3 per
Repulsion level physical damage and stun for 1.2 seconds; INFERNO uses 26 +
3 per level and 1.6 seconds. Bosses resist launches. Explosion fatalities still
finish their flight before registering the kill; wave cleanup waits for them.
Pause freezes flight, and resizing translates the trajectory and rechecks its
landing. Reduced motion removes body rotation and scaling.

Napalm Scribbles now leaves real four-second animated fire trails along a
broken Fire + Blast wall, including between the endpoints of two-point strokes.
Grounded enemies touching them acquire burning at 10 + 4 per Fire level DPS;
INFERNO raises that by 25%. Overlaps use the strongest patch, never add damage,
and fire immunity applies. Trails are bounded to 12 patches / 65 samples each,
with 16 landing dust rings, and reset on wave/menu transitions. Status ornaments
only draw for monsters still present, preventing fire on removed bodies.


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

The supplied Save Stevie song loops in chapter 1 after starting a run.
The splash and later chapters have their own songs; see the soundtrack section
below. The **♫**
button mutes/resumes it and saves the choice on this device. Wave changes within a chapter and
menus keep its song playing; hiding the tab pauses it and returning resumes
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


## Notebook Scraps (first progression layer)

Open **Back of the Notebook** from the splash screen, defeat/victory screens,
or Your Build. The six permanent perks show current and next effects, rank
caps, prices, and a preview of your next starting kit. Purchases are available
outside an active run and apply on the next new run; they stack with run
upgrades. Continuing Endless uses the current run's kit.

Scraps are banked immediately: 1 per 25 kills (at most 8 per run), 1 per
cleared wave, plus 6/8/10/12 for the four campaign chapter clears and 5 for
campaign victory. Boss kills no longer pay a separate reward. Contact removals earn
nothing. A defeat with zero earnings gives 1 consolation scrap. Quitting keeps
already banked earnings. Each run's kill counter starts fresh.

| Permanent perk | Bonus per rank | Rank cap |
| --- | --- | --- |
| Bigger Starting Tank | +20 starting/max ink | 5 |
| Fresh Pencil | +8 starting wall HP | 4 |
| Lunchbox Band-Aids | +8 starting/max Stevie HP | 4 |
| Pocket Pebbles | +3 starting rock damage; 1.5/1.4/1.3s throw interval | 3 |
| Lunch Money | +1 starting reroll | 2 |
| Lucky Eraser | +2 starting Luck | 4 |

Ranks cost 5, 12, 24, 40, and 60 scraps where available. Fresh runs start with
160 ink, 5 ink/s regeneration, 65 wall HP, 8 wall damage/s, 75 Stevie HP,
and no starting rerolls or rocks. Each wave reward still grants a free reroll.
The chapter difficulty pass described below adds enemy scaling and limits
runaway sustain. These remain initial tuning values, not a promise of a
particular failure wave.

Progress uses `saveStevieNotebookV1` in localStorage on this browser/site origin;
it does not sync across devices. Existing best-wave and preference keys are
preserved. Invalid values are sanitized and rank caps enforced. If saving is
blocked, progression continues for the visit and the notebook explains that
it is temporary.

Validation includes earnings/double-payout protection, prices/caps,
next-run stacking/reset, save/reload, blocked storage, and existing combat
checks. Browser checks covered 1280×900, 393×851, 360×640, and 851×393 layouts,
purchase locking, images, reload persistence, and pause restoration. A seeded
opening-wave smoke run using a simple closed-barrier redraw strategy cleared
with 15 HP under the new kit versus 100 HP under the previous kit; live runs
will guide subsequent balance adjustments.

To repeat the optional screen checks with Playwright and Chromium installed:
`node tests/browser-notebook.cjs`. Pass a packaged site directory as the first
argument to check deployment output. No HTTP server is required for this test.

## Distinct midgame bosses

Wave 5 keeps King Doodle-Doom. Wave 10 now spawns **Staple Snack** (stapler):
when a wall is within 110px it shows an orange target line for 1.2 seconds,
then deals 65 damage to that wall if it is still present and within 125px.
It waits 5 seconds after each slam. Slams never damage Stevie directly.

Wave 15 spawns **Count Crayon** (crayon): after a 1.2-second purple-ring
warning, it summons up to three Niblets and waits 8 seconds before its next
wind-up. Summons obey the existing enemy cap. Freeze/stun cancels either
boss's wind-up and delays its retry. Both retain ordinary movement, wall bites,
contact damage, status tinting, and the chapter-clear scrap milestones; Void
Ink and Event Horizon damage them rather than instantly erasing them.

Both have original transparent doodle sprites, compendium entries, and grouped
wave-start introductions. Wave 20 keeps The Big Rub-Out; other endless boss
waves use King Doodle-Doom. Chapter-ending campaign waves have no timer and clear when the boss is defeated. Run `node tests/validate.cjs` for combat checks and the optional
`node tests/browser-bosses.cjs [packaged-site-directory]` for desktop/phone
artwork, introductions, live warning rendering, and compendium checks.


## Resetting progression for testing

**Back of the Notebook → Reset game progress** asks for confirmation before
clearing this browser’s scraps, permanent perk ranks, best-wave record, and
current run. It returns to the splash screen with a fresh starting kit.
Cancelling keeps everything. Music and monster-intro preferences are retained.
A storage failure displays an error rather than resetting only the visible
session. The confirmed reset is the explicit exception to preserving records.


## Four illustrated paper chapters

The arena uses original paper backgrounds from `assets/art/backgrounds`:
Margin Mischief (waves 1–5), Pop Quiz Panic (6–10), Crayon Catastrophe (11–15),
and Detention: The Final Draft (16–20). Chapter metadata is centralized in
`js/chapters.js`; wave-clear screens show the current name/range. A new run
returns to chapter 1; Endless retains chapter 4.

Backgrounds use a cached CSS update when the chapter changes, outside canvas
rendering and combat state. Images use anchored nine-slice corners and a quiet stretched middle for
portrait/landscape devices, and keep a quiet pale center for readable enemies
and ink effects. Paper/grid layers remain underneath if an image cannot load.
Asset URLs use the deployment build version. The background system itself has no gameplay, reward,
collision, difficulty, or music effects; chapter tracks are selected by the music system.

Run `node tests/browser-chapters.cjs [packaged-site-directory]` with Playwright
and Chromium for the optional desktop/phone asset, switching, reset, wave-clear
label, and missing-art fallback checks. The normal validation also checks
chapter boundaries and unchanged combat/randomness.


## Chapter difficulty tuning

`js/balance.js` holds the tunable values. Enemy HP interpolates between
1× / 1.2× / 1.9× / 2.8× / 4× at waves 1 / 5 / 10 / 15 / 20, then adds 0.18×
per endless wave. Enemy contact damage and existing surge/speed formulas stay
unchanged. Wave 1 delays its first arrival to 1.5s and uses a 2.7s spawn gap.
At 20s and 40s elapsed, later chapters add small groups from alternating sides,
using only already-introduced monster types and respecting the 180-enemy cap.

Boss waves have no countdown and clear immediately when their boss is defeated,
including endless boss waves. Boss contact damages Stevie but does not remove
the boss. Regular waves stop scheduled arrivals at zero seconds and require
clearing the remaining monsters before rewards appear.


Quick Refill adds `2 / (1 + 0.4 × prior picks)` ink/s. Bottomless Pen still adds
120 max ink, with `4 / (1 + 0.4 × prior picks)` ink/s. Living Fountain Pen
multiplies regeneration by `1 + 0.35 / (1 + 0.5 × prior picks)`. Extra parallel
walls retain full damage but have 60% of the primary wall's durability.
Current totals and upgrade-stack explanations reflect these formulas.

Combat healing shares a 6 HP/s refill budget, kill refunds share 8 ink/s, and
kill repairs share 12 wall HP/s across all walls. Each budget holds up to one
second of reserve for immediate bursts, refills only during active combat,
and resets on a new wave. Only actual healing/refunds/repairs consume reserve;
full health/ink/walls waste none. Combat healing cannot revive Stevie.
First Aid and between-wave recovery are outside the combat healing budget;
active Patchwork drawing repairs remain separate. Existing ink damage,
synergies, upgrade art, and purchased Notebook perks are retained.

A full campaign pays 61 scraps for clears/milestones/victory, plus up to 8
kill scraps (69 total). Defeat without earnings still gives 1 consolation scrap.
Stored scraps, ranks, preferences, and records are unchanged.

Validation covers HP anchors, spawn groups/caps, boss overtime and early
kills/contact, shared budgets, paused refill/death protection, regeneration
formulas, parallel durability, and scrap caps/milestones. The optional
`node tests/browser-difficulty.cjs [packaged-site-directory]` checks overtime,
Build/upgrade text and Notebook earnings on desktop and phone viewports.
A seeded closed-barrier opening smoke test survived with 33 HP versus 15 HP
under the previous spawn timing; later balance still needs human playtests.


## Chapter soundtrack

The supplied MP3 files are copied unchanged. **Play intro music** on the splash
screen explicitly enables its calm theme; browsers never need to autoplay.
Starting a run uses the original Save Stevie song for waves 1–5. Pop Quiz Panic,
Crayon Catastrophe, and Detention: The Final Draft begin at waves 6, 11, and 16.
Each loops at 35% volume. Same-chapter waves and menus retain playback position;
chapter changes start the new song at zero, using one audio element. Endless
keeps chapter 4; resetting game progress returns to the intro song.

Mute remains device-local under `saveStevieMusicMuted`; muted chapter changes
stay muted. Explicitly playing intro music enables sound. Hidden tabs pause
and resume their current song on return. Rejected play requests leave gameplay
usable; the note button retries. Stale play promises cannot overwrite a newer
track or mute action. Track URLs carry the build version, with `preload=none`.
See `assets/audio/README.md` for file names and durations. The optional
`node tests/browser-music.cjs [packaged-site-directory]` verifies native MP3
playback and chapter selection on desktop and phone-sized browsers.

## Animated splash scene

The splash reuses Stevie’s four-column/two-row sprite sheet for idle, blink and
throw poses. A small CSS rock arc is synchronized with his throw and the
sniper’s reaction. The grunt shifts, the splitter bounces, the fire wiggles,
and the pencil retraces the ink barrier in a six-second loop. Its SVG motion
path references the actual barrier, with the pencil tip anchored to the same
progress as the ink reveal, so alignment scales with the scene. Buttons remain
stationary. These decorative CSS animations never use combat state, random
numbers, or another JavaScript frame loop. Animation playback pauses when
startOverlay is hidden; prefers-reduced-motion disables movement, leaves the
full barrier visible, and hides the decorative rock. The sprite sheet is
versioned by the site build like other images.

The optional `node tests/browser-splash.cjs [packaged-site-directory]` checks
animation playback/pause, existing sprite loading, keyboard controls, layout
on desktop/phones, and the reduced-motion scene.


## Drawing tools and effect slots

Paid strokes need at least 6 ink and cost at least 6 ink, even for short marks.
Long strokes stop at the distance the available ink can afford. Quick Sketch's
one free stroke per wave and Freehand's finite bank still work at zero ink.

Buy **Your Drawing Tool** ranks with scraps in Back of the Notebook. The Pencil
starts with two effect slots; rank 3 becomes a Mechanical Pencil (two slots),
rank 6 a Simple Pen (three), and rank 10 a Scented Sharpie (four). Existing
Notebook purchases and best-wave records keep their save keys. Tool purchases
apply on the next run; effect levels reset each run.

Ink families and Death Ink occupy effect slots. Picking an equipped
effect levels it up. When slots are full, picking a new effect asks which old
effect to replace and allows cancellation. Replacement loses that effect's
levels and removes its bonuses and inactive synergies. Health, capacity,
regeneration, geometry, and other utility upgrades do not consume slots.
Rewards favor equipped effects; the reward and Build screens show the tool,
slot levels, and active synergies.

Ten percent of new campaigns reserve one legendary offer on a randomly chosen
reward wave from 1–19. Short runs may end before that wave. Rerolling a legendary
offer gives it up; Luck, Chaos, extra choices, boss rewards, and Endless cannot
add more legendary offers. This is a probability per campaign, not a guaranteed
every-tenth-run schedule. Luck still improves the other rarity odds.

A completed campaign banks 61 scraps for wave clears, chapter milestones and
victory, plus up to 8 kill scraps. Browser storage is device/origin specific;
blocked storage is reported in the Notebook. `node tests/validate.cjs` checks
full campaign payout and reload persistence. With Playwright and Chromium,
`node tests/browser-tools.cjs [packaged-site-directory]` checks drawing at zero
ink, reward replacement/cancellation, tool layout and artwork, synergies,
campaign payouts, purchases, and reloads on desktop and phone-sized viewports.


## More doodle personality

Grunts and Gnawers chomp when they actually hit a wall; Fast and Mini lean and
skitter as they travel. Bouncers compress on ricochet and stretch while bouncing.
Sprinters crouch during their existing dash warning and lean into the dash.
Staple Snack lifts during its wall-slam wind-up, then squashes with a clack.
Count Crayon rocks through its summoning ritual and pops upward when minions
appear. The Eraser leans into a short swipe when it removes a wall.

These reuse the original sprites with small transforms and short comic pen
marks. Presentation records live outside combat state and consume no randomness;
colliders, movement, attack timing and damage stay unchanged. Pause freezes the
poses, freeze/stun suppress special motion, and reduced motion keeps neutral art.
No new image assets, particles, sprite canvases or tint combinations are needed.

Run `node tests/validate.cjs` for combat/event and animation regressions. The
optional `node tests/browser-enemy-animation.cjs [packaged-site-directory]`
checks real attack triggers, changing canvas pixels, desktop/phone rendering,
pause, freeze/stun and live reduced-motion changes with Playwright/Chromium.


## Illustrated notebook interface

The Notebook wallet and scrap summaries use a custom transparent torn-paper
scrap collectible. Illustrated toolbar buttons, drawing/defending/upgrading
stickers, paper tape and quiet splash doodles share the existing notebook palette.
The tool purchase card shows your current drawing instrument. Text labels and
keyboard focus remain visible, and the splash keeps its animated characters.
Short phone landscapes use compact sticker rows to keep all menu controls in view.

See `assets/art/ui/README.md` for artwork details. The site packager now versions
local PNG/SVG references in CSS as well as HTML resources, so new interface art
refreshes together with the deployment. The game still needs no dependencies.
Run `node tests/validate.cjs`; the existing optional `browser-splash.cjs`,
`browser-notebook.cjs`, and `browser-tools.cjs` suites check the affected screens.

The Options page saves music and future sound-effects volumes independently of
Notebook progress (`saveStevieAudioV1`). Music volume updates during playback;
sound-effects volume is a saved preference until effects are added. Options also
exposes monster introductions and the changelog. Stats shows saved best-wave and
scrap records alongside the current run; it does not invent lifetime run history.
Both screens pause gameplay and restore the previous pause state when closed.

Rewards now show the drawing tool with equipped sockets and synergies. Each card
compares the current value with its next-pick value, including diminishing ink
regeneration bonuses. Inspect tool opens the full build without consuming a
reward. The original two-socket pencil is in `assets/art/tools/slot-pencil.png`.
The splash's SVG pencil anchors its actual graphite point to the ink path.
`node tests/browser-options-workbench.cjs` checks the new screens and saved
preferences at desktop and three phone viewports; pass a packaged site directory
as the optional argument to check deployment output.

Stevie leaves a small personal note on victory and defeat. The message reflects
his strongest currently equipped effect (catalog order breaks ties), with
fallbacks for utility-only builds and encouragement based on the reached wave.
Notes are presentation only: no random draws, progression changes, or new save
keys. Their entrance animation follows the device's reduced-motion preference.
Run `node tests/browser-stevie-notes.cjs` for desktop/phone end-screen checks.


## Reward rarity and levels

Rarity belongs to the offered card, rather than the upgrade itself: Common adds
1 level, Uncommon 2, Rare 3, and Legendary 4. Every effect, including Blast,
can be offered in any tier. Rare Blast starts at level 3; Legendary Poison
adds four levels to your existing Poison. Utilities do not consume effect slots.
Double Stroke, Triple Stroke, Quick Sketch, Loaded Deck, Collector and Greedy
Goblin remain one-time unlocks. Armor, stun and reroll inventory caps still apply;
cards show the actual usable level gain near a cap.

Normal rewards start at 72% Common, 20% Uncommon and 8% Rare; Luck and Chaos
shift rolls upward. Boss cards are Rare, except for a reserved Legendary card.
One Legendary offer remains reserved in 10% of campaigns, independent of Luck.
Rerolls cannot recreate it. Offers never repeat an upgrade on the same screen.
Regeneration applies diminishing returns separately for every granted level.
Bottomless Pen grants 40 capacity and initially 2 regeneration per level,
Fortress Geometry 50% closed-wall durability, Death Ink 5 wall damage/s, and
Stevie Has Had Enough 15 rock damage plus faster throws (0.28s floor). These
are initial tuning values; campaign difficulty still needs human playtesting.

Stevie’s notes use locally bundled Patrick Hand, licensed under the SIL Open
Font License in `assets/fonts/OFL-PatrickHand.txt`; no remote font service is used.

## Plaguefire pools and scorched paper

Fire + Poison now creates Plaguefire ground pools when a defeated enemy is
both burning and poisoned. This replaces the old nearby-enemy poison spread;
ordinary Fire and Poison keep working. Fire- or Poison-immune enemies cannot
seed pools. Contact removal still grants no kill effects.

Each pool grows from a 9px to 38px radius over ten active-combat seconds. Its
per-second damage is `4 + 2 × Fire level` fire plus `3 + 1.5 × Poison level`
poison, captured when dropped; each type respects enemy immunity. Overlapping
pools use the strongest damage per type rather than stacking. Pools hurt
monsters, including bosses, but do not hurt Stevie or walls. Up to 12 live
pools can exist; further drops are ignored until a pool burns out.

Procedural pencil outlines, green bubbles and orange/green flames animate the
pool. During its final 0.8 seconds it reveals a ragged, dark hole with charred
paper rims and exposed fibers. Holes are decorative, remain on the current
page (up to 24), and reset with the next wave or new run. Effects translate
with the arena on resize. Pause and information/reward screens freeze combat
and animation; reduced motion removes bubble/flame movement while retaining
accurate growth and burnout. No new dependencies or external artwork are used.

Run `node tests/validate.cjs` and, with Playwright/Chromium,
`node tests/browser-plaguefire.cjs [packaged-site-directory]`. The browser suite
checks real death triggers, changing canvas pixels, pause, live reduced-motion
changes, burnout, resizing and fresh-wave reset at desktop and phone sizes.

## Manual rewards for playtesting

Open **Options → DEV MODE** to choose an upgrade and its rarity on each wave's
reward screen. The dropdown includes every currently available effect and
utility; the preview shows its full gain. Select Common (+1), Uncommon (+2),
Rare (+3), or Legendary (+4), then take the preview card. Normal effect slots,
replacement/cancellation, stat caps and one-time unlock rules still apply.
Boss rewards also allow manual choices. Enemy behavior and combat still play
normally; this bypasses reward randomness rather than all combat randomness.

DEV MODE is session-only and defaults off after a reload. Enabling it during
an existing run marks that run as a dev run. Dev runs earn no further Notebook
scraps or best-wave records; turning it off does not make a modified run ranked.
Turn it off and start a new run to resume normal rewards and saved progress.
A small banner identifies dev runs. Your existing saves and permanent perks
remain available and unchanged by dev rewards.

All four drawing-tool tiers now use matching socketed artwork, with live effect
icons in the illustrated sockets. See `assets/art/tools/README.md`. Run
`node tests/browser-dev-tools.cjs [packaged-site-directory]` with Playwright and
Chromium for manual reward, record protection, artwork and responsive checks.

## Gravity, Vampire and Frost support pass

These effects now provide a useful role from level one. Their tuning and
per-enemy timers live in `js/support-inks.js`; the same tuning supplies reward
previews and Tool descriptions.

- **Gravity:** pulls to the nearest actual wall segment at `60 + 10 × level`
  px/s, within `min(240, 140 + 15 × level)` px. Boss pull strength is 60%.
  Collision checks keep monsters outside intact walls. Caught monsters count
  as contacting the wall, bite it 30% slower, and take extra damage of
  `min(40%, 12% + 4% × level)`. Breaking/removing the wall or replacing Gravity
  releases the vulnerability. Inward arrows and a purple hold ring show it.
- **Vampire:** deals `5 + 3 × level` life-drain damage/s during wall contact,
  and heals Stevie for 25% of damage actually dealt. Full health still gets
  damage and fang-pulse feedback. Overkill and dead enemies grant no extra
  healing; drain cannot revive Stevie. All healing shares the existing 6 HP/s
  budget. Healing droplets and hearts use the existing bounded animation.
- **Frost:** applies `min(65%, 25% + 5% × (level − 1))` slow on contact. Chill
  builds over `max(0.45, 1.2 / (1 + 0.18 × (level − 1)))` seconds into a guaranteed
  freeze lasting `min(1.2, 0.65 + 0.08 × (level − 1))` seconds. Boss freezes last
  half as long. A 1.5-second thaw recovery precedes the next charge; off-wall
  chill fades. Frost immunity prevents its slow and freeze. A cyan charge ring
  leads into the existing ice crystals. Frozen/stunned monsters cannot bite
  walls, but still receive wall contact damage and effects.

Animations consume no combat randomness, pause with combat, translate on resize,
reset on fresh waves and respect reduced motion. At most 24 monsters receive
support ornaments and eight drain pulses can coexist. Existing synergies remain
active; early predictable freezes help Cryoshock/Thermal Shock, Gravity exposure
boosts damage against held targets, and healing synergies share the sustain cap.

`node tests/validate.cjs` includes a seeded 15-second single-barrier encounter:
no effect deals 98.6 damage and takes 435 wall damage; level-one Gravity deals
131.54 damage and takes 360 wall damage; Vampire deals 197.2 and heals 24.65 HP;
Frost retains 98.6 damage while taking 360 wall damage. These demonstrate the
solo roles in that encounter, rather than proving full-campaign balance.
Run `node tests/browser-support-inks.cjs [packaged-site-directory]` for real
combat, animation, pause, reduced-motion, preview and resize checks.

Electric includes brief Shock in the same slot. Every source and chained target
shares a hit cooldown (1.15s, diminishing to a floor of 0.8s), including rock
and Chaos triggers. Damage starts at 3 + 1.2 × effective level; levels above
six contribute 35% of a full damage level. Each jump keeps 72% of the previous
hit's damage. Base chains gain a jump every three levels, up to six; synergies
cap at eight jumps. Base hop reach caps at 190px, synergy reach at 220px, and
all targets stay within 360px of the original source. Shock caps at 0.18s,
with a separate 1.25s recovery; bosses halve its duration. Electric fields use
smaller diminishing level gains, and overlapping Tesla cages do not stack.
Lightning uses bounded staggered hand-drawn bolts and orbiting status sparks;
Plaguefire scars expose honey-colored scratched school-desk grain beneath
charred paper edges. These visuals do not consume combat RNG.

Development now uses fresh feature branches from `main`, with pull requests
for review and merge. Remaining ink animations include
Repulsion shove trails, Chaos result bursts, Death Ink skull pulses, Fire embers,
Poison drips, and Void fragments. Contact accents are presentation-only, capped
at 16 active effects and throttled to one per monster/type every 0.35 seconds.

Remaining ink balance: Repulsion pulses after each 0.8 seconds accumulated
contact, dealing 8+4L physical damage and safely pushing 35+5L pixels away
from Stevie, with a 0.12s stagger. Bosses halve push/stagger. Void deals
4+2L damage/s and executes non-bosses below min(30%,12%+2.5%L) maximum HP;
immunity blocks both. Chaos rolls after each max(0.45,1.4/(1+0.18(L-1))) seconds
contact, adds 2+L impact damage and triggers a working level-scaled effect
from all nine other inks. Charge persists between wall touches per monster;
new enemies start empty. Timers use elapsed contact time, not frame-count
probabilities. Existing Event Horizon bonus remains separate.

Death Ink keeps +5 wall DPS/level and adds min(40%,16%+4%L) physical
damage against enemies starting the hit at half HP or below, including bosses.

In the seeded 15-second single-barrier level-one comparison, baseline dealt
98.6 damage and lost 435 wall HP; Repulsion dealt 110.4 and lost 180 wall HP;
Void dealt 172.55; Chaos dealt 211.15; Fire dealt 172.4 and Poison 163.02.
The 10,000-HP target never reached Void's execute threshold. Chaos results
vary with its rolled effects; this scenario does not establish campaign balance.
`tests/browser-ink-balance.cjs` checks actual pulses/execute/rolls and all four
updated rarity previews at desktop and phone sizes.

Boss encounters now use `js/boss-encounters.js`. Waves 5/10/15/20 (and later
five-wave milestones) spawn one required boss after two seconds without normal
arrivals. Defeating it clears the wave immediately and clears summons/hazards;
contact cannot resolve it. Neighbors 4/6/9/11/14/16/19/21 receive three small
pairs at 12/28/44 seconds, respecting the normal enemy cap rather than moving
an entire boss-wave crowd into one burst.

Bosses choose reachable orbit/probe waypoints using wall collision checks.
A closed drawn wall enclosing a boss grants 35% damage exposure. Enclosed
bosses target nearby walls for escape. Enclosure is a reward, not a mandatory
win condition. Boss contact deals 10 damage before armor every 1.2 seconds
and attempts a safe retreat. All casts warn for 1.2 seconds and freeze/stun
cancels them. Normal attack recovery is 4.5 seconds; below 40% HP it is 3.2.

The wave-5 King uses the projectile-return fight described below. Later endless
Kings retain three aimed ink shots or two Niblets, with six living owned summons
maximum. Staple Snack alternates safe charges (60 nearby
wall damage, 80 in its final phase) and three/five staple fans. Its final phase
can queue a separately warned second charge. Count Crayon cycles red damage,
blue ink-drain and green hatch runes, plus crayon volleys. Runes warn another
1.2 seconds, last five seconds total, and are canceled by drawing a wall through
their center. Red deals 4 HP/s before armor; blue drains 4 ink/s; green hatches
two Niblets at the rune. Its final phase paints two runes. The Big Rub-Out swipes
only walls within 130px for 65/90 damage, or clears burn/poison and fires crumb
shots when no wall is nearby. Swipes and cleaning give 1.5/2-second exposed
recoveries. Boss shots deal 6 damage before armor, travel at 125px/s, and respect
wall cover. Active runes cap at eight; enemy shots cap at 32 for boss volleys.

Procedural warnings, charge trails, color strokes, swipe dust, recovery rings,
and distinct staple/crayon/crumb/ink projectiles advance with combat, preserve
pause and resize, and respect live reduced-motion preferences. Monster cards
and the in-game changelog explain the encounters. Unit and desktop/phone browser
checks cover each boss; campaign difficulty still needs human playtesting.

Intro music attempts autoplay on page initialization, respects saved mute and
volume, and retries blocked playback on the next pointer/key gesture. Explicit
music/start controls retain their own handlers to avoid duplicate toggles.

The refuge now uses one complete transparent illustration,
`assets/art/paper-fort.png`, instead of repeated ball sprites. Its outer footprint
is 112×104px, with 18px rounded collision
corners, centered 4px below Stevie so his full-size portrait stays visible.
The thin folded-paper walls have mismatched corner towers, bent battlements and
tape patches, with lined/grid paper, colored scraps and scruffy pencil doodles. Contact uses nearest-point distance to the rounded rectangle; no
extra health or changes to armor, cover, projectile hitboxes or rewards.

Sound effects use the eleven user-supplied recordings converted to 32 kHz mono
PCM WAV in `assets/audio/effects/` (about 380 KiB together). Leading silence is
trimmed, peaks are reduced toward -6 dBFS with boost capped at 12 dB, long
scribbles are clipped to 0.8 seconds, and tails fade for 25 ms. The two supplied rock files contain identical audio, so impacts alternate
with a subtle fixed 0.97/1.03 pitch variation; scribbles cycle five recordings without consuming combat RNG.

`js/sound-effects.js` unlocks Web Audio on a gesture, loads/decodes samples once,
and skips unavailable events rather than queueing late noises. Scribbles use
quiet 0.28-second grains only on actual pencil travel and stop on release.
Successful wall creation uses the pencil drop; real rock collisions, wall
damage, lightning casts (once per cast, not per hop), and monster kills have
their own cues. Six total voices, group caps and short cooldowns limit crowd
noise; higher-priority cues can replace scribbles. Effects have a separate
master volume and mild compressor. Pauses/menus, hidden tabs, defeat, wave
clear and fresh waves stop active effects. Unsupported audio or missing files
leave gameplay functional. The Options Effects slider applies live and persists.

Use a fresh descriptive branch from current `main` for each new change, push
it, then open a PR into `main` for review/merge. Continue on the same branch
for revisions to an open PR. If PR API access is unavailable, provide a
prefilled GitHub compare link for the user to create the PR.

Triple Stroke is a Legendary-only one-time unlock. Ordinary Common/Uncommon/
Rare pools and fallback offers exclude it; the reserved Legendary pool includes
it. DEV MODE locks its rarity to Legendary, and application rejects lower-tier
Triple Stroke cards. Other special unlocks keep their existing rarity behavior.

Regular waves stop scheduled arrivals at zero seconds and continue combat until
no living enemies remain. Boss waves begin with the same timed combat and
cleanup. A 2.4s paper-edge warning precedes the boss, then the countdown hides
for the untimed encounter. Portrait bosses use top/bottom entrances and start
at least 220px from Stevie. Defeating the boss clears its summoned minions. Effect animation uses a
separate elapsed clock so it continues throughout untimed fights and cleanup.

Drawing tools have distinct presentation-only wall strokes: broad scratchy graphite
for Pencil, finer graphite for Mechanical Pencil, crisp ink for Simple Pen, and
dense marker ink for Scented Sharpie. Preview and completed walls share the same
renderer. A faint full-width graphite band preserves the visible contact footprint;
wall thickness, durability, ink cost and effect attachments retain their gameplay
values. Grain is cached, capped and deterministic without consuming combat RNG.

Wave 5 receives 3× HP and wave 10 retains 1.8× HP. The first King moves at
144.612 px/s (1242 HP); Staple Snack keeps 40.28 px/s (1402.2 HP), before
existing movement modifiers. The King's three attacks use 0.95/0.75s normal/furious warnings and
1.65/1.05s cooldowns (furious below 40% HP);
Staple Snack retains 3.5/2.5s normal/furious cooldowns and 110/150 wall-damage
charges. Enclosure caps waiting at 1.8s and triggers a 1.2s warned breakout.
Freeze/stun interrupts casts, and proper enclosures retain 35% extra damage.
Later bosses retain their previous tuning. Sir Pew-Pew now moves at 78 base
px/s, searches clear firing positions 90–260px from Stevie, and detours around
open wall ends without crossing walls or Stevie’s fort. Closed cages still trap
him. Losing sight or being frozen/stunned resets at least 0.65s of aim warning;
clear shots retain their 1.7s interval. Route searches are cached between steps.

Pause opens a paper menu with Resume, Settings, Tool, Monster notes and Return
to main menu. Submenus opened from Pause return there on Close/Escape. Leaving
requires confirmation, saves already-earned scraps without an extra quit reward,
and preserves permanent ranks and best-wave records. The cover menu and bottom
pencil tray share paper styling; phone controls retain at least 44px height.

The main-menu pencil uses measured SVG path lengths: the nib transform and both
graphite stroke reveal offsets share a single progress value. Each 18-second
cycle draws for 3.6s after a 1.2s lead-in. The existing scribble mixer plays quiet
grains only during drawing, after audio gesture unlock, and respects effects
volume, hidden tabs, open dialogs and reduced motion. Combat audio stays gated.

Chapter backgrounds use a CSS nine-slice layer (`#chapterPaper`) behind the
transparent combat canvas. The original 18% corner slices scale to 80–112px, with
the edges and quiet middle filling the remaining space. The layer starts below
the HUD; gameplay dimensions and input coordinates remain unchanged.

Closed Loop and Fortress Geometry retain their individual durability bonuses and
share utility progression based on their combined levels. Level one refunds 15%
of actually paid ink, repairs 15% of missing HP on existing walls inside/touching
the completed loop, and boosts all damage to enclosed enemies by 10%. Gains
diminish toward 35% refund / 30% missing-HP repair / 25% damage. Completion repair
shares a cap of half the ink actually paid; free/banked ink and copied strokes
produce no extra rewards. Damage overlaps apply once and use the stronger of
loop utility and boss enclosure/recovery exposure. A short deterministic pulse
and ink popup mark paid closure; reduced motion shows a static fading outline.

Bosses tear through strokes crossing their body without triggering wall-break
explosions. A closed perimeter must clear the boss body by eight pixels to earn
35% exposure damage. After 1.8s enclosed, a 1.2s warned breakout tears the
perimeter open; its brief recovery remains vulnerable. Shared boss damage is
limited to max(30, 4.5% of maximum HP) per second with half a second of burst
capacity, so overlapping sources cannot instantly kill an encounter boss.

Rock upgrades start at +4/+6/+12/+8 damage for Pocket Rocks/Better Rocks/Really
Good Rocks/Stevie Has Had Enough. Later levels grow to the previous +9/+12/+24/
+15 gains. Faster throwing has gentler gains and floors of 0.65/0.55/0.45s.
Pocket Rocks starts at a 1.6s interval and preserves already faster throws.

The native Android layout fills portrait and landscape displays without the
web page's side gutters or desktop size caps, retaining device safe-area insets.

Stevie has 50 end-of-run notes: 30 for defeat and 20 for victory. The two decks
rotate independently, save their next position under `saveStevieNoteDecks`, and
keep the same message if an ending is rendered again. Previewing notes never
changes state or consumes combat RNG. Without storage they rotate for the current
session. His handwritten signature now includes a little pencil doodle.

Scribble Gribble uses `assets/art/grunt-animations.png`, a custom 640×640
transparent sprite sheet assembled from sixteen illustrated poses. Its first
eight 160×160 cells form a walking cycle; the last eight form a crouch, fist-raise,
yell, slam, squash and stomp tantrum triggered by actual wall bites. Feet share
a baseline and all frames retain the same art scale. Frames are cropped once on
load and status tints use the existing bounded cache. Walking stops at rest,
freeze/stun holds the sprite, pause stops animation, and reduced motion uses a
static frame. Missing artwork falls back to the original monster drawing.
Combat colliders, attack cadence, damage and rewards are unchanged.

Validation: `node tests/validate.cjs`, `tests/browser-stevie-notes.cjs` and
`tests/browser-enemy-animation.cjs` cover note variety/persistence, real wall
contact, distinct rendered sprite frames, desktop/phone layouts, pause,
freeze/stun, reduced motion and cosmetic RNG isolation.

The first boss rotates three moves: one large Mirror Orb, a twin Arc Fan, and
two Paper Bomb lobs (three below 40% HP). Orbs/sparks launch sideways and follow quadratic paths to
Stevie's position at launch. Warnings show those same curves. Any living wall
returns one orb/spark automatically toward its owner and breaks that wall; reflected shots pass through
walls and only hit that boss. A large orb deals 6.5% maximum HP and each spark 2.5%,
with +2.5% return damage per ink level, capped at +30%. Returns bypass the ordinary
boss damage budget and open a 1.25-second recovery (+35% ordinary damage),
shown by a tilted body, stars and an EXPOSED badge. Outside recovery/enclosure,
his guard reduces both ordinary damage and its budget to 25%. Body strokes get torn away outside the return
opening; during recovery he stops tearing and attacking walls so damage inks
can work. Proper enclosures and warned breakouts continue to work.

Returns do not cancel an already-warned attack. Large orbs hit Stevie for
14/18 HP and sparks for 9/11 HP (normal/furious), before armor.
Paper Bomb targets lock during the 0.95/0.75s warning. They favor existing cover away
from Stevie's center; their subsequent 1.5s lob damages walls within 46 pixels
for 160/220 HP and never damages Stevie. Projectile movement substeps and swept
collisions enforce first-wall/player ordering; walls behind Stevie cannot return
an already landed hit. Shots cap at 32 and trails at 12 points, respect pause and
resize, and disappear with their owner. Artwork is procedural pencil/paper motion
with static reduced-motion equivalents and no render RNG.

Validation includes all three moves, real returns and exact damage, locked/safe
lobs, pause/death/resize, all four boss browser checks and Android packaging.
Full fights with the starting kit and paid defensive strokes finish in roughly
92–110 seconds in desktop, portrait and landscape simulations. These checks
establish that the fight is winnable; human playtests will guide further tuning.

Android now starts with the native layout already applied in its bundled HTML,
uses edge-to-edge paper with no browser gutters or arena borders, and overlays a
52dp pencil tray instead of reserving a separate toolbar row. The redundant
browser Fullscreen control is hidden. HUD, dialogs and controls use the maximum
of WebView safe-area values and Capacitor's injected CSS insets, avoiding double
padding while keeping them clear of cutouts. Chapter-paper footer art ends above
the tray so its doodles stay visible. SystemBars is explicitly configured hidden
at startup (its default could show bars after the activity's hide call), and the
native bridge hides them again on foregrounding. Transient swipe access remains.

Settings → **Test a wave / boss** opens the scratch-page setup. Choose a wave
(1–200), Full wave or Boss only, a drawing tool, and upgrade entries with rarity
and copies (1–25). The four boss shortcuts select waves 5/10/15/20 in Boss-only
mode. Boss-only starts with a visible boss and skips both the timed fight and
off-page approach. Wave 21+ uses Endless scaling. Permanent Notebook stat bonuses
are optional and off by default; the selected test tool supplies its real slot
count independently of the saved tool rank.

Starting builds use the same `applyUpgrade` helper as reward picks, including
one-time unlocks, caps, rarity levels and synergies, without advancing the wave.
Preflight rejects invalid waves, lower-tier Triple Stroke, duplicate one-time
unlocks and effect-slot overflow before replacing the live run. The setup warns
that a test replaces the current run; already banked scraps remain intact.
**Repeat last test** rebuilds the same selected setup with full HP/ink. Setups
remain session-local. Test runs stay unranked even if manual rewards are later
disabled; starting a fresh normal run restores the saved Notebook loadout.

`tests/browser-test-lab.cjs` checks actual setup controls, full-display canvas,
cutout-safe HUD/tray, rotated layouts, boss/full-wave starts, repeated builds and
protected records at desktop and phone sizes. `tests/validate.cjs` also checks
atomic rejection, genuine upgrade application, optional perks and normal reset.
Native system-bar behavior should be playtested with a newly built Android app;
updating GitHub Pages does not update an installed Android bundle.


The title and Pause menus use `assets/art/ui/menu-scrap.png`, custom transparent
hand-torn notebook-paper artwork, with actual readable labels in the
same Stevie Pencil font as his notes. Individual slips use small fixed rotations;
hover motion respects reduced-motion preferences. Phone portrait/landscape and
native Android layouts keep controls reachable by scrolling within the menus.
The title's **My notebook** opens Monsters, the drawing tool, permanent scraps,
Settings, Stats and What's new. Closing these pages returns to My notebook;
closing the notebook returns focus to its title-screen button.

The live toolbar now contains only **Pause/Resume** and web **Screen**. Native
Android keeps its existing immersive display and only shows Pause. Tool,
Monster notes and Settings are in Pause; Erase walls and the music mute toggle
also live there. Resume restores the run. Quit still warns that run upgrades are
lost and earned scraps remain saved. Updated browser menu, notebook, tool,
options and Android test-lab checks exercise these actual navigation routes.
