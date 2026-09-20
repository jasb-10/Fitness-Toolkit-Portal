import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adaptLegacyProject, type AssetMode, type ContentMode, type SitePlanV1 } from "../../../../../lib/site-plan/src/index.js";
import { buildCompositionHtml, CompositionSite } from "./CompositionSites.js";

const svgImage = (label: string, background: string, foreground: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1000"><rect width="1400" height="1000" fill="${background}"/><circle cx="1010" cy="310" r="260" fill="none" stroke="${foreground}" stroke-width="5" opacity=".55"/><path d="M0 820 C320 610 620 980 920 730 S1260 580 1400 700 V1000 H0Z" fill="${foreground}" opacity=".22"/><text x="80" y="110" fill="${foreground}" font-family="Arial" font-size="34" letter-spacing="8">${label.toUpperCase()}</text></svg>`)}`;

const baseBrief = {
  businessName: "", mainService: "", audience: "", location: "", deliveryMode: "In person", offer: "", credentials: "", results: "", testimonialQuote: "", testimonialName: "", process: "", faqQuestion: "", faqAnswer: "", schedule: "", sections: [] as string[], serviceDetails: "", objections: "", differentiator: "",
};

type ProofInput = {
  slug: string;
  brief: typeof baseBrief;
  copy: { headline: string; subheadline: string; about: string; button: string };
  sections: Array<{ id: string; eyebrow?: string; title: string; body: string; highlights?: string[] }>;
  contentMode: ContentMode;
  assetMode: AssetMode;
  heroVariant: string;
  images: string[];
  accent: string;
  dark: string;
  light: string;
  fontStyle: string;
  bookingUrl: string;
};

function makeProof(input: ProofInput) {
  const adapted = adaptLegacyProject({ briefData: input.brief, styleData: { compositionId: "editorial-studio", heroVariant: input.heroVariant, copy: input.copy, heroImage: input.images[0] || "", imageUrls: input.images }, sections: input.sections });
  const sitePlan: SitePlanV1 = {
    ...adapted,
    familyId: "editorial-studio",
    contentMode: input.contentMode,
    assetMode: input.assetMode,
    narrative: { ...adapted.narrative, orderedModuleIds: input.brief.sections },
    visual: { paletteId: input.slug, accent: input.accent, fontStyle: input.fontStyle, surface: "Mostly light" },
    hero: { ...adapted.hero, variant: input.heroVariant, imageUrl: input.images[0] || "" },
    assets: { images: input.images.map((url, index) => ({ url, role: index === 0 ? "hero" : index === 1 ? "story" : "gallery", alt: `${input.brief.businessName} ${index === 0 ? "hero" : "studio"}` })) },
  };
  const shared = { compositionId: "editorial-studio", brief: input.brief, copy: input.copy, sections: input.sections, heroImage: input.images[0] || "", useImage: input.images.length > 0, accent: input.accent, paletteDark: input.dark, paletteLight: input.light, fontStyle: input.fontStyle, sitePlan };
  const preview = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: false, previewMode: "desktop" }));
  const tabletPreview = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: true, previewMode: "tablet" }));
  const mobilePreview = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: true, previewMode: "mobile" }));
  const exported = buildCompositionHtml({ ...shared, bookingUrl: input.bookingUrl, locale: "en-GB" });
  return { ...input, sitePlan, preview, tabletPreview, mobilePreview, exported };
}

