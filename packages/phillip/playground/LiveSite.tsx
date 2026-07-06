import { useEffect, useState } from "react";

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
        if (!cancelled) setHtml(data.html);
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
