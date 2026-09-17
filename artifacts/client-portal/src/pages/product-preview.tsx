import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clipboard,
  FileText,
  HelpCircle,
  Home,
  Lock,
  MessageCircleReply,
  MessagesSquare,
  PenLine,
  Settings,
  Sparkles,
  Upload,
  Users,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { basePath, cn } from "@/lib/utils";

type Profile = {
  businessName: string;
  businessType: string;
  location: string;
  service: string;
  price: string;
  idealClient: string;
  clientGoal: string;
  leavingReasons: string;
  listSize: string;
  offer: string;
  bookingLink: string;
  voiceMode: string;
  voiceExamples: string;
  wordsToAvoid: string;
  extraContext: string;
};

type Campaign = {
  id?: string;
  type: string;
  title: string;
  createdAt: string;
  audienceSummary?: string;
  offerRecommendation?: string;
  scheduleSummary?: string;
  launchChecklist?: string[];
  revisionCount?: number;
  messages: { channel: "Email" | "SMS"; day: string; subject?: string; body: string; purpose?: string }[];
};

const emptyProfile: Profile = {
  businessName: "",
  businessType: "",
  location: "",
  service: "",
  price: "",
  idealClient: "",
  clientGoal: "",
  leavingReasons: "",
  listSize: "",
  offer: "",
  bookingLink: "",
  voiceMode: "Improve my usual style",
  voiceExamples: "",
  wordsToAvoid: "",
  extraContext: "",
};

const campaignTypes = [
  ["Recent Comeback", "For clients who stopped in the last 90 days", "Best match"],
  ["Lost Routine Restart", "Help former clients rebuild a routine", "Recommended"],
  ["Programme Graduate", "Reconnect after a course or programme ended", ""],
  ["Schedule Solution", "Address timing and availability barriers", ""],
  ["Budget-Friendly Return", "Offer a lower-commitment way back", ""],
  ["Something New", "Introduce a new service, class or format", ""],
  ["Seasonal Restart", "Use a natural calendar reset point", ""],
  ["Long-Gone Reintroduction", "Reconnect after six months or more", ""],
  ["Personal Check-In", "A simple personal note with no hard sell", ""],
  ["Community Comeback", "Lead with familiar people and belonging", ""],
  ["Bring-a-Friend Return", "Make returning easier with a friend", ""],
  ["Goal Reset", "Reconnect around the client’s original goal", ""],
  ["Event or Challenge", "Invite former clients to a defined event", ""],
  ["Expired Package Restart", "Restart an expired pass or package", ""],
  ["Former-Client Appreciation", "Reward people who already know you", ""],
];

const steps = ["Business", "Services", "Former clients", "Writing style", "Review"];

function readStored<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${basePath}/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.");
  return body as T;
}

