# Scoring framework — Alpha 0.1.34

All score awards go through `js/scoring.js`. Kill rewards come from the real
`killEnemy` path, which rejects duplicate removal. Contact deaths, escaping
Sneaky scouts, erased arrows, tutorials and passive damage do not award kills.

## Initial rules
Normal kill: 10 base points. Boss kill: 100 base points.

Measure distance from the enemy's edge to the rounded fort boundary. The first
24 pixels add no bonus. After that, distance increases continuously to 3× over
35% of the shorter playable dimension (minimum 80 pixels). This avoids rewarding
a desktop's extra horizontal space with larger maximum points. The limit is 3×
on every screen; placement and enemy size matter. No combat RNG is consumed.

Each kill starts/refreshes a four-second active-combat streak. The 3rd kill gets
1.25×, the 6th gets 1.5×, and the 10th gets 2×; that is the cap. Actual damage to
Stevie breaks the streak. Hitting walls does not. A new wave resets the streak.
Pause, tutorials, choices, boss entrances, finale and repair scenes freeze time.

Round base × distance to an integer first, then multiply by the streak and round
again. Keep an exact ledger of base, distance bonus and streak bonus, rather
than trying to estimate attribution later. Example: 10 base × 3 distance × 2
streak = 60 points (10 base + 20 distance + 30 streak).

Existing clear bonuses stay unchanged: 100 survival + 10 per wave kill + up to
75 each for remaining ink and HP. The scorecard distinguishes those clear
rewards from points already earned by individual kills. `waveScore` remains the
clear bonus; the full wave scorecard includes both kill and clear awards.

## Feedback and persistence
A small score/streak tracker replaces per-kill floating score labels. The streak
bar shows remaining active time. Pause explains rules and the last kill's math.
Wave, defeat, victory and Stats views show exact ledgers and best streak.
Personal best is saved on defeat or wave-20 victory, separately from best wave.
Abandoning a run does not record a personal best. Dev/test runs never save one.
Backups include the new score record; older backups without it preserve the
current device's score record. Active run ledgers are not backed up.

## Balancing and later extensions
These are initial values, not a final balance pass. Tune the centralized values
against real desktop/mobile runs. Distance scoring is an incentive to defend
farther out, not proof that compact enclosures are no longer effective.
Streaks naturally favor dense waves and strong builds. Watch boss-add farming,
endless duration, and kill counts inflated by split enemies before introducing
shared leaderboards. Scores before this ruleset are not directly comparable.
DPS, damage-source contribution, skill bonuses for deflection/erasing, and
separate ranked challenges remain future work. Do not change damage or ink
regeneration as part of score tuning.
