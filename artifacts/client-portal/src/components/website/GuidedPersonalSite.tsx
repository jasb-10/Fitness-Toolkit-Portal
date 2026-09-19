import { ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type Copy = { headline: string; subheadline: string; about: string; button: string };
type Section = { id: string; eyebrow?: string; title: string; body: string; highlights?: string[] };
type Brief = {
  businessName: string;
  mainService: string;
  audience: string;
  location: string;
  deliveryMode?: string;
  offer: string;
  credentials: string;
  results: string;
  testimonialQuote: string;
  testimonialName: string;
  process: string;
  prices?: string;
  faqQuestion: string;
  faqAnswer: string;
};

type Props = {
  brief: Brief;
  copy: Copy;
  sections: Section[];
  heroImage: string;
  useImage: boolean;
  accent: string;
  narrow: boolean;
  editable?: boolean;
  selectedPart?: string;
  onSelect?: (part: "headline" | "subheadline" | "about" | "button") => void;
  onReplaceImage?: () => void;
};

export function GuidedPersonalSite({ brief, copy, sections, heroImage, useImage, accent, narrow, editable = false, selectedPart, onSelect, onReplaceImage }: Props) {
  const section = (id: string) => sections.find((item) => item.id === id);
  const services = section("services");
  const approach = section("approach");
  const about = section("about");
  const contact = section("contact");
  const steps = approach?.highlights?.filter(Boolean) || brief.process.split(/\n|,|\.|;/).map((item) => item.trim()).filter((item) => item.length > 8).slice(0, 3);
  const trust = [brief.credentials, brief.location ? `Based in ${brief.location}` : "", brief.deliveryMode].filter(Boolean).slice(0, 3);
  const clickable = (part: "headline" | "subheadline" | "about" | "button") => cn(editable && "relative rounded-sm outline-none hover:ring-2 hover:ring-white/35", editable && selectedPart === part && "ring-2 ring-white/80");
  const select = (part: "headline" | "subheadline" | "about" | "button") => editable && onSelect?.(part);

  return <div className="overflow-hidden bg-[#f3ede3] text-[#211d19]" style={{ fontFamily: 'Newsreader, Georgia, "Times New Roman", serif' }}>
    <header className="flex items-center justify-between bg-[#1d3026] px-7 py-5 text-[#fbf8f2] md:px-12"><div className="font-sans text-sm font-semibold tracking-tight">{brief.businessName || "Your business"}</div>{!narrow && <nav className="flex items-center gap-6 font-sans text-[11px]"><span>Work with me</span><span>About</span><span className="border-b pb-1" style={{ borderColor: accent }}>{copy.button}</span></nav>}</header>

    <section className={cn("relative isolate flex overflow-hidden bg-[#1d3026] text-[#fbf8f2]", narrow ? "min-h-[650px] items-end" : "min-h-[680px] items-center")}>
      {useImage && <button disabled={!editable} onClick={onReplaceImage} className="absolute inset-0 h-full w-full"><img src={heroImage} alt="" className="h-full w-full object-cover opacity-65" /></button>}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,39,30,.96)_0%,rgba(21,39,30,.78)_45%,rgba(21,39,30,.12)_82%)]" />
      {!useImage && <div className="absolute -right-20 top-10 h-[440px] w-[440px] rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(224,188,169,.24),transparent_68%)]" />}
      <div className={cn("relative z-10 w-full", narrow ? "px-7 pb-16 pt-28" : "max-w-[800px] px-14 py-24")}>
        <div className="font-sans text-[10px] font-semibold uppercase tracking-[.24em]" style={{ color: accent }}>{brief.mainService || "Personal coaching"}</div>
        <button disabled={!editable} onClick={() => select("headline")} className={cn("mt-7 block text-left", clickable("headline"))}><h1 className={cn("font-light leading-[.93] tracking-[-.045em]", narrow ? "text-[3.35rem]" : "text-[5.6rem]")}>{copy.headline}</h1></button>
        <button disabled={!editable} onClick={() => select("subheadline")} className={cn("mt-7 block max-w-xl text-left text-lg font-light leading-8 text-white/75", clickable("subheadline"))}>{copy.subheadline}</button>
        <button disabled={!editable} onClick={() => select("button")} className={cn("mt-9 inline-flex items-center gap-3 rounded-sm px-5 py-4 font-sans text-sm font-semibold text-[#251a14]", clickable("button"))} style={{ background: accent }}>{copy.button}<ArrowRight className="h-4 w-4" /></button>
        <div className="mt-9 flex items-center gap-2 font-sans text-xs text-white/55"><MapPin className="h-3.5 w-3.5" />{brief.location || brief.deliveryMode || "Available by appointment"}</div>
      </div>
    </section>

    {trust.length > 0 && <section className="grid bg-[#1d3026] text-white" style={{ gridTemplateColumns: narrow ? "1fr" : `repeat(${Math.min(3, trust.length)}, minmax(0, 1fr))` }}>{trust.map((item, index) => <div key={item} className="border-t border-white/10 px-7 py-7 md:border-r md:px-12"><div className="text-3xl font-light italic" style={{ color: accent }}>0{index + 1}</div><div className="mt-2 font-sans text-xs leading-5 text-white/65">{item}</div></div>)}</section>}

    {services && <section className={cn("bg-[#fbf8f2]", narrow ? "px-7 py-16" : "grid grid-cols-[.8fr_1.2fr] gap-16 px-14 py-24")}><div><div className="font-sans text-[10px] font-semibold uppercase tracking-[.22em] text-[#3a5a45]">{services.eyebrow || "Is this for you?"}</div><h2 className={cn("mt-5 font-light leading-[1.03] tracking-[-.035em]", narrow ? "text-4xl" : "text-6xl")}>{services.title}</h2></div><div className={cn(narrow && "mt-7")}><p className="max-w-2xl text-lg font-light leading-8 text-[#655b4f]">{services.body}</p>{services.highlights?.length ? <div className="mt-8 grid gap-3">{services.highlights.map((item, index) => <div key={item} className="flex items-start gap-4 border-t border-[#d8cebd] py-4"><span className="font-sans text-[10px] font-bold text-[#3a5a45]">0{index + 1}</span><span className="font-sans text-sm leading-6">{item}</span></div>)}</div> : null}</div></section>}

    {steps.length > 0 && <section className={cn("bg-[#f3ede3]", narrow ? "px-7 py-16" : "px-14 py-24")}><div className="max-w-6xl"><div className="font-sans text-[10px] font-semibold uppercase tracking-[.22em] text-[#3a5a45]">Your first steps</div><h2 className={cn("mt-5 max-w-2xl font-light leading-[1.03] tracking-[-.035em]", narrow ? "text-4xl" : "text-6xl")}>{approach?.title || "A clear way to begin."}</h2><div className={cn("mt-12 grid gap-0", narrow ? "grid-cols-1" : "grid-cols-3")}>{steps.map((item, index) => <div key={item} className="border-t border-[#d8cebd] py-7 md:pr-8"><div className="text-3xl font-light italic text-[#e0bca9]">0{index + 1}</div><div className="mt-5 font-sans text-sm leading-6 text-[#514940]">{item}</div></div>)}</div></div></section>}

    {(about || copy.about) && <section className={cn("relative overflow-hidden bg-[#e6dccb]", narrow ? "px-7 py-16" : "px-14 py-28")}><div className="absolute -right-20 -top-28 text-[22rem] font-light italic leading-none text-white/25">“</div><div className="relative max-w-4xl"><div className="font-sans text-[10px] font-semibold uppercase tracking-[.22em] text-[#3a5a45]">{about?.eyebrow || "A personal approach"}</div><button disabled={!editable} onClick={() => select("about")} className={cn("mt-7 block text-left", clickable("about"))}><p className={cn("font-light leading-[1.3] tracking-[-.025em]", narrow ? "text-2xl" : "text-4xl")}>{about?.body || copy.about}</p></button><div className="mt-8 font-sans text-sm font-semibold text-[#3a5a45]">{brief.businessName}</div></div></section>}

    {(brief.prices || brief.faqQuestion) && <section className={cn("bg-[#fbf8f2]", narrow ? "px-7 py-16" : "grid grid-cols-2 gap-16 px-14 py-24")}><div><div className="font-sans text-[10px] font-semibold uppercase tracking-[.22em] text-[#3a5a45]">Good to know</div><h2 className="mt-5 text-5xl font-light leading-none">The practical details.</h2>{brief.prices && <p className="mt-7 border-t border-[#d8cebd] pt-6 text-lg leading-8 text-[#655b4f]">{brief.prices}</p>}</div>{brief.faqQuestion && <div className={cn("border-y border-[#d8cebd] py-6", narrow && "mt-10")}><h3 className="font-sans text-base font-semibold">{brief.faqQuestion}</h3><p className="mt-3 text-lg font-light leading-8 text-[#655b4f]">{brief.faqAnswer}</p></div>}</section>}

    {brief.testimonialQuote && <section className={cn("bg-[#f3ede3] text-center", narrow ? "px-7 py-16" : "px-14 py-24")}><div className="mx-auto max-w-4xl text-4xl font-light italic leading-tight">“{brief.testimonialQuote.replace(/^[“\"']+|[”\"']+$/g, "")}”</div>{brief.testimonialName && <div className="mt-7 font-sans text-xs font-semibold uppercase tracking-[.16em] text-[#655b4f]">{brief.testimonialName}</div>}</section>}

    <section className={cn("bg-[#1d3026] text-[#fbf8f2]", narrow ? "px-7 py-16" : "px-14 py-24")}><div className="max-w-4xl"><div className="font-sans text-[10px] font-semibold uppercase tracking-[.22em]" style={{ color: accent }}>{contact?.eyebrow || "Your next step"}</div><h2 className={cn("mt-5 font-light leading-[1.02]", narrow ? "text-4xl" : "text-6xl")}>{contact?.title || "Ready to talk it through?"}</h2><p className="mt-6 max-w-2xl text-lg font-light leading-8 text-white/65">{contact?.body || brief.offer || copy.subheadline}</p><div className="mt-8 inline-flex items-center gap-3 rounded-sm px-5 py-4 font-sans text-sm font-semibold text-[#251a14]" style={{ background: accent }}>{copy.button}<ArrowRight className="h-4 w-4" /></div></div></section>
    <footer className="flex items-center justify-between border-t border-white/10 bg-[#1d3026] px-7 py-7 font-sans text-[10px] text-white/45 md:px-14"><span>{brief.businessName}</span><span>{brief.location}</span></footer>
  </div>;
}

const htmlEscape = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char] || char);

export function buildGuidedPersonalHtml({ brief, copy, sections, heroImage, useImage, accent, bookingUrl, locale = "en-GB" }: Omit<Props, "narrow" | "editable" | "selectedPart" | "onSelect" | "onReplaceImage"> & { bookingUrl: string; locale?: string }) {
  const h = htmlEscape;
  const get = (id: string) => sections.find((item) => item.id === id);
  const services = get("services");
  const approach = get("approach");
  const about = get("about");
  const contact = get("contact");
  const steps = approach?.highlights?.filter(Boolean) || brief.process.split(/\n|,|\.|;/).map((item) => item.trim()).filter((item) => item.length > 8).slice(0, 3);
  const trust = [brief.credentials, brief.location ? `Based in ${brief.location}` : "", brief.deliveryMode || ""].filter(Boolean).slice(0, 3);
  const serviceCards = services?.highlights?.filter(Boolean).map((item, index) => `<div class="line"><span>0${index + 1}</span><strong>${h(item)}</strong></div>`).join("") || "";
  const stepCards = steps.map((item, index) => `<div class="step"><i>0${index + 1}</i><p>${h(item)}</p></div>`).join("");
  const image = useImage ? `<img class="hero-image" src="${heroImage}" alt="${h(`${brief.businessName} ${brief.mainService}`.trim())}" width="1800" height="1200">` : "";
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: brief.businessName,
    description: copy.subheadline,
    areaServed: brief.location || undefined,
    url: bookingUrl.startsWith("http") ? bookingUrl : undefined,
  }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="${h(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(brief.businessName)} | ${h(brief.mainService)}</title>
<meta name="description" content="${h(copy.subheadline)}"><meta property="og:type" content="website"><meta property="og:title" content="${h(copy.headline)}"><meta property="og:description" content="${h(copy.subheadline)}"><meta name="theme-color" content="#1d3026">
<script type="application/ld+json">${schema}</script>
<style>
:root{--forest:#1d3026;--paper:#fbf8f2;--oat:#f3ede3;--sand:#e6dccb;--ink:#211d19;--soft:#655b4f;--accent:${accent};--rule:#d8cebd;--gutter:clamp(1.25rem,5vw,4.5rem)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--oat);color:var(--ink);font-family:Georgia,"Times New Roman",serif;overflow-x:hidden}a{color:inherit}a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}.sans{font-family:Arial,Helvetica,sans-serif}.nav{display:flex;align-items:center;justify-content:space-between;padding:1.25rem var(--gutter);background:var(--forest);color:var(--paper)}.nav strong{font-family:Arial,sans-serif;font-size:.9rem}.nav div{display:flex;gap:1.7rem;align-items:center;font:600 .72rem Arial,sans-serif}.nav a{text-decoration:none}.nav .nav-cta{border-bottom:1px solid var(--accent);padding-bottom:.25rem}
.hero{position:relative;isolation:isolate;display:flex;min-height:78vh;align-items:center;overflow:hidden;background:var(--forest);color:var(--paper)}.hero-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.65;z-index:-2}.hero::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(21,39,30,.98),rgba(21,39,30,.78) 46%,rgba(21,39,30,.1) 84%);z-index:-1}.hero.no-image::after{content:"";position:absolute;width:34rem;height:34rem;border-radius:50%;right:-6rem;top:2rem;background:radial-gradient(circle,rgba(224,188,169,.22),transparent 68%);border:1px solid rgba(255,255,255,.08);z-index:-1}.hero-inner{width:min(52rem,100%);padding:clamp(5rem,9vw,8rem) var(--gutter)}.eyebrow{font:600 .68rem/1.2 Arial,sans-serif;text-transform:uppercase;letter-spacing:.24em;color:var(--accent)}h1,h2,p{margin-top:0}h1{font-size:clamp(3.7rem,8vw,7.3rem);line-height:.9;letter-spacing:-.052em;font-weight:400;margin:1.7rem 0}.hero p{font-size:clamp(1.08rem,1.7vw,1.3rem);line-height:1.7;color:rgba(255,255,255,.75);max-width:38rem}.button{display:inline-flex;align-items:center;gap:.8rem;margin-top:1.2rem;padding:1rem 1.3rem;background:var(--accent);color:#251a14;text-decoration:none;font:700 .88rem Arial,sans-serif;border-radius:2px}.location{margin-top:2rem;color:rgba(255,255,255,.55);font:.76rem Arial,sans-serif}
.trust{display:grid;grid-template-columns:repeat(${Math.max(1, trust.length)},minmax(0,1fr));background:var(--forest);color:#fff}.trust div{padding:1.5rem var(--gutter);border-top:1px solid rgba(255,255,255,.1);border-right:1px solid rgba(255,255,255,.1)}.trust i,.step i{display:block;font-size:2rem;color:var(--accent);font-weight:400}.trust p{margin:.45rem 0 0;font:.78rem/1.6 Arial,sans-serif;color:rgba(255,255,255,.65)}
.section{padding:clamp(4rem,8vw,7rem) var(--gutter)}.split{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(2.5rem,7vw,7rem)}h2{font-size:clamp(2.8rem,5.5vw,5rem);font-weight:400;line-height:1;letter-spacing:-.04em;margin:1.25rem 0}.body{font-size:clamp(1.08rem,1.6vw,1.28rem);line-height:1.72;color:var(--soft);max-width:46rem}.services{background:var(--paper)}.line{display:flex;gap:1rem;border-top:1px solid var(--rule);padding:1rem 0;font:400 .9rem/1.6 Arial,sans-serif}.line span{font-size:.68rem;color:#3a5a45}.steps{background:var(--oat)}.step-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:3rem}.step{border-top:1px solid var(--rule);padding:1.5rem 2rem 1.5rem 0}.step p{font:400 .9rem/1.65 Arial,sans-serif;color:#514940;margin-top:1.1rem}.letter{position:relative;overflow:hidden;background:var(--sand)}.letter::after{content:"“";position:absolute;right:-3rem;top:-8rem;font-size:24rem;color:rgba(255,255,255,.25)}.letter .inner{position:relative;z-index:1;max-width:62rem}.letter .body{font-size:clamp(1.65rem,3.5vw,3rem);line-height:1.3;color:var(--ink)}.details{background:var(--paper)}.detail{border-block:1px solid var(--rule);padding:1.5rem 0}.detail h3{font:600 1rem Arial,sans-serif}.quote{text-align:center;background:var(--oat)}blockquote{font-size:clamp(2rem,4.5vw,4rem);line-height:1.15;max-width:62rem;margin:0 auto;font-style:italic}.quote cite{display:block;margin-top:1.7rem;font:600 .72rem Arial,sans-serif;text-transform:uppercase;letter-spacing:.16em;color:var(--soft)}.book{background:var(--forest);color:var(--paper)}.book p{color:rgba(255,255,255,.65)}footer{display:flex;justify-content:space-between;padding:1.5rem var(--gutter);background:var(--forest);color:rgba(255,255,255,.45);border-top:1px solid rgba(255,255,255,.1);font:.68rem Arial,sans-serif}
@media(max-width:720px){.nav div span{display:none}.hero{min-height:44rem;align-items:flex-end}.hero::before{background:linear-gradient(0deg,rgba(21,39,30,.98),rgba(21,39,30,.62))}.hero-inner{padding-top:7rem;padding-bottom:4rem}h1{font-size:clamp(3.2rem,16vw,5rem)}.trust,.split,.step-grid{grid-template-columns:1fr}.trust div{padding:1.25rem var(--gutter)}.split{gap:2rem}.step{padding-right:0}footer{gap:1rem;flex-wrap:wrap}}
</style></head><body>
<nav class="nav"><strong>${h(brief.businessName)}</strong><div><span>Work with me</span><span>About</span><a class="nav-cta" href="${h(bookingUrl)}">${h(copy.button)}</a></div></nav>
<main><section class="hero${useImage ? "" : " no-image"}">${image}<div class="hero-inner"><div class="eyebrow">${h(brief.mainService)}</div><h1>${h(copy.headline)}</h1><p>${h(copy.subheadline)}</p><a class="button" href="${h(bookingUrl)}">${h(copy.button)} →</a><div class="location">${h(brief.location || brief.deliveryMode || "Available by appointment")}</div></div></section>
${trust.length ? `<section class="trust">${trust.map((item, index) => `<div><i>0${index + 1}</i><p>${h(item)}</p></div>`).join("")}</section>` : ""}
${services ? `<section class="section services split" id="services"><div><div class="eyebrow">${h(services.eyebrow || "Is this for you?")}</div><h2>${h(services.title)}</h2></div><div><p class="body">${h(services.body)}</p>${serviceCards}</div></section>` : ""}
${steps.length ? `<section class="section steps"><div class="eyebrow">Your first steps</div><h2>${h(approach?.title || "A clear way to begin.")}</h2><div class="step-grid">${stepCards}</div></section>` : ""}
${about || copy.about ? `<section class="section letter" id="about"><div class="inner"><div class="eyebrow">${h(about?.eyebrow || "A personal approach")}</div><p class="body">${h(about?.body || copy.about)}</p><div class="sans" style="margin-top:2rem;color:#3a5a45;font-weight:600">${h(brief.businessName)}</div></div></section>` : ""}
${brief.prices || brief.faqQuestion ? `<section class="section details split"><div><div class="eyebrow">Good to know</div><h2>The practical details.</h2>${brief.prices ? `<p class="body">${h(brief.prices)}</p>` : ""}</div>${brief.faqQuestion ? `<div class="detail"><h3>${h(brief.faqQuestion)}</h3><p class="body">${h(brief.faqAnswer)}</p></div>` : ""}</section>` : ""}
${brief.testimonialQuote ? `<section class="section quote"><blockquote>“${h(brief.testimonialQuote.replace(/^[“\"']+|[”\"']+$/g, ""))}”</blockquote>${brief.testimonialName ? `<cite>${h(brief.testimonialName)}</cite>` : ""}</section>` : ""}
<section class="section book" id="contact"><div class="eyebrow">${h(contact?.eyebrow || "Your next step")}</div><h2>${h(contact?.title || "Ready to talk it through?")}</h2><p class="body">${h(contact?.body || brief.offer || copy.subheadline)}</p><a class="button" href="${h(bookingUrl)}">${h(copy.button)} →</a></section></main>
<footer><span>${h(brief.businessName)}</span><span>${h(brief.location)}</span></footer></body></html>`;
}
