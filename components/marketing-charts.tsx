// Presentational analytics charts for the Marketing Hub (CSS/SVG, no deps).

type Datum = { label: string; value: number };

function taka(n: number) {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? `৳${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k` : `৳${abs}`;
  return n < 0 ? `-${s}` : s;
}

function VBars({ data, fmt }: { data: Datum[]; fmt?: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const format = fmt ?? ((n: number) => String(n));
  if (data.length === 0) return <p className="text-sm text-brand-700/40">No data yet.</p>;
  return (
    <div className="flex items-end gap-2 pt-4" style={{ height: 160 }}>
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-brand-600">{format(d.value)}</span>
          <div className="w-full rounded-t bg-brand-500" style={{ height: Math.max(2, (d.value / max) * 120) }} />
          <span className="text-[9px] text-brand-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function HBars({ data, fmt }: { data: Datum[]; fmt?: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const format = fmt ?? ((n: number) => String(n));
  if (data.length === 0) return <p className="text-sm text-brand-700/40">No data yet.</p>;
  return (
    <ul className="space-y-2">
      {data.map((d, i) => (
        <li key={`${d.label}-${i}`} className="text-sm">
          <div className="flex justify-between">
            <span className="text-brand-700 truncate">{d.label}</span>
            <span className="text-brand-600 font-medium ml-2">{format(d.value)}</span>
          </div>
          <div className="mt-0.5 h-2 rounded-full bg-brand-50">
            <div className="h-2 rounded-full bg-brand-400" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-900">{title}</h3>
        {sub && <span className="text-xs text-brand-700/50">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

export default function MarketingCharts({
  newLeads,
  postsByChannel,
  leadsBySource,
  spendByChannel,
  monthLabel,
}: {
  newLeads: Datum[];
  postsByChannel: Datum[];
  leadsBySource: Datum[];
  spendByChannel: Datum[];
  monthLabel: string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-brand-900">📊 Analytics</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="New leads" sub="last 6 months">
          <VBars data={newLeads} />
        </Card>
        <Card title="Planned posts by channel" sub={monthLabel}>
          <VBars data={postsByChannel} />
        </Card>
        <Card title="Leads by source">
          <HBars data={leadsBySource} />
        </Card>
        <Card title="Campaign budget by channel" sub="৳ allocated">
          <HBars data={spendByChannel} fmt={taka} />
        </Card>
      </div>
    </div>
  );
}
