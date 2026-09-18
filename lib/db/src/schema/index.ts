import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").unique(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    role: text("role").notNull().default("student"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => ({
    clerkIdx: index("users_clerk_idx").on(t.clerkId),
  }),
);

export const billingTable = pgTable("billing", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("Lifetime Access"),
  status: text("status").notNull().default("active"),
  billingEmail: text("billing_email"),
  company: text("company"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  region: text("region"),
  postalCode: text("postal_code"),
  country: text("country"),
  nextInvoiceDate: timestamp("next_invoice_date", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  number: text("number"),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("paid"),
  description: text("description").notNull(),
});

export const coursesTable = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  published: boolean("published").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chaptersTable = pgTable(
  "chapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => ({
    courseIdx: index("chapters_course_idx").on(t.courseId),
  }),
);

export const lessonsTable = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chaptersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    lessonType: text("lesson_type").notNull().default("video"),
    videoUrl: text("video_url"),
    durationMinutes: integer("duration_minutes"),
    summary: text("summary"),
    notes: text("notes"),
    published: boolean("published").notNull().default(true),
    attachments: jsonb("attachments")
      .$type<Array<{ id: string; label: string; url: string; kind: "template" | "resource" | "note" }>>()
      .notNull()
      .default([]),
  },
  (t) => ({
    chapterIdx: index("lessons_chapter_idx").on(t.chapterId),
  }),
);

export const lessonProgressTable = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessonsTable.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("lesson_progress_unique").on(t.userId, t.lessonId),
  }),
);

export const courseAccessTable = pgTable(
  "course_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("course_access_unique").on(t.userId, t.courseId),
  }),
);

export const dfyProjectsTable = pgTable("dfy_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientUserId: uuid("client_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("in_progress"),
  progressPct: integer("progress_pct").notNull().default(0),
  nextMilestone: text("next_milestone"),
  nextMilestoneDate: timestamp("next_milestone_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dfyProjectUpdatesTable = pgTable("dfy_project_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => dfyProjectsTable.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dfyMilestonesTable = pgTable("dfy_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => dfyProjectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  position: integer("position").notNull().default(0),
});

export const activityTable = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    target: text("target").notNull(),
    path: text("path"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("activity_user_idx").on(t.userId),
    createdIdx: index("activity_created_idx").on(t.createdAt),
    userCreatedIdx: index("activity_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
  }),
);

export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const supportArticlesTable = pgTable(
  "support_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    body: text("body").notNull().default(""),
    kind: text("kind").notNull().default("article"),
    category: text("category"),
    published: boolean("published").notNull().default(true),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    kindIdx: index("support_articles_kind_idx").on(t.kind),
  }),
);

export const supportKbSourcesTable = pgTable("support_kb_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const supportConversationsTable = pgTable(
  "support_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New conversation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("support_conv_user_idx").on(t.userId),
  }),
);

export const supportMessagesTable = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => supportConversationsTable.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    convIdx: index("support_messages_conv_idx").on(t.conversationId),
  }),
);

export const refundRequestsTable = pgTable("refund_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  decisionNote: text("decision_note"),
  stripeChargeId: text("stripe_charge_id"),
  stripeRefundId: text("stripe_refund_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type ComebackProfileData = {
  businessName: string;
  businessType: string;
  location: string;
  service: string;
  price: string;
  idealClient: string;
  clientGoal: string;
  leavingReasons: string;
  listSize: string;
  offer: string;
  bookingLink: string;
  voiceMode: string;
  voiceExamples: string;
  wordsToAvoid: string;
  extraContext: string;
};

export type ComebackCampaignMessage = {
  channel: "Email" | "SMS";
  day: string;
  subject?: string;
  body: string;
  purpose?: string;
};

export const comebackBusinessProfilesTable = pgTable(
  "comeback_business_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<ComebackProfileData>().notNull(),
    complete: boolean("complete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUnique: uniqueIndex("comeback_profiles_user_unique").on(t.userId),
  }),
);

export const comebackCampaignsTable = pgTable(
  "comeback_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    audienceSummary: text("audience_summary").notNull().default(""),
    offerRecommendation: text("offer_recommendation").notNull().default(""),
    scheduleSummary: text("schedule_summary").notNull().default(""),
    messages: jsonb("messages").$type<ComebackCampaignMessage[]>().notNull(),
    launchChecklist: jsonb("launch_checklist").$type<string[]>().notNull().default([]),
    profileSnapshot: jsonb("profile_snapshot").$type<ComebackProfileData>().notNull(),
    revisionCount: integer("revision_count").notNull().default(0),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({ userIdx: index("comeback_campaigns_user_idx").on(t.userId) }),
);

