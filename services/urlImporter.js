// services/urlImporter.js
import * as cheerio from 'cheerio';

/**
 * Sehr einfacher Produkt-Importer für AliExpress / Alibaba.
 * - Holt die HTML-Seite
 * - Liest JSON-LD (Product) aus
 * - Fällt zurück auf <title> / Meta-Tags
 * - Versucht Preis & Währung zu bestimmen
 */
export async function importFromUrl(rawUrl) {
  const url = rawUrl?.trim();
  if (!url) {
    throw new Error('URL is required');
  }

  // Domain / Source bestimmen
  const urlObj = new URL(url);
  const host = urlObj.hostname.toLowerCase();
  let source = null;
  if (host.includes('aliexpress.')) source = 'aliexpress';
  else if (host.includes('alibaba.')) source = 'alibaba';

  // HTML holen (mit einfachem User-Agent, damit wir nicht sofort geblockt werden)
  const resp = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/120.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9,de;q=0.8'
    }
  });

  const html = await resp.text();
  const $ = cheerio.load(html);

  // --------------------------------------------------
  // JSON-LD einsammeln
  // --------------------------------------------------
  const jsonLd = [];
  $('script[type="application/ld+json"]').each((_i, el) => {
    const txt = $(el).contents().text();
    if (!txt) return;
    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) jsonLd.push(...parsed);
      else jsonLd.push(parsed);
    } catch {
      // einfach ignorieren
    }
  });

  // Erstes Product-Objekt suchen
  let productNode = null;
  for (const node of jsonLd) {
    if (!node) continue;

    if (node['@type'] === 'Product') {
      productNode = node;
      break;
    }

    if (Array.isArray(node['@graph'])) {
      const hit = node['@graph'].find(x => x && x['@type'] === 'Product');
      if (hit) {
        productNode = hit;
        break;
      }
    }
  }

  const firstNonEmpty = (...vals) => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  };

  // --------------------------------------------------
  // Name
  // --------------------------------------------------
  const productName = firstNonEmpty(
    productNode?.name,
    $('meta[property="og:title"]').attr('content'),
    $('meta[name="title"]').attr('content'),
    $('title').text()
  );

  // --------------------------------------------------
  // Beschreibung
  // --------------------------------------------------
  const description = firstNonEmpty(
    productNode?.description,
    $('meta[name="description"]').attr('content'),
    $('meta[property="og:description"]').attr('content')
  );

  // --------------------------------------------------
  // Bilder
  // --------------------------------------------------
  let images = [];
  const imgFromJson = productNode?.image;

  if (Array.isArray(imgFromJson)) {
    images = imgFromJson.filter(Boolean);
  } else if (typeof imgFromJson === 'string' && imgFromJson.trim()) {
    images = [imgFromJson.trim()];
  }

  if (!images.length) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) images.push(ogImg);
  }

  // --------------------------------------------------
  // Preis
  // --------------------------------------------------
  let priceValue = null;
  let priceCurrency = null;
  let priceRaw = null;

  const offers = productNode?.offers;

  const takeOffer = offer => {
    if (!offer) return;
    if (offer.price) {
      priceRaw = String(offer.price);
      const num = Number(
        String(offer.price).replace(/[^\d.,]/g, '').replace(',', '.')
      );
      if (!Number.isNaN(num)) priceValue = num;
    }
    if (offer.priceCurrency) {
      priceCurrency = offer.priceCurrency;
    }
  };

  if (offers) {
    if (Array.isArray(offers)) {
      takeOffer(offers[0]);
    } else {
      // offers kann selbst ein Offer sein oder offers.offers enthalten
      if (Array.isArray(offers.offers)) {
        takeOffer(offers.offers[0]);
      } else {
        takeOffer(offers);
      }
    }
  }

  // Fallback: Meta-Tags
  if (!priceValue) {
    const ogPrice =
      $('meta[property="og:price:amount"]').attr('content') ||
      $('meta[itemprop="price"]').attr('content');
    const ogCurrency =
      $('meta[property="og:price:currency"]').attr('content') ||
      $('meta[itemprop="priceCurrency"]').attr('content');

    if (ogPrice) {
      priceRaw = ogPrice;
      const num = Number(
        String(ogPrice).replace(/[^\d.,]/g, '').replace(',', '.')
      );
      if (!Number.isNaN(num)) priceValue = num;
      if (ogCurrency) priceCurrency = ogCurrency;
    }
  }

  // AliExpress-Spezial: Preis aus pdp_npi Query-Parameter
  if (!priceValue) {
    const pdp = urlObj.searchParams.get('pdp_npi');
    if (pdp) {
      const decoded = decodeURIComponent(pdp); // z.B. 6@dis!GHS!5165.59!362.68!!2890.00!202.91!@
      priceRaw = decoded;

      const parts = decoded.split('!');
      // sehr grob: [0] = "6@dis", [1] = Currency, [2] = "5165.59" (alter Preis), [3] = "362.68" (aktueller Preis) o.ä.
      if (parts.length >= 4) {
        if (!priceCurrency && parts[1]) priceCurrency = parts[1];
        const num = Number(parts[3].replace(',', '.'));
        if (!Number.isNaN(num)) priceValue = num;
      }
    }
  }

  // --------------------------------------------------
  // Varianten (sehr basic – aus JSON-LD Offers)
  // --------------------------------------------------
  const variants = [];
  let offersList = null;

  if (offers) {
    if (Array.isArray(offers.offers)) {
      offersList = offers.offers;
    } else if (Array.isArray(offers)) {
      offersList = offers;
    }
  }

  if (offersList) {
    for (const off of offersList) {
      if (!off) continue;
      variants.push({
        sku: off.sku || off['@id'] || null,
        name: off.name || productName,
        attributes: [], // später ausbauen (z.B. Farbe/Größe)
        price: off.price ? Number(off.price) : null
      });
    }
  }

  return {
    ok: true,
    url,
    source,
    productName,
    shortSpecs: '', // kannst du später noch mit Specs/Tags füllen
    description,
    images,
    price: {
      value: priceValue,
      currency: priceCurrency,
      raw: priceRaw
    },
    variants,
    raw: {
      jsonLd
    }
  };
}
