import type { Intent, MessageRole, Sentiment } from "../intent/types";
import type { LeadStage } from "./records";

/** A batch of bucketed hover/click/scroll-dwell deltas since the last flush. */
export interface HeatmapPayload {
  grid: { cols: number; rows: number };
  viewport: { width: number; height: number };
  pageHeight: number;
  /** [cellKey, count] deltas. cellKey = col * grid.rows + row. */
  hover: Array<[number, number]>;
  click: Array<[number, number]>;
  /** [row, ms] active-dwell deltas. */
  scrollMs: Array<[number, number]>;
}

// Why Phillip pinged — logged on every ping for offline tuning.
export type PingReason = "score" | "exit_intent" | "fallback";

export type EventType =
  // reach + attention
  | "pageview"
  | "scroll_depth"
  | "section_view"
  | "time_tick"
  | "active"
  | "idle"
  // intent
  | "click"
  | "cta_hover"
  | "gallery_open"
  | "video_play"
  | "contact_interaction"
  // conversation
  | "ping_shown"
  | "conversation_opened"
  | "message_sent"
  | "message_received"
  | "intent_classified"
  | "transcript"
  | "heatmap_sample"
  // iteration
  | "iteration_requested"
  | "iteration_ready"
  // funnel + downstream
  | "funnel"
  | "escalated"
  | "checkout_started"
  | "paid";

// Typed payloads for the events that carry structured data. Anything not
// listed here defaults to a loose record (see EventPayload).
export interface EventPayloadMap {
  scroll_depth: { pct: number };
  section_view: { section: string; visibleMs: number };
  cta_hover: { target: string };
  ping_shown: { reason: PingReason; score: number };
  conversation_opened: { trigger: PingReason | "manual" };
  message_sent: { messageId: string; viaQuickReply: boolean };
  message_received: { messageId: string };
  /** Every transcript bubble, verbatim — the dashboard's conversation record. */
  transcript: { role: MessageRole; text: string };
  heatmap_sample: HeatmapPayload;
  intent_classified: { intent: Intent; sentiment?: Sentiment };
  iteration_requested: { iterationId: string; round: number };
  iteration_ready: { iterationId: string; version?: number };
  funnel: { from: LeadStage | null; to: LeadStage; reason?: string };
  escalated: { email: string };
}

export type EventPayload<T extends EventType> = T extends keyof EventPayloadMap
  ? EventPayloadMap[T]
  : Record<string, unknown>;

export interface AnalyticsEvent<T extends EventType = EventType> {
  id: string;
  sessionId: string;
  type: T;
  payload: EventPayload<T>;
  ts: string;
}

/** Enqueue a typed analytics event. Payload type is inferred from the event. */
export type TrackFn = <T extends EventType>(type: T, payload: EventPayload<T>) => void;
