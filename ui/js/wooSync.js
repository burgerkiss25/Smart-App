// ui/js/wooSync.js
import { $, appState } from './main.js';

export function initWooSync() {
  const out    = $('#json');
  const errBox = $('#err');

  $('#sendToWoo')?.addEventListener('click', async () => {
    errBox.textContent = '';

    let jsonText = out.textContent || '';
    if (!jsonText.trim() || jsonText === 'JSON output…') {
      errBox.textContent = 'Fehler: Kein JSON vorhanden.';
      return;
    }

    let product = null;
    try {
      product = JSON.parse(jsonText);
    } catch {
      errBox.textContent = 'Fehler: JSON nicht gültig.';
      return;
    }

    // 🔴 NEU: falls im JSON noch keine Bilder sind,
    // aber der Import welche gefunden hat, übernehmen wir die
    if (
      (!product.images || !product.images.length) &&
      appState.lastImportData?.images?.length
    ) {
      product.images = appState.lastImportData.images;
    }

    const body = {
      shop: {
        baseUrl: "https://lavishbeauty-local.local",
        key: "ck_39bdea251e62c266e86acee98add41c5af8f249c",
        secret: "cs_e6beacd7ac02ac7a88d4fab33f212a003d394c5b"
      },
      product,
      options: { dryRun: false }
    };

    try {
      const res = await fetch('/api/woo/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const txt = await res.text();
      let data = null;
      try { data = JSON.parse(txt); } catch {}

      if (!res.ok) {
        errBox.textContent = 'WooSync ERROR: ' + txt;
        return;
      }

      out.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      errBox.textContent = 'Netzwerkfehler: ' + err.message;
    }
  });
}
