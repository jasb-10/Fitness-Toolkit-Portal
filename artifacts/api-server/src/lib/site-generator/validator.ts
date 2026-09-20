import type { GeneratedDraft, SiteBrief, ValidationIssue } from "./types";

const forbidden = [
  /lorem ipsum/i,
  /illustrative only/i,
  /a live site would/i,
  /the generator/i,
  /when (?:the )?customer supplies/i,
  /reusable module/i,
  /placeholder/i,
  /insert (?:text|image|copy)/i,
];

const factualClaimPatterns = [
  { type: "price", pattern: /(?:£|\$|€)\s?\d|\d+\s?(?:pounds?|dollars?|euros?)/i, fields: ["prices"] },
  { type: "capacity", pattern: /\b(?:only|limited to|capacity of)\s+\d+|\d+\s+(?:places|spaces|spots)\b/i, fields: ["programmeCapacity", "bannerText"] },
  { type: "result", pattern: /\b\d+\s?%|\b\d+\+?\s+(?:clients?|members?|years?)\b/i, fields: ["results", "credentials"] },
] as const;

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function allText(draft: GeneratedDraft) {
  return [
    draft.copy.headline, draft.copy.subheadline, draft.copy.about, draft.copy.button,
    ...draft.sections.flatMap((section) => [section.eyebrow, section.title, section.body, ...section.highlights]),
  ].join("\n");
}

function suppliedText(brief: SiteBrief, fields: readonly string[]) {
  return fields.map((field) => brief[field]).filter((value): value is string => typeof value === "string").join(" ");
}

function sourceFieldWasSupplied(brief: SiteBrief, field: string) {
  const normalized = field.replace(/^(?:sourceFacts|websiteBrief|businessProfile)\./, "");
  const value = brief[normalized];
  return value !== undefined && value !== null && value !== "";
}

export function validateGeneratedDraft(brief: SiteBrief, draft: GeneratedDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const content = allText(draft);

  for (const pattern of forbidden) {
    if (pattern.test(content)) issues.push({ code: "meta-copy", severity: "error", message: "Generator or placeholder commentary is present in customer copy." });
  }

  if (words(draft.copy.headline) < 3 || words(draft.copy.headline) > 14) {
    issues.push({ code: "headline-length", severity: "warning", message: "The headline should normally contain 3 to 14 words.", path: "copy.headline" });
  }
  if (words(draft.copy.subheadline) < 8) {
    issues.push({ code: "thin-subheadline", severity: "warning", message: "The opening explanation is too thin to establish the offer and audience.", path: "copy.subheadline" });
  }

  const seen = new Set<string>();
  for (const [index, section] of draft.sections.entries()) {
    if (seen.has(section.id)) issues.push({ code: "duplicate-section", severity: "error", message: `The ${section.id} section appears more than once.`, path: `sections.${index}` });
    seen.add(section.id);
    const minimumBodyWords = ["testimonial", "contact", "faq", "results"].includes(section.id) ? 4 : 12;
    if (words(section.title) < 2 || words(section.body) < minimumBodyWords) {
      issues.push({ code: "thin-section", severity: "error", message: `The ${section.id} section does not have enough real content.`, path: `sections.${index}` });
    }
    const missingSourceFields = section.provenance?.sourceFields.filter((field) => !sourceFieldWasSupplied(brief, field)) ?? [];
    if (missingSourceFields.length > 0) {
      issues.push({ code: "missing-source", severity: "error", message: `The ${section.id} section cites unavailable source fields: ${missingSourceFields.join(", ")}.`, path: `sections.${index}.provenance` });
    }
  }

  for (const required of ["services", "about", "contact"]) {
    const selected = Array.isArray(brief.sections) && brief.sections.includes(required);
    if (selected && !seen.has(required)) issues.push({ code: "missing-section", severity: "error", message: `The selected ${required} section is missing.` });
  }

  for (const claim of factualClaimPatterns) {
    const matches = content.match(new RegExp(claim.pattern.source, claim.pattern.flags.includes("g") ? claim.pattern.flags : `${claim.pattern.flags}g`)) || [];
    const source = suppliedText(brief, claim.fields);
    for (const match of matches) {
      const number = match.match(/\d[\d,.]*/)?.[0];
      if (number && !source.includes(number)) {
        issues.push({ code: `unsupported-${claim.type}`, severity: "error", message: `The generated ${claim.type} claim “${match}” is not traceable to the intake.` });
      }
    }
  }

  if (!/^https?:\/\//i.test(String(brief.bookingLink || "")) && !/^(?:mailto:|tel:)/i.test(String(brief.bookingLink || ""))) {
    issues.push({ code: "invalid-destination", severity: "error", message: "Add a valid booking, email or telephone destination." });
  }
  if (draft.sections.length >= 4) {
    const starts = draft.sections.map((section) => section.title.trim().toLowerCase().split(/\s+/).slice(0, 2).join(" "));
    if (new Set(starts).size < starts.length - 1) issues.push({ code: "repetitive-rhythm", severity: "warning", message: "Several section headings begin in the same way." });
  }
  return issues;
}

export function hasBlockingIssues(issues: ValidationIssue[]) {
  return issues.some((issue) => issue.severity === "error");
}

