import { escapeHtml } from "./escapeHtml.js";
import { renderHelpLabel, renderHelpTip } from "./helpText.js";
import { renderInteractiveValue } from "./renderInteractiveValue.js";

export const SECTION_LABELS = {
  indexability: "Indexability",
  metadata: "Metadata",
  headings: "Headings",
  technical: "Technical basics",
  schema: "Schema",
  images: "Images",
  links: "Links",
  secondary: "Secondary insights"
};

const SECTION_ORDER = ["indexability", "metadata", "headings", "technical", "schema", "images", "links", "secondary"];

function formatSeverityLabel(severity) {
  return severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : "Low";
}

function renderIssueCard(issue) {
  const badgeLabel = issue.infoOnly ? "Insight" : formatSeverityLabel(issue.severity);
  const scoreMeta = issue.infoOnly
    ? '<span class="muted">Diagnostic insight, no score loss</span>'
    : `<span class="impact-badge impact-badge--${issue.severity}">Impact: -${issue.scoreImpact} points ${renderHelpTip("Impact")}</span>`;

  return `
    <article class="issue issue--${issue.severity}">
      <div class="fix-row">
        <h3 class="fix-title">${escapeHtml(issue.title)}</h3>
        <span class="impact-badge impact-badge--${issue.severity}">${escapeHtml(badgeLabel)} ${renderHelpTip("Severity")}</span>
      </div>
      <p class="issue__text">${escapeHtml(issue.recommendation)}</p>
      <div class="meta-row">
        ${scoreMeta}
      </div>
    </article>
  `;
}

function renderPassedCard(item) {
  return `<article class="passed-item">${escapeHtml(item.title)}</article>`;
}

function renderValueRow(label, value) {
  return `
    <div class="value-row">
      <div class="value-label">${renderHelpLabel(label)}</div>
      <div class="value-value">${renderInteractiveValue(value)}</div>
    </div>
  `;
}

function getDataGroups(pageData) {
  return [
    {
      title: "Search Metadata",
      rows: [
        ["Page URL", pageData.url],
        ["Hostname", pageData.hostname],
        ["Title", pageData.title.text],
        ["Title length", pageData.title.length],
        ["Meta description", pageData.metaDescription.text],
        ["Meta description length", pageData.metaDescription.length]
      ]
    },
    {
      title: "Indexability",
      rows: [
        ["Canonical URL", pageData.canonical.href],
        ["Canonical exists", pageData.canonical.exists],
        ["Canonical valid", pageData.canonical.isValid],
        ["Canonical points to current URL", pageData.canonical.pointsToCurrentUrl],
        ["Robots content", pageData.robots.content],
        ["Googlebot content", pageData.robots.googlebotContent],
        ["Noindex", pageData.robots.noindex],
        ["Nofollow", pageData.robots.nofollow]
      ]
    },
    {
      title: "Headings",
      rows: [
        ["H1 count", pageData.h1.count],
        ["H1 texts", pageData.h1.texts],
        ["Total headings", pageData.headings.total],
        ["Skipped heading levels", pageData.headings.hasSkippedLevels]
      ]
    },
    {
      title: "Technical basics",
      rows: [
        ["Viewport", pageData.technical.viewport],
        ["Has viewport", pageData.technical.hasViewport],
        ["Responsive viewport", pageData.technical.hasResponsiveViewport],
        ["Lang", pageData.technical.lang],
        ["Charset", pageData.technical.charset]
      ]
    },
    {
      title: "Schema",
      rows: [
        ["JSON-LD blocks", pageData.jsonLd.count],
        ["Valid JSON-LD blocks", pageData.jsonLd.validCount],
        ["Invalid JSON-LD blocks", pageData.jsonLd.invalidCount],
        ["Schema types", pageData.jsonLd.types]
      ]
    },
    {
      title: "Images and Links",
      rows: [
        ["Total images", pageData.images.total],
        ["Meaningful images", pageData.images.meaningfulTotal],
        ["Images missing alt", pageData.images.missingAlt],
        ["Missing alt ratio", pageData.images.missingAltRatio],
        ["Total links", pageData.links.total],
        ["Internal links", pageData.links.internal],
        ["External links", pageData.links.external],
        ["Placeholder links", pageData.links.placeholders]
      ]
    },
    {
      title: "Secondary insights and intent",
      rows: [
        ["OG title", pageData.openGraph.title],
        ["OG description", pageData.openGraph.description],
        ["OG image", pageData.openGraph.image],
        ["Twitter card", pageData.twitter.card],
        ["Twitter title", pageData.twitter.title],
        ["Twitter description", pageData.twitter.description],
        ["Twitter image", pageData.twitter.image],
        ["Commercial intent detected", pageData.commercialIntent.detected],
        ["Commercial intent terms", pageData.commercialIntent.matchedTerms]
      ]
    }
  ];
}

