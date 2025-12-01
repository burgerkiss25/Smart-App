// ui/js/main.js
import { initUrlParams }   from './urlParams.js';
import { initImporter }    from './importer.js';
import { initGenerator }   from './generatorCore.js';
import { initWooSync }     from './wooSync.js';

// Kleiner Helper für DOM-Selektoren
export const $ = (sel) => document.querySelector(sel);

// Gemeinsamer State für alle Module
export const appState = {
  lastImportData: null,  // hier merken wir z.B. Bilder vom URL-Import
};

// Initialisierung nach DOM-Load
document.addEventListener('DOMContentLoaded', () => {
  initUrlParams();
  initImporter();
  initGenerator();
  initWooSync();
});
