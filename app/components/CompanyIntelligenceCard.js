"use client";

import {
  FaMapMarkerAlt,
  FaBuilding,
  FaTag,
  FaLayerGroup,
  FaChevronRight,
  FaLeaf,
  FaAward,
} from "react-icons/fa";
import { BsStars } from "react-icons/bs";
import { FaRegSquare, FaCheckSquare } from "react-icons/fa";
import { deriveStrengths, getYearsInBusiness } from "@/lib/companyIntelligence";

export default function CompanyIntelligenceCard({
  company: s,
  onViewDetails,
  onCompare,
  isCompareSelected = false,
  compact = false,
  showFooter = true,
}) {
  const headings = s.headings?.length > 0 ? s.headings : s.categories || [];
  const topCategories = headings.slice(0, 4);
  const brands = (s.brands || []).slice(0, 5);
  const tags = (s.tags || []).slice(0, 10);
  const strengths = deriveStrengths(s, s.fitBreakdown);
  const years = getYearsInBusiness(s.yearFounded);
  const score = s.fitScore ?? s.matchScore ?? 0;

  const locationLabel =
    [s.addressCity, s.addressCountry].filter(Boolean).join(", ") || s.address;

  return (
    <div className="flex flex-col h-full">
      <div className={`flex-1 flex flex-col ${compact ? "p-5" : "p-6"}`}>
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`shrink-0 bg-white rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner ${compact ? "h-11 w-11 p-1" : "h-12 w-12 p-1"}`}
            >
              {s.logoUrl ? (
                <img
                  src={s.logoUrl}
                  alt=""
                  className="object-contain w-full h-full"
                />
              ) : (
                <FaBuilding className="text-slate-600 h-6 w-6" />
              )}
            </div>
            <div className="min-w-0">
              <h3
                className={`font-bold text-[#0a2540] leading-tight group-hover:text-indigo-600 transition-colors ${compact ? "text-base line-clamp-2" : "text-lg line-clamp-2"}`}
              >
                {s.name}
              </h3>

              {locationLabel && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <FaMapMarkerAlt className="h-3 w-3 shrink-0 text-slate-500" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              )}

              {/* 🔥 NEW: Dedicated Compliance Badges */}
              {(s.isEsg || s.isIso) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {s.isEsg && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                      <FaLeaf className="h-2 w-2" /> ESG
                    </span>
                  )}
                  {s.isIso && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-[9px] font-bold uppercase tracking-wider text-blue-400">
                      <FaAward className="h-2 w-2" /> ISO
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <div className="bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <BsStars className="h-3 w-3 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-600">{score}</span>
            </div>
            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, score)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50/40 border border-slate-200/80 p-3 mb-3 mt-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Key insights
          </p>
          <ul className="space-y-1.5 text-xs text-slate-600">
            <li className="flex justify-between gap-2">
              <span className="text-slate-500">Years in business</span>
              <span className="font-medium text-slate-200 text-right">
                {years != null ? `~${years} yrs` : "—"}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-slate-500">Company size</span>
              <span className="font-medium text-slate-200 text-right truncate">
                {s.employeeString || "N/A"}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-slate-500">Revenue</span>
              <span
                className="font-medium text-slate-200 text-right truncate max-w-[55%]"
                title={s.annualSales}
              >
                {s.annualSales || "—"}
              </span>
            </li>
            {topCategories.length > 0 && (
              <li className="pt-1 border-t border-slate-200/80">
                <span className="text-slate-500 block mb-1">
                  Top categories
                </span>
                <div className="flex flex-wrap gap-1">
                  {topCategories.map((c, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </li>
            )}
          </ul>
        </div>

        {tags.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <FaTag className="h-2.5 w-2.5" /> Tags
            </p>
            <div className="flex flex-wrap gap-1">
              {tags.map((t, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-200 text-[10px] rounded-md"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {brands.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <FaLayerGroup className="h-2.5 w-2.5" /> Brands
            </p>
            <div className="flex flex-wrap gap-1">
              {brands.map((b, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] rounded-md"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {strengths.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1 mt-auto">
            {strengths.map((line, i) => (
              <span
                key={i}
                className="text-[10px] font-medium text-emerald-400/95 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
              >
                ✔ {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {showFooter && (
        <div className="mt-auto border-t border-slate-200 flex items-stretch rounded-b-2xl overflow-hidden bg-slate-100/30">
          {onCompare && (
            <button
              type="button"
              onClick={onCompare}
              className={`flex-1 flex items-center justify-center gap-2 p-3 text-xs font-bold transition-colors border-r border-slate-200 ${isCompareSelected ? "bg-indigo-600/20 text-indigo-600" : "text-slate-500 hover:bg-slate-100 hover:text-[#0a2540]"}`}
            >
              {isCompareSelected ? (
                <FaCheckSquare className="h-3.5 w-3.5" />
              ) : (
                <FaRegSquare className="h-3.5 w-3.5" />
              )}
              {isCompareSelected ? "Selected" : "Compare"}
            </button>
          )}
          <button
            type="button"
            onClick={onViewDetails}
            className="flex-1 p-3 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-600 hover:bg-slate-100/80 transition-colors"
          >
            View Details
            <FaChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
