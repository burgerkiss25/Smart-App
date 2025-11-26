// server/index.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

import { createWooClient } from '../services/wooClient.js';

// -----------------------------------------------------
// STATIC PATH FIX (wichtig für generator.html, styles, etc.)
// -----------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------------------------------
// STATIC UI FOLDER SERVEN
// -----------------------------------------------------
app.use(express.static(path.join(__dirname, "../ui")));

// Root → generator.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, "../ui/generator.html"));
});

// -----------------------------------------------------
// OPENAI CLIENT
// -----------------------------------------------------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// -----------------------------------------------------
// HEALTHCHECK
// -----------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'Smart-App API' });
});

// -----------------------------------------------------
// TEXT-GENERATOR ENDPOINT
// -----------------------------------------------------
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, options } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const rsp = await client.responses.create({
      model: options?.model || 'gpt-4o-mini',
      input: prompt,
      temperature: options?.temperature ?? 0.6,
    });

    const text = rsp.output_text;
    res.json({ text, meta: { model: rsp.model, usage: rsp.usage } });
  } catch (err) {
    console.error('[generate] error:', err);
    res.status(500).json({ error: 'generation_failed' });
  }
});

// -----------------------------------------------------
// WOO ⟷ UPSERT ENDPOINT
// -----------------------------------------------------
app.post('/api/woo/upsert', async (req, res) => {
  try {
    const { shop, product, options } = req.body || {};

    if (!shop?.baseUrl || !shop?.key || !shop?.secret) {
      return res.status(400).json({ error: 'missing_shop_credentials' });
    }

    // Optional Ping Test
    if (options?.ping === true) {
      const woo = createWooClient({ ...shop, dryRun: true });
      return res.json(await woo.ping());
    }

    if (!product?.title) {
      return res.status(400).json({ error: 'missing_product_title' });
    }

    const woo = createWooClient({
      ...shop,
      dryRun: options?.dryRun !== false, // Default: TRUE → sichere Sandbox
    });

    const result = await woo.upsertProduct(product);
    return res.json(result);

  } catch (err) {
    console.error('[woo/upsert] error:', err?.response?.data || err);
    res.status(500).json({ error: 'woo_upsert_failed' });
  }
});

// -----------------------------------------------------
// SERVER STARTEN
// -----------------------------------------------------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Smart-App server listening on http://localhost:${port}`);
});
