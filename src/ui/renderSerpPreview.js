import { escapeHtml } from "./escapeHtml.js";

export function renderSerpPreview(serpPreview) {
  const safeUrl = escapeHtml(serpPreview.url);

  return `
    <section class="serp-preview">
      <div class="eyebrow">SERP Preview</div>
      <p class="muted">Preview based on detected page title and meta description.</p>
      <a class="serp-preview__url" href="${safeUrl}" target="_blank" rel="noreferrer noopener">${safeUrl}</a>
      <h2 class="serp-preview__title">${escapeHtml(serpPreview.title)}</h2>
      <p>${escapeHtml(serpPreview.description)}</p>
    </section>
  `;
}
