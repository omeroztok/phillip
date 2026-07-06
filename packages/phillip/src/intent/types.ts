// Conversation primitives (SPEC.md "Conversation" record + Phase 03 routing).

export type Intent = "positive" | "iterate" | "objection" | "escalate" | "unknown";

export type Sentiment = "positive" | "neutral" | "negative";

export type MessageRole = "phillip" | "lead" | "system";

export interface QuickReply {
  id: string;
  label: string;
  intent?: Intent;
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  ts: string;
  intent?: Intent;
  sentiment?: Sentiment;
  quickReplies?: QuickReply[];
  /** True while the assistant reply is still streaming in. */
  streaming?: boolean;
  /** True while a background job (e.g. a revision) this bubble represents is still running. */
  working?: boolean;
  /** True when the reply failed and a retry affordance should show. */
  error?: boolean;
  /**
   * Optional iMessage-style tap-back reaction (e.g. "❤️", "👍"). Purely visual
   * for now — nothing populates it yet; the bubble renders the badge slot when
   * present so the feature is ready to wire to the backend later.
   */
  reaction?: string;
}

export interface Conversation {
  id: string;
  sessionId: string;
  channel: "web" | "email";
  messages: Message[];
  intent?: Intent;
  sentiment?: Sentiment;
}
