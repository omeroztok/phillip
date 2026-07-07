import type { AnalyticsEvent, Conversation, Lead, Order, Preview, Session } from "@nutz/phillip";

/** A single free-text ask a lead made to Phillip, and whether it landed. */
export interface RequestedChange {
  id: string;
  text: string;
  status: "pending" | "applied" | "failed";
  appliedVersion?: number;
  createdAt: string;
}

/** Bucketed hover/click/scroll-dwell totals for one session's heatmap. */
export interface HeatmapAggregate {
  grid: { cols: number; rows: number };
  /** The page's real proportions, so the viewer can render the full page at the right aspect ratio. */
  viewport: { width: number; height: number };
  pageHeight: number;
  /** [cellKey, count]. cellKey = col * grid.rows + row. */
  hover: Array<[number, number]>;
  click: Array<[number, number]>;
  /** [row, ms] */
  scrollMs: Array<[number, number]>;
}

// A composite of the shared records the way the team reads a single lead: the
// lead + its preview + session context + the engagement score, its event
// stream, and (once they talk) the conversation. This is exactly the shape a
// real backend would assemble from the same records the embed writes.
export interface DashboardLead {
  lead: Lead;
  preview: Preview;
  session: Session;
  engagementScore: number;
  events: AnalyticsEvent[];
  conversation?: Conversation;
  order?: Order;
  requestedChanges?: RequestedChange[];
  heatmap?: HeatmapAggregate;
}

const now = Date.now();
const min = 60_000;

// ts(n) => ISO string n minutes ago.
const ago = (mins: number): string => new Date(now - mins * min).toISOString();

let seq = 0;
const evt = <T extends AnalyticsEvent["type"]>(
  sessionId: string,
  type: T,
  payload: AnalyticsEvent["payload"],
  minsAgo: number,
): AnalyticsEvent => ({
  id: `evt_${(seq++).toString(36)}`,
  sessionId,
  type,
  payload,
  ts: ago(minsAgo),
});

function desktop(os: string, browser: string): Session["device"] {
  return { type: "desktop", os, browser, viewport: { width: 1440, height: 900 } };
}
function mobile(os: string, browser: string): Session["device"] {
  return { type: "mobile", os, browser, viewport: { width: 390, height: 844 } };
}

// --- the leads -------------------------------------------------------------

