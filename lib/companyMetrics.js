/**
 * Revenue / geo helpers for filtering and map pins.
 */

/** Rough $M bounds from annualSales strings (Thomasnet-style). */
export function parseRevenueAnnualSales(str) {
  if (!str || str === "Undisclosed") return { minM: null, maxM: null };
  const raw = String(str).trim();
  const lower = raw.toLowerCase();

  if (lower.includes("100m") || /\$100\s*\+/i.test(raw)) {
    return { minM: 100, maxM: 1e6 };
  }
  if (lower.includes("75m") && lower.includes("+")) {
    return { minM: 75, maxM: 1e6 };
  }
  if (lower.includes("50m") && lower.includes("+")) {
    return { minM: 50, maxM: 1e6 };
  }

  const range = raw.match(
    /\$?\s*(\d+)\s*M?\s*[-–]\s*\$?\s*(\d+)\s*M?/i,
  );
  if (range) {
    return {
      minM: parseInt(range[1], 10),
      maxM: parseInt(range[2], 10),
    };
  }

  const plus = raw.match(/\$?\s*(\d+)\s*M?\s*\+/i);
  if (plus) {
    const n = parseInt(plus[1], 10);
    return { minM: n, maxM: 1e6 };
  }

  const single = raw.match(/\$?\s*(\d+)\s*M/i);
  if (single) {
    const n = parseInt(single[1], 10);
    return { minM: n, maxM: n };
  }

  return { minM: null, maxM: null };
}

/** @typedef {'any'|'under10'|'10to50'|'50to100'|'over100'} RevenueFilter */

/**
 * @param {{ revenueMinM: number|null, revenueMaxM: number|null }} s
 * @param {RevenueFilter} band
 */
export function matchesRevenueBand(s, band) {
  if (band === "any") return true;
  const a = s.revenueMinM;
  const b = s.revenueMaxM;
  if (a == null && b == null) return false;

  const lo = Math.min(a ?? b ?? 0, b ?? a ?? 0);
  const hi = Math.max(a ?? 0, b ?? 0);

  switch (band) {
    case "under10":
      return hi <= 10;
    case "10to50":
      return lo <= 50 && hi >= 10;
    case "50to100":
      return lo <= 100 && hi >= 50;
    case "over100":
      return hi >= 100 || lo >= 100;
    default:
      return true;
  }
}

const CITY_COORDS = {
  "houston|texas": [29.7604, -95.3698],
  "san jose|california": [37.3382, -121.8863],
  "chicago|illinois": [41.8781, -87.6298],
  "austin|texas": [30.2672, -97.7431],
  "akron|ohio": [41.0814, -81.519],
  "pittsburgh|pennsylvania": [40.4406, -79.9959],
};

/**
 * @param {object} raw — raw scraper row
 * @param {{ addressCity: string, addressState: string }} normalized
 * @param {number} index — jitter fallback
 */
export function resolveLatLng(raw, normalized, index) {
  const a = raw.address || {};
  const lat =
    a.lat ??
    a.latitude ??
    raw.lat ??
    raw.latitude ??
    (Array.isArray(a) ? null : null);
  const lng =
    a.long ??
    a.lng ??
    a.longitude ??
    raw.long ??
    raw.lng ??
    raw.longitude;

  if (lat != null && lng != null && !Number.isNaN(+lat) && !Number.isNaN(+lng)) {
    return { lat: +lat, lng: +lng };
  }

  const city = (normalized.addressCity || "").toLowerCase().trim();
  const state = (normalized.addressState || "").toLowerCase().trim();
  const key = `${city}|${state}`;
  if (CITY_COORDS[key]) {
    const [la, ln] = CITY_COORDS[key];
    return { lat: la, lng: ln };
  }

  // US centroid + tiny jitter so markers don't stack
  const jitter = (index % 7) * 0.08;
  return { lat: 39.8283 + jitter * 0.3, lng: -98.5795 + jitter * 0.5 };
}
