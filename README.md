# 🍡 Marshmallow CRM

A simple customer-relationship manager for your anime store. Built with Next.js,
Prisma, and SQLite. Purple theme, owner + employee dashboards.

## What it does

- **Customers** — add/edit with name, address, favourite anime, WhatsApp, email,
  product bought, online/offline, gift received, birthday, order amount, repeat flag.
- **Bulk import** — upload an Excel/CSV file to add many customers at once. Download
  the template or use your own sheet (columns are matched by name automatically).
- **Conversation timeline** — log every WhatsApp/call/note per customer. Logging
  automatically updates "last contacted".
- **WhatsApp** — one click opens WhatsApp with the customer's number pre-filled (free).
- **7-day follow-ups** — automatic list of anyone not contacted in 7+ days.
- **Automations (trigger-based workflows)** — "when this happens, do that" rules.
  Event triggers (new customer added, moved to a stage) fire instantly; scheduled triggers
  (birthday in N days, no contact for N days / win-back) run once a day when the app opens,
  or via "Run time-based now". Each rule either enrolls the customer in a sequence or creates
  a reminder task. Ships with sample rules: Welcome, Birthday wish, Win-back.
- **Follow-up sequences (GoHighLevel-style)** — build timed multi-step campaigns once
  (e.g. Day 0 WhatsApp, Day 3 check-in, Day 7 email) with merge fields like `{name}`,
  `{anime}`, `{product}`. Enroll a customer and the steps become dated reminder tasks.
- **Today (task list)** — staff's daily to-do of due/overdue follow-ups, each with a
  ready-to-send message + WhatsApp/email button. Mark done → logs to timeline; snooze or skip.
- **Pipeline board** — kanban to move customers through stages (New Lead → Contacted →
  Interested → Purchased → Repeat → Lost); columns show count + total order value.
- **Promotions (bulk SMS & Email)** — plan a 1-to-many campaign, filter the audience
  (stage, anime, online/offline, repeat), preview personalised messages, and **export a
  CSV** of recipients (phone/email + per-person message) to send from your bulk tool.
  Mark it sent to log it on each recipient's timeline. (WhatsApp stays the 1-to-1 channel.)
- **Email** — send real emails from a customer's page (logged on their timeline).
- **Dashboards** — Owner sees everything + team activity; Employee sees a simpler view.
- **Team** — owner can add/remove employees (all employees see all customers).

## Run it locally

```bash
npm install        # first time only
npm run dev        # start the app → http://localhost:3000
```

If the database is ever empty, seed sample data:

```bash
npm run db:seed
```

### Demo logins
| Role | Email | Password |
|---|---|---|
| Owner | owner@marshmallow.crm | owner123 |
| Employee | employee@marshmallow.crm | staff123 |

> Change these in production! Add real team members from the **Team** page.

## Turning on real email (optional)

Emails currently run in "console mode" (printed to the terminal). To send for real:

1. Make a free account at https://resend.com and create an API key.
2. Put it in `.env`:
   ```
   RESEND_API_KEY="re_xxxxxxxx"
   EMAIL_FROM="Marshmallow CRM <you@yourdomain.com>"
   ```
3. Restart `npm run dev`. Emails now send and still log to each timeline.

## Going online (hosting)

The app is built to deploy to **Vercel** and use a hosted Postgres database
(e.g. **Supabase**) when you're ready:

1. Create a Supabase project → copy its Postgres connection string.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. Set `DATABASE_URL` to the Supabase string, then run `npx prisma migrate deploy`.
4. Push the repo to GitHub and import it on Vercel; add the env vars there.

Until then, it runs fully on your machine with the local SQLite file (`prisma/dev.db`).

## Useful commands

```bash
npm run dev        # development server
npm run build      # production build
npm run db:seed    # load sample owner/employee/customers
npm run db:reset   # wipe + recreate the database (asks for confirmation)
npx prisma studio  # visual database browser
```
