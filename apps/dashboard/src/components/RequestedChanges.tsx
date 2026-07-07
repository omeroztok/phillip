import { m, useReducedMotion } from "motion/react";
import type { RequestedChange } from "../data/sample";
import { relativeTime } from "../lib/analytics";
import { container, item } from "../motion";

const STATUS_LABEL: Record<RequestedChange["status"], string> = {
  pending: "pending",
  applied: "applied",
  failed: "didn't take",
};

const STATUS_TONE: Record<RequestedChange["status"], string> = {
  pending: "b1",
  applied: "b5",
  failed: "danger",
};

export function RequestedChanges({ changes }: { changes?: RequestedChange[] }) {
  const reduce = useReducedMotion() ?? false;

  if (!changes || changes.length === 0) {
    return <p className="transcript-empty">No changes requested yet.</p>;
  }

  return (
    <m.ul
      className="changes-list"
      variants={container(reduce, 0.045)}
      initial="initial"
      animate="animate"
    >
      {changes.map((c) => (
        <m.li key={c.id} className="changes-row" variants={item(reduce)}>
          <span className="changes-text">“{c.text}”</span>
          <span className={`badge tone-${STATUS_TONE[c.status]}`}>
            <span className="badge-dot" />
            {STATUS_LABEL[c.status]}
            {c.appliedVersion ? ` · v${c.appliedVersion}` : ""}
          </span>
          <span className="changes-time tnum">{relativeTime(c.createdAt)}</span>
        </m.li>
      ))}
    </m.ul>
  );
}
