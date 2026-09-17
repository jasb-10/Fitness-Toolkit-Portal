CREATE TABLE IF NOT EXISTS "comeback_business_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "data" jsonb NOT NULL,
  "complete" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "comeback_profiles_user_unique" ON "comeback_business_profiles" ("user_id");

CREATE TABLE IF NOT EXISTS "comeback_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "audience_summary" text NOT NULL DEFAULT '',
  "offer_recommendation" text NOT NULL DEFAULT '',
  "schedule_summary" text NOT NULL DEFAULT '',
  "messages" jsonb NOT NULL,
  "launch_checklist" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "profile_snapshot" jsonb NOT NULL,
  "revision_count" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'draft',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "comeback_campaigns_user_idx" ON "comeback_campaigns" ("user_id");

CREATE TABLE IF NOT EXISTS "product_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "purchaser_email" text NOT NULL,
  "product_code" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "source" text NOT NULL DEFAULT 'ghl',
  "external_order_id" text,
  "purchased_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_entitlements_order_unique" ON "product_entitlements" ("external_order_id");
CREATE INDEX IF NOT EXISTS "product_entitlements_user_idx" ON "product_entitlements" ("user_id");
CREATE INDEX IF NOT EXISTS "product_entitlements_email_idx" ON "product_entitlements" ("purchaser_email");
