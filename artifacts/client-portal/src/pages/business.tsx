import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  useGetBusinessProfile,
  useUpdateBusinessProfile,
  getGetBusinessProfileQueryKey,
} from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BriefcaseBusiness, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function BusinessProfilePage() {
  const { data: me } = useGetMe();
  const { data: profile, isLoading } = useGetBusinessProfile();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    businessName: "",
    niche: "",
    location: "",
    service: "",
    audience: "",
    conversionGoal: "",
    destinationUrl: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName || (me?.user.name ? `${me.user.name}'s Fitness` : ""),
        niche: profile.niche || "",
        location: profile.location || "",
        service: profile.service || "",
        audience: profile.audience || "",
        conversionGoal: profile.conversionGoal || "",
        destinationUrl: profile.destinationUrl || "",
      });
    } else if (me && !isLoading) {
      setForm((prev) => ({ ...prev, businessName: prev.businessName || (me.user.name ? `${me.user.name}'s Fitness` : "") }));
    }
  }, [profile, me, isLoading]);

  const update = useUpdateBusinessProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBusinessProfileQueryKey() });
        toast({ title: "Business profile saved" });
      },
      onError: () => {
        toast({ title: "Failed to save profile", variant: "destructive" });
      },
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="My Business"
        title="Your Business Profile"
        description="Your company details, brand guidelines, and core offers. Used across your website, extra pages, and campaign tools."
      />
      <div className="space-y-8 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-semibold">Business Details</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Manage your business name, operating location, and primary audience. These details sync automatically with your website builder.
              </p>
              
              {isLoading ? (
                <div className="mt-8 space-y-6 max-w-xl">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    update.mutate({ data: form });
                  }}
                  className="mt-8 space-y-6 max-w-xl"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Business Name</label>
                    <input 
                      type="text" 
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Business Type</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. Personal trainer, Pilates studio, online coach"
                      value={form.niche}
                      onChange={(e) => setForm({ ...form, niche: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Primary Location</label>
                    <input 
                      type="text" 
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                      placeholder="e.g. London, UK"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Main Service or Offer</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. One-to-one strength coaching"
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Target Audience</label>
                    <textarea 
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]" 
                      placeholder="Who do you help? e.g. Busy professionals looking to build sustainable strength."
                      value={form.audience}
                      onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Main Conversion Goal</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. Book a consultation"
                      value={form.conversionGoal}
                      onChange={(e) => setForm({ ...form, conversionGoal: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Destination URL</label>
                    <input
                      type="url"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="https://your-booking-page.example"
                      value={form.destinationUrl}
                      onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Where the main website button should send visitors.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      type="submit" 
                      disabled={update.isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
                    >
                      {update.isPending ? "Saving..." : "Save Changes"}
                    </button>
                    {update.isSuccess && !update.isPending && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Saved
                      </span>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
        
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Sync with Website Builder</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your business profile provides the foundation for your website brief.</p>
            </div>
            <Link href="/website" className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
              Open Website Builder
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
