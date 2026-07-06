import type Anthropic from "@anthropic-ai/sdk";
import type { IterationStatus } from "@nutz/phillip";
import { prefixedId } from "./id";
import { reviseSite } from "./site";

// Real iteration jobs: kick off a Claude edit in the background and let the
// client keep polling the same /v1/iterations contract it always has. The
// job's status genuinely reflects whether the model call has finished.

export interface IterationJob {
  id: string;
  status: IterationStatus;
  resultUrl?: string;
  version?: number;
}

const jobs = new Map<string, IterationJob>();

export function createJob(
  anthropic: Anthropic,
  model: string,
  previewId: string,
  changeRequest: string,
): IterationJob {
  const id = prefixedId("itr");
  const job: IterationJob = { id, status: "queued" };
  jobs.set(id, job);

  void reviseSite({ anthropic, model, previewId, changeRequest })
    .then((site) => {
      const current = jobs.get(id);
      if (!current) return;
      current.status = "done";
      current.version = site.version;
      current.resultUrl = `https://nutz.site/marisol?v=${site.version}`;
    })
    .catch((err) => {
      console.error("revision failed:", err);
      const current = jobs.get(id);
      if (current) current.status = "failed";
    });

  return { ...job };
}

export function advanceJob(id: string): IterationJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  // Flips to "processing" on the first poll after creation; a "done"/"failed"
  // set by the background revision above always takes priority.
  if (job.status === "queued") job.status = "processing";
  return { ...job };
}
