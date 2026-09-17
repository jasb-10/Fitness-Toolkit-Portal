import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface CompanySettings {
  name: string;
  legalName: string | null;
  supportEmail: string | null;
  website: string | null;
  taxId: string | null;
  logoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  invoiceFooter: string | null;
}

const DEFAULTS: CompanySettings = {
  name: "Your Company",
  legalName: null,
  supportEmail: null,
  website: null,
  taxId: null,
  logoUrl: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  region: null,
  postalCode: null,
  country: null,
  invoiceFooter: "Thank you for your business.",
};

const KEY = "company";

export async function getCompanySettings(): Promise<CompanySettings> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, KEY));
  if (!row) return { ...DEFAULTS };
  return { ...DEFAULTS, ...(row.value as Partial<CompanySettings>) };
}

export async function updateCompanySettings(
  patch: Partial<CompanySettings>,
): Promise<CompanySettings> {
  const current = await getCompanySettings();
  const merged: CompanySettings = { ...current, ...patch };
  const [existing] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, KEY));
  if (!existing) {
    await db.insert(settingsTable).values({ key: KEY, value: merged });
  } else {
    await db
      .update(settingsTable)
      .set({ value: merged })
      .where(eq(settingsTable.key, KEY));
  }
  return merged;
}
