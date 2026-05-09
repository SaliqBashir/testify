"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  FaSearch,
  FaMapMarkerAlt,
  FaGlobe,
  FaBuilding,
  FaFilter,
  FaAward,
  FaTimes,
  FaCheckSquare,
  FaRegSquare,
  FaArrowLeft,
  FaEnvelope,
  FaPhone,
  FaIndustry,
  FaTh,
  FaMapMarkedAlt,
} from "react-icons/fa";
import { FaScaleBalanced } from "react-icons/fa6";
import { BsStars, BsBoxSeam } from "react-icons/bs";
import CompanyIntelligenceCard from "@/app/components/CompanyIntelligenceCard";
import ContactSupplierModal from "@/app/components/ContactSupplierModal";
import Navigation from "@/app/components/Navigation";
import {
  findSimilarCompanies,
  deriveStrengths,
} from "@/lib/companyIntelligence";
import { matchesRevenueBand } from "@/lib/companyMetrics";

const FLASK_BASE = process.env.NEXT_PUBLIC_FLASK_URL || "http://localhost:5001";

const SupplierMapView = dynamic(
  () => import("@/app/components/SupplierMapView"),
  { ssr: false, loading: () => <MapViewLoading /> },
);

function MapViewLoading() {
  return (
    <div className="w-full h-[min(70vh,520px)] min-h-[360px] rounded-2xl border border-slate-200 bg-slate-50/40 flex items-center justify-center text-slate-500 text-sm">
      Loading map…
    </div>
  );
}

/**
 * Converts a raw Gemini supplier object (from Flask /api/find-suppliers)
 * into the shape expected by CompanyIntelligenceCard and SupplierMapView.
 */
function normalizeGeminiSupplier(s, index) {
  return {
    id: `gemini-${s.id ?? index}`,
    name: s.name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    phone: s.phone || "Not listed",
    email: s.email || "Not listed",
    website: s.website || "#",
    categories: s.specialties ?? [],
    products: s.specialties ?? [],
    certifications: [],
    tags: s.specialties ?? [],
    brands: [],
    annualSales: "Not disclosed",
    employeeString: "Not listed",
    employees: 0,
    yearFounded: "N/A",
    yearsActive: null,
    isEsg: false,
    isIso: false,
    logoUrl: null,
    description: `${s.name} is a supplier specialising in ${(s.specialties ?? []).join(", ")} located at ${s.address}.`,
    fitScore: Math.max(50, 90 - index * 6),
    fitBreakdown: {
      aiSemantic: Math.max(50, 90 - index * 6),
      experience: 30,
      size: 20,
      brands: 15,
    },
  };
}

