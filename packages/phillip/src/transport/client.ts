import type { BootConfig } from "../types/boot";
import { type FetchLike, HttpError, Rest } from "./rest";
import { readSSE } from "./sse";
import type {
  CheckoutResponse,
  CreateIterationRequest,
  EscalationRequest,
  EventsBatchRequest,
  IterationJob,
  SendMessageRequest,
  SiteState,
  StreamEvent,
} from "./types";

export interface TransportOptions {
  apiBase: string;
  fetch?: FetchLike;
  headers?: Record<string, string>;
}

// The single seam between the embed and the backend. Construct with an
// injectable fetch so unit tests can drive it without a network or MSW.
export class TransportClient {
  private readonly rest: Rest;
  private readonly fetchImpl: FetchLike;
  private readonly base: string;
  private readonly headers?: Record<string, string>;

  constructor(opts: TransportOptions) {
    this.base = `${opts.apiBase.replace(/\/+$/, "")}/v1`;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.headers = opts.headers;
    this.rest = new Rest({ baseUrl: this.base, fetch: this.fetchImpl, headers: opts.headers });
  }

  /** The single mount fetch: resolve previewId to everything the embed needs. */
  boot(previewId: string): Promise<BootConfig> {
    return this.rest.getJson<BootConfig>(`/preview/${encodeURIComponent(previewId)}/boot`);
  }

  /** Batched silent analytics + funnel events. */
  sendEvents(req: EventsBatchRequest): Promise<void> {
    return this.rest.postVoid("/events", req);
  }

  /** Send a message and stream the agent's reply, frame by frame. */
  async *streamMessage(sessionId: string, req: SendMessageRequest): AsyncGenerator<StreamEvent> {
    const res = await this.fetchImpl(
      `${this.base}/conversations/${encodeURIComponent(sessionId)}/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream",
          ...this.headers,
        },
        body: JSON.stringify(req),
      },
    );
    if (!res.ok || !res.body) {
      throw new HttpError(res.status, "conversations/messages", "failed to open stream");
    }
    yield* readSSE(res.body);
  }

  createIteration(req: CreateIterationRequest): Promise<IterationJob> {
    return this.rest.postJson<IterationJob>("/iterations", req);
  }

  getIteration(id: string): Promise<IterationJob> {
    return this.rest.getJson<IterationJob>(`/iterations/${encodeURIComponent(id)}`);
  }

  /** The preview's current generated markup — refetch after an iteration lands. */
  getSite(previewId: string): Promise<SiteState> {
    return this.rest.getJson<SiteState>(`/preview/${encodeURIComponent(previewId)}/site`);
  }

  // --- stubbed phases (typed now, wired later) ---

  escalate(req: EscalationRequest): Promise<{ ok: boolean }> {
    return this.rest.postJson<{ ok: boolean }>("/escalations", req);
  }

  checkout(sessionId: string): Promise<CheckoutResponse> {
    return this.rest.postJson<CheckoutResponse>("/checkout", { sessionId });
  }
}
