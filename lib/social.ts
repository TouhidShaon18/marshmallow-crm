// Shared config for social channels — used by pages and components.

export const CHANNEL_CONFIG = {
  FACEBOOK:   { label: "Facebook",            icon: "👍", color: "bg-blue-100   text-blue-700"   },
  INSTAGRAM:  { label: "Instagram",           icon: "📸", color: "bg-pink-100   text-pink-700"   },
  YOUTUBE:    { label: "YouTube",             icon: "▶️",  color: "bg-red-100    text-red-700"    },
  GMB:        { label: "GMB",                 icon: "🗺️",  color: "bg-green-100  text-green-700"  },
  REDDIT:     { label: "Reddit",              icon: "🔴", color: "bg-orange-100 text-orange-700" },
  PINTEREST:  { label: "Pinterest",           icon: "📌", color: "bg-rose-100   text-rose-700"   },
  TIKTOK:     { label: "TikTok",              icon: "🎵", color: "bg-gray-100   text-gray-700"   },
  BLOG:       { label: "Blog",                icon: "✍️",  color: "bg-amber-100  text-amber-700"  },
  EMAIL:      { label: "Email",               icon: "📧", color: "bg-sky-100    text-sky-700"    },
  SMS:        { label: "SMS",                 icon: "💬", color: "bg-lime-100   text-lime-700"   },
  INFLUENCER: { label: "Influencer",          icon: "🌟", color: "bg-purple-100 text-purple-700" },
} as const;

export type SocialChannelKey = keyof typeof CHANNEL_CONFIG;

export const ALL_CHANNELS = Object.keys(CHANNEL_CONFIG) as SocialChannelKey[];

export function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function periodToLabel(period: string) {
  const [y, m] = period.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function prevPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function nextPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Build the scheduled date for a template's dayOfMonth in a given period. */
export function scheduledDateFor(period: string, dayOfMonth: number): Date {
  const [y, m] = period.split("-").map(Number);
  // Clamp to last day of month
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  return new Date(y, m - 1, day, 9, 0, 0); // 9 AM
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const POST_FREQUENCIES = [
  { value: "MONTHLY",  label: "Once a month (on a set day)" },
  { value: "WEEKLY",   label: "Every week (on a weekday)" },
  { value: "BIWEEKLY", label: "Every 2 weeks (1st, 3rd… weekday)" },
  { value: "DAILY",    label: "Every day" },
] as const;

export type TemplateSchedule = {
  frequency: string;
  dayOfMonth: number;
  dayOfWeek?: number | null;
  postHour?: number | null;
  postMinute?: number | null;
};

/** "9:00 PM" from hour/minute. */
export function formatTime(hour = 9, minute = 0): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/** Human description of when a template fires, e.g. "Every Monday at 9:00 PM". */
export function describeSchedule(t: TemplateSchedule): string {
  const time = `at ${formatTime(t.postHour ?? 9, t.postMinute ?? 0)}`;
  const wd = WEEKDAYS[t.dayOfWeek ?? 1];
  if (t.frequency === "DAILY")    return `Every day ${time}`;
  if (t.frequency === "WEEKLY")   return `Every ${wd} ${time}`;
  if (t.frequency === "BIWEEKLY") return `Every 2 weeks on ${wd} ${time}`;
  return `Monthly on the ${t.dayOfMonth}${ordinalSuffix(t.dayOfMonth)} ${time}`;
}

/**
 * All scheduled dates a template produces in a period.
 * MONTHLY → one date; DAILY → every day; WEEKLY → each matching weekday;
 * BIWEEKLY → every other matching weekday (1st, 3rd, 5th occurrence).
 */
export function scheduledDatesFor(period: string, t: TemplateSchedule): Date[] {
  const [y, m] = period.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const h = t.postHour ?? 9;
  const min = t.postMinute ?? 0;
  const at = (day: number) => new Date(y, m - 1, day, h, min, 0);

  if (t.frequency === "DAILY") {
    return Array.from({ length: lastDay }, (_, i) => at(i + 1));
  }

  if (t.frequency === "WEEKLY" || t.frequency === "BIWEEKLY") {
    const dow = t.dayOfWeek ?? 1;
    const matches: number[] = [];
    for (let d = 1; d <= lastDay; d++) {
      if (new Date(y, m - 1, d).getDay() === dow) matches.push(d);
    }
    const chosen = t.frequency === "BIWEEKLY" ? matches.filter((_, i) => i % 2 === 0) : matches;
    return chosen.map(at);
  }

  // MONTHLY
  return [at(Math.min(t.dayOfMonth, lastDay))];
}
