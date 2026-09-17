import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Download, FileText, LayoutTemplate, Palette } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";

export default function DashboardPage() {
  const { data: me } = useGetMe();
  const firstName = me?.user.name?.split(" ")[0] ?? "there";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Website workspace"
        title={`Build something clear, ${firstName}.`}
        description="Create a polished landing page for your fitness business, review it across devices, and download the files when you are ready."
        actions={<Link href="/website" data-testid="link-dashboard-start-website" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_22px_hsl(var(--primary)/.2)] hover:-translate-y-0.5 hover:bg-primary/90">Open my website <ArrowRight className="h-4 w-4" /></Link>}
      />
      <div className="space-y-8 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <section className="relative overflow-hidden rounded-2xl bg-sidebar p-7 text-sidebar-foreground sm:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[30px] border-primary/25" />
          <div className="relative max-w-2xl"><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-accent">Your $27 website</div><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.05em]">A clear page for the business you are building.</h2><p className="mt-4 text-sm leading-6 text-sidebar-foreground/65">Share the real details, choose a complete visual direction, review the result on every screen, and download a ready-to-publish website package.</p><Link href="/website" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground">Start my website <ArrowRight className="h-4 w-4" /></Link></div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <WorkspaceCard icon={FileText} title="Complete your brief" body="Add your offer, audience, proof, links and brand context." href="/website" action="Open brief" />
          <WorkspaceCard icon={Palette} title="Choose a design direction" body="Explore Bold Performance, Editorial Calm, Natural Studio and Modern Clarity." href="/website" action="Explore styles" />
          <WorkspaceCard icon={Download} title="Review and deliver" body="Edit the page, approve the draft and download the website files." href="/website" action="Open website" />
        </section>
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8"><div className="flex items-start gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"><LayoutTemplate className="h-5 w-5" /></div><div><h2 className="font-display text-2xl font-semibold">Extend the same website project</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Extra Pages adds depth to the site. Campaign Studio and Meta Ads use the same saved business profile, offer and brand direction when those products are purchased.</p></div></div></section>
      </div>
    </AppShell>
  );
}

function WorkspaceCard({ icon: Icon, title, body, href, action }: { icon: typeof FileText; title: string; body: string; href: string; action: string }) {
  return <Link href={href} className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_12px_30px_hsl(var(--foreground)/.06)]"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Icon className="h-5 w-5" /></div><h3 className="mt-5 font-display text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">{action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>;
}