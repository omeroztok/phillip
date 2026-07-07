import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { DashboardLead } from "../data/sample";
import { API_BASE } from "../data/useDashboardLeads";
import { scrim } from "../motion";

type Tab = "hover" | "click" | "scroll";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "hover", label: "Hover" },
  { id: "click", label: "Click" },
  { id: "scroll", label: "Scroll depth" },
];

const DEFAULT_W = 860;
const MIN_H = 480;
const BLUR_PX = 20;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Classic heatmap ramp: blue (cold) → green → yellow → red (hot). No array
// indexing here on purpose — keeps this safe under noUncheckedIndexedAccess
// without a bunch of non-null assertions for a 3-stop gradient.
function heatColor(t: number): [number, number, number] {
  const c = Math.min(1, Math.max(0, t));
  if (c < 0.35) {
    const lt = c / 0.35;
    return [lerp(37, 16, lt), lerp(99, 185, lt), lerp(235, 129, lt)];
  }
  if (c < 0.65) {
    const lt = (c - 0.35) / 0.3;
    return [lerp(16, 234, lt), lerp(185, 179, lt), lerp(129, 8, lt)];
  }
  const lt = (c - 0.65) / 0.35;
  return [lerp(234, 220, lt), lerp(179, 38, lt), lerp(8, 38, lt)];
}

// Real heatmap look: accumulate soft, overlapping blobs (blurred, additive)
// into a grayscale intensity buffer first, then colorize by alpha — rather
// than painting hard-edged rectangles straight in color. This is the same
// two-pass technique classic JS heatmap libraries use.
function paintFlowyHeatmap(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  const visible = canvas.getContext("2d");
  if (!visible || width <= 0 || height <= 0) return;
  visible.clearRect(0, 0, width, height);

  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const octx = off.getContext("2d");
  if (!octx) return;
  octx.filter = `blur(${BLUR_PX}px)`;
  octx.globalCompositeOperation = "lighter";
  octx.fillStyle = "#fff";
  draw(octx);

  const src = octx.getImageData(0, 0, width, height);
  const out = visible.createImageData(width, height);
  for (let i = 0; i < src.data.length; i += 4) {
    const alpha = src.data[i + 3] ?? 0;
    if (alpha < 4) continue; // effectively empty — leave transparent
    const t = alpha / 255;
    const [r, g, b] = heatColor(t);
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
    out.data[i + 3] = Math.min(235, 60 + t * 200);
  }
  visible.putImageData(out, 0, 0);
}

