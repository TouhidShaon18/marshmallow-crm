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

/**
 * All scheduled dates a template produces in a period.
 * DAILY → one per calendar day; MONTHLY → a single date on dayOfMonth.
 */
export function scheduledDatesFor(
  period: string,
  template: { frequency: string; dayOfMonth: number },
): Date[] {
  const [y, m] = period.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  if (template.frequency === "DAILY") {
    return Array.from({ length: lastDay }, (_, i) => new Date(y, m - 1, i + 1, 9, 0, 0));
  }
  return [scheduledDateFor(period, template.dayOfMonth)];
}
