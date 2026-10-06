# Save Stevie soundtrack

All five MP3s are user supplied and copied unchanged, including embedded cover
art. They are packaged with the static site; no external music service or
runtime library is needed.

| File | Screen / waves | Duration | Bytes |
| --- | --- | --- | --- |
| save-stevie-splash.mp3 | Splash (explicit Play intro music tap) | 117.432s | 2,831,677 |
| save-stevie.mp3 | Margin Mischief, 1–5 | 83.472s | 2,038,528 |
| pop-quiz-panic.mp3 | Pop Quiz Panic, 6–10 | 73.992s | 1,834,490 |
| crayon-catastrophe.mp3 | Crayon Catastrophe, 11–15 | 129.240s | 3,239,229 |
| final-draft.mp3 | Detention: The Final Draft, 16–20 / Endless | 86.424s | 2,014,829 |

One audio element loops the selected track at 35% volume. Chapter transitions
switch its source and start at zero; waves and menus within a chapter retain
position. Mute is saved under saveStevieMusicMuted. Hidden tabs pause/resume;
playback failures cannot block the game and the music button can retry.
Track paths use the deployment build version. The splash track starts only
from a user gesture. MP3s use preload=none instead of downloading all songs
at startup. Resetting progress returns to the splash song while retaining mute.
