/**
 * Calculates the cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Fetches embeddings from your secure Next.js backend.
 */
export async function getEmbeddings(texts) {
  try {
    const response = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) throw new Error("Failed to fetch embeddings");

    const { embeddings } = await response.json();
    return embeddings;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return texts.map(() => new Array(3072).fill(0.001));
  }
}
