export async function generateText(prompt, options = {}) {
  // Client-seitig NICHT den Key nutzen. Stattdessen an unseren Server posten.
  const rsp = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, options })
  });
  if (!rsp.ok) throw new Error('Failed to call /api/generate');
  return await rsp.json(); // { text, meta }
}
