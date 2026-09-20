import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adaptLegacyProject, headlineFitFor, type AssetMode, type ContentMode, type SitePlanV1 } from "../../../../../lib/site-plan/src/index.js";
import { analyseDirections } from "../../../../api-server/src/lib/site-generator/index.js";
import { buildCompositionHtml, CompositionSite } from "./CompositionSites.js";

const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#233650"/><path d="M0 700C300 470 600 850 1200 430V900H0Z" fill="#99c9ed"/><circle cx="890" cy="270" r="190" fill="none" stroke="#ddff53" stroke-width="12"/></svg>')}`;
const baseBrief = { businessName: "", businessType: "", mainService: "", audience: "", location: "", deliveryMode: "Online", goal: "Apply", bookingLink: "https://example.com/apply", offer: "", credentials: "", results: "", testimonialQuote: "", testimonialName: "", process: "", faqQuestion: "", faqAnswer: "", schedule: "", sections: [] as string[], serviceDetails: "", objections: "", differentiator: "", contentLength: "standard", imagePreference: "Auto" };

type Proof = {
  slug: string; brief: typeof baseBrief; copy: { headline: string; subheadline: string; about: string; button: string };
  sections: Array<{ id: string; eyebrow?: string; title: string; body: string; highlights?: string[] }>;
  contentMode: ContentMode; assetMode: AssetMode; heroVariant: string; images: string[]; palette: { accent: string; dark: string; light: string }; font: string;
};

