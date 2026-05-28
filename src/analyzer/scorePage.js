import { META_DESCRIPTION_THRESHOLDS, SCORE_LABELS, TITLE_THRESHOLDS } from "../constants/thresholds.js";
import { buildIssue, buildPassedCheck } from "../constants/issueCatalog.js";
import { SECTION_WEIGHTS } from "../constants/weights.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hasGoodTitleLength(length) {
  return length >= TITLE_THRESHOLDS.goodMin && length <= TITLE_THRESHOLDS.goodMax;
}

function hasGoodDescriptionLength(length) {
  return length >= META_DESCRIPTION_THRESHOLDS.goodMin && length <= META_DESCRIPTION_THRESHOLDS.goodMax;
}

function buildInfoIssue(id, section, title, recommendation) {
  return {
    id,
    section,
    severity: "low",
    title,
    recommendation,
    scoreImpact: 0,
    revenueRisk: "low",
    passed: false,
    infoOnly: true
  };
}

function pushIssueOrPass(items, condition, issueId, passedId, passedTitle, overrides) {
  if (condition) {
    items.push(buildIssue(issueId, overrides));
    return;
  }

  items.push(buildPassedCheck(passedId, buildIssue(issueId).section, passedTitle));
}

function scoreIndexability(pageData) {
  const issues = [];
  let score = SECTION_WEIGHTS.indexability;

  if (pageData.robots.noindex) {
    issues.push(buildIssue("noindex"));
    score -= 15;
  } else {
    issues.push(buildPassedCheck("indexable", "indexability", "No noindex directive found"));
  }

  if (pageData.robots.nofollow) {
    issues.push(buildIssue("nofollow"));
    score -= 4;
  } else {
    issues.push(buildPassedCheck("followable", "indexability", "No nofollow directive found"));
  }

  if (!pageData.canonical.exists) {
    issues.push(buildIssue("canonical_missing"));
    score -= 3;
  } else if (!pageData.canonical.isValid) {
    issues.push(buildIssue("canonical_invalid"));
    score -= 8;
  } else if (!pageData.canonical.pointsToCurrentUrl) {
    issues.push(buildIssue("canonical_other_url"));
    score -= 8;
  } else {
    issues.push(buildPassedCheck("canonical_valid", "indexability", "Canonical points to this page"));
  }

  return {
    score: clamp(score, 0, SECTION_WEIGHTS.indexability),
    maxScore: SECTION_WEIGHTS.indexability,
    issues
  };
}

function scoreMetadata(pageData) {
  const issues = [];
  let score = SECTION_WEIGHTS.metadata;

  pushIssueOrPass(
    issues,
    !pageData.title.exists,
    "title_missing",
    "title_exists",
    "Title tag found"
  );

  if (!pageData.title.exists) {
    score -= 12;
  } else if (!hasGoodTitleLength(pageData.title.length)) {
    issues.push(buildIssue("title_length", { scoreImpact: 3 }));
    score -= 3;
  } else {
    issues.push(buildPassedCheck("title_length_good", "metadata", "Title length is in a healthy range"));
  }

  pushIssueOrPass(
    issues,
    !pageData.metaDescription.exists,
    "meta_description_missing",
    "meta_description_exists",
    "Meta description found"
  );

  if (!pageData.metaDescription.exists) {
    score -= 10;
  } else if (!hasGoodDescriptionLength(pageData.metaDescription.length)) {
    issues.push(buildIssue("meta_description_length", { scoreImpact: 2 }));
    score -= 2;
  } else {
    issues.push(
      buildPassedCheck("meta_description_length_good", "metadata", "Meta description length is in a healthy range")
    );
  }

  return {
    score: clamp(score, 0, SECTION_WEIGHTS.metadata),
    maxScore: SECTION_WEIGHTS.metadata,
    issues
  };
}

function scoreStructure(pageData) {
  const issues = [];
  let score = SECTION_WEIGHTS.headings;

  if (pageData.h1.count === 0) {
    issues.push(buildIssue("h1_missing"));
    score -= 10;
  } else {
    issues.push(buildPassedCheck("h1_exists", "headings", "H1 tag found"));
  }

  if (pageData.h1.count > 1) {
    const h1Penalty = pageData.h1.count >= 8 ? 8 : pageData.h1.count >= 5 ? 7 : 5;
    issues.push(buildIssue("h1_multiple", { scoreImpact: h1Penalty }));
    score -= h1Penalty;
  } else {
    issues.push(buildPassedCheck("h1_single", "headings", "Single H1 tag used"));
  }

  if (pageData.headings.hasSkippedLevels) {
    const skipPenalty = pageData.headings.skipExamples.length >= 3 ? 6 : 5;
    issues.push(buildIssue("headings_skipped", { scoreImpact: skipPenalty }));
    score -= skipPenalty;
  } else {
    issues.push(buildPassedCheck("heading_order_good", "headings", "Heading order looks consistent"));
  }

  const maxStructurePenalty = pageData.h1.count === 0 ? 15 : 10;
  score = Math.max(SECTION_WEIGHTS.headings - maxStructurePenalty, score);

  return {
    score: clamp(score, 0, SECTION_WEIGHTS.headings),
    maxScore: SECTION_WEIGHTS.headings,
    issues
  };
}

