export type LengthMode = "compact" | "standard" | "expanded";
export type AssetMode = "image-light" | "image-led" | "image-rich";
export type ScaleMode = "solo" | "team" | "multi-location";
export type ConversionRoute =
  | "book"
  | "class"
  | "apply"
  | "purchase"
  | "waitlist"
  | "credibility";

export type CompositionId =
  | "guided-personal"
  | "editorial-studio"
  | "digital-momentum"
  | "documentary-performance"
  | "precision-practice"
  | "community-schedule"
  | "private-catalogue"
  | "campaign-launch";

export type SiteBrief = Record<string, unknown> & {
  businessName?: string;
  businessType?: string;
  mainService?: string;
  audience?: string;
  location?: string;
  country?: string;
  deliveryMode?: string;
  businessScale?: string;
  locationCount?: string | number;
  goal?: string;
  bookingLink?: string;
  offer?: string;
  differentiator?: string;
  credentials?: string;
  results?: string;
  testimonialQuote?: string;
  testimonialName?: string;
  process?: string;
  faqQuestion?: string;
  faqAnswer?: string;
  schedule?: string;
  prices?: string;
  programmeStart?: string;
  programmeCapacity?: string;
  sections?: unknown[];
  contentLength?: string;
  imagePreference?: string;
};

export type GeneratorContext = {
  brief: SiteBrief;
  assetCount: number;
  usableImageCount: number;
};

export type Requirement = {
  field?: keyof SiteBrief;
  minimumAssets?: number;
  message: string;
};

export type CompositionDefinition = {
  id: CompositionId;
  name: string;
  description: string;
  visitorJob: string;
  visualGrammar: string;
  preferredFor: RegExp[];
  avoidedFor?: RegExp[];
  supportedRoutes: ConversionRoute[];
  supportedAssets: AssetMode[];
  required: Requirement[];
  recommendedFields: Array<keyof SiteBrief>;
};

export type Direction = {
  id: CompositionId;
  name: string;
  description: string;
  visitorJob: string;
  visualGrammar: string;
  score: number;
  lengthMode: LengthMode;
  assetMode: AssetMode;
  scaleMode: ScaleMode;
  warnings: string[];
};

export type ValidationIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  path?: string;
};

export type Provenance = {
  sourceFields: string[];
  claimType: "offer" | "audience" | "location" | "credential" | "result" | "testimonial" | "price" | "date" | "capacity" | "general";
  verified: boolean;
  exact?: boolean;
};

export type GeneratedSection = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  layout: "editorial" | "split" | "statement";
  highlights: string[];
  provenance?: Provenance;
};

export type GeneratedDraft = {
  copy: {
    headline: string;
    subheadline: string;
    about: string;
    button: string;
  };
  copyProvenance?: Record<string, Provenance>;
  sections: GeneratedSection[];
};

