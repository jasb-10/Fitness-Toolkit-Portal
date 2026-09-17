import { ArrowRight, Lock, WandSparkles } from "lucide-react";
import { Link } from "wouter";
import { AppShell, PageHeader } from "@/components/AppShell";

export default function Upsell1Page() {
  return (
    <AppShell>
      <PageHeader eyebrow="Next level" title="Keep your edge." description="A focused premium track for owners who want sharper systems, cleaner offers, and a faster path from idea to execution." />
      <div className="space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <div className="relative overflow-hidden rounded-2xl bg-sidebar p-7 text-sidebar-foreground sm:p-10"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[30px] border-primary/20" /><div className="relative max-w-xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-accent"><WandSparkles className="h-4 w-4" /> Premium track one</div><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.05em]">The systems that make good work repeatable.</h2><p className="mt-4 text-sm leading-6 text-sidebar-foreground/65">This guided experience is being prepared for members ready to turn their best weeks into a business rhythm.</p><div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-sidebar-foreground/15 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground/65"><Lock className="h-4 w-4" /> Access opens soon</div></div></div>
        <div className="grid gap-4 md:grid-cols-3">{["Offer clarity", "Repeatable delivery", "Confident decisions"].map((item, index) => <div key={item} className="rounded-2xl border border-border bg-card p-5"><div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">0{index + 1}</div><div className="mt-4 font-display text-xl font-semibold">{item}</div><p className="mt-2 text-sm leading-5 text-muted-foreground">A practical module designed to become part of how you run the week.</p></div>)}</div>
        <Link href="/courses" data-testid="link-upsell-1-courses" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3">Return to your learning path <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </AppShell>
  );
}
