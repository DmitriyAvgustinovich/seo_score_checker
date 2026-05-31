import { escapeHtml } from "./escapeHtml.js";
import {
  SECTION_LABELS,
  renderSectionSummary
} from "./renderSections.js";
import { renderSerpPreview } from "./renderSerpPreview.js";
import { renderTopFixes } from "./renderTopFixes.js";
import { renderRisk } from "./renderRisk.js";
import { renderScore } from "./renderScore.js";
import { renderHelpLabel, renderHelpTip } from "./helpText.js";
import { renderInteractiveValue } from "./renderInteractiveValue.js";
import { META_DESCRIPTION_THRESHOLDS, TITLE_THRESHOLDS } from "../constants/thresholds.js";

function renderTable(headers, rows, options = {}) {
  const { compact = false } = options;
  const rowLabelHeaders = new Set(["Field", "Signal"]);

  return `
    <div class="table-shell ${compact ? "table-shell--compact" : ""}">
      <table class="data-table">
        <thead>
          <tr>
            ${headers.map((header) => `<th>${renderHelpLabel(header)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${row
                    .map(
                      (cell, index) => {
                        const isRowLabel = index === 0 && rowLabelHeaders.has(headers[0]);
                        const cellMarkup = cell && typeof cell === "object" && cell.html
                          ? cell.html
                          : isRowLabel
                            ? renderHelpLabel(cell)
                            : renderInteractiveValue(cell);

                        return `<td data-label="${escapeHtml(headers[index] || "")}">${cellMarkup}</td>`;
                      }
                    )
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getRangeStatus(value, thresholds) {
  if (value >= thresholds.goodMin && value <= thresholds.goodMax) {
    return "good";
  }

  if (value >= thresholds.warningMin && value <= thresholds.warningMax) {
    return "warn";
  }

  return "danger";
}

function renderLengthMetric(value, thresholds, unit = "characters") {
  const status = getRangeStatus(value, thresholds);
  const target = thresholds.goodMin + "-" + thresholds.goodMax + " " + unit;

  return {
    html: `
      <span class="metric-value metric-value--${status}">${renderInteractiveValue(value)}</span>
      <span class="metric-target">Target: ${escapeHtml(target)}</span>
    `
  };
}

function formatPercentage(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "(missing)";
  }

  return Number((numericValue * 100).toFixed(1)) + "%";
}

function renderValueRow(label, value) {
  return `
    <div class="value-row">
      <div class="value-label">${renderHelpLabel(label)}</div>
      <div class="value-value">${renderInteractiveValue(value)}</div>
    </div>
  `;
}

function renderStatBadge(label, value, modifier = "", options = {}) {
  const labelMarkup = options.showHelp
    ? `<span class="label-with-help"><span>${escapeHtml(label)}</span>${renderHelpTip(label, options.helpText)}</span>`
    : renderHelpLabel(label);

  return `
    <span class="stat-badge ${modifier}">
      <span>${labelMarkup}</span>
      <strong>${renderInteractiveValue(value)}</strong>
    </span>
  `;
}

function getScoreSectionLabel(sectionKey) {
  if (sectionKey === "secondary") {
    return "Preview tags";
  }

  return SECTION_LABELS[sectionKey] || sectionKey;
}

function renderScoreDetails(audit, options = {}) {
  const { embedded = false, open = false } = options;
  const sectionRows = Object.entries(audit.sections || {}).map(([sectionKey, section]) => [
    getScoreSectionLabel(sectionKey),
    section.maxScore,
    section.score
  ]);
  sectionRows.push(["Total", 100, audit.score]);
  const scoreDeductions = (audit.issues || [])
    .filter((issue) => !issue.passed && !issue.infoOnly && issue.scoreImpact > 0)
    .map(
      (issue) =>
        `<li>${escapeHtml(issue.title)} (${escapeHtml(getScoreSectionLabel(issue.section))}): -${escapeHtml(issue.scoreImpact)} points</li>`
    );
  const infoOnlySignals = (audit.issues || [])
    .filter((issue) => !issue.passed && issue.infoOnly)
    .map((issue) => `<li>${escapeHtml(issue.title)}</li>`);
  const capText = audit.appliedCap
    ? "Final score capped at " + audit.appliedCap.maxScore + " because " + audit.appliedCap.title.toLowerCase() + " was detected."
    : "No critical cap applied.";
  const infoOnlyMarkup = infoOnlySignals.length
    ? `
      <div class="section-subtitle">Informational-only signals</div>
      <ul class="score-details__list">${infoOnlySignals.join("")}</ul>
    `
    : "";

  return `
    <details class="${embedded ? "score-details score-details--embedded" : "section-card score-details"}" ${open ? "open" : ""}>
      <summary>Score details</summary>
      <p class="muted">A current-page SEO score based on checks in this extension. SEO Score starts from 100 points across 8 current-page sections. Detected issues subtract points. Critical issues can cap the final score.</p>
      ${renderTable(["Section", "Max", "Current"], sectionRows, { compact: true })}
      <div class="section-subtitle">Score deductions</div>
      ${
        scoreDeductions.length
          ? `<ul class="score-details__list">${scoreDeductions.join("")}</ul>`
          : '<div class="passed-item">No score deductions detected.</div>'
      }
      <div class="section-subtitle">Critical cap status</div>
      <div class="passed-item score-details__cap">${escapeHtml(capText)}</div>
      ${infoOnlyMarkup}
    </details>
  `;
}

function renderIssueCards(title, issues, emptyState) {
  return `
    <section class="section-card report-group">
      <div class="section-row">
        <div>
          <div class="eyebrow">Issues</div>
          <h2 class="section-title">${escapeHtml(title)}</h2>
        </div>
      </div>
      <div class="issue-list">
        ${
          issues.length
            ? issues
                .map(
                  (issue) => {
                    const scoreMeta = issue.infoOnly
                      ? '<span class="muted">Diagnostic insight, no score loss</span>'
                      : `<span class="impact-badge impact-badge--${issue.severity}">Impact: -${issue.scoreImpact} points</span>`;
                    return `
                      <article class="issue issue--${issue.severity}">
                        <div class="fix-row">
                          <h3 class="fix-title">${escapeHtml(issue.title)}</h3>
                          <span class="impact-badge impact-badge--${issue.severity}">${escapeHtml(issue.infoOnly ? "Insight" : issue.severity)}</span>
                        </div>
                        <p class="issue__text">${escapeHtml(issue.recommendation)}</p>
                        <div class="meta-row">
                          ${scoreMeta}
                        </div>
                      </article>
                    `;
                  }
                )
                .join("")
            : `<article class="passed-item">${escapeHtml(emptyState)}</article>`
        }
      </div>
    </section>
  `;
}

function getSectionIssues(data, sectionKeys) {
  return data.audit.issues.filter((issue) => !issue.passed && sectionKeys.includes(issue.section));
}

function getStructuredIssues(data) {
  return data.audit.issues.filter(
    (issue) =>
      !issue.passed &&
      (issue.section === "secondary" || issue.section === "schema" || issue.id === "jsonld_missing_or_invalid" || issue.id === "jsonld_invalid")
  );
}

function renderRobotsTxtSummary(robotsTxt) {
  const sitemapUrls = robotsTxt.sitemapUrls || [];
  const sitemapCount = robotsTxt.sitemapCount || 0;
  const robotsUrl = robotsTxt.url || "";

  return `
    <section class="section-card report-group">
      <div class="section-row">
        <div>
          <div class="eyebrow">Discovery</div>
          <h2 class="section-title">Robots.txt and sitemaps</h2>
        </div>
      </div>
      <p class="muted">Site-level robots.txt reference. Informational only. Not used in the current-page SEO Score.</p>
      <div class="robots-sitemaps">
        <div class="section-subtitle">Robots.txt</div>
        ${
          robotsUrl
            ? `<div class="robots-sitemaps__list"><div class="robots-sitemaps__item">${renderInteractiveValue(robotsUrl)}</div></div>`
            : '<div class="passed-item">No robots.txt URL was checked.</div>'
        }
      </div>
      <div class="robots-sitemaps">
        <div class="section-subtitle">Sitemaps</div>
        ${
          sitemapCount
            ? `
              <div class="robots-sitemaps__summary">
                Showing ${sitemapUrls.length} of ${sitemapCount} sitemap URL${sitemapCount === 1 ? "" : "s"} declared in robots.txt.
              </div>
              <div class="robots-sitemaps__list">
                ${sitemapUrls
                  .map((url) => `<div class="robots-sitemaps__item">${renderInteractiveValue(url)}</div>`)
                  .join("")}
              </div>
            `
            : '<div class="passed-item">No sitemap directives found in robots.txt.</div>'
        }
      </div>
    </section>
  `;
}

const PAGE_METRIC_HELP_EXCLUDED = new Set([
  "URL",
  "Lang",
  "Has viewport",
  "Responsive viewport",
  "URL length",
  "Query params"
]);

function renderPageMetricLabel(label) {
  const safeLabel = escapeHtml(label);

  if (PAGE_METRIC_HELP_EXCLUDED.has(label)) {
    return {
      html: safeLabel
    };
  }

  return {
    html: `<span class="label-with-help"><span>${safeLabel}</span>${renderHelpTip(label)}</span>`
  };
}

function renderPageTab(data) {
  const pageData = data.pageData;
  const rows = [
    [renderPageMetricLabel("URL"), pageData.url],
    [renderPageMetricLabel("Hostname"), pageData.hostname],
    [renderPageMetricLabel("Title"), pageData.title.text],
    [renderPageMetricLabel("Title length"), renderLengthMetric(pageData.title.length, TITLE_THRESHOLDS)],
    [renderPageMetricLabel("Meta description"), pageData.metaDescription.text],
    [renderPageMetricLabel("Meta description length"), renderLengthMetric(pageData.metaDescription.length, META_DESCRIPTION_THRESHOLDS)],
    [renderPageMetricLabel("Canonical"), pageData.canonical.href],
    [renderPageMetricLabel("Canonical exists"), pageData.canonical.exists],
    [renderPageMetricLabel("Canonical valid"), pageData.canonical.isValid],
    [renderPageMetricLabel("Canonical matches current URL"), pageData.canonical.pointsToCurrentUrl],
    [renderPageMetricLabel("Robots meta"), pageData.robots.content],
    [renderPageMetricLabel("Googlebot"), pageData.robots.googlebotContent],
    [renderPageMetricLabel("Noindex"), pageData.robots.noindex],
    [renderPageMetricLabel("Nofollow"), pageData.robots.nofollow],
    [renderPageMetricLabel("Lang"), pageData.technical.lang],
    [renderPageMetricLabel("Charset"), pageData.technical.charset],
    [renderPageMetricLabel("Viewport"), pageData.technical.viewport],
    [renderPageMetricLabel("Has viewport"), pageData.technical.hasViewport],
    [renderPageMetricLabel("Responsive viewport"), pageData.technical.hasResponsiveViewport],
    [renderPageMetricLabel("URL length"), pageData.urlSignals.length],
    [renderPageMetricLabel("Path depth"), pageData.urlSignals.pathDepth],
    [renderPageMetricLabel("Query params"), pageData.urlSignals.queryParamCount],
    [renderPageMetricLabel("Slug reflects topic"), pageData.urlSignals.reflectsTopic]
  ];
  const pageIssues = getSectionIssues(data, ["indexability", "metadata"]).concat(
    data.audit.issues.filter(
      (issue) =>
        !issue.passed &&
        issue.section === "technical" &&
        issue.id !== "jsonld_missing_or_invalid" &&
        issue.id !== "jsonld_invalid"
    )
  );

  return `
    <div class="sections">
      ${renderIssueCards("Indexability, metadata, and technical basics", pageIssues, "No page-level issues found.")}
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Meta</div>
            <h2 class="section-title">Meta tags and page signals</h2>
          </div>
        </div>
        ${renderTable(["Field", "Value"], rows)}
      </section>
    </div>
  `;
}

function renderLinksTab(data) {
  const rows = data.pageData.links.items.map((item) => [
    item.text,
    item.type,
    item.followType,
    item.urlKind,
    item.href
  ]);

  return `
    <div class="sections">
      ${renderIssueCards("Link issues", getSectionIssues(data, ["links"]), "No link issues found.")}
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Links</div>
            <h2 class="section-title">Page links inventory</h2>
          </div>
          <button type="button" class="button button--secondary" data-action="export-links-csv">Export as CSV</button>
        </div>
        <div class="link-stats" aria-label="Link statistics">
          ${renderStatBadge("Total", data.pageData.links.total)}
          ${renderStatBadge("Internal", data.pageData.links.internal, "stat-badge--internal", { showHelp: true })}
          ${renderStatBadge("External", data.pageData.links.external, "stat-badge--external", { showHelp: true })}
          ${renderStatBadge("Placeholder", data.pageData.links.placeholders, "stat-badge--warning", { showHelp: true })}
          ${renderStatBadge("Contextual internal", data.pageData.links.contextualInternal, "stat-badge--internal", { showHelp: true })}
          ${renderStatBadge("Generic anchors", data.pageData.links.genericAnchorCount, "", { showHelp: true })}
        </div>
        ${renderTable(["Anchor text", "Type", "Follow", "URL kind", "URL"], rows)}
      </section>
    </div>
  `;
}

function renderContentTab(data) {
  const headingRows = data.pageData.headings.items.map((item) => [
    "H" + item.level,
    item.text || "(empty heading)"
  ]);

  return `
    <div class="sections">
      ${renderIssueCards("Header issues", getSectionIssues(data, ["headings"]), "No header issues found.")}
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Headers</div>
            <h2 class="section-title">Header structure and content depth</h2>
          </div>
        </div>
        <div class="value-list">
          <div class="value-row">
            <div class="value-label">${renderHelpLabel("Heading counts")}</div>
            <div class="value-value">
              <div class="heading-stats" aria-label="Heading counts">
                ${renderStatBadge("H1", data.pageData.headings.counts.h1)}
                ${renderStatBadge("H2", data.pageData.headings.counts.h2)}
                ${renderStatBadge("H3", data.pageData.headings.counts.h3)}
                ${renderStatBadge("H4", data.pageData.headings.counts.h4)}
                ${renderStatBadge("H5", data.pageData.headings.counts.h5)}
                ${renderStatBadge("H6", data.pageData.headings.counts.h6)}
              </div>
            </div>
          </div>
          ${renderValueRow("Skipped levels", data.pageData.headings.hasSkippedLevels ? data.pageData.headings.skipExamples.join(", ") || "Yes" : "No")}
          ${renderValueRow("Total headings", data.pageData.headings.total)}
          ${renderValueRow("Content depth", data.pageData.readability.contentDepth + " (" + data.pageData.readability.totalWords + " words across " + data.pageData.readability.paragraphCount + " paragraphs)")}
          ${renderValueRow("Long paragraphs", data.pageData.readability.longParagraphs)}
        </div>
        <div class="section-subtitle">Headers</div>
        ${renderTable(["Level", "Text"], headingRows, { compact: true })}
      </section>
    </div>
  `;
}

function renderImagesTab(data) {
  const images = data.pageData.images;
  const missingAltImages = images.missingAltSamples || [];
  const imagesWithAlt = images.imagesWithAlt || [];

  return `
    <div class="sections">
      ${renderIssueCards("Image issues", getSectionIssues(data, ["images"]), "No image issues found.")}
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Images</div>
            <h2 class="section-title">Image alt text and file signals</h2>
          </div>
        </div>
        <div class="value-list">
          ${renderValueRow("Total images", images.total)}
          ${renderValueRow("Meaningful images", images.meaningfulTotal)}
          ${renderValueRow("Missing image alts", images.missingAlt + " of " + images.meaningfulTotal + " meaningful images")}
          ${renderValueRow("Missing alt percentage", formatPercentage(images.missingAltRatio))}
          ${renderValueRow("Generic image filenames", images.genericFilenameCount)}
          ${renderValueRow("Images without dimensions", images.missingDimensionsCount)}
        </div>
        <div class="section-subtitle">Images missing alt</div>
        <p class="muted">Showing ${missingAltImages.length} of ${images.missingAlt} images missing alt.</p>
        ${
          missingAltImages.length
            ? renderTable(
                ["Image", "Alt", "Size"],
                missingAltImages.map((item) => [
                  item.src,
                  item.alt || "(missing)",
                  item.width + "x" + item.height
                ]),
                { compact: true }
              )
            : '<div class="passed-item">No images missing alt.</div>'
        }
        <div class="section-subtitle">Images with alt text</div>
        <p class="muted">Showing ${imagesWithAlt.length} meaningful images with non-empty alt text.</p>
        ${
          imagesWithAlt.length
            ? renderTable(
                ["Image", "Alt", "Size"],
                imagesWithAlt.map((item) => [
                  item.src,
                  item.alt,
                  item.width + "x" + item.height
                ]),
                { compact: true }
              )
            : '<div class="passed-item">No meaningful images with alt text found.</div>'
        }
      </section>
    </div>
  `;
}

function renderSocialTab(data) {
  const structuredDataHelp =
    "This block summarizes JSON-LD structured data found on the page: total blocks, valid and invalid blocks, and detected Schema.org types.";
  const socialPreviewHelp =
    "This block shows Open Graph and Twitter/X preview tags used by social platforms when the page is shared: title, description, image, and card type.";
  const socialRows = [
    [{ html: escapeHtml("OG title") }, data.pageData.openGraph.title],
    [{ html: escapeHtml("OG description") }, data.pageData.openGraph.description],
    [{ html: escapeHtml("OG image") }, data.pageData.openGraph.image],
    [{ html: escapeHtml("Twitter card") }, data.pageData.twitter.card],
    [{ html: escapeHtml("Twitter title") }, data.pageData.twitter.title],
    [{ html: escapeHtml("Twitter description") }, data.pageData.twitter.description],
    [{ html: escapeHtml("Twitter image") }, data.pageData.twitter.image]
  ];

  const jsonLdRows = [
    [{ html: escapeHtml("JSON-LD blocks") }, data.pageData.jsonLd.count],
    [{ html: escapeHtml("Valid JSON-LD") }, data.pageData.jsonLd.validCount],
    [{ html: escapeHtml("Invalid JSON-LD") }, data.pageData.jsonLd.invalidCount],
    [{ html: escapeHtml("Schema types") }, data.pageData.jsonLd.types.join(", ") || "(none)"]
  ];

  return `
    <div class="sections">
      ${renderIssueCards("Schema and preview issues", getStructuredIssues(data), "No schema or preview issues found.")}
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Schema</div>
            <h2 class="section-title">Structured data and preview tags</h2>
          </div>
        </div>
        <p class="muted">Schema and preview tags detected on the current page.</p>
        <div class="section-subtitle section-subtitle--with-help">
          <span>Structured Data</span>
          ${renderHelpTip("Structured data", structuredDataHelp)}
        </div>
        ${renderTable(["Field", "Value"], jsonLdRows, { compact: true })}
        <div class="section-subtitle section-subtitle--with-help">
          <span>Social Preview Tags</span>
          ${renderHelpTip("Open Graph and Twitter", socialPreviewHelp)}
        </div>
        ${renderTable(["Field", "Value"], socialRows, { compact: true })}
        <div class="section-subtitle">
          ${renderHelpLabel(
            "Commercial Signals",
            "Detected business or conversion terms on the current page. Used only to prioritize SEO fixes, not to estimate revenue."
          )}
        </div>
        <div class="value-list">
          ${renderValueRow("Detected", data.pageData.commercialIntent.detected)}
          ${renderValueRow("Matched terms", data.pageData.commercialIntent.matchedTerms)}
        </div>
      </section>
    </div>
  `;
}

function renderResourcesTab(data, options = {}) {
  const { includeActions = true } = options;
  const externalResourcesHelp = "Resources loaded from another URL or host, such as external CSS, JavaScript, images, or preloads.";
  const inlineResourcesHelp = "Resources embedded directly in the page HTML, such as inline style or script blocks without their own URL.";
  const resourcesHelp =
    "Scripts, stylesheets, and HTML resources detected on the current page. Informational only; these counts do not affect the SEO Score.";
  const resources = data.pageData.resources || {
    html: [],
    css: [],
    js: [],
    total: 0,
    externalTotal: 0,
    inlineTotal: 0
  };
  const rows = [
    ...resources.html.map((item) => [item.type, item.kind, item.url]),
    ...resources.css.map((item) => [item.type, item.kind, item.url]),
    ...resources.js.map((item) => [item.type, item.kind, item.url])
  ];
  const exportMarkup = includeActions && rows.length
    ? '<button type="button" class="button button--secondary resource-export-button" data-action="export-resources-csv">Export as CSV</button>'
    : "";

  return `
    <div class="sections">
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Resources</div>
            <h2 class="section-title">Page resources ${renderHelpTip("Resources", resourcesHelp)}</h2>
          </div>
        </div>
        <p class="muted">HTML, CSS, and JavaScript resources detected from the current-page DOM. Informational only; resource counts do not affect the SEO Score.</p>
        <div class="link-stats resource-stats" aria-label="Page resource statistics">
          ${renderStatBadge("HTML", resources.html.length)}
          ${renderStatBadge("CSS", resources.css.length)}
          ${renderStatBadge("JS", resources.js.length)}
          ${renderStatBadge("External", resources.externalTotal, "", { showHelp: true, helpText: externalResourcesHelp })}
          ${renderStatBadge("Inline", resources.inlineTotal, "", { showHelp: true, helpText: inlineResourcesHelp })}
          ${renderStatBadge("Total", resources.total)}
          ${exportMarkup}
        </div>
        ${
          rows.length
            ? `
              <p class="muted">Showing all ${rows.length} resources.</p>
              ${renderTable(["Type", "Kind", "Resource"], rows)}
            `
            : '<div class="passed-item">No page resources detected.</div>'
        }
      </section>
    </div>
  `;
}

function renderTabNav(activeTab) {
  const tabs = [
    ["overview", "Summary"],
    ["page", "Meta"],
    ["headers", "Headers"],
    ["images", "Images"],
    ["links", "Links"],
    ["social", "Schema"],
    ["resources", "Resources"]
  ];

  return `
    <nav class="tabs" aria-label="SEO report tabs">
      ${tabs
        .map(
          ([id, label]) => `
            <button
              type="button"
              class="tab-button ${activeTab === id ? "tab-button--active" : ""}"
              data-action="switch-tab"
              data-tab="${id}"
            >
              ${escapeHtml(label)}
            </button>
          `
        )
        .join("")}
    </nav>
  `;
}

function renderActiveTab(data, activeTab) {
  if (activeTab === "page") {
    return renderPageTab(data);
  }

  if (activeTab === "links") {
    return renderLinksTab(data);
  }

  if (activeTab === "headers" || activeTab === "content") {
    return renderContentTab(data);
  }

  if (activeTab === "images") {
    return renderImagesTab(data);
  }

  if (activeTab === "social") {
    return renderSocialTab(data);
  }

  if (activeTab === "resources") {
    return renderResourcesTab(data);
  }

  return `
    <div class="report-stack">
      ${renderTopFixes(data.topFixes)}
      ${renderSerpPreview(data.serpPreview)}
      ${renderRobotsTxtSummary(data.pageData.robotsTxt || {})}
      ${renderSectionSummary(data.audit)}
    </div>
  `;
}

export function renderReportView(data, activeTab) {
  const summaryMarkup =
    activeTab === "overview"
      ? `
        <div class="report-summary">
          ${renderScore(data.audit, { detailsMarkup: renderScoreDetails(data.audit, { embedded: true }) })}
          ${renderRisk(data.risk)}
        </div>
      `
      : "";

  return `
    <section class="report-card">
      <div class="report-card__header">
        ${renderTabNav(activeTab)}
        <button type="button" class="button button--secondary" data-action="export-pdf">Export Report</button>
      </div>
      <div class="report-card__body">
        ${summaryMarkup}
        <div class="report-tab-panel">
          ${renderActiveTab(data, activeTab)}
        </div>
      </div>
    </section>
  `;
}

export const PRINTABLE_REPORT_STYLES = `
  :root {
    color-scheme: light;
    --bg: #f3f6fb;
    --surface: #ffffff;
    --text: #0f172a;
    --muted: #64748b;
    --border: #dbe3ef;
    --surface-alt: #f8fafc;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .page-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 24px;
    background: rgba(243, 246, 251, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
  }
  .page-header__meta {
    min-width: 0;
  }
  .page-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .action-button {
    border: 1px solid var(--border);
    background: #ffffff;
    color: var(--text);
    border-radius: 10px;
    padding: 10px 14px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .action-button--primary {
    background: #e8f0ff;
    border-color: #bfd4ff;
    color: #1d4ed8;
  }
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #bfd4ff;
    border-radius: 10px;
    padding: 10px 14px;
    background: #f4f8ff;
    color: #1d4ed8;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .wrap {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px;
    display: grid;
    gap: 16px;
  }
  .report-summary {
    display: grid;
    gap: 16px;
  }
  .card,
  .print-tab,
  .report-panel,
  .score-card,
  .risk-card,
  .serp-preview,
  .top-fixes,
  .section-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px;
    page-break-inside: avoid;
  }
  .grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .title {
    margin: 0;
    font-size: 28px;
  }
  .muted { color: var(--muted); }
  .label-with-help {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    vertical-align: middle;
  }
  .help-tip {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 17px;
    height: 17px;
    border: 1px solid #d4deea;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.86);
    color: #8fa0b6;
    cursor: help;
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
    vertical-align: middle;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  }
  .help-tip::before,
  .help-tip::after {
    display: none;
  }
  .help-tip:hover,
  .help-tip:focus-visible {
    border-color: #b7c5d8;
    color: #1d4ed8;
    outline: 0;
  }
  .help-tooltip {
    position: fixed;
    z-index: 2000;
    width: max-content;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
    color: var(--text);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 1.35;
    opacity: 0;
    pointer-events: none;
    text-align: left;
    text-transform: none;
    transition: opacity 150ms ease, visibility 150ms ease;
    visibility: hidden;
    white-space: normal;
  }
  .help-tooltip--visible {
    opacity: 1;
    visibility: visible;
  }
  .help-tooltip__arrow {
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    transform: rotate(45deg);
  }
  .help-tooltip[data-placement="top"] .help-tooltip__arrow {
    bottom: -5px;
    transform: translateX(-50%) rotate(45deg);
  }
  .help-tooltip[data-placement="bottom"] .help-tooltip__arrow {
    top: -5px;
    transform: translateX(-50%) rotate(45deg);
  }
  .help-tooltip[data-placement="right"] .help-tooltip__arrow {
    left: -5px;
    transform: translateY(-50%) rotate(45deg);
  }
  .help-tooltip[data-placement="left"] .help-tooltip__arrow {
    right: -5px;
    transform: translateY(-50%) rotate(45deg);
  }
  .section-title { margin: 0 0 12px; font-size: 18px; }
  .section-subtitle {
    margin-top: 16px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .section-subtitle--with-help {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .eyebrow {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .list,
  .report-list,
  .report-stack,
  .sections,
  .top-fixes,
  .top-fixes__list,
  .print-tab,
  .value-list {
    display: grid;
    gap: 10px;
  }
  .item,
  .report-item,
  .value-row,
  .fix-item,
  .issue,
  .passed-item {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
    background: var(--surface-alt);
  }
  .item h3,
  .report-item__title,
  .fix-title {
    margin: 0 0 6px;
    font-size: 14px;
    font-weight: 700;
  }
  .score-details summary {
    cursor: pointer;
    font-weight: 700;
  }
  .score-details--embedded {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }
  .score-details__list {
    margin: 8px 0 0;
    padding-left: 18px;
    color: var(--muted);
  }
  .score-details__list li + li {
    margin-top: 4px;
  }
  .score-details__cap {
    margin-top: 8px;
  }
  .report-item__meta {
    color: var(--muted);
    margin-bottom: 6px;
    font-size: 12px;
  }
  .value-row {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 12px;
    padding: 10px 12px;
  }
  .value-label { font-weight: 700; }
  .value-value { word-break: break-word; }
  .metric-value {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 3px 8px;
    border-radius: 999px;
    font-weight: 800;
  }
  .metric-value--good {
    color: #0f9f6e;
    background: rgba(15, 159, 110, 0.1);
  }
  .metric-value--warn {
    color: #d97706;
    background: rgba(217, 119, 6, 0.12);
  }
  .metric-value--danger {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
  }
  .metric-target {
    display: inline-flex;
    align-items: center;
    margin-left: 8px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.35;
  }
  .table-shell {
    margin-top: 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: visible;
    background: var(--surface-alt);
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .data-table th,
  .data-table td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .data-table th {
    background: #f4f7fc;
    color: var(--muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .data-table tr:last-child td {
    border-bottom: 0;
  }
  .link-stats,
  .heading-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .resource-stats {
    align-items: center;
  }
  .resource-export-button {
    margin-left: auto;
    min-height: 30px;
    padding: 5px 12px;
  }
  .stat-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: #f4f7fc;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }
  .stat-badge strong {
    color: var(--text);
    font-weight: 800;
  }
  .stat-badge--internal {
    border-color: rgba(15, 159, 110, 0.22);
    background: rgba(15, 159, 110, 0.08);
  }
  .stat-badge--external {
    border-color: rgba(37, 99, 235, 0.22);
    background: rgba(37, 99, 235, 0.08);
  }
  .stat-badge--warning {
    border-color: rgba(217, 119, 6, 0.24);
    background: rgba(217, 119, 6, 0.1);
  }
  .badge--good {
    color: #0f9f6e;
    background: rgba(15, 159, 110, 0.1);
  }
  .badge--warn {
    color: #d97706;
    background: rgba(217, 119, 6, 0.12);
  }
  .badge--danger {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
  }
  .robots-sitemaps {
    margin-top: 12px;
  }
  .robots-sitemaps__summary {
    margin-top: 8px;
    color: var(--muted);
    font-size: 12px;
  }
  .robots-sitemaps__list {
    display: grid;
    gap: 6px;
    margin-top: 8px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-alt);
    overflow: visible;
  }
  .robots-sitemaps__item {
    min-width: 0;
    padding: 6px 8px;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .robots-sitemaps__item .value-link {
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .value-link {
    position: relative;
    display: inline;
    color: #2563eb;
    border-radius: 6px;
    padding: 1px 3px;
    margin: -1px -3px;
    text-decoration: none;
    transition: background-color 160ms ease, box-shadow 160ms ease, color 160ms ease;
  }
  .value-link:hover,
  .value-link:focus-visible {
    color: #1d4ed8;
    background: rgba(37, 99, 235, 0.1);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.06);
    outline: 0;
  }
  .value-link__text {
    display: inline;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .value-link--image {
    display: inline-block;
    max-width: 100%;
    vertical-align: top;
  }
  .image-preview {
    position: absolute;
    left: 0;
    top: calc(100% + 8px);
    z-index: 80;
    display: none;
    width: 220px;
    max-width: calc(100vw - 48px);
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
    opacity: 0;
    pointer-events: none;
    transform: translateY(-4px);
    transition: opacity 180ms ease, transform 180ms ease;
  }
  .image-preview img {
    display: block;
    width: 100%;
    max-height: 150px;
    object-fit: contain;
    border-radius: 8px;
    background: var(--surface-alt);
  }
  .value-link:hover .image-preview,
  .value-link:focus-visible .image-preview {
    display: block;
    opacity: 1;
    transform: translateY(0);
  }
  .progress-track {
    width: 100%;
    height: 10px;
    background: #e8edf5;
    border-radius: 999px;
    overflow: hidden;
    margin-top: 10px;
  }
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #2563eb, #0f9f6e);
    border-radius: 999px;
  }
  .report-panel__header,
  .summary-header,
  .section-row,
  .fix-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .panel-title {
    margin: 0;
    font-size: 18px;
  }
  .badge,
  .risk-badge,
  .pill,
  .section-badge,
  .impact-badge,
  .confidence-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 4px 10px;
    border-radius: 999px;
    background: #eef3f9;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }
  .risk-badge--low,
  .impact-badge--low {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.1);
  }
  .risk-badge--medium,
  .impact-badge--medium {
    color: #d97706;
    background: rgba(217, 119, 6, 0.12);
  }
  .risk-badge--high,
  .impact-badge--high {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
  }
  .confidence-badge--low {
    color: var(--muted);
    background: #eef3f9;
  }
  .confidence-badge--medium {
    color: #d97706;
    background: rgba(217, 119, 6, 0.12);
  }
  .confidence-badge--high {
    color: #0f9f6e;
    background: rgba(15, 159, 110, 0.1);
  }
  .panel-meta,
  .meta-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin: 10px 0 12px;
    color: var(--muted);
    font-size: 12px;
  }
  .report-sections,
  .raw-data .sections {
    display: grid;
    gap: 12px;
  }
  .print-note {
    margin-top: 8px;
    color: var(--muted);
  }
  .serp-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-alt);
    padding: 12px;
  }
  .serp-card a {
    color: #188038;
    text-decoration: none;
    word-break: break-all;
  }
  .serp-card .value-link:hover,
  .serp-card .value-link:focus-visible {
    color: #1d4ed8;
  }
  .serp-card h3 {
    margin: 8px 0 6px;
    color: #1a0dab;
    font-size: 18px;
  }
  .serp-preview__url {
    display: block;
    color: #188038;
    word-break: break-all;
  }
  .serp-preview__title {
    margin: 0;
    color: #1a0dab;
  }
  .serp-preview__note {
    color: var(--muted);
    font-size: 12px;
  }
  .report-score-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .report-kpi {
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
    padding: 16px;
  }
  .report-kpi__value {
    font-size: 44px;
    font-weight: 800;
    line-height: 1;
    margin: 10px 0 6px;
  }
  .report-kpi__subtitle,
  .score-label,
  .issue__text {
    color: var(--muted);
  }
  .score-row,
  .risk-row,
  .section-row,
  .fix-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .score-number {
    font-size: 44px;
    font-weight: 800;
    line-height: 1;
    margin: 8px 0 6px;
  }
  .score-card,
  .risk-card,
  .top-fixes,
  .serp-preview,
  .section-card {
    box-shadow: none;
  }
  .print-tab {
    page-break-inside: auto;
    break-inside: auto;
  }
  .print-tab + .print-tab {
    margin-top: 16px;
  }
  .print-tab__title {
    margin: 0;
    font-size: 22px;
  }
  .print-tab .button {
    display: none;
  }
  @media print {
    body { background: white; }
    .page-header { display: none; }
    .wrap {
      display: block;
      max-width: none;
    }
    .print-tab {
      margin-bottom: 16px;
      break-inside: auto;
      page-break-inside: auto;
    }
    .print-tab + .print-tab {
      break-before: page;
      page-break-before: always;
    }
    .help-tip,
    .help-tooltip,
    .image-preview {
      display: none;
    }
  }
  @media (max-width: 900px) {
    .grid,
    .report-score-grid {
      grid-template-columns: 1fr;
    }
    .page-header {
      align-items: flex-start;
      flex-direction: column;
    }
    .value-row {
      grid-template-columns: 1fr;
    }
  }
`;

function renderPrintableTab(title, markup) {
  return `
    <section class="print-tab">
      <div>
        <div class="eyebrow">Report section</div>
        <h2 class="print-tab__title">${escapeHtml(title)}</h2>
      </div>
      ${markup}
    </section>
  `;
}

export function buildPrintableReport(data) {
  return `
    <header class="page-header">
      <div class="page-header__meta">
        <h1 class="title">SEO Score Checker Report</h1>
        <div class="muted">${renderInteractiveValue(data.pageData.url || "")}</div>
        <div class="print-note">This report is based on the current page only. It does not crawl an entire domain. Page content is not sent to a server.</div>
      </div>
      <div class="page-actions">
        <button type="button" class="action-button" id="close-report">Close</button>
        <button type="button" class="action-button" id="print-report">Print</button>
        <button type="button" class="action-button action-button--primary" id="export-report-markdown">Export as Markdown</button>
      </div>
    </header>
    <main class="wrap">
      ${renderPrintableTab(
        "Summary",
        `
          <div class="muted">This report is based on the current page only. It does not crawl an entire domain. Page content is not sent to a server.</div>
          <div class="report-summary">
            ${renderScore(data.audit, { detailsMarkup: renderScoreDetails(data.audit, { embedded: true, open: true }) })}
            ${renderRisk(data.risk)}
          </div>
          ${renderActiveTab(data, "overview")}
        `
      )}
      ${renderPrintableTab("Meta", renderPageTab(data))}
      ${renderPrintableTab("Headers", renderContentTab(data))}
      ${renderPrintableTab("Images", renderImagesTab(data))}
      ${renderPrintableTab("Links", renderLinksTab(data))}
      ${renderPrintableTab("Schema", renderSocialTab(data))}
      ${renderPrintableTab("Resources", renderResourcesTab(data, { includeActions: false }))}
    </main>
  `;
}
