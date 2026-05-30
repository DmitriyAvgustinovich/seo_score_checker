function hasIssue(issues, id) {
  return issues.some((issue) => issue.id === id && !issue.passed);
}

function findFirst(issues, ids) {
  return issues.find((issue) => ids.includes(issue.id) && !issue.passed) || null;
}

function buildClusterReason(unresolved) {
  const important = unresolved
    .filter((issue) =>
      [
        "meta_description_missing",
        "title_missing",
        "title_length",
        "h1_missing",
        "h1_multiple",
        "headings_skipped",
        "images_missing_alt_high",
        "images_missing_alt_medium",
        "jsonld_missing_or_invalid",
        "jsonld_invalid"
      ].includes(issue.id)
    )
    .slice(0, 3)
    .map((issue) => issue.title.toLowerCase());

  if (!important.length) {
    return "Multiple important SEO issues may reduce this page's search visibility.";
  }

  return "Multiple important SEO issues were found, including " + important.join(", ") + ".";
}

export function calculateTrafficRisk(issues, pageData) {
  const unresolved = issues.filter((issue) => !issue.passed);
  const highIssueIds = [
    "noindex",
    "canonical_other_url",
    "canonical_invalid",
    "title_missing",
    "h1_missing"
  ];

  if (hasIssue(unresolved, "noindex")) {
    return {
      level: "High",
      category: "Indexability",
      reason: "This page may not compete in search because it is marked noindex.",
      topRiskIssueId: "noindex"
    };
  }

  if (hasIssue(unresolved, "canonical_other_url")) {
    return {
      level: "High",
      category: "Indexability",
      reason: "Canonical points to another URL, so search engines may consolidate signals away from this page.",
      topRiskIssueId: "canonical_other_url"
    };
  }

  if (hasIssue(unresolved, "canonical_invalid")) {
    return {
      level: "High",
      category: "Indexability",
      reason: "The canonical URL is invalid, which can confuse search engines about the preferred page version.",
      topRiskIssueId: "canonical_invalid"
    };
  }

  if (hasIssue(unresolved, "title_missing")) {
    return {
      level: "High",
      category: "Snippet & CTR",
      reason: "Missing title can reduce search relevance and click potential.",
      topRiskIssueId: "title_missing"
    };
  }

  if (pageData.commercialIntent.detected && hasIssue(unresolved, "meta_description_missing")) {
    const compoundCommercialIssues = unresolved.filter((issue) =>
      ["meta_description_missing", "h1_multiple", "headings_skipped", "images_missing_alt_high", "jsonld_missing_or_invalid"].includes(issue.id)
    );

    if (compoundCommercialIssues.length >= 2) {
      return {
        level: "High",
        category: "Snippet & CTR",
        reason: buildClusterReason(compoundCommercialIssues),
        topRiskIssueId: compoundCommercialIssues[0].id
      };
    }

    return {
      level: "Medium",
      category: "Snippet & CTR",
      reason: "Missing meta description on this commercial page may reduce search clicks even if the page can still rank.",
      topRiskIssueId: "meta_description_missing"
    };
  }

  const criticalClusters = unresolved.filter(
    (issue) => !issue.passed && (issue.section === "indexability" || issue.section === "metadata")
  );

  const h1MajorCompanions = unresolved.filter((issue) =>
    ["meta_description_missing", "title_length", "meta_description_length", "headings_skipped", "images_missing_alt_high", "jsonld_invalid"].includes(issue.id)
  );

  if (hasIssue(unresolved, "h1_missing") && h1MajorCompanions.length > 0) {
    return {
      level: "High",
      category: "Content Clarity",
      reason: "Missing H1 combined with other major page issues weakens topic clarity and search visibility.",
      topRiskIssueId: "h1_missing"
    };
  }

  if (
    criticalClusters.length >= 2 &&
    criticalClusters.some((issue) => issue.severity === "high" || highIssueIds.includes(issue.id))
  ) {
    return {
      level: "High",
      category: "Mixed Signals",
      reason: buildClusterReason(criticalClusters),
      topRiskIssueId: criticalClusters[0].id
    };
  }

  const mediumPriority = findFirst(unresolved, [
    "title_length",
    "meta_description_missing",
    "meta_description_length",
    "h1_missing",
    "h1_multiple",
    "headings_skipped",
    "images_missing_alt_medium",
    "images_missing_alt_high",
    "viewport_missing_or_weak",
    "jsonld_missing_or_invalid",
    "jsonld_invalid",
    "placeholder_links_some",
    "placeholder_links_many",
    "weak_internal_link_signal"
  ]);

  if (mediumPriority) {
    const reasonById = {
      title_length: "Title length may reduce search relevance and click potential.",
      meta_description_missing: "Missing meta description may reduce search clicks and traffic potential.",
      meta_description_length: "Meta description length may reduce snippet quality in search results.",
      h1_missing: "Missing H1 weakens topic clarity for this page.",
      h1_multiple: "Multiple H1 tags can weaken page structure and topical clarity.",
      headings_skipped: "Weak heading order can make page structure harder for search engines to interpret.",
      images_missing_alt_medium: "Many images without alt text can weaken accessibility and search context.",
      images_missing_alt_high: "Many images without alt text can weaken accessibility and search context.",
      viewport_missing_or_weak: "A weak or missing viewport can hurt mobile usability signals.",
      jsonld_missing_or_invalid: "Missing valid schema can reduce rich result eligibility.",
      jsonld_invalid: "Invalid schema can prevent structured data from being understood.",
      placeholder_links_some: "Placeholder links can weaken user flow and site quality signals.",
      placeholder_links_many: "Many placeholder links can weaken user flow and site quality signals.",
      weak_internal_link_signal: "Missing internal links can limit crawl paths and page discovery."
    };

    return {
      level: "Medium",
      category: "Quality Signals",
      reason: reasonById[mediumPriority.id] || "SEO issues may reduce this page's traffic potential.",
      topRiskIssueId: mediumPriority.id
    };
  }

  if (
    pageData.commercialIntent.detected &&
    pageData.readability &&
    pageData.readability.contentDepth === "Low" &&
    pageData.links &&
    pageData.links.contextualInternal === 0
  ) {
    return {
      level: "Medium",
      category: "Content Clarity",
      reason: "This commercial page looks light on supporting content and lacks contextual internal links.",
      topRiskIssueId: null
    };
  }

  const lowPriority = findFirst(unresolved, [
    "canonical_missing",
    "lang_missing",
    "charset_missing",
    "og_title_missing",
    "og_description_missing",
    "og_image_missing",
    "twitter_basics_missing"
  ]);

  if (lowPriority) {
    return {
      level: "Low",
      category: "Minor Signals",
      reason: "Minor SEO issues were found, but no critical traffic risks were detected.",
      topRiskIssueId: lowPriority.id
    };
  }

  return {
    level: "Low",
    category: "No material risk",
    reason: "No critical traffic risks detected in this quick current-page check.",
    topRiskIssueId: null
  };
}
