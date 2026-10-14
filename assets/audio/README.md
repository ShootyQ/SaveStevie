# Save Stevie soundtrack

The music MP3s are user supplied and copied unchanged, including embedded cover
art. They are packaged with the static site; no external music service or
runtime library is needed.

| File | Screen / waves | Duration | Bytes |
| --- | --- | --- | --- |
| save-stevie-splash.mp3 | Splash (explicit Play intro music tap) | 117.432s | 2,831,677 |
| save-stevie.mp3 | Margin Mischief, 1–5 | 359.880s | 8,542,904 |
| waves-6-10-a.mp3 | Waves 6, 8 and 10 (before the boss) | 249.840s | 5,910,317 |
| waves-6-10-b.mp3 | Waves 7 and 9 | 249.360s | 5,704,704 |
| crayon-catastrophe.mp3 | Crayon Catastrophe, 11–15 | 360.432s | 8,524,472 |
| final-draft.mp3 | Detention: The Final Draft, 16–20 / Endless | 359.832s | 7,929,239 |

One audio element loops the selected track at 35% volume. Chapter transitions
switch its source and start at zero; waves and menus using the same song retain
position. Waves 6–10 alternate the two supplied tracks by wave number; this
does not consume gameplay randomness. The previous chapter MP3 was removed. Mute is saved under saveStevieMusicMuted. Hidden tabs pause/resume;
playback failures cannot block the game and the music button can retry.
Track paths use the deployment build version. The splash track starts only
from a user gesture. MP3s use preload=none instead of downloading all songs
at startup. Resetting progress returns to the splash song while retaining mute.

## Additional user-supplied audio

The three chapter MP3s were replaced with the supplied `(1)` versions, copied
unchanged. Waves 1–5 use Save Stevie; 6–10 alternate the two new middle-wave songs; 11–15 Crayon
Catastrophe; 16–20/Endless retain Final Draft.

`stevie-victory.wav` (9.160 seconds) plays once immediately when a wave boss
is defeated, including Endless. It uses the music volume and saved mute,
replaces the chapter loop, and returns to that chapter when it ends. Starting
a new wave or returning to the cover selects the corresponding music instead.

New effects under `effects/`: `fire-crackle.wav` on fire-wall contact,
`frost-crackle.wav` on a successful freeze, `boss-enter.wav` when a boss
arrives, and `poison-bubble-1.wav` through `poison-bubble-4.wav` on poison-wall
contact. Bubble clips rotate deterministically without gameplay randomness.
Fire/bubbles use short 0.6-second grains; freeze uses up to 0.8 seconds.
Cooldowns, per-group caps, six total voices and effects volume apply.

Bubble source filenames: 539823/539822/539820/539819,
`ristooooo1` bubbles 001/002/003/004. Files were supplied by the user;
no source license metadata was provided with these uploads.
The bubble grains start at 2.9/5.7/1.7/0.5 seconds respectively, around audible
bursts rather than the quiet lead-ins. Original WAV files remain unchanged.

## First boss entrance

`first-boss.mp3` is the supplied First Boss (1) song (178.800 seconds), looping
only during King Doodle-Doom's wave-5 battle. `final-draft.mp3` is replaced by
Detention: The Final Draft (1), 359.832 seconds, for waves 16–20/Endless.
Both uploads are copied unchanged.

After wave 5's timed fight and survivor cleanup, gameplay freezes for the
King's side entrance. Music is suspended without changing saved mute. The
supplied `effects/first-boss-stomp.wav` plays during the 3.375-second walk-in,
then `effects/first-boss-roar.wav` during the 2.757-second roar. A 0.45-second
shockwave clears drawn walls without explosions or rewards, and the boss
battle starts with the new music. Pause freezes the sequence; interrupted
entrance sounds resume at their current position. Reduced motion removes
zooming and hopping. Returning to the menu or restarting cancels the entrance.

## Wobblechomp fight

`wobblechomp-fight.mp3` is the user-supplied **Wobblechomp Fight V5.mp3**, copied unchanged with its embedded artwork (179.040 seconds; 4,439,484 bytes). It loops during Wobblechomp’s wave-10 fight, including Scratch Page boss tests. The normal entrance keeps music suspended for the stomp and roar; the song starts when combat begins. Boss defeat switches to Stevie Victory, then the chapter music resumes. Saved mute, music volume, visibility handling and build-versioned asset paths apply as usual.

## Drawing, erasing and paper shortcuts (Alpha 0.1.76)

Ten user-supplied ElevenLabs/foley WAVs are packaged as mono 24 kHz PCM to
keep these short effects compact. Source uploads remain in the attachments.

