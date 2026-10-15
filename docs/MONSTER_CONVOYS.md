# Smarter monster routes and convoys — Alpha 0.1.44

Sneaky plans on a 24-pixel A* grid with exact swept-body wall checks and a 5,000-node expansion budget. Routes are smoothed using the same collision checks, prefer clearance for larger recruits, and never substitute a straight line when planning fails. After three failed plans he commits to ordinary attacking instead of scouting forever. Successful third plans retain the existing commitment. Compromised directions remain visible for ten seconds, but stop recruiting and release followers. Allies join at a reachable projection along the route rather than backtracking to its beginning.

Six monsters can receive stable formation slots. Every eligible monster actually inside Chonks's shield shelter, including overflow followers, uses the leader's current movement budget. Recovery stops sheltered movement; exposed recruits catch up, and removing the shield releases the convoy without modifying anyone's native speed. His recorded movement direction guides the shield and formation without mutating navigation during rendering.

Pew-Pew still seeks a reachable clear firing position when alone. If none exists, a 0.7-second pink warning precedes an eraser-first pencil travelling at 240px/s. Its swept brush opens each intersected wall, rather than stopping or reflecting. Brush radius is Chonks's body radius plus eight pixels; convoy shots add sideways clearance for the follower's firing offset. These projectiles have a small erasable collision body, give no ink refund and never damage Stevie. A faint pink brush outline shows their wider wall-clearing reach.

After the eraser throw, Pew-Pew waits 1.5 seconds before a normal damaging pencil. Redrawing cover returns that pencil as before. Shield-convoy Pew-Pews prioritise lane clearing over repositioning and run all attack clocks 20% faster (1.25-second follow-up). Regular projectiles have enough lifetime to reach Stevie from a distant clearing shot; normal shots at the existing 90–260px range retain their two-second lifetime. Freeze/stun cancels an unthrown eraser warning and pauses the follow-up clock. Existing manual pause, projectile erasing and wave cleanup apply.
# Stealing Sneaky's directions (Alpha 0.1.47)

Erasing a dotted route removes its downstream tail and leaves a green upstream endpoint.
Followers reaching the cut hesitate for 0.65 seconds, then return to ordinary targeting. Drawing a stroke costing 15% of normal ink (including the minimum cost) from within
26 pixels of the green endpoint replaces the downstream route with green
dotted directions. The stroke becomes instructions rather than a player wall;
it cannot merge with an existing wall through Doodle Stitch.

The forged path remains inside the page. Followers obey wall collisions,
hesitate briefly at its end, and return to ordinary targeting. Sneaky notices
after four seconds with “WHO DREW THIS?!” and prepares a fresh plan. The forgery
keeps recruiting independently for twenty seconds from redraw, even if its owner
is defeated. Multiple stolen routes coexist; walls still block their followers. Forgery never removes an enemy or awards
kill/escape credit. Unmodified blocked/erased directions still retire after
ten seconds; paused game updates freeze these clocks.

## Alpha 0.1.54 pressure pass

From wave 8 onward, scheduled Gribble, Zoom Nugget, Homework Hulk and Professor Problems arrivals share a per-wave budget: every tenth ordinary candidate is skipped. Regular arrivals, relocated pairs and chapter groups all use it. First introductions bypass thinning. Direct boss-owned spawns and offspring remain outside that budget. Special enemy types retain their scheduling; waves 1–7 remain unchanged.

King Doodle-Doom's helper gap is divided by 1.2 relative to the previous rate in both health phases. His living helper cap is seven (the nearest whole count to a 20% increase from six), and every third add is a Zoom Nugget. All adds retain boss ownership and are eligible for his usual pickup/throw behavior.
