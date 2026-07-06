import type { StreamEvent, StreamEventType } from "./types";

// Hand-rolled SSE over fetch. We don't use EventSource (can't POST or set
// headers) or a dependency — the parser is small and bundle size matters.

export interface RawSSEEvent {
  event: string;
  data: string;
  id?: string;
}

/**
 * Incremental SSE decoder. Feed it string chunks (in any split) and it returns
 * the complete frames found so far; call flush() at end-of-stream for a final
 * unterminated frame. Pure and synchronous, so it unit-tests with plain strings.
 */
export function createSSEDecoder() {
  let buffer = "";

  function parseBlock(block: string): RawSSEEvent | null {
    let event = "message";
    let id: string | undefined;
    const dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (line === "" || line.startsWith(":")) continue; // blank / comment
      const idx = line.indexOf(":");
      const field = idx === -1 ? line : line.slice(0, idx);
      let value = idx === -1 ? "" : line.slice(idx + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "event") event = value;
      else if (field === "data") dataLines.push(value);
      else if (field === "id") id = value;
    }

    if (event === "message" && dataLines.length === 0) return null;
    return { event, data: dataLines.join("\n"), id };
  }

  return {
    push(chunk: string): RawSSEEvent[] {
      // Normalize line endings so frames split cleanly on \n\n, even across
      // chunk boundaries.
      buffer = (buffer + chunk).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const events: RawSSEEvent[] = [];
      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseBlock(block);
        if (parsed) events.push(parsed);
        sep = buffer.indexOf("\n\n");
      }
      return events;
    },
    flush(): RawSSEEvent[] {
      const rest = buffer.trim();
      buffer = "";
      if (!rest) return [];
      const parsed = parseBlock(rest);
      return parsed ? [parsed] : [];
    },
  };
}

const STREAM_EVENT_TYPES = new Set<StreamEventType>([
  "meta",
  "delta",
  "intent",
  "sentiment",
  "propose_quick_replies",
  "approved",
  "start_iteration",
  "escalate",
  "open_checkout",
  "done",
]);

/** Map a raw SSE frame to a typed StreamEvent, or null if unrecognized. */
export function toStreamEvent(raw: RawSSEEvent): StreamEvent | null {
  const type = raw.event as StreamEventType;
  if (!STREAM_EVENT_TYPES.has(type)) return null;

  let data: unknown = {};
  if (raw.data) {
    try {
      data = JSON.parse(raw.data);
    } catch {
      // Tolerate plain-text deltas that aren't JSON-wrapped.
      data = { text: raw.data };
    }
  }
  return { type, data } as StreamEvent;
}

/** Read a fetch response body as a stream of typed StreamEvents. */
export async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const sse = createSSEDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const raw of sse.push(decoder.decode(value, { stream: true }))) {
        const ev = toStreamEvent(raw);
        if (ev) yield ev;
      }
    }
    for (const raw of sse.flush()) {
      const ev = toStreamEvent(raw);
      if (ev) yield ev;
    }
  } finally {
    reader.releaseLock();
  }
}
