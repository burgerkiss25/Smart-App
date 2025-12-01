// ui/js/promptBuilder.js

export function buildPrompt({ name, category, specs, audience, tone, lang }) {
  const safeName     = (name || '').trim();
  const safeCat      = category || 'misc';
  const safeSpecs    = (specs || '').trim();
  const safeAudience = (audience || 'all').trim() || 'all';
  const safeTone     = (tone || 'neutral').toLowerCase();
  const safeLang     = lang || 'en';

  return [
    `Write WooCommerce-ready product content in ${safeLang}.`,
    `Category: ${safeCat}. Tone: ${safeTone}. Audience: ${safeAudience}.`,
    `Product name: ${safeName || '(unknown)'}.`,
    `Short specs / hints: ${safeSpecs || '(none)'}.`,
    `Output STRICT JSON with keys:`,
    `title, short_description, description, bullets (array of 5),`,
    `seo { title, description, keywords },`,
    `attributes (array of {name, value}),`,
    `variants (array of {sku, name, attributes, price, compare_at_price?}).`,
    `Do not include markdown.`
  ].join('\n');
}
