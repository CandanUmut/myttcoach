/*
  Our own icon set. One grid (24×24), one stroke (1.75, round caps and joins).
  The ball is the only filled shape, so it reads as "the ball" everywhere.
*/
import type { JSX } from 'preact';

export type IconName =
  | 'today' | 'plan' | 'learn' | 'session' | 'library' | 'progress' | 'settings'
  | 'footwork' | 'serve' | 'spin' | 'match' | 'goal'
  | 'play' | 'pause' | 'next' | 'prev' | 'check' | 'close' | 'back' | 'forward'
  | 'plus' | 'minus' | 'search' | 'info' | 'journal' | 'timer' | 'speaker' | 'speakerOff'
  | 'watch' | 'edit' | 'repeat' | 'milestone' | 'download' | 'upload' | 'move' | 'netball'
  | 'camera' | 'flame' | 'lock' | 'sound';

const Ball = ({ cx, cy, r = 2 }: { cx: number; cy: number; r?: number }) => (
  <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
);

const paths: Record<IconName, JSX.Element> = {
  // Table seen from above: surface, net across, centre line, ball
  today: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="M12 4v16" />
      <path d="M3 12h18" stroke-dasharray="1.5 2" stroke-width="1.25" />
      <Ball cx={16.5} cy={8.8} r={1.4} />
    </>
  ),
  // Calendar grid with a ball in one cell
  plan: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M8 13.5h.01M12 13.5h.01M8 17h.01M12 17h.01" stroke-width="2.4" />
      <Ball cx={16.2} cy={15.4} r={1.9} />
    </>
  ),
  // Paddle, upright
  learn: (
    <>
      <g transform="rotate(32 12 12)">
        <ellipse cx="11" cy="8.2" rx="6.3" ry="6" />
        <path d="M9.4 14v4.8a1.6 1.6 0 0 0 3.2 0V14" />
      </g>
      <Ball cx={19.2} cy={4.8} r={2} />
    </>
  ),
  // Ball bouncing on the floor
  session: (
    <>
      <path d="M3 7.5c3.2-2.5 5.6 2.5 7 12 1.4-4.5 3.4-7 5.6-7.6" stroke-dasharray="1.6 2" />
      <path d="M3 20.5h18" />
      <Ball cx={18.4} cy={11.6} r={2.2} />
    </>
  ),
  // Multiball basket
  library: (
    <>
      <path d="M3.5 11h17l-2.2 9H5.7z" />
      <path d="M5 14.5h14M9 11l.6 9M15 11l-.6 9" stroke-width="1.25" />
      <circle cx="8.5" cy="7.6" r="2.2" />
      <circle cx="15.6" cy="7.9" r="2" />
      <Ball cx={12.1} cy={5.6} r={2.2} />
    </>
  ),
  // Rising ball arc over a net
  progress: (
    <>
      <path d="M3 20.5h18M13 20.5v-6" />
      <path d="M3.5 18C6 10 10.5 6.5 16 6.8" stroke-dasharray="1.6 2" />
      <Ball cx={18.6} cy={7.2} r={2.1} />
    </>
  ),
  // Ply layers that double as sliders
  settings: (
    <>
      <path d="M3 6.5h18M3 12h18M3 17.5h18" />
      <circle cx="8" cy="6.5" r="2.2" fill="currentColor" />
      <circle cx="15.5" cy="12" r="2.2" fill="currentColor" />
      <circle cx="10.5" cy="17.5" r="2.2" fill="currentColor" />
    </>
  ),
  // Two footprints
  footwork: (
    <>
      <path d="M7.6 21.5c-1.5 0-2.4-1.1-2.3-2.8l.3-3.9c.2-2.3 1-4.3 2.6-4.3s2.4 2.1 2.3 4.3l-.3 3.9c-.1 1.7-1.1 2.8-2.6 2.8z" />
      <path d="M5.4 8.4h.01M7.6 7.6h.01M9.8 8.4h.01" stroke-width="2" />
      <g transform="translate(0 2.4)">
        <path d="M16.4 14.3c-1.5 0-2.4-1.1-2.3-2.8l.3-3.9c.2-2.3 1-4.3 2.6-4.3s2.4 2.1 2.3 4.3l-.3 3.9c-.1 1.7-1.1 2.8-2.6 2.8z" />
        <path d="M14.2 1.2h.01M16.4.5h.01M18.6 1.2h.01" stroke-width="2" />
      </g>
    </>
  ),
  // Ball toss from an open palm
  serve: (
    <>
      <path d="M2.5 16.5h5c1.3 0 2.2-.5 3.2-1.3h9a1.4 1.4 0 0 1 0 2.8h-6.2" />
      <path d="M2.5 20.3h7.8c1.6 0 2.7-.8 3.3-2.3" />
      <path d="M10.7 15.2l1.9-2.4a1.1 1.1 0 0 1 1.8 1.3l-.9 1.1" />
      <path d="M16 12.3V9.3" stroke-dasharray="1.4 1.8" />
      <Ball cx={16} cy={5.4} r={2.3} />
    </>
  ),
  // Ball with spin arrows
  spin: (
    <>
      <circle cx="12" cy="12" r="4.4" fill="currentColor" stroke="none" />
      <path d="M4.2 10.2a8 8 0 0 1 10.6-5.7" />
      <path d="M12.9 2.8l2.3 1.7-1.9 2.2" />
      <path d="M19.8 13.8a8 8 0 0 1-10.6 5.7" />
      <path d="M11.1 21.2l-2.3-1.7 1.9-2.2" />
    </>
  ),
  // Scoreboard
  match: (
    <>
      <rect x="3" y="6.5" width="18" height="13" rx="2" />
      <path d="M12 6.5v13M8.5 6.5V4M15.5 6.5V4" />
      <path d="M6.8 11.2l1.4-1v6" />
      <path d="M14.8 10.2h2.6v2.9h-2.6v3.1h2.6" />
    </>
  ),
  // Target zone on the far half of a table
  goal: (
    <>
      <path d="M5 20l2.6-14h8.8L19 20z" />
      <path d="M5.9 14.5h12.2" stroke-width="1.25" />
      <ellipse cx="12" cy="9.6" rx="3.2" ry="1.9" />
      <ellipse cx="12" cy="9.6" rx="1.3" ry="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="2.4" />,
  next: (
    <>
      <path d="M5.5 6l8 6-8 6z" />
      <path d="M18 6v12" stroke-width="2.2" />
    </>
  ),
  prev: (
    <>
      <path d="M18.5 6l-8 6 8 6z" />
      <path d="M6 6v12" stroke-width="2.2" />
    </>
  ),
  check: <path d="M5 12.5l4.3 4.3L19 7.2" stroke-width="2.2" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke-width="2" />,
  back: <path d="M14.5 5.5L8 12l6.5 6.5" stroke-width="2" />,
  forward: <path d="M9.5 5.5L16 12l-6.5 6.5" stroke-width="2" />,
  plus: <path d="M12 5v14M5 12h14" stroke-width="2" />,
  minus: <path d="M5 12h14" stroke-width="2" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" stroke-width="2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" stroke-width="2" />
      <path d="M12 7.6h.01" stroke-width="2.6" />
    </>
  ),
  journal: (
    <>
      <path d="M6 3.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z" />
      <path d="M6 3.5v17M3.5 7.5H6M3.5 12H6M3.5 16.5H6" />
      <path d="M10 8.5h5.5M10 12h4" stroke-width="1.25" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 13.5V9.8M10 2.8h4M18.4 6.6l1.4-1.4" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />
    </>
  ),
  speakerOff: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </>
  ),
  sound: (
    <>
      <path d="M4 12h2l2-5 3 10 3-12 3 9 1.5-2H20" />
    </>
  ),
  // Eye shaped like a ball's seam for "watch the move"
  watch: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <Ball cx={12} cy={12} r={2.6} />
    </>
  ),
  edit: (
    <>
      <path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.9 0l.3.3a2 2 0 0 1 0 2.9L8.7 18.5z" />
      <path d="M13.8 7l3.2 3.2" />
    </>
  ),
  repeat: (
    <>
      <path d="M4.5 11.5V10a3.5 3.5 0 0 1 3.5-3.5h11" />
      <path d="M16 3.5l3 3-3 3" />
      <path d="M19.5 12.5V14a3.5 3.5 0 0 1-3.5 3.5H5" />
      <path d="M8 20.5l-3-3 3-3" />
    </>
  ),
  // Small flag on the net post
  milestone: (
    <>
      <path d="M6 21V3.5" />
      <path d="M6 4.5h11l-2.5 3.5L17 11.5H6" />
      <path d="M3 21h9" />
      <Ball cx={16.5} cy={18} r={2} />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  move: (
    <>
      <rect x="3.5" y="5" width="11" height="11" rx="2" />
      <path d="M3.5 8.8h11M7 3.2v3.4M11 3.2v3.4" />
      <path d="M14 18.5h6.5M17.8 15.8l2.7 2.7-2.7 2.7" />
    </>
  ),
  // Ball caught in the net: "something's wrong?"
  netball: (
    <>
      <path d="M3 20.5h18" />
      <path d="M8 20.5v-9h8v9" />
      <path d="M8 14.5h8M8 17.5h8M10.7 11.5v9M13.3 11.5v9" stroke-width="1" />
      <Ball cx={6.2} cy={7} r={2.1} />
      <path d="M8.5 5.5c2-2.2 5-2.5 7.5-1" stroke-dasharray="1.4 1.8" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="7" width="18" height="12.5" rx="2" />
      <path d="M8.5 7l1.5-2.5h4L15.5 7" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  flame: (
    <path d="M12 21c-3.6 0-6.2-2.5-6.2-6 0-3.8 3.3-5.8 3.8-10 2.4 1.6 3.4 3.7 3.4 5.6 1-.6 1.8-1.7 2-3 1.9 1.8 3.2 4.3 3.2 7.2 0 3.6-2.6 6.2-6.2 6.2z" />
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
};

export function Icon({
  name,
  size = 24,
  class: cls,
  label,
}: {
  name: IconName;
  size?: number;
  class?: string;
  label?: string;
}) {
  return (
    <svg
      class={`icon${cls ? ` ${cls}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
    >
      {paths[name]}
    </svg>
  );
}

export const allIcons = Object.keys(paths) as IconName[];
