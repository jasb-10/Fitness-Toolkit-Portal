import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adaptLegacyProject, headlineFitFor, type AssetMode, type ContentMode, type SitePlanV1 } from "../../../../../lib/site-plan/src/index.js";
import { analyseDirections } from "../../../../api-server/src/lib/site-generator/index.js";
import { buildCompositionHtml, CompositionSite, compositionRenderers } from "./CompositionSites.js";

const makeImage = (base: string, signal: string, index: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="${base}"/><path d="M${100 + index * 70} 780L530 90L950 780Z" fill="none" stroke="${signal}" stroke-width="18"/><circle cx="${820 - index * 90}" cy="${260 + index * 45}" r="150" fill="${signal}" opacity=".38"/></svg>`)}`;
const baseBrief = { businessName: "", businessType: "", mainService: "", audience: "", location: "", deliveryMode: "In person", goal: "Book", bookingLink: "https://example.com/book", offer: "", credentials: "", results: "", testimonialQuote: "", testimonialName: "", process: "", faqQuestion: "", faqAnswer: "", schedule: "", sections: [] as string[], serviceDetails: "", objections: "", differentiator: "", contentLength: "standard", imagePreference: "Auto" };
type Proof = { slug: string; brief: typeof baseBrief; copy: { headline: string; subheadline: string; about: string; button: string }; sections: Array<{ id: string; eyebrow?: string; title: string; body: string; highlights?: string[] }>; contentMode: ContentMode; assetMode: AssetMode; heroVariant: string; images: string[]; palette: { accent: string; dark: string; light: string }; font: string };

const proofs: Proof[] = [
  {
    slug: "forge-boxing", contentMode: "compact", assetMode: "single", heroVariant: "dossier", images: [makeImage("#191919", "#e44b31", 0)], palette: { accent: "#e44b31", dark: "#090909", light: "#f2efe8" }, font: "Strong & modern",
    brief: { ...baseBrief, businessName: "Forge Boxing", businessType: "Boxing coach", mainService: "One-to-one boxing coaching", audience: "Adults learning disciplined boxing technique", location: "Manchester, UK", offer: "Private boxing sessions", credentials: "England Boxing qualified coach", process: "Assess movement and experience; Build technical foundations; Progress with coached rounds", sections: ["services", "approach", "about", "results", "contact"], contentLength: "compact", imagePreference: "Image led" },
    copy: { headline: "Build skill under pressure.", subheadline: "Private boxing coaching built around clean technique, composure and useful progression.", about: "Forge Boxing is a focused one-to-one coaching practice in Manchester.", button: "Book an assessment" },
    sections: [
      { id: "services", eyebrow: "Training record", title: "Technical work with a purpose.", body: "Private sessions connect movement, defence and controlled rounds.", highlights: ["Movement", "Technique", "Coached rounds"] },
      { id: "approach", eyebrow: "The method", title: "Assess. Build. Apply.", body: "Training begins from the experience the client brings.", highlights: ["Assess movement and experience", "Build technical foundations", "Progress with coached rounds"] },
      { id: "about", eyebrow: "Coach notes", title: "Focused, direct coaching.", body: "A one-to-one practice in Manchester.", highlights: [] },
      { id: "results", eyebrow: "Verified detail", title: "The coaching record.", body: "England Boxing qualified coach", highlights: [] },
      { id: "contact", eyebrow: "Next session", title: "Start with an assessment.", body: "Book an assessment to discuss experience and goals.", highlights: [] },
    ],
  },
  {
    slug: "stillpoint-martial", contentMode: "standard", assetMode: "single", heroVariant: "full-bleed", images: [makeImage("#22262a", "#d6c94a", 1)], palette: { accent: "#d6c94a", dark: "#0c0e10", light: "#f4f1e9" }, font: "Premium editorial",
    brief: { ...baseBrief, businessName: "Stillpoint Martial Arts", businessType: "Martial arts coach", mainService: "Small-group martial arts coaching", audience: "Committed adults seeking technical practice", location: "Melbourne, Australia", offer: "Small-group fundamentals and advanced practice", credentials: "20 years of coaching experience", results: "Sessions are capped at eight participants", testimonialQuote: "Every detail has a reason.", testimonialName: "Alex, member", process: "Introductory conversation; Fundamentals session; Join the appropriate practice group", faqQuestion: "Can beginners attend?", faqAnswer: "Yes. The introductory conversation is used to choose the appropriate group.", sections: ["services", "approach", "about", "results", "testimonial", "faq", "contact"], contentLength: "standard", imagePreference: "Image led" },
    copy: { headline: "Practice with intent.", subheadline: "Small-group martial arts coaching where attention, technique and consistent practice come first.", about: "Stillpoint is a small coaching environment for adults who value deliberate practice.", button: "Arrange an introduction" },
    sections: [
      { id: "services", eyebrow: "Practice groups", title: "A clear place to begin.", body: "Fundamentals and advanced groups are kept deliberately small.", highlights: ["Fundamentals", "Advanced practice", "Maximum eight"] },
      { id: "approach", eyebrow: "Sequence", title: "Find the right practice group.", body: "A short introduction establishes the most useful starting point.", highlights: ["Conversation", "Fundamentals session", "Join the group"] },
      { id: "about", eyebrow: "The school", title: "Deliberate by design.", body: "A small coaching environment for committed adults.", highlights: [] },
      { id: "results", eyebrow: "Practice record", title: "Experience and attention.", body: "20 years of coaching experience. Sessions capped at eight.", highlights: [] },
      { id: "testimonial", eyebrow: "Member record", title: "Every detail has a reason.", body: "Every detail has a reason.", highlights: [] },
      { id: "faq", eyebrow: "Direct answer", title: "A place for beginners.", body: "The introductory conversation is used to choose the appropriate group.", highlights: [] },
      { id: "contact", eyebrow: "First move", title: "Arrange an introduction.", body: "Share your experience and what you want from practice.", highlights: [] },
    ],
  },
  {
    slug: "north-dock-performance", contentMode: "expanded", assetMode: "multiple", heroVariant: "sequence", images: [makeImage("#191d20", "#ff5a36", 2), makeImage("#303236", "#ff5a36", 3), makeImage("#151719", "#ff5a36", 4)], palette: { accent: "#ff5a36", dark: "#08090a", light: "#efede7" }, font: "Clean professional",
    brief: { ...baseBrief, businessName: "North Dock Performance", businessType: "Strength and conditioning gym", mainService: "Coached strength and conditioning", audience: "Amateur athletes preparing for demanding seasons", location: "Toronto, Canada", offer: "Assessment-led small-group coaching", credentials: "Certified strength and conditioning specialists", results: "Quarterly testing is included in membership", testimonialQuote: "I know why every block is there and what we are building toward.", testimonialName: "Maya, field athlete", process: "Complete the performance assessment; Join an appropriate training group; Review at quarterly testing", schedule: "Monday 18:00: Field athlete group; Wednesday 18:00: Strength group; Saturday 09:00: Combined session", faqQuestion: "Is this suitable outside the competitive season?", faqAnswer: "Yes. The assessment and training group are adjusted to the athlete's current phase.", sections: ["services", "schedule", "approach", "about", "results", "testimonial", "faq", "contact"], contentLength: "expanded", imagePreference: "Image rich" },
    copy: { headline: "Prepare for the work your sport demands.", subheadline: "Assessment-led strength and conditioning for amateur athletes who want a clearer route into the season.", about: "North Dock is a coached performance environment for field, court and combat athletes.", button: "Book a performance assessment" },
    sections: [
      { id: "services", eyebrow: "Performance work", title: "Train the qualities the season requires.", body: "Assessment-led groups connect strength, speed and repeatable conditioning.", highlights: ["Performance assessment", "Coached small groups", "Quarterly review"] },
      { id: "schedule", eyebrow: "Training record", title: "The coached week.", body: "Three supplied group times.", highlights: [] },
      { id: "approach", eyebrow: "Sequence", title: "Assess. Place. Review.", body: "Every athlete starts with an assessment before joining a training group.", highlights: ["Complete the assessment", "Join the training group", "Review quarterly"] },
      { id: "about", eyebrow: "The environment", title: "Coaching before noise.", body: "A coached environment for amateur field, court and combat athletes.", highlights: [] },
      { id: "results", eyebrow: "Verified record", title: "Qualified coaching. Visible review.", body: "Certified specialists. Quarterly testing included.", highlights: [] },
      { id: "testimonial", eyebrow: "Athlete record", title: "A clear reason for the block.", body: "I know why every block is there and what we are building toward.", highlights: [] },
      { id: "faq", eyebrow: "Direct answer", title: "Training between seasons.", body: "The assessment and group are adjusted to the athlete's current phase.", highlights: [] },
      { id: "contact", eyebrow: "Start point", title: "Bring the full performance picture.", body: "Book an assessment to discuss the season, training history and current needs.", highlights: [] },
    ],
  },
];

for (const proof of proofs) {
  const base = adaptLegacyProject({ briefData: proof.brief, styleData: { compositionId: "documentary-performance", copy: proof.copy }, sections: proof.sections });
  const plan: SitePlanV1 = { ...base, familyId: "documentary-performance", contentMode: proof.contentMode, assetMode: proof.assetMode, visual: { paletteId: proof.slug, accent: proof.palette.accent, fontStyle: proof.font, surface: "Documentary contrast" }, hero: { variant: proof.heroVariant, headline: proof.copy.headline, subheadline: proof.copy.subheadline, headlineFit: headlineFitFor(proof.copy.headline), imageUrl: proof.images[0] }, assets: { images: proof.images.map((url, index) => ({ url, role: index === 0 ? "hero" : index === 1 ? "story" : "gallery", alt: `${proof.brief.businessName} training ${index + 1}` })) }, narrative: { ...base.narrative, orderedModuleIds: proof.brief.sections } };
  const shared = { compositionId: "documentary-performance", brief: proof.brief, copy: proof.copy, sections: proof.sections, heroImage: proof.images[0], useImage: true, accent: proof.palette.accent, paletteDark: proof.palette.dark, paletteLight: proof.palette.light, fontStyle: proof.font, sitePlan: plan };
  const preview = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: false, previewMode: "desktop" }));
  const mobile = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: true, previewMode: "mobile" }));
  const exported = buildCompositionHtml({ ...shared, bookingUrl: proof.brief.bookingLink, locale: proof.brief.location.includes("Australia") ? "en-AU" : proof.brief.location.includes("Canada") ? "en-CA" : "en-GB" });
  if (process.env.WRITE_PROOFS === "1") { mkdirSync("scratch/documentary-proof-pages", { recursive: true }); writeFileSync(`scratch/documentary-proof-pages/${proof.slug}.html`, exported, "utf8"); }
  assert.match(preview, new RegExp(`data-hero="${proof.heroVariant}"`));
  assert.match(exported, new RegExp(`data-hero="${proof.heroVariant}"`));
  assert.match(exported, new RegExp(proof.palette.accent));
  assert.match(exported, /data:image\/svg\+xml/);
  assert.match(exported, /^<!doctype html>/);
  assert.match(exported, /@media\(max-width:760px\)/);
  assert.match(mobile, /grid-cols-1/);
  assert.doesNotMatch(exported, /<script[^>]+src=|<link[^>]+stylesheet/);
  const previewModules = [...preview.matchAll(/data-module="([^"]+)"/g)].map((match) => match[1]);
  const exportModules = [...exported.matchAll(/data-module="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(exportModules, previewModules, `${proof.slug}: preview and export module order differs`);
  assert.equal(exportModules.at(-1), "contact");
}

assert.equal(typeof compositionRenderers["documentary-performance"], "function");
const required = { businessName: "Example", mainService: "Coaching", audience: "Adults", goal: "Book", bookingLink: "https://example.com/book" };
const eligible = (brief: Record<string, unknown>, usableImageCount = 1) => analyseDirections({ brief: { ...required, ...brief }, assetCount: usableImageCount, usableImageCount }).directions.map((direction) => direction.id);
assert.ok(eligible({ businessType: "Boxing coach", mainService: "Private boxing coaching" }).includes("documentary-performance"));
assert.ok(eligible({ businessType: "Martial arts school", mainService: "Martial arts coaching" }).includes("documentary-performance"));
assert.ok(eligible({ businessType: "Strength and conditioning gym", mainService: "Athletic performance coaching" }, 4).includes("documentary-performance"));
assert.ok(!eligible({ businessType: "Boxing coach", mainService: "Private boxing coaching" }, 0).includes("documentary-performance"));
assert.ok(!eligible({ businessType: "Pilates studio", mainService: "Reformer Pilates classes" }).includes("documentary-performance"));
assert.ok(!eligible({ businessType: "Clinical physiotherapy practice", mainService: "Injury assessment" }).includes("documentary-performance"));
assert.ok(!eligible({ businessType: "Online running coach", mainService: "Remote run coaching" }).includes("documentary-performance"));

console.log("Three Documentary Performance proof businesses, parity checks and family constraints passed");