export default function ProductPreviewPage() {
  const [location] = useLocation();
  const live = location === "/comeback" || location.startsWith("/comeback/");
  const root = live ? "/comeback" : "/preview";
  const resetRequested = !live && new URLSearchParams(window.location.search).get("reset") === "1";
  const [profile, setProfile] = useState<Profile>(() => live || resetRequested ? emptyProfile : readStored("comeback-profile", emptyProfile));
  const [profileComplete, setProfileComplete] = useState(() => live || resetRequested ? false : localStorage.getItem("comeback-profile-complete") === "yes");
  const [campaign, setCampaign] = useState<Campaign | null>(() => live || resetRequested ? null : readStored<Campaign | null>("comeback-campaign", null));
  const [setupOpen, setSetupOpen] = useState(false);
  const [loading, setLoading] = useState(live);
  const [loadError, setLoadError] = useState("");
  const section = location.slice(root.length).split("/").filter(Boolean)[0] || "home";

  useEffect(() => {
    if (!live) return;
    api<{ profile: Profile | null; profileComplete: boolean; campaign: Campaign | null }>("/comeback/state")
      .then((state) => { if (state.profile) setProfile(state.profile); setProfileComplete(state.profileComplete); setCampaign(state.campaign); })
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, [live]);
  useEffect(() => {
    if (!resetRequested) return;
    localStorage.removeItem("comeback-profile");
    localStorage.removeItem("comeback-profile-complete");
    localStorage.removeItem("comeback-campaign");
    window.history.replaceState({}, "", "/preview");
  }, [resetRequested]);
  useEffect(() => { if (!live) localStorage.setItem("comeback-profile", JSON.stringify(profile)); }, [live, profile]);
  useEffect(() => {
    if (!live && campaign) localStorage.setItem("comeback-campaign", JSON.stringify(campaign));
  }, [live, campaign]);

  const finishProfile = async () => {
    if (live) {
      const result = await api<{ profile: Profile; profileComplete: boolean }>("/comeback/profile", { method: "PUT", body: JSON.stringify(profile) });
      setProfile(result.profile); setProfileComplete(result.profileComplete);
    } else { localStorage.setItem("comeback-profile-complete", "yes"); setProfileComplete(true); }
    setSetupOpen(false);
  };
  const createCampaign = async (campaignType: string, customBrief: string) => {
    if (live) {
      const result = await api<{ campaign: Campaign }>("/comeback/campaigns/generate", { method: "POST", body: JSON.stringify({ campaignType, customBrief }) });
      setCampaign(result.campaign);
    } else setCampaign(buildCampaign(campaignType, profile, customBrief));
  };
  const resetPreview = () => {
    localStorage.removeItem("comeback-profile");
    localStorage.removeItem("comeback-profile-complete");
    localStorage.removeItem("comeback-campaign");
    setProfile(emptyProfile);
    setProfileComplete(false);
    setCampaign(null);
    setSetupOpen(false);
    window.location.assign("/preview");
  };

  if (loading) return <div className="comeback-red grid min-h-screen place-items-center bg-[#f5f6f7]"><span className="text-sm font-semibold">Loading your workspace...</span></div>;
  if (loadError) return <div className="comeback-red grid min-h-screen place-items-center bg-[#f5f6f7] p-6"><div className="max-w-md rounded-2xl border bg-white p-7 text-center"><h1 className="font-display text-2xl">We could not open your workspace</h1><p className="mt-3 text-sm text-[#666]">{loadError}</p><Button className="mt-5" onClick={() => window.location.reload()}>Try again</Button></div></div>;

  return (
    <div className="comeback-red min-h-screen bg-[#f6f7f3] text-[#142018]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[#dfe4dc] bg-[#fbfcf9] lg:flex">
        <div className="border-b border-[#e4e8e1] px-6 py-6">
          <Link href={root} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#183e2b] text-white"><Zap className="h-4 w-4" /></div>
            <div><div className="text-sm font-bold tracking-tight">FITNESS COMEBACK</div><div className="text-[10px] uppercase tracking-[.2em] text-[#6f7c73]">Campaign Builder</div></div>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <Nav href={root} label="Home" icon={Home} active={section === "home"} />
          <Nav href={`${root}/campaigns`} label="Campaigns" icon={MessagesSquare} active={section === "campaigns"} />
          <LockedNav label="Reply Assistant" icon={MessageCircleReply} />
          <LockedNav label="Campaign Vault" icon={FileText} />
          <LockedNav label="Automation" icon={WandSparkles} />
          <Nav href={`${root}/results`} label="Results" icon={BarChart3} active={section === "results"} />
          <div className="pt-5"><div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8a958d]">Account</div></div>
          <Nav href={`${root}/settings`} label="Business profile" icon={Settings} active={section === "settings"} />
          <Nav href={`${root}/help`} label="Help" icon={HelpCircle} active={section === "help"} />
        </nav>
        <div className="m-4 rounded-xl bg-[#eaf1eb] p-4">
          <div className="text-xs font-semibold">Your campaign</div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#5f6f64]"><span>{campaign ? "Created" : "Ready to create"}</span><span>{campaign ? "Complete" : "Included"}</span></div>
          <Progress value={campaign ? 100 : 0} className="mt-2 h-1.5" />
          {!live && <button onClick={resetPreview} className="mt-4 text-xs font-semibold text-[#d71920] hover:underline">Start a fresh preview</button>}
        </div>
      </aside>

      <main className="min-h-screen lg:ml-64">
        <MobileHeader root={root} />
        {section === "home" && <HomeView root={root} profile={profile} complete={profileComplete} campaign={campaign} openSetup={() => setSetupOpen(true)} />}
        {section === "campaigns" && <CampaignsView live={live} profile={profile} complete={profileComplete} campaign={campaign} openSetup={() => setSetupOpen(true)} setCampaign={setCampaign} createCampaign={createCampaign} />}
        {section === "results" && <ResultsView campaign={campaign} />}
        {section === "settings" && <ProfileView profile={profile} openSetup={() => setSetupOpen(true)} />}
        {section === "help" && <SimpleView title="Help centre" body="Find launch instructions, practical examples and answers about using your campaign." />}
      </main>

      {setupOpen && <SetupFlow profile={profile} setProfile={setProfile} close={() => profileComplete && setSetupOpen(false)} finish={finishProfile} />}
    </div>
  );
}

