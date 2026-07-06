import { randomUUID } from "node:crypto";

/** A short, prefixed id, e.g. prefixedId("evt") -> "evt_1a2b3c4d5e6f7a8b". */
export function prefixedId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
