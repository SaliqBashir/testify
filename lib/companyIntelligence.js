/**
 * Template-based company intelligence (no external APIs).
 */

const STOP_WORDS = new Set([
  "that",
  "this",
  "with",
  "from",
  "have",
  "been",
  "were",
  "their",
  "they",
  "will",
  "your",
  "into",
  "more",
  "than",
  "such",
  "also",
  "some",
  "what",
  "when",
  "where",
  "which",
  "while",
  "about",
  "after",
  "before",
  "between",
  "through",
  "under",
  "other",
  "being",
  "both",
  "each",
  "made",
  "many",
  "most",
  "only",
  "over",
  "same",
  "very",
  "well",
  "high",
  "custom",
  "based",
  "using",
  "including",
  "available",
  "services",
  "service",
  "products",
  "product",
  "company",
  "manufacturer",
  "manufacturing",
  "supplier",
  "suppliers",
  "leading",
  "provider",
]);

function titleCase(str) {
  if (!str) return "";
  return String(str).replace(/\w\S*/g, (w) =>
    w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w,
  );
}

export function getYearsInBusiness(yearFounded) {
  const y = parseInt(String(yearFounded).replace(/\D/g, ""), 10);
  const cy = new Date().getFullYear();
  if (!y || y < 1800 || y > cy) return null;
  return cy - y;
}

/**
 * Dynamic summary focused on capabilities and products, ignoring raw metrics.
 */
export function generateCompanySummary(company) {
  const headings =
    company.headings?.length > 0 ? company.headings : company.categories || [];
  const primary = headings[0] ? String(headings[0]) : "industrial solutions";
  const otherFocus = headings
    .slice(1, 3)
    .map((s) => String(s).toLowerCase())
    .join(" and ");

  const prods = (company.products || [])
    .slice(0, 3)
    .map((s) => String(s).toLowerCase());
  const tags = (company.tags || [])
    .slice(0, 3)
    .map((s) => String(s).toLowerCase());

  const location = [company.addressCity, company.addressCountry]
    .filter(Boolean)
    .join(", ");
  const locPhrase = location ? ` based in ${location}` : "";

  let paragraph = `Operating as a provider of ${primary.toLowerCase()}${locPhrase}, this supplier `;

  if (otherFocus) {
    paragraph += `specializes in ${otherFocus}. `;
  } else {
    paragraph += `focuses on core manufacturing and distribution operations. `;
  }

  if (prods.length > 0) {
    paragraph += `Their capabilities cover ${prods.join(", ")}, ensuring targeted supply chain options for specialized procurement. `;
  }

  if (tags.length > 0) {
    paragraph += `Industry footprint indicates strong competencies in ${tags.join(", ")}, highlighting their technical alignment and market positioning.`;
  } else {
    paragraph += `They maintain a robust portfolio of parts and services for B2B sourcing initiatives.`;
  }

  return paragraph.trim();
}

/**
 * Base Authority Score (0-100).
 * Relevance is now handled by the AI Semantic engine, so this strictly measures company quality.
 */
export function computeFitScore(company) {
  const y = parseInt(String(company.yearFounded).replace(/\D/g, ""), 10);
  const cy = new Date().getFullYear();

  // 1. Experience (Max 40 points)
  let experience = 0;
  if (y && y > 1800 && y <= cy) {
    const age = cy - y;
    experience = Math.min(40, Math.round((age / 100) * 40));
  }

  // 2. Company Size (Max 30 points)
  const emp = company.employees || 0;
  let size = 0;
  if (emp >= 1000) size = 30;
  else if (emp >= 500) size = 25;
  else if (emp >= 200) size = 20;
  else if (emp >= 50) size = 15;
  else if (emp >= 15) size = 8;
  else if (emp > 0) size = 4;

  // 3. Brands & Capability Breadth (Max 30 points)
  const brandCount = (company.brands || []).length;
  const brands = Math.min(30, Math.round((Math.min(brandCount, 15) / 15) * 30));

  const score = Math.min(100, experience + size + brands);

  return {
    score: Math.round(score),
    breakdown: {
      experience,
      size,
      brands,
      // Relevance is intentionally omitted here so it doesn't double-count.
      // It will be injected as `aiSemantic` by the searchEngine later.
    },
  };
}

/**
 * 5–10 normalized tags from description + headings.
 */
export function extractTags(description = "", headings = []) {
  const tagMap = new Map();

  for (const h of headings) {
    const t = String(h).trim();
    if (t.length < 2 || t.length > 56) continue;
    const key = t.toLowerCase();
    if (!tagMap.has(key)) tagMap.set(key, titleCase(t));
  }

  const blob =
    `${description || ""} ${(headings || []).join(" ")}`.toLowerCase();
  const words = blob.match(/\b[a-z]{4,}\b/g) || [];
  const freq = {};
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  for (const [w] of sorted) {
    if (tagMap.size >= 14) break;
    const key = w.toLowerCase();
    if (!tagMap.has(key)) tagMap.set(key, titleCase(w));
  }

  return Array.from(tagMap.values()).slice(0, 10);
}

/**
 * Rank similar companies by overlapping headings, tags, and brands.
 */
export function findSimilarCompanies(target, allCompanies, limit = 5) {
  const th = new Set(
    (target.headings || target.categories || []).map((x) =>
      String(x).toLowerCase(),
    ),
  );
  const tt = new Set((target.tags || []).map((x) => String(x).toLowerCase()));
  const tb = new Set((target.brands || []).map((x) => String(x).toLowerCase()));

  return allCompanies
    .filter((c) => c.id !== target.id)
    .map((c) => {
      let score = 0;
      for (const h of c.headings || c.categories || []) {
        if (th.has(String(h).toLowerCase())) score += 4;
      }
      for (const t of c.tags || []) {
        if (tt.has(String(t).toLowerCase())) score += 2;
      }
      for (const b of c.brands || []) {
        if (tb.has(String(b).toLowerCase())) score += 5;
      }
      return { company: c, similarityScore: score };
    })
    .filter((x) => x.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

/**
 * Short highlight lines for UI (from score breakdown + facts).
 */
export function deriveStrengths(company, breakdown) {
  const out = [];
  if (!breakdown) return out;

  // Now reads the AI Semantic score injected by searchEngine.js
  if (breakdown.aiSemantic >= 85) out.push("Perfect semantic match");
  else if (breakdown.aiSemantic >= 65) out.push("Strong topical fit");

  if (breakdown.experience >= 30) out.push("Highly experienced");
  else if (breakdown.experience >= 15) out.push("Established track record");

  if (breakdown.size >= 20) out.push("Strong headcount");
  else if (breakdown.size >= 10) out.push("Solid scale");

  if (breakdown.brands >= 20) out.push("Rich brand mix");
  if ((company.brands || []).length >= 4) out.push("Multi-brand footprint");

  if ((company.headings || company.categories || []).length >= 5) {
    out.push("Wide product range");
  }

  const seen = new Set();
  return out
    .filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 5);
}
