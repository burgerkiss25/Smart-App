import { generateProductCopy } from "../../services/productGenerator.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("generator-form");
  const resultEl = document.getElementById("result");

  if (!form || !resultEl) {
    console.error("Generator form or result element is missing.");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    const productData = {
      name: formData.get("productName")?.trim() || "",
      category: formData.get("category") || "",
      shortSpecs: formData.get("shortSpecs")?.trim() || undefined,
      audience: formData.get("audience")?.trim() || undefined,
      tone: formData.get("tone") || "",
      language: formData.get("language") || "",
    };

    if (!productData.name) {
      resultEl.textContent = "Product name is required.";
      return;
    }

    resultEl.textContent = "Generating...";

    try {
      // Remove undefined optional properties
      const sanitizedData = Object.fromEntries(
        Object.entries(productData).filter(([, value]) => value !== undefined && value !== "")
      );

      const response = await generateProductCopy(sanitizedData);
      resultEl.textContent = JSON.stringify(response, null, 2);
    } catch (error) {
      console.error("Failed to generate product copy", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      resultEl.textContent = `Error: ${message}`;
    }
  });
});
