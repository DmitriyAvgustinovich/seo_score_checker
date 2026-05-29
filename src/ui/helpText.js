import { escapeHtml } from "./escapeHtml.js";

const DEFAULT_HELP_TEXT = "Detected current-page value for this SEO signal.";

const HELP_TEXTS = {
  "seo score": "Overall current-page SEO score from the checks in this extension. Higher is better.",
  "score label": "Readable quality band for the numeric SEO score.",
  "traffic risk": "Heuristic priority label for organic visibility, snippets, clicks, and common publishing issues.",
  "risk type": "The main kind of SEO risk currently driving the Traffic Risk label.",
  "serp preview": "Approximate Google result preview based on the detected title, description, and URL.",
  "top 3 fixes": "Highest-priority fixes selected from detected issues, score impact, and confidence.",
  "section breakdown": "Score split by audit category so you can see which area needs attention first.",
  "section score": "Points earned in this category out of the maximum available points.",
  "section progress": "Percentage of available points earned in this category.",
  "issues": "Detected problems or missing signals that can reduce the score.",
  "insights": "Diagnostic signals shown for context without direct score loss.",
  "passed checks": "Checks that were successfully satisfied on the current page.",
  "impact": "Estimated score loss associated with this issue.",
  "confidence": "How confidently the extension can infer the issue from the current-page signals.",
  "severity": "Relative priority of the issue: high, medium, low, or insight.",
  "evidence": "The detected page signal that supports this recommendation.",
  "why it matters": "Short SEO rationale for prioritizing this issue.",
  "fix": "Suggested action to improve this signal.",
  "field": "Name of the SEO signal being shown in this row.",
  "signal": "Name of the SEO signal being shown in this row.",
  "value": "Detected value for the SEO signal on the current page.",

  "indexability": "Whether search engines can index the page and understand the preferred URL.",
  "metadata": "Title and meta description signals used by search engines and snippets.",
  "headings": "Heading structure and content organization on the page.",
  "technical basics": "Basic technical tags that affect rendering, language, and parsing.",
  "schema": "Structured data signals, mainly JSON-LD blocks found on the page.",
  "images": "Image signals such as alt text, filenames, and dimensions.",
  "links": "Internal, external, placeholder, and anchor text signals.",
  "secondary insights": "Social preview tags and secondary intent signals.",

  "page url": "The full URL of the current page being audited.",
  "url": "The full detected URL for this page or link.",
  "hostname": "Domain name of the audited page.",
  "title": "The page title from the title tag. It is often used as the search result headline.",
  "title length": "Number of characters in the page title. The target range is usually about 30 to 65 characters.",
  "meta description": "The meta description tag, often used as search result snippet text.",
  "meta description length": "Number of characters in the meta description. The target range is usually about 110 to 170 characters.",
  "canonical": "Canonical URL declared by the page as the preferred version.",
  "canonical url": "Canonical URL declared by the page as the preferred version.",
  "canonical exists": "Whether a canonical link tag was found.",
  "canonical valid": "Whether the canonical URL can be parsed as a valid URL.",
  "canonical matches current url": "Whether the canonical points to this exact current page URL.",
  "canonical points to current url": "Whether the canonical points to this exact current page URL.",
  "robots": "Robots meta tag content that can allow or block indexing and following links.",
  "robots content": "Robots meta tag content that can allow or block indexing and following links.",
  "googlebot": "Googlebot-specific robots directives, if present.",
  "googlebot content": "Googlebot-specific robots directives, if present.",
  "noindex": "Whether the page asks search engines not to index it.",
  "nofollow": "Whether the page asks search engines not to follow links on it.",
  "lang": "HTML language attribute. It helps search engines and assistive tools understand page language.",
  "charset": "Detected character encoding, such as UTF-8.",
  "viewport": "Viewport meta tag used for mobile layout behavior.",
  "has viewport": "Whether the page includes a viewport meta tag.",
  "responsive viewport": "Whether the viewport tag supports responsive layouts on mobile devices.",
  "url length": "Number of characters in the current URL.",
  "path depth": "Number of path segments in the URL.",
  "query params": "Number of query parameters in the URL.",
  "slug reflects topic": "Whether the URL slug appears to include meaningful topic words.",
  "url reflects topic": "Whether the URL slug appears to include meaningful topic words.",

  "heading counts": "Count of headings by level, from H1 through H6.",
  "h1": "Top-level heading count. Most pages should have one clear H1.",
  "h2": "Second-level heading count, usually main section headings.",
  "h3": "Third-level heading count, usually subsections under H2s.",
  "h4": "Fourth-level heading count.",
  "h5": "Fifth-level heading count.",
  "h6": "Sixth-level heading count.",
  "h1 count": "Number of H1 headings on the page. Usually one clear H1 is best.",
  "h1 texts": "Text content found in H1 headings.",
  "total headings": "Total number of H1 through H6 headings found on the page.",
  "skipped levels": "Heading order jumps, such as H2 directly to H4, that can weaken document structure.",
  "skipped heading levels": "Heading order jumps, such as H2 directly to H4, that can weaken document structure.",
  "skipped level examples": "Examples of heading level jumps found on the page.",
  "content depth": "Simple content-depth signal based on words, paragraphs, and structure.",
  "word count": "Total detected words in the main page text.",
  "long paragraphs": "Paragraphs that may be too long for easy scanning.",
  "level": "Heading level, such as H1, H2, or H3.",
  "text": "Detected visible text for this item.",

  "total images": "Total image elements detected on the current page.",
  "meaningful images": "Images that appear content-related rather than decorative or tracking assets.",
  "images missing alt": "Meaningful images without useful alt text.",
  "missing image alts": "Meaningful images without useful alt text.",
  "missing alt ratio": "Share of meaningful images that are missing alt text.",
  "generic image filenames": "Images with generic filenames that give weak context, such as image1.jpg.",
  "images without dimensions": "Images without width or height attributes, which can contribute to layout shift.",
  "image": "Image source URL.",
  "alt": "Image alt text used for accessibility and image context.",
  "size": "Detected image dimensions in pixels.",

  "total links": "Total links found on the current page.",
  "total": "Total count for this link group.",
  "internal links": "Links that point to the same host or site.",
  "internal": "Links that point to the same host or site.",
  "contextual internal links": "Internal links found inside meaningful page content.",
  "contextual internal": "Internal links found inside meaningful page content.",
  "external links": "Links that point to other sites.",
  "external": "Links that point to other sites.",
  "placeholder links": "Empty, hash-only, or javascript links that do not lead to a real destination.",
  "placeholder": "Empty, hash-only, or javascript links that do not lead to a real destination.",
  "generic anchors": "Links with weak anchor text, such as click here or learn more.",
  "anchor text": "Visible clickable text of the link.",
  "type": "Whether the link is internal, external, or another detected category.",
  "follow": "Whether the link can pass crawl signals based on rel attributes.",
  "url kind": "Classification of the link destination, such as normal URL or placeholder.",

  "json-ld blocks": "Number of JSON-LD structured data blocks found on the page.",
  "valid json-ld": "JSON-LD blocks that could be parsed successfully.",
  "valid json-ld blocks": "JSON-LD blocks that could be parsed successfully.",
  "invalid json-ld": "JSON-LD blocks with parsing errors.",
  "invalid json-ld blocks": "JSON-LD blocks with parsing errors.",
  "schema types": "Structured data types detected in valid JSON-LD.",
  "og title": "Open Graph title used by many social sharing previews.",
  "og description": "Open Graph description used by many social sharing previews.",
  "og image": "Open Graph image used when the page is shared.",
  "twitter card": "Twitter/X card type that controls shared-link preview format.",
  "twitter title": "Twitter/X title used in shared-link previews.",
  "twitter description": "Twitter/X description used in shared-link previews.",
  "twitter image": "Twitter/X image used in shared-link previews.",
  "commercial intent detected": "Whether buying, pricing, demo, or conversion intent terms were detected.",
  "commercial intent terms": "Matched terms that suggest commercial or transactional intent.",
  "detected": "Whether this signal was detected on the current page.",
  "matched terms": "Specific terms that matched this intent signal."
};

function normalizeHelpKey(label) {
  return String(label || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function getHelpText(label) {
  return HELP_TEXTS[normalizeHelpKey(label)] || DEFAULT_HELP_TEXT;
}

export function renderHelpTip(label, helpText) {
  const text = helpText || getHelpText(label);
  const safeText = escapeHtml(text);

  return `<span class="help-tip" tabindex="0" title="${safeText}" aria-label="${safeText}" data-help="${safeText}">?</span>`;
}

export function renderHelpLabel(label, helpText) {
  return `<span class="label-with-help"><span>${escapeHtml(label)}</span>${renderHelpTip(label, helpText)}</span>`;
}
