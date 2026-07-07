import { useEffect, useState } from "react";
import { type DashboardLead, leads as sampleLeads } from "./sample";

export const API_BASE = import.meta.env.VITE_DASHBOARD_API_BASE ?? "http://localhost:8787";

export interface UseDashboardLeadsResult {
  leads: DashboardLead[];
  loading: boolean;
  /** Set when the API call failed — leads still falls back to the sample fixtures. */
  error: string | null;
}

// Real leads (from actual Phillip usage against the live backend) are shown
// alongside the polished sample fixtures, not instead of them — the demo
// stays populated even with zero real traffic, and real activity is easy to
// spot at the top of the list. Falls back to sample-only if the API call
// fails outright (server not running, fresh/unreachable DB, etc).
export function useDashboardLeads(): UseDashboardLeadsResult {
  const [leads, setLeads] = useState<DashboardLead[]>(sampleLeads);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/v1/dashboard/leads`)
      .then((res) => {
        if (!res.ok) throw new Error(`dashboard fetch failed: ${res.status}`);
        return res.json() as Promise<DashboardLead[]>;
      })
      .then((real) => {
        if (cancelled) return;
        setLeads([...real, ...sampleLeads]);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("falling back to sample leads:", err);
        setError(err instanceof Error ? err.message : "failed to load leads");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { leads, loading, error };
}
