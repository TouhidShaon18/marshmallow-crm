import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "EmployeeTarget"
    ADD COLUMN IF NOT EXISTS "followup7dTarget"    INTEGER,
    ADD COLUMN IF NOT EXISTS "followup30dTarget"   INTEGER,
    ADD COLUMN IF NOT EXISTS "convertedSaleTarget" INTEGER,
    ADD COLUMN IF NOT EXISTS "repeatSaleTarget"    INTEGER
  `);
  console.log("✅ New target columns added to EmployeeTarget");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
