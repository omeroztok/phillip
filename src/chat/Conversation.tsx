import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef } from "react";
import { usePhillip } from "../core/PhillipProvider";
import type { Message as Msg } from "../intent/types";
import { staggerChildren } from "../overlay/motion";
import { Message } from "./Message";
import { TypingIndicator } from "./TypingIndicator";

// Parent only orchestrates timing; it has no visual change of its own. Children
// (Message) inherit the "initial"/"animate" variant labels and resolve them
// from their own variants, so the whole list staggers in together on open and
// each newly-appended message rises in on arrival.
const listOrchestration = {
  initial: {},
  animate: { transition: { staggerChildren } },
};

// The floating transcript — bubbles stacked over the vignette, no box. Bottom-
// anchored and grows upward; the top edge fades (CSS mask) so older messages
// dissolve into the page. A bubble shows its tail only when it's the last of a
// consecutive run from the same sender (iMessage behavior).
export function Conversation({ messages, streaming }: { messages: Msg[]; streaming: boolean }) {
  const { config } = usePhillip();
  const persona = config.persona;
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  const showTyping = streaming && last?.role !== "phillip";

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll on any new content
  useEffect(() => {
    // optional-call: jsdom (tests) has no scrollIntoView
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, showTyping]);

  return (
    <m.div className="convo" variants={listOrchestration} initial="initial" animate="animate">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => {
          const next = messages[i + 1];
          // Tail on the last of a run; the typing indicator after a Phillip
          // message means that message isn't visually "last" yet.
          const tail = !next || next.role !== msg.role;
          return <Message key={msg.id} message={msg} tail={tail} />;
        })}
      </AnimatePresence>
      {showTyping ? <TypingIndicator persona={persona} /> : null}
      <div ref={endRef} />
    </m.div>
  );
}
