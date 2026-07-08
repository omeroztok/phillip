import { Phillip } from "@nutz/phillip";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { worker } from "../mock/browser";
import { FakeGeneratedSite } from "./FakeGeneratedSite";
import { LiveSite } from "./LiveSite";

// Toggle with `VITE_PHILLIP_BACKEND=live` (see root `pnpm dev:live`) to talk to
// the real apps/server instead of the keyword-matched mock — same contract,
// Claude actually generating the replies (and, in live mode, actually editing
// the page).
const live = import.meta.env.VITE_PHILLIP_BACKEND === "live";
const apiBase = live ? (import.meta.env.VITE_PHILLIP_API_BASE ?? "http://localhost:8787") : "";
// ?preview=<id> lets the live playground point at any seeded preview (see
// apps/server's POST /v1/preview/:id/seed) without a rebuild.
const PREVIEW_ID = new URLSearchParams(window.location.search).get("preview") ?? "prv_demo";

function Root() {
  // Bumped by Phillip's onSiteUpdated callback once a revision lands, so both
  // LiveSite and FakeGeneratedSite refetch their current state.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      {live ? (
        <LiveSite apiBase={apiBase} previewId={PREVIEW_ID} refreshKey={refreshKey} />
      ) : (
        <FakeGeneratedSite apiBase={apiBase} previewId={PREVIEW_ID} refreshKey={refreshKey} />
      )}
      <Phillip
        previewId={PREVIEW_ID}
        apiBase={apiBase}
        debug
        onSiteUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}

async function start() {
  if (!live) {
    // Stand up the mock backend before the embed boots.
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  }

  const el = document.getElementById("root");
  if (!el) throw new Error("missing #root");

  createRoot(el).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}

void start();
