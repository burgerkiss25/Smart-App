import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function complete(prompt) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Du bist ein Profi der hochwertigen Produkttext-Generierung für eCommerce. Immer kurz, klar und überzeugend."},
      { role: "user", content: prompt }
    ]
  });

  return response.choices[0].message.content;
}
