// services/wooClient.js
import pkg from '@woocommerce/woocommerce-rest-api';

// Kompatibel für CJS & ESM
const WooCommerceRestApi = pkg.default || pkg;

// NUR für lokale LocalWP-Umgebung mit selbst-signiertem Zertifikat!
// In Produktion wieder entfernen.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Kleine Helper
 */
function normUrl(url) {
  return (url || '').replace(/\/+$/, '');
}

function serializeError(err) {
  if (!err) return { message: 'unknown_error' };
  return {
    message: err.message || 'error',
    status: err.response?.status,
    data: err.response?.data,
  };
}

/**
 * Erstellt einen WooCommerce-Client + Hilfsfunktionen
 */
export function createWooClient({
  baseUrl,
  key,
  secret,
  apiVersion = 'wc/v3',
  timeout = 8000,
  dryRun = true,
}) {
  if (!baseUrl || !key || !secret) {
    throw new Error('missing WooCommerce credentials');
  }

  const api = new WooCommerceRestApi({
    url: normUrl(baseUrl),
    consumerKey: key,
    consumerSecret: secret,
    version: apiVersion,
    timeout,
    queryStringAuth: true,
  });

  /**
   * Kleiner Test, ob die API grundsätzlich erreichbar ist
   */
  async function ping() {
    try {
      const rsp = await api.get('products', { per_page: 1 });
      return { ok: true, status: rsp.status, sample: rsp.data?.[0] ?? null };
    } catch (err) {
      return { ok: false, error: serializeError(err) };
    }
  }

  /**
   * Nimmt dein „normales“ KI-Produktobjekt und mapped es
   * auf WooCommerce (Produkt + Variationen).
   */
  function buildWooPayload(p) {
    const name = p.title || 'Generated product';
    const description = p.description || '';
    const short_description = p.short_description || '';

    const attributes = [];

    // Normale Attribute (werden auch als Variations-Attribute verwendet)
    if (Array.isArray(p.attributes)) {
      p.attributes.forEach((a, idx) => {
        if (!a?.name || !a?.value) return;
        attributes.push({
          id: 0,
          name: a.name,
          position: idx,
          visible: true,
          variation: true,
          options: String(a.value)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        });
      });
    }

    const product = {
      name,
      type: p.variants && p.variants.length ? 'variable' : 'simple',
      description,
      short_description,
      status: 'draft', // sicherheitshalber
      attributes,
      meta_data: [
        ...(p.seo?.title
          ? [{ key: '_smartapp_seo_title', value: p.seo.title }]
          : []),
        ...(p.seo?.description
          ? [{ key: '_smartapp_seo_description', value: p.seo.description }]
          : []),
        ...(p.seo?.keywords
          ? [{ key: '_smartapp_seo_keywords', value: p.seo.keywords }]
          : []),
      ],
    };

    const variations = [];
    if (Array.isArray(p.variants) && p.variants.length) {
      for (const v of p.variants) {
        const attrs = [];
        if (Array.isArray(v.attributes)) {
          for (const a of v.attributes) {
            if (!a?.name || !a?.value) continue;
            attrs.push({ name: a.name, option: a.value });
          }
        }

        variations.push({
          sku: v.sku,
          regular_price: String(v.price ?? ''),
          description: v.name,
          attributes: attrs,
        });
      }
    } else if (p.price) {
      product.regular_price = String(p.price);
    }

    return { product, variations };
  }

  /**
   * Produkt anlegen/aktualisieren inkl. Variationen
   */
  async function upsertProduct(normalizedProduct) {
    try {
      const wooPayload = buildWooPayload(normalizedProduct);

      if (dryRun) {
        console.log('[wooClient] DRY RUN payload:', wooPayload);
        return { ok: true, dryRun: true, payload: wooPayload };
      }

      // Versuchen, bestehendes Produkt über SKU der ersten Variante zu finden
      let existingId = null;
      const primarySku = normalizedProduct.variants?.[0]?.sku;
      if (primarySku) {
        const rsp = await api.get('products', { sku: primarySku, per_page: 1 });
        existingId = rsp.data?.[0]?.id ?? null;
      }

      // --- CREATE ---
      if (!existingId) {
        const created = await api.post('products', wooPayload.product);
        const productId = created.data.id;

        if (wooPayload.variations.length) {
          for (const v of wooPayload.variations) {
            await api.post(`products/${productId}/variations`, v);
          }
        }

        return {
          ok: true,
          dryRun: false,
          mode: 'create',
          productId,
        };
      }

      // --- UPDATE ---
      const updated = await api.put(`products/${existingId}`, wooPayload.product);
      const productId = updated.data.id;

      if (wooPayload.variations.length) {
        for (const v of wooPayload.variations) {
          if (!v.sku) continue;
          const existingVarRsp = await api.get(
            `products/${productId}/variations`,
            { sku: v.sku, per_page: 1 },
          );
          const existingVar = existingVarRsp.data?.[0];

          if (!existingVar) {
            await api.post(`products/${productId}/variations`, v);
          } else {
            await api.put(
              `products/${productId}/variations/${existingVar.id}`,
              v,
            );
          }
        }
      }

      return {
        ok: true,
        dryRun: false,
        mode: 'update',
        productId,
      };
    } catch (err) {
      const info = serializeError(err);
      console.error('[wooClient] upsertProduct error:', info);
      return {
        ok: false,
        where: 'upsertProduct',
        error: info,
      };
    }
  }

  return { ping, upsertProduct };
}
