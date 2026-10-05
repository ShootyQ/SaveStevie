# Save Stevie soundtrack

`save-stevie.mp3` is the user-supplied **Save Stevie.mp3**, copied unchanged.
MP3 audio duration: 83.472 seconds; file size: 2,038,528 bytes. The original
upload includes embedded cover art. Keep the track with the static deployment.

The game starts the song from a player tap, loops it at 35% volume, and remembers
mute under `saveStevieMusicMuted`. Switching waves or opening menus does not
restart it. Background tabs pause the audio; returning resumes it. Playback
failure leaves gameplay usable and the note button can retry. The site build
versions the MP3 URL alongside scripts and artwork. No third-party audio service
or library is required.