function Nav({ href, label, icon: Icon, active, badge }: { href: string; label: string; icon: typeof Home; active: boolean; badge?: string }) {
  return <Link href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm", active ? "bg-[#183e2b] font-medium text-white" : "text-[#516057] hover:bg-[#eef1ec]")}><Icon className="h-4 w-4" /><span className="flex-1">{label}</span>{badge && <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase", active ? "bg-white/20" : "bg-[#dce8dd] text-[#31563e]")}>{badge}</span>}</Link>;
}

function LockedNav({ label, icon: Icon }: { label: string; icon: typeof Home }) {
  return <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#a1aaa4]"><Icon className="h-4 w-4" /><span className="flex-1">{label}</span><Lock className="h-3.5 w-3.5" /></div>;
}

function MobileHeader({ root }: { root: string }) {
  return <div className="flex items-center justify-between border-b bg-white px-5 py-4 lg:hidden"><div className="font-bold">FITNESS COMEBACK</div><Link href={`${root}/campaigns`}><Button size="sm">Campaigns</Button></Link></div>;
}

function PageTop({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <header className="border-b border-[#dfe4dc] bg-white px-6 py-8 md:px-10"><div className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#6f7c73]">{eyebrow}</div><h1 className="mt-2 font-display text-4xl text-[#142018]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#647168]">{body}</p></header>;
}

function HomeView({ root, profile, complete, campaign, openSetup }: { root: string; profile: Profile; complete: boolean; campaign: Campaign | null; openSetup: () => void }) {
  return <><PageTop eyebrow="Your workspace" title={profile.businessName ? `Welcome, ${profile.businessName}` : "Build your comeback campaign"} body="Turn your former-client list into a clear, personal campaign you can launch this week." />
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      {!complete ? <div className="rounded-2xl bg-[#183e2b] p-7 text-white"><Badge className="bg-[#d9f66b] text-[#183e2b] hover:bg-[#d9f66b]">Start here</Badge><h2 className="mt-4 font-display text-3xl">Tell us about your business</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Complete a guided profile so every message sounds relevant to your service, customers and offer.</p><Button onClick={openSetup} className="mt-6 bg-white text-[#183e2b] hover:bg-white/90">Set up my campaign <ArrowRight className="ml-2 h-4 w-4" /></Button></div> :
      <div className="rounded-2xl border border-[#dce3da] bg-white p-7"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="flex items-center gap-2 text-sm font-semibold text-[#d71920]"><CheckCircle2 className="h-4 w-4" /> Business profile complete</div><h2 className="mt-2 font-display text-3xl">{campaign ? "Your campaign is ready" : "Your campaign options are ready"}</h2><p className="mt-2 text-sm text-[#647168]">{campaign ? "Review your messages, copy them into your sending platform and start tracking replies." : "Choose a proven campaign frame or describe your own."}</p></div><Link href={`${root}/campaigns`}><Button>{campaign ? "Open campaign" : "Choose campaign"}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div></div>}
      <div className="grid gap-5 md:grid-cols-3"><StatCard value={campaign ? "1" : "0"} label="Campaigns created" icon={MessagesSquare} /><StatCard value={campaign ? String(campaign.messages.length) : "0"} label="Messages ready" icon={PenLine} /><StatCard value="0" label="Returns recorded" icon={Users} /></div>
      <div className="rounded-2xl border border-[#dce3da] bg-white p-7"><h3 className="font-display text-2xl">How it works</h3><div className="mt-6 grid gap-6 md:grid-cols-3"><Step n="01" title="Describe your business" text="Tell us what you sell, who you help and how you normally communicate." /><Step n="02" title="Choose your campaign" text="Start with our recommendation or select the angle that best fits your list." /><Step n="03" title="Launch and track" text="Copy your finished messages, follow the schedule and record the response." /></div></div>
    </div></>;
}

function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: typeof Home }) { return <div className="rounded-2xl border border-[#dce3da] bg-white p-6"><Icon className="h-5 w-5 text-[#52705b]" /><div className="mt-5 font-display text-4xl">{value}</div><div className="mt-1 text-xs text-[#718078]">{label}</div></div>; }
function Step({ n, title, text }: { n: string; title: string; text: string }) { return <div><div className="text-xs font-semibold text-[#8a968e]">{n}</div><div className="mt-2 font-semibold">{title}</div><p className="mt-2 text-sm leading-6 text-[#68756c]">{text}</p></div>; }

