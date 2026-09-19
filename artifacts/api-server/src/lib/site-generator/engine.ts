import { compositions } from "./catalog";
import type {
  AssetMode,
  ConversionRoute,
  Direction,
  GeneratorContext,
  LengthMode,
  ScaleMode,
  SiteBrief,
} from "./types";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function conversionRoute(brief: SiteBrief): ConversionRoute {
  const value = `${text(brief.goal)} ${text(brief.offer)}`.toLowerCase();
  if (/class|session|space|join/.test(value)) return "class";
  if (/buy|purchase|checkout|sell/.test(value)) return "purchase";
  if (/waitlist|waiting list/.test(value)) return "waitlist";
  if (/apply|application/.test(value)) return "apply";
  if (/credib|portfolio|professional/.test(value)) return "credibility";
  return "book";
}

export function scaleMode(brief: SiteBrief): ScaleMode {
  const count = Number(brief.locationCount || 1);
  const value = `${text(brief.businessScale)} ${text(brief.businessType)}`.toLowerCase();
  if (count > 1 || /multi.?location|multiple locations|branches/.test(value)) return "multi-location";
  if (/team|studio|gym|clinic|practice/.test(value)) return "team";
  return "solo";
}

export function assetMode(context: GeneratorContext): AssetMode {
  const preference = text(context.brief.imagePreference).toLowerCase();
  if (preference.includes("light") || context.usableImageCount === 0) return "image-light";
  if (preference.includes("rich") && context.usableImageCount >= 4) return "image-rich";
  if (context.usableImageCount >= 4) return "image-rich";
  return "image-led";
}

export function lengthMode(brief: SiteBrief): LengthMode {
  const explicit = text(brief.contentLength).toLowerCase();
  if (["compact", "standard", "expanded"].includes(explicit)) return explicit as LengthMode;
  const substantive = [
    brief.offer, brief.differentiator, brief.credentials, brief.results,
    brief.testimonialQuote, brief.process, brief.faqQuestion, brief.faqAnswer,
    brief.schedule, brief.prices,
  ].filter((value) => text(value).length >= 18).length;
  if (substantive <= 2) return "compact";
  if (substantive >= 7) return "expanded";
  return "standard";
}

function unmetRequirements(context: GeneratorContext, index: number) {
  const definition = compositions[index];
  return definition.required.filter((requirement) => {
    if (requirement.minimumAssets !== undefined) return context.usableImageCount < requirement.minimumAssets;
    return requirement.field ? !text(context.brief[requirement.field]) : false;
  });
}

export function analyseDirections(context: GeneratorContext): {
  directions: Direction[];
  globalBlocks: string[];
} {
  const brief = context.brief;
  const route = conversionRoute(brief);
  const assets = assetMode(context);
  const length = lengthMode(brief);
  const scale = scaleMode(brief);
  const haystack = `${text(brief.businessType)} ${text(brief.mainService)} ${text(brief.offer)} ${text(brief.audience)}`;
  const globalBlocks = compositions[0].required
    .filter((item) => item.field && !text(brief[item.field]))
    .map((item) => item.message);

  const ranked = compositions.flatMap((definition, index) => {
    const unmet = unmetRequirements(context, index);
    if (unmet.length || !definition.supportedRoutes.includes(route) || !definition.supportedAssets.includes(assets)) return [];
    let score = 20;
    score += definition.preferredFor.reduce((total, pattern) => total + (pattern.test(haystack) ? 18 : 0), 0);
    score += definition.recommendedFields.reduce((total, field) => total + (text(brief[field]) ? 2 : 0), 0);
    if (definition.id === "guided-personal" && scale === "solo") score += 8;
    if (definition.id === "community-schedule" && route === "class") score += 12;
    if (definition.id === "digital-momentum" && /online|remote/i.test(haystack)) score += 12;
    if (definition.id === "campaign-launch" && ["purchase", "waitlist"].includes(route)) score += 12;
    if (definition.id === "editorial-studio" && assets === "image-rich") score += 6;
    const warnings: string[] = [];
    if (length === "compact") warnings.push("A shorter complete page is recommended from the information supplied.");
    if (scale === "multi-location") warnings.push("The core page can show an overview; dedicated location pages require Extra Pages.");
    if (assets === "image-light") warnings.push("This direction will use typography and layout instead of relying on photography.");
    return [{
      id: definition.id,
      name: definition.name,
      description: definition.description,
      visitorJob: definition.visitorJob,
      visualGrammar: definition.visualGrammar,
      score,
      lengthMode: length,
      assetMode: assets,
      scaleMode: scale,
      warnings,
    } satisfies Direction];
  }).sort((a, b) => b.score - a.score);

  // Keep the three strongest eligible directions. If a very thin brief only
  // supports one or two, the UI explains what is missing rather than showing a
  // knowingly unsuitable design.
  return { directions: ranked.slice(0, 3), globalBlocks };
}

