import { escapeHtml } from "./escapeHtml.js";
import {
  SECTION_LABELS,
  renderDataReport,
  renderSectionSummary
} from "./renderSections.js";
import { renderSerpPreview } from "./renderSerpPreview.js";
import { renderTopFixes } from "./renderTopFixes.js";

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "(none)";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "(missing)";
  }

  return String(value);
}

function renderTable(headers, rows, options = {}) {
  const { compact = false } = options;
  return `
    <div class="table-shell ${compact ? "table-shell--compact" : ""}">
      <table class="data-table">
        <thead>
          <tr>
            ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${row
                    .map(
                      (cell, index) =>
                        `<td data-label="${escapeHtml(headers[index] || "")}">${escapeHtml(formatValue(cell))}</td>`
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
                      : `<span class="muted">Score impact: -${issue.scoreImpact}</span>`;
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

function renderPageTab(data) {
  const pageData = data.pageData;
  const rows = [
    ["URL", pageData.url],
    ["Hostname", pageData.hostname],
    ["Title", pageData.title.text],
    ["Title length", pageData.title.length],
    ["Meta description", pageData.metaDescription.text],
    ["Meta description length", pageData.metaDescription.length],
    ["Canonical", pageData.canonical.href],
    ["Canonical matches current URL", pageData.canonical.pointsToCurrentUrl],
    ["Robots", pageData.robots.content],
    ["Googlebot", pageData.robots.googlebotContent],
    ["Lang", pageData.technical.lang],
    ["Charset", pageData.technical.charset],
    ["Viewport", pageData.technical.viewport],
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
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Page</div>
            <h2 class="section-title">Document-level signals</h2>
          </div>
        </div>
        ${renderTable(["Field", "Value"], rows)}
      </section>
      ${renderIssueCards("Indexability, metadata, and technical basics", pageIssues, "No page-level issues found.")}
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
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Links</div>
            <h2 class="section-title">Page links inventory</h2>
          </div>
          <button type="button" class="button button--secondary" data-action="export-links-csv">Export CSV</button>
        </div>
        <div class="meta-row">
          <span class="muted">Total: ${data.pageData.links.total}</span>
          <span class="muted">Internal: ${data.pageData.links.internal}</span>
          <span class="muted">External: ${data.pageData.links.external}</span>
          <span class="muted">Placeholder: ${data.pageData.links.placeholders}</span>
          <span class="muted">Contextual internal: ${data.pageData.links.contextualInternal}</span>
          <span class="muted">Generic anchors: ${data.pageData.links.genericAnchorCount}</span>
        </div>
        ${renderTable(["Anchor text", "Type", "Follow", "URL kind", "URL"], rows)}
      </section>
      ${renderIssueCards("Link issues", getSectionIssues(data, ["links"]), "No link issues found.")}
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
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Content</div>
            <h2 class="section-title">Headings and image evidence</h2>
          </div>
        </div>
        <div class="value-list">
          <div class="value-row">
            <div class="value-label">Heading counts</div>
            <div class="value-value">
              H1 ${data.pageData.headings.counts.h1}, H2 ${data.pageData.headings.counts.h2}, H3 ${data.pageData.headings.counts.h3},
              H4 ${data.pageData.headings.counts.h4}, H5 ${data.pageData.headings.counts.h5}, H6 ${data.pageData.headings.counts.h6}
            </div>
          </div>
          <div class="value-row">
            <div class="value-label">Skipped levels</div>
            <div class="value-value">${data.pageData.headings.hasSkippedLevels ? data.pageData.headings.skipExamples.join(", ") || "Yes" : "No"}</div>
          </div>
          <div class="value-row">
            <div class="value-label">Missing image alts</div>
            <div class="value-value">${data.pageData.images.missingAlt} of ${data.pageData.images.meaningfulTotal} meaningful images</div>
          </div>
          <div class="value-row">
            <div class="value-label">Content depth</div>
            <div class="value-value">${data.pageData.readability.contentDepth} (${data.pageData.readability.totalWords} words across ${data.pageData.readability.paragraphCount} paragraphs)</div>
          </div>
          <div class="value-row">
            <div class="value-label">Long paragraphs</div>
            <div class="value-value">${data.pageData.readability.longParagraphs}</div>
          </div>
          <div class="value-row">
            <div class="value-label">Generic image filenames</div>
            <div class="value-value">${data.pageData.images.genericFilenameCount}</div>
          </div>
          <div class="value-row">
            <div class="value-label">Images without dimensions</div>
            <div class="value-value">${data.pageData.images.missingDimensionsCount}</div>
          </div>
        </div>
        <div class="section-subtitle">Headings</div>
        ${renderTable(["Level", "Text"], headingRows, { compact: true })}
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
      ${renderIssueCards("Heading and image issues", getSectionIssues(data, ["headings", "images"]), "No content issues found.")}
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
      <section class="section-card report-group">
        <div class="section-row">
          <div>
            <div class="eyebrow">Schema and secondary</div>
            <h2 class="section-title">Schema and secondary preview signals</h2>
          </div>
        </div>
        <div class="section-subtitle">Structured data</div>
        ${renderTable(["Field", "Value"], jsonLdRows, { compact: true })}
        <div class="section-subtitle">Open Graph and Twitter</div>
        ${renderTable(["Field", "Value"], socialRows, { compact: true })}
      </section>
      ${renderIssueCards("Schema and secondary issues", getStructuredIssues(data), "No schema or secondary issues found.")}
    </div>
  `;
}