const sparse = makeProof({
  slug: "sparse-yoga",
  brief: { ...baseBrief, businessName: "Quiet Arc Yoga", mainService: "Private yoga", audience: "Beginners who want a calm, individual introduction to yoga", location: "Fitzroy, Melbourne", offer: "One-to-one yoga sessions", process: "Tell me what you need; Choose a suitable time; Begin with a private session", sections: ["services", "approach", "about", "contact"] },
  copy: { headline: "A quieter way to begin yoga.", subheadline: "Private, unhurried sessions for people who would rather start away from a busy class.", about: "Quiet Arc is a small independent practice offering one-to-one yoga in Fitzroy. Sessions begin with a conversation about what feels comfortable and useful to you.", button: "Ask about a session" },
  sections: [
    { id: "services", eyebrow: "Private practice", title: "One format. Shaped around you.", body: "One-to-one sessions offer time to learn at your own pace without needing previous yoga experience.", highlights: ["A calm introduction", "Individual attention"] },
    { id: "approach", eyebrow: "Your first steps", title: "Nothing to prove before you arrive.", body: "The first session starts with a simple conversation and moves at a pace that feels manageable.", highlights: ["Tell me what you need", "Choose a suitable time", "Begin privately"] },
    { id: "about", eyebrow: "The practice", title: "Small by design.", body: "A local, independent practice for people who value quiet attention." },
    { id: "contact", eyebrow: "A simple beginning", title: "Start with a question.", body: "Send an enquiry and we can decide whether a private session feels right." },
  ],
  contentMode: "compact", assetMode: "none", heroVariant: "typographic", images: [], accent: "#d7a98c", dark: "#26352f", light: "#f5f0e8", fontStyle: "Premium editorial", bookingUrl: "mailto:hello@quietarc.example",
});

const reformerImages = [svgImage("Movement", "#d8d0c2", "#5e3028"), svgImage("Studio", "#b7c1b0", "#20362d"), svgImage("Detail", "#e2cab7", "#693b2d"), svgImage("Practice", "#c8b8a4", "#33473e")];
const reformer = makeProof({
  slug: "reformer-studio",
  brief: { ...baseBrief, businessName: "Form & Field Pilates", mainService: "Reformer Pilates", audience: "Toronto residents looking for precise, welcoming small-group Pilates", location: "Leslieville, Toronto", offer: "Small-group reformer, foundations and private sessions", credentials: "Classes are led by certified Pilates instructors", results: "Small classes allow instructors to offer individual guidance", testimonialQuote: "The teaching is precise, but the studio never feels intimidating.", testimonialName: "Nadia, member", process: "Choose your starting point; Meet your instructor; Build a consistent practice", schedule: "Monday 07:00 — Foundations; Tuesday 18:15 — Reformer Flow; Thursday 12:00 — Express; Saturday 09:30 — Foundations", faqQuestion: "I have never used a reformer. Where should I start?", faqAnswer: "Choose a Foundations class or contact the studio about a private introduction.", sections: ["services", "approach", "about", "schedule", "results", "testimonial", "faq", "contact"] },
  copy: { headline: "Strength, shaped with intention.", subheadline: "Precise reformer Pilates in small classes, with a clear place for beginners to start.", about: "Form & Field is a Leslieville reformer studio built around attentive instruction, purposeful programming and a welcoming room.", button: "View the timetable" },
  sections: [
    { id: "services", eyebrow: "Ways to practise", title: "Find the format that fits.", body: "Choose an introduction, a progressive group class or focused private instruction.", highlights: ["Foundations", "Reformer Flow", "Private sessions"] },
    { id: "approach", eyebrow: "Your route in", title: "Begin clearly. Progress deliberately.", body: "Each route gives you a clear first step and room to build confidence.", highlights: ["Choose your starting point", "Meet your instructor", "Build consistency"] },
    { id: "about", eyebrow: "The studio", title: "Made for attentive movement.", body: "A neighbourhood studio where class size supports individual guidance." },
    { id: "results", eyebrow: "Why members choose us", title: "Detail you can feel.", body: "Classes are led by certified Pilates instructors" },
    { id: "testimonial", eyebrow: "Member words", title: "Inside the experience", body: "The teaching is precise, but the studio never feels intimidating." },
    { id: "faq", eyebrow: "First visit", title: "Before you begin.", body: "Choose a Foundations class or contact the studio about a private introduction." },
    { id: "contact", eyebrow: "Plan your visit", title: "Meet us on the reformer.", body: "Choose a suitable class or ask which starting point is right for you." },
  ],
  contentMode: "expanded", assetMode: "multiple", heroVariant: "immersive", images: reformerImages, accent: "#c9785c", dark: "#17251f", light: "#f3eee5", fontStyle: "Premium editorial", bookingUrl: "https://example.com/form-and-field/book",
});

