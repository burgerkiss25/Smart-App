export function getOpenAIKey() {
  const key = (typeof process !== "undefined" && process?.env?.OPENAI_API_KEY) || "";
  return key;
}

/**
 * generateText(prompt, options)
 * Platzhalter-Funktion: Hier wird später der echte OpenAI-Call integriert.
 * Gibt vorerst nur eine Dummy-Antwort zurück, damit der Rest der App testbar ist.
 */
export async function generateText(prompt, options = {}) {
  // TODO: OpenAI API integrieren (Responses API / Chat Completions)
  return {
    text:
      "DUMMY: Dieser Text kommt aus generateText(). " +
      "Sobald OPENAI_API_KEY gesetzt ist und der API-Call implementiert wurde, " +
      "liefert diese Funktion echte Inhalte.",
    meta: { model: options.model || "gpt-4o-mini", temperature: options.temperature ?? 0.6 }
  };
}
