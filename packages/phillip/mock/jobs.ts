import { prefixedId } from "../src/lib/id";
import type { IterationJob } from "../src/transport/types";
import { reviseSite } from "./site";

// Stateful iteration jobs: a job reports "processing" for a couple of polls,
// then "done" with a fresh result url — enough to drive the on-screen
// "give me a sec" → "done, refresh" loop.

interface JobState {
  job: IterationJob;
  polls: number;
  readyAfter: number;
}

const jobs = new Map<string, JobState>();

export function createJob(previewId: string, freeText?: string): IterationJob {
  const id = prefixedId("itr");
  // Apply the (fake) edit right away — deterministic, so there's no reason to
  // wait — the queued/processing polling below is purely cosmetic pacing.
  const site = freeText ? reviseSite(previewId, freeText) : undefined;
  const job: IterationJob = { id, status: "queued", version: site?.version };
  jobs.set(id, { job, polls: 0, readyAfter: 2 });
  return { ...job };
}

export function advanceJob(id: string): IterationJob | null {
  const state = jobs.get(id);
  if (!state) return null;
  state.polls += 1;
  if (state.polls >= state.readyAfter) {
    state.job.status = "done";
    state.job.resultUrl = `https://nutz.site/marisol?v=${state.job.version ?? state.polls + 1}`;
  } else {
    state.job.status = "processing";
  }
  return { ...state.job };
}

export function resetJobs(): void {
  jobs.clear();
}
