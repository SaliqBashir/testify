# 🏭 import-me: Industrial Sourcing Engine

An AI-powered B2B platform designed to revolutionize how businesses find raw material 
suppliers and manufacturers. By combining automated web data extraction with advanced 
Large Language Model processing, this engine delivers highly relevant, scored, and 
comparable supplier results based on complex natural language requirements.

---

## ✨ Core Features

* **🧠 Intelligent Sourcing:** Describe your exact requirements in plain English 
  (e.g., materials, compliance standards, volume capacity, and geographical location).
* **🕷️ Automated Data Gathering:** Integrates with **Apify Actors** to scrape real-time 
  supplier data from across the web, ensuring up-to-date databases.
* **🤖 AI-Driven Processing:** Utilizes **Google Gemini** to process raw scraped data, 
  clean it, and extract meaningful insights.
* **📊 Smart Match Scoring:** Gemini evaluates supplier capabilities against your 
  specific query, generating a "Best Match Score" for quick decision-making.
* **📇 Contact Extraction:** Automatically identifies and extracts crucial B2B contact 
  information, including email addresses, phone numbers, and key personnel.
* **⚖️ Supplier Comparison & Filtering:** Side-by-side comparison of vendors with 
  advanced filtering options based on match scores, compliance, and capabilities.

---

## 🛠️ Technology Stack

* **Frontend:** React / Next.js (Styled with Tailwind CSS)
* **Data Scraping & Extraction:** Apify Platform (Custom Actors)
* **AI & Natural Language Processing:** Google Gemini API
* **Icons:** `react-icons`

---

## ⚙️ How It Works (The Pipeline)

1. User Input:
   The user enters a detailed query: "Looking for ISO 9001 certified aluminum 
   extrusion manufacturers in Southeast Asia capable of 50 tons/month."

2. Query Interpretation & Scraping (Apify):
   The system triggers an Apify actor to crawl industry directories, manufacturer 
   websites, and B2B portals for relevant raw data.

3. Data Processing (Gemini):
   The raw data from Apify is fed into Gemini. Gemini extracts 
   the structured data (company name, materials, compliance, contact info).

4. Scoring & Ranking:
   Gemini evaluates the extracted data against the user's original criteria, 
   assigning a match percentage/score to each supplier.

5. Presentation:
   The React frontend displays the top matches, allowing the user to filter, 
   compare, and export the supplier list.

---

## 🚀 Getting Started

### Prerequisites

* Node.js (v18+)
* An [Apify](https://apify.com/) Account & API Token
* A [Google AI Studio](https://aistudio.google.com/) Gemini API Key

### Environment Variables

Create a `.env.local` file in the root directory:
```js
APIFY_API_TOKEN=your_apify_token_here
GEMINI_API_KEY=your_gemini_api_key_here
```
### Installation
```bash
npm install
npm run dev
```
Open http://localhost:3000 to access the Industrial Sourcing Engine.
:)
