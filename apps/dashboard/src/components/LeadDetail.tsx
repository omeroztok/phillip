import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { DashboardLead } from "../data/sample";
import { relativeTime } from "../lib/analytics";
import { drawer, item, scrim } from "../motion";
import { EventTimeline } from "./EventTimeline";
import { HeatmapModal } from "./HeatmapModal";
import { RequestedChanges } from "./RequestedChanges";
import { ScoreRing } from "./ScoreRing";
import { StageBadge } from "./StageBadge";
import { Transcript } from "./Transcript";
import { IconHeatmap } from "./icons";

const AVATAR = "/phillip.jpg";

export function LeadDetail({ lead, onClose }: { lead: DashboardLead; onClose: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const [showHeatmap, setShowHeatmap] = useState(false);
  const { device, geo } = lead.session;

  const context: Array<[string, string]> = [
    ["Source", lead.lead.source],
    ["Device", `${device.type} · ${device.os}`],
    ["Browser", device.browser],
    ["Location", geo ? [geo.city, geo.region, geo.country].filter(Boolean).join(", ") : "—"],
    ["Referrer", lead.session.referrer ?? "direct"],
    ["Visitor", lead.session.returning ? "returning" : "first visit"],
    ["Preview", `v${lead.preview.version} · ${lead.preview.status}`],
    ["Last seen", relativeTime(lead.session.lastSeen)],
  ];

  return (
    <>
      <m.div
        className="scrim"
        variants={scrim}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
      />
      <m.aside
        className="drawer"
        variants={drawer(reduce)}
        initial="initial"
        animate="animate"
        exit="exit"
        aria-label={`${lead.lead.business} detail`}
      >
        <m.header className="drawer-head" variants={item(reduce)}>
          <div className="drawer-title">
            <h2>{lead.lead.business}</h2>
            <p>{lead.lead.contact ?? lead.lead.industry}</p>
          </div>
          <div className="drawer-title-right">
            <StageBadge stage={lead.lead.stage} />
            <button type="button" className="heatmap-btn" onClick={() => setShowHeatmap(true)}>
              <IconHeatmap size={15} />
              Heatmap
            </button>
            <button type="button" className="drawer-close" onClick={onClose} aria-label="close">
              ×
            </button>
          </div>
        </m.header>

        <m.div className="drawer-score card" variants={item(reduce)}>
          <ScoreRing score={lead.engagementScore} />
          <div>
            <span className="drawer-score-label">Engagement score</span>
            <p className="drawer-score-sub">
              weighted from dwell, scroll, time on pricing, and return visits
            </p>
          </div>
        </m.div>

        <m.section className="drawer-section" variants={item(reduce)}>
          <h3>Context</h3>
          <dl className="context-grid">
            {context.map(([k, v]) => (
              <div key={k} className="context-cell">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </m.section>

        <m.section className="drawer-section" variants={item(reduce)}>
          <div className="drawer-section-head">
            <h3>Conversation</h3>
            <span className="drawer-persona">
              <img src={AVATAR} alt="Phillip" className="drawer-persona-img" />
              Phillip
            </span>
          </div>
          <Transcript conversation={lead.conversation} />
        </m.section>

        <m.section className="drawer-section" variants={item(reduce)}>
          <h3>Requested changes</h3>
          <RequestedChanges changes={lead.requestedChanges} />
        </m.section>

        <m.section className="drawer-section" variants={item(reduce)}>
          <h3>Activity</h3>
          <EventTimeline events={lead.events} />
        </m.section>
      </m.aside>

      <AnimatePresence>
        {showHeatmap ? <HeatmapModal lead={lead} onClose={() => setShowHeatmap(false)} /> : null}
      </AnimatePresence>
    </>
  );
}
