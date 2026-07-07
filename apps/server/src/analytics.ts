import type { AnalyticsEvent, BootConfig } from "@nutz/phillip";
import {
  type EngagementSignals,
  computeScore,
} from "../../../packages/phillip/src/engagement/score";
import { DEFAULT_WEIGHTS } from "../../../packages/phillip/src/engagement/weights";
import type { HeatmapPayload } from "../../../packages/phillip/src/types/events";
import { db } from "./db";
import { prefixedId } from "./id";

const NON_ACTIVITY_EVENTS = new Set(["transcript", "heatmap_sample"]);

// The dashboard-facing analytics store. Every function here is best-effort:
// a DB hiccup must never break the actual product (boot, chat, iteration),
// so callers wrap these in try/catch and just log — same fire-and-forget
// spirit as the client's own Tracker.flush().

function parseUserAgent(ua: string | undefined): { type: string; os: string; browser: string } {
  const s = ua ?? "";
  const type = /Mobile|iPhone|Android/.test(s)
    ? "mobile"
    : /iPad|Tablet/.test(s)
      ? "tablet"
      : "desktop";
  const os = /Windows/.test(s)
    ? "Windows"
    : /Mac OS X/.test(s)
      ? "macOS"
      : /Android/.test(s)
        ? "Android"
        : /iPhone|iPad/.test(s)
          ? "iOS"
          : "unknown";
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /Chrome\//.test(s)
      ? "Chrome"
      : /Safari\//.test(s)
        ? "Safari"
        : /Firefox\//.test(s)
          ? "Firefox"
          : "unknown";
  return { type, os, browser };
}

/** Lazily provisions Lead + Preview + PreviewSession the first time a previewId is booted; touches lastSeen on repeat boots. */
export async function ensureLeadAndSession(
  boot: BootConfig,
  opts: { referrer?: string; userAgent?: string },
): Promise<void> {
  const { type, os, browser } = parseUserAgent(opts.userAgent);

  await db.lead.upsert({
    where: { id: boot.lead.id },
    create: {
      id: boot.lead.id,
      business: boot.lead.business,
      industry: boot.lead.industry,
      stage: boot.lead.stage,
    },
    update: { stage: boot.lead.stage },
  });

  await db.preview.upsert({
    where: { id: boot.preview.id },
    create: {
      id: boot.preview.id,
      leadId: boot.lead.id,
      url: boot.preview.url,
      version: boot.preview.version,
      status: boot.preview.status,
    },
    update: { version: boot.preview.version, status: boot.preview.status },
  });

  await db.previewSession.upsert({
    where: { id: boot.session.id },
    create: {
      id: boot.session.id,
      leadId: boot.lead.id,
      previewId: boot.preview.id,
      deviceType: type,
      deviceOs: os,
      deviceBrowser: browser,
      referrer: opts.referrer,
      returning: boot.session.returning,
    },
    update: { lastSeen: new Date() },
  });
}

function toSignals(
  session: { returning: boolean },
  events: Array<{ type: string; payload: string }>,
  activeTimeSec: number,
): EngagementSignals {
  let scrollDepthPct = 0;
  let timeOnPricingSec = 0;
  const sections = new Set<string>();
  let ctaHovers = 0;
  let galleryOpens = 0;
  let contactInteractions = 0;

  for (const e of events) {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(e.payload) as Record<string, unknown>;
    } catch {
      // malformed payload — skip this event's contribution, don't fail the batch
    }
    if (e.type === "scroll_depth" && typeof payload.pct === "number") {
      scrollDepthPct = Math.max(scrollDepthPct, payload.pct);
    } else if (e.type === "section_view" && typeof payload.section === "string") {
      sections.add(payload.section);
      if (payload.section === "pricing" && typeof payload.visibleMs === "number") {
        timeOnPricingSec += payload.visibleMs / 1000;
      }
    } else if (e.type === "cta_hover") {
      ctaHovers += 1;
    } else if (e.type === "gallery_open") {
      galleryOpens += 1;
    } else if (e.type === "contact_interaction") {
      contactInteractions += 1;
    }
  }

  return {
    activeTimeSec,
    scrollDepthPct,
    timeOnPricingSec,
    sectionsViewed: sections.size,
    returningVisitor: session.returning,
    ctaHovers,
    galleryOpens,
    contactInteractions,
    idleNow: false,
  };
}

