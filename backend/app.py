"""
app.py – Buildify Backend
Engines: FinBERT (sentiment/risk) + Gemini 2.5 Flash (alternatives + supplier finder)
"""

import os
import logging
import json
import torch
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from google import genai
from google.genai import types

from bs4 import BeautifulSoup
from gnews import GNews
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

# ================== SETUP ==================
load_dotenv()

genai_client = genai.Client()  # reads GEMINI_API_KEY from .env

os.environ["TOKENIZERS_PARALLELISM"] = "false"
logging.getLogger("transformers").setLevel(logging.ERROR)

device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Using device: {device}")

tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
sentiment_model = AutoModelForSequenceClassification.from_pretrained(
    "ProsusAI/finbert"
).to(device)
nlp_sentiment = pipeline(
    "sentiment-analysis", model=sentiment_model, tokenizer=tokenizer, device=device
)

app = Flask(__name__)
CORS(app)


# ================== HELPERS ==================
def build_query(commodity, region):
    keywords = [
        "supply chain",
        "shortage",
        "conflict",
        "export ban",
        "tariff",
        "disruption",
    ]
    joined = " OR ".join([f'"{kw}"' for kw in keywords])
    return f'"{commodity}" AND ({joined}) AND "{region}"'


def call_gemini(prompt: str) -> str:
    """Shared Gemini call with JSON response mode and low temperature."""
    response = genai_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.replace("```json", "").replace("```", "").strip()
    return raw


# ================== ROUTE: analyze-commodity ==================
@app.route("/api/analyze-commodity", methods=["POST"])
def analyze_commodity():
    """Analyzes geopolitical risk and sentiment for a commodity/region pair."""
    data = request.json
    commodity = data.get("commodity")
    region = data.get("region")

    if not commodity or not region:
        return jsonify({"error": "Missing commodity or region"}), 400

    gn = GNews(language="en", period="14d", max_results=20)
    articles = gn.get_news(build_query(commodity, region))

    if not articles:
        return jsonify({"message": "No relevant geopolitical news found."}), 404

    headlines = [a["title"] for a in articles]
    results = nlp_sentiment(headlines)

    weighted_neg, weighted_pos, total_conf, ignored = 0.0, 0.0, 0.0, 0
    for res in results:
        if res["score"] < 0.65:
            ignored += 1
            continue
        if res["label"] == "negative":
            weighted_neg += res["score"]
            total_conf += res["score"]
        elif res["label"] == "positive":
            weighted_pos += res["score"]
            total_conf += res["score"]

    buy_risk = (weighted_neg / total_conf * 100) if total_conf > 0 else 0
    sell_pressure = (weighted_pos / total_conf * 100) if total_conf > 0 else 0

    if buy_risk > 60:
        strategy = "Stockpile (Buy)"
        reason = "High supply chain risks detected. Recommend stockpiling to avoid future shortages."
    elif sell_pressure > 60:
        strategy = "Liquidate (Sell)"
        reason = "Favorable market conditions. Consider liquidating excess inventory."
    else:
        strategy = "Hold (Neutral)"
        reason = "Market conditions are stable. Maintain current inventory levels."

    return jsonify(
        {
            "metadata": {
                "commodity": commodity,
                "region": region,
                "signals_analyzed": len(headlines),
            },
            "risk_scores": {
                "buy_risk": f"{buy_risk:.1f}%",
                "sell_pressure": f"{sell_pressure:.1f}%",
            },
            "strategy": strategy,
            "strategy_reason": reason,
            "top_news": headlines[:3],
        }
    )


