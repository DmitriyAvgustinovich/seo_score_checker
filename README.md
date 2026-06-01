# SEO Score Checker

`SEO Score Checker` is a Manifest V3 Chrome extension for current-page SEO scoring and explainable top fixes.

SEO Score Checker checks the current open page and shows a 0-100 SEO score, Traffic Risk, SERP preview, section breakdown, and explainable top fixes.

It checks only the currently open URL / active tab. It is not a site crawler, rank tracker, backlink checker, keyword tool, PageSpeed tool, or SEO suite.

## Product Promise

The popup answers one question:

```text
How good is this page's SEO right now?
```

The first screen shows:

- `SEO Score` from `0` to `100`
- `Grade`: `Good`, `Needs improvement`, or `Critical issues`
- `Traffic Risk`: `Low`, `Medium`, or `High`
- explainable `Top fixes`
- `SERP Preview`
- `Section Breakdown`

`Traffic Risk` is a heuristic priority label based on detected page issues. It is not a revenue estimate, ranking forecast, or traffic prediction.

## Architecture

The extension keeps the existing vanilla JavaScript stack:

- `manifest.json`: Manifest V3 configuration
- `popup.html`: popup shell
- `popup.js`: active tab lookup, script injection, analysis orchestration, CSV/PDF actions
- `src/content/content.js`: local DOM collection in the active tab
- `src/report/report.html` / `src/report/report.js`: printable report page for PDF export
- `src/analyzer/*`: scoring, risk, top fixes, SERP preview
- `src/ui/*`: popup/report rendering
- `src/constants/*`: weights, thresholds, issue catalog

No framework, build system, TypeScript, remote API, analytics, login, storage, or crawler is added.

## Permissions

The manifest uses only:

- `activeTab`
- `scripting`

It does not use:

- `<all_urls>`
- broad `host_permissions`
- `tabs`
- `identity`
- `cookies`
- `webRequest`
- `debugger`
- `history`
- `bookmarks`
- `storage`
- background crawler
- remote code

Analysis is user-triggered by opening/clicking the extension popup.

## Data Flow

1. `popup.js` queries the active tab.
2. Restricted browser/extension pages are blocked before injection.
3. `popup.js` injects `src/content/content.js` with `chrome.scripting.executeScript`.
4. `src/content/content.js` collects DOM-derived `pageData`.
5. The popup computes:
   - `scorePage(pageData)`
   - `calculateTrafficRisk(audit.issues, pageData)` internally
   - `getTopFixes(audit.issues, pageData)`
   - `buildSerpPreview(pageData)`
6. The UI renders the current-page report.

Internal risk code uses `trafficRisk`; visible UI uses `Traffic Risk`.

## DOM Signals Collected

`src/content/content.js` collects only current-page data:

- document title
- meta description
- canonical URL
- robots / googlebot meta
- H1-H6 counts and heading order
- viewport meta
- charset
- HTML `lang`
- image counts and missing alt counts
- internal / external / placeholder link counts
- JSON-LD blocks, parse validity, schema types
- Open Graph / Twitter presence as secondary insights
- URL length/path/query/topic signals
- lightweight paragraph/readability signals
- commercial-intent heuristic from URL/title/H1/body snippet
- informational page resource counts

It does not store full page HTML, store inline script source, crawl links, fetch linked pages, or send DOM data to a server.

Non-HTML documents are not scored. The extension shows an unsupported-page state for PDF/image URLs and any document whose `document.contentType` is not `text/html` or `application/xhtml+xml`.

## SEO Score Formula

The score is weighted and section-based, not a raw warning count:

```text
SEO Score =
  Indexability +
  Metadata +
  Headings +
  Technical basics +
  Schema +
  Images +
  Links +
  Secondary insights
```

Each section is clamped to its own maximum. The total is clamped to `0..100`.
Critical page-level issues also cap the final score so the grade cannot look overly healthy when a blocking signal exists.

### Section Weights

