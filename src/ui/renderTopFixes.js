import { escapeHtml } from "./escapeHtml.js";

function formatSeverity(severity) {
  return severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : "Low";
}

function formatSection(section) {
  return section ? section.charAt(0).toUpperCase() + section.slice(1) : "General";
}

function getBusinessImpact(issue) {
  if (issue.section === "indexability") {
    return "Can block or dilute search visibility.";
  }

  if (issue.section === "metadata") {
    return "Can reduce search relevance and click-through rate.";
  }

  if (issue.section === "structure") {
    return "Can weaken topic clarity and content understanding.";
  }

  if (issue.section === "technical") {
    return "Can limit technical quality signals and rich result eligibility.";
  }

  if (issue.section === "images") {
    return "Can weaken accessibility and image search context.";
  }

  if (issue.section === "links") {
    return "Can weaken navigation quality and internal discovery paths.";
  }

  return "Can reduce preview quality and supporting visibility signals.";
}

export function renderTopFixes(topFixes) {
  const body = topFixes.length
    ? topFixes
        .map(
          (issue) => `
            <article class="fix-item">
              <div class="fix-row">
                <h3 class="fix-title">${escapeHtml(issue.title)}</h3>
                <span class="impact-badge impact-badge--${issue.severity}">Impact: ${escapeHtml(formatSeverity(issue.severity))}</span>
              </div>
              <div class="meta-row">
                <span class="muted">Type: ${escapeHtml(formatSection(issue.section))}</span>
                <span class="muted">Score impact: -${issue.scoreImpact}</span>
              </div>
              <p>${escapeHtml(getBusinessImpact(issue))}</p>
              <p>${escapeHtml(issue.recommendation)}</p>
            </article>
          `
        )
        .join("")
    : '<article class="fix-item"><h3 class="fix-title">No urgent fixes</h3><p>Nothing high-priority needs attention right now.</p></article>';

  return `
    <section class="top-fixes">
      <div class="eyebrow">Top 3 Fixes</div>
      <div class="top-fixes__list">${body}</div>
    </section>
  `;
}
