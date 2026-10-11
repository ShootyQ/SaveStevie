# Shapes, ink economy and smarter play — design backlog

Recorded 2026-10-11. These are design intentions, not shipped mechanics.

## Goal
Move from rapidly spamming protective walls to making deliberate drawing and
erasing decisions against enemies with distinct roles. Build the player's
vocabulary across runs, rather than introducing everything at once. Keep the
surprise of discovering different combinations each run.

## Shape recognition and effects
- Recognize one continuous connected stroke; accept endpoints within a forgiving
  margin or an overlapping closing segment. Wonky drawing should count.
- Keep shapes small: an enclosure should fit about 2–3 ordinary monsters,
  rather than a giant circle around the fort. Exact size limits need playtesting
  on desktop and phone, including large enemies.
- Shapes cost extra ink in exchange for their effect. Show recognition and cost
  clearly before committing; avoid accidentally activating a turret when the
  player only meant to draw ordinary protection.
- Square + fire: furnace. Square + electricity: electric storm.
- Circle: small paper turret lasting roughly 10 seconds, initially one active;
  upgrades could raise the limit. Consider inheriting the player's inks.
- Triangle proposal: redirect/launch paper balls toward its tip.
- Later star unlock: targeted meteor storm, with satisfying paper visuals.
- Armor interacting with electricity is an idea, not a settled rule. Preserve a
  clear way to counter Chonkus's shield before adding elemental exceptions.

## Economy and enemy behavior
- Explore lowering ink regeneration at higher waves to discourage spam.
  Tune against permanent regen upgrades and eraser refunds; never silently
  invalidate those purchases. No numeric curve has been agreed yet.
- Ask players to consider remaining ink, let a few enemies group up, then
  enclose them deliberately. An enclosure should require ongoing decisions.
- Proposed rule: all monsters route around enclosed areas when possible.
  Resolve the interaction with already trapped enemies, support routes,
  bosses and blocked paths before implementation; avoid permanent stalemates.
- Extra durability or a larger ink pool remain possible tradeoffs, not promises.
- Unlock shapes gradually over runs. The current run's inks and notes should
  change their usefulness rather than permanently locking one build.

## Open questions to test
Recognition tolerance; activation gesture on touch; size measured in enemy
footprints rather than raw pixels; maximum simultaneous shapes; what happens
when a shape's wall breaks; escape behavior; whether the extra ink cost keeps
both ordinary walls and shapes useful. Avoid making every shape an automatic
DPS machine or rewarding only circles immediately around Stevie.

## Related scoring direction
Reward kills farther from Stevie to make high-score play different from hiding
inside a tiny fort enclosure. Add readable streak bonuses and explain where
points came from. DPS and damage-source reporting are a later task.
