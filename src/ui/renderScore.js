import { escapeHtml } from "./escapeHtml.js";

function getBadgeClass(scoreLabel) {
  if (scoreLabel === "Good") {
    return "badge badge--good";
  }

  if (scoreLabel === "Needs improvement") {
    return "badge badge--warn";
  }

  return "badge badge--danger";
}

export function renderScore(audit) {
  const progressWidth = Math.max(0, Math.min(100, audit.score));
  const safeLabel = escapeHtml(audit.scoreLabel);

  return `
    <section class="score-card">
      <div class="eyebrow">SEO Score</div>
      <div class="score-row">
        <div>
          <div class="score-number">${audit.score}</div>
          <div class="score-label">Grade: ${safeLabel}</div>
        </div>
        <span class="${getBadgeClass(audit.scoreLabel)}">${safeLabel}</span>
      </div>
      <div class="progress-track" aria-hidden="true">
        <div class="progress-bar" style="width: ${progressWidth}%;"></div>
      </div>
    </section>
  `;
}
