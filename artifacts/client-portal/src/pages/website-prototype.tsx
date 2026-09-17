import { useEffect, useMemo, useRef, useState } from "react";
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
  Monitor,
  Palette,
  Pencil,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Stage = "home" | "brief" | "content" | "style" | "direction" | "building" | "editor" | "delivery";
type StyleMode = "recommend" | "choose" | "brand";
type PreviewSize = "desktop" | "tablet" | "mobile";
type EditablePart = "headline" | "subheadline" | "about" | "button";

type Brief = {
  businessName: string;
  businessType: string;
  mainService: string;
  audience: string;
  location: string;
  goal: string;
  context: string;
  bookingLink: string;
  banner: boolean;
  bannerText: string;
  offer: string;
  differentiator: string;
  credentials: string;
  results: string;
  testimonialQuote: string;
  testimonialName: string;
  process: string;
  faqQuestion: string;
  faqAnswer: string;
  sections: string[];
};

type SiteCopy = {
  headline: string;
  subheadline: string;
  about: string;
  button: string;
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
  ["Reviewing your approved brief", "Checking your services, audience, location and primary objective."],
  ["Clarifying your positioning", "Identifying what should make your business credible and memorable."],
  ["Planning the visitor journey", "Ordering each section around the action you want visitors to take."],
  ["Creating your first impression", "Developing the headline, hero image and call to action above the fold."],
  ["Writing your website", "Preparing your services, story, proof, FAQs and calls to action."],
  ["Building your visual system", "Applying your colours, typography, imagery and spacing consistently."],
  ["Preparing responsive layouts", "Adapting the page for phones, tablets, laptops and larger screens."],
  ["Adding SEO foundations", "Creating clear titles, headings, descriptions and image text."],
  ["Checking performance", "Compressing imagery, validating links and reducing unnecessary page weight."],
  ["Final presentation review", "Checking visual balance, customer details and overall polish."],
];

const pageSections = [
  { id: "services", name: "Services", purpose: "Show exactly what customers can buy or book." },
  { id: "approach", name: "How it works", purpose: "Make the first steps feel simple." },
  { id: "about", name: "About the coach or studio", purpose: "Put a real person and method behind the offer." },
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
  location: "",
  goal: "Book a consultation",
  context: "",
  bookingLink: "",
  banner: false,
  bannerText: "",
  offer: "",
  differentiator: "",
  credentials: "",
  results: "",
  testimonialQuote: "",
  testimonialName: "",
  process: "",
  faqQuestion: "",
  faqAnswer: "",
  sections: ["services", "approach", "about", "results", "testimonial", "faq", "contact"],
};

const defaultCopy: SiteCopy = {
  headline: "Build strength that lasts",
  subheadline: "Personal coaching, a clear plan and support that fits real life.",
  about: "Build strength, confidence and consistency with coaching shaped around your experience, schedule and goals.",
  button: "Book a consultation",
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char] || char);
}