| Runtime file | Supplied file | Trigger |
| --- | --- | --- |
| `pen-writing.wav` | PAPRFric-The_sound_of_a_pen_w-Elevenlabs | Moving pencil while drawing |
| `pencil-lift.wav` | FOLYMisc-Lifting_a_pencil_fro-Elevenlabs | Finish a drawn stroke |
| `eraser-rub.wav` | FOLYProp-eraser_on_paper-Elevenlabs | Moving eraser |
| `paper-tear-1.wav` | PAPRRip-paper_ripping-Elevenlabs | Newly opened hole |
| `paper-tear-2.wav` | PAPRRip-paper_ripping-Elevenlabs (1) | Alternate tear |
| `paper-tear-3.wav` | PAPRRip-paper_ripping-Elevenlabs (2) | Alternate tear |
| `paper-dive.wav` | monstersgoingunderpaper | Monster entering a hole |
| `paper-crawl.wav` | crawlingunderpaper | At least one monster traveling underneath |
| `paper-pop-1.wav` | popping out of hole 1 | Monster surfaces, including forced emergence |
| `paper-pop-2.wav` | popping out of hole 2 | Alternate emergence |

Writing and rubbing use one quiet looping voice each, stopped on release,
mode switches, cancellation, pause, or 0.14 seconds without movement. Crawling
uses one shared quiet voice rather than one per hidden monster. Tears and pops
rotate without consuming gameplay randomness. Existing six-voice limits,
priority mixing, effects volume, visibility and run-reset handling apply.

## Paper combat and construction (Alpha 0.1.77)

Another ten supplied WAVs use descriptive names and mono 24 kHz PCM:

| Runtime file | Supplied file | Trigger |
| --- | --- | --- |
| `paper-hit-1.wav` | paperhittingcreature1 | Paper ball hits a monster |
| `paper-hit-2.wav` | paperhittingcreate2 | Alternate paper-ball hit |
| `paper-crumple.wav` | crumplingpaperstevie | Stevie's main throw (quiet 0.55-second grain) |
| `graphite-break-1.wav` | graphite_breaking_in_#3 | Drawn wall destroyed by damage or ricochet charge |
| `graphite-break-2.wav` | graphite_breaking_in_#1 | Alternate wall break |
| `wood-impact-1.wav` | wooden_knocking_nois_#2 | Fort hit or catapult launch |
| `wood-impact-2.wav` | wooden_tapping_#4 | Alternate wooden impact |
| `catapult-build.wav` | catapultbeingassumbled | Active catapult construction |
| `turret-fire.wav` | paper_turret_firing__#1 | Successful turret shot |
| `doodle-note-appear.wav` | doodlescrap appears | Doodle Note actually drops |

Hit/break/wood variants rotate without gameplay randomness. Extra split/copy
throws skip crumpling; turret shots use their own sound. Assembly is a single
shared voice while any living, unstunned catapulter is building, stopping when
construction ends, is erased, or is interrupted. Pause, visibility, volume,
reset, priorities and six-voice limits continue to apply.

## Monster movement and wall attacks (Alpha 0.1.78)

Fourteen supplied clips are renamed and converted to mono 24 kHz PCM WAV:

| Runtime files | Supplied files | Trigger |
| --- | --- | --- |
| `chonks-step-1/2.wav` | chonkwalk1/2 | Every 18 px of Chonks walking |
| `dash-run.wav` | crashdash run | Actual running movement; one quiet shared loop |
| `dash-jump.wav` | crashdash jump | Begin a wall or crowd hurdle |
| `boing-bounce-1/2.wav` | boingusbounce1/2 | Boingus ricochets from a wall |
| `gribble-wall-1/2.wav` | scribbleatwall and (2) | Scribble Gribble attacks a wall |
| `monster-wall-1/2/3.wav` | monsteratwall and (2)/(3) | Other ordinary monsters attack a wall |
| `turret-fire-2/3/4.wav` | paper_turret_firing #2/#3/#4 | Rotate with the original turret firing clip |

Footstep distance lives outside gameplay state, resets each run, and does not
advance during Chonks' recovery or immobility. Running stops after 0.14 seconds
without actual movement. Bites/bounces/jumps trigger on actions, not rendering;
variants rotate without consuming combat RNG. Group cooldowns, caps and six
shared voices keep crowds from stacking dozens of movement and chewing clips.

Alpha 0.1.80 silences Scribble Gribble's wall-attack samples. Other monsters'
wall impacts and chewing remain. Waves 6–10 now play track A, then B, repeating
on each song's `ended` event. Wave changes preserve the current track/time;
the wave-10 boss entrance interrupts the playlist for boss music.
