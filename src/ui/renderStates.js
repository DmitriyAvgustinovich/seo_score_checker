import { escapeHtml } from "./escapeHtml.js";

function renderState(root, title, description, options = {}) {
  const { loading = false, actionLabel = "", actionId = "" } = options;

  root.innerHTML = `
    <div class="stack">
      <section class="state-card">
        ${loading ? '<div class="spinner" aria-hidden="true"></div>' : ""}
        <div class="eyebrow">SEO Score Checker</div>
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
  renderState(root, "Checking this page...", "Running a local SEO audit for the active tab.", {
    loading: true
  });
}

export function renderRestricted(root) {
  renderState(root, "Page unavailable", "Chrome does not allow extensions to inspect this page.");
}

export function renderUnsupported(root) {
  renderState(root, "Unsupported page", "This page type cannot be analyzed.");
}

export function renderError(root) {
  renderState(root, "Check failed", "Could not check this page. Try again.", {
    actionLabel: "Recheck",
    actionId: "recheck"
  });
}
