# Save Stevie - In Development

Refactored from doodle_defender_v8.html. Open index.html directly in a modern browser. No installation or build required. Keep the folder together.

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
unlocks stop appearing once acquired, and Helmet/Shock Ink stop appearing at
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
waves use King Doodle-Doom. Chapter-ending campaign waves require surviving
the timer and removing the boss; the wave 20 finale still ends immediately when resolved. Run `node tests/validate.cjs` for combat checks and the optional
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
rendering and combat state. Images cover the arena with a centered crop for
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

Waves 5, 10, and 15 require both the timer and the boss to be resolved.
Overtime pauses normal arrivals and shows the named boss objective; boss
specials and existing enemies continue fighting. Early boss kills still require
surviving the wave. Wave 20 retains its immediate-clear final-boss rule.
Surviving a boss contact hit resolves it, preserving the contact explosion
rule; lethal contact loses the run. A required boss is ensured if it was not
spawned before time expired. Endless retains timed wave completion.

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

Ink families, Shock Ink, and Death Ink occupy effect slots. Picking an equipped
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
