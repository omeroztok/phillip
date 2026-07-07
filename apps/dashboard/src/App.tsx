import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Funnel } from "./components/Funnel";
import { KpiCards } from "./components/KpiCards";
import { LeadDetail } from "./components/LeadDetail";
import { LeadsTable } from "./components/LeadsTable";
import { Sidebar } from "./components/Sidebar";
import { IconBell, IconSearch } from "./components/icons";
import type { DashboardLead } from "./data/sample";
import { useDashboardLeads } from "./data/useDashboardLeads";
import { container, item } from "./motion";

export default function App() {
  const reduce = useReducedMotion() ?? false;
  const [selected, setSelected] = useState<DashboardLead | null>(null);
  const [query, setQuery] = useState("");
  const { leads, error } = useDashboardLeads();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.lead.business, l.lead.contact, l.lead.industry].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [query, leads]);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="shell">
        <Sidebar active="overview" />

        <div className="main">
          <m.header
            className="topbar"
            variants={container(reduce)}
            initial="initial"
            animate="animate"
          >
            <m.div variants={item(reduce)}>
              <h1 className="topbar-title">Overview</h1>
              <p className="topbar-crumb">
                Phillip analytics · every lead, end to end
                {error ? " · showing sample data, live server unreachable" : ""}
              </p>
            </m.div>
            <m.div className="topbar-right" variants={item(reduce)}>
              <label className="search">
                <IconSearch size={16} />
                <input
                  type="text"
                  placeholder="Search leads…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="search leads"
                />
              </label>
              <span className="live-pill">
                <span className="live-dot" />
                live
              </span>
              <button type="button" className="icon-btn" aria-label="notifications">
                <IconBell size={17} />
              </button>
              <img src="/phillip.jpg" alt="" className="topbar-avatar" />
            </m.div>
          </m.header>

          <main className="content" id="overview">
            <KpiCards leads={leads} />
            <div className="grid">
              <div id="funnel">
                <Funnel leads={leads} />
              </div>
              <div id="leads">
                <LeadsTable
                  leads={filtered}
                  selectedId={selected?.lead.id}
                  onSelect={setSelected}
                />
              </div>
            </div>
          </main>
        </div>

        <AnimatePresence>
          {selected ? (
            <LeadDetail key={selected.lead.id} lead={selected} onClose={() => setSelected(null)} />
          ) : null}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
