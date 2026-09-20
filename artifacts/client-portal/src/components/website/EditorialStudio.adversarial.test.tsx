import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adaptLegacyProject, headlineFitFor, type SitePlanV1 } from "../../../../../lib/site-plan/src/index.js";
import { analyseDirections, hasBlockingIssues, validateGeneratedDraft } from "../../../../api-server/src/lib/site-generator/index.js";
import { buildCompositionHtml, CompositionSite } from "./CompositionSites.js";

const image = (label: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#d8d0c4"/><text x="50" y="90" font-family="Arial" font-size="30">${label}</text></svg>`)}`;
const baseBrief = {
  businessName: "Test Movement", businessType: "Pilates studio", mainService: "Pilates", audience: "Local adults seeking thoughtful movement", location: "London", deliveryMode: "In person", goal: "Book a session", bookingLink: "https://example.com/book", offer: "Small-group and private movement sessions", credentials: "", results: "", testimonialQuote: "", testimonialName: "", process: "Choose a format; Ask a question; Book a session", faqQuestion: "", faqAnswer: "", schedule: "", sections: ["services", "approach", "about", "contact"], serviceDetails: "", objections: "", differentiator: "", contentLength: "standard", imagePreference: "Auto",
};
const baseCopy = { headline: "Move with more attention.", subheadline: "A clear, welcoming place to build a movement practice that fits real life.", about: "An independent movement practice shaped around attentive teaching and a straightforward first step.", button: "Book a session" };
const baseSections = [
  { id: "services", eyebrow: "Ways to move", title: "Choose a useful starting point.", body: "Select a session format that matches your experience, preferences and available time.", highlights: ["Small group", "Private session"] },
  { id: "approach", eyebrow: "How it works", title: "A clear route into the practice.", body: "Start with the information you have and choose the most comfortable next step.", highlights: ["Choose", "Ask", "Begin"] },
  { id: "about", eyebrow: "The practice", title: "Attentive by design.", body: baseCopy.about, highlights: [] },
  { id: "contact", eyebrow: "Next step", title: "Begin with a conversation.", body: "Use the booking link or send a question before choosing a session.", highlights: [] },
];

type Case = { name: string; brief?: Partial<typeof baseBrief>; copy?: Partial<typeof baseCopy>; sections?: typeof baseSections; images?: string[]; hero?: string; expected?: string[]; absent?: string[] };
const cases: Case[] = [
  { name: "sparse-solo-yoga", brief: { businessName: "Still Morning Yoga", businessType: "Solo yoga teacher", mainService: "Private yoga", sections: ["services", "about", "contact"], process: "" }, images: [], hero: "typographic", expected: ["services", "about", "contact"], absent: ['data-module="schedule"', 'data-module="testimonial"', 'data-module="faq"'] },
  { name: "single-image-barre", brief: { businessName: "Line Barre", businessType: "Barre studio" }, images: [image("barre")], hero: "split" },
  { name: "image-rich-pilates", images: [image("hero"), image("story"), image("detail"), image("room")], hero: "immersive" },
  { name: "long-headline", copy: { headline: "A deliberately extended movement studio headline that still needs to remain calm and readable on smaller screens" } },
  { name: "special-characters", brief: { businessName: "A&B <Movement>" }, copy: { headline: "Move safely <script>alert('x')</script> with us" }, absent: ["<script>alert"] },
  { name: "unsupported-testimonial", brief: { sections: ["services", "testimonial", "about", "contact"], testimonialQuote: "" }, absent: ["data-module=\"testimonial\""] },
  { name: "unsupported-schedule", brief: { sections: ["services", "schedule", "about", "contact"], schedule: "" }, absent: ["data-module=\"schedule\""] },
  { name: "hidden-schedule", brief: { sections: ["services", "about", "contact"], schedule: "Monday 09:00; Thursday 18:00" }, absent: ["Monday 09:00", "data-module=\"schedule\""] },
  { name: "evidenced-rich-proof", brief: { sections: ["services", "about", "results", "testimonial", "faq", "contact"], credentials: "Certified Pilates instructors", results: "Classes are capped at eight people", testimonialQuote: "I always know what I am working on.", testimonialName: "A member", faqQuestion: "Can beginners attend?", faqAnswer: "Yes. Choose the introductory session." }, sections: [...baseSections.slice(0, 3), { id: "results", eyebrow: "Evidence", title: "Teaching with attention.", body: "Certified Pilates instructors", highlights: [] }, { id: "testimonial", eyebrow: "Client words", title: "A clear experience", body: "I always know what I am working on.", highlights: [] }, { id: "faq", eyebrow: "Before you begin", title: "Useful answers.", body: "Yes. Choose the introductory session.", highlights: [] }, baseSections[3]] },
  { name: "multi-location-warning", brief: { businessName: "North Quarter Pilates", businessScale: "Multi-location studio", locationCount: 3, location: "Manchester" } as Partial<typeof baseBrief> },
  { name: "email-conversion", brief: { bookingLink: "mailto:hello@example.com", goal: "Enquire" }, copy: { button: "Email the studio" } },
  { name: "telephone-conversion", brief: { bookingLink: "tel:+442079460000", goal: "Call" }, copy: { button: "Call the studio" } },
];

for (const fixture of cases) {
  const brief = { ...baseBrief, ...fixture.brief };
  const copy = { ...baseCopy, ...fixture.copy };
  const sections = fixture.sections || baseSections;
  const images = fixture.images || [];
  const adapted = adaptLegacyProject({ briefData: brief, styleData: { compositionId: "editorial-studio", heroVariant: fixture.hero || (images.length ? "split" : "typographic"), heroImage: images[0] || "", imageUrls: images, copy }, sections });
  const plan: SitePlanV1 = { ...adapted, familyId: "editorial-studio", assetMode: images.length > 1 ? "multiple" : images.length ? "single" : "none", hero: { ...adapted.hero, variant: fixture.hero || (images.length ? "split" : "typographic"), headlineFit: headlineFitFor(copy.headline) }, narrative: { ...adapted.narrative, orderedModuleIds: brief.sections }, assets: { images: images.map((url, index) => ({ url, role: index === 0 ? "hero" : index === 1 ? "story" : "gallery", alt: `${brief.businessName} image` })) } };
  const shared = { compositionId: "editorial-studio", brief, copy, sections, heroImage: images[0] || "", useImage: images.length > 0, accent: "#bd765d", paletteDark: "#193028", paletteLight: "#f4efe7", fontStyle: "Premium editorial", sitePlan: plan };
  const preview = renderToStaticMarkup(createElement(CompositionSite, { ...shared, narrow: false, previewMode: "desktop" }));
  const exported = buildCompositionHtml({ ...shared, bookingUrl: brief.bookingLink, locale: "en-GB" });
  if (fixture.name === "special-characters") assert.match(preview, /&lt;script&gt;/);
  else assert.match(preview, new RegExp(copy.headline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(exported, /^<!doctype html>/);
  assert.doesNotMatch(exported, /<script[^>]+src=|<link[^>]+stylesheet/);
  assert.ok(exported.lastIndexOf('data-module="contact"') > exported.lastIndexOf('data-module="services"'), `${fixture.name}: contact should close the narrative`);
  for (const expected of fixture.expected || []) assert.match(exported, new RegExp(expected));
  for (const absent of fixture.absent || []) assert.doesNotMatch(exported, new RegExp(absent));
  if (copy.headline.length > 72) assert.equal(plan.hero.headlineFit, "compact");
}

const required = { businessName: "Example", mainService: "Coaching", audience: "Adults", goal: "Book", bookingLink: "https://example.com" };
const eligible = (brief: Record<string, unknown>, usableImageCount = 0) => analyseDirections({ brief: { ...required, ...brief }, assetCount: usableImageCount, usableImageCount }).directions.map((direction) => direction.id);
assert.ok(eligible({ businessType: "Pilates studio", mainService: "Reformer Pilates", goal: "Join a class", schedule: "Monday 09:00" }).includes("editorial-studio"));
assert.ok(!eligible({ businessType: "Boxing gym", mainService: "Performance boxing coaching" }, 4).includes("editorial-studio"));
assert.ok(!eligible({ businessType: "Online running coach", mainService: "Remote coaching", goal: "Apply" }).includes("editorial-studio"));
assert.ok(!eligible({ businessType: "Clinical physiotherapy practice", mainService: "Sports injury assessment", goal: "Book" }).includes("editorial-studio"));
assert.ok(!eligible({ businessType: "Six-week challenge", mainService: "Digital programme", goal: "Join waitlist" }).includes("editorial-studio"));

const validDraft = { copy: baseCopy, sections: baseSections.map((section) => ({ ...section, layout: "editorial" as const })) };
assert.equal(hasBlockingIssues(validateGeneratedDraft(baseBrief, validDraft)), false);
const inventedResult = { ...validDraft, sections: validDraft.sections.map((section) => section.id === "services" ? { ...section, body: "Our programme has helped 97% of clients transform their fitness safely." } : section) };
assert.equal(hasBlockingIssues(validateGeneratedDraft(baseBrief, inventedResult)), true);
const missingAbout = { ...validDraft, sections: validDraft.sections.filter((section) => section.id !== "about") };
assert.ok(validateGeneratedDraft(baseBrief, missingAbout).some((issue) => issue.code === "missing-section"));

const savedStyle = { copy: { ...baseCopy, headline: "A customer-edited headline remains saved." }, sitePlan: { ...adaptLegacyProject({ briefData: baseBrief, styleData: { compositionId: "editorial-studio", copy: baseCopy }, sections: baseSections }), hero: { ...adaptLegacyProject({ briefData: baseBrief, styleData: { compositionId: "editorial-studio", copy: baseCopy }, sections: baseSections }).hero, headline: "A customer-edited headline remains saved." } } };
const refreshed = adaptLegacyProject({ briefData: baseBrief, styleData: savedStyle, sections: baseSections });
assert.equal(refreshed.hero.headline, "A customer-edited headline remains saved.");
assert.equal(savedStyle.copy.headline, "A customer-edited headline remains saved.");

console.log("Twelve adversarial Editorial Studio fixtures and family constraints passed");