const wellnessImage = svgImage("Wellness", "#b7c2bc", "#1d3933");
const wellness = makeProof({
  slug: "wellness-studio",
  brief: { ...baseBrief, businessName: "Common Ground Wellness", mainService: "Integrated movement and recovery", audience: "Busy professionals seeking joined-up support for movement, recovery and everyday wellbeing", location: "Brooklyn, New York", offer: "Pilates, mobility, massage and recovery appointments", credentials: "The studio team includes certified Pilates instructors and licensed massage therapists", results: "Clients can combine movement and recovery services in one studio", testimonialQuote: "I stopped piecing everything together myself. The team helped me find a rhythm I can actually maintain.", testimonialName: "Elena, studio client", process: "Share what you need; Choose a service or combination; Review your plan with the team", faqQuestion: "Do I need to know which service to book?", faqAnswer: "No. Send the team a short note and they will help you choose an appropriate first appointment.", sections: ["services", "approach", "about", "results", "testimonial", "faq", "contact"] },
  copy: { headline: "One place to move, recover and reset.", subheadline: "A considered studio bringing movement and hands-on recovery together around real life.", about: "Common Ground is an established Brooklyn wellness studio. Its team brings Pilates, mobility and massage into one clear, collaborative client experience.", button: "Find your starting point" },
  sections: [
    { id: "services", eyebrow: "The practice", title: "Support that works together.", body: "Start with one service or combine movement and recovery with guidance from the team.", highlights: ["Pilates and mobility", "Massage therapy", "Recovery appointments"] },
    { id: "approach", eyebrow: "A joined-up plan", title: "Start with what your week needs.", body: "The team helps you choose an appropriate route without asking you to diagnose the answer yourself.", highlights: ["Share what you need", "Choose your route", "Review with the team"] },
    { id: "about", eyebrow: "The team", title: "Different disciplines. One standard of care.", body: "Certified Pilates instructors and licensed massage therapists work from one welcoming neighbourhood studio." },
    { id: "results", eyebrow: "Why it works", title: "Less piecing it together.", body: "Clients can combine movement and recovery services in one studio" },
    { id: "testimonial", eyebrow: "Client experience", title: "A rhythm that lasts", body: "I stopped piecing everything together myself." },
    { id: "faq", eyebrow: "Choosing well", title: "You do not need the answer first.", body: "Send the team a note and they will help you choose." },
    { id: "contact", eyebrow: "Your first step", title: "Tell us what you need.", body: "The team will help you choose a suitable place to begin." },
  ],
  contentMode: "expanded", assetMode: "single", heroVariant: "split", images: [wellnessImage], accent: "#b9c979", dark: "#18332e", light: "#f2efe5", fontStyle: "Clean professional", bookingUrl: "https://example.com/common-ground/start",
});

export const proofs = [sparse, reformer, wellness];

for (const proof of proofs) {
  assert.match(proof.preview, new RegExp(proof.copy.headline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(proof.tabletPreview, new RegExp(proof.copy.headline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(proof.exported, /^<!doctype html>/);
  assert.doesNotMatch(proof.exported, /<script[^>]+src=|<link[^>]+stylesheet/);
  assert.equal(proof.exported.match(/data-module="contact"/g)?.length, 1);
  assert.ok(proof.exported.lastIndexOf('data-module="contact"') > proof.exported.lastIndexOf('data-module="services"'));
  assert.doesNotMatch(proof.exported, /lorem ipsum|discuss the practitioner|award-winning|best-in-class/i);
}
assert.doesNotMatch(sparse.preview, /<img/);
assert.doesNotMatch(sparse.exported, /<img/);
assert.doesNotMatch(sparse.exported, /href="#schedule"/);
assert.equal((reformer.exported.match(/<img/g) || []).length, 4);
assert.match(reformer.exported, /Monday 07:00/);
assert.match(reformer.exported, /href="#schedule">Sessions/);
assert.match(wellness.exported, /licensed massage therapists/);
assert.doesNotMatch(wellness.exported, /data-module="schedule"/);
console.log("Three Editorial Studio proof businesses passed deterministic checks");
