type BarProps = {
  label: string;
  actual: number;
  target: number | null | undefined;
  format?: (n: number) => string;
};

function ProgressBar({ label, actual, target, format }: BarProps) {
  if (!target) return null;
  const pct = Math.min(Math.round((actual / target) * 100), 100);
  const fmt = format ?? ((n) => n.toLocaleString());
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
          <span className="ml-1 text-brand-700/40">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export type SalesTargetData = {
  revenueTarget:        number | null | undefined;
  contactTarget:        number | null | undefined;
  followup7dTarget:     number | null | undefined;
  followup30dTarget:    number | null | undefined;
  convertedSaleTarget:  number | null | undefined;
  repeatSaleTarget:     number | null | undefined;
  newCustomerTarget:    number | null | undefined;
};

export type SalesActualData = {
  revenue:        number;
  contacts:       number;
  followup7d:     number;
  followup30d:    number;
  convertedSales: number;
  repeatSales:    number;
  newCustomers:   number;
};

/** @deprecated use SalesTargetData — kept so existing callers compile */
export type TargetData = SalesTargetData;
/** @deprecated use SalesActualData — kept so existing callers compile */
export type ActualData = SalesActualData;

export function TargetCard({ name, target, actual }: { name: string; target: SalesTargetData; actual: SalesActualData }) {
  const has = target.revenueTarget || target.contactTarget || target.followup7dTarget ||
    target.followup30dTarget || target.convertedSaleTarget || target.repeatSaleTarget || target.newCustomerTarget;

  if (!has) return (
    <div className="rounded-lg border border-dashed border-brand-200 px-4 py-3 text-sm text-brand-700/50">
      {name} — no sales target set
    </div>
  );

  return (
    <div className="rounded-lg border border-brand-100 bg-white px-4 py-4 space-y-3">
      <p className="text-sm font-semibold text-brand-900">{name}</p>
      <ProgressBar label="💰 Revenue"          actual={actual.revenue}        target={target.revenueTarget}       format={(n) => `৳${n.toLocaleString()}`} />
      <ProgressBar label="💬 Total contacts"   actual={actual.contacts}       target={target.contactTarget} />
      <ProgressBar label="⚡ Follow-up ≤7 days" actual={actual.followup7d}    target={target.followup7dTarget} />
      <ProgressBar label="📅 Follow-up ≤30 days" actual={actual.followup30d}  target={target.followup30dTarget} />
      <ProgressBar label="✅ Converted sales"  actual={actual.convertedSales} target={target.convertedSaleTarget} />
      <ProgressBar label="🔁 Repeat sales"     actual={actual.repeatSales}    target={target.repeatSaleTarget} />
      <ProgressBar label="👤 New customers"    actual={actual.newCustomers}   target={target.newCustomerTarget} />
    </div>
  );
}

// ── Marketing ─────────────────────────────────────────────────────────────────

export type MarketingTargetData = {
  postsTarget:    number | null | undefined;
  viewsTarget:    number | null | undefined;
  reactsTarget:   number | null | undefined;
  commentsTarget: number | null | undefined;
  sharesTarget:   number | null | undefined;
};

export type MarketingActualData = {
  posts:    number;
  views:    number;
  reacts:   number;
  comments: number;
  shares:   number;
};

export function MarketingTargetCard({ name, target, actual }: { name: string; target: MarketingTargetData; actual: MarketingActualData }) {
  const has = target.postsTarget || target.viewsTarget || target.reactsTarget ||
    target.commentsTarget || target.sharesTarget;

  if (!has) return (
    <div className="rounded-lg border border-dashed border-pink-200 px-4 py-3 text-sm text-pink-700/50">
      {name} — no marketing target set
    </div>
  );

  return (
    <div className="rounded-lg border border-pink-100 bg-white px-4 py-4 space-y-3">
      <p className="text-sm font-semibold text-brand-900">{name}</p>
      <ProgressBar label="📅 Posts published" actual={actual.posts}    target={target.postsTarget} />
      <ProgressBar label="👁️ Total views"     actual={actual.views}    target={target.viewsTarget} />
      <ProgressBar label="❤️ Reactions"        actual={actual.reacts}   target={target.reactsTarget} />
      <ProgressBar label="💬 Comments"         actual={actual.comments} target={target.commentsTarget} />
      <ProgressBar label="🔁 Shares"           actual={actual.shares}   target={target.sharesTarget} />
    </div>
  );
}
