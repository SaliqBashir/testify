"use client";

import { useState, useCallback, useEffect } from "react";
import { FaTimes, FaCopy, FaSyncAlt, FaEnvelope } from "react-icons/fa";
import { BsStars } from "react-icons/bs";
import { generateOutreachEmail } from "@/lib/outreachEmail";

export default function ContactSupplierModal({ company, open, onClose }) {
  const [product, setProduct] = useState("");
  const [intent, setIntent] = useState("quote");
  const [variation, setVariation] = useState(0);
  const [copied, setCopied] = useState(false);

  // New AI States
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState("");

  const specialization =
    company?.primaryHeading ||
    company?.headings?.[0] ||
    company?.categories?.[0] ||
    "industrial supply";

  // If we have an AI draft, show it. Otherwise, use your fallback template.
  const emailBody =
    aiDraft ||
    (company
      ? generateOutreachEmail({
          companyName: company.name,
          specialization,
          product,
          intentKey: intent,
          variation,
        })
      : "");

  // Reset the AI draft if the user changes the modal, product, or intent
  useEffect(() => {
    setAiDraft("");
  }, [company?.id, product, intent]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(emailBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [emailBody]);

  // THIS is where the async fetch lives safely!
  const handleGenerateAIEmail = async () => {
    if (!company) return;
    setIsGenerating(true);

    try {
      const prompt = `
        Write a professional B2B outreach email to "${company.name}".

        Context:
        - Specialties: ${company.categories?.join(", ")}
        - Description: ${company.description || "An industrial supplier."}
        - Goal: ${intent === "quote" ? "Request a formal quote with pricing, MOQs, and lead times." : intent === "catalog" ? "Request a product catalog and technical specs." : "General inquiry about manufacturing capabilities."}
        - Specific Need: ${product || "an upcoming sourcing initiative"}

        RULES - READ CAREFULLY:
        1. Do not include any internal thoughts, self-corrections, or meta-commentary.
        2. Write exactly 3 to 4 well-developed and concise paragraphs.
        3. Paragraph 1: Professional introduction stating the purpose of the email based on the Goal.
        4. Paragraph 2: Explicitly mention their specific capabilities to prove we researched them. Explain how their expertise aligns with our Specific Need.
        5. Paragraph 3: Clear call to action detailing exactly what we need from them next.
        6. End the email EXACTLY with the phrase "Best regards,". Do not add a signature block, name, or any placeholders after those words.
      `;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const data = await response.json();
      // Clean up any rogue markdown formatting Gemini might sneak in
      const cleanText = data.text
        .replace(/^```[\s\S]*?\n/g, "")
        .replace(/```$/g, "")
        .trim();
      setAiDraft(cleanText);
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert("AI failed to generate. Using standard template.");
    } finally {
      setIsGenerating(false);
    }
  };
  if (!open || !company) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-50 border border-slate-200 rounded-2xl stripe-card-shadow w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 bg-white">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#0a2540] flex items-center gap-2">
              <FaEnvelope className="text-indigo-600 shrink-0" />
              Contact supplier
            </h2>
            <p className="text-sm text-slate-500 mt-1 truncate">
              {company.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-[#0a2540] p-2 rounded-lg hover:bg-slate-100"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Product or need
            </label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. stainless ball valves, 2-inch, Class 300"
              className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-[#0a2540] placeholder:text-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Intent
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                ["quote", "Request quote"],
                ["catalog", "Request catalog"],
                ["general", "General inquiry"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setIntent(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    intent === key
                      ? "bg-indigo-600 border-indigo-500 text-[#0a2540]"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Draft email
              </span>
              <div className="flex items-center gap-3">
                {/* AI MAGIC BUTTON */}
                <button
                  onClick={handleGenerateAIEmail}
                  disabled={isGenerating}
                  className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 hover:from-indigo-300 hover:to-purple-300 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <div className="h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <BsStars className="text-indigo-600 h-3 w-3" />
                  )}
                  {isGenerating ? "Writing..." : "Draft with AI"}
                </button>

                <span className="text-slate-700">|</span>

                <button
                  onClick={() => {
                    setAiDraft(""); // Clear AI draft so it falls back to template
                    setVariation((v) => v + 1);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-[#0a2540] flex items-center gap-1.5"
                >
                  <FaSyncAlt className="h-3 w-3" />
                  Reset to Template
                </button>
              </div>
            </div>

            <textarea
              readOnly={!aiDraft} // Let them edit the AI draft if they want!
              value={emailBody}
              onChange={(e) => setAiDraft(e.target.value)}
              rows={14}
              className={`w-full px-3 py-2.5 bg-slate-950/80 border rounded-xl text-xs text-slate-600 leading-relaxed font-mono resize-y min-h-[200px] outline-none ${aiDraft ? "border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "border-slate-200"}`}
            />
          </div>

          <button
            onClick={copy}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-indigo-50 transition-colors"
          >
            <FaCopy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
