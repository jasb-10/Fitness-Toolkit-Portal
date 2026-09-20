import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adaptLegacyProject } from "../../../../../lib/site-plan/src/index.js";
import { buildCompositionHtml, CompositionSite } from "./CompositionSites.js";

const brief = {
  businessName: "Still House Pilates",
  mainService: "Reformer Pilates",
  audience: "People building calm, lasting strength",
  location: "Bristol",
  offer: "Small-group and private reformer sessions",
  credentials: "Qualified reformer Pilates instructors",
  results: "",
  testimonialQuote: "I feel stronger and more confident in every session.",
  testimonialName: "Maya, studio member",
  process: "Choose a session; Meet your instructor; Begin at your pace",
  faqQuestion: "Do I need experience?",
  faqAnswer: "No. Beginners are welcome.",
  schedule: "Monday 07:30; Wednesday 18:00; Saturday 09:00",
  sections: ["services", "approach", "about", "schedule", "results", "testimonial", "faq", "contact"],
  serviceDetails: "",
  objections: "",
  differentiator: "",
};
const copy = { headline: "Find strength in the details of how you move", subheadline: "Considered Pilates in a calm, welcoming studio.", about: "A thoughtful studio built around clear teaching and individual attention.", button: "Find a session" };
const sections = [
  { id: "services", eyebrow: "Ways to move", title: "Choose the practice that fits.", body: "Start with the format that meets you where you are.", highlights: ["Small-group reformer", "Private sessions", "Foundation classes"] },
  { id: "approach", eyebrow: "How it works", title: "A considered first step.", body: "We make the route into the studio clear.", highlights: ["Choose a session", "Meet your instructor", "Begin at your pace"] },
  { id: "about", eyebrow: "The studio", title: "Space to reconnect.", body: copy.about },
  { id: "results", eyebrow: "The evidence", title: "Teaching you can trust.", body: brief.credentials },
  { id: "testimonial", eyebrow: "Client words", title: "Member experience", body: brief.testimonialQuote },
  { id: "faq", eyebrow: brief.faqQuestion, title: "Before you begin.", body: brief.faqAnswer },
  { id: "contact", eyebrow: "Your next move", title: "Start where you are.", body: "Tell us how you would like to move." },
];
const adaptedPlan = adaptLegacyProject({ briefData: brief, styleData: { compositionId: "editorial-studio", heroVariant: "typographic", copy }, sections });
const sitePlan = { ...adaptedPlan, narrative: { ...adaptedPlan.narrative, orderedModuleIds: ["services", "approach", "about", "schedule", "results", "testimonial", "faq", "contact"] } };
const html = renderToStaticMarkup(createElement(CompositionSite, { compositionId: "editorial-studio", brief, copy, sections, heroImage: "", useImage: false, accent: "#b96d51", narrow: false, previewMode: "desktop", fontStyle: "Premium editorial", sitePlan }));
const exportedHtml = buildCompositionHtml({ compositionId: "editorial-studio", brief, copy, sections, heroImage: "", useImage: false, accent: "#b96d51", paletteDark: "#18231f", paletteLight: "#f5f2ea", fontStyle: "Premium editorial", sitePlan, bookingUrl: "https://example.com/book", locale: "en-GB" });
export { exportedHtml, html };

assert.match(html, /Find strength in the details/);
assert.match(html, /Monday 07:30/);
assert.match(html, /I feel stronger/);
assert.match(html, /Do I need experience/);
assert.doesNotMatch(html, /<img/);
assert.ok(html.indexOf("Choose the practice") < html.indexOf("Find your next session"));
assert.match(exportedHtml, /^<!doctype html>/);
assert.match(exportedHtml, /data-hero="typographic"/);
assert.match(exportedHtml, /href="https:\/\/example\.com\/book"/);
assert.match(exportedHtml, /--ink:#18231f;--paper:#f5f2ea;--accent:#b96d51/);
assert.doesNotMatch(exportedHtml, /<script[^>]+src=|<link[^>]+stylesheet/);
assert.doesNotMatch(exportedHtml, /<img/);
const exportedOrder = [...exportedHtml.matchAll(/data-module="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(exportedOrder, ["services", "approach", "about", "schedule", "results", "testimonial", "faq", "contact"]);
assert.ok(exportedHtml.indexOf("Choose the practice") < exportedHtml.indexOf("Find your next session"));
assert.ok(exportedHtml.indexOf("Before you begin") < exportedHtml.indexOf("Start where you are"));

const mobileBrief = { ...brief, sections: brief.sections.filter((id) => id !== "schedule") };
const mobileImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900'%3E%3Crect width='1200' height='900' fill='%23d9d2c5'/%3E%3Ccircle cx='600' cy='450' r='260' fill='none' stroke='%231c6a4b' stroke-width='3'/%3E%3Ccircle cx='600' cy='450' r='170' fill='none' stroke='%231c6a4b' stroke-width='2'/%3E%3C/svg%3E";
const mobilePlan = { ...sitePlan, hero: { ...sitePlan.hero, variant: "split", imageUrl: mobileImage, headlineFit: "compact" as const }, responsive: { ...sitePlan.responsive, headlineFit: "compact" as const }, assetMode: "single" as const };
const mobileHtml = renderToStaticMarkup(createElement(CompositionSite, { compositionId: "editorial-studio", brief: mobileBrief, copy: { ...copy, headline: "A deliberately much longer studio headline that must remain readable on a small mobile screen" }, sections, heroImage: mobileImage, useImage: true, accent: "#1c6a4b", narrow: true, previewMode: "mobile", fontStyle: "Clean professional", sitePlan: mobilePlan }));
const exportedMobileHtml = buildCompositionHtml({ compositionId: "editorial-studio", brief: mobileBrief, copy: { ...copy, headline: "A deliberately much longer studio headline that must remain readable on a small mobile screen" }, sections, heroImage: mobileImage, useImage: true, accent: "#1c6a4b", paletteDark: "#17382e", paletteLight: "#f5f2ea", fontStyle: "Clean professional", sitePlan: mobilePlan, bookingUrl: "mailto:hello@example.com", locale: "en-GB" });
export { exportedMobileHtml, mobileHtml };
assert.match(mobileHtml, /<img/);
assert.doesNotMatch(mobileHtml, /Monday 07:30/);
assert.match(mobileHtml, /text-\[2\.8rem\]/);
assert.match(exportedMobileHtml, /data-hero="split"/);
assert.match(exportedMobileHtml, /data:image\/svg\+xml/);
assert.doesNotMatch(exportedMobileHtml, /Monday 07:30/);
assert.match(exportedMobileHtml, /@media\(max-width:600px\).*font-size:2\.8rem/s);
console.log("Editorial Studio preview/export parity checks passed");
