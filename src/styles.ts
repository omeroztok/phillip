// All widget CSS, exported as a string so it can be adopted into the shadow
// root identically across tsup, Vite, and Vitest (no CSS-loader coordination).
// Host page styles cannot reach in (shadow boundary) and ours cannot leak out;
// the `:host { all: initial }` reset also blocks inherited font/color bleed.
//
// Animation note: enter/exit motion lives in the components via the `motion`
// library (see src/overlay/motion.ts) so it stays interruptible. CSS keeps only
// genuinely ambient loops (the indeterminate spinner) plus static styling.
//
// Layout note: there is no chat "box". The conversation is a FRAMELESS stack of
// iMessage bubbles floating over the bottom-right vignette. Bubbles carry their
// own soft shadow so they read on any backdrop; the tail is a self-contained
// SVG (BubbleTail) tinted to the bubble color, so it works without a solid
// surface behind it.

export const styles = `
:host { all: initial; }
:host {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 0;
  height: 0;
  z-index: 2147483647;
}

.phillip-root {
  all: initial;
  --p-bg: #ffffff;
  --p-fg: #18181b;
  --p-muted: #71717a;
  --p-line: #ececef;
  --p-accent: #18181b;
  --p-accent-fg: #ffffff;
  --p-soft: #f4f4f5;
  --p-pop: #ff4d8d;

  /* iMessage-shaped bubbles, monochrome brand (not iMessage blue). */
  --p-them-bg: #e9e9eb;
  --p-them-fg: #1c1c1e;
  --p-bubble-radius: 19px;

  /* Frosted surfaces (composer, chips, sub-flow cards). */
  --p-glass: rgba(255,255,255,.7);
  --p-glass-blur: 22px;
  --p-glass-ring: inset 0 0 0 1px rgba(255,255,255,.55);

  /* Soft lift so bubbles + glass read over the dimmed vignette. */
  --p-shadow: 0 1px 2px rgba(0,0,0,.06), 0 8px 24px -8px rgba(0,0,0,.22), 0 24px 48px -16px rgba(0,0,0,.28);
  --p-shadow-sm: 0 1px 2px rgba(0,0,0,.1), 0 6px 16px -8px rgba(0,0,0,.28);
  --p-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;

  /* Stacking order, all within the single max z-index host. */
  --p-z-vignette: 1;
  --p-z-bubble: 20;
  --p-z-stage: 30;

  font-family: var(--p-font);
  color: var(--p-fg);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
.phillip-root *, .phillip-root *::before, .phillip-root *::after { box-sizing: border-box; }

/* Tabular figures for any value that changes in place (no width jitter). */
.tnum { font-variant-numeric: tabular-nums; }

/* --- vignette --- */
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--p-z-vignette);
  background: radial-gradient(125% 125% at 100% 100%,
    rgba(12,12,18,.34) 0%, rgba(12,12,18,.16) 30%, rgba(12,12,18,0) 62%);
}

/* --- resting bubble (closed) --- */
.bubble {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: var(--p-z-bubble);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--p-accent);
  box-shadow: var(--p-shadow);
  overflow: visible;
}
.bubble img {
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
}
.bubble-badge {
  position: absolute;
  top: 0; right: 0;
  width: 14px; height: 14px;
  background: var(--p-pop);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,.25);
}

/* --- frameless stage (open) --- */
.stage {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: var(--p-z-stage);
  width: min(384px, calc(100vw - 32px));
  max-height: min(78vh, 660px);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transform-origin: bottom right;
  will-change: transform, opacity, filter;
  /* Empty regions stay click-through; interactive children opt back in. */
  pointer-events: none;
}
.stage-close {
  pointer-events: auto;
  align-self: flex-end;
  border: none;
  cursor: pointer;
  width: 30px; height: 30px;
  border-radius: 50%;
  margin-bottom: 8px;
  color: var(--p-fg);
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  box-shadow: var(--p-shadow-sm), var(--p-glass-ring);
  display: grid; place-items: center;
}
.stage-scroll {
  pointer-events: auto;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding-top: 28px;
  /* Older messages dissolve into the page at the top instead of a hard cut. */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 60px);
  mask-image: linear-gradient(to bottom, transparent 0, #000 60px);
}
.stage-footer { pointer-events: auto; margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }

/* --- transcript --- */
.convo { display: flex; flex-direction: column; gap: 5px; }

/* --- messages (frameless iMessage bubbles) --- */
.msg { display: flex; max-width: 100%; }
.msg.lead { justify-content: flex-end; }
.msg.system { justify-content: center; }
.msg-bubble-wrap { position: relative; max-width: 82%; }
.msg-bubble {
  position: relative;
  padding: 7px 13px;
  border-radius: var(--p-bubble-radius);
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-wrap: pretty;
  box-shadow: 0 1px 2px rgba(0,0,0,.12), 0 6px 16px -8px rgba(0,0,0,.3);
}
.msg.phillip .msg-bubble { background: var(--p-them-bg); color: var(--p-them-fg); }
.msg.lead .msg-bubble { background: var(--p-accent); color: var(--p-accent-fg); }

/* Self-contained SVG tail (only on the last bubble of a run). currentColor is
   set to the bubble color; them is mirrored to hook on the left. */
.msg-tail { position: absolute; bottom: 0; width: 16px; height: 17px; }
.msg.phillip .msg-tail { left: -4px; transform: scaleX(-1); color: var(--p-them-bg); }
.msg.lead .msg-tail { right: -4px; color: var(--p-accent); }

.msg.system .msg-bubble {
  background: transparent; color: var(--p-muted); font-size: 12px;
  text-align: center; box-shadow: none;
}
.msg-bubble.error { background: #fee2e2; color: #b91c1c; }
.msg.error .msg-tail, .msg .msg-bubble.error + .msg-tail { color: #fee2e2; }

/* Reaction badge — visual slot, ready to populate later. */
.msg-reaction {
  position: absolute;
  top: -12px;
  font-size: 13px;
  line-height: 1;
  padding: 3px 5px;
  background: var(--p-bg);
  border-radius: 999px;
  box-shadow: var(--p-shadow-sm);
}
.msg.phillip .msg-reaction { right: -6px; }
.msg.lead .msg-reaction { left: -6px; }

/* --- typing --- */
.typing {
  display: inline-flex; gap: 4px; padding: 11px 14px;
  background: var(--p-them-bg); border-radius: var(--p-bubble-radius);
  box-shadow: 0 1px 2px rgba(0,0,0,.12), 0 6px 16px -8px rgba(0,0,0,.3);
}
.typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--p-muted); display: block; }

/* --- quick replies (floating glass chips) --- */
.quick-replies { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
.qr {
  border: none; color: var(--p-fg);
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  border-radius: 999px; padding: 8px 14px; font-size: 13px; cursor: pointer;
  font-family: inherit; box-shadow: var(--p-shadow-sm), var(--p-glass-ring);
  transition: box-shadow .12s ease;
}
.qr:hover { box-shadow: var(--p-shadow), var(--p-glass-ring); }
.qr:disabled { opacity: .5; cursor: default; }

/* --- composer (single frameless glass pill) --- */
.composer {
  display: flex; gap: 6px; align-items: center;
  padding: 6px 6px 6px 16px;
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  border-radius: 999px;
  box-shadow: var(--p-shadow-sm), var(--p-glass-ring);
}
.composer input {
  flex: 1; border: none; background: transparent; outline: none;
  padding: 6px 0; font-size: 14px; font-family: inherit; color: var(--p-fg);
}
.composer input::placeholder { color: var(--p-muted); }
.composer button {
  border: none; border-radius: 50%; width: 36px; height: 36px; flex: none;
  background: var(--p-accent); color: var(--p-accent-fg); cursor: pointer;
  display: grid; place-items: center;
  transition: opacity .14s ease, transform .14s ease, filter .14s ease;
}
.composer button:disabled { opacity: .35; cursor: default; filter: blur(.2px); transform: scale(.92); }

/* --- sub-flow glass card (iteration / checkout / escalation / setup) --- */
.stage-card {
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  border-radius: 20px;
  box-shadow: var(--p-shadow), var(--p-glass-ring);
}
.iteration { padding: 13px 15px; display: flex; flex-direction: column; gap: 10px; }
.iter-label { font-size: 12px; color: var(--p-muted); font-weight: 600; }
.iter-options { display: flex; flex-wrap: wrap; gap: 7px; }
.iter-chip {
  border: 1px solid rgba(0,0,0,.08); background: rgba(255,255,255,.6); border-radius: 999px;
  padding: 7px 13px; font-size: 13px; cursor: pointer; font-family: inherit;
  transition: background .12s ease, border-color .12s ease;
}
.iter-chip:hover { background: #fff; }
.iter-chip.selected { background: var(--p-accent); color: var(--p-accent-fg); border-color: var(--p-accent); }
.iter-text {
  border: 1px solid rgba(0,0,0,.1); border-radius: 14px; padding: 10px 13px;
  font-size: 14px; font-family: inherit; resize: none; min-height: 60px; outline: none;
  color: var(--p-fg); background: rgba(255,255,255,.7);
  transition: border-color .14s ease, box-shadow .14s ease;
}
.iter-text:focus { border-color: #c7c7cd; box-shadow: 0 0 0 4px rgba(0,0,0,.04); }
.iter-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.iter-submit {
  border: none; border-radius: 999px; padding: 9px 17px; font-size: 13px; font-weight: 600;
  background: var(--p-accent); color: var(--p-accent-fg); cursor: pointer; font-family: inherit;
}
.iter-submit:disabled { opacity: .4; cursor: default; }

/* --- working / notices --- */
.working { display: flex; align-items: center; gap: 9px; color: var(--p-muted); font-size: 13px; padding: 4px 2px; }
.spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid var(--p-line); border-top-color: var(--p-muted);
  animation: phillip-spin .8s linear infinite;
}
@keyframes phillip-spin { to { transform: rotate(360deg); } }

.notice {
  background: rgba(255,255,255,.6); border-radius: 14px; padding: 10px 13px;
  font-size: 13px; color: var(--p-fg); text-wrap: pretty;
}
.notice a { color: var(--p-pop); }

/* --- sub-flow extras --- */
.composer.bare {
  background: rgba(255,255,255,.7);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.1);
  padding: 5px 5px 5px 15px;
}
.checkout-includes {
  margin: 0; padding-left: 18px; color: var(--p-fg); font-size: 13px;
  display: flex; flex-direction: column; gap: 4px;
}
.iter-note { font-size: 11px; color: var(--p-muted); }
.setup-steps { display: flex; flex-direction: column; gap: 9px; }
.setup-step { display: flex; align-items: center; gap: 9px; font-size: 13px; cursor: pointer; }
.setup-step input { accent-color: var(--p-accent); width: 16px; height: 16px; }

/* The spinner is the one genuine CSS loop; motion handles the rest and honors
   reduced-motion via MotionConfig at the root. */
@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
  .stage { will-change: auto; }
}
`;
