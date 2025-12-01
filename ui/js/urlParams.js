// ui/js/urlParams.js
import { $ } from './main.js';

export function initUrlParams() {
  const nameEl  = $('#name');
  const catEl   = $('#category');
  const specsEl = $('#specs');
  const audEl   = $('#audience');
  const toneEl  = $('#tone');
  const langEl  = $('#lang');
  const out     = $('#json');
  const errBox  = $('#err');

  // Prefill from URL
  (function prefill() {
    const p = new URLSearchParams(location.search);
    if (p.get('productName')) nameEl.value = decodeURIComponent(p.get('productName'));
    if (p.get('category'))    catEl.value  = p.get('category');
    if (p.get('shortSpecs'))  specsEl.value= decodeURIComponent(p.get('shortSpecs'));
    if (p.get('audience'))    audEl.value  = decodeURIComponent(p.get('audience'));
    if (p.get('tone'))        toneEl.value = p.get('tone');
    if (p.get('language'))    langEl.value = p.get('language');
  })();

  // Apply URL params
  $('#apply')?.addEventListener('click', () => {
    const params = new URLSearchParams({
      productName: nameEl.value.trim(),
      category: catEl.value,
      shortSpecs: specsEl.value.trim(),
      audience: audEl.value.trim(),
      tone: toneEl.value,
      language: langEl.value
    });
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
  });

  // Clear
  $('#clear')?.addEventListener('click', () => {
    nameEl.value = '';
    specsEl.value = '';
    audEl.value = '';
    out.textContent = 'JSON output…';
    errBox.textContent = '';
    history.replaceState(null, '', location.pathname);
  });
}
