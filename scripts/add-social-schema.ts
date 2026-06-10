import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // DO blocks handle "already exists" gracefully on all PG versions
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "SocialChannel" AS ENUM ('FACEBOOK','INSTAGRAM','YOUTUBE','GMB','REDDIT','PINTEREST','TIKTOK','BLOG');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "PostStatus" AS ENUM ('PLANNED','POSTED','METRICS_LOGGED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  console.log("✅ Enums created");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SocialTemplate" (
      "id"           TEXT NOT NULL,
      "channel"      "SocialChannel" NOT NULL,
      "topic"        TEXT NOT NULL,
      "notes"        TEXT,
      "dayOfMonth"   INTEGER NOT NULL,
      "assignedToId" TEXT,
      "active"       BOOLEAN NOT NULL DEFAULT true,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialTemplate_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "SocialTemplate_assignedToId_fkey"
        FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  console.log("✅ SocialTemplate table");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SocialPost" (
      "id"                    TEXT NOT NULL,
      "templateId"            TEXT,
      "channel"               "SocialChannel" NOT NULL,
      "topic"                 TEXT NOT NULL,
      "notes"                 TEXT,
      "period"                TEXT NOT NULL,
      "scheduledDate"         TIMESTAMP(3) NOT NULL,
      "assignedToId"          TEXT,
      "status"                "PostStatus" NOT NULL DEFAULT 'PLANNED',
      "postedAt"              TIMESTAMP(3),
      "postUrl"               TEXT,
      "reactCount"            INTEGER,
      "viewCount"             INTEGER,
      "commentCount"          INTEGER,
      "shareCount"            INTEGER,
      "metricsLoggedAt"       TIMESTAMP(3),
      "metricsReminderSentAt" TIMESTAMP(3),
      "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "SocialPost_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "SocialTemplate"("id")
        ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "SocialPost_assignedToId_fkey"
        FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  console.log("✅ SocialPost table");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