function scoreTechnicalBasics(pageData) {
  const issues = [];
  let score = SECTION_WEIGHTS.technical;

  if (!pageData.technical.hasViewport || !pageData.technical.hasResponsiveViewport) {
    issues.push(buildIssue("viewport_missing_or_weak"));
    score -= 4;
  } else {
    issues.push(buildPassedCheck("viewport_ok", "technical", "Responsive viewport found"));
  }

  if (!pageData.technical.lang) {
    issues.push(buildIssue("lang_missing"));
    score -= 2;
  } else {
    issues.push(buildPassedCheck("lang_ok", "technical", "HTML lang attribute found"));
  }

  if (!pageData.technical.charset) {
    issues.push(buildIssue("charset_missing"));
    score -= 2;
  } else {
    issues.push(buildPassedCheck("charset_ok", "technical", "Character set detected"));
  }

  return {
    score: clamp(score, 0, SECTION_WEIGHTS.technical),
    maxScore: SECTION_WEIGHTS.technical,
    issues
  };
}

function scoreSchema(pageData) {
  const issues = [];
  let score = SECTION_WEIGHTS.schema;

  if (pageData.jsonLd.invalidCount > 0) {
    const jsonLdPenalty = pageData.commercialIntent.detected ? 5 : 2;
    issues.push(buildIssue("jsonld_invalid", { section: "schema", scoreImpact: jsonLdPenalty }));
    score -= jsonLdPenalty;
  } else if (pageData.jsonLd.validCount === 0 || pageData.jsonLd.types.length === 0) {
    const jsonLdPenalty = pageData.commercialIntent.detected ? 4 : 2;
    issues.push(buildIssue("jsonld_missing_or_invalid", { section: "schema", scoreImpact: jsonLdPenalty }));
    score -= jsonLdPenalty;
  } else {
    issues.push(buildPassedCheck("jsonld_ok", "schema", "Valid JSON-LD schema detected"));
  }

  return {
    score: clamp(score, 0, SECTION_WEIGHTS.schema),
    maxScore: SECTION_WEIGHTS.schema,
    issues
  };
}

function scoreImages(pageData) {
  const issues = [];
  let score = SECTION_WEIGHTS.images;
  const ratio = pageData.images.missingAltRatio;

  if (pageData.images.meaningfulTotal === 0) {
    issues.push(buildPassedCheck("images_not_applicable", "images", "No meaningful images require alt text"));
  } else if (ratio > 0.85) {
    issues.push(buildIssue("images_missing_alt_high", { scoreImpact: 8 }));
    score -= 8;
  } else if (ratio > 0.6) {
    issues.push(buildIssue("images_missing_alt_high", { scoreImpact: 7 }));
    score -= 7;
  } else if (ratio > 0.3) {
    issues.push(buildIssue("images_missing_alt_medium", { scoreImpact: 5 }));
    score -= 5;
  } else if (ratio > 0.05) {
    issues.push(buildIssue("images_missing_alt_medium", { scoreImpact: 3 }));
    score -= 3;
  } else {
    issues.push(buildPassedCheck("images_alt_ok", "images", "Meaningful images mostly have alt text"));
  }

  if (pageData.images.genericFilenameCount > 0) {
    issues.push(
      buildInfoIssue(
        "image_filenames_generic",
        "images",
        "Some image filenames look generic",
        "Use more descriptive filenames for important images when possible."
      )
    );
  }

  if (pageData.images.missingDimensionsCount > 0) {
    issues.push(
      buildInfoIssue(
        "image_dimensions_missing",
        "images",
        "Some images do not declare dimensions",
        "Add width and height attributes to reduce layout shifts."
      )
    );
  }

  return {
    score: clamp(score, 0, SECTION_WEIGHTS.images),
    maxScore: SECTION_WEIGHTS.images,
    issues
  };
}

function scoreLinks(pageData) {
  const issues = [];
  let score = SECTION_WEIGHTS.links;

  if (pageData.links.placeholders > 3) {
    issues.push(buildIssue("placeholder_links_many"));
    score -= 3;
  } else if (pageData.links.placeholders >= 1) {
    issues.push(buildIssue("placeholder_links_some"));
    score -= 1;
  } else {
    issues.push(buildPassedCheck("placeholder_links_none", "links", "No placeholder links found"));
  }

  if (pageData.links.total > 0 && pageData.links.internal === 0) {
    issues.push(buildIssue("weak_internal_link_signal"));
    score -= 2;
  } else {
    issues.push(buildPassedCheck("internal_links_ok", "links", "Internal linking signal looks reasonable"));
  }

  if (pageData.links.genericAnchorCount > 0) {
    issues.push(
      buildInfoIssue(
        "generic_anchor_text",
        "links",
        "Some links use generic anchor text",
        "Use more descriptive anchor text for important internal links."
      )
    );
  }

  return {
    score: clamp(score, 0, SECTION_WEIGHTS.links),
    maxScore: SECTION_WEIGHTS.links,
    issues
  };
}

