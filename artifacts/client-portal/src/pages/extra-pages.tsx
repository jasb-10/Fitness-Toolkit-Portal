import { ArrowRight, FilePlus2, Lock } from "lucide-react";
import { Link } from "wouter";
import { AppShell, PageHeader } from "@/components/AppShell";

export default function ExtraPagesPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Website bump 1" title="Add depth to the same website." description="Extra Pages extends your approved one-page site with connected pages that reuse your business profile, design direction and brand assets." />
      <div className="space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <section className="relative overflow-hidden rounded-2xl bg-sidebar p-7 text-sidebar-foreground sm:p-10">
          <div className="relative max-w-2xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-accent"><FilePlus2 className="h-4 w-4" /> Bump 1</div><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.05em]">More room for the details that help people choose you.</h2><p className="mt-4 text-sm leading-6 text-sidebar-foreground/65">Choose suitable pages such as Services, About, Classes, Pricing, FAQ or Contact. The final package will keep the same navigation and visual system.</p><div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-sidebar-foreground/15 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground/65"><Lock className="h-4 w-4" /> Unlocks with Extra Pages</div></div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">{["Services or programmes", "About the coach or studio", "Classes, FAQ or booking"].map((item) => <div key={item} className="rounded-2xl border border-border bg-card p-5"><div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Page option</div><div className="mt-4 font-display text-xl font-semibold">{item}</div><p className="mt-2 text-sm leading-5 text-muted-foreground">Built from the same saved brief, evidence and design direction.</p></div>)}</section>
        <Link href="/website" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Return to my website <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </AppShell>
  );
}