const proofs: Proof[] = [
  {
    slug: "paceframe-running",
    brief: { ...baseBrief, businessName: "Paceframe", businessType: "Online running coach", mainService: "Remote running coaching", audience: "Recreational runners building a consistent week", location: "United Kingdom", offer: "An adaptable training plan with direct coach feedback", process: "Share your running context; Receive your training week; Review and adjust", faqQuestion: "Do I need to be training for a race?", faqAnswer: "No. Coaching can focus on consistency as well as an event.", sections: ["services", "approach", "about", "faq", "contact"], contentLength: "compact", imagePreference: "Image light" },
    copy: { headline: "Run your week with purpose.", subheadline: "Remote coaching shaped around the runner you are and the time you actually have.", about: "Paceframe is a person-led online coaching practice built around direct feedback and useful adjustments.", button: "Ask about coaching" },
    sections: [
      { id: "services", eyebrow: "The programme", title: "Less guessing. More useful running.", body: "An adaptable plan, a clear reason for each session and feedback based on the training you complete.", highlights: ["A clear training week", "Direct coach feedback", "Adjustments when life changes"] },
      { id: "approach", eyebrow: "How it works", title: "Good plans start with better questions.", body: "Your starting point, available time and reasons for running shape the first plan.", highlights: ["Share your context", "Build your week", "Review and adjust"] },
      { id: "about", eyebrow: "The coaching view", title: "Coached by a human.", body: "Direct feedback and sensible adjustments from a small independent practice.", highlights: [] },
      { id: "faq", eyebrow: "Quick answer", title: "Wondering if it fits?", body: "No. Coaching can focus on consistency as well as an event.", highlights: [] },
      { id: "contact", eyebrow: "Your next step", title: "Ready to find your rhythm?", body: "Tell Paceframe what running looks like now and where support would help.", highlights: [] },
    ], contentMode: "compact", assetMode: "none", heroVariant: "track", images: [], palette: { accent: "#283cf4", dark: "#121625", light: "#f7f8f4" }, font: "Strong & modern",
  },
  {
    slug: "everyday-fuel",
    brief: { ...baseBrief, businessName: "Everyday Fuel", businessType: "Online nutrition coaching", mainService: "Remote nutrition coaching", audience: "Busy adults who want a more consistent approach to food", location: "Australia", offer: "One-to-one online nutrition coaching", credentials: "Accredited practising dietitian", results: "Plans are reviewed during fortnightly online check-ins", process: "Complete an initial assessment; Agree practical priorities; Review at fortnightly check-ins", faqQuestion: "Will I receive a fixed meal plan?", faqAnswer: "No. Coaching focuses on practical priorities agreed during assessment.", sections: ["services", "approach", "results", "faq", "contact"], contentLength: "standard" },
    copy: { headline: "Make food decisions feel clearer.", subheadline: "Online nutrition coaching for busy adults who want practical priorities and regular review.", about: "Evidence-informed support delivered online.", button: "Apply for coaching" },
    sections: [
      { id: "services", eyebrow: "Inside coaching", title: "A practical structure for real weeks.", body: "One-to-one support begins with assessment and continues through agreed priorities and fortnightly review.", highlights: ["Initial assessment", "Practical priorities", "Fortnightly check-ins"] },
      { id: "approach", eyebrow: "The route", title: "See the plan. Understand the purpose.", body: "Each stage uses the information supplied by the client and the coach's assessment.", highlights: ["Assess", "Agree", "Review"] },
      { id: "results", eyebrow: "Professional context", title: "The evidence behind the service.", body: "Accredited practising dietitian", highlights: [] },
      { id: "faq", eyebrow: "Good to know", title: "A straight answer before applying.", body: "No. Coaching focuses on practical priorities agreed during assessment.", highlights: [] },
      { id: "contact", eyebrow: "Next step", title: "Start with your context.", body: "Apply for one-to-one online nutrition coaching.", highlights: [] },
    ], contentMode: "standard", assetMode: "none", heroVariant: "dashboard", images: [], palette: { accent: "#1769aa", dark: "#10243a", light: "#edf5fa" }, font: "Clean professional",
  },
  {
    slug: "summit-remote-strength",
    brief: { ...baseBrief, businessName: "Summit Method", businessType: "Remote strength coach", mainService: "Online strength coaching", audience: "Experienced recreational lifters training around demanding work", location: "Canada", offer: "Individual programming with weekly review", credentials: "Certified strength and conditioning specialist", results: "Weekly programme reviews are included", testimonialQuote: "The plan finally fits the week I actually have.", testimonialName: "Jordan, remote client", process: "Complete the training audit; Start the first block; Review every week", schedule: "Monday: primary session; Wednesday: secondary session; Saturday: longer session", faqQuestion: "Can sessions move when work changes?", faqAnswer: "Yes. Weekly review is used to adjust the programme around the information you provide.", sections: ["services", "schedule", "approach", "about", "results", "testimonial", "faq", "contact"], contentLength: "expanded" },
    copy: { headline: "Serious training that works around serious work.", subheadline: "Individual online strength programming with a weekly review and a clear purpose for every session.", about: "Summit Method provides remote strength coaching for recreational lifters balancing training with demanding work.", button: "Apply to work together" },
    sections: [
      { id: "services", eyebrow: "The programme", title: "Know what the week is asking of you.", body: "Individual programming is built from a training audit and reviewed each week.", highlights: ["Individual programming", "Weekly review", "Clear session purpose"] },
      { id: "schedule", eyebrow: "Training week", title: "Three supplied training anchors.", body: "Monday, Wednesday and Saturday sessions.", highlights: [] },
      { id: "approach", eyebrow: "How it works", title: "Audit. Train. Review.", body: "Begin with the current training picture, complete the first block and use weekly review to adjust.", highlights: ["Complete the audit", "Start the block", "Review every week"] },
      { id: "about", eyebrow: "The coaching view", title: "Programming with context.", body: "Remote coaching for experienced recreational lifters.", highlights: [] },
      { id: "results", eyebrow: "Professional context", title: "The supplied record.", body: "Certified strength and conditioning specialist", highlights: [] },
      { id: "testimonial", eyebrow: "Client words", title: "A week that fits.", body: "The plan finally fits the week I actually have.", highlights: [] },
      { id: "faq", eyebrow: "Quick answer", title: "When work changes the week.", body: "Yes. Weekly review is used to adjust the programme around the information you provide.", highlights: [] },
      { id: "contact", eyebrow: "Your next step", title: "Bring the full training picture.", body: "Apply to discuss your current training, available week and goals.", highlights: [] },
    ], contentMode: "expanded", assetMode: "single", heroVariant: "image-signal", images: [image], palette: { accent: "#1c6a4b", dark: "#10251c", light: "#edf3ef" }, font: "Strong & modern",
  },
];

