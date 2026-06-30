import { m, useReducedMotion } from "motion/react";
import type { Message as Msg } from "../intent/types";
import { messageVariants } from "../overlay/motion";
import { BubbleTail } from "../ui/icons";

// A single iMessage-style bubble. No per-message avatar (iMessage doesn't show
// one), and `tail` is true only on the last bubble of a consecutive run — the
// tail is a self-contained SVG colored to the bubble, so it reads on any
// background (we float over the vignette, not a card).
export function Message({ message, tail }: { message: Msg; tail: boolean }) {
  const reduce = useReducedMotion() ?? false;
  // One-shot entrance only — driven off mount, never re-triggered as a Phillip
  // message streams in token-by-token. Variant labels are inherited from the
  // Conversation parent so the list staggers; we don't set initial/animate here.
  const variants = messageVariants(reduce);

  if (message.role === "system") {
    return (
      <m.div className="msg system" variants={variants}>
        <div className={message.error ? "msg-bubble error" : "msg-bubble"}>{message.text}</div>
      </m.div>
    );
  }
  return (
    <m.div className={`msg ${message.role}${tail ? " has-tail" : ""}`} variants={variants}>
      <div className="msg-bubble-wrap">
        {/* Tail lives inside the bubble (like the simulator) so it hangs below
            and insets from the corner. */}
        <div className={message.error ? "msg-bubble error" : "msg-bubble"}>
          {message.text}
          {tail ? <BubbleTail className="msg-tail" /> : null}
        </div>
      </div>
    </m.div>
  );
}
