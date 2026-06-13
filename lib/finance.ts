// ── Period types (daily / weekly / monthly) ──────────────────────────────────

export type FinancePeriodType = "DAILY" | "WEEKLY" | "MONTHLY";

export const PERIOD_TYPES: { value: FinancePeriodType; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY",  label: "Weekly"  },
  { value: "DAILY",   label: "Daily"   },
];

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** Validate that a period string matches the expected format for its type. */
export function isValidPeriod(type: FinancePeriodType, period: string): boolean {
  if (type === "MONTHLY") return /^\d{4}-\d{2}$/.test(period);
  if (type === "WEEKLY")  return /^\d{4}-W\d{2}$/.test(period);
  if (type === "DAILY")   return /^\d{4}-\d{2}-\d{2}$/.test(period);
  return false;
}

/** ISO-8601 week string, e.g. "2026-W24", for a given date. */
export function isoWeekString(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;            // Mon=1 … Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** The default period string for a type, based on today. */
export function defaultPeriod(type: FinancePeriodType, now = new Date()): string {
  if (type === "MONTHLY") return now.toISOString().slice(0, 7);
  if (type === "DAILY")   return now.toISOString().slice(0, 10);
  return isoWeekString(now);
}

/** Full, human-friendly label, e.g. "June 2026", "Week 24, 2026", "13 June 2026". */
export function formatPeriodLong(type: FinancePeriodType, period: string): string {
  if (type === "MONTHLY") { const [y, m] = period.split("-"); return `${MONTHS_LONG[+m - 1]} ${y}`; }
  if (type === "DAILY")   { const [y, m, d] = period.split("-"); return `${+d} ${MONTHS_LONG[+m - 1]} ${y}`; }
  const [y, w] = period.split("-W"); return `Week ${+w}, ${y}`;
}

/** Short label for chart axes & tables, e.g. "Jun '26", "13 Jun", "W24". */
export function formatPeriodShort(type: FinancePeriodType, period: string): string {
  if (type === "MONTHLY") { const [y, m] = period.split("-"); return `${MONTHS_SHORT[+m - 1]} '${y.slice(2)}`; }
  if (type === "DAILY")   { const [, m, d] = period.split("-"); return `${+d} ${MONTHS_SHORT[+m - 1]}`; }
  const [, w] = period.split("-W"); return `W${+w}`;
}

export type FinanceCalc = {
  period: string;
  revenue: number;
  cogsTotal: number;
  grossProfit: number;
  grossMarginPct: number;
  opexFixed: number;
  opexVariable: number;
  opexTotal: number;
  ebit: number;
  netProfit: number;
  netMarginPct: number;
  breakEven: number | null;
};

export function calcFinance(e: {
  period: string; revenue: number;
  cogsRawMaterials: number; cogsLabour: number; cogsPackaging: number;
  cogsDirectProd: number; cogsMisc: number;
  opexRent: number; opexSalaries: number; opexSubscriptions: number;
  opexUtilities: number; opexMarketing: number; opexLogistics: number;
  opexMiscVar: number; taxAndInterest: number;
}): FinanceCalc {
  const cogsTotal      = e.cogsRawMaterials + e.cogsLabour + e.cogsPackaging + e.cogsDirectProd + e.cogsMisc;
  const grossProfit    = e.revenue - cogsTotal;
  const grossMarginPct = e.revenue > 0 ? (grossProfit / e.revenue) * 100 : 0;
  const opexFixed      = e.opexRent + e.opexSalaries + e.opexSubscriptions;
  const opexVariable   = e.opexUtilities + e.opexMarketing + e.opexLogistics + e.opexMiscVar;
  const opexTotal      = opexFixed + opexVariable;
  const ebit           = grossProfit - opexTotal;
  const netProfit      = ebit - e.taxAndInterest;
  const netMarginPct   = e.revenue > 0 ? (netProfit / e.revenue) * 100 : 0;
  const breakEven      = grossMarginPct > 0 ? (opexFixed / (grossMarginPct / 100)) : null;

  return { period: e.period, revenue: e.revenue, cogsTotal, grossProfit, grossMarginPct, opexFixed, opexVariable, opexTotal, ebit, netProfit, netMarginPct, breakEven };
}
