import { useEffect, useState } from "react";

// Mouse/scroll events over this iframe's content never reach the parent
// document's listeners — iframes are a hard event boundary, browsers don't
// bubble mousemove/click across them. Phillip's HeatmapCollector (running in
// the parent, alongside the widget) can't see real visitor interaction with
// the actual site at all without this. This tiny bridge runs *inside* the
// iframe's own document and relays page-relative fractions (not pixels, so
// it's correct regardless of how the iframe is sized on screen) plus the
// iframe's real document height, which is also otherwise invisible to the
// parent (`document.documentElement.scrollHeight` on the host page only ever
// reports the fixed 100vh iframe wrapper, never the real site's content
// height). See HeatmapCollector's BridgeMessage handling in
// src/analytics/heatmap.ts for the receiving end.
const HEATMAP_BRIDGE_SCRIPT = `<script>(function(){
  function pageHeight(){ return Math.max(document.documentElement.scrollHeight, window.innerHeight); }
  function post(msg){ try { window.parent.postMessage(Object.assign({ __phillipHeatmap: true }, msg), "*"); } catch (err) {} }
  function sendGeometry(){
    post({ kind: "geometry", pageHeight: pageHeight(), viewportWidth: window.innerWidth, viewportHeight: window.innerHeight });
  }
  function sendScroll(){
    post({ kind: "scroll", yFrac: (window.scrollY + window.innerHeight / 2) / pageHeight() });
  }
  var lastMoveAt = 0;
  function sendPoint(kind, e){
    post({ kind: kind, xFrac: e.clientX / window.innerWidth, yFrac: (window.scrollY + e.clientY) / pageHeight() });
  }
  window.addEventListener("mousemove", function(e){
    var now = Date.now();
    if (now - lastMoveAt < 120) return;
    lastMoveAt = now;
    sendPoint("move", e);
  }, { passive: true });
  window.addEventListener("click", function(e){ sendPoint("click", e); }, { passive: true });
  window.addEventListener("resize", sendGeometry);
  sendGeometry();
  setInterval(sendScroll, 1000);
})();</script>`;

function withHeatmapBridge(html: string): string {
  return html.includes("</body>")
    ? html.replace("</body>", `${HEATMAP_BRIDGE_SCRIPT}</body>`)
    : `${html}${HEATMAP_BRIDGE_SCRIPT}`;
}

// Only used in `VITE_PHILLIP_BACKEND=live` mode: fetches the site's actual
// current HTML from apps/server (real Claude edits land here) and renders it
// in a sandboxed iframe — never dangerouslySetInnerHTML into the host page,
// since this markup is model-generated. Re-fetches whenever `refreshKey`
// changes (Phillip's onSiteUpdated callback bumps it after a revision).
export function LiveSite({
  apiBase,
  previewId,
  refreshKey,
}: {
  apiBase: string;
  previewId: string;
  refreshKey: number;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey only retriggers this fetch, it isn't read.
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    fetch(`${apiBase}/v1/preview/${encodeURIComponent(previewId)}/site`)
      .then((res) => {
        if (!res.ok) throw new Error(`site fetch failed: ${res.status}`);
        return res.json() as Promise<{ html: string; version: number }>;
      })
      .then((data) => {
        if (!cancelled) setHtml(withHeatmapBridge(data.html));
      })
      .catch((err) => {
        console.error("failed to load live site", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, previewId, refreshKey]);

  if (failed) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#999", fontFamily: "sans-serif" }}>
        couldn't load the live preview. is apps/server running?
      </div>
    );
  }
  if (!html) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#999", fontFamily: "sans-serif" }}>
        loading preview…
      </div>
    );
  }

  return (
    <iframe
      title="website preview"
      srcDoc={html}
      style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
    />
  );
}
