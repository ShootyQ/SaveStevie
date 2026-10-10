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
- [ ] Design Legendary notes the player likes. Rejected ideas are excluded; no Legendary notes can currently drop.
- [ ] Playtest late-run combinations and repeated notes for clarity, strength and pickup pacing; tune after feedback.

The entrance cleanup and checked note/control items ship together in this unmerged patch. Other entries remain queued design and playtest work.
