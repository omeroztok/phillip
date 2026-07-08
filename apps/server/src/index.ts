import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import express from "express";
import type {
  CreateIterationRequest,
  EventsBatchRequest,
} from "../../../packages/phillip/src/transport/types";
import {
  ensureLeadAndSession,
  getDashboardLeads,
  recordEvents,
  recordRequestedChange,
  resolveRequestedChange,
} from "./analytics";
import { getAsset, storeAsset } from "./assets";
import { DEMO_CONTEXT, demoBootConfig } from "./fixtures";
import { prefixedId } from "./id";
import { advanceJob, createJob } from "./jobs";
import { streamPhillipReply } from "./reply";
import { getSite, seedSite } from "./site";
import { resolveQuickReply } from "./store";

// Analytics must never break the actual product — every call to the
// analytics module from a request handler goes through this, so a DB hiccup
// just logs instead of 500ing an endpoint that has nothing to do with it.
async function trackSafely(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error("analytics failed (non-fatal):", err);
  }
}

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "Missing ANTHROPIC_API_KEY. Copy apps/server/.env.example to apps/server/.env and set it, then restart.",
  );
  process.exit(1);
}

const anthropic = new Anthropic();

const app = express();
app.use(cors());
// Raised from the 100kb default — attachments arrive as base64 data URLs
// (client-side downscaled, but base64 still runs ~33% larger than raw bytes).
app.use(express.json({ limit: "8mb" }));

app.get("/v1/preview/:id/boot", (req, res) => {
  const boot = demoBootConfig(req.params.id);
  res.json(boot);
  void trackSafely(() =>
    ensureLeadAndSession(boot, {
      referrer: req.get("referer"),
      userAgent: req.get("user-agent"),
    }),
  );
});

app.post("/v1/events", (req, res) => {
  res.status(204).end();
  const { sessionId, events } = req.body as EventsBatchRequest;
  void trackSafely(() => recordEvents(sessionId, events));
});

app.post("/v1/conversations/:sessionId/messages", async (req, res) => {
  const { sessionId } = req.params;
  const { message, quickReplyId } = req.body as { message?: string; quickReplyId?: string };
  const userText = message ?? (quickReplyId ? resolveQuickReply(sessionId, quickReplyId) : "");

  await streamPhillipReply({
    anthropic,
    model: MODEL,
    res,
    sessionId,
    conversationId: prefixedId("conv"),
    ctx: DEMO_CONTEXT,
    userText,
  });
});

app.post("/v1/iterations", (req, res) => {
  const { previewId, sessionId, changeSet } = req.body as CreateIterationRequest;
  const changeRequest = changeSet?.freeText?.trim() ?? "";
  const attachments = changeSet?.attachments ?? [];
  if (!changeRequest && attachments.length === 0) {
    res.status(400).json({ error: "changeSet.freeText or an attachment is required" });
    return;
  }
  const attachmentUrls = attachments.map((a) => {
    const assetId = storeAsset(a.dataUrl);
    return `${req.protocol}://${req.get("host")}/v1/preview/${encodeURIComponent(previewId)}/assets/${assetId}`;
  });

  let changeId: string | undefined;
  void trackSafely(async () => {
    changeId = await recordRequestedChange(sessionId, changeRequest || "(attachment only)");
  });

  const job = createJob(anthropic, MODEL, previewId, changeRequest, attachmentUrls, (result) => {
    if (!changeId) return; // analytics tracking hadn't finished (or failed) before the job settled
    const status = result.status === "done" ? "applied" : "failed";
    void trackSafely(() => resolveRequestedChange(changeId as string, status, result.version));
  });
  res.json(job);
});

app.get("/v1/iterations/:id", (req, res) => {
  const job = advanceJob(req.params.id);
  if (!job) {
    res.status(404).end();
    return;
  }
  res.json(job);
});

app.get("/v1/preview/:id/site", (req, res) => {
  res.json(getSite(req.params.id));
});

// Dev convenience: seed a preview with arbitrary HTML (e.g. a real business's
// actual site, fetched once) instead of the hardcoded demo. Not part of the
// product surface Phillip's widget talks to.
app.post("/v1/preview/:id/seed", (req, res) => {
  const html = (req.body as { html?: unknown }).html;
  if (typeof html !== "string" || !html.trim()) {
    res.status(400).json({ error: "expected { html: string }" });
    return;
  }
  res.json(seedSite(req.params.id, html));
});

app.get("/v1/preview/:id/assets/:assetId", (req, res) => {
  const asset = getAsset(req.params.assetId);
  if (!asset) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", asset.mediaType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(asset.bytes);
});

app.get("/v1/dashboard/leads", async (_req, res) => {
  try {
    res.json(await getDashboardLeads());
  } catch (err) {
    console.error("dashboard query failed:", err);
    res.status(500).json({ error: "failed to load dashboard leads" });
  }
});

app.post("/v1/escalations", (_req, res) => {
  res.json({ ok: true });
});

app.post("/v1/checkout", (_req, res) => {
  res.json({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_demo" });
});

app.listen(PORT, () => {
  console.log(`phillip server (live, model=${MODEL}) on http://localhost:${PORT}`);
});
