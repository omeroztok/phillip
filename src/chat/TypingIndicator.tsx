import { type Variants, m } from "motion/react";
import type { Persona } from "../types/boot";

// Three dots breathing in sequence. A genuine ambient loop, so it stays as a
// motion repeat rather than a one-shot — interruptible and reduced-motion aware
// via MotionConfig at the root.
const dot: Variants = {
  animate: (i: number) => ({
    opacity: [0.25, 1, 0.25],
    y: [0, -3, 0],
    transition: {
      duration: 1.2,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
      delay: i * 0.2,
    },
  }),
};

// A them-side bubble with the tail, matching a Phillip message that's about to
// arrive. No avatar (frameless, like the bubbles).
export function TypingIndicator({ persona }: { persona: Persona }) {
  return (
    <div className="msg phillip">
      <div className="typing" aria-label={`${persona.name} is typing`}>
        {[0, 1, 2].map((i) => (
          <m.span key={i} custom={i} variants={dot} animate="animate" />
        ))}
      </div>
    </div>
  );
}
