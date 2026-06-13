"use client";

import { useRouter } from "next/navigation";
import { PERIOD_TYPES, defaultPeriod, type FinancePeriodType } from "@/lib/finance";

// HTML input type for each period granularity.
const INPUT_TYPE: Record<FinancePeriodType, string> = {
  MONTHLY: "month",
  WEEKLY: "week",
  DAILY: "date",
};

export default function FinancePeriodSelector({
  type,
  period,
  basePath,
}: {
  type: FinancePeriodType;
  period: string;
  basePath: string;
}) {
  const router = useRouter();

  const go = (t: FinancePeriodType, p: string) =>
    router.push(`${basePath}?type=${t}&period=${p}`);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div>
        <label className="label">Period type</label>
        <select
          value={type}
          className="input w-auto"
          onChange={(e) => {
            const t = e.target.value as FinancePeriodType;
            // reset the period to the default for the new type
            go(t, defaultPeriod(t));
          }}
        >
          {PERIOD_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>{pt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">
          {type === "MONTHLY" ? "Month" : type === "WEEKLY" ? "Week" : "Date"}
        </label>
        <input
          type={INPUT_TYPE[type]}
          value={period}
          className="input w-auto"
          onChange={(e) => { if (e.target.value) go(type, e.target.value); }}
        />
      </div>
    </div>
  );
}