export default function SupplyChainIntelligence() {
  const [mounted, setMounted] = useState(false);
  const [material, setMaterial] = useState("");
  const [locality, setLocality] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters
  const [locationFilter, setLocationFilter] = useState("");
  const [minEmployees, setMinEmployees] = useState("");
  const [maxEmployees, setMaxEmployees] = useState("");
  const [esgCertified, setEsgCertified] = useState(false);
  const [isoCertified, setIsoCertified] = useState(false);
  const [revenueFilter, setRevenueFilter] = useState("any");
  const [minYearsActive, setMinYearsActive] = useState("");

  // Comparison & view state
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [compareModalTab, setCompareModalTab] = useState("scores");
  const [resultsView, setResultsView] = useState("grid");

  // Profile navigation
  const [activeSupplierProfile, setActiveSupplierProfile] = useState(null);
  const [savedScrollPos, setSavedScrollPos] = useState(0);

  // Contact modal
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactModalCompany, setContactModalCompany] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Profile routing ──────────────────────────────────────────────────────────
  const handleOpenProfile = (supplier) => {
    if (!activeSupplierProfile) setSavedScrollPos(window.scrollY);
    setActiveSupplierProfile(supplier);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleCloseProfile = () => {
    setActiveSupplierProfile(null);
    setTimeout(
      () => window.scrollTo({ top: savedScrollPos, behavior: "instant" }),
      10,
    );
  };

  // ── Fetch from Flask ─────────────────────────────────────────────────────────
  const fetchSuppliers = async () => {
    if (!material.trim() || !locality.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setErrorMsg("");
    setSuppliers([]);
    setSelectedForCompare([]);
    setActiveSupplierProfile(null);
    setResultsView("grid");

    try {
      const res = await fetch(`${FLASK_BASE}/api/find-suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material: material.trim(),
          locality: locality.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error ?? "Something went wrong.");
        return;
      }

      const normalized = (json.suppliers ?? []).map((s, i) =>
        normalizeGeminiSupplier(s, i),
      );

      setSuppliers(normalized);
    } catch (err) {
      console.error("find-suppliers fetch failed:", err);
      setErrorMsg(
        "Could not reach the backend. Is Flask running on port 5001?",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchSuppliers();
  };

  // ── Filters ──────────────────────────────────────────────────────────────────
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (esgCertified && !s.isEsg) return false;
      if (isoCertified && !s.isIso) return false;
      if (
        locationFilter &&
        !s.address.toLowerCase().includes(locationFilter.toLowerCase())
      )
        return false;
      if (minEmployees && s.employees < parseInt(minEmployees, 10))
        return false;
      if (maxEmployees && s.employees > parseInt(maxEmployees, 10))
        return false;
      if (!matchesRevenueBand(s, revenueFilter)) return false;
      if (minYearsActive) {
        const minY = parseInt(minYearsActive, 10);
        if (s.yearsActive == null || isNaN(minY) || s.yearsActive < minY)
          return false;
      }
      return true;
    });
  }, [
    suppliers,
    esgCertified,
    isoCertified,
    locationFilter,
    minEmployees,
    maxEmployees,
    revenueFilter,
    minYearsActive,
  ]);

  const similarSuppliers = useMemo(() => {
    if (!activeSupplierProfile) return [];
    return findSimilarCompanies(activeSupplierProfile, suppliers, 5);
  }, [activeSupplierProfile, suppliers]);

  const toggleCompare = (supplier, e) => {
    e.stopPropagation();
    if (selectedForCompare.find((s) => s.id === supplier.id)) {
      setSelectedForCompare(
        selectedForCompare.filter((s) => s.id !== supplier.id),
      );
    } else if (selectedForCompare.length < 3) {
      setSelectedForCompare([...selectedForCompare, supplier]);
    }
  };

  // ── Supplier profile view ────────────────────────────────────────────────────
  if (activeSupplierProfile) {
    const s = activeSupplierProfile;
    const profileStrengths = deriveStrengths(s, s.fitBreakdown);

    return (
      <div className="min-h-screen bg-slate-50 text-slate-600 font-sans selection:bg-indigo-500/30">
        <nav className="border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-md p-4 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={handleCloseProfile}
              className="flex items-center gap-2 text-slate-500 hover:text-[#0a2540] transition-colors font-medium bg-slate-100/50 hover:bg-slate-100 px-4 py-2 rounded-lg"
            >
              <FaArrowLeft /> Back to Search
            </button>
            <h1 className="text-xl font-bold text-[#0a2540] tracking-tight">
              Import<span className="text-indigo-600 font-medium">.me</span>
            </h1>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto p-6 space-y-8 mt-4 pb-24">
          {/* Header card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 stripe-card-shadow relative overflow-hidden flex flex-col md:flex-row gap-8 items-start">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="h-32 w-32 shrink-0 bg-white rounded-2xl flex items-center justify-center border border-slate-600 overflow-hidden shadow-inner p-2 relative z-10">
              {s.logoUrl ? (
                <img
                  src={s.logoUrl}
                  alt="logo"
                  className="object-contain w-full h-full"
                />
              ) : (
                <FaBuilding className="text-slate-600 h-16 w-16" />
              )}
            </div>

            <div className="flex-1 relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-[#0a2540]">{s.name}</h1>
                <div className="flex flex-col items-end gap-1">
                  <div className="bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <BsStars className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-bold text-indigo-600">
                      Fit score: {s.fitScore ?? 0}
                    </span>
                  </div>
                  <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                      style={{ width: `${Math.min(100, s.fitScore ?? 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
                <span className="flex items-center gap-1.5">
                  <FaMapMarkerAlt className="text-slate-500" /> {s.address}
                </span>
                {s.website && s.website !== "#" && (
                  <span className="flex items-center gap-1.5">
                    <FaGlobe className="text-slate-500" />
                    <a
                      href={s.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {s.website}
                    </a>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {s.categories.map((cat, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-600 flex items-center gap-1.5"
                  >
                    <FaIndustry className="text-slate-500 h-3 w-3" /> {cat}
                  </span>
                ))}
              </div>

              {profileStrengths.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profileStrengths.map((line, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium text-emerald-400/95 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full"
                    >
                      ✔ {line}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto relative z-10">
              <button
                onClick={(e) => toggleCompare(s, e)}
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border ${
                  selectedForCompare.some((c) => c.id === s.id)
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-600"
                    : "bg-slate-100 border-slate-200 text-[#0a2540] hover:bg-slate-700"
                }`}
              >
                {selectedForCompare.some((c) => c.id === s.id) ? (
                  <>
                    <FaCheckSquare /> In Compare
                  </>
                ) : (
                  <>
                    <FaRegSquare /> Add to Compare
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setContactModalCompany(s);
                  setIsContactModalOpen(true);
                }}
                className="px-6 py-3 bg-white text-slate-900 hover:bg-indigo-50 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <FaEnvelope className="text-indigo-600" /> Request Quote
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left column */}
            <div className="md:col-span-2 space-y-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 stripe-card-shadow">
                <h2 className="text-lg font-bold text-[#0a2540] mb-4 border-b border-slate-200 pb-2">
                  Company overview
                </h2>
                <p className="text-slate-500 leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 stripe-card-shadow">
                <h2 className="text-lg font-bold text-[#0a2540] mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <BsBoxSeam className="text-indigo-600" /> Product capabilities
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {s.products.length > 0 ? (
                    s.products.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-lg"
                      >
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        <span className="text-sm text-slate-600">{p}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic text-sm">
                      No specific products listed.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 stripe-card-shadow space-y-4">
                <h2 className="text-sm font-bold text-[#0a2540] border-b border-slate-200 pb-2">
                  Contact details
                </h2>
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-slate-100 p-2 rounded flex items-center justify-center">
                    <FaPhone className="text-slate-500" />
                  </div>
                  <span className="text-slate-600">{s.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-slate-100 p-2 rounded flex items-center justify-center">
                    <FaEnvelope className="text-slate-500" />
                  </div>
                  {s.email !== "Not listed" ? (
                    <a
                      href={`mailto:${s.email}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {s.email}
                    </a>
                  ) : (
                    <span className="text-slate-500">{s.email}</span>
                  )}
                </div>
                {s.website && s.website !== "#" && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-slate-100 p-2 rounded flex items-center justify-center">
                      <FaGlobe className="text-slate-500" />
                    </div>
                    <a
                      href={s.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline truncate"
                    >
                      {s.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>

              {s.fitBreakdown && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 stripe-card-shadow space-y-3">
                  <h2 className="text-sm font-bold text-[#0a2540] border-b border-slate-200 pb-2">
                    Fit score breakdown
                  </h2>
                  {[
                    ["aiSemantic", "AI semantic match", 100],
                    ["experience", "Experience", 40],
                    ["size", "Company size", 30],
                    ["brands", "Brands", 30],
                  ].map(([key, label, max]) => {
                    const val = s.fitBreakdown[key] ?? 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span
                            className={
                              key === "aiSemantic"
                                ? "text-indigo-600 font-bold"
                                : "text-slate-500"
                            }
                          >
                            {label}
                          </span>
                          <span
                            className={
                              key === "aiSemantic"
                                ? "text-[#0a2540] font-bold"
                                : "text-indigo-600 font-semibold"
                            }
                          >
                            {val}
                          </span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${key === "aiSemantic" ? "bg-gradient-to-r from-indigo-500 to-purple-500" : "bg-indigo-500/80"}`}
                            style={{
                              width: `${Math.min(100, (val / max) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-2xl p-6 stripe-card-shadow">
                <h2 className="text-sm font-bold text-[#0a2540] border-b border-slate-200 pb-2 mb-4">
                  Compliance & certifications
                </h2>
                {s.certifications.length > 0 ? (
                  s.certifications.map((cert, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 rounded border border-slate-200 mb-2"
                    >
                      <FaAward className="text-yellow-500 h-4 w-4 shrink-0" />
                      <span className="text-sm text-slate-600 font-medium">
                        {cert}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500 text-sm">
                    No certifications found.
                  </span>
                )}
              </div>
            </div>
          </div>

          {similarSuppliers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 stripe-card-shadow">
              <h2 className="text-lg font-bold text-[#0a2540] mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                <BsStars className="text-indigo-600" /> Similar suppliers
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {similarSuppliers.map(({ company: c, similarityScore }) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleOpenProfile(c)}
                    className="text-left p-4 rounded-xl bg-slate-50/50 border border-slate-200 hover:border-indigo-500/40 transition-colors"
                  >
                    <div className="font-semibold text-[#0a2540]">{c.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Similarity score: {similarityScore}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <ContactSupplierModal
          company={contactModalCompany}
          open={isContactModalOpen}
          onClose={() => {
            setIsContactModalOpen(false);
            setContactModalCompany(null);
          }}
        />
      </div>
    );
  }

  // ── Main search view ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-sans selection:bg-indigo-500/30 pb-24">
      <Navigation />

      <div className="max-w-7xl mx-auto p-6 space-y-8 mt-4">
        {/* Search panel */}
        <div className="stripe-gradient border border-slate-200/50 rounded-2xl p-8 stripe-card-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-[#0a2540] mb-2 flex items-center gap-2">
              <BsStars className="text-indigo-600" /> Raw Material Sourcing
              Engine
            </h2>
            <p className="text-slate-500 mb-6 max-w-2xl text-sm leading-relaxed">
              Enter a raw material and a locality. Gemini AI will find real
              suppliers near that location with contact details and map pins.
            </p>

            {/* Two-field search: material + locality */}
            <div className="flex flex-col md:flex-row gap-3 mb-3">
              <div className="flex-1 relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 blur opacity-25 group-hover:opacity-40 transition-opacity" />
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-colors shadow-inner">
                  <FaSearch className="absolute left-4 text-indigo-600 h-4 w-4" />
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    placeholder="Raw material (e.g. copper wire, raw cotton…)"
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-[#0a2540] outline-none placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div className="flex-1 relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 blur opacity-20 group-hover:opacity-35 transition-opacity" />
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-colors shadow-inner">
                  <FaMapMarkerAlt className="absolute left-4 text-indigo-600 h-4 w-4" />
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    placeholder="Locality (e.g. Mumbai, Surat, Chennai…)"
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-[#0a2540] outline-none placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <button
                onClick={fetchSuppliers}
                disabled={
                  !mounted || loading || !material.trim() || !locality.trim()
                }
                className="px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 whitespace-nowrap min-w-[180px]"
              >
                {loading ? "Searching…" : "Find Suppliers"}
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* Filter bar */}
        {hasSearched && !loading && suppliers.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-slate-100/30 rounded-xl border border-slate-200/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <FaFilter className="h-3.5 w-3.5 text-indigo-600" /> Refine
                results
              </div>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setResultsView("grid")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${resultsView === "grid" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:text-[#0a2540]"}`}
                >
                  <FaTh className="h-3.5 w-3.5" /> Grid
                </button>
                <button
                  type="button"
                  onClick={() => setResultsView("map")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors border-l border-slate-200 ${resultsView === "map" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:text-[#0a2540]"}`}
                >
                  <FaMapMarkedAlt className="h-3.5 w-3.5" /> Map
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4 bg-slate-100/20 rounded-xl border border-slate-200/40">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3 w-3" />
                  <input
                    type="text"
                    placeholder="Filter by location"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 text-[#0a2540] w-40"
                  />
                </div>
                <select
                  value={revenueFilter}
                  onChange={(e) => setRevenueFilter(e.target.value)}
                  className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 text-[#0a2540]"
                >
                  <option value="any">Any revenue</option>
                  <option value="under10">Under ~$10M</option>
                  <option value="10to50">~$10M – $50M</option>
                  <option value="50to100">~$50M – $100M</option>
                  <option value="over100">$100M+</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Supplier data is AI-generated by Gemini. Map pins use lat/lng
                returned by the model — verify addresses before contacting.
              </p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-slate-100/20 border border-slate-200 rounded-2xl p-6 h-80 animate-pulse flex flex-col"
              >
                <div className="flex gap-4 mb-4">
                  <div className="h-12 w-12 bg-slate-700/50 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
                    <div className="h-3 w-1/2 bg-slate-700/50 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-700/50 rounded" />
                  <div className="h-3 w-4/5 bg-slate-700/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map view */}
        {!loading && filteredSuppliers.length > 0 && resultsView === "map" && (
          <SupplierMapView
            suppliers={filteredSuppliers}
            onSelectCompany={handleOpenProfile}
          />
        )}

        {/* Grid view */}
        {!loading && filteredSuppliers.length > 0 && resultsView === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((s) => {
              const isSelected = selectedForCompare.some((c) => c.id === s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => handleOpenProfile(s)}
                  className={`group bg-white rounded-2xl border transition-all stripe-card-shadow flex flex-col relative cursor-pointer hover:-translate-y-1 overflow-hidden ${isSelected ? "border-indigo-500 shadow-indigo-500/10" : "border-slate-200 hover:border-slate-600"}`}
                >
                  <CompanyIntelligenceCard
                    company={s}
                    compact
                    onViewDetails={(e) => {
                      e.stopPropagation();
                      handleOpenProfile(s);
                    }}
                    onCompare={(e) => toggleCompare(s, e)}
                    isCompareSelected={isSelected}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {hasSearched &&
          !loading &&
          filteredSuppliers.length === 0 &&
          !errorMsg && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <FaBuilding className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No suppliers found</p>
              <p className="text-sm mt-1">
                Try a different material or locality.
              </p>
            </div>
          )}
      </div>

      {/* Compare tray */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-50 border border-slate-200 stripe-card-shadow shadow-black/50 rounded-2xl p-4 flex items-center gap-6 z-40">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Compare
            </span>
            <span className="text-[#0a2540] font-medium">
              {selectedForCompare.length} / 3
            </span>
          </div>

          <div className="flex gap-2">
            {selectedForCompare.map((s) => (
              <div
                key={s.id}
                className="h-10 w-10 bg-white rounded-lg flex items-center justify-center border border-slate-600 overflow-hidden relative group"
              >
                {s.logoUrl ? (
                  <img src={s.logoUrl} className="object-contain p-1" />
                ) : (
                  <FaBuilding className="text-slate-600" />
                )}
                <button
                  onClick={(e) => toggleCompare(s, e)}
                  className="absolute inset-0 bg-red-500/80 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex cursor-pointer"
                >
                  <FaTimes className="text-white h-3 w-3" />
                </button>
              </div>
            ))}
            {[...Array(3 - selectedForCompare.length)].map((_, i) => (
              <div
                key={`empty-${i}`}
                className="h-10 w-10 border border-dashed border-slate-600 rounded-lg bg-slate-100/50"
              />
            ))}
          </div>

          <button
            disabled={selectedForCompare.length < 2}
            onClick={() => {
              setCompareModalTab("scores");
              setShowMatrixModal(true);
            }}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 text-white font-bold rounded-xl transition-all flex items-center gap-2"
          >
            <FaScaleBalanced className="h-4 w-4" /> Compare
          </button>
        </div>
      )}

      {/* Compare modal */}
      {showMatrixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl stripe-card-shadow w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white">
              <h2 className="text-xl font-bold text-[#0a2540] flex items-center gap-2">
                <BsStars className="text-indigo-600" /> Compare suppliers
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCompareModalTab("scores")}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${compareModalTab === "scores" ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500"}`}
                  >
                    Fit scores
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareModalTab("matrix")}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-slate-200 ${compareModalTab === "matrix" ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500"}`}
                  >
                    Company details
                  </button>
                </div>
                <button
                  onClick={() => setShowMatrixModal(false)}
                  className="text-slate-500 hover:text-[#0a2540] transition-colors p-1"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
            </div>

            {compareModalTab === "scores" && (
              <div className="overflow-auto p-4 sm:p-6">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="p-3 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          Metric
                        </th>
                        {selectedForCompare.map((s) => (
                          <th
                            key={s.id}
                            className="p-3 text-[#0a2540] font-semibold"
                          >
                            {s.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-3 text-slate-500 font-medium">
                          Total fit score
                        </td>
                        {selectedForCompare.map((s) => (
                          <td key={s.id} className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold text-indigo-600">
                                {s.fitScore ?? "—"}
                              </span>
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                                  style={{
                                    width: `${Math.min(100, s.fitScore ?? 0)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                      {[
                        ["aiSemantic", "AI semantic match", 100],
                        ["experience", "Experience", 40],
                        ["size", "Company size", 30],
                        ["brands", "Brands", 30],
                      ].map(([key, label, max]) => (
                        <tr key={key}>
                          <td className="p-3 text-slate-500">
                            {label}{" "}
                            <span className="text-slate-400">(max {max})</span>
                          </td>
                          {selectedForCompare.map((s) => {
                            const v = s.fitBreakdown?.[key] ?? 0;
                            return (
                              <td key={s.id} className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className="tabular-nums font-medium text-slate-700">
                                    {v}
                                  </span>
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                                    <div
                                      className={`h-full rounded-full ${key === "aiSemantic" ? "bg-gradient-to-r from-indigo-500 to-purple-500" : "bg-slate-400"}`}
                                      style={{
                                        width: `${Math.min(100, (v / max) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {compareModalTab === "matrix" && (
              <div className="overflow-auto p-0">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="p-6 border-b border-slate-200 bg-slate-50/50 w-48 sticky left-0 z-10 backdrop-blur-md">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                          Features
                        </span>
                      </th>
                      {selectedForCompare.map((s) => (
                        <th
                          key={s.id}
                          className="p-6 border-b border-slate-200 bg-slate-50/50 align-top w-72"
                        >
                          <div className="flex flex-col items-start gap-4">
                            <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden p-1 shrink-0">
                              {s.logoUrl ? (
                                <img
                                  src={s.logoUrl}
                                  className="object-contain w-full h-full"
                                />
                              ) : (
                                <FaBuilding className="text-slate-600 h-8 w-8" />
                              )}
                            </div>
                            <h3 className="font-bold text-[#0a2540] text-lg line-clamp-2">
                              {s.name}
                            </h3>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      [
                        "Specialties",
                        (s) =>
                          s.categories.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded mr-1 mb-1 inline-block"
                            >
                              {c}
                            </span>
                          )),
                      ],
                      [
                        "Address",
                        (s) => (
                          <span className="text-slate-600">{s.address}</span>
                        ),
                      ],
                      [
                        "Phone",
                        (s) => (
                          <span className="text-slate-600">{s.phone}</span>
                        ),
                      ],
                      [
                        "Email",
                        (s) =>
                          s.email !== "Not listed" ? (
                            <a
                              href={`mailto:${s.email}`}
                              className="text-indigo-600 hover:underline"
                            >
                              {s.email}
                            </a>
                          ) : (
                            <span className="text-slate-400">Not listed</span>
                          ),
                      ],
                      [
                        "Website",
                        (s) =>
                          s.website && s.website !== "#" ? (
                            <a
                              href={s.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              {s.website.replace(/^https?:\/\//, "")}
                            </a>
                          ) : (
                            <span className="text-slate-400">Not listed</span>
                          ),
                      ],
                    ].map(([label, render]) => (
                      <tr
                        key={label}
                        className="hover:bg-slate-100/20 transition-colors"
                      >
                        <td className="p-4 border-r border-slate-200/50 font-medium text-slate-500 text-sm sticky left-0 bg-slate-50 z-10 align-top pt-5">
                          {label}
                        </td>
                        {selectedForCompare.map((s) => (
                          <td
                            key={s.id}
                            className="p-4 text-sm border-r border-slate-200/50 last:border-0 align-top"
                          >
                            {render(s)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
