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

## Expand Doodle Scraps / Doodle Notes

- [ ] Add a Range note for Stevie's paper-ball targeting/throw reach, with a visible explanation of its benefit.
- [ ] Stack collected note effects during a run instead of replacing the equipped element. Define same-element repeats and interaction order; keep end-of-wave ink reward slots separate.
- [ ] Replace current drop behavior with a per-wave budget. Proposed interpretation of the requested odds: 75% at least one, 35% at least two, 10% three; equivalently 25% zero, 40% one, 25% two, 10% three. One planned wave count avoids repeatedly rolling until every wave guarantees three. Confirm when implementing; decide boss-wave handling separately.
- [ ] Create 7–8 custom scrap-paper pickup variations in the notebook art style, with clear element/rarity marks that remain readable on phones.
- [ ] Add Common, Uncommon, Rare, Epic and Legendary notes. Higher tiers should change behavior and create new decisions, not simply add +2 of an existing effect.
- [ ] Design and review tiered effects before coding them. Starting directions: electric static cling to drawn walls; fire decoys; poison bubbles that can be erased; frost changes to movement; eraser interaction tricks; range/trajectory opportunities. These are ideas, not implemented or approved final effects.
- [ ] Explain stacking and rare effects when discovered. Distinguish permanent saved scraps from run-only Doodle Notes.
- [ ] Update the upgrade reference/workbook when the note catalogue actually changes.

Only the checked entrance item ships in this patch. The remaining entries are queued design and playtest work.
