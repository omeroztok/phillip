import { http, HttpResponse } from "msw";
import { prefixedId } from "../src/lib/id";
import type {
  CreateIterationRequest,
  EscalationRequest,
  SendMessageRequest,
} from "../src/transport/types";
import { makeBootConfig } from "./fixtures";
import { advanceJob, createJob } from "./jobs";
import { getSite } from "./site";
import { planReply, streamReply } from "./stream";

// The one place the API contract lives. Wildcard origins (`*/v1/...`) so the
// same handlers match whatever apiBase the embed is configured with — the
// playground (same-origin) and vitest (happy-dom origin) both hit these.
export const handlers = [
  http.get("*/v1/preview/:id/boot", ({ params }) => {
    return HttpResponse.json(makeBootConfig(String(params.id)));
  }),

  http.post("*/v1/events", async ({ request }) => {
    // Silent analytics — accept and ack. (A real backend would persist these.)
    await request.json().catch(() => undefined);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/v1/conversations/:sessionId/messages", async ({ request }) => {
    const body = (await request.json()) as SendMessageRequest;
    const plan = planReply({
      message: body.message,
      quickReplyId: body.quickReplyId,
      business: "Marisol's",
    });
    const stream = streamReply(plan, prefixedId("conv"));
    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }),

  http.post("*/v1/iterations", async ({ request }) => {
    const body = (await request.json()) as CreateIterationRequest;
    return HttpResponse.json(createJob(body.previewId, body.changeSet.freeText));
  }),

  http.get("*/v1/iterations/:id", ({ params }) => {
    const job = advanceJob(String(params.id));
    if (!job) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(job);
  }),

  http.get("*/v1/preview/:id/site", ({ params }) => {
    return HttpResponse.json(getSite(String(params.id)));
  }),

  // --- stubbed phases (typed contract; bodies are placeholders) ---

  http.post("*/v1/escalations", async ({ request }) => {
    (await request.json().catch(() => undefined)) as EscalationRequest | undefined;
    return HttpResponse.json({ ok: true });
  }),

  http.post("*/v1/checkout", async () => {
    return HttpResponse.json({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_demo" });
  }),
];
