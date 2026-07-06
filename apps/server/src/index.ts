import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import express from "express";
import { DEMO_CONTEXT, demoBootConfig } from "./fixtures";
import { prefixedId } from "./id";
import { advanceJob, createJob } from "./jobs";
import { streamPhillipReply } from "./reply";
import { resolveQuickReply } from "./store";

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
app.use(express.json());

app.get("/v1/preview/:id/boot", (req, res) => {
  res.json(demoBootConfig(req.params.id));
});

app.post("/v1/events", (_req, res) => {
  res.status(204).end();
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
  res.json(createJob(req.body.previewId));
});

app.get("/v1/iterations/:id", (req, res) => {
  const job = advanceJob(req.params.id);
  if (!job) {
    res.status(404).end();
    return;
  }
  res.json(job);
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
