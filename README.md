# SEO Score Checker

`SEO Score Checker` is a local Chrome Extension (Manifest V3) that audits the currently active tab without external APIs or network calls. It inspects the DOM, computes a section-based SEO score, derives a separate revenue-risk heuristic, ranks the top fixes, shows evidence tabs, exports a links CSV, and opens a printable report for PDF export.

This README documents the current implementation exactly as it works in code.

## 1. Product summary

The extension gives you:

- `SEO Score` from `0` to `100`
- `Revenue Risk` with:
  - level: `High`, `Medium`, `Low`
  - category
  - reason
- `Top 3 Fixes`
- `SERP Preview`
- section breakdown across:
  - `Indexability`
  - `Metadata`
  - `Structure`
  - `Technical`
  - `Images`
  - `Links`
  - `Social`
- evidence tabs:
  - `Overview`
  - `Page`
  - `Links`
  - `Content`
  - `Social`
- `Export CSV` for the collected links table
- `Export PDF` through a dedicated `report.html` page and Chrome's native print flow

The extension is intentionally `DOM-only`. It does not crawl the site, check live HTTP headers, call external services, or estimate money/ROI.

## 2. Architecture

The extension has four main layers:

### 2.1 Popup layer

`popup.html` loads `popup.js`, which:

1. detects the active tab
2. blocks restricted URLs
3. injects `content.js` via `chrome.scripting.executeScript`
4. receives a serializable `pageData` object
5. runs:
   - `scorePage(pageData)`
   - `calculateRevenueRisk(audit.issues, pageData)`
   - `getTopFixes(audit.issues, pageData)`
   - `buildSerpPreview(pageData)`
6. renders the popup UI

### 2.2 Collection layer

`content.js` runs directly in the active page and returns collected data from the DOM only.

### 2.3 Analysis layer

The analysis is pure local JavaScript:

- `src/analyzer/scorePage.js`
- `src/analyzer/revenueRisk.js`
- `src/analyzer/recommendations.js`
- `src/analyzer/serpPreview.js`

### 2.4 UI / export layer

The popup UI is rendered through:

- `src/ui/renderApp.js`
- `src/ui/reportView.js`
- related UI helpers

PDF export does not use inline scripts. The popup opens `report.html#data=...`, and `report.js` hydrates a printable report from the hash payload.

## 3. Permissions and security model

The manifest uses only:

- `activeTab`
- `scripting`

It does **not** use:

- `host_permissions`
- `content_scripts` in the manifest
- background service worker
- remote code
- external APIs

Rendering uses HTML escaping for user-controlled text to avoid DOM injection in the popup/report.

## 4. Data flow

### 4.1 Popup execution flow

When the user opens the extension:

1. `popup.js` queries the active tab.
2. If the URL is restricted, the popup shows a restricted state.
3. Otherwise it injects `content.js`.
4. `content.js` collects `pageData`.
5. The popup computes:
   - `audit`
   - `risk`
   - `topFixes`
   - `serpPreview`
6. The popup renders the final report.

### 4.2 Restricted URLs

The popup blocks:

- `chrome:`
- `edge:`
- `brave:`
- `about:`
- `chrome-extension:`
- `https://chromewebstore.google.com/...`

### 4.3 Unsupported state

If the page does not expose a usable `document.body`, the popup shows an unsupported state.

## 5. Collected data model

The extension returns one `pageData` object with the following top-level fields:

- `url`
- `hostname`
- `title`
- `metaDescription`
- `canonical`
- `robots`
- `h1`
- `headings`
- `jsonLd`
- `images`
- `links`
- `technical`
- `openGraph`
- `twitter`
- `commercialIntent`
- `urlSignals`
- `readability`

### 5.1 Title

Collected from the `<title>` element:

- `text`
- `length`
- `exists`

### 5.2 Meta description

Collected from `meta[name="description"]`:

- `text`
- `length`
- `exists`

### 5.3 Canonical