export default function WebsitePrototypePage() {
  const resetRequested = new URLSearchParams(window.location.search).get("reset") === "1";
  const [stage, setStage] = useState<Stage>(() => resetRequested ? "home" : readStored("ftk-stage", "home"));
  const [brief, setBrief] = useState<Brief>(() => resetRequested ? initialBrief : { ...initialBrief, ...readStored("ftk-brief", initialBrief) });
  const [styleMode, setStyleMode] = useState<StyleMode>(() => readStored("ftk-style-mode", "recommend"));
  const [moods, setMoods] = useState<string[]>(["Bold", "Premium"]);
  const [paletteId, setPaletteId] = useState(() => readStored("ftk-palette-id", suggestedLook(brief.businessType)));
  const [fontStyle, setFontStyle] = useState(() => readStored("ftk-font-style", designLooks.find((look) => look.id === paletteId)?.font || "Strong & modern"));
  const [surface, setSurface] = useState("Mostly dark");
  const [direction, setDirection] = useState(0);
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [copy, setCopy] = useState<SiteCopy>(() => readStored("ftk-copy", defaultCopy));
  const [selectedPart, setSelectedPart] = useState<EditablePart>("headline");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiChanges, setAiChanges] = useState(10);
  const [buildIndex, setBuildIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState("https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1800&q=85");
  const [ownPhoto, setOwnPhoto] = useState(false);
  const [savedLabel, setSavedLabel] = useState("Saved");
  const [showLocked, setShowLocked] = useState<string | null>(null);
  const [brandColour, setBrandColour] = useState("#ef162f");
  const uploadRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const palette = useMemo(() => {
    if (styleMode === "brand") return { ...palettes[0], id: "brand", name: "Your Brand", accent: brandColour };
    if (styleMode === "recommend") return palettes.find((item) => item.id === paletteId) || palettes[0];
    return palettes.find((item) => item.id === paletteId) || palettes[0];
  }, [paletteId, styleMode, brandColour, brief.businessType]);

  useEffect(() => {
    if (resetRequested) {
      ["ftk-stage", "ftk-last-stage", "ftk-brief", "ftk-style-mode", "ftk-copy", "ftk-palette-id", "ftk-font-style"].forEach((key) => localStorage.removeItem(key));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [resetRequested]);

  useEffect(() => {
    localStorage.setItem("ftk-stage", JSON.stringify(stage));
    if (stage !== "home") localStorage.setItem("ftk-last-stage", JSON.stringify(stage));
    localStorage.setItem("ftk-brief", JSON.stringify(brief));
    localStorage.setItem("ftk-style-mode", JSON.stringify(styleMode));
    localStorage.setItem("ftk-copy", JSON.stringify(copy));
    localStorage.setItem("ftk-palette-id", JSON.stringify(paletteId));
    localStorage.setItem("ftk-font-style", JSON.stringify(fontStyle));
    setSavedLabel("Saving...");
    const timer = window.setTimeout(() => setSavedLabel("Saved"), 350);
    return () => window.clearTimeout(timer);
  }, [stage, brief, styleMode, copy, paletteId, fontStyle]);

  useEffect(() => {
    if (stage !== "building") return;
    setBuildIndex(0);
    const timer = window.setInterval(() => {
      setBuildIndex((current) => {
        if (current >= buildStages.length - 1) {
          window.clearInterval(timer);
          window.setTimeout(() => setStage("editor"), 650);
          return current;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [stage]);

  const beginBuild = () => {
    const business = brief.businessName || "Your business";
    const service = brief.mainService || "personal coaching";
    const audience = brief.audience || "people who want lasting progress";
    setCopy({
      headline: direction === 1 ? `${business}, built around you` : direction === 2 ? `Move with purpose at ${business}` : `${service} for ${audience}`,
      subheadline: `${brief.offer || service} for ${audience}${brief.location ? ` in ${brief.location}` : ""}.`,
      about: brief.differentiator || `At ${business}, your experience, schedule and goals shape the way we work together.`,
      button: brief.goal || "Book a consultation",
    });
    setStage("building");
  };

  const reset = () => {
    ["ftk-stage", "ftk-last-stage", "ftk-brief", "ftk-style-mode", "ftk-copy", "ftk-palette-id", "ftk-font-style"].forEach((key) => localStorage.removeItem(key));
    window.location.assign(`${window.location.pathname}?reset=1`);
  };

  const updateCopy = (part: EditablePart, value: string) => setCopy((current) => ({ ...current, [part]: value }));

  const applyAiChange = () => {
    if (!aiPrompt.trim() || aiChanges <= 0) return;
    const request = aiPrompt.toLowerCase();
    setCopy((current) => {
      if (request.includes("warmer")) return { ...current, headline: "Feel stronger, supported and ready for more", subheadline: `Friendly ${brief.mainService || "personal coaching"} built around your life and your goals.` };
      if (request.includes("short")) return { ...current, headline: "Strength that lasts", subheadline: "Clear coaching. Real support. Sustainable progress." };
      if (request.includes("premium")) return { ...current, headline: "Personal coaching, elevated", subheadline: "A considered training experience designed around your performance and lifestyle." };
      return { ...current, [selectedPart]: `${current[selectedPart]} Refined around your goals.` };
    });
    setAiChanges((count) => count - 1);
    setAiPrompt("");
  };

  const handleAssets = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files);
    setUploadedFiles((current) => [...current, ...list.map((file) => file.name)]);
    const firstImage = list.find((file) => file.type.startsWith("image/"));
    if (firstImage) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setHeroImage(reader.result);
          setOwnPhoto(true);
        }
      };
      reader.readAsDataURL(firstImage);
    }
  };

  const downloadWebsite = () => {
    const included = brief.sections || initialBrief.sections;
    const h = escapeHtml;
    const service = brief.mainService || "Personal coaching";
    const editorial = fontStyle === "Premium editorial";
    const booking = h(brief.bookingLink || "#contact");
    const sectionHtml = [
      included.includes("services") ? `<section id="services" class="section"><div class="kicker">What we offer</div><h2>${h(service)}</h2><p>${h(brief.offer || `A thoughtful way to get started with ${service.toLowerCase()}.`)}</p><div class="grid"><article class="card"><h3>Personal to you</h3><p>Support shaped for ${h(brief.audience || "the people we work with")}.</p></article><article class="card"><h3>Clear next step</h3><p>${h(brief.goal || "Start with a conversation.")}</p></article><article class="card"><h3>Real support</h3><p>${h(brief.differentiator || "A considered approach that puts your goals first.")}</p></article></div></section>` : "",
      included.includes("approach") ? `<section class="section tinted"><div class="kicker">Getting started</div><h2>A simple first step.</h2><p>${h(brief.process || "Tell us what you are working towards, and we will help you find the right way to begin.")}</p></section>` : "",
      included.includes("about") ? `<section id="about" class="section"><div class="kicker">The people behind the work</div><h2>Meet ${h(brief.businessName || "your coach")}.</h2><p>${h(copy.about)}</p></section>` : "",
      included.includes("results") && (brief.credentials || brief.results) ? `<section id="results" class="section dark"><div class="kicker">Reasons to trust us</div><h2>Experience you can see.</h2>${brief.credentials ? `<p>${h(brief.credentials)}</p>` : ""}${brief.results ? `<p>${h(brief.results)}</p>` : ""}</section>` : "",
      included.includes("testimonial") && brief.testimonialQuote ? `<section class="section"><div class="kicker">From our clients</div><blockquote>“${h(brief.testimonialQuote)}”</blockquote>${brief.testimonialName ? `<p><strong>${h(brief.testimonialName)}</strong></p>` : ""}</section>` : "",
      included.includes("faq") && brief.faqQuestion && brief.faqAnswer ? `<section class="section tinted"><div class="kicker">Good to know</div><h2>Your questions, answered.</h2><h3>${h(brief.faqQuestion)}</h3><p>${h(brief.faqAnswer)}</p></section>` : "",
      included.includes("contact") ? `<section id="contact" class="section contact"><h2>Ready to begin?</h2><p>${h(brief.offer || "Take the first step towards your goals.")}</p><a class="button light-button" href="${booking}">${h(copy.button)}</a></section>` : "",
    ].join("");
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(brief.businessName || "Fitness Website")}</title><meta name="description" content="${escapeHtml(copy.subheadline)}">
<style>*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:${editorial ? "Georgia,serif" : "Arial,sans-serif"};background:white;color:${palette.dark}}nav{display:flex;align-items:center;justify-content:space-between;padding:24px 6vw;background:${palette.dark};color:white}nav a{color:white;text-decoration:none;margin-left:24px;font:600 14px Arial,sans-serif}.hero{min-height:72vh;display:flex;align-items:center;padding:80px 7vw;color:white;background:linear-gradient(${direction === 1 ? "0deg" : "90deg"},${palette.dark}ef,${palette.dark}55),url('${heroImage}') center/cover}.hero.center{text-align:center;justify-content:center}.hero-inner{max-width:900px}.kicker{text-transform:uppercase;letter-spacing:.22em;color:${palette.accent};font:700 12px Arial,sans-serif}h1{font-size:clamp(3rem,7vw,6.5rem);line-height:.98;max-width:900px;margin:24px 0}h2{font-size:clamp(2.2rem,4vw,4rem);line-height:1.07;margin:20px 0}p{font-size:1.1rem;line-height:1.7;max-width:720px}.button{display:inline-block;margin-top:24px;padding:16px 24px;background:${palette.accent};color:white;text-decoration:none;font:700 15px Arial,sans-serif;border-radius:8px}.section{padding:90px 7vw}.section>*{max-width:1200px;margin-left:auto;margin-right:auto}.section>p{max-width:1200px}.tinted{background:${palette.light}}.dark{background:${palette.dark};color:white}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:36px}.card{padding:28px;background:#f3f4f5;border-radius:14px}.card p{font-size:.95rem}.contact{background:${palette.accent};color:white;text-align:center}.light-button{background:white;color:${palette.dark}}blockquote{font-size:clamp(1.6rem,3vw,3rem);max-width:900px;margin-top:36px}@media(max-width:700px){nav div:last-child{display:none}.grid{grid-template-columns:1fr}.hero{min-height:75vh}h1{font-size:3.2rem}.section{padding:64px 7vw}}</style></head>
<body>${brief.banner && brief.bannerText ? `<div style="background:${palette.accent};color:white;text-align:center;padding:10px;font-weight:700">${h(brief.bannerText)}</div>` : ""}<nav><strong>${h(brief.businessName || "YOUR BUSINESS")}</strong><div>${included.includes("services") ? `<a href="#services">Services</a>` : ""}${included.includes("about") ? `<a href="#about">About</a>` : ""}${included.includes("results") && (brief.credentials || brief.results) ? `<a href="#results">Results</a>` : ""}${included.includes("contact") ? `<a href="#contact">Contact</a>` : ""}</div></nav><section class="hero${direction === 1 ? " center" : ""}"><div class="hero-inner"><div class="kicker">${h(service)}</div><h1>${h(copy.headline)}</h1><p>${h(copy.subheadline)}</p><a class="button" href="${booking}">${h(copy.button)}</a></div></section>${sectionHtml}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(brief.businessName || "fitness-website").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f5f6f7] text-[#17191c]">
      <Sidebar stage={stage} setStage={setStage} showLocked={setShowLocked} reset={reset} />
      <main className="min-h-screen lg:ml-[236px]">
        {stage === "home" && <HomeScreen start={() => setStage("brief")} resume={() => setStage(readStored<Stage>("ftk-last-stage", "brief"))} />}
        {stage === "brief" && <BriefScreen brief={brief} setBrief={setBrief} files={uploadedFiles} upload={() => uploadRef.current?.click()} removeFile={(name) => setUploadedFiles((items) => items.filter((item) => item !== name))} next={() => setStage("content")} saved={savedLabel} />}
        {stage === "content" && <ContentScreen brief={brief} setBrief={setBrief} back={() => setStage("brief")} next={() => setStage("style")} saved={savedLabel} />}
        {stage === "style" && <StyleScreen mode={styleMode} setMode={setStyleMode} moods={moods} setMoods={setMoods} paletteId={paletteId} setPaletteId={setPaletteId} fontStyle={fontStyle} setFontStyle={setFontStyle} surface={surface} setSurface={setSurface} brandColour={brandColour} setBrandColour={setBrandColour} businessName={brief.businessName} mainService={brief.mainService} audience={brief.audience} heroImage={heroImage} upload={() => uploadRef.current?.click()} back={() => setStage("content")} next={() => setStage("direction")} palette={palette} />}
        {stage === "direction" && <DirectionScreen brief={brief} setBrief={setBrief} copy={copy} palette={palette} heroImage={heroImage} selected={direction} setSelected={setDirection} back={() => setStage("style")} build={beginBuild} />}
        {stage === "building" && <BuildingScreen brief={brief} palette={palette} copy={copy} heroImage={heroImage} index={buildIndex} />}
        {stage === "editor" && <EditorScreen brief={brief} copy={copy} palette={palette} paletteId={paletteId} setPaletteId={setPaletteId} fontStyle={fontStyle} setFontStyle={setFontStyle} heroImage={heroImage} direction={direction} replaceImage={() => imageRef.current?.click()} previewSize={previewSize} setPreviewSize={setPreviewSize} selectedPart={selectedPart} setSelectedPart={setSelectedPart} updateCopy={updateCopy} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} applyAiChange={applyAiChange} aiChanges={aiChanges} approve={() => setStage("delivery")} saved={savedLabel} />}
        {stage === "delivery" && <DeliveryScreen brief={brief} copy={copy} palette={palette} fontStyle={fontStyle} heroImage={heroImage} direction={direction} ownPhoto={ownPhoto} edit={() => setStage("editor")} download={downloadWebsite} />}
      </main>
      <input ref={uploadRef} className="hidden" type="file" multiple accept="image/*,.pdf,.svg" onChange={(event) => handleAssets(event.target.files)} />
      <input ref={imageRef} className="hidden" type="file" accept="image/*" onChange={(event) => handleAssets(event.target.files)} />
      {showLocked && <LockedModal product={showLocked} close={() => setShowLocked(null)} />}
    </div>
  );
}

