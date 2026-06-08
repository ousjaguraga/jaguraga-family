interface Props {
  className?: string;
  size?: number;
}

/**
 * Traditional African hunter silhouette — man mid-throw with a spear.
 * Used as the Jaguraga family logo throughout the app.
 */
export default function HunterLogo({ className = '', size = 40 }: Props) {
  return (
    <svg
      viewBox="0 0 68 84"
      width={size}
      height={size}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Jaguraga hunter logo"
    >
      {/* ── Head ─────────────────────────────────────────────────────────── */}
      <circle cx="44" cy="11" r="10" />

      {/* ── Torso (leaning forward into the throw) ───────────────────────── */}
      <path d="M42 21 C38 25 33 34 29 46 L37 50 C41 38 46 29 50 24 Z" />

      {/* ── Throwing arm — raised right arm gripping the spear ───────────── */}
      <path d="M48 25 C54 18 60 13 64 9 L62 5 C58 9 52 14 46 21 Z" />

      {/* ── Balance arm — left arm extended forward-low ──────────────────── */}
      <path d="M37 32 C29 27 21 25 15 28 L16 32 C22 30 29 32 38 37 Z" />

      {/* ── Spear shaft (diagonal: raised hand → lower-left → prey) ─────── */}
      <path d="M64 5 L4 38 L4 42 L64 9 Z" />

      {/* ── Spear tip ────────────────────────────────────────────────────── */}
      <polygon points="4,38 4,42 0,40" />

      {/* ── Front leg (striding forward) ─────────────────────────────────── */}
      <path d="M31 48 C36 58 42 68 46 78 L52 76 C48 66 42 56 38 47 Z" />

      {/* ── Back leg (trailing) ──────────────────────────────────────────── */}
      <path d="M27 48 C22 58 16 68 12 78 L18 80 C22 70 28 60 33 50 Z" />
    </svg>
  );
}
