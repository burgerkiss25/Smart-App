// services/productGenerator.js

/**
 * Kategorie-agnostische Prompt-Vorlage (Neil-Patel-SEO-Best Practices)
 * Funktioniert für ALLE Kategorien (AliExpress-ähnliche Taxonomie).
 * Output ist strikt JSON, WooCommerce-ready.
 */
export function buildUniversalPrompt(p) {
  const name = p?.name ?? "";
  const category = p?.category ?? "general";
  const language = (p?.language ?? "en").trim();
  const tone = (p?.tone ?? "neutral").trim();
  const audience = (p?.audience ?? "general").trim();
  const shortSpecs = (p?.shortSpecs ?? "-").trim();

  return `
You are a senior e-commerce SEO copywriter.
OUTPUT STRICTLY AS JSON ONLY. No prose outside JSON.

INPUT
- name: ${name}
- category (free taxonomy): ${category}
- audience: ${audience}
- language: ${language}
- tone: ${tone}
- shortSpecs: ${shortSpecs}

GOALS
- Produce unique, conversion-oriented product copy suitable for WooCommerce.
- Follow Neil Patel style SEO best practices: clear value, scannable bullets, primary keyword early.
- Use the category context to adapt wording (but do NOT invent technical data). If unsure, keep benefits generic.
- No pricing, shipping or warranty promises.

CONSTRAINTS
- Language: ${language} only (no mixing).
- Tone: ${tone} throughout.
- Title ≤ 70 chars; SEO title ≤ 60; SEO description ≤ 150.
- 3–6 bullets; each ≤ 110 chars; concise, benefit-oriented.
- tags: 5–10 lowercase keywords (no brand spam; no commas inside a tag).
- attributes: key→value from shortSpecs; omit unknown.

RETURN JSON with EXACT keys and types:
{
  "title": "string",                       // H1, ≤70, primary keyword early
  "short_description": "string",           // Woo short desc: 1–3 Sätze, scannbar
  "description": "string",                 // Main HTML allowed; include <ul><li> bullets</li></ul> if helpful
  "bullets": ["string","..."],             // 3–6 items, ≤110 chars each
  "seo": { "title": "string", "description": "string" }, // ≤60 / ≤150
  "tags": ["string","..."],                // 5–10 tokens, lowercase
  "attributes": { "key": "value", "...": "..." },
  "slug": "string",                        // url-friendly, lowercase, hyphenated
  "image_alt": "string"                    // short, descriptive
}
`.trim();
}

/**
 * Browser-seitiger Aufruf unseres /api/generate Endpoints
 * + robustes JSON-Parsen (Fallback, falls das Modell Text um das JSON herum liefert).
 */
export async function generateUniversalProductCopy(product, options = {}) {
  const prompt = buildUniversalPrompt(product);

  const rsp = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, options })
  });
  if (!rsp.ok) throw new Error(`Generation failed (${rsp.status})`);

  const payload = await rsp.json();
  const rawText = payload?.text ?? "";

  // Robust parse: isoliert äußerste JSON-Klammern
  try {
    const first = rawText.indexOf('{');
    const last = rawText.lastIndexOf('}');
    const jsonSlice = (first >= 0 && last > first) ? rawText.slice(first, last + 1) : rawText;
    const data = JSON.parse(jsonSlice);

    // Minimale Normalisierung
    return {
      title: data.title ?? (product.name || "Product"),
      short_description: data.short_description ?? "",
      description: data.description ?? "",
      bullets: Array.isArray(data.bullets) ? data.bullets : [],
      seo: {
        title: data?.seo?.title ?? (data.title ?? product.name ?? "Product"),
        description: data?.seo?.description ?? ""
      },
      tags: Array.isArray(data.tags) ? data.tags : [],
      attributes: (data.attributes && typeof data.attributes === 'object') ? data.attributes : {},
      slug: data.slug ?? (product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : "product"),
      image_alt: data.image_alt ?? (product.name || "product")
    };
  } catch {
    // Fallback: Modell hat Klartext geliefert
    return {
      title: product.name ?? "Product",
      short_description: rawText.slice(0, 200),
      description: rawText,
      bullets: [],
      seo: { title: product.name ?? "Product", description: rawText.slice(0, 150) },
      tags: [],
      attributes: {},
      slug: (product.name || "product").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      image_alt: product.name || "product"
    };
  }
}
