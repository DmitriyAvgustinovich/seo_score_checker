const SECTION_LABELS = {
  indexability: "Indexability",
  metadata: "Metadata",
  headings: "Headings",
  technical: "Technical basics",
  schema: "Schema",
  images: "Images",
  links: "Links",
  secondary: "Preview tags"
};

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatValue(item)).join(", ") : "(none)";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "(missing)";
  }

  return String(value);
}

function formatPercentage(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "(missing)";
  }

  return Number((numericValue * 100).toFixed(1)) + "%";
}

function markdownCell(value) {
  return formatValue(value)
    .replace(/\r?\n/g, "<br>")
    .replace(/\|/g, "\\|");
}

function table(headers, rows) {
  if (!rows.length) {
    return "";
  }

  return [
    "| " + headers.map(markdownCell).join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |",
    ...rows.map((row) => "| " + row.map(markdownCell).join(" | ") + " |")
  ].join("\n");
}

function progressBar(percent) {
  const numericValue = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = Math.round(numericValue / 10);
  return "[" + "#".repeat(filled) + "-".repeat(10 - filled) + "] " + Math.round(numericValue) + "%";
}

function sectionRows(audit) {
  return Object.entries(audit.sections || {}).map(([key, section]) => {
    const percent = section && section.maxScore ? (section.score / section.maxScore) * 100 : 0;
    const issues = (section.issues || []).filter((issue) => !issue.passed && !issue.infoOnly);
    const passed = (section.issues || []).filter((issue) => issue.passed);

    return [
      SECTION_LABELS[key] || key,
      section.score + "/" + section.maxScore,
      progressBar(percent),
      issues.length,
      passed.length
    ];
  });
}

function issueRows(issues) {
  return issues.map((issue) => [
    issue.title,
    issue.severity || "info",
    issue.scoreImpact ? "-" + issue.scoreImpact + " points" : "No score loss",
    issue.recommendation || ""
  ]);
}

function scoreDetailRows(audit) {
  const rows = Object.entries(audit.sections || {}).map(([key, section]) => [
    SECTION_LABELS[key] || key,
    section.maxScore,
    section.score
  ]);

  rows.push(["Total", 100, audit.score]);
  return rows;
}

function scoreDeductionRows(audit) {
  return (audit.issues || [])
    .filter((issue) => !issue.passed && !issue.infoOnly && issue.scoreImpact > 0)
    .map((issue) => [
      issue.title,
      SECTION_LABELS[issue.section] || issue.section,
      "-" + issue.scoreImpact
    ]);
}

function informationalIssueRows(audit) {
  return (audit.issues || [])
    .filter((issue) => !issue.passed && issue.infoOnly)
    .map((issue) => [issue.title, issue.recommendation || ""]);
}

function scoreCapText(audit) {
  return audit.appliedCap
    ? "Final score capped at " + audit.appliedCap.maxScore + " because " + audit.appliedCap.title.toLowerCase() + " was detected."
    : "No critical cap applied.";
}

function resourceRows(resources) {
  const safeResources = resources || {};

  return [
    ...(safeResources.html || []),
    ...(safeResources.css || []),
    ...(safeResources.js || [])
  ].map((item) => [item.type, item.kind, item.url]);
}

function imageSize(item) {
  return (item.width || 0) + "x" + (item.height || 0);
}

function formatLocalReportDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short"
    }).format(date);
  } catch (error) {
    const pad = (value) => String(value).padStart(2, "0");

    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-") + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }
}

