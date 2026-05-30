import { escapeHtml } from "./escapeHtml.js";

function renderState(root, title, description, options = {}) {
  const { loading = false, actionLabel = "", actionId = "", eyebrow = "SEO Score Checker" } = options;

  root.innerHTML = `
    <div class="stack">
      <section class="state-card">
        ${loading ? '<div class="spinner" aria-hidden="true"></div>' : ""}
        ${eyebrow ? `<div class="eyebrow">${escapeHtml(eyebrow)}</div>` : ""}
        <h1 class="header__title">${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        ${
          actionLabel && actionId
            ? `<button type="button" class="button" data-action="${escapeHtml(actionId)}">${escapeHtml(actionLabel)}</button>`
            : ""
        }
      </section>
    </div>
  `;
}

export function renderLoading(root) {
  renderState(root, "SEO Score Checker", "Checking the open URL...", {
    eyebrow: "",
    loading: true
  });
}

export function renderRestricted(root) {
  renderState(
    root,
    "SEO Score Checker",
    "Chrome does not allow extensions to inspect this page. Open a regular website page and try again."
  );
}

export function renderUnsupported(root) {
  renderState(root, "SEO Score Checker", "This page cannot be analyzed. Open a regular website page and try again.");
}

export function renderError(root) {
  renderState(root, "SEO Score Checker", "Refresh the page and run the check again.", {
    actionLabel: "Recheck",
    actionId: "recheck"
  });
}