/** Persists a batch of events, logs conversation turns, and refreshes the engagement score. */
export async function recordEvents(sessionId: string, events: AnalyticsEvent[]): Promise<void> {
  const session = await db.previewSession.findUnique({ where: { id: sessionId } });
  if (!session) return; // analytics must never invent a session out of thin air

  // SQLite doesn't support `skipDuplicates` (Postgres/MySQL only) — a resent
  // batch after a client-side flush retry is a rare edge case, and the whole
  // call is wrapped by the caller so a duplicate-id error here just logs and
  // moves on rather than breaking the /v1/events endpoint.
  await db.interactionEvent.createMany({
    data: events.map((e) => ({
      id: e.id,
      sessionId,
      type: e.type,
      payload: JSON.stringify(e.payload),
      ts: new Date(e.ts),
    })),
  });

  const transcriptRows = events
    .filter((e) => e.type === "transcript")
    .map((e) => {
      const p = e.payload as { role: string; text: string };
      return { id: prefixedId("msg"), sessionId, role: p.role, text: p.text, ts: new Date(e.ts) };
    });
  if (transcriptRows.length) {
    await db.conversationMessage.createMany({ data: transcriptRows });
  }

  const allEvents = await db.interactionEvent.findMany({ where: { sessionId } });
  // No per-tick "active seconds" event is sent today — approximate with
  // elapsed wall-clock time since the session started, capped. Good enough
  // for a real, monotonic signal; refining this is a client-instrumentation
  // task (heatmap phase), not something this recompute alone can fix.
  const activeTimeSec = Math.min(
    600,
    Math.max(0, (Date.now() - session.startedAt.getTime()) / 1000),
  );
  const signals = toSignals(session, allEvents, activeTimeSec);
  const engagementScore = computeScore(signals, DEFAULT_WEIGHTS);

  await db.previewSession.update({
    where: { id: sessionId },
    data: { lastSeen: new Date(), engagementScore },
  });
}

/** Records a lead's free-text ask, keyed to the session it came from. */
export async function recordRequestedChange(sessionId: string, text: string): Promise<string> {
  const id = prefixedId("chg");
  await db.requestedChange.create({ data: { id, sessionId, text } });
  return id;
}

export async function resolveRequestedChange(
  id: string,
  status: "applied" | "failed",
  appliedVersion?: number,
): Promise<void> {
  await db.requestedChange.update({ where: { id }, data: { status, appliedVersion } });
}

export interface HeatmapAggregate {
  grid: { cols: number; rows: number };
  /** The page's real proportions (last sample seen) — lets the viewer render
   * the full page at the right aspect ratio instead of a squashed fixed box. */
  viewport: { width: number; height: number };
  pageHeight: number;
  /** [cellKey, count] totals across every sample this session sent. cellKey = col * grid.rows + row. */
  hover: Array<[number, number]>;
  click: Array<[number, number]>;
  scrollMs: Array<[number, number]>;
}

/** Sums every heatmap_sample delta a session sent into one totals grid. */
function aggregateHeatmap(
  events: Array<{ type: string; payload: string }>,
): HeatmapAggregate | undefined {
  const hover = new Map<number, number>();
  const click = new Map<number, number>();
  const scroll = new Map<number, number>();
  let grid: { cols: number; rows: number } | undefined;
  let viewport: { width: number; height: number } | undefined;
  let pageHeight: number | undefined;

  for (const e of events) {
    if (e.type !== "heatmap_sample") continue;
    let p: HeatmapPayload;
    try {
      p = JSON.parse(e.payload) as HeatmapPayload;
    } catch {
      continue; // malformed sample — skip it, don't fail the whole aggregate
    }
    grid = p.grid;
    // Keep the tallest page/viewport pairing seen, not just the last one —
    // a viewport resize mid-session (or one short, wide sample) shouldn't
    // truncate the scrollable area below what was actually recorded.
    if (pageHeight === undefined || p.pageHeight > pageHeight) {
      viewport = p.viewport;
      pageHeight = p.pageHeight;
    }
    for (const [key, count] of p.hover) hover.set(key, (hover.get(key) ?? 0) + count);
    for (const [key, count] of p.click) click.set(key, (click.get(key) ?? 0) + count);
    for (const [row, ms] of p.scrollMs) scroll.set(row, (scroll.get(row) ?? 0) + ms);
  }

  if (!grid || !viewport || !pageHeight) return undefined;
  return {
    grid,
    viewport,
    pageHeight,
    hover: [...hover.entries()],
    click: [...click.entries()],
    scrollMs: [...scroll.entries()],
  };
}