export function buildMarkdownReport(data) {
  const pageData = data.pageData;
  const audit = data.audit;
  const risk = data.risk;
  const topFixes = data.topFixes || [];
  const images = pageData.images || {};
  const resources = pageData.resources || {};
  const robotsTxt = pageData.robotsTxt || {};
  const missingAltImages = images.missingAltSamples || [];
  const imagesWithAlt = images.imagesWithAlt || [];
  const scoreDeductions = scoreDeductionRows(audit);
  const informationalRows = informationalIssueRows(audit);

  const lines = [
    "# SEO Score Checker Report - " + formatLocalReportDate(),
    "",
    "**Host:** " + formatValue(pageData.hostname || "Unknown host"),
    "**URL:** " + formatValue(pageData.url || ""),
    "",
    "This report is based on the current page only. It does not crawl an entire domain. Page content is not sent to a server.",
    "",
    "## Summary",
    "",
    "- **SEO score:** " + audit.score + "/100 (" + audit.scoreLabel + ")",
    "- **Progress:** " + progressBar(audit.score),
    "- **Traffic risk:** " + risk.level + " (" + risk.category + ")",
    "- **Risk reason:** " + risk.reason,
    "",
    "## Score details",
    "",
    "A current-page SEO score based on checks in this extension. SEO Score starts from 100 points across 8 current-page sections. Detected issues subtract points. Critical issues can cap the final score.",
    "",
    table(["Section", "Max", "Current"], scoreDetailRows(audit)),
    "",
    "### Score deductions",
    "",
    scoreDeductions.length
      ? table(["Issue", "Section", "Points"], scoreDeductions)
      : "No score deductions detected.",
    "",
    scoreCapText(audit),
    "",
    ...(informationalRows.length
      ? [
          "### Informational-only signals",
          "",
          table(["Signal", "Note"], informationalRows),
          ""
        ]
      : []),
    "## Robots.txt and sitemaps",
    "",
    "Site-level robots.txt reference. Informational only. Not used in the current-page SEO Score.",
    "",
    table(
      ["Signal", "Value"],
      [
        ["Robots.txt URL", robotsTxt.url || "(missing)"],
        [
          "Sitemap URLs",
          robotsTxt.sitemapCount
            ? (robotsTxt.sitemapUrls || []).join(", ")
            : "No sitemap directives found in robots.txt."
        ]
      ]
    ),
    "",
    "## Top fixes",
    ""
  ];

  if (topFixes.length) {
    topFixes.forEach((fix, index) => {
      lines.push(index + 1 + ". **" + fix.title + "**");
      lines.push("   - Impact: -" + fix.scoreImpact + " points");
      lines.push("   - Confidence: " + fix.confidence);
      lines.push("   - Evidence: " + fix.evidence);
      lines.push("   - Why it matters: " + fix.whyItMatters);
      lines.push("   - Fix: " + fix.fix);
    });
  } else {
    lines.push("No prioritized fixes found.");
  }

  lines.push(
    "",
    "## Section breakdown",
    "",
    table(["Section", "Score", "Progress", "Issues", "Passed checks"], sectionRows(audit)),
    "",
    "## Issues",
    ""
  );

  const unresolvedIssues = (audit.issues || []).filter((issue) => !issue.passed);
  lines.push(unresolvedIssues.length
    ? table(["Issue", "Severity", "Impact", "Recommendation"], issueRows(unresolvedIssues))
    : "No unresolved issues.");

  lines.push(
    "",
    "## Meta",
    "",
    table(
      ["Field", "Value"],
      [
        ["Title", pageData.title && pageData.title.text],
        ["Title length", pageData.title && pageData.title.length],
        ["Meta description", pageData.metaDescription && pageData.metaDescription.text],
        ["Meta description length", pageData.metaDescription && pageData.metaDescription.length],
        ["Canonical", pageData.canonical && pageData.canonical.href],
        ["Canonical exists", pageData.canonical && pageData.canonical.exists],
        ["Canonical valid", pageData.canonical && pageData.canonical.isValid],
        ["Canonical matches current URL", pageData.canonical && pageData.canonical.pointsToCurrentUrl],
        ["Robots meta", pageData.robots && pageData.robots.content],
        ["Noindex", pageData.robots && pageData.robots.noindex],
        ["Nofollow", pageData.robots && pageData.robots.nofollow],
        ["Lang", pageData.technical && pageData.technical.lang],
        ["Charset", pageData.technical && pageData.technical.charset],
        ["Viewport", pageData.technical && pageData.technical.viewport],
        ["Path depth", pageData.urlSignals && pageData.urlSignals.pathDepth],
        ["Slug reflects topic", pageData.urlSignals && pageData.urlSignals.reflectsTopic]
      ]
    ),
    "",
    "## Headings",
    "",
    table(
      ["Field", "Value"],
      [
        ["H1 count", pageData.h1 && pageData.h1.count],
        ["H1 texts", pageData.h1 && pageData.h1.texts],
        ["Total headings", pageData.headings && pageData.headings.total],
        ["Skipped levels", pageData.headings && pageData.headings.hasSkippedLevels ? pageData.headings.skipExamples : "No"],
        ["Content depth", pageData.readability && pageData.readability.contentDepth],
        ["Word count", pageData.readability && pageData.readability.totalWords],
        ["Long paragraphs", pageData.readability && pageData.readability.longParagraphs]
      ]
    ),
    "",
    "## Images",
    "",
    table(
      ["Metric", "Value"],
      [
        ["Total images", images.total],
        ["Meaningful images", images.meaningfulTotal],
        ["Missing image alts", images.missingAlt + " of " + images.meaningfulTotal + " meaningful images"],
        ["Missing alt percentage", formatPercentage(images.missingAltRatio)],
        ["Generic image filenames", images.genericFilenameCount],
        ["Images without dimensions", images.missingDimensionsCount]
      ]
    ),
    "",
    "### Images missing alt",
    "",
    missingAltImages.length
      ? table(["Image", "Alt", "Size"], missingAltImages.map((item) => [item.src, item.alt || "(missing)", imageSize(item)]))
      : "No images missing alt.",
    "",
    "### Images with alt text",
    "",
    imagesWithAlt.length
      ? table(["Image", "Alt", "Size"], imagesWithAlt.map((item) => [item.src, item.alt, imageSize(item)]))
      : "No meaningful images with alt text found.",
    "",
    "## Links",
    "",
    table(
      ["Metric", "Value"],
      [
        ["Total", pageData.links && pageData.links.total],
        ["Internal", pageData.links && pageData.links.internal],
        ["External", pageData.links && pageData.links.external],
        ["Placeholder", pageData.links && pageData.links.placeholders],
        ["Contextual internal", pageData.links && pageData.links.contextualInternal],
        ["Generic anchors", pageData.links && pageData.links.genericAnchorCount]
      ]
    ),
    "",
    table(
      ["Anchor text", "Type", "Follow", "URL kind", "URL"],
      (pageData.links && pageData.links.items || []).map((item) => [
        item.text,
        item.type,
        item.followType,
        item.urlKind,
        item.href
      ])
    ),
    "",
    "## Schema",
    "",
    "Schema and preview tags detected on the current page.",
    "",
    table(
      ["Field", "Value"],
      [
        ["JSON-LD blocks", pageData.jsonLd && pageData.jsonLd.count],
        ["Valid JSON-LD", pageData.jsonLd && pageData.jsonLd.validCount],
        ["Invalid JSON-LD", pageData.jsonLd && pageData.jsonLd.invalidCount],
        ["Schema types", pageData.jsonLd && pageData.jsonLd.types],
        ["OG title", pageData.openGraph && pageData.openGraph.title],
        ["OG description", pageData.openGraph && pageData.openGraph.description],
        ["OG image", pageData.openGraph && pageData.openGraph.image],
        ["Twitter card", pageData.twitter && pageData.twitter.card],
        ["Twitter title", pageData.twitter && pageData.twitter.title],
        ["Twitter description", pageData.twitter && pageData.twitter.description],
        ["Twitter image", pageData.twitter && pageData.twitter.image],
        ["Commercial intent detected", pageData.commercialIntent && pageData.commercialIntent.detected],
        ["Commercial intent terms", pageData.commercialIntent && pageData.commercialIntent.matchedTerms]
      ]
    ),
    "",
    "## Resources",
    "",
    "Informational only. Resource counts do not affect the SEO Score.",
    "",
    table(
      ["Metric", "Value"],
      [
        ["HTML", (resources.html || []).length],
        ["CSS", (resources.css || []).length],
        ["JS", (resources.js || []).length],
        ["External", resources.externalTotal || 0],
        ["Inline", resources.inlineTotal || 0],
        ["Total", resources.total || 0]
      ]
    ),
    "",
    table(["Type", "Kind", "Resource"], resourceRows(resources))
  );

  return lines.join("\n") + "\n";
}