Collected from `link[rel~="canonical" i]`:

- `href`
- `exists`
- `isValid`
- `pointsToCurrentUrl`

Canonical comparison normalizes:

- hash removal
- default ports
- trailing slash cleanup for non-root paths

### 5.4 Robots

Collected from:

- `meta[name="robots"]`
- `meta[name="googlebot"]`

Returned fields:

- `content`
- `googlebotContent`
- `noindex`
- `nofollow`

### 5.5 Headings

Collected from all `h1,h2,h3,h4,h5,h6`:

- `h1.count`
- `h1.texts`
- `headings.total`
- `headings.items`
- `headings.counts`
- `headings.hasSkippedLevels`
- `headings.skipExamples`

A skipped level means the next heading jumps by more than one level, for example:

- `H1 -> H4`
- `H2 -> H5`

Up to `5` skip examples are stored.

### 5.6 JSON-LD

Collected from `script[type="application/ld+json"]`:

- `count`
- `validCount`
- `invalidCount`
- `types`

The parser also traverses arrays and `@graph`.

### 5.7 Images

All `document.images` are collected. Then a subset of `meaningful` images is derived.

An image is treated as hidden/decorative if any of these is true:

- `hidden === true`
- `role="presentation"`
- `aria-hidden="true"`
- width or height `<= 2`
- `display: none`
- `visibility: hidden`

Returned image data:

- `total`
- `meaningfulTotal`
- `missingAlt`
- `missingAltRatio`
- `genericFilenameCount`
- `missingDimensionsCount`
- `missingAltSamples` (up to `20`)

Generic filename detection currently matches names like:

- `img123`
- `image-42`
- `photo_1`
- `dsc99`
- `screenshot17`

### 5.8 Links

Collected from all `a[href]`.

Each link is classified as:

- `internal`
- `external`
- `placeholder`

Placeholder links include:

- empty href
- `#`
- `javascript:...`
- invalid URLs

Returned link data:

- `total`
- `internal`
- `external`
- `placeholders`
- `contextualInternal`
- `genericAnchorCount`
- `items`

Each `items[]` row contains:

- `text`
- `href`
- `type`
- `followType`
- `rel`
- `urlKind`

#### Contextual internal links

An internal link is considered contextual when it is **not** inside:

- `nav`
- `header`
- `footer`
- `[role="navigation"]`
- `aside`

#### Generic anchor detection

Current generic anchor list:

- `click here`
- `read more`
- `learn more`
- `more`
- `here`
- `details`
- `view more`
- `see more`

### 5.9 Technical

Collected technical fields:

- `viewport`
- `hasViewport`
- `hasResponsiveViewport`
- `lang`
- `charset`

Responsive viewport currently means the viewport string includes `width=device-width`.

### 5.10 Social preview data

Collected:

- `og:title`
- `og:description`
- `og:image`
- `twitter:card`
- `twitter:title`
- `twitter:description`
- `twitter:image`

### 5.11 Commercial intent heuristic

`commercialIntent.detected` is based on whether the combined haystack contains any of these terms:

- `pricing`
- `buy`
- `shop`
- `product`
- `service`
- `demo`
- `trial`
- `contact`
- `booking`
- `checkout`
- `cart`
- `category`
- `plan`
- `subscribe`
- `order`
- `quote`

The haystack includes:

- current URL
- title text
- all H1 texts
- first `3000` characters of page body text

Returned fields:

- `detected`
- `matchedTerms`

### 5.12 URL signals

The extension derives:

- `length`
- `pathDepth`
- `queryParamCount`
- `slugTokens`
- `matchingTokens`
- `reflectsTopic`
- `longUrl`
- `deepPath`

Thresholds:

- `longUrl = currentUrl.href.length > 115`
- `deepPath = pathDepth > 3`

`reflectsTopic` is true when token overlap exists between:

- URL slug/path tokens
- title/H1 topic tokens

Tokenization rules:

- lowercase
- non-alphanumeric characters stripped
- split on whitespace and hyphen
- token length must be at least `4`
- some stop words are removed

### 5.13 Readability

Paragraphs are collected from:

- `main p`
- `article p`
- fallback `p`

Returned fields:

- `paragraphCount`
- `totalWords`
- `averageParagraphWords`
- `longParagraphs`
- `contentDepth`

Thresholds:

- `High` if `totalWords >= 700`
- `Medium` if `totalWords >= 250`
- `Low` if `totalWords > 0`
- `Very low` if `totalWords === 0`

A long paragraph currently means `> 120 words`.

## 6. SEO Score model

The core score is the sum of seven section scores, each clamped to its own max:

```text
SEO Score =
  Indexability +
  Metadata +
  Structure +
  Technical +
  Images +
  Links +
  Social
```

Then the total is clamped to `0..100`.

### 6.1 Section weights

| Section | Max points |
| --- | ---: |
| Indexability | 25 |
| Metadata | 25 |
| Structure | 15 |
| Technical | 15 |
| Images | 10 |
| Links | 5 |
| Social | 5 |

Total max = `100`.

### 6.2 Score labels

- `Good` if score `>= 90`
- `Needs improvement` if score `>= 70`
- `Critical fixes` if score `< 70`

### 6.3 Indexability formula

Start from `25`.

Subtract:

- `-15` if `robots.noindex`
- `-4` if `robots.nofollow`
- `-3` if canonical is missing
- `-8` if canonical exists but is invalid
- `-8` if canonical exists and points to another URL

If none of the above conditions are hit, passed checks are shown instead.

### 6.4 Metadata formula

Start from `25`.

#### Title

- `-12` if title is missing
- `-3` if title exists but length is outside the good range
- `0` otherwise

Current good title range:

- `30..65` characters

#### Meta description

- `-10` if meta description is missing
- `-2` if meta description exists but length is outside the good range
- `0` otherwise

Current good meta description range:

- `110..170` characters

### 6.5 Structure formula

Start from `15`.

Subtract:

- `-10` if `H1` is missing
- if multiple `H1`:
  - `-8` if `H1 count >= 8`
  - `-7` if `H1 count >= 5`
  - `-5` if `H1 count > 1`
- if heading levels are skipped:
  - `-6` if `skipExamples.length >= 3`
  - `-5` otherwise

Additional cap:

- if `H1` exists, max total penalty for `multiple H1 + skipped headings` is capped at `-10`
- if `H1` is missing, the section can still drop to `0`

### 6.6 Technical formula

Start from `15`.

Subtract:

- `-4` if viewport is missing or not responsive
- `-2` if `lang` is missing
- `-2` if charset is missing
- JSON-LD:
  - `-5` if JSON-LD is invalid on a commercial page
  - `-1` if JSON-LD is invalid on a non-commercial page
  - `-5` if no valid JSON-LD/types are found on a commercial page
  - `-1` if no valid JSON-LD/types are found on a non-commercial page

### 6.7 Images formula

Start from `10`.

If there are no meaningful images, the section gets a passed check instead of a penalty.

Otherwise penalties depend on:

```text
missingAltRatio = missingAlt / meaningfulTotal
```

Current tiers:

- `ratio > 0.85` -> `-8`
- `ratio > 0.60` -> `-7`
- `ratio > 0.30` -> `-5`
- `ratio > 0.05` -> `-3`
- otherwise `0`

### 6.8 Links formula

Start from `5`.

Subtract:

- `-3` if placeholder links `> 3`
- `-1` if placeholder links `>= 1`
- `-2` if the page has links but zero internal links

### 6.9 Social formula

Start from `5`.

Subtract:

- `-1` if `og:title` is missing
- `-1` if `og:description` is missing
- `-2` if `og:image` is missing
- `-1` if Twitter card basics are missing

Twitter basics currently mean:

```text
twitter:card exists AND (twitter:title OR twitter:description exists)
```

