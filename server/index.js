import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

// Pfade setzen (damit UI statisch ausgeliefert wird)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// UI Dateien (HTML/CSS/JS) ausliefern
app.use('/ui', express.static(path.resolve(process.cwd(), 'ui')));

// OPENAI
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, options } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Responses API
    const rsp = await client.responses.create({
      model: options?.model || 'gpt-4o-mini',
      input: prompt,
      temperature: options?.temperature ?? 0.6
    });

    res.json({ text: rsp.output_text, meta: { model: rsp.model, usage: rsp.usage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'generation_failed' });
  }
});

// SERVER START
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Smart-App server listening on http://localhost:${port}`);
});
