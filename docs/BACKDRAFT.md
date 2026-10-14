# Legendary Fire Ink: Backdraft

Taking Fire Ink at Legendary rarity grants its normal four levels and unlocks
Backdraft for that run. Four ordinary Fire ranks do not unlock it. Replacing
Fire Ink removes Backdraft; a new run clears it, while wave changes retain the
unlock and clear the old heat/fronts.

Each connected wall reservoir gains 0.1 heat/s passively and 0.65 heat/s per
eligible enemy in Fire-wall contact, capped at 1. Turret walls do not charge.
At 0.2 heat, player erasing can vent it. The erased spot determines the origin;
the wall normal facing away from Stevie determines the direction.

At the minimum ready swell, damage is 6 times `(3 + 3 × Fire level)`; a full
swell deals 15 times that value. For newly acquired legendary Fire (level 4),
this is 90–225 damage. Reach grows from 132 to 300 px and half-width from 39 to
95 px. The front expands over 0.35 s and fades by 0.65 s, hitting each monster
once. Fire immunity, shield protection, underground immunity and boss damage
rules apply; kills use normal defeat handling.

Venting spends the whole shared reservoir and prevents charging for 2 s.
Erased fragments share it, gain passive heat only once per frame, and cannot
release the same swell again. Enemy erasers never trigger a vent. Eight active
fronts is the rendering limit; pressure art uses at most five pockets per wall.
All time and movement stop during gameplay pauses and blocked tutorials/intro
states. Visuals do not consume gameplay randomness or mutate simulation state.
