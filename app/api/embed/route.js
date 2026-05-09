import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const texts = body.texts || [];
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const embeddings = await Promise.all(
      texts.map(async (text) => {
        const safeText = String(text || "Unknown");

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "models/gemini-embedding-001",
              content: { parts: [{ text: safeText }] },
            }),
          },
        );

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        return data.embedding.values;
      }),
    );

    return NextResponse.json({ embeddings });
  } catch (error) {
    console.error("⚙️ Embedding Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 },
    );
  }
}
