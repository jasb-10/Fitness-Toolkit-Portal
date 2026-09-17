import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBilling,
  useUpdateBilling,
  useListMyInvoices,
  getGetBillingQueryKey,
} from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { basePath, formatDate } from "@/lib/utils";
import { Download } from "lucide-react";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function BillingSettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetBilling();
  const { data: invoices, isLoading: invoicesLoading } = useListMyInvoices();
  const update = useUpdateBilling({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBillingQueryKey() });
        toast({ title: "Billing updated" });
      },
    },
  });

  const [form, setForm] = useState({
    billingEmail: "",
    company: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        billingEmail: data.billingEmail ?? "",
        company: data.company ?? "",
        addressLine1: data.addressLine1 ?? "",
        addressLine2: data.addressLine2 ?? "",
        city: data.city ?? "",
        region: data.region ?? "",
        postalCode: data.postalCode ?? "",
        country: data.country ?? "",
      });
    }
  }, [data]);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const items = invoices?.items ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Account"
        title="Billing"
        description="Manage your billing details and review past invoices."
      />
      <div className="px-10 py-10">
        <div className="mx-auto max-w-3xl space-y-10">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Plan
                </div>
                <div className="mt-1 font-display text-2xl">
                  {data?.plan ?? "—"}
                </div>
              </div>
              {data && (
                <Badge variant="outline" className="capitalize">
                  {data.status}
                </Badge>
              )}
            </div>

            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  update.mutate({
                    data: Object.fromEntries(
                      Object.entries(form).map(([k, v]) => [k, v || null]),
                    ) as never,
                  });
                }}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2"
              >
                <Field label="Billing email" id="billingEmail">
                  <Input
                    id="billingEmail"
                    data-testid="billing-email"
                    value={form.billingEmail}
                    onChange={(e) => set("billingEmail")(e.target.value)}
                  />
                </Field>
                <Field label="Company" id="company">
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => set("company")(e.target.value)}
                  />
                </Field>
                <Field label="Address line 1" id="addr1" full>
                  <Input
                    id="addr1"
                    value={form.addressLine1}
                    onChange={(e) => set("addressLine1")(e.target.value)}
                  />
                </Field>
                <Field label="Address line 2" id="addr2" full>
                  <Input
                    id="addr2"
                    value={form.addressLine2}
                    onChange={(e) => set("addressLine2")(e.target.value)}
                  />
                </Field>
                <Field label="City" id="city">
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => set("city")(e.target.value)}
                  />
                </Field>
                <Field label="State / Region" id="region">
                  <Input
                    id="region"
                    value={form.region}
                    onChange={(e) => set("region")(e.target.value)}
                  />
                </Field>
                <Field label="Postal code" id="postal">
                  <Input
                    id="postal"
                    value={form.postalCode}
                    onChange={(e) => set("postalCode")(e.target.value)}
                  />
                </Field>
                <Field label="Country" id="country">
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => set("country")(e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2 flex justify-end">
                  <Button
                    type="submit"
                    data-testid="save-billing"
                    className="bg-foreground text-background hover:bg-foreground/90"
                  >
                    Save billing details
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-8 py-5">
              <div className="font-display text-xl">Invoice history</div>
              {invoices?.stripeConfigured ? (
                <Badge variant="outline">Stripe synced</Badge>
              ) : null}
            </div>
            {invoicesLoading ? (
              <div className="px-8 py-10">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-8 py-10 text-center text-sm text-muted-foreground">
                No invoices yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-24 text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={`${i.source}-${i.id}`}>
                      <TableCell>{formatDate(i.date)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {i.number ?? i.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{i.description}</TableCell>
                      <TableCell className="capitalize">{i.status}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(Number(i.amount), i.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`${basePath}/api/me/invoices/${encodeURIComponent(
                            i.id,
                          )}/download?source=${i.source}`}
                          target="_blank"
                          rel="noreferrer"
                          data-testid={`download-invoice-${i.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Download invoice"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  id,
  children,
  full,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2 space-y-2" : "space-y-2"}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