function renderTabNav(activeTab) {
  const tabs = [
    ["overview", "Overview"],
    ["page", "Page"],
    ["links", "Links"],
    ["content", "Content"],
    ["social", "Secondary"]
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

  if (activeTab === "content") {
    return renderContentTab(data);
  }

  if (activeTab === "social") {
    return renderSocialTab(data);
  }

  return `
    ${renderTopFixes(data.topFixes)}
    ${renderSerpPreview(data.serpPreview)}
    ${renderSectionSummary(data.audit)}
    <section class="report-group">
      <div class="section-row">
        <div>
          <div class="eyebrow">Evidence</div>
          <h2 class="section-title">All raw values</h2>
        </div>
      </div>
      ${renderDataReport(data.pageData)}
    </section>
  `;
}

export function renderReportView(data, activeTab) {
  return `
    <section class="report-card">
      <div class="report-card__header">
        <div>
          <div class="eyebrow">Current-page report</div>
          <h2 class="section-title">Current-page SEO score and explainable top fixes</h2>
        </div>
        <button type="button" class="button button--secondary" data-action="export-pdf">Export PDF</button>
      </div>
      ${renderTabNav(activeTab)}
      <div class="report-tab-panel">
        ${renderActiveTab(data, activeTab)}
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
  .report-panel,
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
  .sections,
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
  .pill,
  .section-badge,
  .impact-badge {
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
  .report-risk-level {
    font-size: 32px;
    font-weight: 800;
    line-height: 1.1;
    margin: 10px 0 8px;
  }
  @media print {
    body { background: white; }
    .page-header { display: none; }
    .wrap { max-width: none; }
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

export function buildPrintableReport(data) {
  const sectionCards = Object.entries(data.audit.sections)
    .map(([key, section]) => {
      const progress = section.maxScore > 0 ? Math.round((section.score / section.maxScore) * 100) : 0;
      const issues = section.issues.filter((item) => !item.passed && !item.infoOnly);
      const insights = section.issues.filter((item) => !item.passed && item.infoOnly);
      const passedChecks = section.issues.filter((item) => item.passed);

      return `
        <section class="report-panel">
          <div class="report-panel__header">
            <div>
              <div class="eyebrow">${escapeHtml(SECTION_LABELS[key] || key)}</div>
              <h3 class="panel-title">${section.score}/${section.maxScore}</h3>
            </div>
            <div class="pill">${progress}%</div>
          </div>
          <div class="progress-track"><div class="progress-bar" style="width:${progress}%;"></div></div>
          <div class="panel-meta">
            <span>${issues.length} issues</span>
            ${insights.length ? `<span>${insights.length} insights</span>` : ""}
            <span>${passedChecks.length} passed</span>
          </div>
          <div class="report-list">
            ${
              issues.length
                ? issues
                    .map(
                      (item) => `
                        <div class="report-item">
                          <div class="report-item__title">${escapeHtml(item.title)}</div>
                          <div class="report-item__meta">Impact: ${escapeHtml(item.severity)} | Score impact: -${item.scoreImpact}</div>
                          <div>${escapeHtml(item.recommendation)}</div>
                        </div>
                      `
                    )
                    .join("")
                : '<div class="report-item"><div class="report-item__title">No unresolved issues.</div></div>'
            }
            ${
              insights.length
                ? insights
                    .map(
                      (item) => `
                        <div class="report-item">
                          <div class="report-item__title">Insight: ${escapeHtml(item.title)}</div>
                          <div class="report-item__meta">No score loss</div>
                          <div>${escapeHtml(item.recommendation)}</div>
                        </div>
                      `
                    )
                    .join("")
                : ""
            }
          </div>
        </section>
      `;
    })
    .join("");

  const dataGroups = renderDataReport(data.pageData);
  const insightRows = [
    ["Risk type", data.risk.category || "(none)"],
    ["Content depth", data.audit.insights ? data.audit.insights.contentDepth : "(unknown)"],
    ["Contextual internal links", data.audit.insights ? data.audit.insights.contextualInternalLinks : 0],
    ["URL length", data.audit.insights ? data.audit.insights.urlLength : 0],
    ["Generic anchors", data.pageData.links.genericAnchorCount],
    ["Long paragraphs", data.pageData.readability.longParagraphs],
    ["Generic image filenames", data.pageData.images.genericFilenameCount],
    ["Images without dimensions", data.pageData.images.missingDimensionsCount]
  ];
  const pageRows = [
    ["Title", data.pageData.title.text],
    ["Meta description", data.pageData.metaDescription.text],
    ["Canonical", data.pageData.canonical.href],
    ["Robots", data.pageData.robots.content],
    ["Viewport", data.pageData.technical.viewport],
    ["URL reflects topic", data.pageData.urlSignals.reflectsTopic]
  ];
  const contentRows = [
    ["H1 count", data.pageData.h1.count],
    ["Total headings", data.pageData.headings.total],
    ["Skipped level examples", data.pageData.headings.skipExamples.join(", ") || "(none)"],
    ["Content depth", data.pageData.readability.contentDepth],
    ["Word count", data.pageData.readability.totalWords],
    ["Long paragraphs", data.pageData.readability.longParagraphs]
  ];
  const linkRows = [
    ["Total links", data.pageData.links.total],
    ["Internal links", data.pageData.links.internal],
    ["Contextual internal links", data.pageData.links.contextualInternal],
    ["External links", data.pageData.links.external],
    ["Placeholder links", data.pageData.links.placeholders],
    ["Generic anchors", data.pageData.links.genericAnchorCount]
  ];
  const socialRows = [
    ["JSON-LD blocks", data.pageData.jsonLd.count],
    ["Schema types", data.pageData.jsonLd.types.join(", ") || "(none)"],
    ["OG title", data.pageData.openGraph.title],
    ["OG description", data.pageData.openGraph.description],
    ["Twitter card", data.pageData.twitter.card],
    ["Twitter title", data.pageData.twitter.title]
  ];

  return `
    <header class="page-header">
      <div class="page-header__meta">
        <div class="eyebrow">SEO Score Checker</div>
        <h1 class="title">SEO Score Checker Report</h1>
        <div class="muted">${escapeHtml(data.pageData.hostname || "Unknown host")}</div>
        <div class="muted">${escapeHtml(data.pageData.url || "")}</div>
        <div class="print-note">This extension checks one open URL at a time. It does not crawl an entire domain.</div>
      </div>
      <div class="page-actions">
        <button type="button" class="action-button action-button--primary" id="print-report">Print / Save PDF</button>
        <button type="button" class="action-button" id="close-report">Close</button>
      </div>
    </header>
    <main class="wrap">
          <section class="card">
            <div class="summary-header">
              <div>
                <div class="eyebrow">Summary</div>
                <h2 class="section-title">Export preview</h2>
              </div>
              <div class="pill">${escapeHtml(data.audit.scoreLabel)}</div>
            </div>
            <div class="report-score-grid">
              <div class="report-kpi">
                <div class="eyebrow">SEO Score</div>
                <div class="report-kpi__value">${data.audit.score}</div>
                <div class="report-kpi__subtitle">${escapeHtml(data.audit.scoreLabel)}</div>
                <div class="progress-track"><div class="progress-bar" style="width:${data.audit.score}%;"></div></div>
              </div>
              <div class="report-kpi">
                <div class="eyebrow">Traffic Risk</div>
                <div class="report-risk-level">${escapeHtml(data.risk.level)}</div>
                <div class="muted">Type: ${escapeHtml(data.risk.category || "No material risk")}</div>
                <div class="report-kpi__subtitle">${escapeHtml(data.risk.reason)}</div>
                <div class="muted">Traffic Risk is a heuristic priority label for organic visibility, snippets, clicks, and common publishing issues. It is not a revenue estimate or ROI forecast.</div>
              </div>
            </div>
          </section>

          <section class="card">
            <h2 class="section-title">Quick Signals</h2>
            ${renderTable(["Signal", "Value"], insightRows)}
          </section>

          <section class="card">
            <h2 class="section-title">Top Fixes</h2>
            <div class="list">
              ${
                data.topFixes.length
                  ? data.topFixes
                      .map(
                        (issue) => `
                          <div class="item">
                            <h3>Issue: ${escapeHtml(issue.title)}</h3>
                            <div><strong>Evidence:</strong> ${escapeHtml(issue.evidence || "Detected directly from current-page signals.")}</div>
                            <div><strong>Why it matters:</strong> ${escapeHtml(issue.whyItMatters || "")}</div>
                            <div><strong>Fix:</strong> ${escapeHtml(issue.fix || issue.recommendation)}</div>
                            <div class="muted">Impact: -${issue.scoreImpact} points | Confidence: ${escapeHtml(issue.confidence || "Medium")}</div>
                          </div>
                        `
                      )
                      .join("")
                  : '<div class="item"><h3>No major issues</h3><div>No critical fixes found in this quick current-page check. No more high-priority fixes found in this quick current-page check.</div></div>'
              }
            </div>
          </section>

          <section class="card">
            <h2 class="section-title">SERP Preview</h2>
            <div class="serp-card">
              <a href="${escapeHtml(data.serpPreview.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(data.serpPreview.url)}</a>
              <h3>${escapeHtml(data.serpPreview.title)}</h3>
              <div>${escapeHtml(data.serpPreview.description)}</div>
            </div>
          </section>

          <section class="card">
            <h2 class="section-title">Section Breakdown</h2>
            <div class="report-sections">
              ${sectionCards}
            </div>
          </section>

          <section class="card">
            <h2 class="section-title">Page Evidence</h2>
            ${renderTable(["Field", "Value"], pageRows, { compact: true })}
          </section>

          <section class="card">
            <h2 class="section-title">Content Evidence</h2>
            ${renderTable(["Field", "Value"], contentRows, { compact: true })}
          </section>

          <section class="card">
            <h2 class="section-title">Links Evidence</h2>
            ${renderTable(["Field", "Value"], linkRows, { compact: true })}
          </section>

          <section class="card">
            <h2 class="section-title">Schema and Secondary Evidence</h2>
            ${renderTable(["Field", "Value"], socialRows, { compact: true })}
          </section>

          <section class="card raw-data">
            <h2 class="section-title">Raw Data</h2>
            ${dataGroups}
          </section>
    </main>
  `;
}
