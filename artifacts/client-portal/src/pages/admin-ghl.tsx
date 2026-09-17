import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { AlertTriangle, CheckCircle2, RefreshCw, Save, Webhook } from "lucide-react";
import { AdminPageHeader, AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { basePath } from "@/lib/utils";

type Mapping = {
  productCode: string; productName: string; priceCents: number;
  externalProductId: string | null; enabled: boolean; deliverableReady: boolean;
};
type Event = {
  id: string; eventId: string; orderId: string; purchaserEmail: string;
  productCode: string | null; eventType: string; processingStatus: string;
  activationStatus: string; error: string | null; receivedAt: string;
};
type State = {
  configured: boolean; webhookPath: string; activeEntitlements: number;
  mappings: Mapping[]; events: Event[];
};

export default function AdminGhlPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  async function request(path = "", init?: RequestInit) {
    const token = await getToken();
    const response = await fetch(`${basePath}/api/admin/ghl${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    });
    if (!response.ok) throw new Error((await response.json()).error || "Request failed");
    return response.json();
  }
  async function load() {
    try { setData(await request()); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not load GHL status"); }
  }
  useEffect(() => { void load(); }, []);

  async function save(mapping: Mapping) {
    setSaving(mapping.productCode);
    try {
      await request(`/mappings/${encodeURIComponent(mapping.productCode)}`, {
        method: "PATCH",
        body: JSON.stringify({ externalProductId: mapping.externalProductId || null, enabled: mapping.enabled }),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save mapping"); }
    finally { setSaving(""); }
  }
  async function retry(id: string) {
    setSaving(id);
    try { await request(`/events/${id}/retry`, { method: "POST" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Retry failed"); }
    finally { setSaving(""); }
  }

  return (
    <AdminShell>
      <AdminPageHeader eyebrow="Sales fulfilment" title="GHL connection" description="See every purchase event, product unlock and account activation in one place." />
      <div className="space-y-8 px-5 py-8 sm:px-10">
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusCard label="Webhook security" value={data?.configured ? "Configured" : "Secret required"} ok={Boolean(data?.configured)} />
          <StatusCard label="Active unlocks" value={String(data?.activeEntitlements ?? 0)} ok />
          <StatusCard label="Endpoint" value={data?.webhookPath ?? "Loading…"} ok={Boolean(data)} />
        </div>

        <section className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-6 py-5"><h2 className="font-display text-xl">Product mapping</h2><p className="mt-1 text-sm text-muted-foreground">Copy each GHL product ID here. Unfinished products stay disabled.</p></div>
          <div className="divide-y divide-border">
            {data?.mappings.map((mapping, index) => (
              <div key={mapping.productCode} className="grid gap-4 p-6 lg:grid-cols-[1fr_1.4fr_auto_auto] lg:items-end">
                <div><div className="font-semibold">{mapping.productName}</div><div className="text-xs text-muted-foreground">{mapping.productCode}</div></div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GHL product ID
                  <Input className="mt-2" value={mapping.externalProductId ?? ""} disabled={!mapping.deliverableReady}
                    onChange={(e) => setData((current) => current ? { ...current, mappings: current.mappings.map((m, i) => i === index ? { ...m, externalProductId: e.target.value } : m) } : current)} />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={mapping.enabled} disabled={!mapping.deliverableReady}
                  onChange={(e) => setData((current) => current ? { ...current, mappings: current.mappings.map((m, i) => i === index ? { ...m, enabled: e.target.checked } : m) } : current)} /> Enabled</label>
                <Button onClick={() => void save(mapping)} disabled={!mapping.deliverableReady || saving === mapping.productCode}><Save className="mr-2 h-4 w-4" />Save</Button>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-6 py-5"><h2 className="font-display text-xl">Purchase events</h2><p className="mt-1 text-sm text-muted-foreground">Newest first. Duplicate GHL deliveries do not create duplicate access.</p></div>
          {!data?.events.length ? <div className="p-10 text-center text-sm text-muted-foreground">No GHL purchases received yet.</div> :
            <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-4">Received</th><th>Buyer</th><th>Product</th><th>Event</th><th>Fulfilment</th><th>Activation</th><th></th></tr></thead><tbody>
              {data.events.map((event) => <tr key={event.id} className="border-t border-border"><td className="p-4">{new Date(event.receivedAt).toLocaleString()}</td><td>{event.purchaserEmail}</td><td>{event.productCode ?? "Unmapped"}</td><td>{event.eventType}</td><td>{event.processingStatus}{event.error && <div className="max-w-xs text-xs text-destructive">{event.error}</div>}</td><td>{event.activationStatus}</td><td className="pr-4">{event.activationStatus === "failed" && <Button size="sm" variant="outline" onClick={() => void retry(event.id)} disabled={saving === event.id}><RefreshCw className="mr-2 h-3.5 w-3.5" />Retry</Button>}</td></tr>)}
            </tbody></table></div>}
        </section>
      </div>
    </AdminShell>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}{label}</div><div className="mt-3 break-all font-semibold">{value}</div></div>;
}