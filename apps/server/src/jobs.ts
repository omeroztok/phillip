import type { IterationStatus } from "@nutz/phillip";
import { prefixedId } from "./id";

// Stub iteration jobs — the real Build agent lives elsewhere. This just
// satisfies the /v1/iterations contract so the on-screen "give me a sec" ->
// "done, refresh" loop has something to poll while testing the conversation.

export interface IterationJob {
  id: string;
  status: IterationStatus;
  resultUrl?: string;
  version?: number;
}

interface JobState {
  job: IterationJob;
  polls: number;
  readyAfter: number;
}

const jobs = new Map<string, JobState>();

export function createJob(_previewId: string): IterationJob {
  const id = prefixedId("itr");
  const job: IterationJob = { id, status: "queued" };
  jobs.set(id, { job, polls: 0, readyAfter: 2 });
  return { ...job };
}

export function advanceJob(id: string): IterationJob | null {
  const state = jobs.get(id);
  if (!state) return null;
  state.polls += 1;
  if (state.polls >= state.readyAfter) {
    state.job.status = "done";
    state.job.resultUrl = `https://nutz.site/marisol?v=${state.polls + 1}`;
    state.job.version = state.polls + 1;
  } else {
    state.job.status = "processing";
  }
  return { ...state.job };
}
