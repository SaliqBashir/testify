import { computeFitScore } from "@/lib/companyIntelligence";
import { getEmbeddings, cosineSimilarity } from "@/lib/semanticEngine";

export async function rankSuppliers(suppliers, query, options = {}) {
  const { searchMode = "expanded", limit, semanticWeight = 0.6 } = options;

  // 1. Prepare texts for embedding, now including tags
  const textsToEmbed = [
    query,
    ...suppliers.map((s) => {
      const productString = s.products?.join(", ") || "";
      const catString = s.categories?.join(", ") || "";
      const tagString = s.tags?.join(", ") || "";

      // The embedding model will now read the description, categories, products, AND tags
      return `${s.description} Specialties: ${catString}. Products: ${productString}. Tags: ${tagString}.`;
    }),
  ];

  const embeddings = await getEmbeddings(textsToEmbed);
  const queryEmbedding = embeddings[0];
  const supplierEmbeddings = embeddings.slice(1);

  const ranked = suppliers
    .map((s, index) => {
      const baseFit = computeFitScore(s, query, { searchMode });

      const rawSemantic = cosineSimilarity(
        queryEmbedding,
        supplierEmbeddings[index],
      );
      const normalizedSemantic = Math.max(0, rawSemantic) * 100;

      const heuristicWeight = 1 - semanticWeight;
      const finalScore = Math.round(
        normalizedSemantic * semanticWeight + baseFit.score * heuristicWeight,
      );

      return {
        ...s,
        fitScore: finalScore,
        fitBreakdown: {
          ...baseFit.breakdown,
          aiSemantic: Math.round(normalizedSemantic),
        },
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  if (limit != null && limit > 0) return ranked.slice(0, limit);
  return ranked;
}
