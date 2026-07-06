import { type Root, createRoot } from "react-dom/client";
import { PhillipWidget } from "./PhillipWidget";
import { type RuntimeConfig, debugFromLocation, defaultApiBase } from "./core/config";
import { setDebug } from "./lib/log";
import { styles } from "./styles";
import { TransportClient } from "./transport/client";
import type { FetchLike } from "./transport/rest";

export interface MountOptions {
  previewId: string;
  /** Backend origin. Defaults to same-origin; the client appends `/v1`. */
  apiBase?: string;
  debug?: boolean;
  /** Injectable fetch — used by tests; production uses the global. */
  fetch?: FetchLike;
  /** Where to attach the host element. Defaults to document.body. */
  target?: HTMLElement;
  /** Fires once a revision lands, so the host page can refresh its preview. */
  onSiteUpdated?: (info: { previewId: string; version?: number }) => void;
}

function applyStyles(shadow: ShadowRoot): void {
  // Preferred: a constructable stylesheet adopted by the shadow root (zero DOM,
  // no flash). Falls back to an injected <style> for older Safari / happy-dom.
  try {
    const Ctor = globalThis.CSSStyleSheet;
    if (Ctor && "adoptedStyleSheets" in shadow) {
      const sheet = new Ctor();
      sheet.replaceSync(styles);
      shadow.adoptedStyleSheets = [sheet];
      return;
    }
  } catch {
    // fall through to <style>
  }
  const el = document.createElement("style");
  el.textContent = styles;
  shadow.appendChild(el);
}

/**
 * Inject Phillip into the page. Creates a shadow-rooted host (so host-site CSS
 * can't leak in or out) and renders the React root *inside* the shadow — never
 * portaling from light DOM, which would retarget React's synthetic events.
 * Returns a disposer that fully removes the widget.
 */
export function mount(opts: MountOptions): () => void {
  const debug = Boolean(opts.debug) || debugFromLocation();
  if (debug) setDebug(true);

  const host = document.createElement("div");
  host.setAttribute("data-phillip-host", "");
  (opts.target ?? document.body).appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  applyStyles(shadow);

  const inner = document.createElement("div");
  inner.className = "phillip-root";
  shadow.appendChild(inner);

  const runtime: RuntimeConfig = {
    previewId: opts.previewId,
    apiBase: opts.apiBase ?? defaultApiBase(),
    debug,
  };
  const client = new TransportClient({ apiBase: runtime.apiBase, fetch: opts.fetch });

  let root: Root | null = createRoot(inner);
  root.render(
    <PhillipWidget runtime={runtime} client={client} onSiteUpdated={opts.onSiteUpdated} />,
  );

  return () => {
    const r = root;
    root = null;
    // Defer: when <Phillip/> unmounts, this runs inside the host tree's commit.
    // Unmounting the inner root synchronously there races React; a microtask
    // lets the current commit finish first.
    queueMicrotask(() => {
      r?.unmount();
      host.remove();
    });
  };
}
