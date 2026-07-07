import { beforeEach, describe, expect, it, vi } from "vitest";
import { HEATMAP_ROWS, HeatmapCollector } from "./heatmap";

// Real-browser verification is unreliable here: visibility-gated dwell only
// ticks when the tab reports as visible/focused, which headless/background
// preview contexts don't. Testing the collector in isolation, independent of
// that gate, is the reliable way to prove the bucketing logic itself works.

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
}

beforeEach(() => {
  setViewport(1000, 800);
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: 800,
    configurable: true,
  });
});

describe("HeatmapCollector", () => {
  it("flushes null when nothing was collected", () => {
    const c = new HeatmapCollector();
    c.start();
    expect(c.flush()).toBeNull();
    c.stop();
  });

  it("buckets mousemove into a hover cell, respecting the sample gap", () => {
    vi.useFakeTimers();
    const c = new HeatmapCollector();
    c.start();

    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 500, clientY: 400 }));
    vi.advanceTimersByTime(200); // past the 120ms sample gap
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 500, clientY: 400 }));
    // immediate second move at the same spot — should be gated out
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 500, clientY: 400 }));

    const payload = c.flush();
    expect(payload).not.toBeNull();
    expect(payload?.grid).toEqual({ cols: 24, rows: HEATMAP_ROWS });
    // center of a 1000x800 viewport -> col 12, row 20 -> key = 12*40+20 = 500
    expect(payload?.hover).toEqual([[500, 2]]);
    expect(payload?.click).toEqual([]);

    c.stop();
    vi.useRealTimers();
  });

  it("buckets clicks independently of the mousemove sample gap", () => {
    const c = new HeatmapCollector();
    c.start();

    window.dispatchEvent(new MouseEvent("click", { clientX: 0, clientY: 0 }));
    window.dispatchEvent(new MouseEvent("click", { clientX: 0, clientY: 0 }));
    window.dispatchEvent(new MouseEvent("click", { clientX: 999, clientY: 799 }));

    const payload = c.flush();
    // top-left cell (0,0) clicked twice, bottom-right-ish cell once
    expect(payload?.click).toEqual(
      expect.arrayContaining([
        [0, 2],
        [23 * HEATMAP_ROWS + 39, 1],
      ]),
    );

    c.stop();
  });

  it("ignores events that originate inside the Phillip widget host", () => {
    const c = new HeatmapCollector();
    c.start();

    const host = document.createElement("div");
    host.setAttribute("data-phillip-host", "");
    const inner = document.createElement("button");
    host.appendChild(inner);
    document.body.appendChild(host);

    inner.dispatchEvent(new MouseEvent("click", { clientX: 100, clientY: 100, bubbles: true }));
    expect(c.flush()).toBeNull();

    document.body.removeChild(host);
    c.stop();
  });

  it("accumulates scroll-dwell per tick and resets deltas after flush", () => {
    const c = new HeatmapCollector();
    c.tick(1000); // center of an 800px-tall viewport at scrollY 0 -> row 20
    c.tick(500);

    const first = c.flush();
    expect(first?.scrollMs).toEqual([[20, 1500]]);

    // deltas, not cumulative — a flush with nothing new returns null
    expect(c.flush()).toBeNull();
  });

  // A same-page-covering iframe (the live-preview harness) never bubbles
  // mousemove/click to the parent document at all — that's a hard browser
  // boundary, not something a listener option works around. The bridge
  // relays page-relative fractions over postMessage instead, so these tests
  // cover that path independently of any real DOM/iframe event.
  describe("bridged iframe messages", () => {
    function postBridge(data: Record<string, unknown>): void {
      window.dispatchEvent(
        new MessageEvent("message", { data: { __phillipHeatmap: true, ...data } }),
      );
    }

    it("ignores messages without the bridge marker", () => {
      const c = new HeatmapCollector();
      c.start();
      window.dispatchEvent(
        new MessageEvent("message", { data: { kind: "move", xFrac: 0.5, yFrac: 0.5 } }),
      );
      expect(c.flush()).toBeNull();
      c.stop();
    });

    it("buckets bridged move/click by page-relative fraction", () => {
      const c = new HeatmapCollector();
      c.start();

      postBridge({ kind: "move", xFrac: 0.5, yFrac: 0.5 }); // col 12, row 20 -> 500
      postBridge({ kind: "click", xFrac: 0, yFrac: 0 }); // col 0, row 0 -> 0

      const payload = c.flush();
      expect(payload?.hover).toEqual([[500, 1]]);
      expect(payload?.click).toEqual([[0, 1]]);

      c.stop();
    });

    it("prefers bridged geometry over the host document's own dimensions", () => {
      const c = new HeatmapCollector();
      c.start();

      postBridge({ kind: "geometry", pageHeight: 4000, viewportWidth: 900, viewportHeight: 700 });
      postBridge({ kind: "click", xFrac: 0.5, yFrac: 0.5 });

      const payload = c.flush();
      expect(payload?.pageHeight).toBe(4000);
      expect(payload?.viewport).toEqual({ width: 900, height: 700 });

      c.stop();
    });

    it("uses bridged scroll fraction for dwell ticks instead of the host page's own scroll", () => {
      const c = new HeatmapCollector();
      c.start();

      postBridge({ kind: "scroll", yFrac: 0.9 }); // row 36
      c.tick(1000);

      const payload = c.flush();
      expect(payload?.scrollMs).toEqual([[36, 1000]]);

      c.stop();
    });
  });
});