| Section | Max points |
| --- | ---: |
| Indexability | 25 |
| Metadata | 20 |
| Headings | 15 |
| Technical basics | 10 |
| Schema | 8 |
| Images | 10 |
| Links | 5 |
| Secondary insights | 7 |

### Grade Bands

| Score | Grade |
| ---: | --- |
| 80-100 | Good |
| 50-79 | Needs improvement |
| 0-49 | Critical issues |

### Critical Score Caps

These caps apply after the section scores are summed:

| Issue | Maximum final score |
| --- | ---: |
| `noindex` | 49 |
| missing title | 69 |
| invalid canonical | 69 |
| canonical pointing to another URL | 74 |
| missing H1 | 79 |

### Indexability

Starts at `25`.

Penalties:

- `-15` for `noindex`
- `-4` for `nofollow`
- `-3` for missing canonical
- `-8` for invalid canonical
- `-8` for canonical pointing to another URL

Canonical comparison ignores URL hash, normalizes trailing slashes, and removes known tracking parameters (`utm_*`, `gclid`, `fbclid`, `msclkid`, `yclid`, `gbraid`, `wbraid`, `_ga`, `_gl`, `mc_cid`, `mc_eid`). A canonical that matches the same origin/path after removing those tracking parameters is treated as matching the current URL. A canonical with a genuinely different path remains `canonical_other_url`.

### Metadata

Starts at `20`.

Penalties:

- `-12` for missing title
- `-3` for title length outside `30..65`
- `-10` for missing meta description
- `-2` for meta description length outside `110..170`

### Headings

Starts at `15`.

Penalties:

- `-10` for missing H1
- multiple H1:
  - `-8` if `H1 count >= 8`
  - `-7` if `H1 count >= 5`
  - `-5` if `H1 count > 1`
- skipped heading levels:
  - `-6` if there are at least 3 skip examples
  - `-5` otherwise

If an H1 exists, combined multiple-H1 and skipped-heading penalties are capped at `-10`.

### Technical Basics

Starts at `10`.

Penalties:

- `-4` for missing or weak viewport
- `-2` for missing `lang`
- `-2` for missing charset

### Schema

Starts at `8`.

Penalties:

- invalid JSON-LD:
  - `-5` on commercial pages
  - `-2` on non-commercial pages
- no valid JSON-LD/schema types:
  - `-4` on commercial pages
  - `-2` on non-commercial pages

### Images

Starts at `10`.

Meaningful images exclude detectable decorative/hidden images. Penalty is based on:

```text
missingAltRatio = missingAlt / meaningfulTotal
```

Tiers:

- `> 0.85`: `-8`
- `> 0.60`: `-7`
- `> 0.30`: `-5`
- `> 0.05`: `-3`
- otherwise `0`

### Links

Starts at `5`.

Penalties:

- `-3` if placeholder links `> 3`
- `-1` if placeholder links `>= 1`
- `-2` if the page has links but zero internal links

Links are intentionally not a major score driver.

### Secondary Insights

Starts at `7`.

Penalties:

- `-1` for missing `og:title`
- `-1` for missing `og:description`
- `-2` for missing `og:image`
- `-1` for missing Twitter card basics

Schema and preview tags stay secondary and do not create high `Traffic Risk` by themselves.

## Diagnostic Info-Only Issues

Some signals are shown as diagnostics but do not reduce the score:

- long URL
- deep path
- URL/topic mismatch
- missing contextual internal links
- long paragraphs
- low content depth for this page type
- generic image filenames
- images without explicit dimensions
- generic anchor text

These issues have `infoOnly = true` and are excluded from `Top fixes`.

## Traffic Risk Rules

`Traffic Risk` is separate from the score.

### High

High risk is reserved for strong current-page signals:

- `noindex`
- missing title
- invalid canonical
- canonical pointing to another URL
- missing H1 only when combined with other major issues
- major mixed indexability/metadata clusters

### Medium

Medium risk covers issues like:

