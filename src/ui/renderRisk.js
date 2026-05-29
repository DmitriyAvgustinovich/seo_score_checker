import { escapeHtml } from "./escapeHtml.js";
import { renderHelpLabel, renderHelpTip } from "./helpText.js";

export function renderRisk(risk) {
  const modifier = risk.level.toLowerCase();

  return `
    <section class="risk-card">
      <div class="risk-row">
        <div>
          <div class="eyebrow">${renderHelpLabel("Traffic Risk")}</div>
        </div>
        <span class="risk-badge risk-badge--${modifier}">${escapeHtml(risk.level)} ${renderHelpTip("Traffic Risk")}</span>
      </div>
      ${risk.category ? `<div class="meta-row"><span class="muted">${renderHelpLabel("Risk type")}: ${escapeHtml(risk.category)}</span></div>` : ""}
      <p>${escapeHtml(risk.reason)}</p>
      <p class="muted">Traffic Risk is a heuristic priority label for organic visibility, snippets, clicks, and common publishing issues. It is not a revenue estimate or ROI forecast.</p>
    </section>
  `;
}
