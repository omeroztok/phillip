import type { Intent, QuickReply, Sentiment } from "../src/intent/types";

// Builds the streaming agent reply. This is the part that fakes "real-time
// typing" — frames are enqueued on a timer so the client exercises the actual
// SSE read path.

const enc = new TextEncoder();
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function frame(event: string, data: unknown): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export type ControlType = "start_iteration" | "escalate" | "open_checkout";

export interface ReplyPlan {
  intent: Intent;
  sentiment: Sentiment;
  text: string;
  quickReplies?: QuickReply[];
  control?: ControlType;
}

const REACTION_REPLIES: QuickReply[] = [
  { id: "qr_love", label: "love it", intent: "positive" },
  { id: "qr_but", label: "looks good, but…", intent: "iterate" },
  { id: "qr_no", label: "not feeling it", intent: "objection" },
];

const ITERATE_OPTIONS: QuickReply[] = [
  { id: "opt_colors", label: "the colors", intent: "iterate" },
  { id: "opt_copy", label: "the words", intent: "iterate" },
  { id: "opt_photos", label: "the photos", intent: "iterate" },
];

// The real backend runs a classifier; the mock keyword-matches. Same wire shape.
export function planReply(input: {
  message?: string;
  quickReplyId?: string;
  business: string;
}): ReplyPlan {
  const qr = input.quickReplyId;
  const text = (input.message ?? "").toLowerCase();
  const biz = input.business;

  if (qr === "qr_love") {
    return {
      intent: "positive",
      sentiment: "positive",
      text: `love that. honestly ${biz} earned it. want me to make it live?`,
      control: "open_checkout",
    };
  }
  if (qr === "qr_but" || qr === "opt_colors" || qr === "opt_copy" || qr === "opt_photos") {
    return {
      intent: "iterate",
      sentiment: "neutral",
      text: "totally. tell me what to change and i'll redo it right now.",
      control: "start_iteration",
    };
  }
  if (qr === "qr_no") {
    return {
      intent: "objection",
      sentiment: "negative",
      text: "fair. what's off, the look, the words, or the photos?",
      quickReplies: ITERATE_OPTIONS,
    };
  }

  if (/\b(talk|call|phone|human|someone|colleague|email me)\b/.test(text)) {
    return {
      intent: "escalate",
      sentiment: "neutral",
      text: "for sure. drop your email and my colleague picks it up, usually within the hour.",
      control: "escalate",
    };
  }
  if (
    /\b(book|booking|reserv|menu|order online|ecommerce|shop|integrat|payment|login|multi-?page)\b/.test(
      text,
    )
  ) {
    return {
      intent: "escalate",
      sentiment: "neutral",
      text: "that's a bigger one and worth doing right. drop your email and we'll take it from there.",
      control: "escalate",
    };
  }
  if (
    /\b(love|great|perfect|amazing|looks good|nice|yes|ship it|make it live|let's go)\b/.test(text)
  ) {
    return {
      intent: "positive",
      sentiment: "positive",
      text: "amazing. want me to make it live?",
      control: "open_checkout",
    };
  }
  if (
    /\b(color|colour|photo|image|copy|text|headline|font|logo|hours|contact|change|swap|darker|lighter|warmer|bolder)\b/.test(
      text,
    )
  ) {
    return {
      intent: "iterate",
      sentiment: "neutral",
      text: "got it. give me the specifics and i'll redo it now.",
      control: "start_iteration",
    };
  }

  return {
    intent: "unknown",
    sentiment: "neutral",
    text: `appreciate it. what do you think of ${biz}'s site, anything you'd change?`,
    quickReplies: REACTION_REPLIES,
  };
}

function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}

export function streamReply(
  plan: ReplyPlan,
  conversationId: string,
  opts?: { intervalMs?: number },
): ReadableStream<Uint8Array> {
  const interval = opts?.intervalMs ?? 20;
  const tokens = tokenize(plan.text);
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(frame("meta", { conversationId }));
      controller.enqueue(frame("intent", { intent: plan.intent }));
      controller.enqueue(frame("sentiment", { sentiment: plan.sentiment }));
      for (const t of tokens) {
        await delay(interval);
        controller.enqueue(frame("delta", { text: t }));
      }
      if (plan.quickReplies?.length) {
        controller.enqueue(frame("propose_quick_replies", { quickReplies: plan.quickReplies }));
      }
      if (plan.control) {
        controller.enqueue(frame(plan.control, {}));
      }
      controller.enqueue(frame("done", {}));
      controller.close();
    },
  });
}
