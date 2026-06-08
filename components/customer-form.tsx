"use client";

import Link from "next/link";

type Employee = { id: string; name: string };

type CustomerValues = {
  id?: string;
  name?: string;
  address?: string | null;
  favouriteAnime?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  productBought?: string | null;
  channel?: "ONLINE" | "OFFLINE";
  giftReceived?: string | null;
  birthday?: Date | null;
  orderAmount?: number | null;
  repeatCustomer?: boolean;
  assignedToId?: string | null;
};

function dateValue(d?: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default function CustomerForm({
  action,
  employees,
  customer,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  employees: Employee[];
  customer?: CustomerValues;
  submitLabel: string;
}) {
  const c = customer ?? {};
  return (
    <form action={action} className="space-y-6">
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          Customer details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Name *</label>
            <input id="name" name="name" required className="input" defaultValue={c.name ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="whatsappNumber">WhatsApp number</label>
            <input id="whatsappNumber" name="whatsappNumber" className="input" placeholder="+8801712345678" defaultValue={c.whatsappNumber ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" defaultValue={c.email ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address">Address</label>
            <input id="address" name="address" className="input" defaultValue={c.address ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="favouriteAnime">Favourite anime</label>
            <input id="favouriteAnime" name="favouriteAnime" className="input" defaultValue={c.favouriteAnime ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="birthday">Birthday</label>
            <input id="birthday" name="birthday" type="date" className="input" defaultValue={dateValue(c.birthday)} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          Purchase
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="productBought">Product bought</label>
            <input id="productBought" name="productBought" className="input" defaultValue={c.productBought ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="orderAmount">Order amount (৳)</label>
            <input id="orderAmount" name="orderAmount" type="number" step="0.01" min="0" className="input" defaultValue={c.orderAmount ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="channel">Channel</label>
            <select id="channel" name="channel" className="input" defaultValue={c.channel ?? "OFFLINE"}>
              <option value="OFFLINE">Offline (in store)</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="giftReceived">Gift received from us</label>
            <input id="giftReceived" name="giftReceived" className="input" defaultValue={c.giftReceived ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="assignedToId">Assigned employee</label>
            <select id="assignedToId" name="assignedToId" className="input" defaultValue={c.assignedToId ?? ""}>
              <option value="">— Unassigned —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-brand-900">
              <input type="checkbox" name="repeatCustomer" defaultChecked={c.repeatCustomer ?? false} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
              Repeat customer
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary">{submitLabel}</button>
        <Link href={c.id ? `/customers/${c.id}` : "/customers"} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