- missing meta description
- weak title/meta length when the score is below 90 or other compound issues are present
- missing H1 without a major cluster
- multiple H1
- weak heading structure
- invalid or missing useful schema
- many images without alt
- missing viewport
- many placeholder links

### Low

Low risk covers minor/supporting signals:

- missing Open Graph
- missing Twitter tags
- missing `lang`
- missing charset
- social-only metadata
- minor link count insights
- some placeholder links
- minor title/meta length deviations on otherwise strong pages

## Top Fixes

Top fixes are generated from unresolved, non-info-only issues.

Each fix includes:

- `Issue`
- `Evidence`
- `Why it matters`
- `Fix`
- `Impact`
- `Confidence`

Priority formula:

```text
priority =
  severityWeight * 10 +
  scoreImpact +
  commercialIntentBonus
```

Severity weights:

- `high = 3`
- `medium = 2`
- `low = 1`

Commercial bonus:

- `+5` for metadata/indexability issues on commercial pages

Low-confidence issues are excluded from Top Fixes so secondary/social-only findings do not outrank high-confidence SEO issues.

## SERP Preview

The preview uses only:

- detected title
- detected meta description
- current URL without hash

If title or description is missing, it shows a clear missing state. It does not pretend to know the exact Google snippet.

## UI

Popup above the fold is score-first:

1. product name and current URL context
2. SEO Score
3. Grade
4. Traffic Risk
5. Top fixes
6. SERP Preview
7. Section Breakdown

The Summary view also includes a collapsed `Score details` accordion with section weights, current section scores, score deductions, section subtotal, critical cap status, final score, and informational-only signals when present.

Report tabs:

- `Overview`
- `Meta`
- `Headers`
- `Images`
- `Links`
- `Schema`
- `Resources`

`Resources` is informational only. Resource counts do not affect the SEO Score.

`Robots.txt` is shown as a site-level reference only. It is not mixed with the page-level robots meta signal and does not affect the current-page SEO Score.

## Export

### Links CSV

Generated locally with `Blob`.

Columns:

- `Anchor text`
- `Type`
- `Follow`
- `URL kind`
- `URL`
- `Rel`

### PDF

The popup opens:

```text
src/report/report.html
```

Before opening the report tab, the popup stores the current-page payload in extension-local `localStorage`. `src/report/report.js` hydrates a printable local report from that payload. The user saves through Chrome's print dialog.

## Error States

The extension handles:

- normal HTML pages
- `chrome://` pages
- Chrome Web Store pages
- browser settings pages
- extension pages
- PDF/image/empty tabs
- injection failures
- pages that need refresh after extension install

Restricted-page message:

```text
Chrome does not allow extensions to inspect this page. Open a regular website page and try again.
```

General refresh hint:

```text
Refresh the page and run the check again.
```

Unsupported-page message:

```text
SEO Score Checker analyzes regular HTML pages only. Open a public HTML page and run the check again.
```

## Manual QA Checklist

Check:

- normal page with good SEO
- page with no title
- page with no meta description
- page with noindex
- page with canonical to another URL
- page with no H1
- page with multiple H1s
- page with invalid JSON-LD
- page with many images without alt
- page with only social metadata missing
- `chrome://` page
- Chrome Web Store page
- PDF tab
- image tab
- empty tab

Expected:

- no crashes
- clear error on restricted pages
- score changes are explainable
- Top fixes include evidence
- Traffic Risk is not shown as a revenue prediction
- social-only issues stay low/secondary
- no external network requests for analysis
- no broad permissions

## Privacy

- no external API calls
- no analytics
- no telemetry
- no remote scripts
- no remote logging
- no page content sent outside the browser
- no full page HTML stored

## Non-Goals

Do not implement:

- multi-page domain review
- crawling
- sitemap parsing
- PageSpeed
- Core Web Vitals
- backlink checks
- keyword research
- rank tracking
- competitor analysis
- AI recommendations
- remote API scoring
- account system
- payment system
- analytics
- onboarding
- localization

The goal is:

```text
SEO Score Checker = current-page SEO score + explainable top fixes
```
