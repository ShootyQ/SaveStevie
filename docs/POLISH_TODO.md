# Save Stevie polish queue

Current player feedback: a wave-14 run feels good overall. Pew Pew and Rubble Ruff create recognizable reactions; too many other enemies still feel like straightforward runners. Wobblechomp remains an Alpha fight. Doodle Scraps are a promising starting point.

## Wobblechomp first

- [x] Clear all existing walls during his entrance roar, before phase-one combat. Include copied walls and lingering wall effects; avoid triggering explosions, refunds or rewards from the cleanup. Direct boss tests clear old cover too. Alpha 0.1.18.
- [ ] Reproduce phase two with Blast Ink, Fire Ink, Double Stroke and their combinations. Player clarification pending: repeated turns, explosions while riding, or visual clutter?
- [ ] Try a fresh rail setup at the phase-two transition. Explain the infinite well, longer-side direction rule and spiky-foot objective before rolling starts.
- [ ] Consider treating a drawn stroke and its copies as one rail family: completing a ride consumes the family so a parallel copy cannot immediately catch him again. Preserve the player's upgrade value elsewhere.
- [ ] Separate useful element interactions from visual noise. Current ordinary damage is already blocked in phase two; consumed rails still call wall destruction effects, while copies remain separate rails. Do not remove the player's entire ink build without testing an alternative.
- [ ] Check phase-two readability on touch, with high-level ink effects and dense walls. Detached-foot hits should remain the obvious source of boss progress.

## Make small enemies demand different decisions

- [ ] Audit each enemy introduced through wave 14: threat, tell, preferred counter, movement pattern, and what makes the player react differently.
- [ ] Preserve Pew Pew's projectile-return identity and Ruff's erase pressure.
- [ ] Prioritize stronger versions of existing identities: Dash builds momentum; Boingus searches for an escape during three bounces; Sir Chonkus gains wall-breaking power while waddling; Twicey separates coordinated roles.
- [ ] For later enemies, favor recognizable approach/attack patterns and clear counters over additional HP or speed. Avoid making every monster a wall-ignoring exception.
- [ ] Playtest mixed groups: threats should complement each other without drowning out tells.

## Doodle Scraps prepared for Alpha 0.1.18

- [x] Stack notes and duplicate copies for the run without spending wave reward slots. Capture owned effects on each throw; bound repeated control, extra shots and decoys.
- [x] Per-wave budgets: 25% zero, 40% one, 25% two, 10% three. Timed enemies in boss waves remain eligible; bosses and helpers do not drop scraps. Budget is rolled once; discoveries need eligible kills and at least 10 combat seconds between drops.
- [x] Fourteen individual scrapbook designs in one transparent sheet, with readable tier labels and phone-sized choices.
- [x] Six Commons: Hot Off the Page, Static Scribble, Questionable Lunch, Cold Shoulder, Correction Notice, Long Distance Learning.
- [x] Two Uncommons: Second Draft and Follow the Underline.
- [x] Four Rares: Static Cling, Ash Impostor, Bubble Trouble and Cross Out.
- [x] Two Epics: Connect the Dots and Bad Influence. Draw a completed stroke through two marked monsters to tether them; ash decoys can carry owned paper elements without generating recursive decoys.
- [x] Rarity offers: Common 55%, Uncommon 28%, Rare 13%, Epic 4%. Both distinct choices have the revealed tier. Repeat notes remain eligible and stack.
- [x] Expand the Markdown, JSON and Excel references with the actual note catalogue and mechanics.
- [x] Desktop WASD aims ordinary paper throws while held; release for auto-aim. Touch remains automatic. Left eraser is the default on a new touch installation, with the saved side preference preserved.
- [x] Alpha 0.1.19: five approved Legendary paper-ball notes at 0.3% per discovery: Round Trip, Extra Credit, Wallflowers, Carbon Copy, Extra Ink. Epic discoveries now occupy 3.7%. Seven new custom scrap illustrations.
- [x] Uncommon Split Decision adds one generation per copy, with fractional physical damage and inherited notes. Rapid Scribble adds uncapped additive 5% throw speed per copy.
- [x] Static Cling sticks regular monsters together into slow sparking clusters instead of stunning them on walls.
- [x] Extra Credit hops on every hit within 90px and gains +1 physical damage per copy per hit; it waits for new targets. Round Trip orbits until the victim dies; orbit laps do not split again.
- [x] Carbon copies launch straight from wall sides for double physical damage, inherit notes and cannot carbon-copy again. Wallflowers can reuse paper while supporting walls survive.
- [x] Extra Ink repairs nearby walls completely, extends open ends, and refunds 5 ink per note copy per hit. Growth preserves lifetime, creates no reclaimable paid ink and stays on the page.
- [ ] Playtest late-run combinations and repeated notes for clarity, strength and pickup pacing; tune after feedback.

Alpha 0.1.18 is merged. Alpha 0.1.19 adds the checked paper-ball behaviors in a new review branch. Other entries remain queued design and playtest work.

## Late-game drawing clarity — Alpha 0.1.22

- [x] Retire Double Stroke, Triple Stroke and their parallel-wall synergies; keep paper-ball duplication.
- [x] Space element decorations along walls with a maximum of eighteen per wall; longer strokes repeat icons less densely.
- [ ] Playtest the single-wall change before compensating with durability or ink. More ink may make circle spam stronger.
- [ ] Prototype drawing over existing walls as repair rather than overlapping layers. Keep intentional crossings useful and make the preview clear.
- [ ] Give shapes distinct jobs rather than a universal damage bonus: triangles deflect, squares organize space, circles contain.
- [ ] Explore clearly warned local breaches and patching, enemy tosses over walls, and outward Niblet split landings. Preserve reaction time and avoid unavoidable damage near Stevie.
- [ ] Profile actual late-game runs: rendering, collision segments and effect queries may all contribute to slowdown.
