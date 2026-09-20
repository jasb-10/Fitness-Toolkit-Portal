import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  useListWebsiteProjects,
  useCreateWebsiteProject,
  useUpdateWebsiteProject,
  getListWebsiteProjectsQueryKey,
  useRequestUploadUrl,
  useRegisterProjectAsset,
  useGenerateWebsiteProject,
  useRefineWebsiteProject,
} from "@workspace/api-client-react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Download,
  Eye,
  FileArchive,
  FileText,
  Globe2,
  Home,
  Image as ImageIcon,
  Laptop,
  LayoutTemplate,
  Link2,
  Lock,
  LogOut,
  Menu,
  Monitor,
  Palette,
  Pencil,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { basePath, cn } from "@/lib/utils";
import { buildGuidedPersonalHtml, GuidedPersonalSite } from "@/components/website/GuidedPersonalSite";
import { buildCompositionHtml, CompositionSite } from "@/components/website/CompositionSites";
import { adaptLegacyProject, headlineFitFor, isSitePlanV1, type SitePlanV1 } from "@workspace/site-plan";

type Stage = "home" | "brief" | "content" | "style" | "direction" | "building" | "editor" | "delivery";
type StyleMode = "recommend" | "choose" | "brand";
type PreviewSize = "desktop" | "tablet" | "mobile";
type EditablePart = "headline" | "subheadline" | "about" | "button";
type DirectionOption = {
  id: string;
  name: string;
  description: string;
  visitorJob: string;
  visualGrammar: string;
  lengthMode: "compact" | "standard" | "expanded";
  assetMode: "image-light" | "image-led" | "image-rich";
  scaleMode: "solo" | "team" | "multi-location";
  warnings: string[];
};

type Brief = {
  businessName: string;
  businessType: string;
  mainService: string;
  audience: string;
  primaryProblem: string;
  desiredOutcome: string;
  location: string;
  country: string;
  deliveryMode: string;
  businessScale: string;
  locationCount: string;
  goal: string;
  context: string;
  bookingLink: string;
  banner: boolean;
  bannerText: string;
  offer: string;
  differentiator: string;
  serviceDetails: string;
  objections: string;
  voiceStyle: string;
  voiceExamples: string;
  wordsToAvoid: string;
  credentials: string;
  results: string;
  testimonialQuote: string;
  testimonialName: string;
  process: string;
  faqQuestion: string;
  faqAnswer: string;
  schedule: string;
  prices: string;
  programmeStart: string;
  programmeCapacity: string;
  contentLength: string;
  imagePreference: string;
  sections: string[];
};

type SiteCopy = {
  headline: string;
  subheadline: string;
  about: string;
  button: string;
};
type GeneratedSection = {
  id: string;
  eyebrow?: string;
  title: string;
  body: string;
  layout?: "editorial" | "split" | "statement";
  highlights?: string[];
};

type PaletteChoice = {
  id: string;
  name: string;
  description: string;
  accent: string;
  dark: string;
  light: string;
};

const palettes: PaletteChoice[] = [
  { id: "signal", name: "Signal Red", description: "Bold, modern, confident", accent: "#ef162f", dark: "#101113", light: "#f7f7f5" },
  { id: "sand", name: "Elevated Neutral", description: "Premium, timeless, versatile", accent: "#a57c50", dark: "#171513", light: "#f3eee7" },
  { id: "forest", name: "Natural Strength", description: "Grounded, healthy, focused", accent: "#1c6a4b", dark: "#10251c", light: "#edf3ef" },
  { id: "ocean", name: "Ocean Fresh", description: "Clean, modern, energising", accent: "#1769aa", dark: "#10243a", light: "#edf5fa" },
];

const designLooks = [
  { id: "signal", name: "Bold performance", note: "High contrast, decisive type and a strong first impression.", font: "Strong & modern", category: "Training · strength · boxing" },
  { id: "sand", name: "Editorial calm", note: "Warm neutrals, generous space and refined typography.", font: "Premium editorial", category: "Wellness · yoga · Pilates" },
  { id: "forest", name: "Natural studio", note: "Grounded colour, approachable structure and a human feel.", font: "Premium editorial", category: "Studios · movement · holistic health" },
  { id: "ocean", name: "Modern clarity", note: "Crisp, spacious and easy to navigate on any screen.", font: "Clean professional", category: "Coaching · online programmes" },
];

function suggestedLook(type: string) {
  if (/yoga|pilates/i.test(type)) return "sand";
  if (/studio|group/i.test(type)) return "forest";
  if (/online/i.test(type)) return "ocean";
  return "signal";
}

const buildStages = [
  ["Organising your approved brief", "Preparing the services, audience, location and objective you supplied."],
  ["Applying your design direction", "Using your selected colours, typography and visual preferences."],
  ["Composing the editable draft", "Arranging the selected sections and supplied evidence into a first version."],
  ["Preparing your preview", "Making the draft available for your review and manual edits."],
];

const pageSections = [
  { id: "services", name: "Services", purpose: "Show exactly what customers can buy or book." },
  { id: "approach", name: "How it works", purpose: "Make the first steps feel simple." },
  { id: "about", name: "About the coach or studio", purpose: "Put a real person and method behind the offer." },
  { id: "schedule", name: "Schedule or timetable", purpose: "Show supplied session times when customers need to plan a visit." },
  { id: "results", name: "Results and credibility", purpose: "Add genuine results or qualifications." },
  { id: "testimonial", name: "Client testimonial", purpose: "Use a real quote, never an invented review." },
  { id: "faq", name: "Frequently asked questions", purpose: "Answer the concern that stops people enquiring." },
  { id: "contact", name: "Final booking section", purpose: "Give visitors a clear next step." },
];

const initialBrief: Brief = {
  businessName: "",
  businessType: "Personal trainer",
  mainService: "",
  audience: "",
  primaryProblem: "",
  desiredOutcome: "",
  location: "",
  country: "United Kingdom",
  deliveryMode: "In person",
  businessScale: "Solo operator",
  locationCount: "1",
  goal: "Book a consultation",
  context: "",
  bookingLink: "",
  banner: false,
  bannerText: "",
  offer: "",
  differentiator: "",
  serviceDetails: "",
  objections: "",
  voiceStyle: "Warm and professional",
  voiceExamples: "",
  wordsToAvoid: "",
  credentials: "",
  results: "",
  testimonialQuote: "",
  testimonialName: "",
  process: "",
  faqQuestion: "",
  faqAnswer: "",
  schedule: "",
  prices: "",
  programmeStart: "",
  programmeCapacity: "",
  contentLength: "Auto",
  imagePreference: "Auto",
  sections: ["services", "about", "contact"],
};

const defaultCopy: SiteCopy = {
  headline: "Build strength that lasts",
  subheadline: "Personal coaching, a clear plan and support that fits real life.",
  about: "Build strength, confidence and consistency with coaching shaped around your experience, schedule and goals.",
  button: "Book a consultation",
};

function currentSitePlan(base: SitePlanV1, brief: Brief, copy: SiteCopy, sections: GeneratedSection[], compositionId: string, palette: PaletteChoice, fontStyle: string, surface: string, heroImage: string, imageUrls: string[], ownPhoto: boolean): SitePlanV1 {
  const priorModules = new Map(base.modules.map((module) => [module.id, module]));
  const modules = sections.map((section) => ({
    id: section.id,
    purpose: priorModules.get(section.id)?.purpose || section.id,
    variant: section.layout || priorModules.get(section.id)?.variant || "editorial",
    visible: true,
    eyebrow: section.eyebrow || "",
    title: section.title,
    body: section.id === "about" ? copy.about : section.body,
    highlights: section.highlights || [],
    provenance: priorModules.get(section.id)?.provenance,
  }));
  if (brief.schedule && brief.sections.includes("schedule") && !modules.some((module) => module.id === "schedule")) {
    modules.push({ id: "schedule", purpose: "Help visitors find a suitable session.", variant: "studio-timetable", visible: true, eyebrow: "Plan your week", title: "Find your next session.", body: brief.schedule, highlights: [], provenance: undefined });
  }
  const requestedLength = brief.contentLength.toLowerCase();
  const contentMode = requestedLength === "compact" || requestedLength === "expanded" ? requestedLength : base.contentMode;
  return {
    ...base,
    familyId: compositionId,
    visitor: { ...base.visitor, audience: brief.audience },
    conversion: { goal: brief.goal, destination: brief.bookingLink, label: copy.button },
    narrative: { ...base.narrative, promise: copy.subheadline, orderedModuleIds: modules.map((module) => module.id) },
    contentMode,
    assetMode: ownPhoto ? imageUrls.length > 1 ? "multiple" : "single" : "none",
    visual: { paletteId: palette.id, accent: palette.accent, fontStyle, surface },
    hero: { ...base.hero, headline: copy.headline, subheadline: copy.subheadline, headlineFit: headlineFitFor(copy.headline), imageUrl: ownPhoto ? heroImage : "" },
    assets: {
      images: ownPhoto ? [...new Set([heroImage, ...imageUrls].filter(Boolean))].map((url, index) => ({ url, role: index === 0 ? "hero" as const : index === 1 ? "story" as const : "gallery" as const, alt: `${brief.businessName || "Business"}${index === 0 ? " hero image" : " studio image"}` })) : [],
    },
    modules,
    responsive: { ...base.responsive, headlineFit: headlineFitFor(copy.headline) },
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char] || char);
}

function safeLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (["http:", "https:"].includes(url.protocol) && url.hostname) return trimmed;
    if (url.protocol === "mailto:" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(url.pathname)) return trimmed;
    if (url.protocol === "tel:" && /^\+?[0-9 ()-]{7,}$/.test(url.pathname)) return trimmed;
    return "";
  } catch {
    return "";
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid image data"));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

function withoutOuterQuotes(value: string) {
  return value.trim().replace(/^[“"']+|[”"']+$/g, "");
}

function offerLabel(businessType: string) {
  return /yoga|pilates|group fitness/i.test(businessType) ? "Classes" : "Services";
}

function sectionEyebrow(id: string, value: string, businessType: string) {
  if (id === "services" && /^the coaching$/i.test(value.trim()) && offerLabel(businessType) === "Classes") return "The classes";
  return value;
}

export default function WebsitePrototypePage({ accountName, accountEmail, accountRole, onSignOut }: { accountName?: string; accountEmail?: string; accountRole?: string | null; onSignOut?: () => void }) {
  const { userId, getToken } = useAuth();
  const resetRequested = new URLSearchParams(window.location.search).get("reset") === "1";
  const [stage, setStage] = useState<Stage>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [brief, setBrief] = useState<Brief>(initialBrief);
  const [styleMode, setStyleMode] = useState<StyleMode>("recommend");
  const [moods, setMoods] = useState<string[]>(["Bold", "Premium"]);
  const [paletteId, setPaletteId] = useState(() => suggestedLook(initialBrief.businessType));
  const [fontStyle, setFontStyle] = useState(() => designLooks.find((look) => look.id === suggestedLook(initialBrief.businessType))?.font || "Strong & modern");
  const [surface, setSurface] = useState("Mostly dark");
  const [direction, setDirection] = useState(0);
  const [compositionId, setCompositionId] = useState("guided-personal");
  const [directionOptions, setDirectionOptions] = useState<DirectionOption[]>([]);
  const [directionBlocks, setDirectionBlocks] = useState<string[]>([]);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsLoaded, setDirectionsLoaded] = useState(false);
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [copy, setCopy] = useState<SiteCopy>(defaultCopy);
  const [generatedSections, setGeneratedSections] = useState<GeneratedSection[]>([]);
  const [sitePlan, setSitePlan] = useState<SitePlanV1>(() => adaptLegacyProject({}));
  const [selectedPart, setSelectedPart] = useState<EditablePart>("headline");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiChanges, setAiChanges] = useState(5);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [buildIndex, setBuildIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState("https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1800&q=85");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [ownPhoto, setOwnPhoto] = useState(false);
  const [savedLabel, setSavedLabel] = useState("Loading your project...");
  const [showLocked, setShowLocked] = useState<string | null>(null);
  const [brandColour, setBrandColour] = useState("#ef162f");
  const uploadRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  
  const isAuthenticated = Boolean(userId);
  const unlimitedAi = ["owner", "super_admin", "staff", "admin", "team"].includes(accountRole || "");
  const qc = useQueryClient();
  const projectsQuery = useListWebsiteProjects({ query: { enabled: isAuthenticated, queryKey: getListWebsiteProjectsQueryKey() } });
  const createProject = useCreateWebsiteProject();
  const updateProject = useUpdateWebsiteProject();
  const requestUrl = useRequestUploadUrl();
  const registerAsset = useRegisterProjectAsset();
  const generateProject = useGenerateWebsiteProject();
  const refineProject = useRefineWebsiteProject();

  const [projectId, setProjectId] = useState<string | null>(null);
  const initRef = useRef(false);
  const hydratingProjectRef = useRef(false);
  const recoveringBuildRef = useRef(false);
  const lastSavedStr = useRef("");
  const persistedStyleRef = useRef<Record<string, unknown>>({});

  const openProject = useCallback((p: NonNullable<typeof projectsQuery.data>[number]) => {
    const projectBrief = { ...initialBrief, ...(p.briefData || {}) } as Brief;
    const style = (p.styleData || {}) as Record<string, unknown>;
    const projectStage = (p.currentStage || "brief") as Stage;
    const nextPalette = (style.paletteId as string) || suggestedLook(projectBrief.businessType);
    const nextFontStyle = (style.fontStyle as string) || designLooks.find((look) => look.id === nextPalette)?.font || "Strong & modern";
    const nextHeroImage = typeof style.heroImage === "string" && style.heroImage
      ? style.heroImage
      : "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1800&q=85";
    const nextImageUrls = Array.isArray(style.imageUrls) ? style.imageUrls.filter((value): value is string => typeof value === "string") : nextHeroImage.startsWith("/api/storage/") ? [nextHeroImage] : [];
    const nextCopy = (style.copy as SiteCopy) || defaultCopy;
    const nextSections = Array.isArray(p.sections) ? p.sections as GeneratedSection[] : [];
    const nextSitePlan = adaptLegacyProject({ briefData: p.briefData as Record<string, unknown>, styleData: style, sections: p.sections as Array<Record<string, unknown>> });
    persistedStyleRef.current = style;
    hydratingProjectRef.current = true;
    setProjectId(p.id);
    setBrief(projectBrief);
    setStage(projectStage);
    setAiChanges(unlimitedAi ? 99 : Math.max(0, 5 - Number((p as { refinementAttempts?: number }).refinementAttempts || 0)));
    setGenerationAttempts(Number((p as { generationAttempts?: number }).generationAttempts || 0));
    setStyleMode((style.styleMode as StyleMode) || "recommend");
    setPaletteId(nextPalette);
    setFontStyle(nextFontStyle);
    setSurface((style.surface as string) || "Mostly dark");
    setDirection(Number(style.direction || 0));
    setCompositionId((style.compositionId as string) || "guided-personal");
    setBrandColour((style.brandColour as string) || "#ef162f");
    setCopy(nextCopy);
    setGeneratedSections(nextSections);
    setSitePlan(nextSitePlan);
    setHeroImage(nextHeroImage);
    setImageUrls(nextImageUrls);
    setOwnPhoto(nextHeroImage.startsWith("/api/storage/"));
    if (p.currentStage === "building") recoveringBuildRef.current = true;
    lastSavedStr.current = JSON.stringify({
      stage: projectStage,
      brief: projectBrief,
      styleMode: (style.styleMode as StyleMode) || "recommend",
      copy: nextCopy,
      paletteId: nextPalette,
      fontStyle: nextFontStyle,
      surface: (style.surface as string) || "Mostly dark",
      direction: Number(style.direction || 0),
      compositionId: (style.compositionId as string) || "guided-personal",
      heroImage: nextHeroImage,
      imageUrls: nextImageUrls,
      brandColour: (style.brandColour as string) || "#ef162f",
      generatedSections: nextSections,
    });
    setSavedLabel("Saved");
  }, [unlimitedAi]);

  useEffect(() => {
    if (!isAuthenticated || !projectsQuery.data || initRef.current) return;
    initRef.current = true;
    if (projectsQuery.data.length > 0) {
      const p = projectsQuery.data[0];
      openProject(p);
    } else {
      createProject.mutate({
        data: {
          name: "My Website",
          briefData: brief as any,
        }
      }, {
        onSuccess: (newP) => {
          openProject(newP);
          qc.invalidateQueries({ queryKey: getListWebsiteProjectsQueryKey() });
        },
        onError: () => setSavedLabel("Could not prepare your website project. Please retry."),
      });
    }
  }, [isAuthenticated, projectsQuery.data, openProject]);

  useEffect(() => {
    const current = projectsQuery.data?.find((project) => project.id === projectId);
    if (!current) return;
    setGenerationAttempts(Number((current as { generationAttempts?: number }).generationAttempts || 0));
    setAiChanges(unlimitedAi ? 99 : Math.max(0, 5 - Number((current as { refinementAttempts?: number }).refinementAttempts || 0)));
  }, [projectsQuery.data, projectId, unlimitedAi]);

  useEffect(() => {
    if (stage !== "building" || !recoveringBuildRef.current || !projectId) return;
    const startedWaiting = Date.now();
    const checkResult = () => {
      const current = qc.getQueryData<typeof projectsQuery.data>(getListWebsiteProjectsQueryKey())?.find((project) => project.id === projectId);
      if (!current) return;
      if (current.status === "generating") {
        if (Date.now() - startedWaiting < 120_000) return;
        setSavedLabel("This is taking longer than expected. Your previous draft is safe; return later or contact support.");
      } else if (current.currentStage === "building" && Date.now() - startedWaiting < 10_000) {
        return;
      }
      recoveringBuildRef.current = false;
      if (Array.isArray(current.sections)) setGeneratedSections(current.sections as GeneratedSection[]);
      const savedCopy = (current.styleData as { copy?: SiteCopy } | null)?.copy;
      if (savedCopy) setCopy(savedCopy);
      setStage(Array.isArray(current.sections) && current.sections.length > 0 ? "editor" : "direction");
    };
    const timer = window.setInterval(() => {
      void qc.invalidateQueries({ queryKey: getListWebsiteProjectsQueryKey() }).then(checkResult);
    }, 3000);
    checkResult();
    return () => window.clearInterval(timer);
  }, [stage, projectId, qc]);

  const palette = useMemo(() => {
    if (styleMode === "brand") return { ...palettes[0], id: "brand", name: "Your Brand", accent: brandColour };
    if (styleMode === "recommend") return palettes.find((item) => item.id === paletteId) || palettes[0];
    return palettes.find((item) => item.id === paletteId) || palettes[0];
  }, [paletteId, styleMode, brandColour, brief.businessType]);
  const liveSitePlan = useMemo(() => currentSitePlan(sitePlan, brief, copy, generatedSections, compositionId, palette, fontStyle, surface, heroImage, imageUrls, ownPhoto), [sitePlan, brief, copy, generatedSections, compositionId, palette, fontStyle, surface, heroImage, imageUrls, ownPhoto]);

  useEffect(() => {
    if (resetRequested) window.history.replaceState({}, "", window.location.pathname);
  }, [resetRequested]);

  const saveTimeout = useRef<number | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (hydratingProjectRef.current) {
      hydratingProjectRef.current = false;
      return;
    }
    if (stage === "building") return;
    if (!isAuthenticated || !projectId || !initRef.current) {
      setSavedLabel("Preparing your account...");
      return;
    }

    const stateToSave = JSON.stringify({ stage, brief, styleMode, copy, paletteId, fontStyle, surface, direction, compositionId, heroImage, imageUrls, brandColour, generatedSections });
    if (stateToSave === lastSavedStr.current) return;
    setSavedLabel("Saving...");
    saveTimeout.current = window.setTimeout(() => {
      saveTimeout.current = null;
      saveQueue.current = saveQueue.current.then(async () => {
        const updated = await updateProject.mutateAsync({
          projectId,
          data: {
            currentStage: stage,
            briefData: brief as any,
            styleData: { ...persistedStyleRef.current, styleMode, paletteId, fontStyle, surface, direction, compositionId, heroImage, imageUrls, assetMode: liveSitePlan.assetMode === "none" ? "image-light" : liveSitePlan.assetMode === "multiple" ? "image-rich" : "image-led", brandColour, copy, sitePlan: liveSitePlan },
            sections: generatedSections as any,
          },
        });
        if (updated.id !== projectId) throw new Error("The server confirmed a different project");
        persistedStyleRef.current = (updated.styleData || {}) as Record<string, unknown>;
        lastSavedStr.current = stateToSave;
        qc.setQueryData(getListWebsiteProjectsQueryKey(), (current: typeof projectsQuery.data) =>
          current?.map((item) => item.id === updated.id ? updated : item)
        );
        setSavedLabel("Saved");
      }).catch(() => { setSavedLabel("Save failed — please retry"); });
    }, 1000);
    return () => {
      if (saveTimeout.current !== null) window.clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    };
  }, [stage, brief, styleMode, copy, paletteId, fontStyle, surface, direction, compositionId, heroImage, imageUrls, brandColour, generatedSections, liveSitePlan, isAuthenticated, projectId, resetRequested, userId]);

  const loadEligibleDirections = useCallback(async (id = projectId) => {
    if (!id) return;
    setDirectionsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${basePath}/api/website-projects/${id}/directions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not prepare design directions");
      const options = Array.isArray(data.directions) ? data.directions as DirectionOption[] : [];
      setDirectionOptions(options);
      setDirectionBlocks(Array.isArray(data.globalBlocks) ? data.globalBlocks : []);
      if (options.length && !options.some((option) => option.id === compositionId)) setCompositionId(options[0].id);
    } catch (error) {
      console.error("Direction analysis failed", error);
      setDirectionBlocks([error instanceof Error ? error.message : "Could not prepare design directions"]);
    } finally {
      setDirectionsLoading(false);
      setDirectionsLoaded(true);
    }
  }, [projectId, getToken, compositionId]);

  const continueToDirections = useCallback(async () => {
    if (!projectId) return;
    setSavedLabel("Checking which designs fit...");
    if (saveTimeout.current !== null) window.clearTimeout(saveTimeout.current);
    saveTimeout.current = null;
    try {
      await saveQueue.current;
      const updated = await updateProject.mutateAsync({
        projectId,
        data: {
          currentStage: "direction",
          briefData: brief as any,
          styleData: { ...persistedStyleRef.current, styleMode, paletteId, fontStyle, surface, direction, compositionId, heroImage, imageUrls, brandColour, copy },
          sections: generatedSections as any,
        },
      });
      if (updated.id !== projectId) throw new Error("The server confirmed a different project");
      persistedStyleRef.current = (updated.styleData || {}) as Record<string, unknown>;
      const confirmedState = JSON.stringify({ stage: "direction", brief, styleMode, copy, paletteId, fontStyle, surface, direction, compositionId, heroImage, imageUrls, brandColour, generatedSections });
      lastSavedStr.current = confirmedState;
      qc.setQueryData(getListWebsiteProjectsQueryKey(), (current: typeof projectsQuery.data) =>
        current?.map((item) => item.id === updated.id ? updated : item)
      );
      setStage("direction");
      await loadEligibleDirections(projectId);
      setSavedLabel("Saved");
    } catch (error) {
      console.error("Could not save the website direction", error);
      setSavedLabel("Save failed — your previous project data is unchanged");
    }
  }, [projectId, updateProject, brief, styleMode, paletteId, fontStyle, surface, direction, compositionId, heroImage, imageUrls, brandColour, copy, generatedSections, loadEligibleDirections, qc, projectsQuery.data]);

  useEffect(() => {
    if (stage === "direction" && projectId && !directionsLoaded && !directionsLoading) void loadEligibleDirections(projectId);
  }, [stage, projectId, directionsLoaded, directionsLoading, loadEligibleDirections]);

  useEffect(() => {
    if (stage !== "building") return;
    setBuildIndex(0);
    const timer = window.setInterval(() => {
      setBuildIndex((current) => Math.min(current + 1, buildStages.length - 1));
    }, 1400);
    return () => window.clearInterval(timer);
  }, [stage]);

  const beginBuild = async () => {
    if (!unlimitedAi && generationAttempts >= 2) {
      setSavedLabel("Your two included drafts have been used. You can still edit your current page.");
      return;
    }
    const previousCopy = copy;
    const hadDraft = generatedSections.length > 0;
    const business = brief.businessName || "Your business";
    const service = brief.mainService || "personal coaching";
    const audience = brief.audience || "people who want lasting progress";
    const fallbackCopy = {
      headline: direction === 1 ? `${business}, built around you` : direction === 2 ? `Move with purpose at ${business}` : `${service} for ${audience}`,
      subheadline: `${brief.offer || service} for ${audience}${brief.location ? ` in ${brief.location}` : ""}.`,
      about: brief.differentiator || `At ${business}, your experience, schedule and goals shape the way we work together.`,
      button: brief.goal || "Book a consultation",
    };
    if (!isAuthenticated || !projectId) {
      setSavedLabel("Your account is still loading. Please try again in a moment.");
      return;
    }
    if (saveTimeout.current !== null) window.clearTimeout(saveTimeout.current);
    saveTimeout.current = null;
    setStage("building");
    setCopy(fallbackCopy);
    try {
      setSavedLabel("Saving your brief...");
      await saveQueue.current;
      await updateProject.mutateAsync({
        projectId,
        data: {
          currentStage: "building",
          briefData: brief as any,
          styleData: {
            ...persistedStyleRef.current, styleMode, paletteId, fontStyle, surface, direction, compositionId, heroImage, imageUrls, brandColour, copy: previousCopy,
          },
          sections: generatedSections as any,
        },
      });
      const generated = await generateProject.mutateAsync({ projectId });
      setGenerationAttempts(Number((generated as { generationAttempts?: number }).generationAttempts || generationAttempts + 1));
      const generatedCopy = (generated.styleData as { copy?: SiteCopy } | null)?.copy;
      persistedStyleRef.current = (generated.styleData || {}) as Record<string, unknown>;
      setSitePlan(adaptLegacyProject({ briefData: generated.briefData as Record<string, unknown>, styleData: generated.styleData as Record<string, unknown>, sections: generated.sections as Array<Record<string, unknown>> }));
      if (generatedCopy) setCopy(generatedCopy);
      if (Array.isArray(generated.sections)) setGeneratedSections(generated.sections as GeneratedSection[]);
      setSavedLabel("Generated and saved");
      qc.setQueryData(getListWebsiteProjectsQueryKey(), (current: typeof projectsQuery.data) =>
        current?.map((item) => item.id === generated.id ? generated : item)
      );
      setStage("editor");
    } catch (error) {
      setCopy(previousCopy);
      const diagnosticReason = error && typeof error === "object" && "data" in error
        ? (error as { data?: { diagnosticReason?: string } }).data?.diagnosticReason
        : undefined;
      setSavedLabel(diagnosticReason
        ? `Generation failed: ${diagnosticReason}`
        : hadDraft
          ? "New draft failed — your previous draft is still available"
          : "Generation failed — please try again");
      setStage(hadDraft ? "editor" : "direction");
      void qc.invalidateQueries({ queryKey: getListWebsiteProjectsQueryKey() });
    }
  };

  const startFreshWebsite = async () => {
    if (!isAuthenticated) return;
    setSavedLabel("Preparing a new website...");
    if (saveTimeout.current !== null) window.clearTimeout(saveTimeout.current);
    saveTimeout.current = null;
    await saveQueue.current;
    try {
      const project = await createProject.mutateAsync({
        data: {
          name: "My Website",
          startFresh: true,
          seedFromProfile: true,
        },
      });
      openProject(project);
      setStage("brief");
      setDirectionsLoaded(false);
      setDirectionOptions([]);
      setDirectionBlocks([]);
      setUploadedFiles([]);
      await qc.invalidateQueries({ queryKey: getListWebsiteProjectsQueryKey() });
      setSavedLabel("New website ready");
    } catch {
      setSavedLabel("Could not start a new website. Your existing website is unchanged.");
    }
  };

  const updateCopy = (part: EditablePart, value: string) => setCopy((current) => ({ ...current, [part]: value }));
  const updateSection = (id: string, key: "eyebrow" | "title" | "body", value: string) =>
    setGeneratedSections((current) => current.map((section) => section.id === id ? { ...section, [key]: value } : section));
  const updateHighlight = (id: string, index: number, value: string) =>
    setGeneratedSections((current) => current.map((section) => section.id === id ? {
      ...section,
      highlights: section.highlights?.map((highlight, position) => position === index ? value : highlight),
    } : section));
  const chooseHeroVariant = (variant: string) => setSitePlan((current) => ({ ...current, hero: { ...current.hero, variant } }));
  const removeAllImages = () => {
    setHeroImage("");
    setImageUrls([]);
    setOwnPhoto(false);
    setSavedLabel("Images removed — saving...");
  };
  const restoreGeneratedVersion = () => {
    const snapshot = persistedStyleRef.current.generatedVersion as { copy?: SiteCopy; sections?: GeneratedSection[]; sitePlan?: unknown; compositionId?: string } | undefined;
    if (!snapshot?.copy || !Array.isArray(snapshot.sections) || !isSitePlanV1(snapshot.sitePlan)) {
      setSavedLabel("The original generated version is unavailable for this older project.");
      return;
    }
    setCopy(snapshot.copy);
    setGeneratedSections(snapshot.sections);
    setSitePlan(snapshot.sitePlan);
    if (snapshot.compositionId) setCompositionId(snapshot.compositionId);
    setSavedLabel("Generated version restored — saving...");
  };

  const applyAiChange = async () => {
    if (!aiPrompt.trim() || aiChanges <= 0 || !projectId) return;
    setSavedLabel("Applying edit...");
    try {
      if (saveTimeout.current !== null) window.clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
      await saveQueue.current;
      await updateProject.mutateAsync({
        projectId,
        data: {
          currentStage: "editor",
          briefData: brief as any,
          styleData: { ...persistedStyleRef.current, styleMode, paletteId, fontStyle, surface, direction, compositionId, heroImage, imageUrls, brandColour, copy },
          sections: generatedSections as any,
        },
      });
      const updated = await refineProject.mutateAsync({
        projectId,
        data: { prompt: aiPrompt.trim(), selectedPart, currentCopy: copy },
      });
      const updatedCopy = (updated.styleData as { copy?: SiteCopy } | null)?.copy;
      persistedStyleRef.current = (updated.styleData || {}) as Record<string, unknown>;
      if (!updatedCopy) throw new Error("Updated copy was missing");
      setCopy(updatedCopy);
      setAiChanges(unlimitedAi ? 99 : Math.max(0, 5 - Number((updated as { refinementAttempts?: number }).refinementAttempts || 0)));
      setAiPrompt("");
      setSavedLabel("Edit applied and saved");
      qc.setQueryData(getListWebsiteProjectsQueryKey(), (current: typeof projectsQuery.data) =>
        current?.map((item) => item.id === updated.id ? updated : item)
      );
    } catch {
      setSavedLabel("Edit failed — draft unchanged");
    }
  };

  const handleAssets = async (files: FileList | null) => {
    if (!files) return;
    const supported = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
    const list = Array.from(files);
    if (!isAuthenticated || !projectId) {
      setSavedLabel("Wait for your account to finish loading before uploading.");
      return;
    }
    let completed = 0;
    for (const file of list) {
      if (!supported.has(file.type) || file.size > 25 * 1024 * 1024) continue;
      try {
        setSavedLabel(`Uploading ${file.name}...`);
        const { uploadURL, objectPath } = await requestUrl.mutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type, projectId },
        });
        const upload = await fetch(uploadURL, {
          method: "PUT", body: file, headers: { "Content-Type": file.type },
        });
        if (!upload.ok) throw new Error(`Upload returned ${upload.status}`);
        await registerAsset.mutateAsync({
          projectId,
          data: { objectPath, fileName: file.name, contentType: file.type, size: file.size, rightsStatus: "customer_owned" },
        });
        const storedUrl = `/api/storage${objectPath}`;
        setUploadedFiles((current) => [...current, file.name]);
        setImageUrls((current) => [...new Set([...current, storedUrl])]);
        if (completed === 0) {
          setHeroImage(storedUrl);
          setOwnPhoto(true);
        }
        completed++;
      } catch (error) {
        console.error("Upload failed", error);
        setSavedLabel(`Could not upload ${file.name}. Please try again.`);
      }
    }
    if (completed === list.length) setSavedLabel(completed === 1 ? "Image uploaded" : `${completed} images uploaded`);
    else if (completed > 0) setSavedLabel(`${completed} image${completed === 1 ? "" : "s"} uploaded. Other files need JPG, PNG, WebP or SVG under 25 MB.`);
    else setSavedLabel("Use JPG, PNG, WebP or SVG images under 25 MB.");
  };

  const downloadWebsite = async () => {
    const included = (brief.sections || initialBrief.sections).filter((id) => id !== "approach" || generatedSections.some((section) => section.id === id));
    const h = escapeHtml;
    const service = brief.mainService || "Personal coaching";
    const editorial = fontStyle === "Premium editorial";
    const booking = h(safeLink(brief.bookingLink));
    if (!booking) {
      setSavedLabel("Add a valid booking, enquiry, email or telephone link before downloading.");
      setStage("editor");
      return;
    }
    if (!ownPhoto && !["guided-personal", "editorial-studio", "digital-momentum"].includes(compositionId)) {
      setSavedLabel("Replace the demonstration image with a photo you own or may use before downloading.");
      setStage("editor");
      return;
    }
    let exportedHero = heroImage;
    let exportedSitePlan = liveSitePlan;
    if (ownPhoto) {
      try {
        const token = await getToken();
        const embed = async (url: string) => {
          if (!url.startsWith("/")) return url;
          const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
          if (!response.ok) throw new Error("Could not retrieve uploaded image");
          return blobToDataUrl(await response.blob());
        };
        const sourceAssets = liveSitePlan.assets?.images || [{ url: heroImage, role: "hero" as const, alt: `${brief.businessName} hero image` }];
        const embeddedAssets = await Promise.all(sourceAssets.map(async (asset) => ({ ...asset, url: await embed(asset.url) })));
        exportedHero = await embed(heroImage);
        exportedSitePlan = { ...liveSitePlan, hero: { ...liveSitePlan.hero, imageUrl: exportedHero }, assets: { images: embeddedAssets } };
      } catch {
        setSavedLabel("Download failed — one or more uploaded images are unavailable");
        return;
      }
    }
    if (compositionId === "guided-personal") {
      const locale = brief.country === "United States" ? "en-US" : brief.country === "Canada" ? "en-CA" : brief.country === "Australia" ? "en-AU" : brief.country === "New Zealand" ? "en-NZ" : "en-GB";
      const finishedHtml = buildGuidedPersonalHtml({
        brief,
        copy,
        sections: generatedSections,
        heroImage: exportedHero,
        useImage: ownPhoto,
        accent: palette.accent === "#ef162f" ? "#e0bca9" : palette.accent,
        bookingUrl: safeLink(brief.bookingLink),
        locale,
      });
      const blob = new Blob([finishedHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(brief.businessName || "fitness-website").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    if (["editorial-studio", "digital-momentum", "documentary-performance", "precision-practice", "community-schedule", "private-catalogue", "campaign-launch"].includes(compositionId)) {
      const locale = brief.country === "United States" ? "en-US" : brief.country === "Canada" ? "en-CA" : brief.country === "Australia" ? "en-AU" : brief.country === "New Zealand" ? "en-NZ" : "en-GB";
      const finishedHtml = buildCompositionHtml({
        compositionId,
        brief,
        copy,
        sections: generatedSections,
        heroImage: exportedHero,
        useImage: ownPhoto,
        accent: palette.accent,
        paletteDark: palette.dark,
        paletteLight: palette.light,
        fontStyle,
        sitePlan: exportedSitePlan,
        bookingUrl: safeLink(brief.bookingLink),
        locale,
      });
      const blob = new Blob([finishedHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(brief.businessName || "fitness-website").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const generated = (id: string, fallbackTitle: string, fallbackBody: string, fallbackEyebrow: string) => {
      const section = generatedSections.find((item) => item.id === id);
      return {
        eyebrow: sectionEyebrow(id, section?.eyebrow || fallbackEyebrow, brief.businessType),
        title: section?.title || fallbackTitle,
        body: section?.body || fallbackBody,
        layout: section?.layout || "editorial",
        highlights: section?.highlights?.filter(Boolean).slice(0, 3) || [],
      };
    };
    const services = generated("services", service, brief.offer || `A thoughtful way to get started with ${service.toLowerCase()}.`, "What we offer");
    const approach = generated("approach", "A simple first step.", brief.process || "Tell us what you are working towards, and we will help you find the right way to begin.", "Getting started");
    const about = { ...generated("about", `Meet ${brief.businessName || "your coach"}.`, copy.about, "The people behind the work"), body: copy.about };
    const contact = generated("contact", "Ready to begin?", brief.offer || "Take the first step towards your goals.", "Your next step");
    const sectionHtml = [
      included.includes("services") ? `<section id="services" class="section services ${services.layout}"><div class="kicker">${h(services.eyebrow)}</div><h2>${h(services.title)}</h2><p>${h(services.body)}</p>${services.highlights.length ? `<div class="feature-grid">${services.highlights.map((item, index) => `<div class="feature"><span>0${index + 1}</span><strong>${h(item)}</strong></div>`).join("")}</div>` : ""}</section>` : "",
      included.includes("approach") ? `<section id="approach" class="section tinted approach ${approach.layout}"><div class="kicker">${h(approach.eyebrow)}</div><h2>${h(approach.title)}</h2><p>${h(approach.body)}</p>${approach.highlights.length ? `<ol class="steps">${approach.highlights.map((item, index) => `<li><span>0${index + 1}</span>${h(item)}</li>`).join("")}</ol>` : ""}</section>` : "",
      included.includes("about") ? `<section id="about" class="section ${about.layout}"><div class="kicker">${h(about.eyebrow)}</div><h2>${h(about.title)}</h2><p>${h(about.body)}</p></section>` : "",
      included.includes("results") && (brief.credentials || brief.results) ? `<section id="results" class="section dark"><div class="kicker">Reasons to trust us</div><h2>Experience you can see.</h2>${brief.credentials ? `<p>${h(brief.credentials)}</p>` : ""}${brief.results ? `<p>${h(brief.results)}</p>` : ""}</section>` : "",
      included.includes("testimonial") && brief.testimonialQuote ? `<section class="section"><div class="kicker">From our clients</div><blockquote>“${h(withoutOuterQuotes(brief.testimonialQuote))}”</blockquote>${brief.testimonialName ? `<p><strong>${h(brief.testimonialName)}</strong></p>` : ""}</section>` : "",
      included.includes("faq") && brief.faqQuestion && brief.faqAnswer ? `<section id="faq" class="section tinted"><div class="kicker">Good to know</div><h2>Your questions, answered.</h2><h3>${h(brief.faqQuestion)}</h3><p>${h(brief.faqAnswer)}</p></section>` : "",
      included.includes("contact") ? `<section id="contact" class="section contact"><div class="kicker">${h(contact.eyebrow)}</div><h2>${h(contact.title)}</h2><p>${h(contact.body)}</p><a class="button light-button" href="${booking}">${h(copy.button)}</a></section>` : "",
    ].join("");
    const heroGradient = direction === 2
      ? `90deg,${palette.light} 0%,${palette.light}f5 42%,${palette.light}66 68%,transparent 82%`
      : direction === 3
        ? `0deg,${palette.light} 0%,${palette.light} 25%,transparent 70%`
      : direction === 1
        ? `0deg,${palette.dark}ef,${palette.dark}55`
        : `90deg,${palette.dark}ef,${palette.dark}55`;
    const heroColour = direction >= 2 ? palette.dark : "white";
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(brief.businessName || "Fitness Website")}</title><meta name="description" content="${escapeHtml(copy.subheadline)}">
<style>*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:${editorial ? "Georgia,serif" : "Arial,sans-serif"};background:white;color:${palette.dark}}nav{display:flex;align-items:center;justify-content:space-between;padding:24px 6vw;background:${palette.dark};color:white}nav a{color:white;text-decoration:none;margin-left:24px;font:600 14px Arial,sans-serif}.hero{min-height:72vh;display:flex;align-items:center;padding:80px 7vw;color:${heroColour};background:linear-gradient(${heroGradient}),url('${exportedHero}') center/cover}.hero.center{text-align:center;justify-content:center}.hero.clean .hero-inner{max-width:52%}.hero-inner{max-width:900px}.kicker{text-transform:uppercase;letter-spacing:.22em;color:${palette.accent};font:700 12px Arial,sans-serif}h1{font-size:clamp(3rem,7vw,6.5rem);line-height:.98;max-width:900px;margin:24px 0}h2{font-size:clamp(2.2rem,4vw,4rem);line-height:1.07;margin:20px 0}p{font-size:1.1rem;line-height:1.7;max-width:720px}.button{display:inline-block;margin-top:24px;padding:16px 24px;background:${palette.accent};color:white;text-decoration:none;font:700 15px Arial,sans-serif;border-radius:8px}.section{padding:90px 7vw}.section>*{max-width:1200px;margin-left:auto;margin-right:auto}.section>p{max-width:1200px}.tinted{background:${palette.light}}.dark{background:${palette.dark};color:white}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:36px}.card{padding:28px;background:#f3f4f5;border-radius:14px}.card p{font-size:.95rem}.contact{background:${palette.accent};color:white;text-align:center}.light-button{background:white;color:${palette.dark}}blockquote{font-size:clamp(1.6rem,3vw,3rem);max-width:900px;margin-top:36px}@media(max-width:700px){nav div:last-child{display:none}.grid{grid-template-columns:1fr}.hero{min-height:75vh;color:white;background:linear-gradient(0deg,${palette.dark}e8,${palette.dark}55),url('${exportedHero}') center/cover}.hero.clean .hero-inner{max-width:100%}h1{font-size:3.2rem}.section{padding:64px 7vw}}</style></head>
<body>${brief.banner && brief.bannerText ? `<div style="background:${palette.accent};color:white;text-align:center;padding:10px;font-weight:700">${h(brief.bannerText)}</div>` : ""}<nav><strong>${h(brief.businessName || "YOUR BUSINESS")}</strong><div>${included.includes("services") ? `<a href="#services">Services</a>` : ""}${included.includes("about") ? `<a href="#about">About</a>` : ""}${included.includes("results") && (brief.credentials || brief.results) ? `<a href="#results">Results</a>` : ""}${included.includes("contact") ? `<a href="#contact">Contact</a>` : ""}</div></nav><section class="hero${direction === 1 ? " center" : direction === 2 ? " clean" : direction === 3 ? " editorial-feature" : ""}"><div class="hero-inner"><div class="kicker">${h(service)}</div><h1>${h(copy.headline)}</h1><p>${h(copy.subheadline)}</p><a class="button" href="${booking}">${h(copy.button)}</a></div></section>${sectionHtml}</body></html>`;
    const layoutCss = `.section.statement{text-align:center}.section.statement>p{margin-left:auto;margin-right:auto}.section.split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:5vw;align-items:start}.section.split>.kicker{grid-column:1/-1}.section.split>h2,.section.split>p{width:100%;margin-left:0;margin-right:0}@media(max-width:700px){.section.split{display:block}.section.split>p{margin-top:1.5rem}}.feature-grid,.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:1200px;margin:56px auto 0;padding:0;list-style:none;text-align:left}.feature,.steps li{min-height:160px;padding:28px;border:1px solid #d9dbdc;border-radius:18px;background:white}.feature span,.steps span{display:block;color:${palette.accent};font:700 12px Arial,sans-serif;letter-spacing:.12em;margin-bottom:36px}.feature strong{font-size:clamp(1.1rem,1.7vw,1.55rem);line-height:1.25}.steps li{font-size:1.15rem;line-height:1.5}.section.split>.feature-grid,.section.split>.steps{grid-column:1/-1;width:100%}@media(max-width:700px){.feature-grid,.steps{grid-template-columns:1fr;margin-top:32px}.feature,.steps li{min-height:0}.feature span,.steps span{margin-bottom:20px}}.hero.editorial-feature{display:block;min-height:0;padding:390px 7vw 88px;background-color:${palette.light};background-image:linear-gradient(0deg,${palette.light},transparent 70%),url('${exportedHero}');background-size:100% 430px,100% 430px;background-position:center top,center top;background-repeat:no-repeat}.hero.editorial-feature .hero-inner{max-width:1000px}.hero.editorial-feature p{color:${palette.dark}}@media(max-width:700px){.hero.editorial-feature{color:${palette.dark};padding:280px 7vw 64px;background-size:100% 320px,100% 320px;background-position:center top,center top}}`;
    const typographyCss = `body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif}h1,h2,blockquote{font-family:${editorial ? '"Iowan Old Style",Baskerville,"Palatino Linotype",Georgia,serif' : '"Helvetica Neue",Arial,system-ui,sans-serif'}}${editorial ? 'nav strong{font-family:"Iowan Old Style",Baskerville,Georgia,serif;font-size:1.2rem}' : ''}`;
    const splitHeroCss = direction === 2 ? `.hero.clean{background-color:${palette.light};background-image:linear-gradient(90deg,${palette.light} 0%,${palette.light} 44%,${palette.light}88 63%,transparent 82%),url('${exportedHero}');background-size:100% 100%,56% 100%;background-position:center,right center;background-repeat:no-repeat}@media(max-width:700px){.hero.clean{background-color:${palette.dark};background-image:linear-gradient(0deg,${palette.dark}e8,${palette.dark}55),url('${exportedHero}');background-size:cover,cover;background-position:center,center}}` : "";
    const finishedHtml = html
      .replace("</style></head>", `${layoutCss}${splitHeroCss}${typographyCss}</style></head>`)
      .replace('<a href="#services">Services</a>', `<a href="#services">${h(offerLabel(brief.businessType))}</a>`);
    const blob = new Blob([finishedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(brief.businessName || "fitness-website").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const approveWebsite = async () => {
    if (!safeLink(brief.bookingLink)) {
      setSavedLabel("Add a valid booking, enquiry, email or telephone link before approval.");
      return;
    }
    if (!ownPhoto && !["guided-personal", "editorial-studio", "digital-momentum"].includes(compositionId)) {
      setSavedLabel("Replace the demonstration image with a photo you own or may use before approval.");
      return;
    }
    if (isAuthenticated && projectId) {
      setSavedLabel("Approving...");
      try {
        if (saveTimeout.current !== null) window.clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
        await saveQueue.current;
        await updateProject.mutateAsync({
          projectId,
          data: {
            status: "approved",
            currentStage: "delivery",
            briefData: brief as any,
            styleData: { ...persistedStyleRef.current, styleMode, paletteId, fontStyle, surface, direction, compositionId, heroImage, imageUrls, assetMode: liveSitePlan.assetMode === "none" ? "image-light" : liveSitePlan.assetMode === "multiple" ? "image-rich" : "image-led", brandColour, copy, sitePlan: liveSitePlan },
            sections: generatedSections as any,
          },
        });
        setSavedLabel("Approved and saved");
      } catch {
        setSavedLabel("Approval failed");
        return;
      }
    }
    setStage("delivery");
  };

  return (
    <div className="flex flex-col bg-background text-foreground h-full min-h-[calc(100vh-3rem)] lg:min-h-screen">
      {stage === "home" && <HomeScreen hasProgress={Boolean(brief.businessName.trim())} start={() => setStage("brief")} resume={() => setStage("brief")} startFresh={() => void startFreshWebsite()} startingFresh={createProject.isPending} />}
      {stage === "brief" && <BriefScreen brief={brief} setBrief={setBrief} files={uploadedFiles} upload={() => uploadRef.current?.click()} back={() => setStage("home")} next={() => setStage("content")} saved={savedLabel} />}
      {stage === "content" && <ContentScreen brief={brief} setBrief={setBrief} back={() => setStage("brief")} next={() => setStage("style")} saved={savedLabel} />}
      {stage === "style" && <StyleScreen mode={styleMode} setMode={setStyleMode} moods={moods} setMoods={setMoods} paletteId={paletteId} setPaletteId={setPaletteId} fontStyle={fontStyle} setFontStyle={setFontStyle} surface={surface} setSurface={setSurface} brandColour={brandColour} setBrandColour={setBrandColour} businessName={brief.businessName} businessType={brief.businessType} mainService={brief.mainService} audience={brief.audience} heroImage={heroImage} upload={() => uploadRef.current?.click()} back={() => setStage("content")} next={() => void continueToDirections()} setDirection={setDirection} palette={palette} />}
      {stage === "direction" && <DirectionScreen brief={brief} setBrief={setBrief} copy={copy} palette={palette} heroImage={heroImage} options={directionOptions} selectedId={compositionId} setSelectedId={setCompositionId} loading={directionsLoading} blocks={directionBlocks} status={savedLabel} back={() => setStage("style")} build={beginBuild} hasDraft={generatedSections.length > 0} generationAttempts={generationAttempts} unlimitedAi={unlimitedAi} returnToEditor={() => setStage("editor")} />}
      {stage === "building" && <BuildingScreen brief={brief} palette={palette} copy={copy} heroImage={heroImage} index={buildIndex} />}
      {stage === "editor" && <EditorScreen brief={brief} setBrief={setBrief} copy={copy} generatedSections={generatedSections} updateSection={updateSection} updateHighlight={updateHighlight} palette={palette} paletteId={paletteId} setPaletteId={setPaletteId} fontStyle={fontStyle} setFontStyle={setFontStyle} heroImage={heroImage} direction={direction} compositionId={compositionId} sitePlan={liveSitePlan} ownPhoto={ownPhoto} replaceImage={() => imageRef.current?.click()} removeImages={removeAllImages} chooseHeroVariant={chooseHeroVariant} restoreGeneratedVersion={restoreGeneratedVersion} canRestoreGenerated={Boolean(persistedStyleRef.current.generatedVersion)} previewSize={previewSize} setPreviewSize={setPreviewSize} selectedPart={selectedPart} setSelectedPart={setSelectedPart} updateCopy={updateCopy} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} applyAiChange={applyAiChange} aiChanges={aiChanges} unlimitedAi={unlimitedAi} approve={() => void approveWebsite()} changeDirection={() => setStage("direction")} startFresh={() => void startFreshWebsite()} startingFresh={createProject.isPending} generationAttempts={generationAttempts} saved={savedLabel} />}
      {stage === "delivery" && <DeliveryScreen brief={brief} copy={copy} generatedSections={generatedSections} palette={palette} fontStyle={fontStyle} heroImage={heroImage} direction={direction} compositionId={compositionId} sitePlan={liveSitePlan} ownPhoto={ownPhoto} edit={() => setStage("editor")} download={() => void downloadWebsite()} />}
      <input ref={uploadRef} className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => { void handleAssets(event.target.files); event.target.value = ""; }} />
      <input ref={imageRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => { void handleAssets(event.target.files); event.target.value = ""; }} />
      {showLocked && <LockedModal product={showLocked} close={() => setShowLocked(null)} />}
    </div>
  );
}


function ShellHeader({ step, title, subtitle, saved }: { step?: number; title: string; subtitle: string; saved?: string }) {
  const labels = ["Brief", "Content", "Style", "Direction", "Website"];
  return <header className="border-b border-border bg-card px-6 py-6 md:px-10">
    <div className="mx-auto max-w-[1320px]">
      {step && <div className="mb-6 flex max-w-xl items-center gap-2">{labels.map((label, index) => <div key={label} className="flex flex-1 items-center gap-2"><div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", index + 1 <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{index + 1 < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</div><span className={cn("hidden text-xs sm:block", index + 1 === step ? "font-semibold text-primary" : "text-muted-foreground")}>{label}</span>{index < labels.length - 1 && <div className="h-px flex-1 bg-border" />}</div>)}</div>}
      <div className="flex items-end justify-between gap-5"><div><h1 className="font-sans text-3xl font-black tracking-[-.04em] md:text-5xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p></div>{saved && <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><CheckCircle2 className="h-4 w-4 text-green-500" />{saved}</div>}</div>
    </div>
  </header>;
}

function HomeScreen({ hasProgress, start, resume, startFresh, startingFresh }: { hasProgress: boolean; start: () => void; resume: () => void; startFresh: () => void; startingFresh: boolean }) {
  return <div className="flex-1">
    <ShellHeader title="Your fitness website" subtitle="A guided workspace for creating, refining and downloading your personalised website." />
    <div className="mx-auto max-w-[1320px] space-y-6 p-6 md:p-10">
      <section className="relative overflow-hidden rounded-[28px] bg-sidebar px-7 py-10 text-sidebar-foreground md:px-12 md:py-14"><div className="absolute -right-16 -top-24 h-80 w-80 rounded-full bg-primary/25 blur-3xl" /><div className="relative max-w-3xl"><div className="text-[10px] font-bold uppercase tracking-[.24em] text-primary">Start here</div><h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-.045em] md:text-6xl">A website that looks as professional as your coaching.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-sidebar-foreground/65">Tell us about your business, shape the visual direction and receive a polished website you can edit, approve and publish.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={hasProgress ? resume : start} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-4 text-sm font-bold shadow-[0_12px_35px_rgba(239,22,47,.3)]">{hasProgress ? "Continue my website" : "Create my website"}<ArrowRight className="h-4 w-4" /></button>{hasProgress && <button disabled={startingFresh} onClick={startFresh} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-4 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"><RefreshCw className="h-4 w-4" />{startingFresh ? "Starting..." : "Start a new website"}</button>}</div>{hasProgress && <p className="mt-4 text-xs leading-5 text-white/50">A new website starts clean and imports the latest details from My Business. Your existing project is kept.</p>}</div></section>
      <section className="grid gap-5 md:grid-cols-3"><InfoCard n="01" title="Tell us about the business" text="Add your services, audience, goals, logo, photographs and any useful context." /><InfoCard n="02" title="Shape the visual direction" text="Use our recommendation, choose the style yourself or apply your existing brand." /><InfoCard n="03" title="Review and make it yours" text="Edit the page, request changes, approve it and receive the finished website files." /></section>
      <section className="grid gap-4 md:grid-cols-3"><ProductCard title="Extra Pages" detail="Expand your website with connected pages using the same brand direction." label="Bump 1" /><ProductCard title="Campaign Studio" detail="Create personalised promotions using your saved business profile." label="Upsell 1" /><ProductCard title="Meta Ad Launch Pack" detail="Turn your selected offer into a complete paid-advertising package." label="Upsell 2" /></section>
    </div>
  </div>;
}

function InfoCard({ n, title, text }: { n: string; title: string; text: string }) { return <div className="rounded-2xl border border-border bg-card p-6"><div className="text-xs font-black text-muted-foreground">{n}</div><h3 className="mt-5 font-sans text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>; }
function ProductCard({ title, detail, label }: { title: string; detail: string; label: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[.18em] text-muted-foreground">{label}</span><Lock className="h-3.5 w-3.5 text-muted-foreground" /></div><h3 className="mt-6 font-sans text-lg font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p><div className="mt-5 inline-flex rounded-full bg-secondary px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Available separately</div></div>; }

function BriefScreen({ brief, setBrief, files, upload, back, next, saved }: { brief: Brief; setBrief: (brief: Brief) => void; files: string[]; upload: () => void; back: () => void; next: () => void; saved: string }) {
  const set = (key: keyof Brief, value: string | boolean) => setBrief({ ...brief, [key]: value });
  const ready = brief.businessName.trim() && brief.mainService.trim() && brief.audience.trim();
  return <div className="flex-1 flex flex-col"><ShellHeader step={1} title="Tell us about your business" subtitle="Give us the essentials. Add as much context as you like." saved={saved} />
    <div className="mx-auto grid max-w-[1320px] gap-6 p-6 md:p-10 xl:grid-cols-[1fr_360px] flex-1">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8"><div className="grid gap-5 md:grid-cols-2">
        <Field label="Business name" required><TextInput value={brief.businessName} onChange={(value) => set("businessName", value)} placeholder="Example: Northside Strength" /></Field>
        <Field label="Business type" required><SelectInput value={brief.businessType} onChange={(value) => set("businessType", value)} options={["Personal trainer", "Online fitness coach", "Strength or performance coach", "Yoga or Pilates instructor", "Group fitness instructor", "Fitness studio", "Martial arts or boxing coach", "Other fitness professional"]} /></Field>
        <Field label="Main service" required><TextInput value={brief.mainService} onChange={(value) => set("mainService", value)} placeholder="Example: One-to-one strength coaching" /></Field>
        <Field label="Ideal customer" required><TextInput value={brief.audience} onChange={(value) => set("audience", value)} placeholder="Example: Busy professionals aged 35–55" /></Field>
        <Field label="What are they struggling with?" hint="Describe the real situation in your own words. We will rewrite it for the website."><TextInput value={brief.primaryProblem} onChange={(value) => set("primaryProblem", value)} placeholder="Example: They keep starting plans but cannot stay consistent" /></Field>
        <Field label="What do they want instead?" hint="Use a realistic outcome, without adding a guarantee."><TextInput value={brief.desiredOutcome} onChange={(value) => set("desiredOutcome", value)} placeholder="Example: Feel stronger and confident training independently" /></Field>
        <Field label="Location"><TextInput value={brief.location} onChange={(value) => set("location", value)} placeholder="Manchester, UK or Online" /></Field>
        <Field label="Country" required><SelectInput value={brief.country} onChange={(value) => set("country", value)} options={["United Kingdom", "United States", "Canada", "Australia", "New Zealand", "Other"]} /></Field>
        <Field label="How do you deliver the service?"><SelectInput value={brief.deliveryMode} onChange={(value) => set("deliveryMode", value)} options={["In person", "Online", "Both in person and online"]} /></Field>
        <Field label="Business setup"><SelectInput value={brief.businessScale} onChange={(value) => set("businessScale", value)} options={["Solo operator", "Team at one location", "Multiple locations"]} /></Field>
        {brief.businessScale === "Multiple locations" && <Field label="Number of locations"><TextInput value={brief.locationCount} onChange={(value) => set("locationCount", value)} placeholder="Example: 4" /></Field>}
        <Field label="Main website goal"><SelectInput value={brief.goal} onChange={(value) => set("goal", value)} options={["Book a consultation", "Receive enquiries", "Fill classes", "Sell a programme", "Promote online coaching", "Build professional credibility"]} /></Field>
        <div className="md:col-span-2"><Field label="Booking or enquiry destination" hint="Required before approval. Add your booking URL, or mailto:you@example.com or tel:+441234567890 if you do not use a booking tool."><TextInput value={brief.bookingLink} onChange={(value) => set("bookingLink", value)} placeholder="https://..." /></Field></div>
        <div className="md:col-span-2"><Field label="Source material and rough notes" hint="Paste existing copy, social bios or unorganised notes. These are treated as factual source material. The website writer will structure and rewrite them rather than simply pasting them."><textarea value={brief.context} onChange={(event) => set("context", event.target.value)} className="min-h-36 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition focus:border-border focus:ring-4 focus:ring-[#ef162f]/10" placeholder="Tell us about your story, services, approach, qualifications, results or anything else that would help..." /></Field></div>
      </div>
      <div className="mt-6"><Field label="Your photos and image assets" hint="JPG, PNG, WebP or SVG, up to 25 MB each. The first uploaded image becomes your hero; other images are saved for later use."><button onClick={upload} className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary text-sm text-muted-foreground hover:border-border"><Upload className="mb-2 h-5 w-5" /><span className="font-semibold text-muted-foreground">Choose images</span><span className="mt-1 text-xs">You can add more later</span></button></Field>{files.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{files.map((file, index) => <span key={`${file}-${index}`} className="inline-flex items-center rounded-full bg-secondary px-3 py-1.5 text-xs">{file}</span>)}</div>}</div>
      <div className="mt-6 grid gap-5 border-t border-border pt-6 md:grid-cols-2"><Field label="How should the site use images?"><SelectInput value={brief.imagePreference} onChange={(value) => set("imagePreference", value)} options={["Auto", "Image-light", "Image-rich"]} /></Field><Field label="Preferred page depth" hint="Auto prevents a thin brief being stretched into an empty page."><SelectInput value={brief.contentLength} onChange={(value) => set("contentLength", value)} options={["Auto", "Compact", "Standard", "Expanded"]} /></Field></div>
      <div className="mt-8 flex justify-between"><button onClick={back} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3.5 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button><button disabled={!ready} onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-35">Review my brief<ArrowRight className="h-4 w-4" /></button></div></section>
      <aside className="overflow-hidden rounded-2xl border border-border bg-card"><div className="relative min-h-60 bg-secondary p-7 text-white"><div className="absolute right-0 top-0 h-full w-2/3 bg-[radial-gradient(circle_at_top_right,rgba(239,22,47,.38),transparent_65%)]" /><div className="relative"><div className="h-12 w-1 bg-secondary" /><div className="mt-6 text-4xl font-black uppercase leading-[.92]">A website<br />that works<br /><span className="text-muted-foreground">as hard as you do.</span></div></div></div><div className="space-y-5 p-6"><Authority icon={Sparkles} title="Personal to your business" text="Your audience, offer, proof and personality shape the website." /><Authority icon={Monitor} title="Built for every screen" text="Desktop and mobile presentation are reviewed before delivery." /><Authority icon={Pencil} title="You stay in control" text="Review, refine and approve everything before download." /></div></aside>
    </div>
  </div>;
}

function ContentScreen({ brief, setBrief, back, next, saved }: { brief: Brief; setBrief: (brief: Brief) => void; back: () => void; next: () => void; saved: string }) {
  const set = (key: keyof Brief, value: string) => setBrief({ ...brief, [key]: value });
  const selected = brief.sections || initialBrief.sections;
  const toggleSection = (id: string) => setBrief({ ...brief, sections: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id] });
  return <div><ShellHeader step={2} title="Shape the full page" subtitle="Choose what belongs on your site, then give us the real details. Leave anything you cannot substantiate blank." saved={saved} />
    <div className="mx-auto grid max-w-[1320px] gap-6 p-6 md:p-10 xl:grid-cols-[1fr_340px]">
      <section className="space-y-7 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div><div className="text-sm font-black">Sections to include</div><p className="mt-1 text-xs leading-5 text-muted-foreground">The page will still have a headline and main action. Pick the supporting sections that fit your business.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{pageSections.map((section) => <button key={section.id} type="button" onClick={() => toggleSection(section.id)} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition", selected.includes(section.id) ? "border-border bg-secondary" : "border-border hover:border-border")}><span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border", selected.includes(section.id) ? "border-border bg-secondary text-white" : "border-border")}>{selected.includes(section.id) && <Check className="h-3.5 w-3.5" />}</span><span><span className="block text-sm font-bold">{section.name}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{section.purpose}</span></span></button>)}</div></div>
        <div className="grid gap-5 border-t border-border pt-7 md:grid-cols-2"><div className="md:col-span-2"><Field label="Your offer or first-step invitation" hint="For example: a free consultation, introductory class or a named programme."><TextInput value={brief.offer} onChange={(value) => set("offer", value)} placeholder="Example: Book a free 20-minute coaching call" /></Field></div><div className="md:col-span-2"><Field label="What makes you different?" hint="Your genuine method or experience. Avoid claims you cannot prove."><textarea value={brief.differentiator} onChange={(event) => set("differentiator", event.target.value)} className="min-h-24 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-border" placeholder="How do you coach, teach or support clients differently?" /></Field></div>
          <div className="md:col-span-2"><Field label="What is included?" hint="Rough notes are fine. Add the real service components the customer receives."><textarea value={brief.serviceDetails} onChange={(event) => set("serviceDetails", event.target.value)} className="min-h-20 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-border" placeholder="Example: Weekly one-to-one sessions, programme updates, technique review and message support" /></Field></div>
          <div className="md:col-span-2"><Field label="What usually stops someone booking?" hint="This helps the page answer the buyer's real concern without inventing promises."><textarea value={brief.objections} onChange={(event) => set("objections", event.target.value)} className="min-h-20 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-border" placeholder="Example: They worry they are too unfit to begin or cannot fit sessions around work" /></Field></div>
          {selected.includes("approach") && <div className="md:col-span-2"><Field label="How do customers get started?" hint="A few rough steps are enough."><textarea value={brief.process} onChange={(event) => set("process", event.target.value)} className="min-h-20 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-border" placeholder="Example: Book a call, meet your coach, start your plan" /></Field></div>}
          {/class|studio|group|yoga|pilates/i.test(`${brief.goal} ${brief.businessType}`) && <div className="md:col-span-2"><Field label="Real class or session schedule" hint="Add only times you want displayed. A static schedule will never pretend to show live capacity."><textarea value={brief.schedule} onChange={(event) => set("schedule", event.target.value)} className="min-h-24 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-border" placeholder="Example: Reformer Foundations, Monday and Wednesday at 18:00" /></Field></div>}
          {/sell|programme|online|challenge|intake/i.test(`${brief.goal} ${brief.mainService} ${brief.offer}`) && <><Field label="Programme start date" hint="Leave blank for an evergreen programme."><TextInput value={brief.programmeStart} onChange={(value) => set("programmeStart", value)} placeholder="Example: 14 October 2026" /></Field><Field label="Real capacity" hint="Only include a limit that genuinely applies."><TextInput value={brief.programmeCapacity} onChange={(value) => set("programmeCapacity", value)} placeholder="Example: 12 places" /></Field></>}
          <div className="md:col-span-2"><Field label="Prices to show" hint="Optional. Paste the exact prices or packages that may appear on the page. Leave blank to use an enquiry or booking action."><textarea value={brief.prices} onChange={(event) => set("prices", event.target.value)} className="min-h-20 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-border" placeholder="Example: Initial assessment £65; monthly coaching from £180" /></Field></div>
          {selected.includes("results") && <><Field label="Qualifications or credible proof"><TextInput value={brief.credentials} onChange={(value) => set("credentials", value)} placeholder="Example: Level 3 PT, 8 years coaching" /></Field><Field label="Results you can substantiate"><TextInput value={brief.results} onChange={(value) => set("results", value)} placeholder="Example: 200+ clients coached" /></Field></>}
          {selected.includes("testimonial") && <><div className="md:col-span-2"><Field label="A real client quote" hint="We will not invent testimonials or transformation results."><textarea value={brief.testimonialQuote} onChange={(event) => set("testimonialQuote", event.target.value)} className="min-h-20 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-border" placeholder="Paste the client's approved words here" /></Field></div><Field label="Name to display"><TextInput value={brief.testimonialName} onChange={(value) => set("testimonialName", value)} placeholder="Example: Sarah M." /></Field></>}
          {selected.includes("faq") && <><Field label="Common question"><TextInput value={brief.faqQuestion} onChange={(value) => set("faqQuestion", value)} placeholder="Example: Do I need experience?" /></Field><Field label="Your answer"><TextInput value={brief.faqAnswer} onChange={(value) => set("faqAnswer", value)} placeholder="Example: No. We adapt to your starting point." /></Field></>}
          <Field label="Writing style"><SelectInput value={brief.voiceStyle} onChange={(value) => set("voiceStyle", value)} options={["Warm and professional", "Direct and confident", "Calm and reassuring", "Energetic and motivating", "Premium and understated", "Friendly and conversational"]} /></Field>
          <Field label="Words or phrases to avoid"><TextInput value={brief.wordsToAvoid} onChange={(value) => set("wordsToAvoid", value)} placeholder="Example: hustle, no excuses, life-changing" /></Field>
          <div className="md:col-span-2"><Field label="Optional writing samples" hint="Paste a few messages, captions or paragraphs that sound like you. The writer will learn the tone without copying private client details."><textarea value={brief.voiceExamples} onChange={(event) => set("voiceExamples", event.target.value)} className="min-h-24 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-border" placeholder="A few examples of how you naturally communicate..." /></Field></div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-6"><button onClick={back} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button><button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_28px_rgba(239,22,47,.22)]">Choose design style<ArrowRight className="h-4 w-4" /></button></div>
      </section>
      <aside className="h-fit rounded-2xl bg-secondary p-6 text-white"><div className="text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">What makes this personal</div><h2 className="mt-4 text-2xl font-black">A page built from your evidence.</h2><p className="mt-3 text-sm leading-6 text-white/65">The best pages show a clear offer, a real person and believable proof. We will not fill gaps with made-up reviews or statistics.</p><div className="mt-6 border-t border-white/10 pt-5 text-xs leading-6 text-white/55">You can edit the copy and design after seeing the first draft.</div></aside>
    </div>
  </div>;
}

function Authority({ icon: Icon, title, text }: { icon: typeof Home; title: string; text: string }) { return <div className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground"><Icon className="h-4 w-4" /></div><div><div className="text-sm font-bold">{title}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div></div>; }
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) { return <label className="block"><span className="text-sm font-semibold">{label}{required && <span className="ml-1 text-muted-foreground">*</span>}</span>{hint && <span className="mt-1 block text-xs leading-5 text-muted-foreground">{hint}</span>}<div className="mt-2">{children}</div></label>; }
function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) { return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-xl border border-border px-4 text-sm outline-none transition focus:border-border focus:ring-4 focus:ring-[#ef162f]/10" />; }
function SelectInput({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) { return <div className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full appearance-none rounded-xl border border-border bg-card px-4 pr-10 text-sm outline-none transition focus:border-border focus:ring-4 focus:ring-[#ef162f]/10">{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-4 h-4 w-4" /></div>; }

function StyleScreen({ mode, setMode, moods, setMoods, paletteId, setPaletteId, fontStyle, setFontStyle, surface, setSurface, brandColour, setBrandColour, businessName, businessType, mainService, audience, heroImage, upload, back, next, setDirection, palette }: { mode: StyleMode; setMode: (mode: StyleMode) => void; moods: string[]; setMoods: (moods: string[]) => void; paletteId: string; setPaletteId: (id: string) => void; fontStyle: string; setFontStyle: (style: string) => void; surface: string; setSurface: (surface: string) => void; brandColour: string; setBrandColour: (colour: string) => void; businessName: string; businessType: string; mainService: string; audience: string; heroImage: string; upload: () => void; back: () => void; next: () => void; setDirection: (direction: number) => void; palette: PaletteChoice }) {
  const toggleMood = (mood: string) => setMoods(moods.includes(mood) ? moods.filter((item) => item !== mood) : moods.length < 2 ? [...moods, mood] : [moods[1], mood]);
  const chooseLook = (id: string, font: string) => { setPaletteId(id); setFontStyle(font); };
  const recommendedId = suggestedLook(businessType);
  const recommendedLook = designLooks.find((look) => look.id === recommendedId) || designLooks[0];
  const chooseRecommended = () => {
    chooseLook(recommendedLook.id, recommendedLook.font);
    setDirection(recommendedLook.id === "sand" ? 3 : recommendedLook.id === "forest" ? 2 : recommendedLook.id === "ocean" ? 1 : 0);
  };
  return <div><ShellHeader step={3} title="Choose how your website should feel" subtitle="Let us pick a starting point, choose from four looks, or use your existing brand." />
    <div className="mx-auto max-w-[1320px] p-6 md:p-10">
      <div className="mb-6 grid rounded-2xl border border-border bg-card p-1.5 md:grid-cols-3">{([{ id: "recommend", label: "Pick it for me", icon: WandSparkles }, { id: "choose", label: "Choose my style", icon: Palette }, { id: "brand", label: "Use my brand", icon: Upload }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setMode(id)} className={cn("flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition", mode === id ? "bg-secondary text-white shadow-lg shadow-red-500/15" : "text-muted-foreground hover:bg-secondary")}><Icon className="h-4 w-4" />{label}</button>)}</div>
      <div className="grid gap-6 xl:grid-cols-[1fr_480px]"><section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        {mode === "recommend" && <div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">A starting point for your business</div><h2 className="mt-3 text-3xl font-black tracking-tight">We'll suggest the look</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Based on your business type, we'd start with {recommendedLook.name}. This sets the colours, typography and opening layout. You can change any of them before generating your site.</p><button onClick={chooseRecommended} className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Use my recommended look</button><div className="mt-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">Or choose one of the four looks yourself</div><div className="mt-4 grid gap-4 sm:grid-cols-2">{designLooks.map((look) => { const colours = palettes.find((item) => item.id === look.id)!; const active = paletteId === look.id; return <button key={look.id} onClick={() => chooseLook(look.id, look.font)} className={cn("overflow-hidden rounded-2xl border-2 text-left transition", active ? "border-border shadow-[0_10px_30px_rgba(239,22,47,.12)]" : "border-border hover:border-border")}><div className="relative flex h-44 flex-col justify-between overflow-hidden p-5" style={{ background: colours.dark, color: "white" }}><div className="flex items-center justify-between"><span className={cn("text-[9px] tracking-[.15em]", look.font === "Premium editorial" ? "font-serif text-sm" : "font-black uppercase")}>{businessName || "YOUR BUSINESS"}</span><span className="h-2 w-2 rounded-full" style={{ background: colours.accent }} /></div><div className="relative z-10 max-w-[80%]"><div className={cn("text-3xl leading-[.95]", look.font === "Premium editorial" ? "font-serif" : look.font === "Clean professional" ? "font-medium" : "font-black uppercase")}>{look.id === "sand" ? "Move well. Live fully." : look.id === "forest" ? "Find your rhythm." : look.id === "ocean" ? "Make progress your way." : "Built for what’s next."}</div><div className="mt-3 h-1 w-12" style={{ background: colours.accent }} /></div><div className="pointer-events-none absolute -bottom-16 -right-12 h-48 w-48 rounded-full opacity-45" style={{ background: colours.accent }} /></div><div className="p-4"><div className="flex items-center justify-between gap-2"><span className="font-bold">{look.name}</span>{active && <CheckCircle2 className="h-5 w-5 text-muted-foreground" />}</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{look.category}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{look.note}</p></div></button>; })}</div><div className="mt-6 rounded-xl bg-secondary p-4 text-xs leading-5 text-muted-foreground">The preview updates when you pick a look. The next screen shows four optional ways to arrange the opening section.</div></div>}
        {mode === "choose" && <div className="space-y-8"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Your adjustments</div><h2 className="mt-3 text-3xl font-black tracking-tight">Make the look your own</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Each choice below changes the website preview and the downloaded page.</p></div>
          <ChoiceSection n="1" title="Choose a colour palette">{palettes.map((item) => <button key={item.id} onClick={() => setPaletteId(item.id)} className={cn("rounded-xl border p-3 text-left", paletteId === item.id ? "border-border ring-1 ring-[#ef162f]" : "border-border")}><div className="flex h-12 overflow-hidden rounded-lg"><span className="flex-1" style={{ background: item.dark }} /><span className="w-1/4" style={{ background: item.accent }} /><span className="w-1/4" style={{ background: item.light }} /></div><div className="mt-3 text-sm font-bold">{item.name}</div><div className="text-[11px] text-muted-foreground">{item.description}</div></button>)}</ChoiceSection>
          <ChoiceSection n="2" title="Choose a typography direction">{["Strong & modern", "Premium editorial", "Clean professional"].map((font) => <button key={font} onClick={() => setFontStyle(font)} className={cn("rounded-xl border p-4 text-left", fontStyle === font ? "border-border ring-1 ring-[#ef162f]" : "border-border")}><div className={cn("text-lg", font === "Premium editorial" ? "font-serif" : font === "Clean professional" ? "font-normal tracking-tight" : "font-black tracking-tight")}>{businessName || "Your Business"}</div><div className="mt-2 text-[11px] text-muted-foreground">{font}</div></button>)}</ChoiceSection>
          <div className="rounded-xl border border-border bg-secondary p-5"><div className="font-bold">Have a better photo?</div><p className="mt-1 text-xs leading-5 text-muted-foreground">Your own image can make more difference than another colour or font.</p><button onClick={upload} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2.5 text-xs font-bold ring-1 ring-[#dfe2e5]"><Upload className="h-4 w-4" />Upload hero photo</button></div></div>}
        {mode === "brand" && <div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Existing identity</div><h2 className="mt-3 text-3xl font-black tracking-tight">Bring your brand with you</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Use your existing colour and a photo of your business. The photo and colour apply to this draft. Automatic logo and brand-guide reading will be added later.</p><button onClick={upload} className="mt-7 flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary text-sm"><Upload className="mb-3 h-5 w-5 text-muted-foreground" /><span className="font-semibold">Upload your hero photo</span><span className="mt-1 text-xs text-muted-foreground">A clear image of you, your space or your service</span></button><div className="mt-7 grid gap-5 md:grid-cols-2"><Field label="Primary brand colour"><div className="flex h-12 items-center gap-3 rounded-xl border border-border px-3"><input type="color" value={brandColour} onChange={(event) => setBrandColour(event.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent" /><input value={brandColour} onChange={(event) => setBrandColour(event.target.value)} className="min-w-0 flex-1 text-sm uppercase outline-none" /></div></Field></div></div>}
        <div className="mt-9 flex items-center justify-between border-t pt-6"><button onClick={back} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button><button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_28px_rgba(239,22,47,.22)]">Continue to page layout<ArrowRight className="h-4 w-4" /></button></div>
      </section><MiniSite briefName={businessName} copy={{ headline: mainService || "A better way to move", subheadline: audience ? `Designed for ${audience}.` : "A website shaped around your business.", about: "", button: "Get started" }} palette={palette} heroImage={heroImage} surface={surface} fontStyle={fontStyle} /></div>
    </div>
  </div>;
}

function Recommendation({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: string }) { return <div className="flex items-center gap-3 rounded-xl border border-border p-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="h-4 w-4" /></div><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div></div>; }
function ChoiceSection({ n, title, hint, children }: { n: string; title: string; hint?: string; children: React.ReactNode }) { return <div><div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-wider">{n}. {title}</h3>{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div></div>; }

function MiniSite({ briefName, copy, palette, heroImage, surface, fontStyle }: { briefName: string; copy: SiteCopy; palette: PaletteChoice; heroImage: string; surface: string; fontStyle: string }) {
  return <aside className="self-start rounded-2xl border border-border bg-card p-4 xl:sticky xl:top-5"><div className="mb-3 flex items-center justify-between px-1"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Live preview</span><span className="text-[10px] text-muted-foreground">Based on your choices</span></div><div className="overflow-hidden rounded-xl border border-black/10" style={{ background: surface === "Mostly light" ? palette.light : palette.dark, color: surface === "Mostly light" ? palette.dark : "white" }}><div className="flex items-center justify-between px-5 py-4 text-[8px] font-bold"><span>{(briefName || "YOUR BUSINESS").toUpperCase()}</span><span className="rounded-md px-3 py-2 text-white" style={{ background: palette.accent }}>Get started</span></div><div className="relative min-h-[440px] overflow-hidden p-7"><img src={heroImage} alt="Fitness website example" className="absolute inset-0 h-full w-full object-cover opacity-60" /><div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${palette.dark} 12%, ${palette.dark}c9 50%, transparent)` }} /><div className="relative z-10 mt-24 max-w-[290px] text-white"><div className="mb-4 h-1 w-12" style={{ background: palette.accent }} /><h3 className={cn("text-4xl uppercase leading-[.9]", fontStyle === "Premium editorial" ? "font-serif normal-case" : "font-black")}>{copy.headline}</h3><p className="mt-4 text-xs leading-5 text-white/75">{copy.subheadline}</p><button className="mt-5 rounded-lg px-4 py-3 text-xs font-bold" style={{ background: palette.accent }}>Start your journey</button></div></div></div></aside>;
}

function DirectionScreen({ brief, setBrief, copy, palette, heroImage, options, selectedId, setSelectedId, loading, blocks, status, back, build, hasDraft, generationAttempts, unlimitedAi, returnToEditor }: { brief: Brief; setBrief: (brief: Brief) => void; copy: SiteCopy; palette: PaletteChoice; heroImage: string; options: DirectionOption[]; selectedId: string; setSelectedId: (id: string) => void; loading: boolean; blocks: string[]; status: string; back: () => void; build: () => void; hasDraft: boolean; generationAttempts: number; unlimitedAi: boolean; returnToEditor: () => void }) {
  return <div><ShellHeader step={4} title="Choose your website direction" subtitle="These are complete page systems that fit the information you supplied. Your choice changes the whole visitor journey, not only the opening image." />
    <div className="mx-auto max-w-[1320px] space-y-6 p-6 md:p-10">
      {!loading && options.length > 0 && <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"><span className="font-bold text-foreground">Your three strongest matches.</span> The builder checked all eight design systems and removed any that could not be completed properly from your information and assets.</div>}
      {loading && <div className="flex min-h-72 items-center justify-center rounded-2xl border border-border bg-card"><div className="text-center"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" /><div className="mt-4 font-bold">Checking content, images and conversion route</div><p className="mt-2 text-sm text-muted-foreground">We only show designs your brief can complete properly.</p></div></div>}
      {!loading && blocks.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><div className="font-black text-amber-950">A few essentials are still missing</div><p className="mt-2 text-sm text-amber-900">Add these before the portal recommends a complete design:</p><ul className="mt-4 space-y-2 text-sm text-amber-950">{blocks.map((block) => <li key={block} className="flex gap-2"><span>•</span>{block}</li>)}</ul></section>}
      {!loading && options.length > 0 && <div className="grid gap-5 lg:grid-cols-3">{options.map((item) => {
        const active = selectedId === item.id;
        const imageLight = item.assetMode === "image-light";
        return <button key={item.id} onClick={() => setSelectedId(item.id)} className={cn("overflow-hidden rounded-2xl border-2 bg-card text-left transition", active ? "border-primary shadow-[0_18px_55px_rgba(239,22,47,.13)]" : "border-transparent ring-1 ring-[#dfe2e5] hover:ring-[#aeb3b9]")}>
          <DirectionThumbnail option={item} copy={copy} brief={brief} heroImage={heroImage} accent={palette.accent} imageLight={imageLight} />
          <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-sans text-lg font-bold">{item.name}</h3><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.lengthMode} · {item.assetMode.replace("-", " ")}</div></div>{active && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">{item.description}</p><div className="mt-4 rounded-xl bg-secondary p-3 text-xs leading-5"><strong>Built to help visitors:</strong> {item.visitorJob}</div>{item.warnings.length > 0 && <p className="mt-3 text-[11px] leading-5 text-muted-foreground">{item.warnings[0]}</p>}</div>
        </button>;
      })}</div>}
      <section className="rounded-2xl border border-border bg-card p-6"><div className="grid gap-6 lg:grid-cols-[1fr_1fr]"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Page plan</div><h2 className="mt-2 text-2xl font-black">Built around {brief.goal.toLowerCase()}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The page length adapts to the evidence supplied. Empty or unsupported sections are removed instead of filled with generic copy.</p><div className="mt-4 flex flex-wrap gap-2">{(brief.sections || []).map((section) => <span key={section} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold capitalize">{section}</span>)}</div></div><div className="rounded-xl bg-secondary p-5"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={brief.banner} onChange={(event) => setBrief({ ...brief, banner: event.target.checked })} className="mt-1 accent-[#ef162f]" /><span><span className="text-sm font-bold">Announcement banner</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Use only for a real opening, launch or time-sensitive offer.</span></span></label>{brief.banner && <input value={brief.bannerText} onChange={(event) => setBrief({ ...brief, bannerText: event.target.value })} placeholder="Example: Three coaching places available this month" className="mt-4 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-border" />}</div></div></section>
      {/(failed|could not|try again|loading)/i.test(status) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">{status}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={back} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button><div className="flex flex-wrap items-center gap-3">{hasDraft && <button onClick={returnToEditor} className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold">Return to my current draft</button>}<button onClick={build} disabled={(!unlimitedAi && generationAttempts >= 2) || loading || options.length === 0 || !selectedId} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_10px_28px_rgba(239,22,47,.22)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">{hasDraft ? "Generate this direction" : "Build my website"}<ArrowRight className="h-4 w-4" /></button><span className="text-xs text-muted-foreground">{unlimitedAi ? "Owner testing mode. Customer allowances are not applied to this account." : `${Math.max(0, 2 - generationAttempts)} AI drafts remaining. Design controls and manual edits use no AI.`}</span></div></div>
    </div></div>;
}

function DirectionThumbnail({ option, copy, brief, heroImage, accent, imageLight }: { option: DirectionOption; copy: SiteCopy; brief: Brief; heroImage: string; accent: string; imageLight: boolean }) {
  const id = option.id;
  if (id === "editorial-studio") return <div className="grid h-64 grid-cols-[1fr_.8fr] bg-[#f2eee6] text-[#20211e]"><div className="flex flex-col justify-center p-6"><span className="text-[8px] uppercase tracking-[.22em] text-[#7b6658]">Editorial studio</span><div className="mt-4 font-serif text-3xl leading-[.95]">{copy.headline}</div><span className="mt-6 text-[9px] uppercase tracking-wider">{brief.goal} →</span></div><div className="relative overflow-hidden bg-[#c9c2b5]">{!imageLight && <img src={heroImage} alt="" className="h-full w-full object-cover" />}</div></div>;
  if (id === "digital-momentum") return <div className="relative h-64 overflow-hidden bg-[#090b18] p-6 text-white"><div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#6048ff]/35 blur-2xl" /><span className="relative text-[8px] uppercase tracking-[.22em] text-[#b7ff38]">Digital momentum</span><div className="relative mt-5 max-w-[90%] text-4xl font-black uppercase leading-[.82] tracking-[-.06em]">{copy.headline}</div><div className="absolute bottom-5 left-6 right-6 grid grid-cols-3 gap-2">{[1,2,3].map((n) => <div key={n} className="h-10 border border-white/15 bg-white/5" />)}</div></div>;
  if (id === "documentary-performance") return <div className="relative h-64 overflow-hidden bg-black text-white">{!imageLight && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover grayscale opacity-70" />}<div className="absolute inset-0 bg-gradient-to-t from-black via-transparent" /><div className="absolute bottom-5 left-5 max-w-[80%]"><span className="text-[8px] uppercase tracking-[.2em]" style={{ color: accent }}>Documentary performance</span><div className="mt-3 text-3xl font-black uppercase leading-[.86]">{copy.headline}</div></div></div>;
  if (id === "precision-practice") return <div className="h-64 border-y-2 border-black bg-[#f3f2ee] text-black"><div className="grid h-full grid-cols-[36px_1fr_90px]"><div className="border-r-2 border-black p-2 text-[7px] [writing-mode:vertical-rl]">CASE FILE / 01</div><div className="flex flex-col justify-center p-5"><span className="text-[8px] uppercase tracking-[.2em]" style={{ color: accent }}>Precision practice</span><div className="mt-4 text-3xl font-black uppercase leading-[.9]">{copy.headline}</div></div><div className="border-l-2 border-black bg-white p-3"><div className="h-2 w-full bg-black" /><div className="mt-5 space-y-3">{[1,2,3].map((n) => <div key={n} className="h-px bg-black/30" />)}</div></div></div></div>;
  if (id === "community-schedule") return <div className="h-64 border-y-2 border-black bg-[#ff6047] p-5 text-black"><span className="text-[8px] font-black uppercase tracking-[.2em]">Community schedule</span><div className="mt-4 text-4xl font-black uppercase leading-[.82]">{copy.headline}</div><div className="mt-6 grid grid-cols-3 border-2 border-black">{["#ffd33d","#8cd5ff","#91df9b"].map((colour) => <div key={colour} className="h-12 border-r-2 border-black last:border-r-0" style={{ background: colour }} />)}</div></div>;
  if (id === "private-catalogue") return <div className="grid h-64 grid-cols-[1fr_.65fr] bg-[#f4f1e9] p-6 text-[#24221e]"><div className="flex flex-col justify-center"><span className="text-[8px] uppercase tracking-[.2em] text-black/45">Private catalogue</span><div className="mt-4 font-serif text-3xl leading-none">{copy.headline}</div><span className="mt-6 text-[8px] uppercase tracking-[.16em]">By appointment →</span></div><div className="relative my-4 overflow-hidden bg-[#d6d0c3]">{!imageLight && <img src={heroImage} alt="" className="h-full w-full object-cover" />}<div className="absolute inset-2 border border-white/60" /></div></div>;
  if (id === "campaign-launch") return <div className="relative h-64 border-y-2 border-black bg-[#fff8e7] p-5 text-black"><div className="absolute right-4 top-4 rotate-6 rounded-full border-2 border-black bg-[#ffd53d] px-3 py-5 text-[7px] font-black uppercase">Focused offer</div><span className="text-[8px] font-black uppercase tracking-[.2em]">Campaign launch</span><div className="mt-5 max-w-[84%] text-4xl font-black uppercase leading-[.82]">{copy.headline}</div><div className="absolute bottom-0 left-0 right-0 h-10 border-t-2 border-black bg-[#ff4937]" /></div>;
  return <div className="relative h-64 bg-[#1d3026] p-6 text-white"><span className="text-[8px] uppercase tracking-[.2em]" style={{ color: accent }}>Guided personal</span><div className="mt-5 font-serif text-3xl leading-none">{copy.headline}</div></div>;
}

function BuildingScreen({ brief, palette, copy, heroImage, index }: { brief: Brief; palette: PaletteChoice; copy: SiteCopy; heroImage: string; index: number }) {
  const progress = Math.round(((index + 1) / buildStages.length) * 100);
  return <div><ShellHeader title="Preparing your website preview" subtitle="We are writing and arranging your page from the information and evidence you supplied." />
    <div className="mx-auto max-w-[1320px] p-6 md:p-10"><section className="rounded-2xl border border-border bg-card p-6 md:p-8"><div className="flex items-center justify-between gap-5"><div><div className="text-xs font-bold text-muted-foreground">Stage {index + 1} of {buildStages.length}</div><h2 className="mt-2 text-2xl font-black">{buildStages[index][0]}</h2></div><div className="text-3xl font-black">{progress}%</div></div><div className="mt-6 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_340px]"><div><div className="rounded-2xl bg-secondary p-6"><div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground"><RefreshCw className="h-5 w-5 animate-spin" /></div><div><div className="font-bold">{buildStages[index][0]}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{buildStages[index][1]}</p></div></div></div><div className="mt-5 overflow-hidden rounded-2xl border border-border bg-secondary p-5"><div className="grid gap-4 md:grid-cols-[1fr_190px]"><div className="relative min-h-72 overflow-hidden rounded-xl"><img src={heroImage} className="absolute inset-0 h-full w-full object-cover opacity-60" alt="Website being created" /><div className="absolute inset-0" style={{ background: `linear-gradient(90deg,${palette.dark},transparent)` }} /><div className="relative z-10 max-w-md p-8 text-white"><div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: palette.accent }}>{brief.businessName || "Your business"}</div><div className="mt-4 text-4xl font-black leading-[.92]">{copy.headline}</div><div className="mt-5 h-9 w-28 rounded-lg" style={{ background: palette.accent }} /></div></div><div className="relative mx-auto mt-8 h-64 w-32 overflow-hidden rounded-[24px] border-4 border-border"><img src={heroImage} className="absolute inset-0 h-full w-full object-cover opacity-60" alt="Mobile preview" /><div className="absolute inset-0 bg-black/45" /><div className="relative z-10 p-4 pt-16 text-white"><div className="text-xl font-black leading-none">{copy.headline}</div><div className="mt-5 h-8 rounded-md" style={{ background: palette.accent }} /></div></div></div></div></div>
        <aside><div className="rounded-2xl border border-border p-5"><div className="text-sm font-black">Personalising for your business</div><div className="mt-4 space-y-2">{[brief.businessName || "Your business", brief.mainService || "Your main service", brief.audience || "Your ideal customer", brief.goal, `${palette.name} direction`].map((item) => <div key={item} className="rounded-lg bg-secondary px-3 py-2.5 text-xs font-medium">{item}</div>)}</div></div><div className="mt-4 rounded-2xl bg-secondary p-5 text-white"><div className="text-xs font-bold">Saved to your account</div><p className="mt-2 text-xs leading-5 text-white/55">Your brief, design choices and generated draft remain available when you return.</p></div></aside></div></section></div>
  </div>;
}

function EditorScreen({ brief, setBrief, copy, generatedSections, updateSection, updateHighlight, palette, paletteId, setPaletteId, fontStyle, setFontStyle, heroImage, direction, compositionId, sitePlan, ownPhoto, replaceImage, removeImages, chooseHeroVariant, restoreGeneratedVersion, canRestoreGenerated, previewSize, setPreviewSize, selectedPart, setSelectedPart, updateCopy, aiPrompt, setAiPrompt, applyAiChange, aiChanges, unlimitedAi, approve, changeDirection, startFresh, startingFresh, generationAttempts, saved }: { brief: Brief; setBrief: (brief: Brief) => void; copy: SiteCopy; generatedSections: GeneratedSection[]; updateSection: (id: string, key: "eyebrow" | "title" | "body", value: string) => void; updateHighlight: (id: string, index: number, value: string) => void; palette: PaletteChoice; paletteId: string; setPaletteId: (id: string) => void; fontStyle: string; setFontStyle: (font: string) => void; heroImage: string; direction: number; compositionId: string; sitePlan: SitePlanV1; ownPhoto: boolean; replaceImage: () => void; removeImages: () => void; chooseHeroVariant: (variant: string) => void; restoreGeneratedVersion: () => void; canRestoreGenerated: boolean; previewSize: PreviewSize; setPreviewSize: (size: PreviewSize) => void; selectedPart: EditablePart; setSelectedPart: (part: EditablePart) => void; updateCopy: (part: EditablePart, value: string) => void; aiPrompt: string; setAiPrompt: (value: string) => void; applyAiChange: () => void; aiChanges: number; unlimitedAi: boolean; approve: () => void; changeDirection: () => void; startFresh: () => void; startingFresh: boolean; generationAttempts: number; saved: string }) {
  return <div className="min-h-screen bg-secondary"><div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-4"><div className="mr-auto"><div className="text-xl font-black tracking-tight">Review your website</div><div className="text-xs text-muted-foreground">Edit the hero and about text in the preview; edit the remaining sections in the right panel.</div></div><button onClick={startFresh} disabled={startingFresh} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-50"><RefreshCw className="h-4 w-4" />{startingFresh ? "Starting..." : "New website"}</button><div className="flex rounded-lg bg-secondary p-1">{([{ id: "desktop", icon: Monitor, label: "Desktop preview" }, { id: "tablet", icon: Tablet, label: "Tablet preview" }, { id: "mobile", icon: Smartphone, label: "Mobile preview" }] as const).map(({ id, icon: Icon, label }) => <button key={id} aria-label={label} onClick={() => setPreviewSize(id)} className={cn("rounded-md p-2", previewSize === id ? "bg-card text-muted-foreground shadow-sm" : "text-muted-foreground")}><Icon className="h-4 w-4" /></button>)}</div><div className="items-center gap-2 px-2 text-xs text-muted-foreground md:flex"><CheckCircle2 className="h-4 w-4 text-muted-foreground" />{saved}</div><button onClick={approve} className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-white">Approve website<ArrowRight className="h-4 w-4" /></button></div>
    <div className="grid min-h-[calc(100vh-77px)] xl:grid-cols-[1fr_340px]"><div className="overflow-auto p-5"><div className={cn("mx-auto overflow-hidden rounded-xl bg-card shadow-[0_25px_80px_rgba(25,27,30,.13)] transition-all", previewSize === "desktop" ? "max-w-[1120px]" : previewSize === "tablet" ? "max-w-[760px]" : "max-w-[390px]")}><WebsiteCanvas brief={brief} copy={copy} generatedSections={generatedSections} palette={palette} heroImage={heroImage} direction={direction} compositionId={compositionId} sitePlan={sitePlan} ownPhoto={ownPhoto} previewSize={previewSize} fontStyle={fontStyle} selectedPart={selectedPart} select={setSelectedPart} replaceImage={replaceImage} /></div></div>
      <aside className="border-l border-border bg-card p-5"><div className="flex items-center justify-between"><h2 className="text-base font-black">{selectedPart === "headline" ? "Hero headline" : selectedPart === "subheadline" ? "Hero description" : selectedPart === "button" ? "Primary button" : "About section"}</h2><X className="h-4 w-4 text-muted-foreground" /></div><div className="mt-6"><Field label="Edit text"><textarea value={copy[selectedPart]} onChange={(event) => updateCopy(selectedPart, event.target.value)} className="min-h-24 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-border" /></Field></div><button onClick={replaceImage} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left text-sm font-semibold"><div className="grid h-10 w-14 place-items-center overflow-hidden rounded-lg bg-secondary">{ownPhoto && heroImage ? <img src={heroImage} className="h-full w-full object-cover" alt="Current" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}</div>{ownPhoto ? "Replace hero image" : "Add an image"}</button>{ownPhoto && <button onClick={removeImages} className="mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Remove uploaded images</button>}
      <div className="mt-6 border-t pt-5"><Field label="Where should the main button go?" hint="Booking URL, mailto: email link, or tel: phone link."><TextInput value={brief.bookingLink} onChange={(value) => setBrief({ ...brief, bookingLink: value })} placeholder="https://..." /></Field>{brief.bookingLink && !safeLink(brief.bookingLink) && <p className="mt-2 text-xs text-red-700">This link is not valid yet.</p>}</div>
      <details className="mt-6 border-t pt-5"><summary className="cursor-pointer text-sm font-black">Evidence and FAQ</summary><div className="mt-4 space-y-4">{([['credentials', 'Qualifications'], ['results', 'Verified results'], ['testimonialQuote', 'Approved client quote'], ['testimonialName', 'Client name'], ['faqQuestion', 'Common question'], ['faqAnswer', 'Your answer']] as const).map(([key, label]) => <Field key={key} label={label}><textarea value={brief[key]} onChange={(event) => setBrief({ ...brief, [key]: event.target.value })} className="min-h-16 w-full rounded-xl border border-border p-3 text-sm" /></Field>)}</div></details>
      <div className="mt-6 border-t pt-5"><div className="text-sm font-black">Website style</div><div className="mt-3 grid grid-cols-4 gap-2">{palettes.map((item) => <button key={item.id} onClick={() => setPaletteId(item.id)} aria-label={`Use ${item.name} colours`} className={cn("h-9 rounded-lg border-2", paletteId === item.id ? "border-border" : "border-transparent")} style={{ background: `linear-gradient(135deg,${item.dark} 50%,${item.accent} 50%)` }} />)}</div><select value={fontStyle} onChange={(event) => setFontStyle(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-border px-3 text-sm"><option>Strong & modern</option><option>Premium editorial</option><option>Clean professional</option></select>{compositionId === "editorial-studio" && <div className="mt-4"><div className="text-xs font-semibold">Opening composition</div><div className="mt-2 grid grid-cols-3 gap-2">{[{ id: "typographic", label: "Type-led" }, { id: "split", label: "Split" }, { id: "immersive", label: "Image-led" }].map((option) => <button key={option.id} disabled={option.id === "immersive" && !ownPhoto} onClick={() => chooseHeroVariant(option.id)} className={cn("rounded-lg border px-2 py-2 text-xs font-semibold disabled:opacity-35", sitePlan.hero.variant === option.id ? "border-primary bg-primary/5" : "border-border")}>{option.label}</button>)}</div></div>}{compositionId === "digital-momentum" && <div className="mt-4"><div className="text-xs font-semibold">Opening composition</div><div className="mt-2 grid grid-cols-3 gap-2">{[{ id: "track", label: "Track" }, { id: "dashboard", label: "Dashboard" }, { id: "image-signal", label: "Image-led" }].map((option) => <button key={option.id} disabled={option.id === "image-signal" && !ownPhoto} onClick={() => chooseHeroVariant(option.id)} className={cn("rounded-lg border px-2 py-2 text-xs font-semibold disabled:opacity-35", sitePlan.hero.variant === option.id ? "border-primary bg-primary/5" : "border-border")}>{option.label}</button>)}</div></div>}{compositionId === "documentary-performance" && <div className="mt-4"><div className="text-xs font-semibold">Opening composition</div><div className="mt-2 grid grid-cols-3 gap-2">{[{ id: "dossier", label: "Dossier" }, { id: "full-bleed", label: "Full image" }, { id: "sequence", label: "Sequence" }].map((option) => <button key={option.id} disabled={option.id === "sequence" && sitePlan.assetMode !== "multiple"} onClick={() => chooseHeroVariant(option.id)} className={cn("rounded-lg border px-2 py-2 text-xs font-semibold disabled:opacity-35", sitePlan.hero.variant === option.id ? "border-primary bg-primary/5" : "border-border")}>{option.label}</button>)}</div></div>}{compositionId === "precision-practice" && <div className="mt-4"><div className="text-xs font-semibold">Opening composition</div><div className="mt-2 grid grid-cols-3 gap-2">{[{ id: "assessment", label: "Assessment" }, { id: "practitioner", label: "Practitioner" }, { id: "pathway", label: "Pathway" }].map((option) => <button key={option.id} disabled={option.id === "practitioner" && !ownPhoto} onClick={() => chooseHeroVariant(option.id)} className={cn("rounded-lg border px-2 py-2 text-xs font-semibold disabled:opacity-35", sitePlan.hero.variant === option.id ? "border-primary bg-primary/5" : "border-border")}>{option.label}</button>)}</div></div>}<button onClick={changeDirection} className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold">Explore other design families</button><p className="mt-2 text-xs text-muted-foreground">These design controls use no AI. A new generated draft uses one of your included drafts ({Math.max(0, 2 - generationAttempts)} remaining).</p></div>
      <div className="mt-6 border-t pt-5"><div className="text-sm font-black">Page sections</div><p className="mt-1 text-xs text-muted-foreground">Show or hide optional sections. Contact remains the final action.</p><div className="mt-3 space-y-2">{[...new Set([...generatedSections.map((section) => section.id), ...(brief.schedule ? ["schedule"] : [])])].filter((id) => id !== "contact").map((id) => <label key={id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm capitalize"><span>{id}</span><input type="checkbox" checked={brief.sections.includes(id)} onChange={(event) => setBrief({ ...brief, sections: event.target.checked ? [...new Set([...brief.sections, id])] : brief.sections.filter((item) => item !== id) })} /></label>)}</div>{generatedSections.filter((section) => ["services", "approach", "about", "contact"].includes(section.id)).map((section) => <details key={section.id} className="mt-3 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold capitalize">Edit {section.id}</summary><label className="mt-4 block text-xs font-semibold">Small label<input value={section.eyebrow || ""} onChange={(event) => updateSection(section.id, "eyebrow", event.target.value)} className="mt-2 w-full rounded-lg border border-border p-2 text-sm font-normal" /></label><label className="mt-3 block text-xs font-semibold">Heading<input value={section.title} onChange={(event) => updateSection(section.id, "title", event.target.value)} className="mt-2 w-full rounded-lg border border-border p-2 text-sm font-normal" /></label><label className="mt-3 block text-xs font-semibold">Text<textarea value={section.id === "about" ? copy.about : section.body} onChange={(event) => section.id === "about" ? updateCopy("about", event.target.value) : updateSection(section.id, "body", event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-border p-2 text-sm font-normal" /></label>{section.highlights?.map((highlight, index) => <label key={index} className="mt-3 block text-xs font-semibold">{section.id === "approach" ? "Step" : "Card"} {index + 1}<textarea value={highlight} onChange={(event) => updateHighlight(section.id, index, event.target.value)} className="mt-2 min-h-16 w-full rounded-lg border border-border p-2 text-sm font-normal" /></label>)}</details>)}{canRestoreGenerated && <button onClick={restoreGeneratedVersion} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold"><RotateCcw className="h-4 w-4" />Restore generated version</button>}</div>
      <div className="mt-6 rounded-2xl border border-border bg-secondary p-4"><div className="flex items-center gap-2 text-sm font-black"><Sparkles className="h-4 w-4 text-muted-foreground" />Apply a copy edit</div><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Make this feel warmer without adding new claims." className="mt-3 min-h-24 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none" /><div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{unlimitedAi ? "Owner testing mode" : `${aiChanges} assisted edits remaining`}</span><button aria-label="Apply copy edit" onClick={applyAiChange} disabled={!aiPrompt.trim() || aiChanges <= 0} className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-white disabled:opacity-35"><ArrowRight className="h-4 w-4" /></button></div></div></aside></div>
  </div>;
}

function WebsiteCanvas({ brief, copy, generatedSections, palette, heroImage, direction, compositionId, sitePlan, ownPhoto, previewSize, fontStyle, selectedPart, select, replaceImage, editable = true }: { brief: Brief; copy: SiteCopy; generatedSections: GeneratedSection[]; palette: PaletteChoice; heroImage: string; direction: number; compositionId: string; sitePlan?: SitePlanV1; ownPhoto: boolean; previewSize: PreviewSize; fontStyle: string; selectedPart: EditablePart; select: (part: EditablePart) => void; replaceImage: () => void; editable?: boolean }) {
  const narrow = previewSize === "mobile";
  if (compositionId === "guided-personal") {
    return <GuidedPersonalSite brief={brief} copy={copy} sections={generatedSections} heroImage={heroImage} useImage={ownPhoto} accent={palette.accent === "#ef162f" ? "#e0bca9" : palette.accent} narrow={narrow} editable={editable} selectedPart={selectedPart} onSelect={select} onReplaceImage={replaceImage} />;
  }
  if (["editorial-studio", "digital-momentum", "documentary-performance", "precision-practice", "community-schedule", "private-catalogue", "campaign-launch"].includes(compositionId)) {
    return <CompositionSite compositionId={compositionId} brief={brief} copy={copy} sections={generatedSections} heroImage={heroImage} useImage={ownPhoto} accent={palette.accent} paletteDark={palette.dark} paletteLight={palette.light} fontStyle={fontStyle} sitePlan={sitePlan} previewMode={previewSize} narrow={narrow} editable={editable} selectedPart={selectedPart} onSelect={select} onReplaceImage={replaceImage} />;
  }
  const selected = "relative outline outline-2 outline-offset-4 outline-[#ef162f]";
  const included = (brief.sections || initialBrief.sections).filter((id) => id !== "approach" || generatedSections.some((section) => section.id === id));
  const editorial = fontStyle === "Premium editorial";
  const service = brief.mainService || "Personal coaching";
  const generated = (id: string, title: string, body: string, eyebrow: string): GeneratedSection => generatedSections.find((section) => section.id === id) || { id, eyebrow, title, body, layout: "editorial" };
  const services = generated("services", service, brief.offer || `A thoughtful way to get started with ${service.toLowerCase()}.`, "What we offer");
  const approach = generated("approach", "A simple first step.", brief.process || "Tell us what you are working towards, and we will help you find the right way to begin.", "Getting started");
  const about = { ...generated("about", `Meet ${brief.businessName || "your coach"}.`, copy.about, "The people behind the work"), body: copy.about };
  const contact = generated("contact", "Ready to begin?", brief.offer || "Take the first step towards your goals.", "Your next step");
  return <div className={cn("website-canvas", narrow && "website-canvas-narrow")} style={{ color: palette.dark, background: palette.light }}>
    <style>{`.website-canvas h1{font-size:3.75rem!important;overflow-wrap:normal;word-break:normal}.website-canvas-narrow h1{font-size:3rem!important}`}</style>
    {brief.banner && brief.bannerText && <div className="px-4 py-2 text-center text-xs font-bold text-white" style={{ background: palette.accent }}>{brief.bannerText}</div>}
    <nav className="flex items-center justify-between px-7 py-5 text-white" style={{ background: palette.dark }}><div className={cn("text-sm tracking-[.12em]", editorial ? "font-serif text-lg" : "font-black uppercase")}>{brief.businessName || "Your Business"}</div>{!narrow && <div className="flex items-center gap-6 text-[10px] font-semibold">{included.includes("services") && <span>{offerLabel(brief.businessType)}</span>}{included.includes("about") && <span>About</span>}{included.includes("results") && (brief.credentials || brief.results) && <span>Results</span>}<span className="rounded-lg px-4 py-2 text-white" style={{ background: palette.accent }}>{copy.button}</span></div>}</nav>
    <section className={cn("relative overflow-hidden", direction === 3 || direction === 2 && !narrow ? "text-slate-950" : "text-white", narrow ? "min-h-[610px]" : "min-h-[570px]")} style={{ background: direction === 3 || direction === 2 && !narrow ? palette.light : palette.dark }}>{heroImage && (editable ? <button onClick={replaceImage} className={cn("absolute h-full", direction === 2 && !narrow ? "right-0 w-[56%]" : direction === 3 ? narrow ? "inset-x-0 top-0 h-[300px] w-full" : "inset-x-0 top-0 h-[400px] w-full" : "inset-0 w-full")}><img src={heroImage} className="h-full w-full object-cover opacity-72" alt="Hero" /></button> : <img src={heroImage} className={cn("absolute h-full object-cover opacity-72", direction === 2 && !narrow ? "right-0 w-[56%]" : direction === 3 ? narrow ? "inset-x-0 top-0 h-[300px] w-full" : "inset-x-0 top-0 h-[400px] w-full" : "inset-0 w-full")} alt="Hero" />)}<div className="absolute inset-0" style={{ background: direction === 2 && !narrow ? `linear-gradient(90deg,${palette.light} 0%,${palette.light}fa 45%,${palette.light}55 70%,transparent 82%)` : direction === 3 ? `linear-gradient(0deg,${palette.light} 0%,${palette.light} 55%,transparent 85%)` : direction === 1 ? `linear-gradient(0deg,${palette.dark}db,${palette.dark}44)` : `linear-gradient(90deg,${palette.dark} 5%,${palette.dark}e8 45%,${palette.dark}22)` }} /><div className={cn("relative z-10 flex min-h-[570px] flex-col justify-center", narrow ? direction === 3 ? "px-7 pt-[270px] pb-10" : "px-7" : direction === 1 ? "mx-auto max-w-[78%] items-center px-14 text-center" : direction === 2 ? "max-w-[55%] px-14" : direction === 3 ? "max-w-[85%] px-14 pt-[360px] pb-14" : "max-w-[70%] px-14")}><div className="text-[9px] font-bold uppercase tracking-[.24em]" style={{ color: palette.accent }}>{service}</div><button disabled={!editable} onClick={() => select("headline")} className={cn("mt-5", direction === 1 ? "text-center" : "text-left", editable && selectedPart === "headline" && selected)}><h1 className={cn("break-words leading-[.9] tracking-[-.055em]", narrow ? "text-5xl" : "text-7xl", editorial ? "font-serif font-semibold normal-case" : "font-sans font-black")}>{copy.headline}</h1>{editable && selectedPart === "headline" && <span className="absolute -top-9 left-0 inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-white"><Pencil className="h-3 w-3" />Edit text</span>}</button><button disabled={!editable} onClick={() => select("subheadline")} className={cn("mt-5 max-w-xl text-sm leading-6", direction === 3 || direction === 2 && !narrow ? "text-slate-700" : "text-white/80", direction === 1 ? "text-center" : "text-left", editable && selectedPart === "subheadline" && selected)}>{copy.subheadline}</button><button disabled={!editable} onClick={() => select("button")} className={cn("mt-7 w-fit rounded-xl px-5 py-3.5 text-sm font-bold text-white", editable && selectedPart === "button" && selected)} style={{ background: palette.accent }}>{copy.button}<ArrowRight className="ml-2 inline h-4 w-4" /></button></div></section>
    {included.includes("services") && <section id="services" className={cn("p-10 md:p-14", services.layout === "statement" && "text-center", services.layout === "split" && !narrow && "grid grid-cols-2 gap-x-10")} style={{ background: "white" }}><div className={cn("text-[9px] font-bold uppercase tracking-[.22em]", services.layout === "split" && !narrow && "col-span-2")} style={{ color: palette.accent }}>{sectionEyebrow("services", services.eyebrow || "What we offer", brief.businessType)}</div><h2 className={cn("mt-4 text-4xl", editorial ? "font-serif" : "font-black")}>{services.title}</h2><p className={cn("mt-4 max-w-2xl text-sm leading-7 text-muted-foreground", services.layout === "statement" && "mx-auto")}>{services.body}</p>{services.highlights?.length ? <div className={cn("mt-10 grid gap-4 text-left", narrow ? "grid-cols-1" : "grid-cols-3", services.layout === "split" && "col-span-2")}>{services.highlights.map((item, index) => <div key={index} className="min-h-36 rounded-2xl border border-black/10 p-6"><div className="mb-7 text-xs font-bold" style={{ color: palette.accent }}>0{index + 1}</div><div className="text-lg font-semibold leading-snug">{item}</div></div>)}</div> : null}</section>}
    {included.includes("approach") && <section id="approach" className={cn("p-10 md:p-14", approach.layout === "statement" && "text-center", approach.layout === "split" && !narrow && "grid grid-cols-2 gap-x-10")} style={{ background: palette.light }}><div className={cn("text-[9px] font-bold uppercase tracking-[.22em]", approach.layout === "split" && !narrow && "col-span-2")} style={{ color: palette.accent }}>{approach.eyebrow || "Getting started"}</div><h2 className={cn("mt-4 text-4xl", editorial ? "font-serif" : "font-black")}>{approach.title}</h2><p className={cn("mt-4 max-w-2xl text-sm leading-7 text-muted-foreground", approach.layout === "statement" && "mx-auto")}>{approach.body}</p>{approach.highlights?.length ? <ol className={cn("mt-10 grid gap-4 text-left", narrow ? "grid-cols-1" : "grid-cols-3", approach.layout === "split" && "col-span-2")}>{approach.highlights.map((item, index) => <li key={index} className="min-h-36 rounded-2xl border border-black/10 bg-white p-6"><div className="mb-7 text-xs font-bold" style={{ color: palette.accent }}>0{index + 1}</div><div className="text-lg leading-snug">{item}</div></li>)}</ol> : null}</section>}
    {included.includes("about") && <section className={cn("p-10 md:p-14", about.layout === "statement" && "text-center", about.layout === "split" && !narrow && "grid grid-cols-2 gap-x-10")}><div className={cn("text-[9px] font-bold uppercase tracking-[.22em]", about.layout === "split" && !narrow && "col-span-2")} style={{ color: palette.accent }}>{about.eyebrow || "The people behind the work"}</div><h2 className={cn("mt-4 text-4xl leading-tight", editorial ? "font-serif" : "font-black")}>{about.title}</h2><button disabled={!editable} onClick={() => select("about")} className={cn("mt-4 text-left text-sm leading-7 text-muted-foreground", about.layout === "statement" && "mx-auto max-w-2xl text-center", editable && selectedPart === "about" && selected)}>{about.body}</button></section>}
    {included.includes("results") && (brief.credentials || brief.results) && <section className="p-10 md:p-14" style={{ background: palette.dark, color: "white" }}><div className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color: palette.accent }}>Reasons to trust us</div><h2 className={cn("mt-4 text-4xl", editorial ? "font-serif" : "font-black")}>Experience you can see.</h2><div className={cn("mt-8 grid gap-4", narrow ? "grid-cols-1" : "grid-cols-2")}>{brief.credentials && <div className="border-l-2 pl-5 text-sm leading-6" style={{ borderColor: palette.accent }}>{brief.credentials}</div>}{brief.results && <div className="border-l-2 pl-5 text-sm leading-6" style={{ borderColor: palette.accent }}>{brief.results}</div>}</div></section>}
    {included.includes("testimonial") && brief.testimonialQuote && <section className="p-10 md:p-14" style={{ background: "white" }}><div className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color: palette.accent }}>From our clients</div><blockquote className={cn("mt-6 max-w-4xl text-3xl leading-snug", editorial ? "font-serif" : "font-semibold")}>“{withoutOuterQuotes(brief.testimonialQuote)}”</blockquote>{brief.testimonialName && <div className="mt-5 text-sm font-bold">{brief.testimonialName}</div>}</section>}
    {included.includes("faq") && brief.faqQuestion && brief.faqAnswer && <section id="faq" className="p-10 md:p-14" style={{ background: palette.light }}><div className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color: palette.accent }}>Good to know</div><h2 className={cn("mt-4 text-4xl", editorial ? "font-serif" : "font-black")}>Your questions, answered.</h2><div className="mt-7 max-w-3xl border-t pt-5"><h3 className="font-bold">{brief.faqQuestion}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{brief.faqAnswer}</p></div></section>}
    {included.includes("contact") && <section id="contact" className="p-10 text-center md:p-16" style={{ background: palette.accent, color: "white" }}><div className="mb-3 text-[9px] font-bold uppercase tracking-[.22em]">{contact.eyebrow || "Your next step"}</div><h2 className={cn("text-4xl", editorial ? "font-serif" : "font-black")}>{contact.title}</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-6">{contact.body}</p><div className="mx-auto mt-6 w-fit rounded-lg bg-card px-6 py-3 text-sm font-bold" style={{ color: palette.dark }}>{copy.button}</div></section>}
  </div>;
}

function WebCard({ title, text }: { title: string; text: string }) { return <div className="rounded-xl bg-secondary p-5"><div className="font-bold">{title}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p></div>; }

function DeliveryScreen({ brief, copy, generatedSections, palette, fontStyle, heroImage, direction, compositionId, sitePlan, ownPhoto, edit, download }: { brief: Brief; copy: SiteCopy; generatedSections: GeneratedSection[]; palette: PaletteChoice; fontStyle: string; heroImage: string; direction: number; compositionId: string; sitePlan: SitePlanV1; ownPhoto: boolean; edit: () => void; download: () => void }) {
  const [publishingPath, setPublishingPath] = useState<"guide" | "hosting" | "developer" | null>(null);
  return <div><ShellHeader step={5} title="Your website is ready" subtitle="Your approved website, files and publishing guidance are available below." />
    <div className="mx-auto max-w-[1320px] space-y-6 p-6 md:p-10"><section className="grid overflow-hidden rounded-[26px] border border-border bg-card xl:grid-cols-[1fr_420px]"><div className="bg-secondary p-5"><div className="overflow-hidden rounded-xl shadow-xl"><WebsiteCanvas brief={brief} copy={copy} generatedSections={generatedSections} palette={palette} heroImage={heroImage} direction={direction} compositionId={compositionId} sitePlan={sitePlan} ownPhoto={ownPhoto} previewSize="desktop" fontStyle={fontStyle} selectedPart="headline" select={() => undefined} replaceImage={() => undefined} editable={false} /></div></div><aside className="p-7"><div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted-foreground"><Check className="h-6 w-6" /></div><h2 className="mt-5 text-3xl font-black tracking-tight">Approved and prepared</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Your final website belongs to you. The download is an HTML file, not a live hosted website.</p><button onClick={download} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-4 text-sm font-bold text-white"><Download className="h-4 w-4" />Download website HTML</button><button onClick={edit} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-5 py-3.5 text-sm font-semibold"><Pencil className="h-4 w-4" />Return to editor</button><p className="mt-4 text-xs leading-5 text-muted-foreground">{ownPhoto ? "Your uploaded hero image is embedded inside the downloaded file." : "This design is image-light, so it remains complete without stock photography."}</p><div className="mt-7 border-t pt-6"><div className="text-sm font-black">How would you like to publish?</div><div className="mt-3 space-y-2"><DeliveryChoice icon={CircleHelp} title="Guide me through it" onClick={() => setPublishingPath("guide")} selected={publishingPath === "guide"} /><DeliveryChoice icon={Globe2} title="I already have hosting" onClick={() => setPublishingPath("hosting")} selected={publishingPath === "hosting"} /><DeliveryChoice icon={FileArchive} title="Give it to my developer" onClick={() => setPublishingPath("developer")} selected={publishingPath === "developer"} /></div>{publishingPath && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6"><strong>{publishingPath === "guide" ? "A simple route to a live page" : publishingPath === "hosting" ? "Using your existing provider" : "Developer hand-off"}</strong><p className="mt-2 text-muted-foreground">{publishingPath === "guide" ? "Download the HTML, open it on your computer to check the final version, then upload it to a static website host. The host gives you a web address; connecting your own domain is an optional final step. Hosting is a separate service and is not included in this purchase." : publishingPath === "hosting" ? "Download the HTML and ask your hosting provider how to publish a standalone static page. Some builders, including WordPress and Squarespace, do not accept a complete HTML page as a one-click replacement. Keep your existing site unchanged until you have tested the new page at a separate address." : "Download the HTML and send that file to your developer with your preferred domain, booking destination and any final copy changes. They can publish it on your hosting and test the form or booking link. You do not need to share hosting passwords inside this portal."}</p></div>}</div></aside></section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><BuildCheck title="Visual presentation" text="Colour, typography, imagery and spacing applied consistently." /><BuildCheck title="Visitor journey" text="Primary service and action established above the fold." /><BuildCheck title="Mobile presentation" text="Responsive layout prepared for phones and tablets." /><BuildCheck title="SEO foundations" text="Title, description, headings and image text prepared." /></section></div>
  </div>;
}

function DeliveryChoice({ icon: Icon, title, onClick, selected }: { icon: typeof Home; title: string; onClick: () => void; selected: boolean }) { return <button onClick={onClick} aria-pressed={selected} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold", selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}><Icon className="h-4 w-4 text-muted-foreground" />{title}<ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" /></button>; }
function BuildCheck({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /><div className="mt-4 text-sm font-black">{title}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p></div>; }

function LockedModal({ product, close }: { product: string; close: () => void }) {
  const descriptions: Record<string, string> = { "Extra Pages": "Expand the one-page website with connected pages selected for your business.", "Campaign Studio": "Create personalised promotions using the business, audience, offer and voice already saved in the portal.", "Meta Ad Launch Pack": "Turn a selected campaign into personalised Meta ad copy, creative directions and launch materials.", "Help Centre": "Publishing guides, editing help and practical answers will live here." };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-card p-7 shadow-2xl"><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-muted-foreground"><Lock className="h-5 w-5" /></div><button onClick={close} className="p-2 text-muted-foreground"><X className="h-5 w-5" /></button></div><div className="mt-6 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Available separately</div><h2 className="mt-2 text-2xl font-black">{product}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{descriptions[product]}</p><div className="mt-6 rounded-xl bg-secondary p-4 text-xs leading-5 text-muted-foreground">This product uses the same saved business profile, offer and brand direction as your website.</div><button onClick={close} className="mt-6 w-full rounded-xl bg-secondary py-3 text-sm font-bold text-white">Return to my website</button></div></div>;
}

