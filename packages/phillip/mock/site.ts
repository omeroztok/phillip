// A stand-in for the real Claude-backed editor (see apps/server/src/site.ts).
// Mock mode never calls a model, so it can't parse arbitrary requests — instead
// it keyword-matches into a small set of visible theme knobs, with a fallback
// that always changes something, so a revision never lands as a no-op.

export interface MockSiteState {
  version: number;
  accent: string;
  premium: boolean;
  tagline: string;
  businessName: string;
}

const DEFAULT_TAGLINE = "wood-fired seafood and natural wine, two blocks from the water.";
const DEFAULT_NAME = "Marisol's";
const FALLBACK_ACCENTS = ["#b45", "#7c5cff", "#1fb6a6", "#ff6f61", "#c9a227"];

// "change X to Y" / "rename it to Y" / "call it Y instead" — captures Y. Only
// consulted after the more specific theme/copy checks below have failed to
// match, so a color or tagline request never gets misread as a rename.
const RENAME_RE =
  /\b(?:rename|call it|change)\b.*?\bto\s+([a-z0-9'][a-z0-9'\s]{1,40}?)\s*(?:instead)?\.?$/i;

const sites = new Map<string, MockSiteState>();

function getOrInit(previewId: string): MockSiteState {
  let s = sites.get(previewId);
  if (!s) {
    s = {
      version: 1,
      accent: "#b45",
      premium: false,
      tagline: DEFAULT_TAGLINE,
      businessName: DEFAULT_NAME,
    };
    sites.set(previewId, s);
  }
  return s;
}

export function getSite(previewId: string): MockSiteState {
  return { ...getOrInit(previewId) };
}

export function reviseSite(previewId: string, changeRequest: string): MockSiteState {
  const s = getOrInit(previewId);
  const text = changeRequest.toLowerCase();
  const renameMatch = changeRequest.match(RENAME_RE);

  if (/premium|upscale|luxur|elevated|elegant/.test(text)) {
    s.premium = true;
    s.accent = "#18181b";
  } else if (/warm/.test(text)) {
    s.accent = "#ff6f61";
  } else if (/cool|blue|calm/.test(text)) {
    s.accent = "#7c5cff";
  } else if (/dark|bold|bolder/.test(text)) {
    s.premium = true;
    s.accent = "#18181b";
  } else if (/light|bright|airy/.test(text)) {
    s.premium = false;
    s.accent = "#c9a227";
  } else if (/tagline|headline|copy|wording/.test(text)) {
    s.tagline = `${DEFAULT_TAGLINE.replace(/\.$/, "")} — updated per your note.`;
  } else if (renameMatch?.[1]) {
    s.businessName = renameMatch[1].trim();
  } else {
    // Nothing recognized — still make a visible change so the edit isn't a no-op.
    const idx = FALLBACK_ACCENTS.indexOf(s.accent);
    s.accent = FALLBACK_ACCENTS[(idx + 1) % FALLBACK_ACCENTS.length] ?? s.accent;
  }

  s.version += 1;
  return { ...s };
}

export function resetSites(): void {
  sites.clear();
}