# ================== ROUTE: alternatives ==================
@app.route("/api/alternatives/<material>", methods=["GET"])
def get_alternatives(material):
    """Returns Gemini-generated alternative materials with savings, pros/cons, suppliers."""
    prompt = f"""
You are an industrial supply-chain expert. A client wants to replace "{material}".
Suggest 3-5 realistic alternative materials or grades.
Output ONLY a JSON array (no markdown, no backticks). Each object must contain:
- name: string (the alternative material)
- match_score: int 0-100 (how close a substitute it is)
- savings_pct: int (negative means cheaper, positive means more expensive)
- pros: list of 2-3 strings
- cons: list of 2-3 strings
- sustainability: string ("Better", "Similar", or "Worse")
- supplier_types: list of 2-3 strings (e.g. "Regional distributors", "Direct mills")
"""
    try:
        alternatives = json.loads(call_gemini(prompt))
        if not isinstance(alternatives, list):
            raise ValueError("Gemini output is not a JSON array")
        return jsonify({"material": material, "alternatives": alternatives})
    except json.JSONDecodeError as e:
        logging.exception("Gemini returned invalid JSON for alternatives")
        return jsonify({"error": f"Invalid JSON from AI: {e}"}), 500
    except Exception as e:
        logging.exception("Alternative generation failed")
        return jsonify({"error": f"AI generation error: {e}"}), 500


# ================== ROUTE: find-suppliers ==================
@app.route("/api/find-suppliers", methods=["POST"])
def find_suppliers():
    """
    Uses Gemini to find real raw material suppliers for a given material and locality.

    Request body (JSON):
        material  – str  e.g. "copper wire"
        locality  – str  e.g. "Mumbai"

    Response (JSON):
        material  – echoed back
        locality  – echoed back
        suppliers – list of supplier objects (see fields below)
    """
    data = request.json or {}
    material = (data.get("material") or "").strip()
    locality = (data.get("locality") or "").strip()

    if not material or not locality:
        return jsonify({"error": "Both 'material' and 'locality' are required."}), 400

    prompt = f"""
You are a B2B procurement research assistant.
Find 6 real raw material suppliers of "{material}" located in or near "{locality}".

Return ONLY a valid JSON array — no markdown fences, no explanation, no preamble.
Each object must have exactly these fields:

- name:        string  — real company name
- address:     string  — full street address including city, state/province, country
- lat:         number  — latitude accurate to 4 decimal places, matching the address
- lng:         number  — longitude accurate to 4 decimal places, matching the address
- phone:       string  — with country code (e.g. +91-22-12345678), or "" if unknown
- email:       string  — real or plausible contact email, or "" if unknown
- website:     string  — full URL with https://, or "" if unknown
- specialties: array   — 2 to 3 short strings describing materials or services offered

Use real, verifiable companies wherever possible.
Ensure lat/lng coordinates accurately match each company's address.
Return exactly 6 entries.
""".strip()

    try:
        raw = call_gemini(prompt)
        suppliers_raw = json.loads(raw)

        if not isinstance(suppliers_raw, list) or len(suppliers_raw) == 0:
            return (
                jsonify(
                    {"error": "Gemini returned an empty or invalid supplier list."}
                ),
                502,
            )

        # Sanitize and normalize each entry
        suppliers = []
        for i, s in enumerate(suppliers_raw):
            suppliers.append(
                {
                    "id": i + 1,
                    "name": str(s.get("name", "Unknown Supplier")),
                    "address": str(s.get("address", "")),
                    "lat": float(s.get("lat", 0)),
                    "lng": float(s.get("lng", 0)),
                    "phone": str(s.get("phone", "")),
                    "email": str(s.get("email", "")),
                    "website": str(s.get("website", "")),
                    "specialties": [str(t) for t in s.get("specialties", [])],
                }
            )

        return jsonify(
            {"material": material, "locality": locality, "suppliers": suppliers}
        )

    except json.JSONDecodeError as e:
        logging.exception("Gemini returned malformed JSON for find-suppliers")
        return (
            jsonify({"error": "Gemini returned malformed JSON.", "detail": str(e)}),
            502,
        )
    except Exception as e:
        logging.exception("find-suppliers route failed")
        return jsonify({"error": "Internal server error.", "detail": str(e)}), 500


# ================== RUN ==================
if __name__ == "__main__":
    app.run(port=5001, debug=True, threaded=False)
