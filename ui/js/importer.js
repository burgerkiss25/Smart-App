// ui/js/importer.js
import { $, appState } from './main.js';

export function initImporter() {
  const urlEl   = $('#productUrl');
  const nameEl  = $('#name');
  const specsEl = $('#specs');
  const out     = $('#json');
  const errBox  = $('#err');

  $('#importUrl')?.addEventListener('click', async () => {
    const url = (urlEl?.value || '').trim();
    if (!url) {
      errBox.textContent = 'Bitte zuerst eine Produkt-URL eingeben.';
      return;
    }

    errBox.textContent = '';
    out.textContent = 'Importing…';

    try {
      const res = await fetch('/api/import/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Import fehlgeschlagen.');
      }

      // 🔴 WICHTIG: komplettes Import-Result im State merken (inkl. images)
      appState.lastImportData = data;

      if (data.productName) {
        nameEl.value = data.productName;
      }
      if (data.shortSpecs) {
        specsEl.value = data.shortSpecs;
      }

      out.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      out.textContent = '';
      errBox.textContent = 'Import Fehler: ' + (e.message || e);
    }
  });
}