for (const proof of proofs) {
  const base = adaptLegacyProject({ briefData: proof.brief, styleData: { compositionId: "digital-momentum", copy: proof.copy }, sections: proof.sections });
  const plan: SitePlanV1 = { ...base, familyId: "digital-momentum", contentMode: proof.contentMode, assetMode: proof.assetMode, visual: { paletteId: proof.slug, accent: proof.palette.accent, fontStyle: proof.font, surface: "High contrast" }, hero: { variant: proof.heroVariant, headline: proof.copy.headline, subheadline: proof.copy.subheadline, headlineFit: headlineFitFor(proof.copy.headline), imageUrl: proof.images[0] || "" }, assets: { images: proof.images.map((url) => ({ url, role: "hero", alt: `${proof.brief.businessName} training` })) }, narrative: { ...base.narrative, orderedModuleIds: proof.brief.sections } };
  const shared = { compositionId: "digital-momentum", brief: proof.brief, copy: proof.copy, sections: proof.sections, heroImage: proof.images[0] || "", useImage: proof.images.length > 0, accent: proof.palette.accent, paletteDark: proof.palette.dark, paletteLight: proof.palette.light, fontStyle: proof.font, sitePlan: plan };
  const preview = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: false, previewMode: "desktop" }));
  const mobilePreview = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: true, previewMode: "mobile" }));
  const exported = buildCompositionHtml({ ...shared, bookingUrl: proof.brief.bookingLink, locale: proof.brief.location === "Australia" ? "en-AU" : proof.brief.location === "Canada" ? "en-CA" : "en-GB" });
  if (process.env.WRITE_PROOFS === "1") {
    mkdirSync("scratch/digital-proof-pages", { recursive: true });
    writeFileSync(`scratch/digital-proof-pages/${proof.slug}.html`, exported, "utf8");
  }
  assert.match(preview, new RegExp(`data-hero="${proof.heroVariant}"`));
  assert.match(exported, new RegExp(`data-hero="${proof.heroVariant}"`));
  assert.match(preview, new RegExp(proof.copy.headline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(exported, new RegExp(proof.palette.accent));
  assert.match(exported, /^<!doctype html>/);
  assert.match(exported, /@media\(max-width:760px\)/);
  assert.match(mobilePreview, /min-h-\[680px\]/);
  assert.doesNotMatch(mobilePreview, /grid-cols-\[1\.05fr_\.95fr\]/);
  assert.doesNotMatch(exported, /<script[^>]+src=|<link[^>]+stylesheet/);
  assert.ok(exported.lastIndexOf('data-module="contact"') > exported.lastIndexOf('data-module="services"'));
  const previewModules = [...preview.matchAll(/data-module="([^"]+)"/g)].map((match) => match[1]);
  const exportModules = [...exported.matchAll(/data-module="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(exportModules, previewModules, `${proof.slug}: preview and export module order differs`);
  if (proof.assetMode === "none") assert.doesNotMatch(exported, /<img/);
  else assert.match(exported, /data:image\/svg\+xml/);
}

const required = { businessName: "Example", mainService: "Coaching", audience: "Adults", goal: "Apply", bookingLink: "https://example.com/apply" };
const eligible = (brief: Record<string, unknown>, usableImageCount = 0) => analyseDirections({ brief: { ...required, ...brief }, assetCount: usableImageCount, usableImageCount }).directions.map((direction) => direction.id);
assert.ok(eligible({ businessType: "Online running coach", mainService: "Remote running coaching" }).includes("digital-momentum"));
assert.ok(eligible({ businessType: "Online nutrition coach", mainService: "Remote nutrition programme" }).includes("digital-momentum"));
assert.ok(eligible({ businessType: "Remote strength coach", mainService: "Online strength coaching" }, 5).includes("digital-momentum"));
assert.ok(!eligible({ businessType: "Pilates studio", mainService: "In-person reformer classes", goal: "Join a class" }).includes("digital-momentum"));
assert.ok(!eligible({ businessType: "Boxing gym", mainService: "In-person boxing classes", goal: "Join a class" }).includes("digital-momentum"));
assert.ok(!eligible({ businessType: "Clinical physiotherapy practice", mainService: "Injury assessment", goal: "Book" }).includes("digital-momentum"));

console.log("Three Digital Momentum proof businesses and family constraints passed");