export const leads: DashboardLead[] = [
  {
    lead: {
      id: "lead_marisol",
      business: "Marisol's",
      contact: "Marisol Vega",
      industry: "restaurant",
      email: "marisol@marisols.co",
      source: "instagram dm",
      stage: "live",
    },
    preview: {
      id: "prv_8f2a",
      leadId: "lead_marisol",
      url: "https://nutz.site/marisol",
      version: 3,
      status: "live",
    },
    session: {
      id: "ses_marisol",
      previewId: "prv_8f2a",
      device: desktop("macOS", "Safari"),
      geo: { country: "US", region: "CA", city: "Oakland" },
      referrer: "instagram.com",
      startedAt: ago(52),
      lastSeen: ago(8),
      returning: true,
    },
    engagementScore: 92,
    order: {
      id: "ord_marisol",
      leadId: "lead_marisol",
      stripeId: "cs_test_marisol",
      amount: 4900,
      currency: "usd",
      status: "paid",
    },
    events: [
      evt("ses_marisol", "pageview", {}, 52),
      evt("ses_marisol", "section_view", { section: "hero", visibleMs: 4200 }, 51),
      evt("ses_marisol", "gallery_open", {}, 48),
      evt("ses_marisol", "section_view", { section: "pricing", visibleMs: 18400 }, 44),
      evt("ses_marisol", "cta_hover", { target: "book a table" }, 41),
      evt("ses_marisol", "ping_shown", { reason: "score", score: 78 }, 40),
      evt("ses_marisol", "conversation_opened", { trigger: "score" }, 40),
      evt("ses_marisol", "intent_classified", { intent: "iterate", sentiment: "positive" }, 38),
      evt("ses_marisol", "iteration_requested", { iterationId: "itr_1", round: 1 }, 37),
      evt("ses_marisol", "iteration_ready", { iterationId: "itr_1", version: 2 }, 34),
      evt("ses_marisol", "checkout_started", {}, 20),
      evt("ses_marisol", "paid", {}, 18),
      evt("ses_marisol", "funnel", { from: "paid", to: "live", reason: "setup_complete" }, 8),
    ],
    conversation: {
      id: "conv_marisol",
      sessionId: "ses_marisol",
      channel: "web",
      intent: "iterate",
      sentiment: "positive",
      messages: [
        {
          id: "m1",
          role: "phillip",
          text: "hey, i'm phillip 👋 i built this one for marisol's. honest take, what do you think?",
          ts: ago(40),
        },
        {
          id: "m2",
          role: "lead",
          text: "ohh this is really nice actually. can the hero photo be warmer?",
          ts: ago(39),
        },
        {
          id: "m3",
          role: "phillip",
          text: "totally, warmer hero, i'll punch up the headline too. give me a sec.",
          ts: ago(38),
        },
        { id: "m4", role: "phillip", text: "done, refresh to see it ✨", ts: ago(34) },
        { id: "m5", role: "lead", text: "love it. let's do it.", ts: ago(22) },
        { id: "m6", role: "phillip", text: "payment received. let's get you live 🎉", ts: ago(18) },
      ],
    },
  },
  {
    lead: {
      id: "lead_bloom",
      business: "Bloom & Co.",
      contact: "Dana Okafor",
      industry: "florist",
      email: "dana@bloomandco.shop",
      source: "cold outreach",
      stage: "checkout",
    },
    preview: {
      id: "prv_bloom",
      leadId: "lead_bloom",
      url: "https://nutz.site/bloom",
      version: 2,
      status: "draft",
    },
    session: {
      id: "ses_bloom",
      previewId: "prv_bloom",
      device: desktop("Windows", "Chrome"),
      geo: { country: "US", region: "IL", city: "Chicago" },
      referrer: "email",
      startedAt: ago(26),
      lastSeen: ago(2),
      returning: false,
    },
    engagementScore: 74,
    order: {
      id: "ord_bloom",
      leadId: "lead_bloom",
      amount: 4900,
      currency: "usd",
      status: "pending",
    },
    events: [
      evt("ses_bloom", "pageview", {}, 26),
      evt("ses_bloom", "section_view", { section: "gallery", visibleMs: 9200 }, 24),
      evt("ses_bloom", "section_view", { section: "pricing", visibleMs: 11200 }, 20),
      evt("ses_bloom", "ping_shown", { reason: "score", score: 66 }, 18),
      evt("ses_bloom", "conversation_opened", { trigger: "score" }, 18),
      evt("ses_bloom", "intent_classified", { intent: "positive", sentiment: "positive" }, 16),
      evt("ses_bloom", "checkout_started", {}, 3),
    ],
    conversation: {
      id: "conv_bloom",
      sessionId: "ses_bloom",
      channel: "web",
      intent: "positive",
      sentiment: "positive",
      messages: [
        {
          id: "b1",
          role: "phillip",
          text: "hey, i'm phillip. put this together for bloom & co. what's the first thing you notice?",
          ts: ago(18),
        },
        { id: "b2", role: "lead", text: "the gallery is gorgeous. how much is it?", ts: ago(17) },
        {
          id: "b3",
          role: "phillip",
          text: "$49/mo, site, your domain, hosting, edits anytime. want to make it live?",
          ts: ago(16),
        },
        { id: "b4", role: "lead", text: "yeah let's do it", ts: ago(3) },
      ],
    },
  },
  {
    lead: {
      id: "lead_forge",
      business: "Forge Barbers",
      contact: "Theo Marín",
      industry: "barbershop",
      source: "referral",
      stage: "iterating",
    },
    preview: {
      id: "prv_forge",
      leadId: "lead_forge",
      url: "https://nutz.site/forge",
      version: 2,
      status: "draft",
    },
    session: {
      id: "ses_forge",
      previewId: "prv_forge",
      device: mobile("iOS", "Safari"),
      geo: { country: "US", region: "TX", city: "Austin" },
      referrer: "sms",
      startedAt: ago(15),
      lastSeen: ago(1),
      returning: false,
    },
    engagementScore: 61,
    events: [
      evt("ses_forge", "pageview", {}, 15),
      evt("ses_forge", "section_view", { section: "hero", visibleMs: 5200 }, 14),
      evt("ses_forge", "cta_hover", { target: "book now" }, 12),
      evt("ses_forge", "ping_shown", { reason: "score", score: 55 }, 11),
      evt("ses_forge", "conversation_opened", { trigger: "score" }, 11),
      evt("ses_forge", "intent_classified", { intent: "iterate", sentiment: "neutral" }, 9),
      evt("ses_forge", "iteration_requested", { iterationId: "itr_forge", round: 1 }, 8),
    ],
    conversation: {
      id: "conv_forge",
      sessionId: "ses_forge",
      channel: "web",
      intent: "iterate",
      sentiment: "neutral",
      messages: [
        {
          id: "f1",
          role: "phillip",
          text: "hey, phillip here. built this for forge. what's off, the look, the words, or the photos?",
          ts: ago(11),
        },
        {
          id: "f2",
          role: "lead",
          text: "colors are too bright. can it be darker / moodier?",
          ts: ago(9),
        },
        { id: "f3", role: "phillip", text: "got it, darker, moodier palette. on it.", ts: ago(8) },
      ],
    },
  },
  {
    lead: {
      id: "lead_verde",
      business: "Casa Verde",
      contact: "Lucía Romero",
      industry: "cafe",
      email: "hola@casaverde.mx",
      source: "cold outreach",
      stage: "escalated",
    },
    preview: {
      id: "prv_verde",
      leadId: "lead_verde",
      url: "https://nutz.site/verde",
      version: 1,
      status: "draft",
    },
    session: {
      id: "ses_verde",
      previewId: "prv_verde",
      device: desktop("macOS", "Chrome"),
      geo: { country: "MX", region: "CDMX", city: "Mexico City" },
      referrer: "email",
      startedAt: ago(90),
      lastSeen: ago(70),
      returning: false,
    },
    engagementScore: 58,
    events: [
      evt("ses_verde", "pageview", {}, 90),
      evt("ses_verde", "section_view", { section: "menu", visibleMs: 14200 }, 86),
      evt("ses_verde", "ping_shown", { reason: "fallback", score: 40 }, 82),
      evt("ses_verde", "conversation_opened", { trigger: "fallback" }, 82),
      evt("ses_verde", "intent_classified", { intent: "escalate", sentiment: "neutral" }, 78),
      evt("ses_verde", "escalated", { email: "hola@casaverde.mx" }, 76),
      evt(
        "ses_verde",
        "funnel",
        { from: "reacted", to: "escalated", reason: "heavy_or_round_cap" },
        76,
      ),
    ],
    conversation: {
      id: "conv_verde",
      sessionId: "ses_verde",
      channel: "web",
      intent: "escalate",
      sentiment: "neutral",
      messages: [
        {
          id: "v1",
          role: "phillip",
          text: "hola, soy phillip. armé esto para casa verde. ¿qué te parece?",
          ts: ago(82),
        },
        {
          id: "v2",
          role: "lead",
          text: "necesito reservaciones en línea y menú con precios que cambian por temporada",
          ts: ago(80),
        },
        {
          id: "v3",
          role: "phillip",
          text: "eso es más grande y vale hacerlo bien. déjame tu correo y un colega lo toma.",
          ts: ago(78),
        },
        { id: "v4", role: "lead", text: "hola@casaverde.mx", ts: ago(77) },
      ],
    },
  },
  {
    lead: {
      id: "lead_pixel",
      business: "Pixel Pilates",
      contact: "Renée Adler",
      industry: "fitness studio",
      source: "instagram dm",
      stage: "reacted",
    },
    preview: {
      id: "prv_pixel",
      leadId: "lead_pixel",
      url: "https://nutz.site/pixel",
      version: 1,
      status: "draft",
    },
    session: {
      id: "ses_pixel",
      previewId: "prv_pixel",
      device: mobile("Android", "Chrome"),
      geo: { country: "CA", region: "ON", city: "Toronto" },
      referrer: "instagram.com",
      startedAt: ago(9),
      lastSeen: ago(4),
      returning: false,
    },
    engagementScore: 47,
    events: [
      evt("ses_pixel", "pageview", {}, 9),
      evt("ses_pixel", "section_view", { section: "hero", visibleMs: 3800 }, 8),
      evt("ses_pixel", "section_view", { section: "schedule", visibleMs: 6100 }, 7),
      evt("ses_pixel", "ping_shown", { reason: "score", score: 44 }, 6),
      evt("ses_pixel", "conversation_opened", { trigger: "score" }, 6),
      evt("ses_pixel", "intent_classified", { intent: "positive", sentiment: "positive" }, 5),
    ],
    conversation: {
      id: "conv_pixel",
      sessionId: "ses_pixel",
      channel: "web",
      intent: "positive",
      sentiment: "positive",
      messages: [
        {
          id: "p1",
          role: "phillip",
          text: "hey! phillip here, i built this for pixel pilates. first impression?",
          ts: ago(6),
        },
        { id: "p2", role: "lead", text: "cute! i'll show my partner and come back", ts: ago(5) },
      ],
    },
  },
  {
    lead: {
      id: "lead_harbor",
      business: "Harbor Books",
      contact: "Sam Whitfield",
      industry: "bookstore",
      source: "cold outreach",
      stage: "engaged",
    },
    preview: {
      id: "prv_harbor",
      leadId: "lead_harbor",
      url: "https://nutz.site/harbor",
      version: 1,
      status: "draft",
    },
    session: {
      id: "ses_harbor",
      previewId: "prv_harbor",
      device: desktop("Windows", "Edge"),
      geo: { country: "US", region: "ME", city: "Portland" },
      referrer: "email",
      startedAt: ago(6),
      lastSeen: ago(3),
      returning: false,
    },
    engagementScore: 33,
    events: [
      evt("ses_harbor", "pageview", {}, 6),
      evt("ses_harbor", "section_view", { section: "hero", visibleMs: 2600 }, 5),
      evt("ses_harbor", "ping_shown", { reason: "score", score: 31 }, 4),
      evt("ses_harbor", "conversation_opened", { trigger: "score" }, 4),
    ],
    conversation: {
      id: "conv_harbor",
      sessionId: "ses_harbor",
      channel: "web",
      messages: [
        {
          id: "h1",
          role: "phillip",
          text: "hey, i'm phillip, made this for harbor books. take a look, no rush.",
          ts: ago(4),
        },
      ],
    },
  },
  {
    lead: {
      id: "lead_nomad",
      business: "Nomad Coffee",
      industry: "coffee roaster",
      source: "referral",
      stage: "opened",
    },
    preview: {
      id: "prv_nomad",
      leadId: "lead_nomad",
      url: "https://nutz.site/nomad",
      version: 1,
      status: "draft",
    },
    session: {
      id: "ses_nomad",
      previewId: "prv_nomad",
      device: mobile("iOS", "Safari"),
      geo: { country: "US", region: "WA", city: "Seattle" },
      referrer: "sms",
      startedAt: ago(3),
      lastSeen: ago(3),
      returning: false,
    },
    engagementScore: 12,
    events: [
      evt("ses_nomad", "pageview", {}, 3),
      evt("ses_nomad", "section_view", { section: "hero", visibleMs: 1400 }, 3),
    ],
  },
];
