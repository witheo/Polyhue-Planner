import type { CSSProperties } from 'react';

/** Decorative doodle face (blinking eyes + smile). Purely visual: no pointer events, hidden from AT. */
export function CardFace({ accent }: { accent: string }) {
  return (
    <svg
      className="ph-card__face"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ '--ph-face-accent': accent } as CSSProperties}
    >
      <circle className="ph-card__face-eye" cx="8" cy="9.5" r="1.6" />
      <circle className="ph-card__face-eye ph-card__face-eye--right" cx="16" cy="9.5" r="1.6" />
      <path className="ph-card__face-smile" d="M6.5 14.5 Q12 20 17.5 14.5" />
    </svg>
  );
}
