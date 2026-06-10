import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Add new enum values (PostgreSQL requires separate statements)
  await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SALES'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MARKETING'`);
  console.log("✅ Role enum: SALES + MARKETING added");

  // 2. Migrate existing EMPLOYEE → SALES
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "role" = 'SALES' WHERE "role" = 'EMPLOYEE'`
  );
  console.log(`✅ Migrated ${updated} EMPLOYEE → SALES`);

  // 3. Add leadSource to Customer
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "leadSource" TEXT`
  );
  console.log("✅ Customer.leadSource column added");

  // 4. Create Campaign table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Campaign" (
      "id"        TEXT         NOT NULL,
      "name"      TEXT         NOT NULL,
      "channel"   TEXT         NOT NULL,
      "budget"    DOUBLE PRECISION,
      "startDate" TIMESTAMP(3),
      "endDate"   TIMESTAMP(3),
      "notes"     TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log("✅ Campaign table created");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