function scoreSecondary(pageData) {
  const issues = [];
  let score = SECTION_WEIGHTS.secondary;

  if (!pageData.openGraph.title) {
    issues.push(buildIssue("og_title_missing"));
    score -= 1;
  } else {
    issues.push(buildPassedCheck("og_title_ok", "secondary", "Open Graph title found"));
  }

  if (!pageData.openGraph.description) {
    issues.push(buildIssue("og_description_missing"));
    score -= 1;
  } else {
    issues.push(buildPassedCheck("og_description_ok", "secondary", "Open Graph description found"));
  }

  if (!pageData.openGraph.image) {
    issues.push(buildIssue("og_image_missing"));
    score -= 2;
  } else {
    issues.push(buildPassedCheck("og_image_ok", "secondary", "Open Graph image found"));
  }

  const hasTwitterBasics = Boolean(pageData.twitter.card && (pageData.twitter.title || pageData.twitter.description));

  if (!hasTwitterBasics) {
    issues.push(buildIssue("twitter_basics_missing"));
    score -= 1;
  } else {
    issues.push(buildPassedCheck("twitter_basics_ok", "secondary", "Twitter card basics found"));
  }

  return {
    score: clamp(score, 0, SECTION_WEIGHTS.secondary),
    maxScore: SECTION_WEIGHTS.secondary,
    issues
  };
}

function getScoreLabel(score) {
  if (score >= SCORE_LABELS.goodMin) {
    return "Good";
  }

  if (score >= SCORE_LABELS.needsImprovementMin) {
    return "Needs improvement";
  }

  return SCORE_LABELS.criticalLabel;
}

export function scorePage(pageData) {
  const sections = {
    indexability: scoreIndexability(pageData),
    metadata: scoreMetadata(pageData),
    headings: scoreStructure(pageData),
    technical: scoreTechnicalBasics(pageData),
    schema: scoreSchema(pageData),
    images: scoreImages(pageData),
    links: scoreLinks(pageData),
    secondary: scoreSecondary(pageData)
  };

  const totalScore = clamp(
    Object.values(sections).reduce((sum, section) => sum + section.score, 0),
    0,
    100
  );

  const issues = Object.values(sections).flatMap((section) => section.issues);
  const infoIssues = [];

  if (pageData.urlSignals.longUrl) {
    infoIssues.push(
      buildInfoIssue(
        "url_length_long",
        "metadata",
        "URL is relatively long",
        "Consider a shorter URL when it can be simplified without losing meaning."
      )
    );
  }

  if (pageData.urlSignals.deepPath) {
    infoIssues.push(
      buildInfoIssue(
        "url_path_deep",
        "metadata",
        "URL path is relatively deep",
        "Keep URL structures straightforward where possible."
      )
    );
  }

  if (!pageData.urlSignals.reflectsTopic && pageData.urlSignals.slugTokens.length) {
    infoIssues.push(
      buildInfoIssue(
        "url_topic_mismatch",
        "metadata",
        "URL does not clearly reflect the page topic",
        "Align the slug more closely with the page topic when practical."
      )
    );
  }

  if (pageData.links.contextualInternal === 0 && pageData.links.internal > 0 && pageData.readability.totalWords >= 250) {
    infoIssues.push(
      buildInfoIssue(
        "contextual_internal_links_missing",
        "links",
        "No contextual internal links were detected",
        "Add a few in-content internal links to related pages where relevant."
      )
    );
  }

  if (pageData.readability.longParagraphs > 0) {
    infoIssues.push(
      buildInfoIssue(
        "long_paragraphs_detected",
        "headings",
        "Some paragraphs are very long",
        "Break long text blocks into shorter paragraphs for easier reading."
      )
    );
  }

  if (pageData.readability.totalWords > 0 && pageData.readability.totalWords < 200 && pageData.commercialIntent.detected) {
    infoIssues.push(
      buildInfoIssue(
        "content_depth_low",
        "headings",
        "Content depth looks light for a commercial page",
        "Consider adding clearer supporting content that answers key user questions."
      )
    );
  }

  return {
    score: totalScore,
    scoreLabel: getScoreLabel(totalScore),
    sections,
    issues: issues.concat(infoIssues),
    insights: {
      contentDepth: pageData.readability.contentDepth,
      contextualInternalLinks: pageData.links.contextualInternal,
      urlLength: pageData.urlSignals.length
    }
  };
}