function CampaignsView({ live, profile, complete, campaign, openSetup, setCampaign, createCampaign }: { live: boolean; profile: Profile; complete: boolean; campaign: Campaign | null; openSetup: () => void; setCampaign: (campaign: Campaign) => void; createCampaign: (type: string, custom: string) => Promise<void> }) {
  const [selected, setSelected] = useState("Lost Routine Restart");
  const [custom, setCustom] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  if (!complete) return <><PageTop eyebrow="Campaigns" title="Complete your profile first" body="Your answers give the campaign the context it needs to feel specific and credible." /><div className="p-10"><Button onClick={openSetup} className="bg-[#183e2b]">Complete business profile</Button></div></>;
  if (campaign) return <CampaignOutput live={live} campaign={campaign} profile={profile} setCampaign={setCampaign} />;
  const create = async () => { setCreating(true); setError(""); try { await createCampaign(selected, custom); } catch (e) { setError(e instanceof Error ? e.message : "Could not create your campaign."); } finally { setCreating(false); } };
  return <><PageTop eyebrow="Campaigns" title="Choose your comeback angle" body="The campaign type provides the frame. Your profile provides the detail that makes every message personal to your business." />
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <section className="rounded-2xl border-2 border-[#315b3e] bg-[#f2f7f1] p-7"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-start"><div><Badge className="bg-[#d9f66b] text-[#183e2b] hover:bg-[#d9f66b]">Recommended for you</Badge><h2 className="mt-4 font-display text-3xl">Lost Routine Restart</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6f64]">A warm campaign for former clients who did not leave because they disliked the service. Life became busy, their routine broke and returning now feels harder than it should.</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">Email + SMS</Badge><Badge variant="outline">7 days</Badge><Badge variant="outline">5 messages</Badge></div></div><Button onClick={() => setSelected("Lost Routine Restart")} className="bg-[#183e2b]">Use this campaign</Button></div></section>
      <section><div className="mb-4"><h2 className="font-display text-2xl">All campaign types</h2><p className="mt-1 text-sm text-[#6c786f]">Selecting a campaign does not use your credit. Your credit is used only when you create the finished messages.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{campaignTypes.map(([title, desc, tag]) => <button key={title} onClick={() => setSelected(title)} className={cn("rounded-2xl border bg-white p-5 text-left transition", selected === title ? "border-[#315b3e] ring-2 ring-[#315b3e]/10" : "border-[#dce3da] hover:border-[#829086]")}><div className="flex items-start justify-between gap-3"><div className="font-semibold">{title}</div>{selected === title ? <Check className="h-4 w-4 text-[#315b3e]" /> : tag ? <span className="text-[9px] font-semibold uppercase text-[#52705b]">{tag}</span> : null}</div><p className="mt-2 text-xs leading-5 text-[#6b776f]">{desc}</p></button>)}</div></section>
      <section className="rounded-2xl border border-dashed border-[#a9b4ac] bg-white p-6"><div className="flex items-start gap-4"><div className="rounded-xl bg-[#edf2ec] p-3"><PenLine className="h-5 w-5" /></div><div className="flex-1"><h3 className="font-semibold">Create a custom campaign</h3><p className="mt-1 text-sm text-[#6b776f]">Describe who you want to contact, why now and what you want them to do.</p><Textarea value={custom} onChange={(e) => { setCustom(e.target.value); setSelected("Custom Campaign"); }} className="mt-4 min-h-24" placeholder="For example: clients who completed our six-week challenge last spring but did not continue..." /></div></div></section>
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-[#dce3da] bg-white/95 p-4 shadow-xl backdrop-blur"><div><div className="text-xs text-[#738078]">Selected campaign</div><div className="font-semibold">{selected}</div></div><Button disabled={creating || (selected === "Custom Campaign" && custom.trim().length < 10)} onClick={create}>{creating ? "Creating your campaign..." : "Create my campaign"}<Sparkles className="ml-2 h-4 w-4" /></Button></div>
    </div></>;
}

function buildCampaign(type: string, p: Profile, custom: string): Campaign {
  const business = p.businessName || "your fitness business";
  const service = p.service || "training";
  const offer = p.offer || "a simple return session to help you get moving again";
  const link = p.bookingLink || "[booking link]";
  const context = type === "Custom Campaign" && custom ? custom : `former clients whose routine with ${service} has slipped`;
  return { type, title: `${type} Campaign`, createdAt: new Date().toISOString(), messages: [
    { channel: "Email", day: "Day 1", subject: "Fancy getting back into it?", body: `Hi [First name],\n\nI was thinking about a few people we have not seen for a while and your name came to mind. If your routine has slipped, you are certainly not the only one.\n\nWe have made it easy to return with ${offer}. There is no pressure to be at your previous level. We will simply help you find a sensible place to restart.\n\nIf you would like to come back, choose a time here: ${link}\n\n${business}` },
    { channel: "SMS", day: "Day 2", body: `Hi [First name], it is [Sender] from ${business}. Just checking you saw my note about getting back into ${service}. If you would like an easy first step, reply YES and I will help.` },
    { channel: "Email", day: "Day 4", subject: "The hardest part is the first session", body: `Hi [First name],\n\nMost people do not stop because they stopped caring about their goal. Work, family and life simply get in the way.\n\nThat is why your first session back is about rebuilding momentum, not proving anything. ${offer}.\n\nYou can choose a suitable time here: ${link}\n\nHope to see you soon,\n${business}` },
    { channel: "SMS", day: "Day 6", body: `Would you like me to find you a suitable time next week, [First name]? Reply with MORNING or EVENING and I will point you in the right direction. ${business}` },
    { channel: "Email", day: "Day 7", subject: "Shall I close this for now?", body: `Hi [First name],\n\nI do not want to fill your inbox, so this is my last message for now. If returning to ${service} is still on your mind, we would be pleased to help.\n\nYou can use ${link}, or reply and tell me what is making it difficult to restart.\n\nAll the best,\n${business}` },
  ].map((m) => ({ ...m, body: p.wordsToAvoid ? m.body : m.body })) as Campaign["messages"] };
}

function CampaignOutput({ live, campaign, profile, setCampaign }: { live: boolean; campaign: Campaign; profile: Profile; setCampaign: (campaign: Campaign) => void }) {
  const [messages, setMessages] = useState(campaign.messages);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<"save" | "revise" | "">("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setMessages(campaign.messages), [campaign]);
  const update = (i: number, body: string) => setMessages((all) => all.map((m, n) => n === i ? { ...m, body } : m));
  const save = async () => {
    setBusy("save"); setNotice(""); setError("");
    try {
      if (live && campaign.id) {
        const result = await api<{ campaign: Campaign }>(`/comeback/campaigns/${campaign.id}`, { method: "PATCH", body: JSON.stringify({ messages }) });
        setCampaign(result.campaign);
      } else setCampaign({ ...campaign, messages });
      setNotice("Changes saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save changes."); }
    finally { setBusy(""); }
  };
  const revise = async () => {
    if (instruction.trim().length < 3) return;
    setBusy("revise"); setNotice(""); setError("");
    try {
      if (live && campaign.id) {
        const result = await api<{ campaign: Campaign }>(`/comeback/campaigns/${campaign.id}/revise`, { method: "POST", body: JSON.stringify({ instruction, messages }) });
        setCampaign(result.campaign);
      } else {
        const revised = messages.map((message) => ({ ...message, body: `${message.body}\n\n[Preview change requested: ${instruction}]` }));
        setMessages(revised); setCampaign({ ...campaign, messages: revised });
      }
      setInstruction(""); setNotice("Your campaign has been updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not revise the campaign."); }
    finally { setBusy(""); }
  };
  return <><PageTop eyebrow="My campaign" title={campaign.title} body={`A ready-to-launch campaign for ${profile.businessName || "your business"}. Review every message before sending.`} />
    <div className="mx-auto max-w-5xl space-y-7 p-6 md:p-10"><div className="grid gap-4 md:grid-cols-4"><Mini label="Audience" value={profile.listSize ? `${profile.listSize} contacts` : "Former clients"} /><Mini label="Channels" value="Email + SMS" /><Mini label="Schedule" value={campaign.scheduleSummary || "7 days"} /><Mini label="Messages" value={String(messages.length)} /></div>
      {(campaign.audienceSummary || campaign.offerRecommendation) && <div className="grid gap-4 md:grid-cols-2"><Insight title="Who this is for" text={campaign.audienceSummary || ""} /><Insight title="Recommended offer" text={campaign.offerRecommendation || ""} /></div>}
      <div className="rounded-2xl border-2 border-[#d71920] bg-[#fff4f4] p-6"><h3 className="font-display text-2xl">Change the whole campaign</h3><p className="mt-1 text-sm text-[#61646a]">Ask for a different tone, shorter messages, a stronger offer or any other change. Add enough context to make it accurate.</p><Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} className="mt-4 bg-white" placeholder="For example: make this warmer and less sales-focused. Most clients stopped because their work schedule changed." /><Button disabled={busy !== "" || instruction.trim().length < 3} onClick={revise} className="mt-3">{busy === "revise" ? "Applying changes..." : "Apply changes"}</Button>{campaign.revisionCount !== undefined && <span className="ml-3 text-xs text-[#777]">{10 - campaign.revisionCount} revisions remaining</span>}</div>
      <div className="space-y-4">{messages.map((m, i) => <article key={i} className="rounded-2xl border border-[#dce3da] bg-white"><div className="flex items-center justify-between border-b px-6 py-4"><div className="flex items-center gap-3"><Badge variant="outline">{m.channel}</Badge><span className="text-sm font-semibold">{m.day}</span>{m.purpose && <span className="hidden text-xs text-[#777] md:inline">{m.purpose}</span>}</div><Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText([m.subject, m.body].filter(Boolean).join("\n\n"))}><Clipboard className="mr-2 h-4 w-4" />Copy</Button></div><div className="p-6">{m.subject !== undefined && <Input className="mb-3 font-semibold" value={m.subject} onChange={(e) => setMessages((all) => all.map((x, n) => n === i ? { ...x, subject: e.target.value } : x))} />}<Textarea className="min-h-44 leading-6" value={m.body} onChange={(e) => update(i, e.target.value)} /></div></article>)}</div>
      {(notice || error) && <div className={cn("rounded-xl p-4 text-sm", error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800")}>{error || notice}</div>}
      <div className="flex justify-end"><Button disabled={busy !== ""} onClick={save}>{busy === "save" ? "Saving..." : "Save message changes"}</Button></div>
      {campaign.launchChecklist?.length ? <div className="rounded-2xl bg-[#17191c] p-7 text-white"><h3 className="font-display text-2xl">Before you launch</h3><div className="mt-4 space-y-3">{campaign.launchChecklist.map((item) => <div key={item} className="flex gap-3 text-sm text-white/80"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff2b2b]" />{item}</div>)}</div><p className="mt-5 border-t border-white/15 pt-5 text-xs text-white/60">This app does not send messages. Copy the approved campaign into the platform you already use.</p></div> : null}
    </div></>;
}

function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#dce3da] bg-white p-4"><div className="text-[10px] uppercase tracking-wider text-[#7c8980]">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>; }
function Insight({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border bg-white p-6"><div className="text-xs font-semibold uppercase tracking-wider text-[#d71920]">{title}</div><p className="mt-2 text-sm leading-6 text-[#5e6167]">{text}</p></div>; }

function ReplyView() { const [reply, setReply] = useState(""); return <><PageTop eyebrow="Order bump" title="Comeback Reply Assistant" body="Turn a former client’s reply into a natural, useful response that moves the conversation forward." /><div className="mx-auto max-w-3xl p-6 md:p-10"><div className="rounded-2xl border border-[#dce3da] bg-white p-7"><div className="flex items-center justify-between"><Badge className="bg-[#e8f0e7] text-[#315b3e] hover:bg-[#e8f0e7]">Preview</Badge><span className="text-xs text-[#77837b]">25 replies included</span></div><h2 className="mt-5 font-display text-2xl">Paste their message</h2><Textarea value={reply} onChange={(e) => setReply(e.target.value)} className="mt-3 min-h-36" placeholder="Paste the former client’s reply here. Remove sensitive health or payment information first." /><Textarea className="mt-3 min-h-24" placeholder="Optional context: what do you know about this person and what outcome would help?" /><Button disabled={!reply} className="mt-4 bg-[#183e2b]">Create response</Button></div></div></> }

function ResultsView({ campaign }: { campaign: Campaign | null }) { return <><PageTop eyebrow="Results" title="Track what comes back" body="Record the useful numbers from your sending platform so you can see what your campaign produced." /><div className="mx-auto grid max-w-5xl gap-5 p-6 md:grid-cols-3 md:p-10"><StatCard value={campaign ? "0" : "—"} label="Replies" icon={MessageCircleReply} /><StatCard value={campaign ? "0" : "—"} label="Bookings" icon={CheckCircle2} /><StatCard value={campaign ? "£0" : "—"} label="Revenue recovered" icon={BarChart3} /></div></> }
function ProfileView({ profile, openSetup }: { profile: Profile; openSetup: () => void }) { return <><PageTop eyebrow="Settings" title="Business profile" body="These details are used to keep every campaign relevant to your business." /><div className="mx-auto max-w-3xl p-6 md:p-10"><div className="rounded-2xl border bg-white p-7"><div className="grid gap-5 md:grid-cols-2"><Mini label="Business" value={profile.businessName || "Not completed"} /><Mini label="Business type" value={profile.businessType || "Not completed"} /><Mini label="Main service" value={profile.service || "Not completed"} /><Mini label="Writing preference" value={profile.voiceMode} /></div><Button onClick={openSetup} variant="outline" className="mt-6">Edit profile</Button></div></div></> }
function SimpleView({ title, body }: { title: string; body: string }) { return <><PageTop eyebrow="Support" title={title} body={body} /><div className="p-10 text-sm text-[#647168]">Support content will be added before launch.</div></> }

function SetupFlow({ profile, setProfile, close, finish }: { profile: Profile; setProfile: (p: Profile) => void; close: () => void; finish: () => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof Profile, value: string) => setProfile({ ...profile, [key]: value });
  const required = useMemo(() => step === 0 ? profile.businessName && profile.businessType : step === 1 ? profile.service : step === 2 ? profile.idealClient && profile.leavingReasons : true, [step, profile]);
  const save = async () => { setSaving(true); setError(""); try { await finish(); } catch (e) { setError(e instanceof Error ? e.message : "Could not save your profile."); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#102217]/80 p-3 backdrop-blur-sm md:p-8"><div className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-4xl overflow-hidden rounded-3xl bg-[#fbfcf9] shadow-2xl md:min-h-0">
    <div className="border-b px-6 py-5 md:px-10"><div className="flex items-center justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#748078]">Business setup</div><div className="mt-1 font-display text-2xl">Help us understand your business</div></div><button onClick={close} className="text-sm text-[#6b776f]">Save and close</button></div><div className="mt-5 flex gap-2">{steps.map((s, i) => <div key={s} className="flex-1"><div className={cn("h-1 rounded-full", i <= step ? "bg-[#315b3e]" : "bg-[#dfe4dc]")} /><div className="mt-2 hidden text-[10px] text-[#6c786f] md:block">{s}</div></div>)}</div></div>
    <div className="px-6 py-8 md:px-10"><SetupStep step={step} profile={profile} set={set} /></div>
    {error && <div className="px-6 text-sm text-red-700 md:px-10">{error}</div>}
    <div className="flex items-center justify-between border-t px-6 py-5 md:px-10"><Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((s) => s - 1)}><ChevronLeft className="mr-2 h-4 w-4" />Back</Button>{step < 4 ? <Button disabled={!required} onClick={() => setStep((s) => s + 1)}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button disabled={saving} onClick={save}>{saving ? "Saving profile..." : "Save my profile"} <Check className="ml-2 h-4 w-4" /></Button>}</div>
  </div></div>;
}

function SetupStep({ step, profile, set }: { step: number; profile: Profile; set: (key: keyof Profile, value: string) => void }) {
  const uploadWriting = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    set("voiceExamples", [profile.voiceExamples, text].filter(Boolean).join("\n\n").slice(0, 12000));
    event.target.value = "";
  };
  if (step === 0) return <SetupSection title="First, tell us about the business" body="We use this to choose appropriate language and recommendations."><Field label="Business name" required><Input value={profile.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Example: Northside Strength" /></Field><Field label="What type of business is it?" required><Choice value={profile.businessType} onChange={(v) => set("businessType", v)} options={["Personal training", "Gym or microgym", "Pilates or yoga studio", "Online coaching", "Martial arts", "Dance or movement", "Other fitness business"]} /></Field><div className="grid gap-5 md:grid-cols-2"><Field label="Town, region or online"><Input value={profile.location} onChange={(e) => set("location", e.target.value)} placeholder="Example: Manchester, UK" /></Field><Field label="Approximate former-client list"><Input value={profile.listSize} onChange={(e) => set("listSize", e.target.value)} placeholder="Example: 180" /></Field></div></SetupSection>;
  if (step === 1) return <SetupSection title="What do clients buy from you?" body="Clear commercial details prevent vague messages and unsuitable offers."><Field label="Main service" required><Input value={profile.service} onChange={(e) => set("service", e.target.value)} placeholder="Example: Semi-private strength coaching" /></Field><div className="grid gap-5 md:grid-cols-2"><Field label="Typical price"><Input value={profile.price} onChange={(e) => set("price", e.target.value)} placeholder="Example: £149 per month" /></Field><Field label="Booking or enquiry link"><Input value={profile.bookingLink} onChange={(e) => set("bookingLink", e.target.value)} placeholder="https://..." /></Field></div><Field label="What can you offer returning clients?"><Textarea value={profile.offer} onChange={(e) => set("offer", e.target.value)} placeholder="A free return consultation, a paid starter session, reserved place, bonus session or no incentive at all" /></Field></SetupSection>;
  if (step === 2) return <SetupSection title="Tell us about the people you want back" body="You know the customers. Give us enough detail to avoid generic marketing."><Field label="Who are your best-fit former clients?" required><Textarea value={profile.idealClient} onChange={(e) => set("idealClient", e.target.value)} placeholder="Age, experience, lifestyle, goals and what they valued about working with you" /></Field><Field label="Why did they usually stop?" required><Textarea value={profile.leavingReasons} onChange={(e) => set("leavingReasons", e.target.value)} placeholder="Busy schedule, cost, injury, moved away, lost motivation, finished a programme or another reason" /></Field><Field label="What result did they originally want?"><Input value={profile.clientGoal} onChange={(e) => set("clientGoal", e.target.value)} placeholder="Example: feel stronger and stay consistent" /></Field><Field label="Anything else that would help?"><Textarea value={profile.extraContext} onChange={(e) => set("extraContext", e.target.value)} placeholder="Mention previous campaigns, common objections, current capacity or anything unusual about this group" /></Field></SetupSection>;
  if (step === 3) return <SetupSection title="How should the messages sound?" body="You can provide examples or choose a style. You stay in control of the final wording."><Field label="Writing preference"><Choice value={profile.voiceMode} onChange={(v) => set("voiceMode", v)} options={["Improve my usual style", "Sound like me", "Use a different style"]} /></Field>{profile.voiceMode === "Use a different style" ? <Field label="Choose a style"><Choice value={profile.voiceExamples} onChange={(v) => set("voiceExamples", v)} options={["Friendly and conversational", "Warm and reassuring", "Calm and professional", "Energetic", "Direct", "Premium", "Community focused"]} /></Field> : <Field label="Paste 3 to 5 examples you wrote"><Textarea value={profile.voiceExamples} onChange={(e) => set("voiceExamples", e.target.value)} className="min-h-40" placeholder="Paste outgoing texts, emails, posts or follow-ups. Remove names and personal details first." /><label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#d71920]"><Upload className="h-4 w-4" />Upload a .txt or .md file<input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={uploadWriting} className="hidden" /></label></Field>}<Field label="Words or phrases to avoid"><Input value={profile.wordsToAvoid} onChange={(e) => set("wordsToAvoid", e.target.value)} placeholder="Separate with commas" /></Field></SetupSection>;
  return <SetupSection title="Check the essentials" body="You can edit this profile later. Your campaign credit is not used during setup."><div className="grid gap-4 md:grid-cols-2"><Review label="Business" value={profile.businessName} /><Review label="Type" value={profile.businessType} /><Review label="Service" value={profile.service} /><Review label="Former clients" value={profile.idealClient} /><Review label="Common reason for leaving" value={profile.leavingReasons} /><Review label="Writing preference" value={profile.voiceMode} /></div><div className="mt-6 rounded-xl bg-[#eaf1eb] p-4 text-sm leading-6 text-[#53645a]">Next, you will see one recommended campaign and the complete campaign library. You can browse freely before using your campaign credit.</div></SetupSection>;
}

function SetupSection({ title, body, children }: { title: string; body: string; children: React.ReactNode }) { return <div><h2 className="font-display text-3xl">{title}</h2><p className="mt-2 text-sm leading-6 text-[#68756c]">{body}</p><div className="mt-8 space-y-6">{children}</div></div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="block"><div className="mb-2 text-sm font-semibold">{label}{required && <span className="ml-1 text-[#59725f]">*</span>}</div>{children}</div>; }
function Choice({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) { return <div className="grid gap-2 sm:grid-cols-2">{options.map((o) => <button type="button" key={o} onClick={() => onChange(o)} className={cn("rounded-xl border px-4 py-3 text-left text-sm", value === o ? "border-[#315b3e] bg-[#eef5ed] font-medium" : "border-[#dce3da] bg-white hover:border-[#91a096]")}>{o}</button>)}</div>; }
function Review({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-white p-4"><div className="text-[10px] uppercase tracking-wider text-[#7a877e]">{label}</div><div className="mt-1 text-sm font-medium">{value || "Not provided"}</div></div>; }
