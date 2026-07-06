// A stand-in for an auto-generated business site. It exists so the engagement
// score has something real to accumulate on: tall scrollable sections marked
// with data-section, a CTA, a gallery, and contact links — the exact hooks the
// analytics layer watches. Rendered as real DOM (not an iframe, unlike
// LiveSite) so those hooks stay reachable from the host page.
//
// Revisions in mock mode still apply here: the mock backend keyword-matches
// the change request into a few visible theme knobs (see mock/site.ts) and
// this component polls and reflects them, so "no, i want changes" produces an
// actual, visible edit instead of just a chat message.

import { useEffect, useState } from "react";

const TILES = ["#ff8a5b", "#ff4d8d", "#7c5cff", "#1fb6a6", "#f6c945", "#ff6f61"];

interface MockSiteState {
  version: number;
  accent: string;
  premium: boolean;
  tagline: string;
  businessName: string;
}

const DEFAULT_SITE: MockSiteState = {
  version: 1,
  accent: "#b45",
  premium: false,
  tagline: "wood-fired seafood and natural wine, two blocks from the water.",
  businessName: "Marisol's",
};

export function FakeGeneratedSite({
  apiBase,
  previewId,
  refreshKey,
}: {
  apiBase: string;
  previewId: string;
  refreshKey: number;
}) {
  const [site, setSite] = useState<MockSiteState>(DEFAULT_SITE);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey only retriggers this fetch, it isn't read.
  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase}/v1/preview/${encodeURIComponent(previewId)}/site`)
      .then((res) => (res.ok ? (res.json() as Promise<MockSiteState>) : Promise.reject(res.status)))
      .then((data) => {
        if (!cancelled) setSite(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBase, previewId, refreshKey]);

  return (
    <div
      className="site"
      style={
        {
          "--accent": site.accent,
          fontFamily: site.premium
            ? "Georgia, 'Times New Roman', serif"
            : "'Inter', system-ui, -apple-system, sans-serif",
        } as React.CSSProperties
      }
    >
      <style>{CSS}</style>

      <header className="nav">
        <div className="brand">{site.businessName}</div>
        <nav>
          <a href="#menu">menu</a>
          <a href="#gallery">gallery</a>
          <a href="#contact">contact</a>
        </nav>
      </header>

      <section className="hero" data-section="hero">
        <div className="hero-inner">
          <p className="eyebrow">est. 2009 · coastal kitchen</p>
          <h1>{site.businessName}</h1>
          <p className="tagline">{site.tagline}</p>
          <button type="button" className="cta" data-cta="hero">
            book a table
          </button>
        </div>
      </section>

      <section className="story" data-section="story">
        <h2>a neighborhood place</h2>
        <p>
          we cook what the boats bring in. the menu changes with the tide, the room is loud in the
          good way, and the negronis are cold. marisol opened the doors in 2009 and hasn't looked
          back.
        </p>
        <p>come hungry, stay late. walk-ins always welcome at the bar.</p>
      </section>

      <section className="menu" id="menu" data-section="pricing">
        <h2>what people order</h2>
        <div className="cards">
          {[
            { name: "the spread", price: "$58", desc: "oysters, ceviche, grilled octopus, bread" },
            { name: "whole fish", price: "$42", desc: "catch of the day, charred lemon, herbs" },
            {
              name: "pasta del mar",
              price: "$28",
              desc: "house tagliatelle, clams, chili, garlic",
            },
          ].map((item) => (
            <div className="card" key={item.name}>
              <div className="card-top">
                <span className="card-name">{item.name}</span>
                <span className="card-price">{item.price}</span>
              </div>
              <p className="card-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="gallery" id="gallery" data-section="gallery">
        <h2>the room</h2>
        <div className="grid">
          {TILES.map((c, i) => (
            <button
              type="button"
              className="tile"
              data-gallery={`tile-${i}`}
              key={c}
              style={{ background: `linear-gradient(135deg, ${c}, #1a1a1a)` }}
              aria-label={`photo ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="contact" id="contact" data-section="contact">
        <h2>find us</h2>
        <p className="hours">tue–sun · 5pm–late · closed mondays</p>
        <p className="lines">
          <a href="tel:+15555550142" data-contact="phone">
            (555) 555-0142
          </a>
          <span> · </span>
          <a href="mailto:hello@marisols.example" data-contact="email">
            hello@marisols.example
          </a>
        </p>
        <p className="addr">214 harbor st, the cove</p>
      </section>

      <footer className="foot">made by nutz · this is a preview</footer>
    </div>
  );
}

const CSS = `
.site { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #18181b; background: #fafaf9; }
.site * { box-sizing: border-box; }
.site h1, .site h2 { margin: 0 0 .4em; letter-spacing: -0.02em; }
.site a { color: inherit; }
.nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between;
  align-items: center; padding: 18px 28px; background: rgba(250,250,249,.85);
  backdrop-filter: blur(8px); border-bottom: 1px solid #eee; }
.nav .brand { font-weight: 800; font-size: 18px; }
.nav nav a { margin-left: 20px; text-decoration: none; font-size: 14px; color: #555; }
.hero { min-height: 88vh; display: grid; place-items: center; text-align: center;
  background: radial-gradient(120% 120% at 50% 0%, #fff 0%, #ffe9e0 55%, #ffd9e6 100%); padding: 40px; }
.hero-inner { max-width: 640px; }
.eyebrow { text-transform: uppercase; letter-spacing: .18em; font-size: 12px; color: var(--accent, #b45); margin: 0 0 14px; }
.hero h1 { font-size: clamp(48px, 10vw, 104px); }
.tagline { font-size: 20px; color: #444; margin: 0 0 28px; }
.cta { background: #18181b; color: #fff; border: 0; border-radius: 999px;
  padding: 14px 28px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform .1s; }
.cta:hover { transform: translateY(-1px); }
.story { max-width: 720px; margin: 0 auto; padding: 96px 28px; font-size: 19px; line-height: 1.7; color: #333; }
.menu { max-width: 980px; margin: 0 auto; padding: 64px 28px 96px; }
.menu h2, .gallery h2, .contact h2 { font-size: 32px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; margin-top: 24px; }
.card { background: #fff; border: 1px solid #eee; border-radius: 16px; padding: 22px; }
.card-top { display: flex; justify-content: space-between; align-items: baseline; }
.card-name { font-weight: 700; font-size: 18px; }
.card-price { font-weight: 700; color: var(--accent, #b45); }
.card-desc { color: #666; margin: 10px 0 0; font-size: 15px; }
.gallery { max-width: 1080px; margin: 0 auto; padding: 64px 28px 96px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 24px; }
.tile { aspect-ratio: 4/3; border: 0; border-radius: 14px; cursor: pointer; }
.contact { max-width: 720px; margin: 0 auto; padding: 64px 28px 120px; text-align: center; }
.hours { font-size: 18px; color: #444; }
.lines { font-size: 18px; margin: 10px 0; }
.lines a { color: var(--accent, #b45); text-decoration: none; }
.addr { color: #888; }
.foot { text-align: center; padding: 40px; color: #aaa; font-size: 13px; border-top: 1px solid #eee; }
@media (max-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
`;
