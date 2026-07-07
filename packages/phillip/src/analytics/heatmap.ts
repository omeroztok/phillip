// Attention heatmap: hover position, clicks, and scroll-depth dwell, bucketed
// into a coarse grid client-side so we never ship raw mousemove events over
// the wire — only small per-flush deltas. Cells are addressed by a single
// numeric key (col * rows + row) rather than a "col,row" string so neither
// side ever has to parse/destructure a split string.
import type { HeatmapPayload } from "../types/events";

function fromWidget(target: EventTarget | null): boolean {
  const el = target as Element | null;
  return !!el && typeof el.closest === "function" && !!el.closest("[data-phillip-host]");
}

export const HEATMAP_COLS = 24;
export const HEATMAP_ROWS = 40;
const SAMPLE_GAP_MS = 120;

export type { HeatmapPayload };

function pageHeight(): number {
  return Math.max(document.documentElement.scrollHeight, window.innerHeight);
}

function colFromFrac(xFrac: number): number {
  return Math.min(HEATMAP_COLS - 1, Math.max(0, Math.floor(xFrac * HEATMAP_COLS)));
}

function rowFromFrac(yFrac: number): number {
  return Math.min(HEATMAP_ROWS - 1, Math.max(0, Math.floor(yFrac * HEATMAP_ROWS)));
}

/** Cell key from page-relative fractions (0..1) — resolution-independent, so
 * it works the same whether the point came from a direct DOM listener or was
 * relayed (see BridgeMessage below) from a document at a different size. */
function fracKey(xFrac: number, yFrac: number): number {
  return colFromFrac(xFrac) * HEATMAP_ROWS + rowFromFrac(yFrac);
}

function cellKey(clientX: number, clientY: number): number {
  return fracKey(clientX / window.innerWidth, (window.scrollY + clientY) / pageHeight());
}

function bump(map: Map<number, number>, key: number): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/**
 * The real site content in the live-preview harness renders inside a
 * same-page-covering `<iframe>` (see playground/LiveSite.tsx) — mouse events
 * over an iframe's content never reach the parent document's listeners at
 * all, that's a hard browser boundary, not something a listener option can
 * work around. The iframe's document injects a small bridge script that
 * relays mousemove/click/scroll as page-relative fractions (and its own true
 * document height) via postMessage; anything embedding Phillip inside an
 * iframe can opt into this by posting this shape, so it isn't a one-off
 * iframe hack living in this class.
 */
interface BridgeMessage {
  __phillipHeatmap: true;
  kind: "move" | "click" | "scroll" | "geometry";
  xFrac?: number;
  yFrac?: number;
  pageHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

function isBridgeMessage(data: unknown): data is BridgeMessage {
  return (
    !!data &&
    typeof data === "object" &&
    (data as { __phillipHeatmap?: unknown }).__phillipHeatmap === true
  );
}

export class HeatmapCollector {
  private hover = new Map<number, number>();
  private click = new Map<number, number>();
  private scroll = new Map<number, number>();
  private lastSampleAt = 0;
  private cleanups: Array<() => void> = [];

  // Set once a bridged iframe reports its real geometry/scroll — takes
  // priority over this document's own (irrelevant, always ~viewport-sized)
  // measurements whenever present.
  private bridgedGeometry?: { pageHeight: number; viewportWidth: number; viewportHeight: number };
  private bridgedScrollFrac?: number;

  start(): void {
    const onMove = (e: MouseEvent) => {
      if (fromWidget(e.target)) return;
      const now = Date.now();
      if (now - this.lastSampleAt < SAMPLE_GAP_MS) return;
      this.lastSampleAt = now;
      bump(this.hover, cellKey(e.clientX, e.clientY));
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    this.cleanups.push(() => window.removeEventListener("mousemove", onMove));

    const onClick = (e: MouseEvent) => {
      if (fromWidget(e.target)) return;
      bump(this.click, cellKey(e.clientX, e.clientY));
    };
    window.addEventListener("click", onClick, { passive: true });
    this.cleanups.push(() => window.removeEventListener("click", onClick));

    const onMessage = (e: MessageEvent) => {
      if (!isBridgeMessage(e.data)) return;
      const msg = e.data;
      if (msg.kind === "geometry") {
        if (
          typeof msg.pageHeight !== "number" ||
          typeof msg.viewportWidth !== "number" ||
          typeof msg.viewportHeight !== "number"
        ) {
          return;
        }
        this.bridgedGeometry = {
          pageHeight: msg.pageHeight,
          viewportWidth: msg.viewportWidth,
          viewportHeight: msg.viewportHeight,
        };
      } else if (msg.kind === "scroll") {
        if (typeof msg.yFrac === "number") this.bridgedScrollFrac = msg.yFrac;
      } else if (msg.kind === "move" || msg.kind === "click") {
        if (typeof msg.xFrac !== "number" || typeof msg.yFrac !== "number") return;
        bump(msg.kind === "move" ? this.hover : this.click, fracKey(msg.xFrac, msg.yFrac));
      }
    };
    window.addEventListener("message", onMessage);
    this.cleanups.push(() => window.removeEventListener("message", onMessage));
  }

  /** Called from the host tracker's existing 1s tick loop — folds scroll-depth dwell in without a second timer. */
  tick(activeMs: number): void {
    const yFrac =
      this.bridgedScrollFrac ?? (window.scrollY + window.innerHeight / 2) / pageHeight();
    this.scroll.set(rowFromFrac(yFrac), (this.scroll.get(rowFromFrac(yFrac)) ?? 0) + activeMs);
  }

  /** Packages accumulated deltas and resets counters; null if nothing to report. */
  flush(): HeatmapPayload | null {
    if (this.hover.size === 0 && this.click.size === 0 && this.scroll.size === 0) return null;
    const viewport = this.bridgedGeometry
      ? { width: this.bridgedGeometry.viewportWidth, height: this.bridgedGeometry.viewportHeight }
      : { width: window.innerWidth, height: window.innerHeight };
    const payload: HeatmapPayload = {
      grid: { cols: HEATMAP_COLS, rows: HEATMAP_ROWS },
      viewport,
      pageHeight: this.bridgedGeometry?.pageHeight ?? pageHeight(),
      hover: [...this.hover.entries()],
      click: [...this.click.entries()],
      scrollMs: [...this.scroll.entries()],
    };
    this.hover.clear();
    this.click.clear();
    this.scroll.clear();
    return payload;
  }

  stop(): void {
    for (const c of this.cleanups) c();
    this.cleanups = [];
  }
}
