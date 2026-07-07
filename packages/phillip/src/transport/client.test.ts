import { describe, expect, it } from "vitest";
import { TransportClient } from "./client";
import type { StreamEvent } from "./types";

// Exercises the real fetch/SSE path against the MSW mock (same handlers the
// playground uses), so the wire contract is verified end to end.
describe("TransportClient against the mock backend", () => {
  it("boots a preview", async () => {
    const client = new TransportClient({ apiBase: "" });
    const cfg = await client.boot("prv_demo");
    expect(cfg.lead.business).toBe("Marisol's");
    expect(cfg.engagement.threshold).toBeGreaterThan(0);
    expect(cfg.features.iteration).toBe(true);
  });

  it("streams an agent reply frame by frame", async () => {
    const client = new TransportClient({ apiBase: "" });
    const events: StreamEvent[] = [];
    for await (const ev of client.streamMessage("ses_x", { quickReplyId: "qr_revise" })) {
      events.push(ev);
    }
    const types = events.map((e) => e.type);
    expect(types[0]).toBe("meta");
    expect(types).toContain("delta");
    expect(types).toContain("start_iteration");
    expect(types[types.length - 1]).toBe("done");

    const text = events
      .filter((e): e is Extract<StreamEvent, { type: "delta" }> => e.type === "delta")
      .map((e) => e.data.text)
      .join("");
    expect(text.length).toBeGreaterThan(0);
  });

  it("runs an iteration job to completion", async () => {
    const client = new TransportClient({ apiBase: "" });
    const job = await client.createIteration({
      previewId: "prv_demo",
      sessionId: "ses_prv_demo",
      changeSet: { items: [] },
      round: 1,
    });
    expect(job.id).toBeTruthy();

    let status = job.status;
    let guard = 0;
    while (status !== "done" && guard++ < 10) {
      status = (await client.getIteration(job.id)).status;
    }
    expect(status).toBe("done");
  });
});
