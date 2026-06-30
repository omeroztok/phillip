import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { panelVariants, press, tapTransition } from "../overlay/motion";
import type { Persona } from "../types/boot";
import { Close } from "../ui/icons";

// The frameless conversation stage. No card, header, or border — just a
// bottom-right region that anchors the floating transcript and a footer
// (composer / quick replies / sub-flow card) over the vignette. A single small
// glass × is the only chrome, so the lead can dismiss back to the bubble.
export function Stage({
  persona,
  onClose,
  children,
  footer,
}: {
  persona: Persona;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <m.div
      className="stage"
      // biome-ignore lint/a11y/useSemanticElements: a floating chat surface, not a modal <dialog>
      role="dialog"
      aria-label={`chat with ${persona.name}`}
      variants={panelVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <m.button
        type="button"
        className="stage-close"
        onClick={onClose}
        aria-label="close"
        whileTap={press}
        transition={tapTransition}
      >
        <Close size={15} />
      </m.button>
      <div className="stage-scroll">{children}</div>
      {footer ? <div className="stage-footer">{footer}</div> : null}
    </m.div>
  );
}