## 7. Diagnostic info-only issues

The extension also generates a separate diagnostics layer that does **not** reduce the core SEO score.

These issues are marked with:

- `infoOnly = true`
- `scoreImpact = 0`

Current info-only checks:

- `url_length_long`
- `url_path_deep`
- `url_topic_mismatch`
- `contextual_internal_links_missing`
- `long_paragraphs_detected`
- `content_depth_low`
- `image_filenames_generic`
- `image_dimensions_missing`
- `generic_anchor_text`

Current trigger rules:

- `url_length_long` if URL length `> 115`
- `url_path_deep` if path depth `> 3`
- `url_topic_mismatch` if slug tokens exist but do not overlap with title/H1 topic tokens
- `contextual_internal_links_missing` if:
  - `contextualInternal === 0`
  - `internal > 0`
  - `readability.totalWords >= 250`
- `long_paragraphs_detected` if `longParagraphs > 0`
- `content_depth_low` if:
  - `totalWords > 0`
  - `totalWords < 200`
  - commercial intent is detected
- `image_filenames_generic` if at least one meaningful image filename looks generic
- `image_dimensions_missing` if at least one meaningful image misses explicit width/height
- `generic_anchor_text` if at least one generic anchor is found

## 8. Revenue Risk model

`Revenue Risk` is separate from the score.

It returns:

- `level`
- `category`
- `reason`
- `topRiskIssueId`

This is not a money model. It is a heuristic about visibility / click / clarity risk.

### 8.1 High risk rules

The extension returns `High` immediately if any of these issues exist:

- `noindex` -> category `Indexability`
- `canonical_other_url` -> category `Indexability`
- `canonical_invalid` -> category `Indexability`
- `title_missing` -> category `Snippet & CTR`
- `h1_missing` -> category `Content Clarity`

### 8.2 Commercial meta-description cluster rule

If the page is commercial and `meta_description_missing` exists:

- return `High / Snippet & CTR` only if the unresolved issue cluster contains at least `2` issues from:
  - `meta_description_missing`
  - `h1_multiple`
  - `headings_skipped`
  - `images_missing_alt_high`
  - `jsonld_missing_or_invalid`
- otherwise return:
  - `Medium / Snippet & CTR`

### 8.3 Mixed Signals high-risk rule

If unresolved issues in `indexability` and `metadata` together:

- have length `>= 2`
- and at least one of them is high severity or one of:
  - `noindex`
  - `canonical_other_url`
  - `canonical_invalid`
  - `title_missing`
  - `h1_missing`

then the extension returns:

- `High / Mixed Signals`

### 8.4 Medium risk rules

If no earlier high-risk rule matched, the first unresolved issue from this list creates `Medium / Quality Signals`:

- `title_length`
- `meta_description_missing`
- `meta_description_length`
- `h1_multiple`
- `headings_skipped`
- `images_missing_alt_medium`
- `images_missing_alt_high`
- `viewport_missing_or_weak`
- `jsonld_missing_or_invalid`
- `jsonld_invalid`
- `placeholder_links_some`
- `placeholder_links_many`
- `weak_internal_link_signal`

There is also a special medium rule:

- if commercial intent is detected
- and `readability.contentDepth === "Low"`
- and `links.contextualInternal === 0`

then return:

- `Medium / Content Clarity`

### 8.5 Low risk rules

If no high/medium rule matched, the first unresolved issue from this list creates `Low / Minor Signals`:

- `canonical_missing`
- `lang_missing`
- `charset_missing`
- `og_title_missing`
- `og_description_missing`
- `og_image_missing`
- `twitter_basics_missing`

If none of the above matched:

- `Low / No material risk`

## 9. Top 3 Fixes formula

`Top 3 Fixes` are derived from unresolved issues that are **not** info-only.

Filtering:

```text
include issue if:
  !issue.passed && !issue.infoOnly
```

Priority formula:

```text
priority =
  (severityWeight * 10) +
  scoreImpact +
  commercialIntentBonus
```

Severity weights:

- `high = 3`
- `medium = 2`
- `low = 1`

Commercial bonus:

- `+5` only when:
  - commercial intent is detected
  - and issue section is `metadata` or `indexability`

Sorting:

1. descending by `priority`
2. descending by `scoreImpact`

Then the first `3` issues are kept.

## 10. SERP preview logic

The SERP preview is intentionally simple:

- title = actual title or `Missing title`
- URL = current URL without hash
- description = actual meta description or `Missing meta description`

No pixel-based truncation is simulated in the current implementation.

## 11. UI structure

### 11.1 Popup header

Shows:

- extension name
- detected hostname
- `Recheck` button

### 11.2 Primary summary cards

The popup always shows:

- score card
- revenue risk card

### 11.3 Report tabs

#### Overview

Shows:

- Top 3 Fixes
- SERP Preview
- section summary
- raw values report

#### Page

Shows:

- document-level signals
- indexability, metadata, and non-JSON-LD technical issues

#### Links

Shows:

- link inventory table
- link counts
- CSV export button
- link issues

#### Content

Shows:

- heading counts
- skipped levels
- missing alt summary
- content depth
- long paragraph count
- generic image filename count
- missing dimension count
- headings table
- missing alt samples table
- content issues

#### Social

Shows:

- structured data summary
- Open Graph / Twitter data
- social/schema issues

## 12. Export behavior

### 12.1 CSV export

The links table can be exported as CSV with these columns:

- `Anchor text`
- `Type`
- `Follow`
- `URL kind`
- `URL`
- `Rel`

The CSV is generated locally via `Blob`.

### 12.2 PDF export

The popup export button does this:

1. serializes current audit data
2. URL-encodes it
3. opens:

```text
report.html#data=<payload>
```

4. `report.js` parses the hash
5. hydrates a dedicated printable page
6. the user uses Chrome's print dialog to save as PDF

The printable report includes:

- summary
- quick signals
- top fixes
- SERP preview
- section breakdown
- page evidence
- content evidence
- links evidence
- structured/social evidence
- raw data

## 13. Popup states

The popup can render:

- `loading`
- `restricted`
- `unsupported`
- `error`
- `success`

## 14. Installation

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `seo-score-checker` folder
5. Open a normal page and click the extension icon

Important: load the actual extension folder that contains:

- `manifest.json`
- `popup.html`
- `popup.js`

## 15. Manual test plan

Recommended test pages:

1. normal commercial landing page
2. normal article page
3. page without meta description
4. page with `noindex`
5. page with canonical to another URL
6. page without `H1`
7. page with many `H1`
8. page with invalid JSON-LD
9. page with many missing image alts
10. page without responsive viewport
11. page with good OG/Twitter tags
12. `chrome://extensions`
13. Chrome Web Store page
14. image/PDF/document tabs without normal HTML body
15. localhost page

Expected behavior:

- `noindex` should create `High / Indexability`
- missing title should create `High / Snippet & CTR`
- missing `H1` should create `High / Content Clarity`
- social-only issues should not create high revenue risk
- `Top 3 Fixes` should not include info-only diagnostics
- PDF export should open a dedicated report page
- links CSV should download locally
- restricted pages should show restricted state

## 16. Privacy

The extension is local-only:

- no external API calls
- no analytics
- no telemetry
- no remote scripts
- no remote logging
- no storage of analyzed page content

## 17. Known limitations

This tool intentionally does **not** do:

- HTTP header inspection
- `robots.txt` fetch
- sitemap checks
- Core Web Vitals / Lighthouse / PageSpeed metrics
- full-site crawling
- broken-link validation over the network
- redirect chain analysis
- index coverage verification in search engines
- rank tracking
- keyword database integration
- revenue forecasting

It only evaluates what can be reasonably inferred from the currently loaded DOM and page-local metadata.
