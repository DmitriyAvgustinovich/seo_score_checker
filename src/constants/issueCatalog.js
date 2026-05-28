const ISSUE_CATALOG = {
  noindex: {
    section: "indexability",
    severity: "high",
    title: "Page is marked noindex",
    recommendation: "Remove the noindex directive if this page should appear in search results.",
    scoreImpact: 15,
    revenueRisk: "high"
  },
  nofollow: {
    section: "indexability",
    severity: "medium",
    title: "Page uses nofollow in robots directives",
    recommendation: "Review the robots directive and remove nofollow if it is blocking normal link equity flow.",
    scoreImpact: 4,
    revenueRisk: "medium"
  },
  canonical_other_url: {
    section: "indexability",
    severity: "high",
    title: "Canonical points to another URL",
    recommendation: "Update the canonical tag so it points to this exact page when self-canonicalization is intended.",
    scoreImpact: 8,
    revenueRisk: "high"
  },
  canonical_invalid: {
    section: "indexability",
    severity: "high",
    title: "Canonical URL is invalid",
    recommendation: "Fix the canonical URL so search engines can interpret it reliably.",
    scoreImpact: 8,
    revenueRisk: "high"
  },
  canonical_missing: {
    section: "indexability",
    severity: "low",
    title: "Canonical tag is missing",
    recommendation: "Add a canonical tag to reduce ambiguity around the preferred URL.",
    scoreImpact: 3,
    revenueRisk: "low"
  },
  title_missing: {
    section: "metadata",
    severity: "high",
    title: "Title tag is missing",
    recommendation: "Add a unique page title that clearly communicates the topic and intent.",
    scoreImpact: 12,
    revenueRisk: "high"
  },
  title_length: {
    section: "metadata",
    severity: "medium",
    title: "Title length needs improvement",
    recommendation: "Keep the title concise and descriptive, ideally around 30 to 60 characters.",
    scoreImpact: 5,
    revenueRisk: "medium"
  },
  meta_description_missing: {
    section: "metadata",
    severity: "medium",
    title: "Meta description is missing",
    recommendation: "Add a clear meta description that explains the page value and encourages clicks.",
    scoreImpact: 10,
    revenueRisk: "medium"
  },
  meta_description_length: {
    section: "metadata",
    severity: "medium",
    title: "Meta description length needs improvement",
    recommendation: "Keep the meta description informative and close to 120 to 160 characters.",
    scoreImpact: 4,
    revenueRisk: "medium"
  },
  h1_missing: {
    section: "structure",
    severity: "high",
    title: "H1 is missing",
    recommendation: "Add one descriptive H1 that matches the page topic and primary intent.",
    scoreImpact: 10,
    revenueRisk: "high"
  },
  h1_multiple: {
    section: "structure",
    severity: "medium",
    title: "Multiple H1 tags found",
    recommendation: "Use a single clear H1 and demote supporting headings to lower levels.",
    scoreImpact: 5,
    revenueRisk: "medium"
  },
  headings_skipped: {
    section: "structure",
    severity: "medium",
    title: "Heading levels are skipped",
    recommendation: "Use headings in a logical order to improve document structure.",
    scoreImpact: 5,
    revenueRisk: "medium"
  },
  viewport_missing_or_weak: {
    section: "technical",
    severity: "medium",
    title: "Viewport meta tag is missing or weak",
    recommendation: "Add a responsive viewport tag such as width=device-width, initial-scale=1.",
    scoreImpact: 4,
    revenueRisk: "medium"
  },
  lang_missing: {
    section: "technical",
    severity: "low",
    title: "HTML lang attribute is missing",
    recommendation: "Set the document lang attribute on the html element.",
    scoreImpact: 2,
    revenueRisk: "low"
  },
  charset_missing: {
    section: "technical",
    severity: "low",
    title: "Character set is missing or not detectable",
    recommendation: "Ensure the page exposes a valid character encoding such as UTF-8.",
    scoreImpact: 2,
    revenueRisk: "low"
  },
  jsonld_missing_or_invalid: {
    section: "technical",
    severity: "medium",
    title: "No valid JSON-LD schema found",
    recommendation: "Add valid JSON-LD structured data where it makes sense for this page type.",
    scoreImpact: 5,
    revenueRisk: "medium"
  },
  jsonld_invalid: {
    section: "technical",
    severity: "medium",
    title: "Invalid JSON-LD detected",
    recommendation: "Fix JSON-LD syntax errors so schema markup can be parsed reliably.",
    scoreImpact: 5,
    revenueRisk: "medium"
  },
  images_missing_alt_medium: {
    section: "images",
    severity: "medium",
    title: "Many meaningful images are missing alt text",
    recommendation: "Add concise alt text to meaningful images that convey content or context.",
    scoreImpact: 5,
    revenueRisk: "medium"
  },
  images_missing_alt_high: {
    section: "images",
    severity: "medium",
    title: "Most meaningful images are missing alt text",
    recommendation: "Add alt text to meaningful images to improve accessibility and search context.",
    scoreImpact: 10,
    revenueRisk: "medium"
  },
  placeholder_links_some: {
    section: "links",
    severity: "medium",
    title: "Placeholder links found",
    recommendation: "Replace placeholder links with real destinations or remove them.",
    scoreImpact: 1,
    revenueRisk: "medium"
  },
  placeholder_links_many: {
    section: "links",
    severity: "medium",
    title: "Many placeholder links found",
    recommendation: "Replace empty, hash-only, or javascript links with meaningful destinations.",
    scoreImpact: 3,
    revenueRisk: "medium"
  },
  weak_internal_link_signal: {
    section: "links",
    severity: "medium",
    title: "No internal links detected",
    recommendation: "Add internal links to related pages where helpful for users and crawl flow.",
    scoreImpact: 2,
    revenueRisk: "medium"
  },
  og_title_missing: {
    section: "social",
    severity: "low",
    title: "Open Graph title is missing",
    recommendation: "Add og:title to improve social sharing previews.",
    scoreImpact: 1,
    revenueRisk: "low"
  },
  og_description_missing: {
    section: "social",
    severity: "low",
    title: "Open Graph description is missing",
    recommendation: "Add og:description to improve social sharing previews.",
    scoreImpact: 1,
    revenueRisk: "low"
  },
  og_image_missing: {
    section: "social",
    severity: "low",
    title: "Open Graph image is missing",
    recommendation: "Add og:image so shared links have a clear preview image.",
    scoreImpact: 2,
    revenueRisk: "low"
  },
  twitter_basics_missing: {
    section: "social",
    severity: "low",
    title: "Twitter card basics are missing",
    recommendation: "Add basic Twitter card tags for richer shared previews.",
    scoreImpact: 1,
    revenueRisk: "low"
  }
};

export function buildIssue(id, overrides = {}) {
  const base = ISSUE_CATALOG[id];

  if (!base) {
    throw new Error("Unknown issue catalog id: " + id);
  }

  return {
    id,
    passed: false,
    ...base,
    ...overrides
  };
}

export function buildPassedCheck(id, section, title) {
  return {
    id,
    section,
    title,
    passed: true
  };
}
