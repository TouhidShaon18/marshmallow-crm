/**
 * Nuport API client
 *
 * Base URL:  https://api.nuport.io
 * Auth:      Authorization: <api_key>   (raw key, no "Bearer" prefix)
 * Customers: GET /integration/customers  (paginated)
 */

const BASE_URL = "https://api.nuport.io";

/** Shape we expect from Nuport's customer list response. */
export type NuportCustomer = {
  id:       string;
  name:     string;
  mobile?:  string;
  phone?:   string;
  email?:   string;
  address?: string;
  area?:    string;
  [key: string]: unknown; // allow extra fields we don't need
};

type PagedResponse = {
  data?:    NuportCustomer[];
  results?: NuportCustomer[];  // some Nuport endpoints use "results"
  count?:   number;
  next?:    string | null;
};

/**
 * Fetch one page of customers from Nuport.
 * Returns the raw response so the caller can decide whether to paginate.
 */
async function fetchPage(
  apiKey: string,
  page: number,
  perPage = 100,
): Promise<{ customers: NuportCustomer[]; hasMore: boolean }> {
  const url = `${BASE_URL}/integration/customers?page=${page}&per_page=${perPage}`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Nuport API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as PagedResponse | NuportCustomer[];

  // Handle both array and paged-object responses
  if (Array.isArray(json)) {
    return { customers: json, hasMore: json.length === perPage };
  }

  const customers = json.data ?? json.results ?? [];
  const hasMore = customers.length === perPage && (json.next ?? null) !== null;
  return { customers, hasMore };
}

/**
 * Fetch ALL customers from Nuport by walking every page.
 * Use sparingly (once/hour is fine for typical customer counts).
 */
export async function fetchAllNuportCustomers(
  apiKey: string,
): Promise<NuportCustomer[]> {
  const all: NuportCustomer[] = [];
  let page = 1;

  for (;;) {
    const { customers, hasMore } = await fetchPage(apiKey, page);
    all.push(...customers);
    if (!hasMore || customers.length === 0) break;
    page++;
  }

  return all;
}

/** Validate the API key by doing a lightweight 1-item fetch. */
export async function testNuportApiKey(apiKey: string): Promise<boolean> {
  try {
    await fetchPage(apiKey, 1, 1);
    return true;
  } catch {
    return false;
  }
}
