import { renderReportView } from "./reportView.js";
import { renderError, renderLoading, renderRestricted, renderUnsupported } from "./renderStates.js";

function renderAudit(root, data, activeTab) {
  root.innerHTML = `
    <div class="stack">
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
