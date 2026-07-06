import type Anthropic from "@anthropic-ai/sdk";
import type { Response } from "express";
import { fallbackClassify } from "./fallbackClassify";
import {
  type ConversationContext,
  type RouteDecision,
  buildSystemPrompt,
  routeTool,
} from "./persona";
import { appendTurn, getHistory, rememberQuickReplies } from "./store";

function writeFrame(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

const INTENTS = new Set(["positive", "iterate", "objection", "escalate", "unknown"]);
const SENTIMENTS = new Set(["positive", "neutral", "negative"]);

function isRouteDecision(x: unknown): x is RouteDecision {
  if (!x || typeof x !== "object") return false;
  const d = x as Record<string, unknown>;
  return INTENTS.has(d.intent as string) && SENTIMENTS.has(d.sentiment as string);
}

export interface StreamPhillipReplyOptions {
  anthropic: Anthropic;
  model: string;
  res: Response;
  sessionId: string;
  conversationId: string;
  ctx: ConversationContext;
  userText: string;
}

export async function streamPhillipReply(opts: StreamPhillipReplyOptions): Promise<void> {
  const { anthropic, model, res, sessionId, conversationId, ctx, userText } = opts;
  let headersSent = false;

  try {
    const history = getHistory(sessionId);
    const messages: Anthropic.MessageParam[] = [
      ...history.map((t) => ({ role: t.role, content: t.text })),
      { role: "user" as const, content: userText },
    ];

    const stream = anthropic.messages.stream({
      model,
      // Deliberately tight — Phillip texts like a person, not an essay. Also
      // a hard backstop against the model ignoring the brevity rule above.
      max_tokens: 100,
      system: buildSystemPrompt(ctx),
      messages,
      tools: [routeTool],
    });

    let decision: RouteDecision | undefined;
    stream.on("contentBlock", (block) => {
      if (block.type === "tool_use" && block.name === "route" && isRouteDecision(block.input)) {
        decision = block.input;
      }
    });

    // Don't commit the response (and the SSE 200) until we know Claude is
    // actually answering. Anthropic errors (bad key, no credit, etc.) surface
    // immediately, before any text — catching them here lets the client's
    // existing HTTP-failure path ("tap to try again") handle it, instead of
    // opening a stream that silently closes with nothing in it.
    const firstChunk = await new Promise<string>((resolve, reject) => {
      stream.once("text", resolve);
      stream.once("error", reject);
    });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    headersSent = true;
    writeFrame(res, "meta", { conversationId });
    writeFrame(res, "delta", { text: firstChunk });
    stream.on("text", (delta) => writeFrame(res, "delta", { text: delta }));

    const finalMessage = await stream.finalMessage();
    const fullText = finalMessage.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    appendTurn(sessionId, { role: "user", text: userText });
    appendTurn(sessionId, { role: "assistant", text: fullText });

    const resolved = decision ?? fallbackClassify(fullText);
    writeFrame(res, "intent", { intent: resolved.intent });
    writeFrame(res, "sentiment", { sentiment: resolved.sentiment });
    if (resolved.quickReplies?.length) {
      rememberQuickReplies(sessionId, resolved.quickReplies);
      writeFrame(res, "propose_quick_replies", { quickReplies: resolved.quickReplies });
    }
    if (resolved.control) {
      writeFrame(res, resolved.control, {});
    }
    writeFrame(res, "done", {});
  } catch (err) {
    console.error("phillip reply failed:", err);
    if (!headersSent) {
      res.status(502).json({ error: "phillip is having trouble right now" });
      return;
    }
    // Already streamed some of the reply — say so rather than trailing off
    // mid-sentence with no explanation.
    writeFrame(res, "delta", { text: " ...sorry, lost my train of thought there. try again?" });
    writeFrame(res, "intent", { intent: "unknown" });
    writeFrame(res, "sentiment", { sentiment: "neutral" });
    writeFrame(res, "done", {});
  } finally {
    if (headersSent) res.end();
  }
}
