import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = String(body.prompt || "");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // 🔥 NUCLEAR OPTION: 2000 tokens guarantees the email finishes
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      },
    );

    const data = await res.json();

    if (data.error) throw new Error(data.error.message);
    if (!data.candidates || data.candidates.length === 0)
      throw new Error("Empty response");

    const generatedText = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ text: generatedText });
  } catch (error) {
    console.error("⚙️ Generation Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to generate text" },
      { status: 500 },
    );
  }
}
