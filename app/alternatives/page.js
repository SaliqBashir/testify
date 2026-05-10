"use client";

import { useState } from "react";
import { BsStars, BsShieldCheck } from "react-icons/bs";
import {
  FaSearch,
  FaExchangeAlt,
  FaArrowRight,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import Navigation from "@/app/components/Navigation";

export default function Alternatives() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_URL}/api/alternatives/${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          setResults([]);
          return;
        }
        throw new Error("Failed to fetch alternatives");
      }

      const data = await response.json();

      if (data.alternatives && data.alternatives.length > 0) {
        const mappedResults = data.alternatives.map((alt, index) => ({
          id: index + 1,
          material: alt.name,
          matchScore: alt.match_score ?? Math.round(80 + Math.random() * 20),
          costImpact:
            alt.savings_pct !== undefined
              ? alt.savings_pct < 0
                ? `${alt.savings_pct}% Avg.`
                : `+${alt.savings_pct}% Avg.`
              : "Pending",
          sustainability: alt.sustainability || "AI Assessed",
          pros: alt.pros || ["AI Recommended"],
          cons: alt.cons || ["Requires validation"],
          suppliers: alt.supplier_types || ["Pending regional check"],
        }));

        // Sort by match score descending
        mappedResults.sort((a, b) => b.matchScore - a.matchScore);
        setResults(mappedResults);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Error fetching alternatives:", error);
      alert(
        "Could not connect to the Python backend. Is it running on port 5001?",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-sans selection:bg-indigo-500/30 pb-24">
      <Navigation />

      <div className="max-w-7xl mx-auto p-6 space-y-8 mt-4">
        <div className="stripe-gradient border border-slate-200/50 rounded-2xl p-8 stripe-card-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-[#0a2540] mb-2 flex items-center gap-2">
              <FaExchangeAlt className="text-indigo-600" /> Material
              Alternatives
            </h2>
            <p className="text-slate-500 mb-6 max-w-2xl text-sm leading-relaxed">
              Input a material you currently use to discover cost‑effective,
              sustainable, or higher‑performing alternatives and their
              suppliers.
            </p>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-colors shadow-inner">
                  <FaSearch className="absolute left-4 text-indigo-600 h-4 w-4" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                    placeholder="e.g., 'Virgin Polyurethane for footwear'..."
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-[#0a2540] outline-none placeholder:text-slate-500 font-medium"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || query.trim() === ""}
                className="px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 whitespace-nowrap min-w-[200px]"
              >
                {loading ? "Analyzing..." : "Find Alternatives"}
              </button>
            </div>
          </div>
        </div>

        {results && results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {results.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 hover:border-indigo-500/50 transition-all rounded-2xl p-6 stripe-card-shadow relative overflow-hidden group flex flex-col"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <h3 className="text-xl font-bold text-[#0a2540] max-w-[80%] leading-tight">
                    {item.material}
                  </h3>
                  <div className="bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-full flex flex-col items-center">
                    <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                      Match
                    </span>
                    <span className="text-lg font-bold text-indigo-600">
                      {item.matchScore}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
                      Cost Impact
                    </p>
                    <p
                      className={`font-semibold ${
                        item.costImpact.startsWith("-")
                          ? "text-emerald-400"
                          : item.costImpact.startsWith("+")
                            ? "text-rose-400"
                            : "text-slate-600"
                      }`}
                    >
                      {item.costImpact}
                    </p>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
                      Sustainability
                    </p>
                    <p className="font-semibold text-emerald-400">
                      {item.sustainability}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6 relative z-10 flex-grow">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-bold">
                      Pros
                    </p>
                    <ul className="space-y-1.5">
                      {item.pros.map((pro, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-slate-600"
                        >
                          <FaCheckCircle className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-bold">
                      Cons / Risks
                    </p>
                    <ul className="space-y-1.5">
                      {item.cons.map((con, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-slate-600"
                        >
                          <FaTimesCircle className="text-rose-500 h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-200 relative z-10">
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-bold flex items-center gap-2">
                    <BsShieldCheck className="text-indigo-600" /> Suggested
                    Suppliers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.suppliers.map((sup, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200"
                      >
                        {sup}
                      </span>
                    ))}
                  </div>
                  <button className="w-full mt-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                    Connect with Suppliers <FaArrowRight />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {results && results.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 stripe-card-shadow">
            <h3 className="text-xl font-bold text-[#0a2540] mb-2">
              No alternative materials found
            </h3>
            <p className="text-slate-500">
              Try searching for generic terms like "copper", "rice", or "steel".
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
