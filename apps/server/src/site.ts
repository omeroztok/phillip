import type Anthropic from "@anthropic-ai/sdk";

// The website preview's current state, as plain HTML. This is the "current
// website/page state" the ticket asks to hand to Claude alongside the lead's
// requested change — a real, editable document, not a hardcoded React
// component. Same demo business as packages/phillip/mock/fixtures.ts.

interface SiteEntry {
  html: string;
  version: number;
}

const sites = new Map<string, SiteEntry>();

const INITIAL_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Marisol's</title>
<style>
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #18181b; background: #fafaf9; margin: 0; }
  * { box-sizing: border-box; }
  h1, h2 { margin: 0 0 .4em; letter-spacing: -0.02em; }
  a { color: inherit; }
  .nav { position: sticky; top: 0; display: flex; justify-content: space-between; align-items: center;
    padding: 18px 28px; background: rgba(250,250,249,.85); border-bottom: 1px solid #eee; }
  .nav .brand { font-weight: 800; font-size: 18px; }
  .nav nav a { margin-left: 20px; text-decoration: none; font-size: 14px; color: #555; }
  .hero { min-height: 70vh; display: grid; place-items: center; text-align: center;
    background: radial-gradient(120% 120% at 50% 0%, #fff 0%, #ffe9e0 55%, #ffd9e6 100%); padding: 40px; }
  .hero-inner { max-width: 640px; }
  .eyebrow { text-transform: uppercase; letter-spacing: .18em; font-size: 12px; color: #b45; margin: 0 0 14px; }
  .hero h1 { font-size: clamp(40px, 9vw, 84px); }
  .tagline { font-size: 20px; color: #444; margin: 0 0 28px; }
  .cta { background: #18181b; color: #fff; border: 0; border-radius: 999px; padding: 14px 28px;
    font-size: 16px; font-weight: 600; cursor: pointer; }
  .story { max-width: 720px; margin: 0 auto; padding: 64px 28px; font-size: 19px; line-height: 1.7; color: #333; }
  .menu { max-width: 980px; margin: 0 auto; padding: 40px 28px 64px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; margin-top: 24px; }
  .card { background: #fff; border: 1px solid #eee; border-radius: 16px; padding: 22px; }
  .card-top { display: flex; justify-content: space-between; align-items: baseline; }
  .card-name { font-weight: 700; font-size: 18px; }
  .card-price { font-weight: 700; color: #b45; }
  .card-desc { color: #666; margin: 10px 0 0; font-size: 15px; }
  .contact { max-width: 720px; margin: 0 auto; padding: 40px 28px 80px; text-align: center; }
  .hours { font-size: 18px; color: #444; }
  .lines { font-size: 18px; margin: 10px 0; }
  .lines a { color: #b45; text-decoration: none; }
  .addr { color: #888; }
  .foot { text-align: center; padding: 40px; color: #aaa; font-size: 13px; border-top: 1px solid #eee; }
</style>
</head>
<body>
  <header class="nav">
    <div class="brand">Marisol's</div>
    <nav><a href="#menu">menu</a><a href="#contact">contact</a></nav>
  </header>

  <section class="hero">
    <div class="hero-inner">
      <p class="eyebrow">est. 2009 &middot; coastal kitchen</p>
      <h1>Marisol's</h1>
      <p class="tagline">wood-fired seafood and natural wine, two blocks from the water.</p>
      <button class="cta" type="button">book a table</button>
    </div>
  </section>

  <section class="story">
    <h2>a neighborhood place</h2>
    <p>we cook what the boats bring in. the menu changes with the tide, the room is loud in the good way, and the negronis are cold. marisol opened the doors in 2009 and hasn't looked back.</p>
    <p>come hungry, stay late. walk-ins always welcome at the bar.</p>
  </section>

  <section class="menu" id="menu">
    <h2>what people order</h2>
    <div class="cards">
      <div class="card">
        <div class="card-top"><span class="card-name">the spread</span><span class="card-price">$58</span></div>
        <p class="card-desc">oysters, ceviche, grilled octopus, bread</p>
      </div>
      <div class="card">
        <div class="card-top"><span class="card-name">whole fish</span><span class="card-price">$42</span></div>
        <p class="card-desc">catch of the day, charred lemon, herbs</p>
      </div>
      <div class="card">
        <div class="card-top"><span class="card-name">pasta del mar</span><span class="card-price">$28</span></div>
        <p class="card-desc">house tagliatelle, clams, chili, garlic</p>
      </div>
    </div>
  </section>

  <section class="contact" id="contact">
    <h2>find us</h2>
    <p class="hours">tue&ndash;sun &middot; 5pm&ndash;late &middot; closed mondays</p>
    <p class="lines"><a href="tel:+15555550142">(555) 555-0142</a> &middot; <a href="mailto:hello@marisols.example">hello@marisols.example</a></p>
    <p class="addr">214 harbor st, the cove</p>
  </section>

  <footer class="foot">made by nutz &middot; this is a preview</footer>
</body>
</html>`;

function getOrSeed(previewId: string): SiteEntry {
  let entry = sites.get(previewId);
  if (!entry) {
    entry = { html: INITIAL_HTML, version: 1 };
    sites.set(previewId, entry);
  }
  return entry;
}

export function getSite(previewId: string): SiteEntry {
  return { ...getOrSeed(previewId) };
}

// Strip a defensive markdown fence in case the model wraps its answer despite
// being told not to. cheap insurance, not a real parser.
function stripFence(text: string): string {
  const fenced = text.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? text).trim();
}

export interface ReviseSiteOptions {
  anthropic: Anthropic;
  model: string;
  previewId: string;
  changeRequest: string;
}

/** Send the current page + the lead's requested change to Claude, store the result. */
export async function reviseSite(opts: ReviseSiteOptions): Promise<SiteEntry> {
  const { anthropic, model, previewId, changeRequest } = opts;
  const current = getOrSeed(previewId);

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    system:
      "you are a careful website editor. you will be given the current full HTML of a small " +
      "business's site and a plain-language request for a change. make the minimal targeted edit " +
      "that satisfies the request: touch only what the request implies, keep everything else " +
      "(structure, sections, styling, copy) exactly as it was unless the request clearly calls for " +
      "more. respond with ONLY the complete updated HTML document, starting with <!doctype html>. " +
      "no explanation, no markdown code fences, no commentary before or after.",
    messages: [
      {
        role: "user",
        content: `current site html:\n${current.html}\n\nrequested change: ${changeRequest}`,
      },
    ],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const html = stripFence(text);
  if (!html) throw new Error("empty revision from model");

  const next: SiteEntry = { html, version: current.version + 1 };
  sites.set(previewId, next);
  return { ...next };
}
