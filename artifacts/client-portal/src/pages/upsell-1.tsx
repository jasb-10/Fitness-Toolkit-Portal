import { ArrowRight, Lock, WandSparkles } from "lucide-react";
import { Link } from "wouter";
import { AppShell, PageHeader } from "@/components/AppShell";

export default function Upsell1Page() {
  return (
    <AppShell>
      <PageHeader eyebrow="$47 upsell 1" title="Campaign Studio." description="Turn the same saved business profile, offer and brand direction into a practical campaign package you can review, copy and launch in your existing tools." />
      <div className="space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <div className="relative overflow-hidden rounded-2xl bg-sidebar p-7 text-sidebar-foreground sm:p-10"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[30px] border-primary/20" /><div className="relative max-w-xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-accent"><WandSparkles className="h-4 w-4" /> Campaign Studio</div><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.05em]">A campaign that sounds like your business.</h2><p className="mt-4 text-sm leading-6 text-sidebar-foreground/65">Choose an objective such as attracting new clients, filling classes, promoting online coaching, recovering lost leads or bringing former clients back. Review and send it yourself.</p><div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-sidebar-foreground/15 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground/65"><Lock className="h-4 w-4" /> Unlocks with Campaign Studio</div></div></div>
        <div className="grid gap-4 md:grid-cols-3">{["Offer angle and schedule", "Email, social and message copy", "Follow-up and reply guidance"].map((item, index) => <div key={item} className="rounded-2xl border border-border bg-card p-5"><div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">0{index + 1}</div><div className="mt-4 font-display text-xl font-semibold">{item}</div><p className="mt-2 text-sm leading-5 text-muted-foreground">Personalised from your saved website brief. No CRM or automated sending included.</p></div>)}</div>
        <Link href="/website" data-testid="link-upsell-1-website" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3">Return to my website <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </AppShell>
  );
}
