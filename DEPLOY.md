# 🚀 Putting Marshmallow CRM online (with a guaranteed daily scheduler)

This makes the app reachable from any device via a web link, and runs the time-based
automations (birthday, win-back) **every morning automatically** — even if nobody opens
the app — using **Vercel Cron**.

## The 3 free pieces
| Piece | What it is | Cost |
|---|---|---|
| **Vercel** | Hosts the app + runs the daily scheduler (cron) | Free (Hobby) |
| **Neon** | Cloud Postgres database (replaces the local SQLite file) | Free tier |
| **GitHub** | Stores the code so Vercel can deploy it | Free |

> The local app uses a SQLite file, which can't run on Vercel. Online we use **Postgres
> (Neon)**. Switching is one line + one command — see Step 3. (I can do this for you once
> you paste me the Neon connection string.)

---

## Step 1 — Put the code on GitHub
1. Create a free account at https://github.com
2. Create a new **empty private repo** called `marshmallow-crm`.
3. From the project folder, push it (I can run these for you):
   ```bash
   git init && git add -A && git commit -m "Marshmallow CRM"
   git branch -M main
   git remote add origin https://github.com/<you>/marshmallow-crm.git
   git push -u origin main
   ```

## Step 2 — Create the database (Neon)
1. Sign up free at https://neon.tech
2. Create a project (pick a region near Bangladesh, e.g. Singapore).
3. Copy the **connection string** (looks like `postgresql://user:pass@...neon.tech/db?sslmode=require`).

## Step 3 — Switch the app to Postgres (one line)
In `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```
Then point `DATABASE_URL` at the Neon string and create the tables + sample data:
```bash
npx prisma db push    # builds the Postgres tables directly from the schema
npm run db:seed       # owner/employee logins + sample data + automations
```
> We use `db push` (not `migrate reset`) for the first Postgres setup because the existing
> migration files are written in SQLite syntax. `db push` reads the schema and creates the
> correct Postgres tables directly. (I'll run this for you once you share the Neon URL.)

## Step 4 — Deploy on Vercel
1. Sign up free at https://vercel.com with your GitHub account.
2. **Add New → Project → import `marshmallow-crm`.**
3. Add these **Environment Variables**:
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Neon connection string |
   | `AUTH_SECRET` | any long random string |
   | `CRON_SECRET` | any long random string (protects the scheduler) |
   | `EMAIL_FROM` | `Marshmallow CRM <onboarding@resend.dev>` |
   | `RESEND_API_KEY` | (optional) your Resend key for real emails |
4. Click **Deploy**. You'll get a link like `marshmallow-crm.vercel.app`.

## Step 5 — The scheduler (already configured ✅)
`vercel.json` already tells Vercel to call `/api/cron/run-automations` **every day at
09:00 Dhaka time** (03:00 UTC). When `CRON_SECRET` is set, Vercel signs the request and
the endpoint runs your birthday + win-back rules automatically. Nothing else to do.

You can test it any time by visiting (or curling) `/api/cron/run-automations` with the
header `Authorization: Bearer <CRON_SECRET>`.

## Step 6 — Custom domain (optional, ~$12/yr)
In Vercel → Project → Domains, add e.g. `crm.yourstore.com`.

---

### Costs summary
- **$0/month** to start (all free tiers comfortably cover 1–5 staff).
- Optional later: custom domain (~$12/yr), Resend paid tier if you send lots of email,
  Vercel Pro (~$20/mo) only if you outgrow the free limits.