export const productEntitlementsTable = pgTable(
  "product_entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "cascade",
    }),
    purchaserEmail: text("purchaser_email").notNull(),
    productCode: text("product_code").notNull(),
    status: text("status").notNull().default("active"),
    source: text("source").notNull().default("ghl"),
    externalOrderId: text("external_order_id"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderProductUnique: uniqueIndex("product_entitlements_order_product_unique").on(
      t.externalOrderId,
      t.productCode,
    ),
    userIdx: index("product_entitlements_user_idx").on(t.userId),
    emailIdx: index("product_entitlements_email_idx").on(t.purchaserEmail),
  }),
);

export const ghlProductMappingsTable = pgTable("ghl_product_mappings", {
  productCode: text("product_code").primaryKey(),
  productName: text("product_name").notNull(),
  priceCents: integer("price_cents").notNull(),
  externalProductId: text("external_product_id").unique(),
  enabled: boolean("enabled").notNull().default(false),
  deliverableReady: boolean("deliverable_ready").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ghlPurchaseEventsTable = pgTable(
  "ghl_purchase_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull().unique(),
    orderId: text("order_id").notNull(),
    contactId: text("contact_id"),
    purchaserEmail: text("purchaser_email").notNull(),
    externalProductId: text("external_product_id").notNull(),
    productCode: text("product_code"),
    eventType: text("event_type").notNull(),
    processingStatus: text("processing_status").notNull().default("received"),
    activationStatus: text("activation_status").notNull().default("not_required"),
    error: text("error"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => ({
    receivedIdx: index("ghl_purchase_events_received_idx").on(t.receivedAt),
    emailIdx: index("ghl_purchase_events_email_idx").on(t.purchaserEmail),
    statusIdx: index("ghl_purchase_events_status_idx").on(t.processingStatus),
  }),
);

export const businessProfilesTable = pgTable(
  "business_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull().default(""),
    niche: text("niche").notNull().default(""),
    location: text("location").notNull().default(""),
    service: text("service").notNull().default(""),
    audience: text("audience").notNull().default(""),
    conversionGoal: text("conversion_goal").notNull().default(""),
    destinationUrl: text("destination_url"),
    brandData: jsonb("brand_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    evidenceData: jsonb("evidence_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUnique: uniqueIndex("business_profiles_user_unique").on(t.userId),
  }),
);

export const websiteProjectsTable = pgTable(
  "website_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    businessProfileId: uuid("business_profile_id").references(
      () => businessProfilesTable.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull().default("My fitness website"),
    status: text("status").notNull().default("draft"),
    generationAttempts: integer("generation_attempts").notNull().default(0),
    refinementAttempts: integer("refinement_attempts").notNull().default(0),
    currentStage: text("current_stage").notNull().default("brief"),
    briefData: jsonb("brief_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    styleData: jsonb("style_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    sections: jsonb("sections")
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default([]),
    progressData: jsonb("progress_data")
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("website_projects_user_idx").on(t.userId),
    profileIdx: index("website_projects_profile_idx").on(t.businessProfileId),
  }),
);

export const projectAssetsTable = pgTable(
  "project_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    objectPath: text("object_path").notNull().unique(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    rightsStatus: text("rights_status").notNull().default("pending"),
    focalPoint: jsonb("focal_point")
      .$type<{ x: number; y: number } | null>()
      .default(null),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    projectIdx: index("project_assets_project_idx").on(t.projectId),
    userIdx: index("project_assets_user_idx").on(t.userId),
  }),
);

export type User = typeof usersTable.$inferSelect;
export type Course = typeof coursesTable.$inferSelect;
export type Chapter = typeof chaptersTable.$inferSelect;
export type Lesson = typeof lessonsTable.$inferSelect;
export type DfyProject = typeof dfyProjectsTable.$inferSelect;
export type ComebackCampaign = typeof comebackCampaignsTable.$inferSelect;
export type BusinessProfile = typeof businessProfilesTable.$inferSelect;
export type WebsiteProject = typeof websiteProjectsTable.$inferSelect;
export type ProjectAsset = typeof projectAssetsTable.$inferSelect;
