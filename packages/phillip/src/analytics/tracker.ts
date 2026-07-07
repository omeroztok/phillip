import { watchExitIntent } from "../engagement/exitIntent";
import { type EngagementSignals, computeScore } from "../engagement/score";
import { decide } from "../engagement/triggerEngine";
import { prefixedId } from "../lib/id";
import { log } from "../lib/log";
import type { TransportClient } from "../transport";
import type { EngagementConfig } from "../types/boot";
import type { AnalyticsEvent, EventPayload, EventType, PingReason } from "../types/events";
import { HeatmapCollector } from "./heatmap";
import { ActivityMonitor } from "./idle";
import { SectionTracker } from "./sections";
import { SignalTracker } from "./signals";

export interface TrackerCallbacks {
  onPing?: (reason: PingReason, score: number) => void;
}

export interface TrackerOptions {
  returningVisitor: boolean;
}

const TICK_MS = 1000;
const FLUSH_MS = 5000;
const BATCH_MAX = 20;

/**
 * The always-watching controller. Wires the DOM listeners, accumulates the
 * engagement signals, ticks the trigger engine to decide the ping moment, and
 * batches analytics events to the backend. Runs against the host page; widget
 * interactions are filtered out upstream.
 */
export class Tracker {
  callbacks: TrackerCallbacks = {};

  private readonly activity = new ActivityMonitor();
  private readonly sections = new SectionTracker();
  private readonly signals = new SignalTracker();
  private readonly heatmap = new HeatmapCollector();

  private startedAt = Date.now();
  private activeTimeSec = 0;
  private exitIntent = false;
  private pinged = false;

  private queue: AnalyticsEvent[] = [];
  private tickTimer?: ReturnType<typeof setInterval>;
  private flushTimer?: ReturnType<typeof setInterval>;
  private cleanups: Array<() => void> = [];

  constructor(
    private readonly sessionId: string,
    private readonly config: EngagementConfig,
    private readonly client: TransportClient,
    private readonly opts: TrackerOptions,
  ) {}

  start(): void {
    this.startedAt = Date.now();
    this.activity.start();
    this.signals.start((type, payload) => this.track(type, payload));
    this.sections.start((name) => this.track("section_view", { section: name, visibleMs: 0 }));
    this.heatmap.start();

    if (this.config.exitIntentEnabled) {
      this.cleanups.push(
        watchExitIntent(() => {
          this.exitIntent = true;
        }),
      );
    }
    this.track("pageview", {});

    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    this.flushTimer = setInterval(() => void this.flush(), FLUSH_MS);

    const onHide = () => void this.flush();
    window.addEventListener("pagehide", onHide);
    this.cleanups.push(() => window.removeEventListener("pagehide", onHide));

    const onVisibility = () => {
      if (document.visibilityState === "hidden") void this.flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));
  }

  snapshot(): EngagementSignals {
    return {
      activeTimeSec: this.activeTimeSec,
      scrollDepthPct: this.signals.scrollDepthPct,
      timeOnPricingSec: this.sections.dwellSec("pricing"),
      sectionsViewed: this.sections.distinctCount(),
      returningVisitor: this.opts.returningVisitor,
      ctaHovers: this.signals.ctaHovers,
      galleryOpens: this.signals.galleryOpens,
      contactInteractions: this.signals.contactInteractions,
      idleNow: !this.activity.isActive(),
    };
  }

  score(): number {
    return computeScore(this.snapshot(), this.config.weights);
  }

  private tick(): void {
    if (this.activity.isActive()) {
      this.activeTimeSec += TICK_MS / 1000;
      this.heatmap.tick(TICK_MS);
    }
    if (this.pinged && this.config.pingOncePerSession) return;

    const score = this.score();
    const decision = decide(
      {
        score,
        dwellMs: Date.now() - this.startedAt,
        exitIntent: this.exitIntent,
        alreadyPinged: this.pinged,
      },
      this.config,
    );
    if (decision.shouldPing && decision.reason) {
      this.pinged = true;
      this.track("ping_shown", { reason: decision.reason, score });
      log.debug("ping", { reason: decision.reason, score });
      this.callbacks.onPing?.(decision.reason, score);
    }
  }

  /** Enqueue a typed analytics event (also used by conversation/funnel). */
  track<T extends EventType>(type: T, payload: EventPayload<T>): void {
    const event: AnalyticsEvent<T> = {
      id: prefixedId("evt"),
      sessionId: this.sessionId,
      type,
      payload,
      ts: new Date().toISOString(),
    };
    this.queue.push(event as AnalyticsEvent);
    if (this.queue.length >= BATCH_MAX) void this.flush();
  }

  private async flush(): Promise<void> {
    const heatmap = this.heatmap.flush();
    if (heatmap) this.track("heatmap_sample", heatmap);
    if (this.queue.length === 0) return;
    const events = this.queue;
    this.queue = [];
    try {
      await this.client.sendEvents({ sessionId: this.sessionId, events });
    } catch (err) {
      log.debug("event flush failed; re-queueing", err);
      this.queue.unshift(...events);
    }
  }

  stop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.activity.stop();
    this.sections.stop();
    this.signals.stop();
    this.heatmap.stop();
    for (const c of this.cleanups) c();
    this.cleanups = [];
    void this.flush();
  }
}
