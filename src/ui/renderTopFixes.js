import { escapeHtml } from "./escapeHtml.js";

export function renderTopFixes(topFixes) {
  const body = topFixes.length
    ? topFixes
        .map(
          (issue) => `
            <article class="fix-item">
              <h3 class="fix-title">Issue: ${escapeHtml(issue.title)}</h3>
              <p><strong>Evidence:</strong> ${escapeHtml(issue.evidence || "Detected directly from current-page signals.")}</p>
              <p><strong>Why it matters:</strong> ${escapeHtml(issue.whyItMatters || "")}</p>
              <p><strong>Fix:</strong> ${escapeHtml(issue.fix || issue.recommendation)}</p>
              <div class="meta-row">
                <span class="muted"><strong>Impact:</strong> -${issue.scoreImpact} points</span>
                <span class="muted"><strong>Confidence:</strong> ${escapeHtml(issue.confidence || "Medium")}</span>
              </div>
            </article>
          `
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
