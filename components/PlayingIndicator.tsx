/**
 * Per-bar animation classes: the three bars share the `equalizer` keyframes but
 * run at different durations and start offsets, so the group reads as an organic
 * audio visualizer rather than a synchronised blink.
 */
const BAR_ANIMATION_CLASSES = [
  "animate-[equalizer_0.9s_ease-in-out_infinite]",
  "animate-[equalizer_0.7s_ease-in-out_infinite] [animation-delay:150ms]",
  "animate-[equalizer_1.1s_ease-in-out_infinite] [animation-delay:300ms]",
] as const;

/**
 * Small animated audio equalizer (three amber bars) that marks the track
 * currently playing. Shared by the song list (components/SongRow.tsx) and the
 * sticky player's queue panel (components/StickyPlayer.tsx) so the "now playing"
 * affordance stays identical in both places.
 *
 * When `isPlaying` is true the bars oscillate between ~3px and ~12px; when it is
 * false they stop animating and rest at a low static height (4px), so a paused
 * track never looks like it is still playing. Decorative, so it is hidden from
 * assistive tech; callers convey the state with their own text label.
 */
export default function PlayingIndicator({
  className = "",
  isPlaying = true,
}: {
  className?: string;
  isPlaying?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-3 shrink-0 items-end gap-0.5 align-middle ${className}`}
    >
      {BAR_ANIMATION_CLASSES.map((animation, index) => (
        <span
          key={index}
          className={`h-1 w-0.5 rounded-full bg-amber-500 ${
            isPlaying ? animation : ""
          }`}
        />
      ))}
    </span>
  );
}
