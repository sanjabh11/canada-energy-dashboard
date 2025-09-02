// call_llm_adapter.ts (Deno)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any; // Provided by Supabase Edge Functions runtime
// Native Google Gemini adapter with OpenAI-compatible gateway fallback.
// Keeps the same signature used by index.ts

type Msg = { role: string; content: string };

function buildPrompt(messages: Msg[]): string {
  if (!messages || !messages.length) return '';
  return messages.map(m => `[${(m.role || 'user').toUpperCase()}]\n${m.content}`).join('\n\n');
}

async function callGoogleGeminiNative({ messages, model, maxTokens }: { messages: Msg[]; model?: string; maxTokens: number; }): Promise<string | Record<string, unknown>> {
  const mdl = model || Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
  const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
  const oauthBearer = Deno.env.get('GEMINI_OAUTH_BEARER');
  if (!apiKey && !oauthBearer) throw new Error('Missing GEMINI_API_KEY or GEMINI_OAUTH_BEARER');

  const prompt = buildPrompt(messages);
  const body: Record<string, unknown> = {
    model: mdl,
    contents: [ { role: 'user', parts: [{ text: prompt }] } ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: maxTokens,
    },
  };
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mdl)}:generateContent`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (oauthBearer) headers['Authorization'] = `Bearer ${oauthBearer}`; else headers['x-goog-api-key'] = String(apiKey);

  const resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${t}`);
  }
  const json = await resp.json();
  // Parse common Gemini shapes
  const textOut = (json?.candidates?.[0]?.content?.text)
    ?? (json?.output?.[0]?.content?.text)
    ?? json?.text
    ?? JSON.stringify(json);
  return textOut;
}

async function callOpenAIGateway({ messages, model, maxTokens }: { messages: Msg[]; model?: string; maxTokens: number; }): Promise<string | Record<string, unknown>> {
  const apiUrl = Deno.env.get('GEMINI_API_URL');
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const mdl = model || Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
  if (!apiUrl || !apiKey) {
    // Dev/mock fallback
    return JSON.stringify({ tl_dr: 'Mock response (no gateway configured)', provenance: [{ id: 'mock', last_updated: new Date().toISOString() }] });
  }
  const payload = { model: mdl, messages, max_tokens: maxTokens };
  const resp = await fetch(apiUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gateway error ${resp.status}: ${t}`);
  }
  const json = await resp.json();
  if (json && Array.isArray(json.choices) && json.choices[0]?.message?.content) return json.choices[0].message.content as string;
  if (json?.output) return json.output as string;
  return JSON.stringify(json);
}

export async function callLLM({ messages, model, maxTokens = 800 }: { messages: Array<{role: string; content: string}>; model?: string; maxTokens?: number; }): Promise<string | Record<string, unknown>> {
  const provider = (Deno.env.get('GEMINI_PROVIDER') || 'google').toLowerCase();
  if (provider === 'google') {
    return await callGoogleGeminiNative({ messages, model, maxTokens });
  }
  return await callOpenAIGateway({ messages, model, maxTokens });
}