function drawPoints(
  ctx: CanvasRenderingContext2D,
  cellW: number,
  cellH: number,
  rows: number,
  cells: Array<[number, number]>,
): void {
  const max = cells.reduce((m, [, v]) => Math.max(m, v), 1);
  // Tight enough that a single hover reads as a real, located point (not a
  // vague cloud covering a third of the screen) — the blur pass is what
  // gives it the soft "flowy" edge, not blob size.
  const radius = Math.max(cellW, cellH) * 0.9;
  for (const [key, value] of cells) {
    const col = Math.floor(key / rows);
    const row = key % rows;
    const cx = (col + 0.5) * cellW;
    const cy = (row + 0.5) * cellH;
    ctx.globalAlpha = 0.35 + (value / max) * 0.65;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBands(
  ctx: CanvasRenderingContext2D,
  width: number,
  bandH: number,
  data: Array<[number, number]>,
): void {
  const max = data.reduce((m, [, v]) => Math.max(m, v), 1);
  for (const [row, ms] of data) {
    ctx.globalAlpha = 0.25 + (ms / max) * 0.75;
    ctx.fillRect(0, row * bandH, width, bandH);
  }
  ctx.globalAlpha = 1;
}

// Deepest row anyone actually dwelt on. Scroll depth is about how far
// attention reached, not the whole page — unlike hover/click, there's
// nothing meaningful to show below this.
function maxScrollRow(scrollMs: Array<[number, number]>): number {
  return scrollMs.reduce((m, [row]) => Math.max(m, row), 0);
}

export function HeatmapModal({ lead, onClose }: { lead: DashboardLead; onClose: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const [tab, setTab] = useState<Tab>("hover");
  const [html, setHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCleanup = useRef<() => void>(() => {});
  const heatmap = lead.heatmap;

  // Real, *measured* dimensions of the live iframe document — not a scale
  // guessed from the recorded payload. Sizing the iframe box to the full
  // recorded page height (instead of letting it render at its natural size)
  // was the actual bug behind "still ends at a certain point": any `vh`-based
  // CSS in the site (e.g. a hero's `min-height: 70vh`) resolves against
  // *this* box, so an artificially tall box balloons those sections and
  // pushes real content past where anyone would ever scroll. Letting the
  // iframe render at its own natural size and scroll natively means `vh`
  // resolves the same way it did for the real visitor.
  const [frameSize, setFrameSize] = useState({ width: DEFAULT_W, height: MIN_H });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/v1/preview/${encodeURIComponent(lead.preview.id)}/site`)
      .then((res) =>
        res.ok ? (res.json() as Promise<{ html: string }>) : Promise.reject(res.status),
      )
      .then((data) => {
        if (!cancelled) setHtml(data.html);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lead.preview.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: html only retriggers this reset, it isn't read.
  useEffect(() => {
    setFrameSize({ width: DEFAULT_W, height: MIN_H });
    setScrollY(0);
  }, [html]);

  useEffect(() => () => frameCleanup.current(), []);

  // sandbox="allow-same-origin" (no allow-scripts) keeps the model-generated
  // markup fully inert — it still can't run a single line of JS — but lets
  // *our own* parent code read/scroll the iframe's document, which is what
  // makes real measurement and scroll-synced overlay possible at all.
  //
  // Without allow-scripts, this same-origin iframe never actually dispatches
  // `scroll` events to a listener attached from the parent — confirmed by
  // testing, not assumed: scrollTo() and reading scrollY both work fine, the
  // event just never fires. Adding allow-scripts would fix that, but it also
  // means Claude-generated markup could run arbitrary JS, which is exactly
  // what the sandbox exists to prevent. Polling scrollY every frame instead
  // gets the same result without that trade-off.
  function handleFrameLoad(): void {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!iframe || !doc || !win) return;

    // Sub-pixel-threshold guard: ResizeObserver can fire on layout noise
    // (font metrics settling, a fraction-of-a-pixel reflow) that isn't a
    // real size change. Feeding every one of those into React state made the
    // scroll-depth line (positioned from frameSize.height) visibly shiver —
    // ignoring anything under 2px keeps it dead still once the page settles.
    const measure = () => {
      const width = iframe.clientWidth;
      const height = Math.max(iframe.clientHeight, doc.documentElement.scrollHeight);
      setFrameSize((prev) =>
        Math.abs(prev.width - width) < 2 && Math.abs(prev.height - height) < 2
          ? prev
          : { width, height },
      );
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(doc.documentElement);

    frameCleanup.current();
    frameCleanup.current = () => ro.disconnect();
  }

  // Keeps the canvas's scroll-synced translateY current. Reviewers can
  // scroll freely past whatever anyone actually reached — the scroll-depth
  // tab marks that boundary with a line instead of stopping the scroll,
  // since blocking the admin's own scroll to "protect" a boundary that's
  // purely informational just reads as broken. Uses setInterval rather than
  // requestAnimationFrame: rAF callbacks are fully paused (not just
  // throttled) while the document is hidden per spec, and this is a
  // background overlay sync, not an animation — it doesn't need 60fps, just
  // to not be dead in a backgrounded tab.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;
    const poll = () => {
      const win = iframe.contentWindow;
      if (win) setScrollY(win.scrollY);
    };
    const id = setInterval(poll, 50);
    poll();
    return () => clearInterval(id);
  }, [html]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmap) return;
    const cellW = frameSize.width / heatmap.grid.cols;
    const cellH = frameSize.height / heatmap.grid.rows;
    if (tab === "scroll") {
      paintFlowyHeatmap(canvas, frameSize.width, frameSize.height, (ctx) =>
        drawBands(ctx, frameSize.width, cellH, heatmap.scrollMs),
      );
    } else {
      paintFlowyHeatmap(canvas, frameSize.width, frameSize.height, (ctx) =>
        drawPoints(ctx, cellW, cellH, heatmap.grid.rows, heatmap[tab]),
      );
    }
  }, [tab, heatmap, frameSize]);

  // Rendered as real DOM (a CSS border + centered label), not canvas pixels —
  // a canvas-drawn dashed line is subject to the same blur pass and raster
  // resolution as the heatmap blobs, which reads soft/fuzzy exactly where
  // this needs to be a crisp, perfectly still reference mark. Positioned in
  // the same tall page coordinate space as the canvas and moved by the same
  // translateY, so it tracks scroll identically without needing its own sync.
  const stoppedLineTop =
    tab === "scroll" && heatmap
      ? ((maxScrollRow(heatmap.scrollMs) + 1) * frameSize.height) / heatmap.grid.rows
      : null;

  return (
    <>
      <m.div
        className="scrim heatmap-scrim"
        variants={scrim}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
      />
      <div className="heatmap-modal-wrap">
        <m.div
          className="heatmap-modal"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
          // biome-ignore lint/a11y/useSemanticElements: a styled floating panel, not a native modal <dialog>
          role="dialog"
          aria-label={`${lead.lead.business} heatmap`}
        >
          <header className="heatmap-head">
            <div>
              <h2>{lead.lead.business}</h2>
              <p>
                {tab === "scroll"
                  ? "the dashed line marks how far anyone actually scrolled — keep going to see the rest"
                  : "where attention actually went on this preview — scroll to see the whole page"}
              </p>
            </div>
            <button type="button" className="drawer-close" onClick={onClose} aria-label="close">
              ×
            </button>
          </header>

          <div className="heatmap-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`heatmap-tab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="heatmap-stage">
            <div className="heatmap-content">
              {html ? (
                <iframe
                  ref={iframeRef}
                  title="preview"
                  srcDoc={html}
                  className="heatmap-frame"
                  sandbox="allow-same-origin"
                  onLoad={handleFrameLoad}
                />
              ) : (
                <div className="heatmap-frame heatmap-frame-empty" />
              )}
              <canvas
                ref={canvasRef}
                width={frameSize.width}
                height={frameSize.height}
                className="heatmap-canvas"
                style={{
                  width: frameSize.width,
                  height: frameSize.height,
                  transform: `translateY(${-scrollY}px)`,
                }}
              />
              {stoppedLineTop !== null ? (
                <div
                  className="heatmap-stopped-line"
                  style={{
                    top: stoppedLineTop,
                    width: frameSize.width,
                    transform: `translateY(${-scrollY}px)`,
                  }}
                >
                  <span>Scrolling Stopped</span>
                </div>
              ) : null}
              {!heatmap ? (
                <div className="heatmap-empty">
                  <p>no heatmap data yet — this fills in once someone visits the live preview.</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="heatmap-legend">
            <span className="heatmap-legend-bar" />
            <span>low attention</span>
            <span className="heatmap-legend-spacer" />
            <span>high attention</span>
          </div>
        </m.div>
      </div>
    </>
  );
}
