import { db, billingTable, invoicesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { getStripe, isStripeConfigured } from "./stripe";
import { getCompanySettings, type CompanySettings } from "./companySettings";

export interface UnifiedInvoice {
  id: string;
  source: "stripe" | "local";
  number: string | null;
  date: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

async function getBoundStripeCustomerId(
  userId: string,
): Promise<string | null> {
  if (!isStripeConfigured()) return null;
  // Stripe customer must be explicitly bound server-side (e.g. by a checkout
  // flow, webhook, or admin tool). Never auto-resolve by user-editable email
  // — that would let a user impersonate another customer's invoices by
  // changing billingEmail to a known address.
  const [billing] = await db
    .select({ stripeCustomerId: billingTable.stripeCustomerId })
    .from(billingTable)
    .where(eq(billingTable.userId, userId));
  return billing?.stripeCustomerId ?? null;
}

export async function listUserInvoices(
  userId: string,
): Promise<UnifiedInvoice[]> {
  const out: UnifiedInvoice[] = [];

  const customerId = await getBoundStripeCustomerId(userId);
  if (customerId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const list = await stripe.invoices.list({
          customer: customerId,
          limit: 50,
        });
        for (const inv of list.data) {
          out.push({
            id: inv.id ?? "",
            source: "stripe",
            number: inv.number ?? null,
            date: new Date((inv.created ?? 0) * 1000).toISOString(),
            amount: (inv.amount_paid ?? inv.amount_due ?? 0) / 100,
            currency: (inv.currency ?? "usd").toUpperCase(),
            status: inv.status ?? "open",
            description:
              inv.lines?.data?.[0]?.description ??
              inv.description ??
              "Invoice",
            hostedUrl: inv.hosted_invoice_url ?? null,
            pdfUrl: inv.invoice_pdf ?? null,
          });
        }
      } catch {
        // Fall through to local invoices.
      }
    }
  }

  const local = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, userId))
    .orderBy(desc(invoicesTable.date));
  for (const i of local) {
    out.push({
      id: i.id,
      source: "local",
      number: i.number ?? null,
      date: i.date.toISOString(),
      amount: Number(i.amount),
      currency: (i.currency ?? "usd").toUpperCase(),
      status: i.status,
      description: i.description,
      hostedUrl: null,
      pdfUrl: null,
    });
  }

  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getStripeInvoicePdfUrl(
  userId: string,
  invoiceId: string,
): Promise<string | null> {
  const customerId = await getBoundStripeCustomerId(userId);
  if (!customerId) return null;
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const inv = await stripe.invoices.retrieve(invoiceId);
    if (inv.customer !== customerId) return null;
    return inv.invoice_pdf ?? null;
  } catch {
    return null;
  }
}

interface PdfLocalInvoice {
  id: string;
  number: string | null;
  date: Date;
  amount: string;
  currency: string;
  status: string;
  description: string;
}

export async function generateLocalInvoicePdf(
  userId: string,
  invoiceId: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  const [inv] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));
  if (!inv || inv.userId !== userId) return null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const [billing] = await db
    .select()
    .from(billingTable)
    .where(eq(billingTable.userId, userId));
  const company = await getCompanySettings();

  const buffer = await renderInvoicePdf({
    invoice: {
      id: inv.id,
      number: inv.number,
      date: inv.date,
      amount: String(inv.amount),
      currency: (inv.currency ?? "usd").toUpperCase(),
      status: inv.status,
      description: inv.description,
    },
    company,
    customer: {
      name: billing?.company || user?.name || "Customer",
      email: billing?.billingEmail || user?.email || "",
      addressLine1: billing?.addressLine1 ?? null,
      addressLine2: billing?.addressLine2 ?? null,
      city: billing?.city ?? null,
      region: billing?.region ?? null,
      postalCode: billing?.postalCode ?? null,
      country: billing?.country ?? null,
    },
  });

  const number = inv.number ?? inv.id.slice(0, 8);
  return { buffer, filename: `invoice-${number}.pdf` };
}

interface RenderInput {
  invoice: PdfLocalInvoice;
  company: CompanySettings;
  customer: {
    name: string;
    email: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    country: string | null;
  };
}

function renderInvoicePdf(input: RenderInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { invoice, company, customer } = input;

    // Header
    doc.font("Helvetica-Bold").fontSize(22).text(company.name, { align: "left" });
    if (company.legalName && company.legalName !== company.name) {
      doc.font("Helvetica").fontSize(10).text(company.legalName);
    }
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10);
    const fromAddress = [
      company.addressLine1,
      company.addressLine2,
      [company.city, company.region, company.postalCode]
        .filter(Boolean)
        .join(", "),
      company.country,
      company.taxId ? `Tax ID: ${company.taxId}` : null,
      company.supportEmail,
      company.website,
    ]
      .filter(Boolean)
      .join("\n");
    if (fromAddress) doc.text(fromAddress);

    // Invoice meta (right column)
    const metaY = 56;
    doc.font("Helvetica-Bold").fontSize(28).text("INVOICE", 380, metaY, {
      width: 160,
      align: "right",
    });
    doc.font("Helvetica").fontSize(10).text(
      `Invoice #: ${invoice.number ?? invoice.id.slice(0, 8)}`,
      380,
      metaY + 36,
      { width: 160, align: "right" },
    );
    doc.text(`Date: ${invoice.date.toISOString().slice(0, 10)}`, 380, metaY + 50, {
      width: 160,
      align: "right",
    });
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 380, metaY + 64, {
      width: 160,
      align: "right",
    });

    doc.moveDown(2);

    // Bill To
    doc.font("Helvetica-Bold").fontSize(11).text("BILL TO", 56, 200);
    doc.font("Helvetica").fontSize(10);
    const toAddress = [
      customer.name,
      customer.email,
      customer.addressLine1,
      customer.addressLine2,
      [customer.city, customer.region, customer.postalCode]
        .filter(Boolean)
        .join(", "),
      customer.country,
    ]
      .filter(Boolean)
      .join("\n");
    doc.text(toAddress, 56, 218);

    // Line items table
    const tableTop = 320;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Description", 56, tableTop);
    doc.text("Amount", 440, tableTop, { width: 100, align: "right" });
    doc.moveTo(56, tableTop + 16).lineTo(540, tableTop + 16).stroke();

    doc.font("Helvetica").fontSize(10);
    doc.text(invoice.description, 56, tableTop + 24, { width: 360 });
    doc.text(
      `${invoice.currency} ${Number(invoice.amount).toFixed(2)}`,
      440,
      tableTop + 24,
      { width: 100, align: "right" },
    );

    // Totals
    const totalsY = tableTop + 90;
    doc.moveTo(360, totalsY).lineTo(540, totalsY).stroke();
    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Total", 360, totalsY + 8, { width: 80 });
    doc.text(
      `${invoice.currency} ${Number(invoice.amount).toFixed(2)}`,
      440,
      totalsY + 8,
      { width: 100, align: "right" },
    );

    // Footer
    if (company.invoiceFooter) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#666")
        .text(company.invoiceFooter, 56, 700, { width: 484, align: "center" });
    }

    doc.end();
  });
}
