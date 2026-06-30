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

  /* iMessage-shaped bubbles, monochrome brand (not iMessage blue). Values
     mirror the imessage-simulator: received #e9e9ea, ~18px radius. */
  --p-them-bg: #e9e9ea;
  --p-them-fg: #000000;
  --p-bubble-radius: 18px;

  /* Frosted surfaces (composer, chips, sub-flow cards) — matches the repo's
     --ios-glass and its soft pill shadow. */
  --p-glass: rgba(247,247,247,.92);
  --p-glass-blur: 22px;
  --p-glass-ring: inset 0 0 0 1px rgba(255,255,255,.5);
  --p-glass-shadow: 0 0 0 .5px rgba(0,0,0,.04), 0 2px 6px -1px rgba(0,0,0,.06);

  /* Soft lift so bubbles + glass read over the dimmed vignette. */
  --p-shadow: 0 1px 2px rgba(0,0,0,.06), 0 8px 24px -8px rgba(0,0,0,.22), 0 24px 48px -16px rgba(0,0,0,.28);
  --p-shadow-sm: 0 1px 2px rgba(0,0,0,.1), 0 6px 16px -8px rgba(0,0,0,.28);
  /* SF / system stack to match the repo (San Francisco on Apple devices). */
  --p-font: system-ui, -apple-system, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif;

  /* Stacking order, all within the single max z-index host. */
  --p-z-vignette: 1;
  --p-z-bubble: 20;
  --p-z-stage: 30;

  font-family: var(--p-font);
  font-variation-settings: 'wdth' 100;
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

/* --- vignette (frosted corner backdrop) --- */
/* Blurs AND gently dims the page behind the conversation, feathered to the
   bottom-right corner with a radial mask. The page goes softly out of focus
   rather than turning muddy/brown — a clean, premium spotlight. */
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--p-z-vignette);
  background: rgba(8,8,12,.22);
  backdrop-filter: blur(18px) saturate(1.05);
  -webkit-backdrop-filter: blur(18px) saturate(1.05);
  -webkit-mask-image: radial-gradient(120% 120% at 100% 100%,
    #000 0%, #000 28%, rgba(0,0,0,.55) 44%, transparent 58%);
  mask-image: radial-gradient(120% 120% at 100% 100%,
    #000 0%, #000 28%, rgba(0,0,0,.55) 44%, transparent 58%);
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
  padding-top: 16px;
  /* Older messages dissolve into the page at the top — fade over the top
     quarter, matching the repo's transcript mask exactly. */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 25%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 25%);
}
.stage-footer { pointer-events: auto; margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }

/* --- transcript --- */
/* Tight within a run; the gap between runs comes from the tail row's reserved
   space (.has-tail), mirroring iMessage's grouping rhythm. */
.convo { display: flex; flex-direction: column; gap: 2px; }

/* --- messages (frameless iMessage bubbles, ported 1:1 from the simulator) --- */
.msg { display: flex; max-width: 100%; }
.msg.lead { justify-content: flex-end; }
.msg.system { justify-content: center; }
/* Tail hangs ~6.5px below the bubble; reserve that space + the run gap. */
.msg.has-tail { margin-bottom: 7px; }
.msg-bubble-wrap { position: relative; max-width: 70%; display: flex; }
.msg-bubble {
  position: relative;
  padding: 8.5px 11.5px;
  border-radius: var(--p-bubble-radius);
  font-size: 16px;
  line-height: 1.295;
  letter-spacing: -.005em;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-wrap: pretty;
  box-shadow: 0 1px 2px rgba(0,0,0,.12), 0 6px 16px -8px rgba(0,0,0,.3);
}
.msg.phillip .msg-bubble { background: var(--p-them-bg); color: var(--p-them-fg); }
/* The sent bubble stays brand-black; a faint light edge keeps its silhouette
   readable where it sits on the darkest part of the backdrop. */
.msg.lead .msg-bubble {
  background: var(--p-accent); color: var(--p-accent-fg);
  box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 6px 16px -8px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.08);
}

/* Self-contained SVG tail (last bubble of a run only). Rendered INSIDE the
   bubble: hangs below (bottom:-6.5px) and insets 6.5px from the edge, exactly
   like the simulator. currentColor = bubble color; them is mirrored. */
.msg-tail { position: absolute; bottom: -6.5px; width: 16px; height: 17px; }
.msg.phillip .msg-tail { left: 6.5px; transform: scaleX(-1); color: var(--p-them-bg); }
.msg.lead .msg-tail { right: 6.5px; color: var(--p-accent); }

.msg.system .msg-bubble {
  background: transparent; color: var(--p-muted); font-size: 12px;
  text-align: center; box-shadow: none;
}
.msg-bubble.error { background: #fee2e2; color: #b91c1c; }
.msg-bubble.error .msg-tail { color: #fee2e2; }

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
