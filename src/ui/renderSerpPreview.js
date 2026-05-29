import { escapeHtml } from "./escapeHtml.js";
import { renderHelpLabel } from "./helpText.js";
import { renderInteractiveValue } from "./renderInteractiveValue.js";

export function renderSerpPreview(serpPreview) {
  return `
    <section class="serp-preview">
      <div class="eyebrow">${renderHelpLabel("SERP Preview")}</div>
      <p class="muted">Preview based on detected page title and meta description.</p>
      <div class="serp-preview__url">${renderInteractiveValue(serpPreview.url)}</div>
      <h2 class="serp-preview__title">${escapeHtml(serpPreview.title)}</h2>
      <p>${escapeHtml(serpPreview.description)}</p>
    </section>
  `;
}
