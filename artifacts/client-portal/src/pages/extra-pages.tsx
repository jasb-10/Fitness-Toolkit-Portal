import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CircleHelp,
  FilePlus2,
  Info,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import {
  getListWebsiteProjectsQueryKey,
  useListWebsiteProjects,
  useUpdateWebsiteProject,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ExtraPage = {
  id: string;
  title: string;
  description: string;
  icon: typeof Info;
  recommended?: boolean;
};

const pageOptions: ExtraPage[] = [
  { id: "services", title: "Services", description: "Give each service or programme room for its benefits, format and next step.", icon: ListChecks, recommended: true },
  { id: "about", title: "About", description: "Tell your story, explain your approach and introduce the people behind the business.", icon: Users, recommended: true },
  { id: "classes", title: "Classes", description: "Present class types, who they suit and how customers can join or book.", icon: CalendarDays },
  { id: "pricing", title: "Pricing", description: "Lay out genuine packages and prices clearly, without invented offers.", icon: Star },
  { id: "faq", title: "FAQ", description: "Answer the practical questions that can stop somebody from getting started.", icon: CircleHelp, recommended: true },
  { id: "resources", title: "Resources", description: "Share useful guides, articles or downloads that support your customers.", icon: BookOpen },
];

type SavedExtraPages = {
  selected?: string[];
  customTitle?: string;
  status?: string;
};

export default function ExtraPagesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projects = useListWebsiteProjects();
  const updateProject = useUpdateWebsiteProject();
  const project = projects.data?.[0];
  const [selected, setSelected] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [hydratedProjectId, setHydratedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!project || hydratedProjectId === project.id) return;
    const saved = ((project.styleData as Record<string, unknown> | null)?.extraPages ?? {}) as SavedExtraPages;
    setSelected(saved.selected ?? []);
    setCustomTitle(saved.customTitle ?? "");
    setHydratedProjectId(project.id);
  }, [project, hydratedProjectId]);

  const selectedPages = useMemo(
    () => pageOptions.filter((page) => selected.includes(page.id)),
    [selected],
  );

  const togglePage = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((pageId) => pageId !== id) : [...current, id],
    );
  };

  const savePlan = async () => {
    if (!project) return;
    const currentStyle = (project.styleData ?? {}) as Record<string, unknown>;
    const extraPages: SavedExtraPages = {
      selected,
      customTitle: customTitle.trim(),
      status: selected.length ? "planned" : "not_started",
    };
    try {
      const updated = await updateProject.mutateAsync({
        projectId: project.id,
        data: { styleData: { ...currentStyle, extraPages } },
      });
      queryClient.setQueryData(getListWebsiteProjectsQueryKey(), (current: typeof projects.data) =>
        current?.map((item) => item.id === updated.id ? updated : item),
      );
      toast({ title: "Extra Pages plan saved", description: `${selected.length} page${selected.length === 1 ? "" : "s"} connected to your website project.` });
    } catch {
      toast({ title: "Could not save your plan", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Website expansion"
        title="Build out your website."
        description="Choose the extra pages your business needs. They will reuse your approved copy, colours, imagery and brand direction."
        actions={
          <button
            type="button"
            onClick={() => void savePlan()}
            disabled={!project || updateProject.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_28px_hsl(var(--primary)/.2)] disabled:opacity-50"
          >
            {updateProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save page plan
          </button>
        }
      />

      <div className="space-y-7 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <section className="relative overflow-hidden rounded-[28px] bg-sidebar p-7 text-sidebar-foreground sm:p-10">
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border-[42px] border-primary/20" />
          <div className="absolute -bottom-28 right-48 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-accent"><FilePlus2 className="h-4 w-4" /> Extra Pages</div>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.05em] sm:text-5xl">More room for the details that help people choose you.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-sidebar-foreground/65">Select up to four focused pages. Your choices are saved against the same website project, ready to be written and added to its navigation.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.06] p-5 backdrop-blur">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-sidebar-foreground/60">Your page plan</span><span className="text-2xl font-bold">{selected.length}<span className="text-sm text-sidebar-foreground/35"> / 4</span></span></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(selected.length / 4, 1) * 100}%` }} /></div>
              <p className="mt-3 text-xs leading-5 text-sidebar-foreground/45">{selected.length ? selectedPages.map((page) => page.title).join(" · ") : "Choose pages below to create your plan."}</p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Choose your pages</div><h3 className="mt-2 font-display text-3xl font-semibold tracking-tight">What needs more space?</h3></div>
            <p className="text-xs text-muted-foreground">Recommended pages are based on a typical fitness business.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pageOptions.map((page) => {
              const active = selected.includes(page.id);
              const atLimit = selected.length >= 4 && !active;
              const Icon = page.icon;
              return (
                <button
                  key={page.id}
                  type="button"
                  disabled={atLimit}
                  onClick={() => togglePage(page.id)}
                  className={cn(
                    "group relative min-h-52 rounded-2xl border-2 bg-card p-6 text-left transition-all",
                    active ? "border-primary shadow-[0_14px_38px_hsl(var(--primary)/.1)]" : "border-border hover:-translate-y-0.5 hover:border-foreground/20",
                    atLimit && "cursor-not-allowed opacity-45",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={cn("grid h-11 w-11 place-items-center rounded-xl", active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}><Icon className="h-5 w-5" /></div>
                    <div className={cn("grid h-7 w-7 place-items-center rounded-full border-2", active ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent")}><Check className="h-4 w-4" /></div>
                  </div>
                  {page.recommended && <div className="mt-5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[.16em] text-primary"><Sparkles className="h-3 w-3" /> Recommended</div>}
                  <h4 className={cn("font-display text-2xl font-semibold", page.recommended ? "mt-2" : "mt-8")}>{page.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{page.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-border bg-card p-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <label htmlFor="custom-page" className="flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-primary" /> Need a different page?</label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Add one custom page idea, such as Corporate Wellness or Coach Education.</p>
            <input id="custom-page" value={customTitle} onChange={(event) => setCustomTitle(event.target.value.slice(0, 60))} placeholder="Enter a custom page title" className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
          </div>
          <button type="button" onClick={() => void savePlan()} disabled={!project || updateProject.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3.5 text-sm font-bold text-background disabled:opacity-50">
            {updateProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save {selected.length ? `${selected.length} selected page${selected.length === 1 ? "" : "s"}` : "page plan"}
          </button>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">{projects.isLoading ? "Loading your website project…" : project ? "Connected to your latest website project." : "Create your main website before saving Extra Pages."}</p>
          <Link href="/website" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Return to my website <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </AppShell>
  );
}