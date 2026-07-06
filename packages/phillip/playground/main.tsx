import { Phillip } from "@nutz/phillip";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { worker } from "../mock/browser";
import { FakeGeneratedSite } from "./FakeGeneratedSite";

// Toggle with `VITE_PHILLIP_BACKEND=live` (see root `pnpm dev:live`) to talk to
// the real apps/server instead of the keyword-matched mock — same contract,
// Claude actually generating the replies.
const live = import.meta.env.VITE_PHILLIP_BACKEND === "live";
const apiBase = live ? (import.meta.env.VITE_PHILLIP_API_BASE ?? "http://localhost:8787") : "";

async function start() {
  if (!live) {
    // Stand up the mock backend before the embed boots.
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  }

  const el = document.getElementById("root");
  if (!el) throw new Error("missing #root");

  createRoot(el).render(
    <StrictMode>
      <FakeGeneratedSite />
      <Phillip previewId="prv_demo" apiBase={apiBase} debug />
    </StrictMode>,
  );
}

void start();
