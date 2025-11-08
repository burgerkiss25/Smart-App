import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, options } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Responses API – empfohlen
    const rsp = await client.responses.create({
      model: options?.model || 'gpt-4o-mini',
      input: prompt,
      temperature: options?.temperature ?? 0.6
    });

    const text = rsp.output_text; // kompaktes Text-Feld
    res.json({ text, meta: { model: rsp.model, usage: rsp.usage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'generation_failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Smart-App server listening on http://localhost:${port}`);
});
