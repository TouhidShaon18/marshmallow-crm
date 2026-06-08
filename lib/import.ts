import "server-only";
import * as XLSX from "xlsx";

export type ParsedCustomer = {
  name: string;
  address: string | null;
  favouriteAnime: string | null;
  whatsappNumber: string | null;
  email: string | null;
  productBought: string | null;
  channel: "ONLINE" | "OFFLINE";
  giftReceived: string | null;
  birthday: Date | null;
  orderAmount: number | null;
  repeatCustomer: boolean;
};

// Header aliases — match many spellings to one field. Compared after
// lowercasing and stripping anything that isn't a letter or number.
const ALIASES: Record<keyof ParsedCustomer, string[]> = {
  name: ["name", "customername", "fullname", "customer"],
  address: ["address", "location", "city"],
  favouriteAnime: ["favouriteanime", "favoriteanime", "anime", "favanime"],
  whatsappNumber: ["whatsapp", "whatsappnumber", "phone", "mobile", "number", "contact", "phonenumber"],
  email: ["email", "emailaddress", "mail"],
  productBought: ["product", "productbought", "item", "products", "purchase"],
  channel: ["channel", "ordertype", "onlineoffline", "type", "source"],
  giftReceived: ["gift", "giftreceived", "freegift"],
  birthday: ["birthday", "dob", "dateofbirth", "birthdate"],
  orderAmount: ["orderamount", "amount", "total", "price", "ordervalue", "value"],
  repeatCustomer: ["repeat", "repeatcustomer", "returning", "isrepeat", "repeatbuyer"],
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof ParsedCustomer, string>> {
  const map: Partial<Record<keyof ParsedCustomer, string>> = {};
  for (const header of headers) {
    const n = norm(header);
    for (const field of Object.keys(ALIASES) as (keyof ParsedCustomer)[]) {
      if (map[field]) continue;
      if (ALIASES[field].includes(n)) {
        map[field] = header;
        break;
      }
    }
  }
  return map;
}

function toStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toBool(v: unknown): boolean {
  const s = toStr(v)?.toLowerCase();
  return s === "yes" || s === "true" || s === "1" || s === "y" || s === "repeat";
}

function toChannel(v: unknown): "ONLINE" | "OFFLINE" {
  return toStr(v)?.toLowerCase().startsWith("on") ? "ONLINE" : "OFFLINE";
}

function toDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

export type ParseResult = {
  customers: ParsedCustomer[];
  errors: string[];
  matchedColumns: string[];
};

export function parseCustomerFile(buffer: Buffer): ParseResult {
  const errors: string[] = [];
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { customers: [], errors: ["The file has no sheets."], matchedColumns: [] };

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) return { customers: [], errors: ["No data rows found in the file."], matchedColumns: [] };

  const headers = Object.keys(rows[0]);
  const hmap = buildHeaderMap(headers);

  if (!hmap.name) {
    return {
      customers: [],
      errors: ['Could not find a "Name" column. Make sure your first row has column headers (e.g. Name, WhatsApp, Email).'],
      matchedColumns: [],
    };
  }

  const get = (row: Record<string, unknown>, field: keyof ParsedCustomer) =>
    hmap[field] ? row[hmap[field] as string] : undefined;

  const customers: ParsedCustomer[] = [];
  rows.forEach((row, i) => {
    const name = toStr(get(row, "name"));
    if (!name) {
      errors.push(`Row ${i + 2}: skipped — no name.`);
      return;
    }
    customers.push({
      name,
      address: toStr(get(row, "address")),
      favouriteAnime: toStr(get(row, "favouriteAnime")),
      whatsappNumber: toStr(get(row, "whatsappNumber")),
      email: toStr(get(row, "email")),
      productBought: toStr(get(row, "productBought")),
      channel: toChannel(get(row, "channel")),
      giftReceived: toStr(get(row, "giftReceived")),
      birthday: toDate(get(row, "birthday")),
      orderAmount: toNumber(get(row, "orderAmount")),
      repeatCustomer: toBool(get(row, "repeatCustomer")),
    });
  });

  const matchedColumns = (Object.keys(hmap) as (keyof ParsedCustomer)[]).map((f) => f);
  return { customers, errors, matchedColumns };
}

// Builds a downloadable .xlsx template with headers + one example row.
export function buildTemplateBuffer(): Buffer {
  const headers = [
    "Name",
    "WhatsApp",
    "Email",
    "Address",
    "Favourite Anime",
    "Product Bought",
    "Channel",
    "Gift Received",
    "Birthday",
    "Order Amount",
    "Repeat Customer",
  ];
  const example = [
    "Rumi Akter",
    "+8801712345678",
    "rumi@example.com",
    "Dhanmondi, Dhaka",
    "Naruto",
    "Naruto Hoodie (L)",
    "Online",
    "Sticker pack",
    "1999-05-12",
    1850,
    "Yes",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
