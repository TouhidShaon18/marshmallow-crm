type BarProps = {
  label: string;
  actual: number;
  target: number | null | undefined;
  format?: (n: number) => string;
};

function ProgressBar({ label, actual, target, format }: BarProps) {
  if (!target) return null;
  const pct = Math.min(Math.round((actual / target) * 100), 100);
  const fmt = format ?? ((n) => String(n));
  const color =
    pct >= 100 ? "bg-green-500"
    : pct >= 60 ? "bg-brand-500"
    : pct >= 30 ? "bg-amber-400"
    : "bg-red-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-brand-700/70">{label}</span>
        <span className="font-semibold text-brand-900">
          {fmt(actual)}&thinsp;/&thinsp;{fmt(target)}
          <span className="ml-1 text-brand-700/50">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export type TargetData = {
  revenueTarget:        number | null | undefined;
  contactTarget:        number | null | undefined;
  followup7dTarget:     number | null | undefined;
  followup30dTarget:    number | null | undefined;
  convertedSaleTarget:  number | null | undefined;
  repeatSaleTarget:     number | null | undefined;
  newCustomerTarget:    number | null | undefined;
};

export type ActualData = {
  revenue:        number;
  contacts:       number;
  followup7d:     number;
  followup30d:    number;
  convertedSales: number;
  repeatSales:    number;
  newCustomers:   number;
};

type CardProps = {
  name:   string;
  target: TargetData;
  actual: ActualData;
};

export function TargetCard({ name, target, actual }: CardProps) {
  const hasAnyTarget =
    target.revenueTarget       ||
    target.contactTarget       ||
    target.followup7dTarget    ||
    target.followup30dTarget   ||
    target.convertedSaleTarget ||
    target.repeatSaleTarget    ||
    target.newCustomerTarget;

  if (!hasAnyTarget) {
    return (
      <div className="rounded-lg border border-dashed border-brand-200 px-4 py-3 text-sm text-brand-700/50">
        {name} — no target set
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand-100 bg-white px-4 py-4 space-y-3">
      <p className="text-sm font-semibold text-brand-900">{name}</p>

      <ProgressBar
        label="💰 Revenue"
        actual={actual.revenue}
        target={target.revenueTarget}
        format={(n) => `৳${n.toLocaleString()}`}
      />
      <ProgressBar
        label="💬 Total contacts"
        actual={actual.contacts}
        target={target.contactTarget}
      />
      <ProgressBar
        label="⚡ Follow-up ≤7 days"
        actual={actual.followup7d}
        target={target.followup7dTarget}
      />
      <ProgressBar
        label="📅 Follow-up ≤30 days"
        actual={actual.followup30d}
        target={target.followup30dTarget}
      />
      <ProgressBar
        label="✅ Converted sales"
        actual={actual.convertedSales}
        target={target.convertedSaleTarget}
      />
      <ProgressBar
        label="🔁 Repeat sales"
        actual={actual.repeatSales}
        target={target.repeatSaleTarget}
      />
      <ProgressBar
        label="👤 New customers"
        actual={actual.newCustomers}
        target={target.newCustomerTarget}
      />
    </div>
  );
}
