export function buildMixedProductPrompt(product) {
  const {
    name,
    category,
    shortSpecs,
    audience = "general",
    language = "de",
    tone = "neutral"
  } = product;

  const categoriesHint = [
    "generator", "genset", "inverter",
    "solarpanel", "pv module", "controller",
    "phone case", "mobile accessory",
    "appliance", "tool", "accessory"
  ].join(", ");

  return `
You are a senior e-commerce copywriter. Write concise, conversion-oriented copy.
OUTPUT STRICTLY AS JSON ONLY. No prose outside JSON.

Product:
- name: ${name}
- category: ${category ?? "unknown"}
- audience: ${audience}
- language: ${language}
- tone: ${tone}
- shortSpecs: ${shortSpecs ?? "-"}

Rules:
- Target language: ${language} (no mixing).
- Tone: ${tone} (consistent).
- Keep title ≤ 70 chars, seo.title ≤ 60, seo.description ≤ 150.
- 3–6 bullet points, each ≤ 110 chars.
- tags: 5–10 short keywords, lowercase.
- attributes: key/value pairs inferred from shortSpecs; avoid empty values.
- If category matches any of [${categoriesHint}] adapt wording (e.g. power, capacity, materials).
- Do not invent technical data you do not see – infer cautiously (e.g. "robust housing", "lightweight").
- Never include pricing, shipping, or warranty promises.

Return JSON with this exact schema:
{
  "title": "string",
  "description": "string",
  "bullets": ["string", "..."],
  "seo": { "title": "string", "description": "string" },
  "tags": ["string", "..."],
  "attributes": { "key": "value", "...": "..." }
}

Now produce the JSON only.
`.trim();
}

export async function generateProductCopy(product, options = {}) {
  const prompt = buildMixedProductPrompt(product);

  // Call our server endpoint via browser-safe client
  const rsp = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, options })
  });
  if (!rsp.ok) throw new Error('Generation failed');
  const { text } = await rsp.json();

  // Try strict JSON parse, then tolerant fallback
  try {
    const firstBrace = text.indexOf('{');
    const lastBrace  = text.lastIndexOf('}');
    const jsonSlice  = firstBrace >= 0 && lastBrace > firstBrace
      ? text.slice(firstBrace, lastBrace + 1)
      : text;
    const data = JSON.parse(jsonSlice);

    // Normalize minimal shape
    return {
      title: data.title ?? product.name ?? "Product",
      description: data.description ?? "",
      bullets: Array.isArray(data.bullets) ? data.bullets : [],
      seo: {
        title: data?.seo?.title ?? (data.title ?? product.name ?? "Product"),
        description: data?.seo?.description ?? ""
      },
      tags: Array.isArray(data.tags) ? data.tags : [],
      attributes: typeof data.attributes === 'object' && data.attributes ? data.attributes : {}
    };
  } catch {
    // Fallback if model returned plain text
    return {
      title: product.name ?? "Product",
      description: text,
      bullets: [],
      seo: { title: product.name ?? "Product", description: text.slice(0, 150) },
      tags: [],
      attributes: {}
    };
  }
}
