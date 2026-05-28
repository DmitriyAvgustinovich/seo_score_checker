import { renderRisk } from "./renderRisk.js";
import { renderScore } from "./renderScore.js";
import { escapeHtml } from "./escapeHtml.js";
import { renderReportView } from "./reportView.js";
import { renderError, renderLoading, renderRestricted, renderUnsupported } from "./renderStates.js";

function renderHeader(hostname, isChecking) {
  return `
    <section class="header card">
      <div>
        <div class="eyebrow">Extension</div>
        <h1 class="header__title">SEO Score Checker</h1>
        <span class="hostname">${escapeHtml(hostname || "Unknown host")}</span>
      </div>
      <button type="button" class="button" data-action="recheck" ${isChecking ? "disabled" : ""}>Recheck</button>
    </section>
  `;
}

function renderAudit(root, data, activeTab) {
  root.innerHTML = `
    <div class="stack">
      ${renderHeader(data.pageData.hostname, false)}
      ${renderScore(data.audit)}
      ${renderRisk(data.risk)}
      ${renderReportView(data, activeTab)}
    </div>
  `;
}

export function renderApp(root, state) {
  if (state.status === "loading") {
    renderLoading(root);
    return;
  }

  if (state.status === "restricted") {
    renderRestricted(root);
    return;
  }

  if (state.status === "unsupported") {
    renderUnsupported(root);
    return;
  }

  if (state.status === "error") {
    renderError(root);
    return;
  }

  if (state.status === "success") {
    renderAudit(root, state.data, state.activeTab || "overview");
  }
}
