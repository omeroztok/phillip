import { useRef, useState } from "react";
import type { Tracker } from "../analytics";
import { prefixedId } from "../lib/id";
import { log } from "../lib/log";
import type { TransportClient } from "../transport";
import type { IterationJob } from "../transport/types";
import type { ChangeSet } from "../types/records";
import { pollJob } from "./pollJob";

export type IterationPhase = "idle" | "submitting" | "working" | "done" | "failed";

export interface UseIterationOptions {
  client: TransportClient;
  previewId: string;
  sessionId: string;
  tracker: Tracker;
  pollIntervalMs?: number;
  onReady?: (job: IterationJob) => void;
  onFailed?: () => void;
}

export interface IterationApi {
  phase: IterationPhase;
  round: number;
  resultUrl?: string;
  busy: boolean;
  submit: (changeSet: ChangeSet) => void;
  reset: () => void;
}

// Phase 04 off-screen machinery: capture -> submit job -> poll status ->
// swap/refresh. Round count feeds the escalation rule.
export function useIteration(opts: UseIterationOptions): IterationApi {
  const [phase, setPhase] = useState<IterationPhase>("idle");
  const [round, setRound] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | undefined>(undefined);
  const inFlight = useRef(false);

  const submit = (changeSet: ChangeSet): void => {
    if (inFlight.current) return;
    inFlight.current = true;
    const nextRound = round + 1;
    setRound(nextRound);
    setPhase("submitting");
    opts.tracker.track("iteration_requested", {
      iterationId: prefixedId("pending"),
      round: nextRound,
    });

    opts.client
      .createIteration({
        previewId: opts.previewId,
        sessionId: opts.sessionId,
        changeSet,
        round: nextRound,
      })
      .then((job) => {
        setPhase("working");
        return pollJob(opts.client, job.id, { intervalMs: opts.pollIntervalMs });
      })
      .then((job) => {
        if (job.status === "done") {
          setResultUrl(job.resultUrl);
          setPhase("done");
          opts.tracker.track("iteration_ready", { iterationId: job.id, version: job.version });
          opts.onReady?.(job);
        } else {
          setPhase("failed");
          opts.onFailed?.();
        }
      })
      .catch((err) => {
        log.warn("iteration failed", err);
        setPhase("failed");
        opts.onFailed?.();
      })
      .finally(() => {
        inFlight.current = false;
      });
  };

  const reset = (): void => {
    if (inFlight.current) return;
    setPhase("idle");
  };

  return {
    phase,
    round,
    resultUrl,
    busy: phase === "submitting" || phase === "working",
    submit,
    reset,
  };
}
