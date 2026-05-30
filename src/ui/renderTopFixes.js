import { escapeHtml } from "./escapeHtml.js";
import { renderInteractiveValue } from "./renderInteractiveValue.js";

function getImpactClass(scoreImpact) {
  if (scoreImpact >= 8) {
    return "high";
  }

  if (scoreImpact >= 4) {
    return "medium";
  }

  return "low";
}

function getConfidenceClass(confidence = "Medium") {
  const normalized = confidence.toLowerCase();

  if (normalized === "high") {
    return "high";
  }

  if (normalized === "low") {
    return "low";
  }

  return "medium";
}

export function renderTopFixes(topFixes) {
  const body = topFixes.length
    ? topFixes
        .map(
          (issue) => {
            const confidence = issue.confidence || "Medium";
            return `
              <article class="fix-item">
                <h3 class="fix-title">Issue: ${escapeHtml(issue.title)}</h3>
                <p><strong>Evidence:</strong> ${renderInteractiveValue(issue.evidence || "Detected directly from current-page signals.")}</p>
                <p><strong>Why it matters:</strong> ${renderInteractiveValue(issue.whyItMatters || "")}</p>
                <p><strong>Fix:</strong> ${renderInteractiveValue(issue.fix || issue.recommendation)}</p>
                <div class="meta-row">
                  <span class="impact-badge impact-badge--${getImpactClass(issue.scoreImpact)}">Impact: -${issue.scoreImpact} points</span>
                  <span class="confidence-badge confidence-badge--${getConfidenceClass(confidence)}">Confidence: ${escapeHtml(confidence)}</span>
                </div>
              </article>
            `;
          }
        )
        .join("")
    : '<article class="fix-item"><h3 class="fix-title">No major issues</h3><p>No critical fixes found in this quick current-page check. No more high-priority fixes found in this quick current-page check.</p></article>';

  return `
    <section class="top-fixes">
      <div class="eyebrow">Top 3 Fixes</div>
      <p class="muted">Top fixes are based on detected page signals and confidence.</p>
      <div class="top-fixes__list">${body}</div>
    </section>
  `;
}
