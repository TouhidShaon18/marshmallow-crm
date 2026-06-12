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
