import "server-only";
import OpenAI from "openai";
import { unstable_cache } from "next/cache";

const MODEL = "gpt-4o-mini";

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function ask(prompt: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 180,
      messages: [{ role: "user", content: prompt }],
    });
    return res.choices[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error("[AI] Error:", e);
    return null;
  }
}

// ---------- Dashboard Briefing ----------

export type DashboardData = {
  totalCustomers: number;
  followupDue: number;
  tasksDue: number;
  contactedThisWeek: number;
  birthdaysSoon: string[];
};

async function _getDashboardBriefing(data: DashboardData): Promise<string | null> {
  const bdText =
    data.birthdaysSoon.length > 0
      ? data.birthdaysSoon.join(", ")
      : "none this week";

  return ask(
    `You are a helpful assistant for an anime merchandise store CRM in Bangladesh.

Today's store snapshot:
- Total customers: ${data.totalCustomers}
- Follow-ups overdue (no contact in 7+ days): ${data.followupDue}
- Tasks due today: ${data.tasksDue}
- Interactions logged this week: ${data.contactedThisWeek}
- Upcoming birthdays (next 7 days): ${bdText}

Write a SHORT, friendly 2–3 sentence daily briefing for the store owner.
Be specific and tell them the most important thing to focus on today.
No bullet points — natural sentences only.`,
  );
}

export const getDashboardBriefing = unstable_cache(
  _getDashboardBriefing,
  ["dashboard-briefing"],
  { revalidate: 3600 },
);

// ---------- Customer Insight ----------

export type CustomerInsightData = {
  name: string;
  stage: string;
  favouriteAnime: string | null;
  productBought: string | null;
  orderAmount: number | null;
  repeatCustomer: boolean;
  lastContactedAt: Date | null;
  interactions: { type: string; summary: string }[];
};

async function _getCustomerInsight(data: CustomerInsightData): Promise<string | null> {
  const daysSince =
    data.lastContactedAt
      ? Math.floor((Date.now() - new Date(data.lastContactedAt).getTime()) / 86_400_000)
      : null;

  const recent = data.interactions
    .slice(0, 4)
    .map((i) => `${i.type}: ${i.summary}`)
    .join(" | ");

  return ask(
    `You are a helpful CRM assistant for an anime merchandise store in Bangladesh.

Customer profile:
- Name: ${data.name}
- CRM stage: ${data.stage}
- Favourite anime: ${data.favouriteAnime ?? "unknown"}
- Product bought: ${data.productBought ?? "none recorded"}
- Order value: ${data.orderAmount ? `৳${data.orderAmount}` : "unknown"}
- Repeat customer: ${data.repeatCustomer ? "yes" : "no"}
- Last contacted: ${daysSince !== null ? `${daysSince} days ago` : "never"}
- Recent interactions: ${recent || "none"}

In 1–2 short sentences, suggest the SINGLE BEST thing staff should do next with this customer.
Reference their anime interest or purchase if relevant. Be friendly and specific.`,
  );
}

export function getCustomerInsight(data: CustomerInsightData): Promise<string | null> {
  const cacheKey = `customer-insight-${data.name}-${data.lastContactedAt?.toISOString() ?? "never"}`;
  return unstable_cache(_getCustomerInsight, [cacheKey], { revalidate: 7200 })(data);
}
