import { SEVERITY_WEIGHTS } from "../constants/weights.js";

function getConfidence(issue, pageData) {
  const highConfidenceIds = new Set([
    "noindex",
    "title_missing",
    "meta_description_missing",
    "canonical_missing",
    "canonical_invalid",
    "canonical_other_url",
    "h1_missing",
    "jsonld_invalid"
  ]);
  const mediumConfidenceIds = new Set([
    "title_length",
    "meta_description_length",
    "h1_multiple",
    "headings_skipped",
    "jsonld_missing_or_invalid",
    "images_missing_alt_high",
    "images_missing_alt_medium",
    "placeholder_links_some",
    "placeholder_links_many"
  ]);

  if (issue.id === "viewport_missing_or_weak") {
    return pageData.technical.hasViewport ? "Medium" : "High";
  }

  if (highConfidenceIds.has(issue.id)) {
    return "High";
  }

  if (mediumConfidenceIds.has(issue.id)) {
    return "Medium";
  }

  return "Low";
}

function getEvidence(issue, pageData) {
  if (issue.id === "meta_description_missing") {
    return "No meta description tag was found on this page.";
  }

  if (issue.id === "title_missing") {
    return "The document title is empty or missing.";
  }

  if (issue.id === "title_length") {
    return "Detected title length: " + pageData.title.length + " characters.";
  }

  if (issue.id === "meta_description_length") {
    return "Detected meta description length: " + pageData.metaDescription.length + " characters.";
  }

  if (issue.id === "noindex") {
    return "A robots meta directive contains noindex.";
  }

  if (issue.id === "canonical_missing") {
    return "No canonical tag was found on this page.";
  }

  if (issue.id === "canonical_invalid") {
    return "A canonical tag was found but its URL could not be parsed reliably.";
  }

  if (issue.id === "canonical_other_url") {
    return "Canonical URL points to a different URL: " + (pageData.canonical.href || "(missing)") + ".";
  }

  if (issue.id === "h1_missing") {
    return "No H1 heading was found on this page.";
  }

  if (issue.id === "h1_multiple") {
    return "Found " + pageData.h1.count + " H1 headings on this page.";
  }

  if (issue.id === "headings_skipped") {
    return "Heading jumps detected: " + (pageData.headings.skipExamples.join(", ") || "yes") + ".";
  }

  if (issue.id === "viewport_missing_or_weak") {
    return "Viewport meta is missing or does not include width=device-width.";
  }

  if (issue.id === "jsonld_invalid") {
    return "At least one JSON-LD script could not be parsed.";
  }

  if (issue.id === "jsonld_missing_or_invalid") {
    return "No valid JSON-LD schema types were detected on this page.";
  }

  if (issue.id === "images_missing_alt_high" || issue.id === "images_missing_alt_medium") {
    return (
      pageData.images.missingAlt +
      " of " +
      pageData.images.meaningfulTotal +
      " images are missing alt text."
    );
  }

  if (issue.id === "placeholder_links_many" || issue.id === "placeholder_links_some") {
    return "Placeholder links detected: " + pageData.links.placeholders + ".";
  }

  if (issue.id === "weak_internal_link_signal") {
    return "Detected links: " + pageData.links.total + ", internal links: " + pageData.links.internal + ".";
  }

  return "Detected directly from current-page DOM signals.";
}

function getWhyItMatters(issue) {
  if (issue.section === "indexability") {
    return "Search engines may not treat this page as the preferred, indexable version.";
  }

  if (issue.section === "metadata") {
    return "Search engines may show a weaker or less controlled snippet for this page.";
  }

  if (issue.section === "headings") {
    return "Weak heading signals can reduce topic clarity for search engines and users.";
  }

  if (issue.section === "technical") {
    return "Technical basics can affect crawlability, rendering, and mobile usability.";
  }

  if (issue.section === "schema") {
    return "Schema issues can reduce structured-data understanding and rich-result eligibility.";
  }

  if (issue.section === "images") {
    return "Image accessibility and page context may be weaker than expected.";
  }

  return "This signal can weaken page quality or internal discovery cues.";
}

export function getTopFixes(issues, pageData) {
  return issues
    .filter((issue) => !issue.passed && !issue.infoOnly)
    .map((issue) => {
      const commercialBonus =
        pageData.commercialIntent.detected &&
        (issue.section === "metadata" || issue.section === "indexability")
          ? 5
          : 0;

      const priority = (SEVERITY_WEIGHTS[issue.severity] || 0) * 10 + (issue.scoreImpact || 0) + commercialBonus;

      return {
        ...issue,
        priority,
        confidence: getConfidence(issue, pageData),
        evidence: getEvidence(issue, pageData),
        whyItMatters: getWhyItMatters(issue),
        fix: issue.recommendation
      };
    })
    .filter((issue) => issue.confidence !== "Low")
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return (right.scoreImpact || 0) - (left.scoreImpact || 0);
    })
    .slice(0, 3);
}
