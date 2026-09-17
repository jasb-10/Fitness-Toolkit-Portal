import { ArrowRight, Lock, Rocket, Target } from "lucide-react";
import { Link } from "wouter";
import { AppShell, PageHeader } from "@/components/AppShell";

export default function Upsell2Page() {
  return (
    <AppShell>
      <PageHeader eyebrow="$97 upsell 2" title="Meta Ad Launch Pack." description="A practical paid-traffic package built from your saved offer, audience, brand and website direction." />
      <div className="space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-7 sm:p-10"><div className="flex max-w-2xl flex-col gap-5 sm:flex-row sm:items-start"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Rocket className="h-5 w-5" /></div><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary"><Lock className="h-3.5 w-3.5" /> Reserved for Meta Ads buyers</div><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-.04em]">A launch pack, not just a caption generator.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">The finished pack will include campaign strategy, genuinely different ad angles, copy variants, downloadable creative, a matching landing-page variation and a launch checklist. You launch it in your own Meta account.</p><button type="button" onClick={() => window.dispatchEvent(new Event("open-support-widget"))} data-testid="button-upsell-2-notify" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:-translate-y-0.5"><Target className="h-4 w-4" /> Ask about access</button></div></div></div>
        <Link href="/website" data-testid="link-upsell-2-website" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3">Return to my website <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </AppShell>
  );
}