export interface DashboardLead {
  lead: {
    id: string;
    business: string;
    contact?: string;
    industry?: string;
    email?: string;
    source: string;
    stage: string;
  };
  preview: { id: string; leadId: string; url: string; version: number; status: string };
  session: {
    id: string;
    previewId: string;
    device: {
      type: string;
      os: string;
      browser: string;
      viewport: { width: number; height: number };
    };
    geo?: { country?: string; region?: string; city?: string };
    referrer?: string;
    startedAt: string;
    lastSeen: string;
    returning: boolean;
  };
  engagementScore: number;
  events: AnalyticsEvent[];
  heatmap?: HeatmapAggregate;
  conversation?: {
    id: string;
    sessionId: string;
    channel: "web";
    messages: Array<{ id: string; role: string; text: string; ts: string }>;
  };
  requestedChanges: Array<{
    id: string;
    text: string;
    status: string;
    appliedVersion?: number;
    createdAt: string;
  }>;
}

/** Assembles DashboardLead[] — the exact shape apps/dashboard already renders. */
export async function getDashboardLeads(): Promise<DashboardLead[]> {
  const leads = await db.lead.findMany({
    include: {
      previews: true,
      sessions: {
        orderBy: { lastSeen: "desc" },
        take: 1,
        include: {
          events: { orderBy: { ts: "asc" } },
          messages: { orderBy: { ts: "asc" } },
          requestedChanges: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const result: DashboardLead[] = [];
  for (const lead of leads) {
    const session = lead.sessions[0];
    const preview = lead.previews[0];
    if (!session || !preview) continue; // no real activity yet for this lead

    result.push({
      lead: {
        id: lead.id,
        business: lead.business,
        contact: lead.contact ?? undefined,
        industry: lead.industry ?? undefined,
        email: lead.email ?? undefined,
        source: lead.source,
        stage: lead.stage,
      },
      preview: {
        id: preview.id,
        leadId: lead.id,
        url: preview.url,
        version: preview.version,
        status: preview.status,
      },
      session: {
        id: session.id,
        previewId: session.previewId,
        device: {
          type: session.deviceType,
          os: session.deviceOs,
          browser: session.deviceBrowser,
          viewport: { width: session.viewportWidth ?? 0, height: session.viewportHeight ?? 0 },
        },
        geo:
          session.geoCountry || session.geoRegion || session.geoCity
            ? {
                country: session.geoCountry ?? undefined,
                region: session.geoRegion ?? undefined,
                city: session.geoCity ?? undefined,
              }
            : undefined,
        referrer: session.referrer ?? undefined,
        startedAt: session.startedAt.toISOString(),
        lastSeen: session.lastSeen.toISOString(),
        returning: session.returning,
      },
      engagementScore: session.engagementScore,
      // "transcript" and "heatmap_sample" are transport mechanisms for the
      // conversation and heatmap below — surfacing them here too would just
      // duplicate every chat bubble / mouse sample in the activity feed.
      events: session.events
        .filter((e) => !NON_ACTIVITY_EVENTS.has(e.type))
        .map((e) => ({
          id: e.id,
          sessionId: e.sessionId,
          type: e.type as AnalyticsEvent["type"],
          payload: JSON.parse(e.payload),
          ts: e.ts.toISOString(),
        })),
      heatmap: aggregateHeatmap(session.events),
      conversation: session.messages.length
        ? {
            id: `conv_${session.id}`,
            sessionId: session.id,
            channel: "web",
            messages: session.messages.map((m) => ({
              id: m.id,
              role: m.role,
              text: m.text,
              ts: m.ts.toISOString(),
            })),
          }
        : undefined,
      requestedChanges: session.requestedChanges.map((c) => ({
        id: c.id,
        text: c.text,
        status: c.status,
        appliedVersion: c.appliedVersion ?? undefined,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  }
  return result;
}
