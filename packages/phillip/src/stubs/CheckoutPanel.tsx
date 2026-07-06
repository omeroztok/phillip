import { m, useReducedMotion } from "motion/react";
import { containerVariants, itemVariants } from "../overlay/motion";
import type { Offer } from "../types/boot";
import { formatPrice } from "./payment";

export function CheckoutPanel({
  offer,
  busy,
  onPay,
  onCancel,
}: {
  offer: Offer;
  busy: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <m.div
      className="iteration"
      variants={containerVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <m.div className="iter-label" variants={itemVariants(reduce)}>
        here's what's included
      </m.div>
      <m.ul className="checkout-includes" variants={containerVariants(reduce)}>
        {offer.includes.map((x) => (
          <m.li key={x} variants={itemVariants(reduce)}>
            {x}
          </m.li>
        ))}
      </m.ul>
      <m.div className="iter-actions" variants={itemVariants(reduce)}>
        <button type="button" className="qr" onClick={onCancel} disabled={busy}>
          not yet
        </button>
        <button type="button" className="iter-submit" onClick={onPay} disabled={busy}>
          {busy ? (
            "opening…"
          ) : (
            <>
              make it live · <span className="tnum">{formatPrice(offer)}</span>
            </>
          )}
        </button>
      </m.div>
      <m.div className="iter-note" variants={itemVariants(reduce)}>
        stripe checkout is stubbed in v0, this simulates a successful payment.
      </m.div>
    </m.div>
  );
}
