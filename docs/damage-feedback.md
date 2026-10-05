# Compact damage feedback

Use small (15–19px), paper-outlined numbers instead of cards. Each enemy/type
owns a separate label that collects ticks for 0.55 seconds, lives for 2 seconds,
and fades over its final 0.5 seconds. Type-specific horizontal velocity and
upward launch velocity create distinct ballistic arcs. No combined total,
type rows, impact rays, or FINISH stamp cover the board. Lethal damage gets a
subtle one-pixel font emphasis. Debounce pulses so tiny ticks do not jitter.

Clamp rendered labels inside the playfield and try nearby empty slots. Reserve
space for the small pop scale. Limit active labels to 48 without dropping game
messages. Reduced-motion preference replaces ballistic motion with gentle
vertical drift. Rendering remains pure; motion uses simulation time and no
combat randomness. Damage values count remaining HP, not overkill.

Validate per-type aggregation, separate trajectories, color, lifetime, budget,
reset behavior, render purity, bounds and collision-free text in desktop and
phone browser scenes. Separately test one-shot monster contact, armor, no kill
rewards/split children, and final-boss survival versus simultaneous defeat.
