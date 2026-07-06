export interface Turn {
  role: "user" | "assistant";
  text: string;
}

// In-memory only — a restart drops every open conversation. Fine for a
// reference/dev backend; swap for a real store before this goes anywhere near
// production traffic.
const sessions = new Map<string, Turn[]>();

export function getHistory(sessionId: string): Turn[] {
  return sessions.get(sessionId) ?? [];
}

export function appendTurn(sessionId: string, turn: Turn): void {
  const history = sessions.get(sessionId);
  if (history) history.push(turn);
  else sessions.set(sessionId, [turn]);
}

// The client only echoes back a quick reply's id, not its label (see
// useConversation.ts) — since we're the ones minting those ids each turn,
// we're on the hook for resolving them back to text for the model. The three
// opening options are hardcoded client-side rather than served by us, so seed
// those labels too.
const INITIAL_QUICK_REPLY_LABELS: Record<string, string> = {
  qr_love: "love it",
  qr_but: "looks good, but…",
  qr_no: "not feeling it",
};

const quickReplyLabels = new Map<string, Map<string, string>>();

export function rememberQuickReplies(
  sessionId: string,
  replies: { id: string; label: string }[],
): void {
  const map = quickReplyLabels.get(sessionId) ?? new Map<string, string>();
  for (const r of replies) map.set(r.id, r.label);
  quickReplyLabels.set(sessionId, map);
}

export function resolveQuickReply(sessionId: string, id: string): string {
  return quickReplyLabels.get(sessionId)?.get(id) ?? INITIAL_QUICK_REPLY_LABELS[id] ?? id;
}
