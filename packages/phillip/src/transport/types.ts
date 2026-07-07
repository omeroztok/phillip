import type { Intent, QuickReply, Sentiment } from "../intent/types";
import type { AnalyticsEvent } from "../types/events";
import type { ChangeSet, IterationStatus } from "../types/records";

// Wire shapes shared by the client and the mock backend. The real nutz.inc
// backend implements the same contract.

export interface SendMessageRequest {
  message?: string;
  quickReplyId?: string;
  context?: Record<string, unknown>;
}

export interface EventsBatchRequest {
  sessionId: string;
  events: AnalyticsEvent[];
}

export interface CreateIterationRequest {
  previewId: string;
  sessionId: string;
  changeSet: ChangeSet;
  round: number;
}

export interface IterationJob {
  id: string;
  status: IterationStatus;
  resultUrl?: string;
  version?: number;
}

export interface EscalationRequest {
  sessionId: string;
  email: string;
}

export interface CheckoutResponse {
  checkoutUrl?: string;
  clientSecret?: string;
}

/** The website preview's current generated markup + version. */
export interface SiteState {
  html: string;
  version: number;
}

// The agent's reply streams as a sequence of these (one per SSE frame).
// The control events (approved / start_iteration / escalate / open_checkout)
// let the backend drive the on-screen sub-flow without the client guessing.
export type StreamEvent =
  | { type: "meta"; data: { conversationId: string } }
  | { type: "delta"; data: { text: string } }
  | { type: "intent"; data: { intent: Intent } }
  | { type: "sentiment"; data: { sentiment: Sentiment } }
  | { type: "propose_quick_replies"; data: { quickReplies: QuickReply[] } }
  | { type: "approved"; data: Record<string, never> }
  | { type: "start_iteration"; data: { hint?: string } }
  | { type: "escalate"; data: { reason?: string } }
  | { type: "open_checkout"; data: Record<string, never> }
  | { type: "done"; data: Record<string, never> };

export type StreamEventType = StreamEvent["type"];
