import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adaptLegacyProject, headlineFitFor, type AssetMode, type ContentMode, type SitePlanV1 } from "../../../../../lib/site-plan/src/index.js";
import { analyseDirections } from "../../../../api-server/src/lib/site-generator/index.js";
import { buildCompositionHtml, CompositionSite, compositionRenderers } from "./CompositionSites.js";

const makeImage = (base: string, signal: string, index: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="${base}"/><circle cx="${620 + index * 80}" cy="430" r="270" fill="none" stroke="${signal}" stroke-width="16"/><path d="M190 690C430 330 760 700 1050 220" fill="none" stroke="#fff" stroke-width="20" opacity=".45"/></svg>`)}`;
const baseBrief = { businessName: "", businessType: "", mainService: "", audience: "", location: "", deliveryMode: "In person", goal: "Book", bookingLink: "https://example.com/book", offer: "", credentials: "", results: "", testimonialQuote: "", testimonialName: "", process: "", faqQuestion: "", faqAnswer: "", schedule: "", sections: [] as string[], serviceDetails: "", objections: "", differentiator: "", contentLength: "standard", imagePreference: "Auto" };
type Proof = { slug: string; brief: typeof baseBrief; copy: { headline: string; subheadline: string; about: string; button: string }; sections: Array<{ id: string; eyebrow?: string; title: string; body: string; highlights?: string[] }>; contentMode: ContentMode; assetMode: AssetMode; heroVariant: string; images: string[]; palette: { accent: string; dark: string; light: string }; font: string };

const proofs: Proof[] = [
  {
    slug: "clearline-sports-physio", contentMode: "compact", assetMode: "none", heroVariant: "assessment", images: [], palette: { accent: "#e66a48", dark: "#17312d", light: "#f4f3ee" }, font: "Clean professional",
    brief: { ...baseBrief, businessName: "Clearline Sports Physio", businessType: "Sports physiotherapy practice", mainService: "Sports injury assessment", audience: "Recreational athletes seeking a clear first assessment", location: "Leeds, UK", offer: "Initial sports injury assessment", credentials: "HCPC-registered physiotherapist", process: "Listen to the history; Complete the physical assessment; Explain the recommended next steps", sections: ["services", "approach", "about", "results", "contact"], contentLength: "compact", imagePreference: "Image light" },
    copy: { headline: "Understand what is limiting your movement.", subheadline: "A structured sports injury assessment with a clear explanation of the findings and next steps.", about: "Clearline is an independent sports physiotherapy practice in Leeds.", button: "Book an assessment" },
    sections: [
      { id: "services", eyebrow: "Assessment routes", title: "Start with the right appointment.", body: "Choose an initial sports injury assessment or a follow-up appointment.", highlights: ["Initial assessment", "Follow-up appointment"] },
      { id: "approach", eyebrow: "Your pathway", title: "Listen. Assess. Explain.", body: "The first appointment follows the information supplied by the client and findings from the assessment.", highlights: ["Listen to the history", "Complete the assessment", "Explain next steps"] },
      { id: "about", eyebrow: "The practice", title: "Clear information first.", body: "An independent sports physiotherapy practice in Leeds.", highlights: [] },
      { id: "results", eyebrow: "Professional context", title: "Registration stated clearly.", body: "HCPC-registered physiotherapist", highlights: [] },
      { id: "contact", eyebrow: "Next step", title: "Begin with an assessment.", body: "Book an initial sports injury assessment.", highlights: [] },
    ],
  },
  {
    slug: "harbour-rehab-clinic", contentMode: "standard", assetMode: "single", heroVariant: "practitioner", images: [makeImage("#869d97", "#f2bb67", 1)], palette: { accent: "#f2bb67", dark: "#183b38", light: "#f6f2e9" }, font: "Premium editorial",
    brief: { ...baseBrief, businessName: "Harbour Rehabilitation", businessType: "Rehabilitation clinic", mainService: "One-to-one rehabilitation", audience: "Adults rebuilding confidence after injury", location: "Auckland, New Zealand", offer: "One-to-one assessment and rehabilitation planning", credentials: "Registered physiotherapists", results: "Progress is reviewed at agreed appointments", testimonialQuote: "I understood the plan and what each stage was for.", testimonialName: "Sam, client", process: "Initial conversation and assessment; Agree priorities together; Review progress at agreed appointments", faqQuestion: "Do I need a referral?", faqAnswer: "No referral is required for the appointments described here.", sections: ["services", "approach", "about", "results", "testimonial", "faq", "contact"], contentLength: "standard", imagePreference: "Image led" },
    copy: { headline: "A clearer route back to confident movement.", subheadline: "One-to-one rehabilitation shaped around your assessment, priorities and agreed review points.", about: "Harbour Rehabilitation is a small clinic providing one-to-one assessment and rehabilitation planning.", button: "Arrange a first appointment" },
    sections: [
      { id: "services", eyebrow: "Ways to begin", title: "Support built from an assessment.", body: "Initial assessment and follow-up rehabilitation appointments are delivered one to one.", highlights: ["Initial assessment", "Rehabilitation appointment", "Progress review"] },
      { id: "approach", eyebrow: "Care pathway", title: "Assess. Agree. Review.", body: "The plan begins with an assessment and agreed priorities.", highlights: ["Initial conversation and assessment", "Agree priorities together", "Review progress"] },
      { id: "about", eyebrow: "The clinic", title: "A small practice with time to explain.", body: "A small clinic providing one-to-one rehabilitation planning.", highlights: [] },
      { id: "results", eyebrow: "Professional evidence", title: "The supplied professional context.", body: "Registered physiotherapists. Progress reviewed at agreed appointments.", highlights: [] },
      { id: "testimonial", eyebrow: "Client words", title: "A plan that made sense.", body: "I understood the plan and what each stage was for.", highlights: [] },
      { id: "faq", eyebrow: "Before booking", title: "A straightforward first step.", body: "No referral is required for the appointments described here.", highlights: [] },
      { id: "contact", eyebrow: "First appointment", title: "Bring your questions and your context.", body: "Arrange a first appointment to discuss what is happening now.", highlights: [] },
    ],
  },
  {
    slug: "fieldwork-specialist", contentMode: "expanded", assetMode: "multiple", heroVariant: "pathway", images: [makeImage("#32525a", "#83d0c4", 2), makeImage("#7e9792", "#83d0c4", 3)], palette: { accent: "#83d0c4", dark: "#142e32", light: "#edf3f0" }, font: "Strong & modern",
    brief: { ...baseBrief, businessName: "Fieldwork Specialist Practice", businessType: "Clinical sports therapy specialist", mainService: "Running-related injury assessment", audience: "Runners with persistent training-related symptoms", location: "Vancouver, Canada", offer: "Specialist assessment and follow-up planning", credentials: "Registered physiotherapist; MSc Sports and Exercise Medicine", results: "Written assessment summaries are provided after the initial appointment", schedule: "Tuesday: Initial assessments; Thursday: Follow-up appointments; Saturday: Running assessments", process: "Review the training and symptom history; Complete a clinical and movement assessment; Agree the next training and rehabilitation priorities", faqQuestion: "Will I have to stop running?", faqAnswer: "Recommendations depend on the individual assessment and current training context.", sections: ["services", "schedule", "approach", "about", "results", "faq", "contact"], contentLength: "expanded", imagePreference: "Image led" },
    copy: { headline: "Make sense of the pattern, not just the painful day.", subheadline: "Running-related injury assessment that considers symptoms, training history and the movement information gathered in your appointment.", about: "Fieldwork is a specialist physiotherapy practice focused on running-related presentations.", button: "Request an assessment" },
    sections: [
      { id: "services", eyebrow: "Clinical routes", title: "Choose the assessment that matches the question.", body: "Initial, follow-up and running assessment appointments are available.", highlights: ["Initial clinical assessment", "Follow-up planning", "Running assessment"] },
      { id: "schedule", eyebrow: "Appointment routes", title: "Available appointment routes.", body: "Tuesday, Thursday and Saturday routes supplied by the practice.", highlights: [] },
      { id: "approach", eyebrow: "Assessment pathway", title: "History. Assessment. Priorities.", body: "The route uses the history and information gathered during the appointment.", highlights: ["Review the history", "Complete the assessment", "Agree priorities"] },
      { id: "about", eyebrow: "Specialist practice", title: "A focused clinical question.", body: "A specialist physiotherapy practice focused on running-related presentations.", highlights: [] },
      { id: "results", eyebrow: "Professional context", title: "Qualifications and service facts.", body: "Registered physiotherapist; MSc Sports and Exercise Medicine", highlights: [] },
      { id: "faq", eyebrow: "Before booking", title: "Training decisions follow the assessment.", body: "Recommendations depend on the individual assessment and current training context.", highlights: [] },
      { id: "contact", eyebrow: "Next step", title: "Start with the full training picture.", body: "Request an assessment and share the current symptoms and training context.", highlights: [] },
    ],
  },
];

for (const proof of proofs) {
  const base = adaptLegacyProject({ briefData: proof.brief, styleData: { compositionId: "precision-practice", copy: proof.copy }, sections: proof.sections });
  const plan: SitePlanV1 = { ...base, familyId: "precision-practice", contentMode: proof.contentMode, assetMode: proof.assetMode, visual: { paletteId: proof.slug, accent: proof.palette.accent, fontStyle: proof.font, surface: "Clinical calm" }, hero: { variant: proof.heroVariant, headline: proof.copy.headline, subheadline: proof.copy.subheadline, headlineFit: headlineFitFor(proof.copy.headline), imageUrl: proof.images[0] || "" }, assets: { images: proof.images.map((url, index) => ({ url, role: index === 0 ? "hero" : "story", alt: `${proof.brief.businessName} practice ${index + 1}` })) }, narrative: { ...base.narrative, orderedModuleIds: proof.brief.sections } };
  const shared = { compositionId: "precision-practice", brief: proof.brief, copy: proof.copy, sections: proof.sections, heroImage: proof.images[0] || "", useImage: proof.images.length > 0, accent: proof.palette.accent, paletteDark: proof.palette.dark, paletteLight: proof.palette.light, fontStyle: proof.font, sitePlan: plan };
  const preview = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: false, previewMode: "desktop" }));
  const mobile = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: true, previewMode: "mobile" }));
  const exported = buildCompositionHtml({ ...shared, bookingUrl: proof.brief.bookingLink, locale: proof.brief.location.includes("New Zealand") ? "en-NZ" : proof.brief.location.includes("Canada") ? "en-CA" : "en-GB" });
  if (process.env.WRITE_PROOFS === "1") { mkdirSync("scratch/precision-proof-pages", { recursive: true }); writeFileSync(`scratch/precision-proof-pages/${proof.slug}.html`, exported, "utf8"); }
  assert.match(preview, new RegExp(`data-hero="${proof.heroVariant}"`));
  assert.match(exported, new RegExp(`data-hero="${proof.heroVariant}"`));
  assert.match(exported, new RegExp(proof.palette.accent));
  assert.match(exported, /^<!doctype html>/);
  assert.match(exported, /@media\(max-width:760px\)/);
  assert.match(mobile, /grid-cols-1/);
  assert.doesNotMatch(exported, /<script[^>]+src=|<link[^>]+stylesheet/);
  if (proof.assetMode === "none") assert.doesNotMatch(exported, /<img/); else assert.match(exported, /data:image\/svg\+xml/);
  const previewModules = [...preview.matchAll(/data-module="([^"]+)"/g)].map((match) => match[1]);
  const exportModules = [...exported.matchAll(/data-module="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(exportModules, previewModules, `${proof.slug}: preview and export module order differs`);
  assert.equal(exportModules.at(-1), "contact");
}

assert.equal(typeof compositionRenderers["precision-practice"], "function");
const required = { businessName: "Example", mainService: "Assessment", audience: "Adults", goal: "Book", bookingLink: "https://example.com/book", credentials: "Registered physiotherapist" };
const eligible = (brief: Record<string, unknown>, usableImageCount = 0) => analyseDirections({ brief: { ...required, ...brief }, assetCount: usableImageCount, usableImageCount }).directions.map((direction) => direction.id);
assert.ok(eligible({ businessType: "Sports physiotherapy practice", mainService: "Sports injury assessment" }).includes("precision-practice"));
assert.ok(eligible({ businessType: "Rehabilitation clinic", mainService: "Rehabilitation assessment" }, 1).includes("precision-practice"));
assert.ok(eligible({ businessType: "Clinical sports therapy specialist", mainService: "Running injury assessment" }, 2).includes("precision-practice"));
assert.ok(!eligible({ businessType: "Sports physiotherapy practice", mainService: "Assessment", credentials: "" }).includes("precision-practice"));
assert.ok(!eligible({ businessType: "Pilates studio", mainService: "Reformer Pilates classes" }).includes("precision-practice"));
assert.ok(!eligible({ businessType: "Boxing gym", mainService: "Boxing coaching" }).includes("precision-practice"));
assert.ok(!eligible({ businessType: "Online nutrition coach", mainService: "Remote nutrition coaching" }).includes("precision-practice"));

console.log("Three Precision Practice proof businesses, parity checks and family constraints passed");
