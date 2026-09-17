import { db } from "@workspace/db";
import {
  usersTable,
  coursesTable,
  chaptersTable,
  lessonsTable,
  courseAccessTable,
  dfyProjectsTable,
  dfyProjectUpdatesTable,
  dfyMilestonesTable,
  invoicesTable,
  billingTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

export async function runSeedIfEmpty() {
  const existing = await db.select().from(coursesTable).limit(1);
  if (existing.length > 0) return;
  logger.info("Seeding initial portal data");

  const [demoStudent] = await db
    .insert(usersTable)
    .values({
      email: "alex.morgan@example.com",
      name: "Alex Morgan",
      role: "student",
      bio: "Founder of a small design studio. Working through the master class.",
    })
    .returning();

  const [teamMember] = await db
    .insert(usersTable)
    .values({
      email: "jordan.smith@example.com",
      name: "Jordan Smith",
      role: "team",
      bio: "Lead consultant supporting clients.",
    })
    .returning();
  void teamMember;

  await db.insert(billingTable).values({
    userId: demoStudent!.id,
    plan: "Lifetime Access",
    status: "active",
    billingEmail: "alex.morgan@example.com",
    company: "Morgan Studio",
  });
  await db.insert(invoicesTable).values([
    {
      userId: demoStudent!.id,
      amount: "1497.00",
      status: "paid",
      description: "Master Class — Lifetime Access",
    },
  ]);

  const [course] = await db
    .insert(coursesTable)
    .values({
      title: "The Master Class",
      subtitle: "From foundations to advanced execution",
      description:
        "A complete training covering positioning, offer design, sales, delivery, and scale.",
      published: true,
      position: 0,
    })
    .returning();

  const [bonusCourse] = await db
    .insert(coursesTable)
    .values({
      title: "VIP Bonus Vault",
      subtitle: "Templates, swipe files, and recordings",
      description: "All bonus content updated monthly.",
      published: true,
      position: 1,
    })
    .returning();

  await db.insert(courseAccessTable).values([
    { userId: demoStudent!.id, courseId: course!.id },
    { userId: demoStudent!.id, courseId: bonusCourse!.id },
  ]);

  const chapterDefs: Array<{ title: string; lessons: Array<{ title: string; min: number; summary: string; notes: string; videoUrl?: string }> }> = [
    {
      title: "Introduction (START HERE)",
      lessons: [
        {
          title: "Welcome & Course Tour (Watch Me First)",
          min: 5,
          summary:
            "A quick tour of the portal so you know exactly where everything lives.",
          notes:
            "In this lesson we cover how the curriculum is laid out, where to find templates, and how to ask for help.",
          videoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        },
        {
          title: "How To Get The Most Out Of This Program",
          min: 4,
          summary: "Set yourself up for the highest possible ROI on this material.",
          notes: "Block time on your calendar. Take messy notes. Ship before perfect.",
        },
        {
          title: "Setting Your 90-Day Outcome",
          min: 7,
          summary: "Define a single concrete outcome before you go further.",
          notes: "Use the workbook below to commit to one and only one outcome.",
        },
      ],
    },
    {
      title: "Foundations",
      lessons: [
        {
          title: "Positioning Without Compromise",
          min: 18,
          summary: "Why the wrong positioning silently kills offers.",
          notes:
            "Three positioning levers: market, problem, mechanism. We pull each one apart.",
        },
        {
          title: "Designing An Irresistible Offer",
          min: 22,
          summary: "Stack your offer so the answer is obvious.",
          notes: "Use the offer canvas template to draft your first version.",
        },
      ],
    },
    {
      title: "Sales & Delivery",
      lessons: [
        {
          title: "The Quiet Sales Conversation",
          min: 16,
          summary: "Stop pitching. Start qualifying.",
          notes:
            "Walk through the call framework, then watch the role-play recording.",
        },
        {
          title: "Onboarding A Done-For-You Client",
          min: 12,
          summary: "Set the stage for an effortless engagement.",
          notes: "Send the welcome packet, kickoff invite, and access checklist.",
        },
      ],
    },
  ];

  for (let ci = 0; ci < chapterDefs.length; ci++) {
    const def = chapterDefs[ci]!;
    const [ch] = await db
      .insert(chaptersTable)
      .values({ courseId: course!.id, title: def.title, position: ci })
      .returning();
    for (let li = 0; li < def.lessons.length; li++) {
      const ld = def.lessons[li]!;
      await db.insert(lessonsTable).values({
        chapterId: ch!.id,
        title: ld.title,
        position: li,
        lessonType: "video",
        videoUrl:
          ld.videoUrl ??
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        durationMinutes: ld.min,
        summary: ld.summary,
        notes: ld.notes,
        attachments: [
          {
            id: crypto.randomUUID(),
            label: "Lesson Workbook (PDF)",
            url: "https://www.africau.edu/images/default/sample.pdf",
            kind: "template",
          },
          {
            id: crypto.randomUUID(),
            label: "Slide Deck",
            url: "https://www.africau.edu/images/default/sample.pdf",
            kind: "template",
          },
          {
            id: crypto.randomUUID(),
            label: "Further Reading",
            url: "https://commoncog.com/",
            kind: "resource",
          },
          {
            id: crypto.randomUUID(),
            label: "Reference Spreadsheet",
            url: "https://docs.google.com/spreadsheets",
            kind: "resource",
          },
        ],
      });
    }
  }

  // VIP bonus chapter
  const [vipCh] = await db
    .insert(chaptersTable)
    .values({ courseId: bonusCourse!.id, title: "Monthly Drops", position: 0 })
    .returning();
  await db.insert(lessonsTable).values([
    {
      chapterId: vipCh!.id,
      title: "April Bonus: Email Sequence Library",
      position: 0,
      lessonType: "video",
      videoUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      durationMinutes: 9,
      summary: "Plug-and-play sequences for the four most common funnels.",
      notes: "Pick one sequence, customize the tone, ship within 48 hours.",
      attachments: [
        {
          id: crypto.randomUUID(),
          label: "Email Library (Doc)",
          url: "https://www.africau.edu/images/default/sample.pdf",
          kind: "template",
        },
      ],
    },
  ]);

  const [proj] = await db
    .insert(dfyProjectsTable)
    .values({
      clientUserId: demoStudent!.id,
      title: "Morgan Studio — Brand Site Build",
      description: "Full positioning + 5-page brand site rebuild.",
      status: "in_progress",
      progressPct: 45,
      nextMilestone: "Visual direction sign-off",
      nextMilestoneDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    })
    .returning();
  await db.insert(dfyMilestonesTable).values([
    { projectId: proj!.id, title: "Discovery interviews", status: "done", position: 0 },
    {
      projectId: proj!.id,
      title: "Positioning & messaging",
      status: "done",
      position: 1,
    },
    {
      projectId: proj!.id,
      title: "Visual direction",
      status: "pending",
      position: 2,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    },
    {
      projectId: proj!.id,
      title: "Build & launch",
      status: "pending",
      position: 3,
    },
  ]);
  await db.insert(dfyProjectUpdatesTable).values([
    {
      projectId: proj!.id,
      authorUserId: demoStudent!.id,
      body: "Wrapped the discovery calls — sending you the highlight reel today.",
    },
    {
      projectId: proj!.id,
      authorUserId: demoStudent!.id,
      body: "Approved the positioning doc. Excited to see the visual direction next week.",
    },
  ]);

  void sql; // silence unused
  logger.info("Seed complete");
}
