// Builds the Prisma `where` filter for a broadcast's target audience,
// and resolves merge fields in a promo message. Shared by pages/actions.

export type AudienceOpts = {
  channel: "SMS" | "EMAIL";
  filterStage?: string | null;
  filterAnime?: string | null;
  filterPurchaseChannel?: string | null;
  filterRepeatOnly?: boolean;
  filterTagId?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function audienceWhere(opts: AudienceOpts): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // Must have a contact point for the chosen channel.
  if (opts.channel === "SMS") where.whatsappNumber = { not: null };
  else where.email = { not: null };

  if (opts.filterStage) where.stage = opts.filterStage;
  if (opts.filterAnime) where.favouriteAnime = { contains: opts.filterAnime };
  if (opts.filterPurchaseChannel) where.channel = opts.filterPurchaseChannel;
  if (opts.filterRepeatOnly) where.repeatCustomer = true;
  if (opts.filterTagId) where.tags = { some: { id: opts.filterTagId } };

  return where;
}

export function mergeMessage(
  template: string,
  c: { name: string; favouriteAnime: string | null; productBought: string | null; giftReceived: string | null },
): string {
  return template
    .replace(/\{name\}/gi, c.name)
    .replace(/\{anime\}/gi, c.favouriteAnime ?? "")
    .replace(/\{product\}/gi, c.productBought ?? "")
    .replace(/\{gift\}/gi, c.giftReceived ?? "");
}

export function audienceSummary(
  opts: AudienceOpts,
  stageLabel: (s: string) => string,
  tagName?: string | null,
): string {
  const parts: string[] = [];
  if (opts.filterStage) parts.push(stageLabel(opts.filterStage));
  if (opts.filterAnime) parts.push(`likes "${opts.filterAnime}"`);
  if (opts.filterPurchaseChannel) parts.push(opts.filterPurchaseChannel === "ONLINE" ? "online buyers" : "offline buyers");
  if (opts.filterRepeatOnly) parts.push("repeat customers");
  if (tagName) parts.push(`tag: ${tagName}`);
  const base = opts.channel === "SMS" ? "with a phone number" : "with an email";
  return parts.length ? `${parts.join(", ")} · ${base}` : `Everyone ${base}`;
}
