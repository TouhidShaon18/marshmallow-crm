require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  await p.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "departments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];`);
  await p.$executeRawUnsafe(`UPDATE "User" SET "departments" = ARRAY['SALES'] WHERE "role" IN ('SALES','EMPLOYEE') AND cardinality("departments")=0;`);
  await p.$executeRawUnsafe(`UPDATE "User" SET "departments" = ARRAY['MARKETING'] WHERE "role"='MARKETING' AND cardinality("departments")=0;`);
  await p.$executeRawUnsafe(`UPDATE "User" SET "departments" = ARRAY['FINANCE'] WHERE "role"='FINANCE' AND cardinality("departments")=0;`);
  await p.$executeRawUnsafe(`UPDATE "User" SET "departments" = ARRAY['SALES','MARKETING'] WHERE "role"='MANAGER' AND cardinality("departments")=0;`);
  await p.$executeRawUnsafe(`UPDATE "User" SET "departments" = ARRAY['SALES','MARKETING','FINANCE'] WHERE "role" IN ('OWNER','ADMIN') AND cardinality("departments")=0;`);
  const sample = await p.user.findMany({ select: { name: true, role: true, departments: true } });
  console.log(JSON.stringify(sample, null, 1));
  await p.$disconnect();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
