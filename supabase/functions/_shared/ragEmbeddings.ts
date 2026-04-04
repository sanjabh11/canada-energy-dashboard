export const EMBEDDING_MODEL = Deno.env.get("GEMINI_EMBEDDING_MODEL") ?? "text-embedding-004";
export const EMBEDDING_DIMENSION = 1536;

export function isEmbeddingProviderConfigured(): boolean {
  return Boolean(Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY"));
}

export function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function createGeminiEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[] | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey || !text.trim()) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSION,
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embedding error ${response.status}: ${detail}`);
  }

  const json = await response.json();
  const values = Array.isArray(json?.embedding?.values)
    ? json.embedding.values.map((value: unknown) => Number(value))
    : null;

  if (!values || values.length !== EMBEDDING_DIMENSION || values.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding provider returned invalid vector dimensions");
  }

  return values;
}
