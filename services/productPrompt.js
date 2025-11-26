// services/productPrompt.js
// Zentrale Prompt-Vorlagen für gemischte Produktarten (AliExpress-ähnliche Kategorien)

export const CATEGORY_PRESETS = [
  // Startset – jederzeit erweiterbar
  { id: "generator", label: "Generator" },
  { id: "solar_panel", label: "Solar Panel" },
  { id: "phone_case", label: "Phone Case" },
  { id: "laptop", label: "Laptop" },
  { id: "smartphone", label: "Smartphone" },
  { id: "misc", label: "Misc / General" },
];

const baseRules = `
You are an expert e-commerce copywriter and SEO strategist (Neil Patel style).
Output **valid JSON only** matching the "schema" below. No prose outside JSON.

General rules:
- Keep titles clear, include model/size/color when relevant.
- Short description ≤ 1–2 sentences, benefit-led.
- Full description: 2–3 short paragraphs + a bullet list (5–7 bullets).
- SEO: include an SEO title (≤ 60 chars) + meta description (≤ 155 chars).
- Use original, non-plagiarized copy. Avoid forbidden claims.
- Language: use the requested language exactly (defaults to English).
- Tone: match requested tone (e.g., neutral, luxury, playful).
- Audience: reflect if provided (e.g., students, pros, parents).
- Include "tags" (5–12) and "attributes" (key/value pairs).
- If specs are vague, infer sensible defaults and mark with "approx": true.
- NEVER include sensitive data or trademarked brand claims beyond provided info.

schema:
{
  "title": string,
  "short_description": string,
  "description": string,
  "bullets": string[],
  "seo": { "title": string, "description": string },
  "tags": string[],
  "attributes": { [key: string]: string | number | boolean },
  "variants": [
    {
      "sku": string,
      "options": { [OptionName: string]: string }, // e.g., Color, Size, Storage
      "price_hint": string,                         // optional textual hint
      "approx": boolean                             // true if inferred
    }
  ]
}
`;

const templates = {
  generator: `
${baseRules}
Context (category: generator):
- Focus on power output (kW), fuel type, runtime @50% load, noise (dB), tank size, outlets, AVR, copper coil, portability.
- Safety & usage: overload protection, low-oil shutdown, grounding, warranty.
- Variants can be kW sizes or start type (recoil/elec).
`,

  solar_panel: `
${baseRules}
Context (category: solar panel):
- Emphasize wattage, cell type (monocrystalline), efficiency %, Vmp/Imp, Voc/Isc, dimensions, weight, frame, IP rating, warranty.
- Variants by wattage or bundle size (2/4/6 panels).
`,

  phone_case: `
${baseRules}
Context (category: phone case):
- Fit (model + year), material (TPU/PC/silicone), protection level, MagSafe/support, texture/grip, colorways, raised bezels.
- Variants by Color, Model.
`,

  laptop: `
${baseRules}
Context (category: laptop):
- CPU, RAM, storage, GPU, display size/resolution, battery life, weight, ports, OS.
- Variants by RAM/Storage/Color/Keyboard layout.
`,

  smartphone: `
${baseRules}
Context (category: smartphone):
- Chipset, RAM/ROM, cameras, battery mAh, display specs, 5G, charging, weight, IP rating.
- Variants by Color/Storage.
`,

  misc: `
${baseRules}
Context (category: general):
- Extract key benefits from provided specs. Choose 5–7 concise bullets.
- Propose 2–6 sensible variants only if they obviously apply.
`
};

export function buildPrompt({ category = "misc", language = "English", tone = "Neutral", audience = "", name = "", shortSpecs = "" }) {
  const t = templates[category] ?? templates.misc;
  return `
${t}

Generate in: ${language}
Tone: ${tone}
Audience: ${audience || "General audience"}

Product name: ${name}
Short specs / hints (raw, may be comma-separated): ${shortSpecs}

Return JSON only.
  `;
}
