# Yank Doodle: wall heist

Yank's base speed is now 86px/s (previously 34px/s), before existing wave scaling. He selects the closest finished, living player wall, ignoring live strokes, Sneaky drafts, Wobble bumpers and turret walls. Sneaky's route system does not recruit him.

Within 110px he throws a visible hook: 0.65s warning, 0.7s backward haul at 145px/s, then 0.3s overhead wind-up. The wall remains live during the haul and wind-up. The worker moves backward with it, bounded away from the page edges. Wall HP, paid ink, carried charges and shape/stitch positions are preserved while dragging.

Releasing removes the whole wall from combat without damage/explosion callbacks, ink refunds or kill rewards. A bounded cosmetic copy arcs, tumbles and shrinks off-screen over 0.8s, then disappears. Flight art samples at most roughly 120 points, with at most four simultaneous copies. The worker follows through for 0.45s and waits 1.1s before hooking again.

Erase the rope at any stage before release to cancel and stun him for 1s (3s job cooldown). Freeze/stun, death, flight/underground state, losing the wall or losing reach also cancel the job. Normal wall effects and paper balls still hurt him. Turrets stay separate from stealable walls.

Custom canvas poses cover scamper, hook reach, planted backward haul, overhead wind-up and exaggerated throwing follow-through, with a growing slack hook rope, tense hauling rope and attached hand. Movement clocks advance only when actually moving; freeze/stun/reduced motion hold poses. Cosmetic drawing uses no combat RNG or simulation mutations. Flight effects pause, translate on resize and reset with the wave/run.

Alpha 0.1.89: choose the longest eligible wall with a nearest point within 260 pixels. If none is nearby, approach the nearest wall until a local candidate is available. Length uses the whole polyline, including curves; tiny nearby walls no longer automatically win.
