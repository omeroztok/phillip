import { m, useReducedMotion } from "motion/react";
import { type FormEvent, useState } from "react";
import { containerVariants, itemVariants, press } from "../overlay/motion";
import { isValidEmail } from "./escalation";

export function EscalationPanel({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (email: string) => void;
  onCancel: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const [email, setEmail] = useState("");
  const valid = isValidEmail(email);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !busy) onSubmit(email.trim());
  };

  return (
    <m.form
      className="iteration"
      onSubmit={submit}
      variants={containerVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <m.div className="iter-label" variants={itemVariants(reduce)}>
        drop your email and a colleague picks it up, usually within the hour
      </m.div>
      <m.div className="composer bare" variants={itemVariants(reduce)}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          aria-label="email"
          autoComplete="email"
        />
        <m.button type="submit" disabled={!valid || busy} aria-label="send email" whileTap={press}>
          ↑
        </m.button>
      </m.div>
      <m.div className="iter-actions" variants={itemVariants(reduce)}>
        <button type="button" className="qr" onClick={onCancel} disabled={busy}>
          back
        </button>
      </m.div>
    </m.form>
  );
}