function Sidebar({ stage, setStage, showLocked, reset }: { stage: Stage; setStage: (stage: Stage) => void; showLocked: (name: string) => void; reset: () => void }) {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-[#e4e5e7] bg-[#111214] text-white lg:flex">
    <button onClick={() => setStage("home")} className="flex items-center gap-3 px-7 py-7 text-left"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#ef162f] font-black italic">F</div><div><div className="text-sm font-extrabold tracking-tight">FITNESS</div><div className="text-[10px] tracking-[.32em] text-white/65">TOOLKIT</div></div></button>
    <nav className="flex-1 space-y-1 px-3">
      <SideButton label="Home" icon={Home} active={stage === "home"} onClick={() => setStage("home")} />
      <SideButton label="My Website" icon={Monitor} active={stage !== "home"} onClick={() => setStage(stage === "home" ? "brief" : stage)} />
      <div className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[.24em] text-white/35">Your upgrades</div>
      <LockedButton label="Extra Pages" sub="Bump 1" icon={FileText} onClick={() => showLocked("Extra Pages")} />
      <div className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[.24em] text-white/35">Growth tools</div>
      <LockedButton label="Campaign Studio" sub="Upsell 1" icon={LayoutTemplate} onClick={() => showLocked("Campaign Studio")} />
      <LockedButton label="Meta Ads" sub="Upsell 2" icon={Sparkles} onClick={() => showLocked("Meta Ad Launch Pack")} />
      <div className="mt-6 border-t border-white/10 pt-4"><SideButton label="Help" icon={CircleHelp} active={false} onClick={() => showLocked("Help Centre")} /></div>
    </nav>
    <div className="m-4 rounded-xl border border-white/10 bg-white/[.04] p-4"><div className="text-xs font-semibold">Saved on this device</div><p className="mt-1 text-[11px] leading-5 text-white/50">Account sync is still being connected, so progress currently stays in this browser.</p><button onClick={reset} className="mt-3 text-[11px] font-semibold text-[#ff4054] hover:text-white">Start a fresh website</button></div>
  </aside>;
}

function SideButton({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Home; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition", active ? "bg-[#ef162f] font-semibold text-white" : "text-white/68 hover:bg-white/[.06] hover:text-white")}><Icon className="h-4 w-4" />{label}</button>;
}

function LockedButton({ label, sub, icon: Icon, onClick }: { label: string; sub: string; icon: typeof Home; onClick: () => void }) {
  return <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-white/48 transition hover:bg-white/[.05] hover:text-white/75"><Icon className="h-4 w-4" /><span className="min-w-0 flex-1"><span className="block truncate text-sm">{label}</span><span className="block text-[9px] uppercase tracking-wider text-white/28">{sub}</span></span><Lock className="h-3.5 w-3.5" /></button>;
}

function ShellHeader({ step, title, subtitle, saved }: { step?: number; title: string; subtitle: string; saved?: string }) {
  const labels = ["Brief", "Content", "Style", "Direction", "Website"];
  return <header className="border-b border-[#e5e6e8] bg-white px-6 py-6 md:px-10">
    <div className="mx-auto max-w-[1320px]">
      {step && <div className="mb-6 flex max-w-xl items-center gap-2">{labels.map((label, index) => <div key={label} className="flex flex-1 items-center gap-2"><div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", index + 1 <= step ? "bg-[#ef162f] text-white" : "bg-[#eef0f2] text-[#7a7e84]")}>{index + 1 < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</div><span className={cn("hidden text-xs sm:block", index + 1 === step ? "font-semibold text-[#ef162f]" : "text-[#747880]")}>{label}</span>{index < labels.length - 1 && <div className="h-px flex-1 bg-[#dfe1e4]" />}</div>)}</div>}
      <div className="flex items-end justify-between gap-5"><div><h1 className="font-sans text-3xl font-black tracking-[-.04em] md:text-5xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#676d76]">{subtitle}</p></div>{saved && <div className="hidden items-center gap-2 text-xs text-[#667069] md:flex"><CheckCircle2 className="h-4 w-4 text-[#35a564]" />{saved}</div>}</div>
    </div>
  </header>;
}

function HomeScreen({ start, resume }: { start: () => void; resume: () => void }) {
  const hasProgress = Boolean(readStored<Brief>("ftk-brief", initialBrief).businessName.trim());
  return <div>
    <ShellHeader title="Your fitness website" subtitle="A guided workspace for creating, refining and downloading your personalised website." />
    <div className="mx-auto max-w-[1320px] space-y-6 p-6 md:p-10">
      <section className="relative overflow-hidden rounded-[28px] bg-[#111214] px-7 py-10 text-white md:px-12 md:py-14"><div className="absolute -right-16 -top-24 h-80 w-80 rounded-full bg-[#ef162f]/25 blur-3xl" /><div className="relative max-w-3xl"><div className="text-[10px] font-bold uppercase tracking-[.24em] text-[#ff4054]">Start here</div><h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-.045em] md:text-6xl">A website that looks as professional as your coaching.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-white/65">Tell us about your business, shape the visual direction and receive a polished website you can edit, approve and publish.</p><button onClick={hasProgress ? resume : start} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#ef162f] px-6 py-4 text-sm font-bold shadow-[0_12px_35px_rgba(239,22,47,.3)]">{hasProgress ? "Continue my website" : "Create my website"}<ArrowRight className="h-4 w-4" /></button></div></section>
      <section className="grid gap-5 md:grid-cols-3"><InfoCard n="01" title="Tell us about the business" text="Add your services, audience, goals, logo, photographs and any useful context." /><InfoCard n="02" title="Shape the visual direction" text="Use our recommendation, choose the style yourself or apply your existing brand." /><InfoCard n="03" title="Review and make it yours" text="Edit the page, request changes, approve it and receive the finished website files." /></section>
      <section className="grid gap-4 md:grid-cols-3"><ProductCard title="Extra Pages" detail="Expand your website with connected pages using the same brand direction." label="Bump 1" /><ProductCard title="Campaign Studio" detail="Create personalised promotions using your saved business profile." label="Upsell 1" /><ProductCard title="Meta Ad Launch Pack" detail="Turn your selected offer into a complete paid-advertising package." label="Upsell 2" /></section>
    </div>
  </div>;
}

function InfoCard({ n, title, text }: { n: string; title: string; text: string }) { return <div className="rounded-2xl border border-[#e2e4e6] bg-white p-6"><div className="text-xs font-black text-[#ef162f]">{n}</div><h3 className="mt-5 font-sans text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#6a7078]">{text}</p></div>; }
function ProductCard({ title, detail, label }: { title: string; detail: string; label: string }) { return <div className="rounded-2xl border border-[#e2e4e6] bg-white p-5"><div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[.18em] text-[#8b9097]">{label}</span><Lock className="h-3.5 w-3.5 text-[#a3a7ad]" /></div><h3 className="mt-6 font-sans text-lg font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-[#747982]">{detail}</p><div className="mt-5 inline-flex rounded-full bg-[#f0f1f3] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#7c8188]">Available separately</div></div>; }

function BriefScreen({ brief, setBrief, files, upload, removeFile, next, saved }: { brief: Brief; setBrief: (brief: Brief) => void; files: string[]; upload: () => void; removeFile: (name: string) => void; next: () => void; saved: string }) {
  const set = (key: keyof Brief, value: string | boolean) => setBrief({ ...brief, [key]: value });
  const ready = brief.businessName.trim() && brief.mainService.trim() && brief.audience.trim();
  return <div><ShellHeader step={1} title="Tell us about your business" subtitle="Give us the essentials. Add as much context as you like." saved={saved} />
    <div className="mx-auto grid max-w-[1320px] gap-6 p-6 md:p-10 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-[#e1e3e5] bg-white p-6 md:p-8"><div className="grid gap-5 md:grid-cols-2">
        <Field label="Business name" required><TextInput value={brief.businessName} onChange={(value) => set("businessName", value)} placeholder="Example: Northside Strength" /></Field>
        <Field label="Business type" required><SelectInput value={brief.businessType} onChange={(value) => set("businessType", value)} options={["Personal trainer", "Online fitness coach", "Strength or performance coach", "Yoga or Pilates instructor", "Group fitness instructor", "Fitness studio", "Martial arts or boxing coach", "Other fitness professional"]} /></Field>
        <Field label="Main service" required><TextInput value={brief.mainService} onChange={(value) => set("mainService", value)} placeholder="Example: One-to-one strength coaching" /></Field>
        <Field label="Ideal customer" required><TextInput value={brief.audience} onChange={(value) => set("audience", value)} placeholder="Example: Busy professionals aged 35–55" /></Field>
        <Field label="Location"><TextInput value={brief.location} onChange={(value) => set("location", value)} placeholder="Manchester, UK or Online" /></Field>
        <Field label="Main website goal"><SelectInput value={brief.goal} onChange={(value) => set("goal", value)} options={["Book a consultation", "Receive enquiries", "Fill classes", "Sell a programme", "Promote online coaching", "Build professional credibility"]} /></Field>
        <div className="md:col-span-2"><Field label="Booking or enquiry link"><TextInput value={brief.bookingLink} onChange={(value) => set("bookingLink", value)} placeholder="https://..." /></Field></div>
        <div className="md:col-span-2"><Field label="Tell us anything else" hint="Paste existing copy, social bios, testimonials or rough notes. It does not need to be organised."><textarea value={brief.context} onChange={(event) => set("context", event.target.value)} className="min-h-36 w-full rounded-xl border border-[#dfe2e5] px-4 py-3 text-sm outline-none transition focus:border-[#ef162f] focus:ring-4 focus:ring-[#ef162f]/10" placeholder="Tell us about your story, services, approach, qualifications, results or anything else that would help..." /></Field></div>
      </div>
      <div className="mt-6"><Field label="Logo, photos and brand files" hint="JPG, PNG, SVG or PDF. You can add more later."><button onClick={upload} className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#cfd3d7] bg-[#fafafa] text-sm text-[#666d75] hover:border-[#ef162f]"><Upload className="mb-2 h-5 w-5" /><span className="font-semibold text-[#282b30]">Choose files</span><span className="mt-1 text-xs">or drag and drop them here</span></button></Field>{files.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{files.map((file) => <span key={file} className="inline-flex items-center gap-2 rounded-full bg-[#f0f1f3] px-3 py-1.5 text-xs">{file}<button onClick={() => removeFile(file)}><X className="h-3 w-3" /></button></span>)}</div>}</div>
      <div className="mt-8 flex justify-end"><button disabled={!ready} onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-[#ef162f] px-6 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">Review my brief<ArrowRight className="h-4 w-4" /></button></div></section>
      <aside className="overflow-hidden rounded-2xl border border-[#e1e3e5] bg-white"><div className="relative min-h-60 bg-[#111214] p-7 text-white"><div className="absolute right-0 top-0 h-full w-2/3 bg-[radial-gradient(circle_at_top_right,rgba(239,22,47,.38),transparent_65%)]" /><div className="relative"><div className="h-12 w-1 bg-[#ef162f]" /><div className="mt-6 text-4xl font-black uppercase leading-[.92]">A website<br />that works<br /><span className="text-[#ef162f]">as hard as you do.</span></div></div></div><div className="space-y-5 p-6"><Authority icon={Sparkles} title="Personal to your business" text="Your audience, offer, proof and personality shape the website." /><Authority icon={Monitor} title="Built for every screen" text="Desktop and mobile presentation are reviewed before delivery." /><Authority icon={Pencil} title="You stay in control" text="Review, refine and approve everything before download." /></div></aside>
    </div>
  </div>;
}

function ContentScreen({ brief, setBrief, back, next, saved }: { brief: Brief; setBrief: (brief: Brief) => void; back: () => void; next: () => void; saved: string }) {
  const set = (key: keyof Brief, value: string) => setBrief({ ...brief, [key]: value });
  const selected = brief.sections || initialBrief.sections;
  const toggleSection = (id: string) => setBrief({ ...brief, sections: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id] });
  return <div><ShellHeader step={2} title="Shape the full page" subtitle="Choose what belongs on your site, then give us the real details. Leave anything you cannot substantiate blank." saved={saved} />
    <div className="mx-auto grid max-w-[1320px] gap-6 p-6 md:p-10 xl:grid-cols-[1fr_340px]">
      <section className="space-y-7 rounded-2xl border border-[#e1e3e5] bg-white p-6 md:p-8">
        <div><div className="text-sm font-black">Sections to include</div><p className="mt-1 text-xs leading-5 text-[#747982]">The page will still have a headline and main action. Pick the supporting sections that fit your business.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{pageSections.map((section) => <button key={section.id} type="button" onClick={() => toggleSection(section.id)} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition", selected.includes(section.id) ? "border-[#ef162f] bg-[#fff4f5]" : "border-[#dfe2e5] hover:border-[#aeb3b8]")}><span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border", selected.includes(section.id) ? "border-[#ef162f] bg-[#ef162f] text-white" : "border-[#aeb3b8]")}>{selected.includes(section.id) && <Check className="h-3.5 w-3.5" />}</span><span><span className="block text-sm font-bold">{section.name}</span><span className="mt-1 block text-xs leading-5 text-[#727982]">{section.purpose}</span></span></button>)}</div></div>
        <div className="grid gap-5 border-t border-[#e5e6e8] pt-7 md:grid-cols-2"><div className="md:col-span-2"><Field label="Your offer or first-step invitation" hint="For example: a free consultation, introductory class or a named programme."><TextInput value={brief.offer} onChange={(value) => set("offer", value)} placeholder="Example: Book a free 20-minute coaching call" /></Field></div><div className="md:col-span-2"><Field label="What makes you different?" hint="Your genuine method or experience. Avoid claims you cannot prove."><textarea value={brief.differentiator} onChange={(event) => set("differentiator", event.target.value)} className="min-h-24 w-full rounded-xl border border-[#dfe2e5] p-3 text-sm outline-none focus:border-[#ef162f]" placeholder="How do you coach, teach or support clients differently?" /></Field></div>
          {selected.includes("approach") && <div className="md:col-span-2"><Field label="How do customers get started?" hint="A few rough steps are enough."><textarea value={brief.process} onChange={(event) => set("process", event.target.value)} className="min-h-20 w-full rounded-xl border border-[#dfe2e5] p-3 text-sm outline-none focus:border-[#ef162f]" placeholder="Example: Book a call, meet your coach, start your plan" /></Field></div>}
          {selected.includes("results") && <><Field label="Qualifications or credible proof"><TextInput value={brief.credentials} onChange={(value) => set("credentials", value)} placeholder="Example: Level 3 PT, 8 years coaching" /></Field><Field label="Results you can substantiate"><TextInput value={brief.results} onChange={(value) => set("results", value)} placeholder="Example: 200+ clients coached" /></Field></>}
          {selected.includes("testimonial") && <><div className="md:col-span-2"><Field label="A real client quote" hint="We will not invent testimonials or transformation results."><textarea value={brief.testimonialQuote} onChange={(event) => set("testimonialQuote", event.target.value)} className="min-h-20 w-full rounded-xl border border-[#dfe2e5] p-3 text-sm outline-none focus:border-[#ef162f]" placeholder="Paste the client's approved words here" /></Field></div><Field label="Name to display"><TextInput value={brief.testimonialName} onChange={(value) => set("testimonialName", value)} placeholder="Example: Sarah M." /></Field></>}
          {selected.includes("faq") && <><Field label="Common question"><TextInput value={brief.faqQuestion} onChange={(value) => set("faqQuestion", value)} placeholder="Example: Do I need experience?" /></Field><Field label="Your answer"><TextInput value={brief.faqAnswer} onChange={(value) => set("faqAnswer", value)} placeholder="Example: No. We adapt to your starting point." /></Field></>}
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-[#e5e6e8] pt-6"><button onClick={back} className="inline-flex items-center gap-2 rounded-xl border border-[#dfe2e5] px-5 py-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button><button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-[#ef162f] px-6 py-3 text-sm font-bold text-white">Choose design style<ArrowRight className="h-4 w-4" /></button></div>
      </section>
      <aside className="h-fit rounded-2xl bg-[#111214] p-6 text-white"><div className="text-xs font-bold uppercase tracking-[.2em] text-[#ff4054]">What makes this personal</div><h2 className="mt-4 text-2xl font-black">A page built from your evidence.</h2><p className="mt-3 text-sm leading-6 text-white/65">The best pages show a clear offer, a real person and believable proof. We will not fill gaps with made-up reviews or statistics.</p><div className="mt-6 border-t border-white/10 pt-5 text-xs leading-6 text-white/55">You can edit the copy and design after seeing the first draft.</div></aside>
    </div>
  </div>;
}

function Authority({ icon: Icon, title, text }: { icon: typeof Home; title: string; text: string }) { return <div className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ffe8eb] text-[#ef162f]"><Icon className="h-4 w-4" /></div><div><div className="text-sm font-bold">{title}</div><p className="mt-1 text-xs leading-5 text-[#717780]">{text}</p></div></div>; }
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) { return <label className="block"><span className="text-sm font-semibold">{label}{required && <span className="ml-1 text-[#ef162f]">*</span>}</span>{hint && <span className="mt-1 block text-xs leading-5 text-[#7c828a]">{hint}</span>}<div className="mt-2">{children}</div></label>; }
function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) { return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-xl border border-[#dfe2e5] px-4 text-sm outline-none transition focus:border-[#ef162f] focus:ring-4 focus:ring-[#ef162f]/10" />; }
function SelectInput({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) { return <div className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full appearance-none rounded-xl border border-[#dfe2e5] bg-white px-4 pr-10 text-sm outline-none transition focus:border-[#ef162f] focus:ring-4 focus:ring-[#ef162f]/10">{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-4 h-4 w-4" /></div>; }

function StyleScreen({ mode, setMode, moods, setMoods, paletteId, setPaletteId, fontStyle, setFontStyle, surface, setSurface, brandColour, setBrandColour, businessName, mainService, audience, heroImage, upload, back, next, palette }: { mode: StyleMode; setMode: (mode: StyleMode) => void; moods: string[]; setMoods: (moods: string[]) => void; paletteId: string; setPaletteId: (id: string) => void; fontStyle: string; setFontStyle: (style: string) => void; surface: string; setSurface: (surface: string) => void; brandColour: string; setBrandColour: (colour: string) => void; businessName: string; mainService: string; audience: string; heroImage: string; upload: () => void; back: () => void; next: () => void; palette: PaletteChoice }) {
  const toggleMood = (mood: string) => setMoods(moods.includes(mood) ? moods.filter((item) => item !== mood) : moods.length < 2 ? [...moods, mood] : [moods[1], mood]);
  const chooseLook = (id: string, font: string) => { setPaletteId(id); setFontStyle(font); };
  return <div><ShellHeader step={3} title="Choose how your website should feel" subtitle="Start with a complete look, fine-tune it if you wish, or bring an existing brand." />
    <div className="mx-auto max-w-[1320px] p-6 md:p-10">
      <div className="mb-6 grid rounded-2xl border border-[#e0e2e5] bg-white p-1.5 md:grid-cols-3">{([{ id: "recommend", label: "Explore looks", icon: WandSparkles }, { id: "choose", label: "Fine-tune", icon: Palette }, { id: "brand", label: "Use my brand", icon: Upload }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setMode(id)} className={cn("flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition", mode === id ? "bg-[#ef162f] text-white shadow-lg shadow-red-500/15" : "text-[#555b63] hover:bg-[#f4f5f6]")}><Icon className="h-4 w-4" />{label}</button>)}</div>
      <div className="grid gap-6 xl:grid-cols-[1fr_480px]"><section className="rounded-2xl border border-[#e0e2e5] bg-white p-6 md:p-8">
        {mode === "recommend" && <div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ef162f]">Curated starting points</div><h2 className="mt-3 text-3xl font-black tracking-tight">Which feels right for your business?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#697079]">These are visual directions, not industry templates. Pick one to see it with your business details, or use Fine-tune to change the colours and typography.</p><div className="mt-7 grid gap-4 sm:grid-cols-2">{designLooks.map((look) => { const colours = palettes.find((item) => item.id === look.id)!; const active = paletteId === look.id; return <button key={look.id} onClick={() => chooseLook(look.id, look.font)} className={cn("overflow-hidden rounded-2xl border-2 text-left transition", active ? "border-[#ef162f] shadow-[0_10px_30px_rgba(239,22,47,.12)]" : "border-[#e0e2e5] hover:border-[#aeb3b9]")}><div className="relative flex h-44 flex-col justify-between overflow-hidden p-5" style={{ background: colours.dark, color: "white" }}><div className="flex items-center justify-between"><span className={cn("text-[9px] tracking-[.15em]", look.font === "Premium editorial" ? "font-serif text-sm" : "font-black uppercase")}>{businessName || "YOUR BUSINESS"}</span><span className="h-2 w-2 rounded-full" style={{ background: colours.accent }} /></div><div className="relative z-10 max-w-[80%]"><div className={cn("text-3xl leading-[.95]", look.font === "Premium editorial" ? "font-serif" : look.font === "Clean professional" ? "font-medium" : "font-black uppercase")}>{look.id === "sand" ? "Move well. Live fully." : look.id === "forest" ? "Find your rhythm." : look.id === "ocean" ? "Make progress your way." : "Built for what’s next."}</div><div className="mt-3 h-1 w-12" style={{ background: colours.accent }} /></div><div className="pointer-events-none absolute -bottom-16 -right-12 h-48 w-48 rounded-full opacity-45" style={{ background: colours.accent }} /></div><div className="p-4"><div className="flex items-center justify-between gap-2"><span className="font-bold">{look.name}</span>{active && <CheckCircle2 className="h-5 w-5 text-[#ef162f]" />}</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#8a9097]">{look.category}</div><p className="mt-2 text-xs leading-5 text-[#6d747c]">{look.note}</p></div></button>; })}</div><div className="mt-6 rounded-xl bg-[#f6f7f8] p-4 text-xs leading-5 text-[#60666f]">The preview on the right updates when you choose a look. The next step lets you choose how the opening section is arranged.</div></div>}
        {mode === "choose" && <div className="space-y-8"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ef162f]">Your adjustments</div><h2 className="mt-3 text-3xl font-black tracking-tight">Make the look your own</h2><p className="mt-3 text-sm leading-6 text-[#697079]">Each choice below changes the website preview and the downloaded page.</p></div>
          <ChoiceSection n="1" title="Choose a colour palette">{palettes.map((item) => <button key={item.id} onClick={() => setPaletteId(item.id)} className={cn("rounded-xl border p-3 text-left", paletteId === item.id ? "border-[#ef162f] ring-1 ring-[#ef162f]" : "border-[#dfe2e5]")}><div className="flex h-12 overflow-hidden rounded-lg"><span className="flex-1" style={{ background: item.dark }} /><span className="w-1/4" style={{ background: item.accent }} /><span className="w-1/4" style={{ background: item.light }} /></div><div className="mt-3 text-sm font-bold">{item.name}</div><div className="text-[11px] text-[#7a8088]">{item.description}</div></button>)}</ChoiceSection>
          <ChoiceSection n="2" title="Choose a typography direction">{["Strong & modern", "Premium editorial", "Clean professional"].map((font) => <button key={font} onClick={() => setFontStyle(font)} className={cn("rounded-xl border p-4 text-left", fontStyle === font ? "border-[#ef162f] ring-1 ring-[#ef162f]" : "border-[#dfe2e5]")}><div className={cn("text-lg", font === "Premium editorial" ? "font-serif" : font === "Clean professional" ? "font-normal tracking-tight" : "font-black tracking-tight")}>{businessName || "Your Business"}</div><div className="mt-2 text-[11px] text-[#7a8088]">{font}</div></button>)}</ChoiceSection>
          <div className="rounded-xl border border-[#e0e2e5] bg-[#f7f8f9] p-5"><div className="font-bold">Have a better photo?</div><p className="mt-1 text-xs leading-5 text-[#717780]">Your own image can make more difference than another colour or font.</p><button onClick={upload} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold ring-1 ring-[#dfe2e5]"><Upload className="h-4 w-4" />Upload hero photo</button></div></div>}
        {mode === "brand" && <div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ef162f]">Existing identity</div><h2 className="mt-3 text-3xl font-black tracking-tight">Bring your brand with you</h2><p className="mt-3 text-sm leading-6 text-[#697079]">Use your existing colour and a photo of your business. The photo and colour apply to this draft. Automatic logo and brand-guide reading will be added later.</p><button onClick={upload} className="mt-7 flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#cfd3d7] bg-[#fafafa] text-sm"><Upload className="mb-3 h-5 w-5 text-[#ef162f]" /><span className="font-semibold">Upload your hero photo</span><span className="mt-1 text-xs text-[#7b8189]">A clear image of you, your space or your service</span></button><div className="mt-7 grid gap-5 md:grid-cols-2"><Field label="Primary brand colour"><div className="flex h-12 items-center gap-3 rounded-xl border border-[#dfe2e5] px-3"><input type="color" value={brandColour} onChange={(event) => setBrandColour(event.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent" /><input value={brandColour} onChange={(event) => setBrandColour(event.target.value)} className="min-w-0 flex-1 text-sm uppercase outline-none" /></div></Field></div></div>}
        <div className="mt-9 flex items-center justify-between border-t pt-6"><button onClick={back} className="inline-flex items-center gap-2 rounded-xl border border-[#d9dce0] px-5 py-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button><button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-[#ef162f] px-6 py-3 text-sm font-bold text-white">Create my directions<ArrowRight className="h-4 w-4" /></button></div>
      </section><MiniSite briefName={businessName} copy={{ headline: mainService || "A better way to move", subheadline: audience ? `Designed for ${audience}.` : "A website shaped around your business.", about: "", button: "Get started" }} palette={palette} heroImage={heroImage} surface={surface} fontStyle={fontStyle} /></div>
    </div>
  </div>;
}

function Recommendation({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: string }) { return <div className="flex items-center gap-3 rounded-xl border border-[#e1e3e6] p-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff0f2] text-[#ef162f]"><Icon className="h-4 w-4" /></div><div><div className="text-[10px] uppercase tracking-wider text-[#858a91]">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div></div>; }
function ChoiceSection({ n, title, hint, children }: { n: string; title: string; hint?: string; children: React.ReactNode }) { return <div><div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-wider">{n}. {title}</h3>{hint && <span className="text-xs text-[#858a91]">{hint}</span>}</div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div></div>; }

function MiniSite({ briefName, copy, palette, heroImage, surface, fontStyle }: { briefName: string; copy: SiteCopy; palette: PaletteChoice; heroImage: string; surface: string; fontStyle: string }) {
  return <aside className="self-start rounded-2xl border border-[#e0e2e5] bg-white p-4 xl:sticky xl:top-5"><div className="mb-3 flex items-center justify-between px-1"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#777d85]">Live preview</span><span className="text-[10px] text-[#93979d]">Based on your choices</span></div><div className="overflow-hidden rounded-xl border border-black/10" style={{ background: surface === "Mostly light" ? palette.light : palette.dark, color: surface === "Mostly light" ? palette.dark : "white" }}><div className="flex items-center justify-between px-5 py-4 text-[8px] font-bold"><span>{(briefName || "YOUR BUSINESS").toUpperCase()}</span><span className="rounded-md px-3 py-2 text-white" style={{ background: palette.accent }}>Get started</span></div><div className="relative min-h-[440px] overflow-hidden p-7"><img src={heroImage} alt="Fitness website example" className="absolute inset-0 h-full w-full object-cover opacity-60" /><div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${palette.dark} 12%, ${palette.dark}c9 50%, transparent)` }} /><div className="relative z-10 mt-24 max-w-[290px] text-white"><div className="mb-4 h-1 w-12" style={{ background: palette.accent }} /><h3 className={cn("text-4xl uppercase leading-[.9]", fontStyle === "Premium editorial" ? "font-serif normal-case" : "font-black")}>{copy.headline}</h3><p className="mt-4 text-xs leading-5 text-white/75">{copy.subheadline}</p><button className="mt-5 rounded-lg px-4 py-3 text-xs font-bold" style={{ background: palette.accent }}>Start your journey</button></div></div></div></aside>;
}

function DirectionScreen({ brief, setBrief, copy, palette, heroImage, selected, setSelected, back, build }: { brief: Brief; setBrief: (brief: Brief) => void; copy: SiteCopy; palette: PaletteChoice; heroImage: string; selected: number; setSelected: (index: number) => void; back: () => void; build: () => void }) {
  const titles = ["Image-led and bold", "Premium split-screen", "Clean and personal"];
  return <div><ShellHeader step={4} title="Choose your opening direction" subtitle="These concepts use your business, preferred style and selected imagery. Choose one before we build the complete page." />
    <div className="mx-auto max-w-[1320px] space-y-6 p-6 md:p-10"><div className="grid gap-5 xl:grid-cols-3">{titles.map((title, index) => <button key={title} onClick={() => setSelected(index)} className={cn("overflow-hidden rounded-2xl border-2 bg-white text-left transition", selected === index ? "border-[#ef162f] shadow-[0_14px_45px_rgba(239,22,47,.12)]" : "border-transparent ring-1 ring-[#dfe2e5] hover:ring-[#aeb3b9]")}><div className={cn("relative h-72 overflow-hidden", index === 2 && "bg-white")} style={{ background: palette.dark }}><img src={heroImage} alt="Direction preview" className={cn("absolute h-full object-cover", index === 0 ? "inset-0 w-full opacity-55" : index === 1 ? "right-0 w-1/2 opacity-90" : "right-5 top-5 h-[calc(100%-40px)] w-[42%] rounded-xl opacity-90")} /><div className="absolute inset-0" style={{ background: index === 2 ? `linear-gradient(90deg,${palette.light} 55%,transparent)` : `linear-gradient(90deg,${palette.dark} 12%,${palette.dark}d9 55%,transparent)` }} /><div className={cn("relative z-10 flex h-full max-w-[62%] flex-col justify-center p-6", index === 2 ? "text-[#15171a]" : "text-white")}><span className="text-[8px] font-bold uppercase tracking-[.2em]" style={{ color: palette.accent }}>{brief.mainService || "Personal coaching"}</span><div className="mt-3 text-2xl font-black leading-[.95]">{index === 1 ? `Stronger starts with ${brief.businessName || "you"}` : index === 2 ? "A better way to train" : copy.headline}</div><span className="mt-5 w-fit rounded-md px-3 py-2 text-[8px] font-bold text-white" style={{ background: palette.accent }}>{brief.goal}</span></div></div><div className="p-5"><div className="flex items-center justify-between"><h3 className="font-sans font-bold">{title}</h3>{selected === index && <CheckCircle2 className="h-5 w-5 text-[#ef162f]" />}</div><p className="mt-2 text-xs leading-5 text-[#717780]">{index === 0 ? "Strong photography, immediate impact and a clear action." : index === 1 ? "Balanced photography and copy with a more refined pace." : "More whitespace and a calmer, approachable first impression."}</p></div></button>)}</div>
      <section className="rounded-2xl border border-[#e0e2e5] bg-white p-6"><div className="grid gap-6 lg:grid-cols-[1fr_1fr]"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#ef162f]">Recommended page structure</div><h2 className="mt-2 text-2xl font-black">Built around {brief.goal.toLowerCase()}</h2><p className="mt-2 text-sm leading-6 text-[#687079]">We will create the sections below and hide anything that lacks credible customer information.</p><div className="mt-4 flex flex-wrap gap-2">{recommendedSections(brief.businessType).map((section) => <span key={section} className="rounded-full bg-[#f0f1f3] px-3 py-1.5 text-xs font-semibold">{section}</span>)}</div></div><div className="rounded-xl bg-[#f6f7f8] p-5"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={brief.banner} onChange={(event) => setBrief({ ...brief, banner: event.target.checked })} className="mt-1 accent-[#ef162f]" /><span><span className="text-sm font-bold">Announcement banner</span><span className="mt-1 block text-xs leading-5 text-[#747b84]">Useful for class openings, launches, events or time-sensitive offers.</span></span></label>{brief.banner && <input value={brief.bannerText} onChange={(event) => setBrief({ ...brief, bannerText: event.target.value })} placeholder="Example: Three coaching places available this month" className="mt-4 h-11 w-full rounded-lg border border-[#d9dde1] bg-white px-3 text-sm outline-none focus:border-[#ef162f]" />}</div></div></section>
      <div className="flex items-center justify-between"><button onClick={back} className="inline-flex items-center gap-2 rounded-xl border border-[#d9dce0] bg-white px-5 py-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back</button><button onClick={build} className="inline-flex items-center gap-2 rounded-xl bg-[#ef162f] px-6 py-3.5 text-sm font-bold text-white">Build my website<ArrowRight className="h-4 w-4" /></button></div>
    </div></div>;
}

function recommendedSections(type: string) { if (type.includes("studio") || type.includes("instructor")) return ["Hero", "Classes", "Schedule", "About", "Testimonials", "Location", "Booking"]; if (type.includes("Online")) return ["Hero", "Programme", "Who it is for", "Process", "Results", "FAQ", "Apply"]; return ["Hero", "Services", "Who it is for", "About", "Results", "FAQ", "Booking"]; }

function BuildingScreen({ brief, palette, copy, heroImage, index }: { brief: Brief; palette: PaletteChoice; copy: SiteCopy; heroImage: string; index: number }) {
  const progress = Math.round(((index + 1) / buildStages.length) * 100);
  return <div><ShellHeader title="Preparing your website preview" subtitle="We are applying your content and design choices. AI generation and automated review will be connected in a later version." />
    <div className="mx-auto max-w-[1320px] p-6 md:p-10"><section className="rounded-2xl border border-[#e0e2e5] bg-white p-6 md:p-8"><div className="flex items-center justify-between gap-5"><div><div className="text-xs font-bold text-[#ef162f]">Stage {index + 1} of {buildStages.length}</div><h2 className="mt-2 text-2xl font-black">{buildStages[index][0]}</h2></div><div className="text-3xl font-black">{progress}%</div></div><div className="mt-6 h-3 overflow-hidden rounded-full bg-[#edeff1]"><div className="h-full rounded-full bg-[#ef162f] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_340px]"><div><div className="rounded-2xl bg-[#f7f7f8] p-6"><div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ffe6e9] text-[#ef162f]"><RefreshCw className="h-5 w-5 animate-spin" /></div><div><div className="font-bold">{buildStages[index][0]}</div><p className="mt-2 text-sm leading-6 text-[#697079]">{buildStages[index][1]}</p></div></div></div><div className="mt-5 overflow-hidden rounded-2xl border border-[#dfe2e5] bg-[#111214] p-5"><div className="grid gap-4 md:grid-cols-[1fr_190px]"><div className="relative min-h-72 overflow-hidden rounded-xl"><img src={heroImage} className="absolute inset-0 h-full w-full object-cover opacity-60" alt="Website being created" /><div className="absolute inset-0" style={{ background: `linear-gradient(90deg,${palette.dark},transparent)` }} /><div className="relative z-10 max-w-md p-8 text-white"><div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: palette.accent }}>{brief.businessName || "Your business"}</div><div className="mt-4 text-4xl font-black leading-[.92]">{copy.headline}</div><div className="mt-5 h-9 w-28 rounded-lg" style={{ background: palette.accent }} /></div></div><div className="relative mx-auto mt-8 h-64 w-32 overflow-hidden rounded-[24px] border-4 border-[#2b2d31]"><img src={heroImage} className="absolute inset-0 h-full w-full object-cover opacity-60" alt="Mobile preview" /><div className="absolute inset-0 bg-black/45" /><div className="relative z-10 p-4 pt-16 text-white"><div className="text-xl font-black leading-none">{copy.headline}</div><div className="mt-5 h-8 rounded-md" style={{ background: palette.accent }} /></div></div></div></div></div>
        <aside><div className="rounded-2xl border border-[#e0e2e5] p-5"><div className="text-sm font-black">Personalising for your business</div><div className="mt-4 space-y-2">{[brief.businessName || "Your business", brief.mainService || "Your main service", brief.audience || "Your ideal customer", brief.goal, `${palette.name} direction`].map((item) => <div key={item} className="rounded-lg bg-[#f4f5f6] px-3 py-2.5 text-xs font-medium">{item}</div>)}</div></div><div className="mt-4 rounded-2xl bg-[#111214] p-5 text-white"><div className="text-xs font-bold">Current saving</div><p className="mt-2 text-xs leading-5 text-white/55">This draft is created and saved in your browser. Account sync and email delivery will be connected later.</p></div></aside></div></section></div>
  </div>;
}

function EditorScreen({ brief, copy, palette, paletteId, setPaletteId, fontStyle, setFontStyle, heroImage, direction, replaceImage, previewSize, setPreviewSize, selectedPart, setSelectedPart, updateCopy, aiPrompt, setAiPrompt, applyAiChange, aiChanges, approve, saved }: { brief: Brief; copy: SiteCopy; palette: PaletteChoice; paletteId: string; setPaletteId: (id: string) => void; fontStyle: string; setFontStyle: (font: string) => void; heroImage: string; direction: number; replaceImage: () => void; previewSize: PreviewSize; setPreviewSize: (size: PreviewSize) => void; selectedPart: EditablePart; setSelectedPart: (part: EditablePart) => void; updateCopy: (part: EditablePart, value: string) => void; aiPrompt: string; setAiPrompt: (value: string) => void; applyAiChange: () => void; aiChanges: number; approve: () => void; saved: string }) {
  return <div className="min-h-screen bg-[#eceef0]"><div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[#dedfe2] bg-white px-5 py-4"><div className="mr-auto"><div className="text-xl font-black tracking-tight">Review your website</div><div className="text-xs text-[#737982]">Click any text, image or button to make changes.</div></div><div className="flex rounded-lg bg-[#f0f1f3] p-1">{([{ id: "desktop", icon: Monitor }, { id: "tablet", icon: Tablet }, { id: "mobile", icon: Smartphone }] as const).map(({ id, icon: Icon }) => <button key={id} onClick={() => setPreviewSize(id)} className={cn("rounded-md p-2", previewSize === id ? "bg-white text-[#ef162f] shadow-sm" : "text-[#717780]")}><Icon className="h-4 w-4" /></button>)}</div><button className="p-2 text-[#646b74]"><RotateCcw className="h-4 w-4" /></button><button className="p-2 text-[#646b74]"><Redo2 className="h-4 w-4" /></button><div className="hidden items-center gap-2 px-2 text-xs text-[#5d6861] md:flex"><CheckCircle2 className="h-4 w-4 text-[#36a766]" />{saved}</div><button onClick={approve} className="inline-flex items-center gap-2 rounded-xl bg-[#ef162f] px-5 py-3 text-sm font-bold text-white">Approve website<ArrowRight className="h-4 w-4" /></button></div>
    <div className="grid min-h-[calc(100vh-77px)] xl:grid-cols-[1fr_340px]"><div className="overflow-auto p-5"><div className={cn("mx-auto overflow-hidden rounded-xl bg-white shadow-[0_25px_80px_rgba(25,27,30,.13)] transition-all", previewSize === "desktop" ? "max-w-[1120px]" : previewSize === "tablet" ? "max-w-[760px]" : "max-w-[390px]")}><WebsiteCanvas brief={brief} copy={copy} palette={palette} heroImage={heroImage} direction={direction} previewSize={previewSize} fontStyle={fontStyle} selectedPart={selectedPart} select={setSelectedPart} replaceImage={replaceImage} /></div></div>
      <aside className="border-l border-[#dfe1e4] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-base font-black">{selectedPart === "headline" ? "Hero headline" : selectedPart === "subheadline" ? "Hero description" : selectedPart === "button" ? "Primary button" : "About section"}</h2><X className="h-4 w-4 text-[#90959b]" /></div><div className="mt-6"><Field label="Edit text"><textarea value={copy[selectedPart]} onChange={(event) => updateCopy(selectedPart, event.target.value)} className="min-h-24 w-full rounded-xl border border-[#dfe2e5] p-3 text-sm outline-none focus:border-[#ef162f]" /></Field></div><button onClick={replaceImage} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-[#dfe2e5] p-3 text-left text-sm font-semibold"><div className="grid h-10 w-14 place-items-center overflow-hidden rounded-lg bg-[#efeff1]"><img src={heroImage} className="h-full w-full object-cover" alt="Current" /></div>Replace hero image</button>
      <div className="mt-6 border-t pt-5"><div className="text-sm font-black">Website style</div><div className="mt-3 grid grid-cols-4 gap-2">{palettes.map((item) => <button key={item.id} onClick={() => setPaletteId(item.id)} className={cn("h-9 rounded-lg border-2", paletteId === item.id ? "border-[#17191c]" : "border-transparent")} style={{ background: `linear-gradient(135deg,${item.dark} 50%,${item.accent} 50%)` }} />)}</div><select value={fontStyle} onChange={(event) => setFontStyle(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-[#dfe2e5] px-3 text-sm"><option>Strong & modern</option><option>Premium editorial</option><option>Clean professional</option></select></div>
      <div className="mt-6 rounded-2xl border border-[#ffd1d7] bg-[#fff2f4] p-4"><div className="flex items-center gap-2 text-sm font-black"><Sparkles className="h-4 w-4 text-[#ef162f]" />Ask for a change</div><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Make this feel warmer without changing the layout." className="mt-3 min-h-24 w-full rounded-xl border border-[#f1c2c9] bg-white p-3 text-sm outline-none" /><div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-[#6c737c]">{aiChanges} AI changes remaining</span><button onClick={applyAiChange} disabled={!aiPrompt.trim() || aiChanges <= 0} className="grid h-9 w-9 place-items-center rounded-lg bg-[#ef162f] text-white disabled:opacity-35"><ArrowRight className="h-4 w-4" /></button></div></div><button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#dfe2e5] py-3 text-sm font-semibold"><RotateCcw className="h-4 w-4" />Restore previous version</button></aside></div>
  </div>;
}

function WebsiteCanvas({ brief, copy, palette, heroImage, direction, previewSize, fontStyle, selectedPart, select, replaceImage, editable = true }: { brief: Brief; copy: SiteCopy; palette: PaletteChoice; heroImage: string; direction: number; previewSize: PreviewSize; fontStyle: string; selectedPart: EditablePart; select: (part: EditablePart) => void; replaceImage: () => void; editable?: boolean }) {
  const narrow = previewSize === "mobile";
  const selected = "relative outline outline-2 outline-offset-4 outline-[#ef162f]";
  const included = brief.sections || initialBrief.sections;
  const editorial = fontStyle === "Premium editorial";
  const service = brief.mainService || "Personal coaching";
  return <div className={cn("website-canvas", narrow && "website-canvas-narrow")} style={{ color: palette.dark, background: palette.light }}>
    <style>{`.website-canvas h1{font-size:3.75rem!important;overflow-wrap:normal;word-break:normal}.website-canvas-narrow h1{font-size:3rem!important}`}</style>
    {brief.banner && brief.bannerText && <div className="px-4 py-2 text-center text-xs font-bold text-white" style={{ background: palette.accent }}>{brief.bannerText}</div>}
    <nav className="flex items-center justify-between px-7 py-5 text-white" style={{ background: palette.dark }}><div className={cn("text-sm tracking-[.12em]", editorial ? "font-serif text-lg" : "font-black uppercase")}>{brief.businessName || "Your Business"}</div>{!narrow && <div className="flex items-center gap-6 text-[10px] font-semibold">{included.includes("services") && <span>Services</span>}{included.includes("about") && <span>About</span>}{included.includes("results") && <span>Results</span>}<span className="rounded-lg px-4 py-2 text-white" style={{ background: palette.accent }}>{copy.button}</span></div>}</nav>
    <section className={cn("relative overflow-hidden text-white", narrow ? "min-h-[610px]" : "min-h-[570px]")} style={{ background: palette.dark }}>{heroImage && (editable ? <button onClick={replaceImage} className="absolute inset-0 h-full w-full"><img src={heroImage} className="h-full w-full object-cover opacity-72" alt="Hero" /></button> : <img src={heroImage} className="absolute inset-0 h-full w-full object-cover opacity-72" alt="Hero" />)}<div className="absolute inset-0" style={{ background: direction === 1 ? `linear-gradient(0deg,${palette.dark}db,${palette.dark}44)` : `linear-gradient(90deg,${palette.dark} 5%,${palette.dark}e8 45%,${palette.dark}22)` }} /><div className={cn("relative z-10 flex min-h-[570px] flex-col justify-center", narrow ? "px-7" : direction === 1 ? "mx-auto max-w-[78%] items-center px-14 text-center" : "max-w-[70%] px-14")}><div className="text-[9px] font-bold uppercase tracking-[.24em]" style={{ color: palette.accent }}>{service}</div><button disabled={!editable} onClick={() => select("headline")} className={cn("mt-5", direction === 1 ? "text-center" : "text-left", editable && selectedPart === "headline" && selected)}><h1 className={cn("break-words leading-[.9] tracking-[-.055em]", narrow ? "text-5xl" : "text-7xl", editorial ? "font-serif font-semibold normal-case" : "font-sans font-black")}>{copy.headline}</h1>{editable && selectedPart === "headline" && <span className="absolute -top-9 left-0 inline-flex items-center gap-1 rounded-md bg-[#ef162f] px-2 py-1 text-[10px] font-bold text-white"><Pencil className="h-3 w-3" />Edit text</span>}</button><button disabled={!editable} onClick={() => select("subheadline")} className={cn("mt-5 max-w-xl text-sm leading-6 text-white/80", direction === 1 ? "text-center" : "text-left", editable && selectedPart === "subheadline" && selected)}>{copy.subheadline}</button><button disabled={!editable} onClick={() => select("button")} className={cn("mt-7 w-fit rounded-xl px-5 py-3.5 text-sm font-bold text-white", editable && selectedPart === "button" && selected)} style={{ background: palette.accent }}>{copy.button}<ArrowRight className="ml-2 inline h-4 w-4" /></button></div></section>
    {included.includes("services") && <section id="services" className="p-10 md:p-14" style={{ background: "white" }}><div className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color: palette.accent }}>What we offer</div><h2 className={cn("mt-4 text-4xl", editorial ? "font-serif" : "font-black")}>{service}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#5f656d]">{brief.offer || `A thoughtful way to get started with ${service.toLowerCase()}.`}</p><div className={cn("mt-8 grid gap-4", narrow ? "grid-cols-1" : "grid-cols-3")}><WebCard title="Personal to you" text={`Support shaped for ${brief.audience || "the people we work with"}.`} /><WebCard title="Clear next step" text={brief.goal || "Start with a conversation."} /><WebCard title="Real support" text={brief.differentiator || "A considered approach that puts your goals first."} /></div></section>}
    {included.includes("approach") && <section className="p-10 md:p-14" style={{ background: palette.light }}><div className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color: palette.accent }}>Getting started</div><h2 className={cn("mt-4 text-4xl", editorial ? "font-serif" : "font-black")}>A simple first step.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#5f656d]">{brief.process || `Tell us what you are working towards, and we will help you find the right way to begin.`}</p></section>}
    {included.includes("about") && <section className={cn("grid gap-8 p-10 md:p-14", narrow ? "grid-cols-1" : "grid-cols-[1fr_1fr]")}><div><div className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color: palette.accent }}>The people behind the work</div><h2 className={cn("mt-4 text-4xl leading-tight", editorial ? "font-serif" : "font-black")}>Meet {brief.businessName || "your coach"}.</h2></div><button disabled={!editable} onClick={() => select("about")} className={cn("self-center text-left text-sm leading-7 text-[#5f656d]", editable && selectedPart === "about" && selected)}>{copy.about}</button></section>}
    {included.includes("results") && (brief.credentials || brief.results) && <section className="p-10 md:p-14" style={{ background: palette.dark, color: "white" }}><div className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color: palette.accent }}>Reasons to trust us</div><h2 className={cn("mt-4 text-4xl", editorial ? "font-serif" : "font-black")}>Experience you can see.</h2><div className={cn("mt-8 grid gap-4", narrow ? "grid-cols-1" : "grid-cols-2")}>{brief.credentials && <div className="border-l-2 pl-5 text-sm leading-6" style={{ borderColor: palette.accent }}>{brief.credentials}</div>}{brief.results && <div className="border-l-2 pl-5 text-sm leading-6" style={{ borderColor: palette.accent }}>{brief.results}</div>}</div></section>}
    {included.includes("testimonial") && brief.testimonialQuote && <section className="p-10 md:p-14" style={{ background: "white" }}><div className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color: palette.accent }}>From our clients</div><blockquote className={cn("mt-6 max-w-4xl text-3xl leading-snug", editorial ? "font-serif" : "font-semibold")}>“{brief.testimonialQuote}”</blockquote>{brief.testimonialName && <div className="mt-5 text-sm font-bold">{brief.testimonialName}</div>}</section>}
    {included.includes("faq") && brief.faqQuestion && brief.faqAnswer && <section className="p-10 md:p-14" style={{ background: palette.light }}><div className="text-[9px] font-bold uppercase tracking-[.22em]" style={{ color: palette.accent }}>Good to know</div><h2 className={cn("mt-4 text-4xl", editorial ? "font-serif" : "font-black")}>Your questions, answered.</h2><div className="mt-7 max-w-3xl border-t pt-5"><h3 className="font-bold">{brief.faqQuestion}</h3><p className="mt-2 text-sm leading-7 text-[#5f656d]">{brief.faqAnswer}</p></div></section>}
    {included.includes("contact") && <section id="contact" className="p-10 text-center md:p-16" style={{ background: palette.accent, color: "white" }}><h2 className={cn("text-4xl", editorial ? "font-serif" : "font-black")}>Ready to begin?</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-6">{brief.offer || "Take the first step towards your goals."}</p><div className="mx-auto mt-6 w-fit rounded-lg bg-white px-6 py-3 text-sm font-bold" style={{ color: palette.dark }}>{copy.button}</div></section>}
  </div>;
}

function WebCard({ title, text }: { title: string; text: string }) { return <div className="rounded-xl bg-[#f3f4f5] p-5"><div className="font-bold">{title}</div><p className="mt-2 text-xs leading-5 text-[#727880]">{text}</p></div>; }

function DeliveryScreen({ brief, copy, palette, fontStyle, heroImage, direction, ownPhoto, edit, download }: { brief: Brief; copy: SiteCopy; palette: PaletteChoice; fontStyle: string; heroImage: string; direction: number; ownPhoto: boolean; edit: () => void; download: () => void }) {
  return <div><ShellHeader step={5} title="Your website is ready" subtitle="Your approved website, files and publishing guidance are available below." />
    <div className="mx-auto max-w-[1320px] space-y-6 p-6 md:p-10"><section className="grid overflow-hidden rounded-[26px] border border-[#e0e2e5] bg-white xl:grid-cols-[1fr_420px]"><div className="bg-[#e9ebed] p-5"><div className="overflow-hidden rounded-xl shadow-xl"><WebsiteCanvas brief={brief} copy={copy} palette={palette} heroImage={heroImage} direction={direction} previewSize="desktop" fontStyle={fontStyle} selectedPart="headline" select={() => undefined} replaceImage={() => undefined} editable={false} /></div></div><aside className="p-7"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#e9f8ef] text-[#2b9e5c]"><Check className="h-6 w-6" /></div><h2 className="mt-5 text-3xl font-black tracking-tight">Approved and prepared</h2><p className="mt-3 text-sm leading-6 text-[#687079]">Your final website package belongs to you and includes the current approved content and design.</p><button onClick={download} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ef162f] px-5 py-4 text-sm font-bold text-white"><Download className="h-4 w-4" />Download website</button><button onClick={edit} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#dfe2e5] px-5 py-3.5 text-sm font-semibold"><Pencil className="h-4 w-4" />Return to editor</button><p className="mt-4 text-xs leading-5 text-[#777d85]">{ownPhoto ? "Your uploaded hero image is included in this download." : "This preview uses a demonstration photo. Replace it with a licensed or owned image before publishing."}</p><div className="mt-7 border-t pt-6"><div className="text-sm font-black">How would you like to publish?</div><div className="mt-3 space-y-2"><DeliveryChoice icon={CircleHelp} title="Guide me through it" /><DeliveryChoice icon={Globe2} title="I already have hosting" /><DeliveryChoice icon={FileArchive} title="Give it to my developer" /></div></div></aside></section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><BuildCheck title="Visual presentation" text="Colour, typography, imagery and spacing applied consistently." /><BuildCheck title="Visitor journey" text="Primary service and action established above the fold." /><BuildCheck title="Mobile presentation" text="Responsive layout prepared for phones and tablets." /><BuildCheck title="SEO foundations" text="Title, description, headings and image text prepared." /></section></div>
  </div>;
}

function DeliveryChoice({ icon: Icon, title }: { icon: typeof Home; title: string }) { return <button className="flex w-full items-center gap-3 rounded-xl border border-[#e0e2e5] p-3 text-left text-sm font-semibold hover:border-[#ef162f]"><Icon className="h-4 w-4 text-[#ef162f]" />{title}<ArrowRight className="ml-auto h-4 w-4 text-[#9a9ea4]" /></button>; }
function BuildCheck({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-[#e0e2e5] bg-white p-5"><CheckCircle2 className="h-5 w-5 text-[#32a662]" /><div className="mt-4 text-sm font-black">{title}</div><p className="mt-2 text-xs leading-5 text-[#747a82]">{text}</p></div>; }

function LockedModal({ product, close }: { product: string; close: () => void }) {
  const descriptions: Record<string, string> = { "Extra Pages": "Expand the one-page website with connected pages selected for your business.", "Campaign Studio": "Create personalised promotions using the business, audience, offer and voice already saved in the portal.", "Meta Ad Launch Pack": "Turn a selected campaign into personalised Meta ad copy, creative directions and launch materials.", "Help Centre": "Publishing guides, editing help and practical answers will live here." };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0f2] text-[#ef162f]"><Lock className="h-5 w-5" /></div><button onClick={close} className="p-2 text-[#858a91]"><X className="h-5 w-5" /></button></div><div className="mt-6 text-[10px] font-bold uppercase tracking-[.18em] text-[#ef162f]">Available separately</div><h2 className="mt-2 text-2xl font-black">{product}</h2><p className="mt-3 text-sm leading-6 text-[#697079]">{descriptions[product]}</p><div className="mt-6 rounded-xl bg-[#f4f5f6] p-4 text-xs leading-5 text-[#747a82]">This product uses the same saved business profile, offer and brand direction as your website.</div><button onClick={close} className="mt-6 w-full rounded-xl bg-[#17191c] py-3 text-sm font-bold text-white">Return to my website</button></div></div>;
}
