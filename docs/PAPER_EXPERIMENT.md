# Opening-chapter paper experiment

Baseline: commit `3727f39` (Alpha 0.1.31), saved and pushed as
`backup/paper-per-wave-alpha-0.1.31`.

The baseline starts fresh paper each wave and shows numeric wear percentages.
This experiment carries scuffs, remaining durability and holes across consecutive
waves 1–5, removes the numeric wear display, and refreshes the sheet at wave 6.
Later waves keep their per-wave resets. New runs and direct test jumps start fresh.
Ink and walls keep their existing per-wave behavior.

To undo the experiment, revert its feature commit/PR. Use the backup branch as a
reference; do not reset main to it, which would discard later unrelated changes.
