// ui/js/generatorCore.js
import { $ } from './main.js';
import { buildPrompt } from './promptBuilder.js';

export function initGenerator() {
  const nameEl   = $('#name');
  const catEl    = $('#category');
  const specsEl  = $('#specs');
  const audEl    = $('#audience');
  const toneEl   = $('#tone');
  const langEl   = $('#lang');
  const out      = $('#json');
  const errBox   = $('#err');

  // Copy
  $('#copy')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(out.textContent || '');
    } catch {
      // Ignorieren – Clipboard-Fehler sind unkritisch
    }
  });

  // Download
  $('#download')?.addEventListener('click', () => {
    const blob = new Blob([out.textContent || ''], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'product.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Generate (OpenAI)
  $('#run')?.addEventListener('click', async () => {
    errBox.textContent = '';
    out.textContent = '…';

    const prompt = buildPrompt({
      name: nameEl.value,
      category: catEl.value,
      specs: specsEl.value,
      audience: audEl.value,
      tone: toneEl.value,
      lang: langEl.value
    });

    const payload = {
      prompt,
      options: { temperature: 0.6, model: 'gpt-4o-mini' }
    };

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { /* kein JSON */ }

      if (!res.ok) {
        const msg = (data && (data.error || data.message))
          ? JSON.stringify(data)
          : text;
        throw new Error(`HTTP ${res.status} – ${msg}`);
      }

      let outObj = null;
      if (data && typeof data.text === 'string') {
        try { outObj = JSON.parse(data.text); } catch { /* plain text */ }
        out.textContent = outObj ? JSON.stringify(outObj, null, 2) : data.text;
      } else {
        out.textContent = JSON.stringify(data ?? { note: 'empty response' }, null, 2);
      }
    } catch (err) {
      out.textContent = '';
      errBox.textContent = 'Fehler: ' + (err?.message || err);
    }
  });
}
