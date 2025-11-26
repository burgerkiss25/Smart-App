// api/openaiClient.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { CATEGORY_PRESETS, buildPrompt } from '../services/productPrompt.js';

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health & categories
app.get('/api/categories', (_req, res) => res.json({ categories: CATEGORY_PRESETS }));

// Generate structured product copy
app.post('/api/generate-product', async (req, res) => {
  try {
    const { productName, category, shortSpecs, audience, tone, language, options } = req.body || {};
    if (!productName) return res.status(400).json({ error: 'productName is required' });

    const prompt = buildPrompt({
      category: category || 'misc',
      language: language || 'English',
      tone: tone || 'Neutral',
      audience: audience || '',
      name: productName,
      shortSpecs: shortSpecs || ''
    });

    const rsp = await client.responses.create({
      model: options?.model || 'gpt-4o-mini',
      input: prompt,
      temperature: options?.temperature ?? 0.6
    });

    const text = rsp.output_text?.trim() || '{}';
    // Robust JSON parse
    let data;
    try { data = JSON.parse(text); }
    catch { 
      // Attempt to extract JSON block
      const m = text.match(/\{[\s\S]*\}$/);
      data = m ? JSON.parse(m[0]) : { parse_error: true, raw: text };
    }

    res.json({ ok: true, data, meta: { model: rsp.model, usage: rsp.usage } });
  } catch (err) {
    console.error('generate-product error:', err);
    res.status(500).json({ ok: false, error: 'generation_failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Smart-App listening on http://localhost:${port}`));
