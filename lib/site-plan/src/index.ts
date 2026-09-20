export const SITE_PLAN_VERSION = 1 as const;

export type ContentMode = "compact" | "standard" | "expanded";
export type AssetMode = "none" | "single" | "multiple";
export type HeadlineFit = "display" | "balanced" | "compact";

export type Provenance = {
  sourceFields: string[];
  claimType: "offer" | "audience" | "location" | "credential" | "result" | "testimonial" | "price" | "date" | "capacity" | "general";
  verified: boolean;
  exact?: boolean;
};

export type SiteModule = {
  id: string;
  purpose: string;
  variant: string;
  visible: boolean;
  eyebrow: string;
  title: string;
  body: string;
  highlights: string[];
  provenance?: Provenance;
};

export type SitePlanV1 = {
  schemaVersion: typeof SITE_PLAN_VERSION;
  familyId: string;
  visitor: {
    audience: string;
    immediateQuestion: string;
  };
  conversion: {
    goal: string;
    destination: string;
    label: string;
  };
  narrative: {
    promise: string;
    orderedModuleIds: string[];
    emphasis: string[];
  };
  contentMode: ContentMode;
  assetMode: AssetMode;
  visual: {
    paletteId: string;
    accent: string;
    fontStyle: string;
    surface: string;
  };
  hero: {
    variant: string;
    headline: string;
    subheadline: string;
    headlineFit: HeadlineFit;
    imageUrl: string;
  };
  assets?: {
    images: Array<{
      url: string;
      role: "hero" | "story" | "gallery";
      alt: string;
    }>;
  };
  modules: SiteModule[];
  responsive: {
    headlineFit: HeadlineFit;
    compactNavigation: boolean;
  };
};

export type FamilyDefinition = {
  id: string;
  name: string;
  supportedContentModes: ContentMode[];
  supportedAssetModes: AssetMode[];
  heroVariants: string[];
  moduleVariants: Record<string, string[]>;
};

export type ModuleDefinition = {
  id: string;
  purpose: string;
  requiresEvidence?: string[];
  optional: boolean;
};

export const moduleRegistry: Record<string, ModuleDefinition> = {
  services: { id: "services", purpose: "Explain the services and who each one is for.", requiresEvidence: ["services"], optional: false },
  approach: { id: "approach", purpose: "Make the route from interest to attendance feel clear.", optional: true },
  about: { id: "about", purpose: "Build trust in the coach, team, or studio.", requiresEvidence: ["about"], optional: true },
  schedule: { id: "schedule", purpose: "Show evidenced session times or timetable information.", requiresEvidence: ["schedule"], optional: true },
  results: { id: "results", purpose: "Show credible proof without inventing claims.", requiresEvidence: ["results"], optional: true },
  testimonial: { id: "testimonial", purpose: "Use supplied client words as social proof.", requiresEvidence: ["testimonialQuote"], optional: true },
  faq: { id: "faq", purpose: "Resolve the questions most likely to block conversion.", requiresEvidence: ["faq"], optional: true },
  contact: { id: "contact", purpose: "Give the visitor one clear next action.", optional: false },
};

export const editorialStudioFamily: FamilyDefinition = {
  id: "editorial-studio",
  name: "Editorial Studio",
  supportedContentModes: ["compact", "standard", "expanded"],
  supportedAssetModes: ["none", "single", "multiple"],
  heroVariants: ["typographic", "split", "immersive"],
  moduleVariants: {
    services: ["editorial-grid", "stacked-programmes"],
    approach: ["numbered-journey", "quiet-steps"],
    about: ["portrait-story", "text-led-story"],
    schedule: ["studio-timetable", "appointment-led"],
    results: ["proof-strip", "editorial-proof"],
    testimonial: ["single-quote", "quote-pair"],
    faq: ["accordion", "editorial-list"],
    contact: ["booking-panel", "minimal-enquiry"],
  },
};

export const digitalMomentumFamily: FamilyDefinition = {
  id: "digital-momentum",
  name: "Digital Momentum",
  supportedContentModes: ["compact", "standard", "expanded"],
  supportedAssetModes: ["none", "single", "multiple"],
  heroVariants: ["track", "dashboard", "image-signal"],
  moduleVariants: {
    services: ["programme-statement", "benefit-strip"],
    approach: ["numbered-route", "coaching-steps"],
    about: ["coach-mark", "coach-image"],
    schedule: ["training-week", "session-list"],
    results: ["signal-proof", "evidence-list"],
    testimonial: ["kinetic-quote"],
    faq: ["question-panel"],
    contact: ["signal-close"],
  },
};

export const documentaryPerformanceFamily: FamilyDefinition = {
  id: "documentary-performance",
  name: "Documentary Performance",
  supportedContentModes: ["compact", "standard", "expanded"],
  supportedAssetModes: ["single", "multiple"],
  heroVariants: ["dossier", "full-bleed", "sequence"],
  moduleVariants: {
    services: ["service-dossier", "route-ledger"], approach: ["training-sequence", "method-record"],
    about: ["coach-notes", "field-profile"], schedule: ["recorded-schedule"], results: ["proof-ledger", "evidence-grid"],
    testimonial: ["client-record"], faq: ["direct-answer"], contact: ["dark-close"],
  },
};