export function renderSectionSummary(audit) {
  const sectionsMarkup = SECTION_ORDER.map((sectionKey) => {
      const section = audit.sections[sectionKey];
      const issues = section.issues.filter((issue) => !issue.passed && !issue.infoOnly);
      const insights = section.issues.filter((issue) => !issue.passed && issue.infoOnly);
      const passedChecks = section.issues.filter((issue) => issue.passed);
      const progress = section.maxScore > 0 ? Math.round((section.score / section.maxScore) * 100) : 0;

      const highlightsMarkup = issues.length
        ? issues
            .slice(0, 2)
            .map(
              (issue) => `<li>${escapeHtml(issue.title)}</li>`
            )
            .join("")
        : "<li>No unresolved issues.</li>";
      const insightMarkup = insights.length
        ? insights
            .slice(0, 2)
            .map((issue) => `<li>Insight: ${escapeHtml(issue.title)}</li>`)
            .join("")
        : "";

      return `
        <section class="section-card section-summary-card">
          <div class="section-row">
            <div>
              <div class="eyebrow">${renderHelpLabel(SECTION_LABELS[sectionKey])}</div>
              <h2 class="section-title">${section.score}/${section.maxScore} ${renderHelpTip("Section score")}</h2>
            </div>
            <span class="section-badge">${progress}% ${renderHelpTip("Section progress")}</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-bar" style="width: ${progress}%;"></div>
          </div>
          <div class="meta-row">
            <span class="muted">${issues.length} issues ${renderHelpTip("Issues")}</span>
            ${insights.length ? `<span class="muted">${insights.length} insights ${renderHelpTip("Insights")}</span>` : ""}
            <span class="muted">${passedChecks.length} passed checks ${renderHelpTip("Passed checks")}</span>
          </div>
          <ul class="section-highlights">${highlightsMarkup}${insightMarkup}</ul>
        </section>
      `;
    }).join("");

  return `
    <section class="section-block">
      <div class="eyebrow">${renderHelpLabel("Section Breakdown")}</div>
      <div class="sections">${sectionsMarkup}</div>
    </section>
  `;
}

export function renderIssuesReport(audit) {
  const sectionsMarkup = SECTION_ORDER.map((sectionKey) => {
    const section = audit.sections[sectionKey];
    const issues = section.issues.filter((issue) => !issue.passed);
    const issueMarkup = issues.length
      ? issues.map((issue) => renderIssueCard(issue)).join("")
      : '<article class="passed-item">No unresolved issues in this section.</article>';

    return `
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">${renderHelpLabel(SECTION_LABELS[sectionKey])}</div>
            <h2 class="section-title">${issues.length} issue${issues.length === 1 ? "" : "s"}</h2>
          </div>
          <span class="section-badge">${section.score}/${section.maxScore} ${renderHelpTip("Section score")}</span>
        </div>
        <div class="issue-list">${issueMarkup}</div>
      </section>
    `;
  }).join("");

  return `
    <section class="section-block">
      <div class="eyebrow">Issues Report</div>
      <div class="sections">${sectionsMarkup}</div>
    </section>
  `;
}

export function renderPassedReport(audit) {
  const sectionsMarkup = SECTION_ORDER.map((sectionKey) => {
    const section = audit.sections[sectionKey];
    const passedChecks = section.issues.filter((issue) => issue.passed);
    const passedMarkup = passedChecks.length
      ? passedChecks.map((item) => renderPassedCard(item)).join("")
      : '<article class="passed-item">No passed checks recorded.</article>';

    return `
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">${renderHelpLabel(SECTION_LABELS[sectionKey])}</div>
            <h2 class="section-title">${passedChecks.length} passed</h2>
          </div>
          <span class="section-badge">${section.score}/${section.maxScore} ${renderHelpTip("Section score")}</span>
        </div>
        <div class="passed-checks">${passedMarkup}</div>
      </section>
    `;
  }).join("");

  return `
    <section class="section-block">
      <div class="eyebrow">Passed Checks</div>
      <div class="sections">${sectionsMarkup}</div>
    </section>
  `;
}

export function renderDataReport(pageData) {
  const groupsMarkup = getDataGroups(pageData)
    .map(
      (group) => `
        <section class="section-card report-group">
          <h2 class="section-title">${escapeHtml(group.title)}</h2>
          <div class="value-list">
            ${group.rows.map(([label, value]) => renderValueRow(label, value)).join("")}
          </div>
        </section>
      `
    )
    .join("");

  return `
    <section class="section-block">
      <div class="eyebrow">Page Data</div>
      <div class="sections">${groupsMarkup}</div>
    </section>
  `;
}
