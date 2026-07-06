import type { BootConfig } from "@nutz/phillip";
import type { ConversationContext } from "./persona";

// Same demo business as packages/phillip/mock/fixtures.ts ("Marisol's") so the
// two backends stay comparable while testing the live LLM against the mock.

export const DEMO_CONTEXT: ConversationContext = {
  personaName: "Phillip",
  business: "Marisol's",
  industry: "restaurant",
  offer: {
    amount: 4900,
    currency: "usd",
    includes: ["your custom site", "your own domain", "hosting + ssl", "edits anytime"],
  },
};

export function demoBootConfig(previewId: string): BootConfig {
  return {
    previewId,
    apiBase: "",
    lead: { id: "lead_marisol", business: "Marisol's", industry: "restaurant", stage: "opened" },
    preview: { id: previewId, url: "https://nutz.site/marisol", version: 1, status: "draft" },
    persona: { name: "Phillip", title: "founder · nutz", avatarUrl: "/phillip.jpg" },
    offer: {
      productId: "prod_site",
      priceId: "price_site_monthly",
      ...DEMO_CONTEXT.offer,
    },
    engagement: {
      weights: {
        activeTimePerSec: 0.5,
        activeTimeCapSec: 60,
        scrollDepthPerPct: 0.2,
        pricingPerSec: 1.0,
        pricingCapSec: 20,
        sectionViewPts: 5,
        sectionViewCap: 15,
        returningVisitorPts: 15,
        intentSignalPts: 5,
        intentSignalCap: 15,
      },
      threshold: 50,
      minDwellMs: 5_000,
      fallbackMs: 45_000,
      exitIntentEnabled: true,
      pingOncePerSession: true,
    },
    features: { iteration: true, escalation: true, checkout: false, setup: false },
    session: { id: `ses_${previewId}`, returning: false, startedAt: new Date().toISOString() },
  };
}
