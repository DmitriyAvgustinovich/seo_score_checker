import { escapeHtml } from "./escapeHtml.js";
import {
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

function renderValueRow(label, value) {
  return `
    <div class="value-row">
      <div class="value-label">${renderHelpLabel(label)}</div>
      <div class="value-value">${renderInteractiveValue(value)}</div>
    </div>
  `;
}

function renderStatBadge(label, value, modifier = "") {
  return `
    <span class="stat-badge ${modifier}">
      <span>${renderHelpLabel(label)}</span>
      <strong>${renderInteractiveValue(value)}</strong>
    </span>
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
                      : `<span class="impact-badge impact-badge--${issue.severity}">Impact: -${issue.scoreImpact} points ${renderHelpTip("Impact")}</span>`;
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

function renderRobotsTxtSitemaps(robotsTxt) {
  const sitemapUrls = robotsTxt.sitemapUrls || [];
  const sitemapCount = robotsTxt.sitemapCount || 0;

  if (!sitemapCount) {
    return `
      <div class="robots-sitemaps">
        <div class="section-subtitle">Robots.txt sitemaps</div>
        <div class="passed-item">No sitemap directives found in robots.txt.</div>
      </div>
    `;
  }

  return `
    <div class="robots-sitemaps">
      <div class="section-subtitle">Robots.txt sitemaps</div>
      <div class="robots-sitemaps__summary">
        Showing ${sitemapUrls.length} of ${sitemapCount} sitemap URL${sitemapCount === 1 ? "" : "s"} declared in robots.txt.
      </div>
      <div class="robots-sitemaps__list">
        ${sitemapUrls
          .map((url) => `<div class="robots-sitemaps__item">${renderInteractiveValue(url)}</div>`)
          .join("")}
      </div>
    </div>
  `;
}

function renderPageTab(data) {
  const pageData = data.pageData;
  const robotsTxt = pageData.robotsTxt || {};
  const rows = [
    ["URL", pageData.url],
    ["Hostname", pageData.hostname],
    ["Title", pageData.title.text],
    ["Title length", renderLengthMetric(pageData.title.length, TITLE_THRESHOLDS)],
    ["Meta description", pageData.metaDescription.text],
    ["Meta description length", renderLengthMetric(pageData.metaDescription.length, META_DESCRIPTION_THRESHOLDS)],
    ["Canonical", pageData.canonical.href],
    ["Canonical exists", pageData.canonical.exists],
    ["Canonical valid", pageData.canonical.isValid],
    ["Canonical matches current URL", pageData.canonical.pointsToCurrentUrl],
    ["Robots meta", pageData.robots.content],
    ["Googlebot", pageData.robots.googlebotContent],
    ["Noindex", pageData.robots.noindex],
    ["Nofollow", pageData.robots.nofollow],
    ["Robots.txt URL", robotsTxt.url || ""],
    ["Robots.txt status", robotsTxt.status || "not checked"],
    ["Robots.txt HTTP status", robotsTxt.statusCode || "(unknown)"],
    ["Robots.txt size", robotsTxt.size ? robotsTxt.size + " characters" : "(none)"],
    ["Robots.txt allow rules", robotsTxt.allowCount || 0],
    ["Robots.txt disallow rules", robotsTxt.disallowCount || 0],
    ["Robots.txt sitemap directives", robotsTxt.sitemapCount || 0],
    ["Lang", pageData.technical.lang],
    ["Charset", pageData.technical.charset],
    ["Viewport", pageData.technical.viewport],
    ["Has viewport", pageData.technical.hasViewport],
    ["Responsive viewport", pageData.technical.hasResponsiveViewport],
    ["URL length", pageData.urlSignals.length],
    ["Path depth", pageData.urlSignals.pathDepth],
    ["Query params", pageData.urlSignals.queryParamCount],
    ["Slug reflects topic", pageData.urlSignals.reflectsTopic]
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
        ${renderRobotsTxtSitemaps(robotsTxt)}
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
          <button type="button" class="button button--secondary" data-action="export-links-csv">Export CSV</button>
        </div>
        <div class="link-stats" aria-label="Link statistics">
          ${renderStatBadge("Total", data.pageData.links.total)}
          ${renderStatBadge("Internal", data.pageData.links.internal, "stat-badge--internal")}
          ${renderStatBadge("External", data.pageData.links.external, "stat-badge--external")}
          ${renderStatBadge("Placeholder", data.pageData.links.placeholders, "stat-badge--warning")}
          ${renderStatBadge("Contextual internal", data.pageData.links.contextualInternal, "stat-badge--internal")}
          ${renderStatBadge("Generic anchors", data.pageData.links.genericAnchorCount)}
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
          ${renderValueRow("Total images", data.pageData.images.total)}
          ${renderValueRow("Meaningful images", data.pageData.images.meaningfulTotal)}
          ${renderValueRow("Missing image alts", data.pageData.images.missingAlt + " of " + data.pageData.images.meaningfulTotal + " meaningful images")}
          ${renderValueRow("Missing alt ratio", data.pageData.images.missingAltRatio)}
          ${renderValueRow("Generic image filenames", data.pageData.images.genericFilenameCount)}
          ${renderValueRow("Images without dimensions", data.pageData.images.missingDimensionsCount)}
        </div>
        <div class="section-subtitle">Images missing alt</div>
        ${
          data.pageData.images.missingAltSamples.length
            ? renderTable(
                ["Image", "Alt", "Size"],
                data.pageData.images.missingAltSamples.map((item) => [
                  item.src,
                  item.alt || "(missing)",
                  item.width + "x" + item.height
                ]),
                { compact: true }
              )
            : '<div class="passed-item">No missing alt samples.</div>'
        }
      </section>
    </div>
  `;
}

function renderSocialTab(data) {
  const socialRows = [
    ["OG title", data.pageData.openGraph.title],
    ["OG description", data.pageData.openGraph.description],
    ["OG image", data.pageData.openGraph.image],
    ["Twitter card", data.pageData.twitter.card],
    ["Twitter title", data.pageData.twitter.title],
    ["Twitter description", data.pageData.twitter.description],
    ["Twitter image", data.pageData.twitter.image]
  ];

  const jsonLdRows = [
    ["JSON-LD blocks", data.pageData.jsonLd.count],
    ["Valid JSON-LD", data.pageData.jsonLd.validCount],
    ["Invalid JSON-LD", data.pageData.jsonLd.invalidCount],
    ["Schema types", data.pageData.jsonLd.types.join(", ") || "(none)"]
  ];

  return `
    <div class="sections">
      ${renderIssueCards("Social and schema issues", getStructuredIssues(data), "No social or schema issues found.")}
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Social</div>
            <h2 class="section-title">Social preview and schema signals</h2>
          </div>
        </div>
        <div class="section-subtitle">Structured data</div>
        ${renderTable(["Field", "Value"], jsonLdRows, { compact: true })}
        <div class="section-subtitle">Open Graph and Twitter</div>
        ${renderTable(["Field", "Value"], socialRows, { compact: true })}
        <div class="section-subtitle">${renderHelpLabel("Commercial intent")}</div>
        <div class="value-list">
          ${renderValueRow("Detected", data.pageData.commercialIntent.detected)}
          ${renderValueRow("Matched terms", data.pageData.commercialIntent.matchedTerms)}
        </div>
      </section>
    </div>
  `;
}

function renderResourcesTab(data, options = {}) {
  const RESOURCE_DISPLAY_LIMIT = 100;
  const { includeActions = true, showAll = Boolean(data.resourcesExpanded) } = options;
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
  const visibleRows = showAll ? rows : rows.slice(0, RESOURCE_DISPLAY_LIMIT);
  const canExpand = includeActions && !showAll && rows.length > RESOURCE_DISPLAY_LIMIT;
  const actionsMarkup = includeActions
    ? `
      <div class="resource-actions">
        ${canExpand ? '<button type="button" class="button button--secondary" data-action="show-all-resources">Show all resources</button>' : ""}
        ${rows.length ? '<button type="button" class="button button--secondary" data-action="export-resources-csv">Export CSV</button>' : ""}
      </div>
    `
    : "";

  return `
    <div class="sections">
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Resources</div>
            <h2 class="section-title">Page resources</h2>
          </div>
        </div>
        <p class="muted">HTML, CSS, and JavaScript resources detected from the current-page DOM. Inline resources are counted without exposing their source code.</p>
        <div class="link-stats" aria-label="Page resource statistics">
          ${renderStatBadge("HTML", resources.html.length)}
          ${renderStatBadge("CSS", resources.css.length)}
          ${renderStatBadge("JS", resources.js.length)}
          ${renderStatBadge("External", resources.externalTotal)}
          ${renderStatBadge("Inline", resources.inlineTotal)}
          ${renderStatBadge("Total", resources.total)}
        </div>
        ${actionsMarkup}
        ${
          rows.length
            ? `
              <p class="muted">Showing ${visibleRows.length} of ${rows.length} resources.</p>
              ${renderTable(["Type", "Kind", "Resource"], visibleRows)}
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
    ["social", "Social"],
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
      ${renderSectionSummary(data.audit)}
    </div>
  `;
}

export function renderReportView(data, activeTab) {
  const summaryMarkup =
    activeTab === "overview"
      ? `
        <div class="report-summary">
          ${renderScore(data.audit)}
          ${renderRisk(data.risk)}
        </div>
      `
      : "";

  return `
    <section class="report-card">
      <div class="report-card__header">
        ${renderTabNav(activeTab)}
        <button type="button" class="button button--secondary" data-action="export-pdf">Export PDF</button>
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
  .wrap {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px;
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
    position: absolute;
    left: 50%;
    z-index: 60;
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease, transform 150ms ease, visibility 150ms ease;
    visibility: hidden;
  }
  .help-tip::before {
    content: "";
    bottom: calc(100% + 3px);
    width: 8px;
    height: 8px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    transform: translate(-50%, 4px) rotate(45deg);
  }
  .help-tip::after {
    content: attr(data-help);
    bottom: calc(100% + 7px);
    width: max-content;
    max-width: 260px;
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
    text-align: left;
    text-transform: none;
    transform: translate(-50%, 4px);
    white-space: normal;
  }
  .help-tip:hover,
  .help-tip:focus-visible {
    border-color: #b7c5d8;
    color: #1d4ed8;
    outline: 0;
  }
  .help-tip:hover::before,
  .help-tip:focus-visible::before {
    opacity: 1;
    transform: translate(-50%, 0) rotate(45deg);
    visibility: visible;
  }
  .help-tip:hover::after,
  .help-tip:focus-visible::after {
    opacity: 1;
    transform: translate(-50%, 0);
    visibility: visible;
  }
  .section-title { margin: 0 0 12px; font-size: 18px; }
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
    display: block;
    margin-top: 4px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.35;
  }
  .table-shell {
    margin-top: 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
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
  .resource-actions,
  .heading-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
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
    overflow: hidden;
  }
  .robots-sitemaps__item {
    min-width: 0;
    padding: 6px 8px;
    border-radius: 8px;
    background: var(--surface);
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .robots-sitemaps__item .value-link {
    display: block;
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
  .image-preview {
    position: absolute;
    left: 0;
    top: calc(100% + 8px);
    z-index: 20;
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
        <div class="eyebrow">SEO Score Checker</div>
        <h1 class="title">SEO Score Checker Report</h1>
        <div class="muted">${escapeHtml(data.pageData.hostname || "Unknown host")}</div>
        <div class="muted">${renderInteractiveValue(data.pageData.url || "")}</div>
        <div class="print-note">This report is based on the current page only. It does not crawl an entire domain.</div>
      </div>
      <div class="page-actions">
        <button type="button" class="action-button action-button--primary" id="print-report">Print / Save PDF</button>
        <button type="button" class="action-button" id="close-report">Close</button>
      </div>
    </header>
    <main class="wrap">
      ${renderPrintableTab(
        "Summary",
        `
          <div class="muted">This report is based on the current page only. It does not crawl an entire domain.</div>
          <div class="report-summary">
            ${renderScore(data.audit)}
            ${renderRisk(data.risk)}
          </div>
          ${renderActiveTab(data, "overview")}
        `
      )}
      ${renderPrintableTab("Meta", renderPageTab(data))}
      ${renderPrintableTab("Headers", renderContentTab(data))}
      ${renderPrintableTab("Images", renderImagesTab(data))}
      ${renderPrintableTab("Links", renderLinksTab(data))}
      ${renderPrintableTab("Social", renderSocialTab(data))}
      ${renderPrintableTab("Resources", renderResourcesTab(data, { includeActions: false, showAll: false }))}
    </main>
  `;
}
