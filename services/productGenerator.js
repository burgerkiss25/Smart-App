import { generateText, getOpenAIKey } from "../api/openaiClient.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.6;

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${val}`)
      .filter(Boolean);
  }
  return [String(value)];
}

function extractAttributes(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([_, val]) => val !== undefined && val !== null)
        .map(([key, val]) => [String(key), String(val)])
    );
  }

  const list = normalizeList(value);
  return list.reduce((acc, item) => {
    const [key, ...rest] = item.split(":");
    if (!key || rest.length === 0) {
      return acc;
    }
    const attributeKey = key.trim();
    const attributeValue = rest.join(":").trim();
    if (attributeKey && attributeValue) {
      acc[attributeKey] = attributeValue;
    }
    return acc;
  }, {});
}

function buildPrompt(productData) {
  const {
    name = "",
    category = "",
    shortSpecs,
    audience = "",
    tone = "neutral",
    language = "de"
  } = productData || {};

  const specsList = normalizeList(shortSpecs);

  const instructions = `Du bist ein professioneller Texter, der hochwertige Produktbeschreibungen erstellt. Schreibe alle Inhalte in ${language} und verwende einen ${tone} Ton. Liefere die Antwort ausschließlich als valides JSON-Objekt mit folgendem Schema:\n{\n  "title": string,\n  "description": string,\n  "bullets": string[],\n  "seo": { "title": string, "description": string },\n  "tags": string[],\n  "attributes": Record<string,string>\n}`;

  const contextSections = [
    `Produktname: ${name}`,
    `Kategorie: ${category}`,
    audience ? `Zielgruppe: ${audience}` : null,
    specsList.length ? `Wichtige Spezifikationen:\n- ${specsList.join("\n- ")}` : null
  ].filter(Boolean);

  return [instructions, "Nutze die folgenden Produktinformationen:", ...contextSections, "Achte auf Klarheit, Mehrwert und SEO."]
    .filter(Boolean)
    .join("\n\n");
}

function createMockProductCopy(productData = {}) {
  const {
    name = "Beispielprodukt",
    category = "Produkt",
    shortSpecs,
    audience = "Kund:innen",
    tone = "inspirierenden",
    language = "de"
  } = productData;

  const specsList = normalizeList(shortSpecs);
  const attributes = extractAttributes(shortSpecs);

  const bullets = specsList.length
    ? specsList
    : [
        "Hochwertige Verarbeitung für langanhaltende Freude",
        "Durchdachtes Design für den Alltag",
        "Perfekt auf die Bedürfnisse der Zielgruppe abgestimmt"
      ];

  return {
    title: `${name} – ${category}`.trim(),
    description:
      language === "de"
        ? `${name} überzeugt durch ${bullets[0]?.toLowerCase() || "seine vielseitigen Eigenschaften"}. Ideal für ${audience.toLowerCase()} in jeder Situation.`
        : `${name} stands out with ${bullets[0]?.toLowerCase() || "its versatile features"}. Perfect for ${audience.toLowerCase()} in every situation.`,
    bullets,
    seo: {
      title:
        language === "de"
          ? `${name} kaufen | ${category}`
          : `Buy ${name} | ${category}`,
      description:
        language === "de"
          ? `${name} – jetzt entdecken und von ${bullets[0]?.toLowerCase() || "vielseitigen Vorteilen"} profitieren.`
          : `${name} – discover it now and enjoy ${bullets[0]?.toLowerCase() || "versatile benefits"}.`
    },
    tags: [name, category, tone, audience].filter(Boolean).map(String),
    attributes
  };
}

function ensureStructure(result = {}, fallback = {}) {
  const safeResult = typeof result === "object" && result !== null ? result : {};

  return {
    title: typeof safeResult.title === "string" && safeResult.title.trim().length
      ? safeResult.title.trim()
      : fallback.title || "",
    description: typeof safeResult.description === "string" && safeResult.description.trim().length
      ? safeResult.description.trim()
      : fallback.description || "",
    bullets: Array.isArray(safeResult.bullets)
      ? safeResult.bullets.map((item) => String(item).trim()).filter(Boolean)
      : fallback.bullets || [],
    seo: {
      title:
        safeResult.seo && typeof safeResult.seo.title === "string"
          ? safeResult.seo.title.trim()
          : fallback.seo?.title || "",
      description:
        safeResult.seo && typeof safeResult.seo.description === "string"
          ? safeResult.seo.description.trim()
          : fallback.seo?.description || ""
    },
    tags: Array.isArray(safeResult.tags)
      ? safeResult.tags.map((item) => String(item).trim()).filter(Boolean)
      : fallback.tags || [],
    attributes:
      safeResult.attributes && typeof safeResult.attributes === "object"
        ? Object.fromEntries(
            Object.entries(safeResult.attributes).map(([key, value]) => [
              String(key),
              String(value)
            ])
          )
        : fallback.attributes || {}
  };
}

function parseModelResponse(rawText) {
  if (typeof rawText !== "string") return null;

  const trimmed = rawText.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

export async function generateProductCopy(productData, opts = {}) {
  const fallback = createMockProductCopy(productData);
  const hasRealClient = Boolean(getOpenAIKey());

  if (!hasRealClient) {
    return fallback;
  }

  const prompt = buildPrompt(productData);
  const { model = DEFAULT_MODEL, temperature = DEFAULT_TEMPERATURE } = opts;

  try {
    const response = await generateText(prompt, { model, temperature });
    const parsed = parseModelResponse(response?.text);
    return ensureStructure(parsed, fallback);
  } catch (error) {
    console.error("generateProductCopy failed", error);
    return fallback;
  }
}