export const precisionPracticeFamily: FamilyDefinition = {
  id: "precision-practice",
  name: "Precision Practice",
  supportedContentModes: ["compact", "standard", "expanded"],
  supportedAssetModes: ["none", "single", "multiple"],
  heroVariants: ["assessment", "practitioner", "pathway"],
  moduleVariants: {
    services: ["care-routes", "service-record"], approach: ["assessment-pathway", "care-sequence"],
    about: ["practice-profile", "practitioner-story"], schedule: ["appointment-routes"], results: ["professional-evidence", "outcome-record"],
    testimonial: ["client-words"], faq: ["booking-answer"], contact: ["calm-next-step"],
  },
};

export const familyRegistry: Record<string, FamilyDefinition> = {
  [editorialStudioFamily.id]: editorialStudioFamily,
  [digitalMomentumFamily.id]: digitalMomentumFamily,
  [documentaryPerformanceFamily.id]: documentaryPerformanceFamily,
  [precisionPracticeFamily.id]: precisionPracticeFamily,
};

export function defineFamily(definition: FamilyDefinition): FamilyDefinition {
  if (!definition.id.trim() || !definition.heroVariants.length) {
    throw new Error("A family needs an id and at least one hero variant.");
  }
  return definition;
}

type LegacyCopy = { headline?: unknown; subheadline?: unknown; about?: unknown; button?: unknown };
type LegacySection = {
  id?: unknown; eyebrow?: unknown; title?: unknown; body?: unknown; layout?: unknown;
  highlights?: unknown; provenance?: unknown;
};

export type LegacyProjectInput = {
  briefData?: Record<string, unknown> | null;
  styleData?: Record<string, unknown> | null;
  sections?: Array<Record<string, unknown>> | null;
};

const string = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export function headlineFitFor(headline: string): HeadlineFit {
  const length = headline.trim().length;
  if (length > 72) return "compact";
  if (length > 42) return "balanced";
  return "display";
}

export function isSitePlanV1(value: unknown): value is SitePlanV1 {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<SitePlanV1>;
  return plan.schemaVersion === SITE_PLAN_VERSION
    && typeof plan.familyId === "string"
    && Boolean(plan.hero && typeof plan.hero.headline === "string")
    && Array.isArray(plan.modules);
}

export function adaptLegacyProject(input: LegacyProjectInput): SitePlanV1 {
  const brief = input.briefData ?? {};
  const style = input.styleData ?? {};
  if (isSitePlanV1(style.sitePlan)) return style.sitePlan;
  const copy = (style.copy ?? {}) as LegacyCopy;
  const headline = string(copy.headline, "A website shaped around your business");
  const legacyAssetMode = string(style.assetMode);
  const imageUrl = string(style.heroImage);
  const imageUrls = strings(style.imageUrls);
  const sections = (input.sections ?? []) as LegacySection[];
  const modules: SiteModule[] = sections.flatMap((section) => {
    const id = string(section.id);
    if (!id) return [];
    return [{
      id,
      purpose: id,
      variant: string(section.layout, "editorial"),
      visible: true,
      eyebrow: string(section.eyebrow),
      title: string(section.title),
      body: string(section.body),
      highlights: strings(section.highlights),
      provenance: section.provenance as Provenance | undefined,
    }];
  });
  const legacyLength = string(style.lengthMode).toLowerCase();
  const contentMode: ContentMode = legacyLength === "compact" || legacyLength === "expanded" ? legacyLength : "standard";
  const assetMode: AssetMode = legacyAssetMode === "image-rich" ? "multiple" : legacyAssetMode === "image-led" || imageUrl.startsWith("/api/storage/") ? "single" : "none";
  const fit = headlineFitFor(headline);
  return {
    schemaVersion: SITE_PLAN_VERSION,
    familyId: string(style.compositionId, "guided-personal"),
    visitor: {
      audience: string(brief.audience),
      immediateQuestion: "Is this the right service and what should I do next?",
    },
    conversion: {
      goal: string(brief.goal, "Enquire"),
      destination: string(brief.bookingLink),
      label: string(copy.button, string(brief.goal, "Enquire")),
    },
    narrative: {
      promise: string(copy.subheadline),
      orderedModuleIds: modules.map((module) => module.id),
      emphasis: [],
    },
    contentMode,
    assetMode,
    visual: {
      paletteId: string(style.paletteId, "signal"),
      accent: string(style.brandColour, "#ef162f"),
      fontStyle: string(style.fontStyle, "Strong & modern"),
      surface: string(style.surface, "Mostly dark"),
    },
    hero: {
      variant: string(style.heroVariant, "split"),
      headline,
      subheadline: string(copy.subheadline),
      headlineFit: fit,
      imageUrl,
    },
    assets: {
      images: [...new Set([imageUrl, ...imageUrls].filter(Boolean))].map((url, index) => ({
        url,
        role: index === 0 ? "hero" as const : index === 1 ? "story" as const : "gallery" as const,
        alt: string(brief.businessName, "Business") + (index === 0 ? " hero image" : " studio image"),
      })),
    },
    modules,
    responsive: { headlineFit: fit, compactNavigation: true },
  };
}
