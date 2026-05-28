# SEO Score Checker

`SEO Score Checker` is a Manifest V3 Chrome extension for current-page SEO scoring and explainable top fixes.

It checks only the currently open URL / active tab. It is not a crawler, full website audit, rank tracker, backlink checker, keyword tool, PageSpeed tool, or SEO suite.

## Product Promise

The popup answers one question:

```text
How good is this page's SEO right now?
```

The first screen shows:

- `SEO Score` from `0` to `100`
- `Grade`: `Good`, `Needs improvement`, or `Critical issues`
- `Traffic Risk`: `Low`, `Medium`, or `High`
- explainable `Top 3 Fixes`
- `SERP Preview`
- `Section Breakdown`

`Traffic Risk` is a heuristic priority label for organic visibility, snippets, clicks, and common publishing issues. It is not a revenue estimate or ROI forecast.

## Architecture

The extension keeps the existing vanilla JavaScript stack:

- `manifest.json`: Manifest V3 configuration
- `popup.html`: popup shell
- `popup.js`: active tab lookup, script injection, analysis orchestration, CSV/PDF actions
- `content.js`: local DOM collection in the active tab
- `report.html` / `report.js`: printable report page for PDF export
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
3. `popup.js` injects `content.js` with `chrome.scripting.executeScript`.
4. `content.js` collects DOM-derived `pageData`.
5. The popup computes:
   - `scorePage(pageData)`
   - `calculateRevenueRisk(audit.issues, pageData)` internally
   - `getTopFixes(audit.issues, pageData)`
   - `buildSerpPreview(pageData)`
6. The UI renders the current-page report.

Internal function names may still include `revenueRisk`; visible UI uses `Traffic Risk`.

## DOM Signals Collected

`content.js` collects only current-page data:

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

It does not store full page HTML, crawl links, fetch linked pages, or send DOM data to a server.

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

### Indexability

Starts at `25`.

Penalties:

- `-15` for `noindex`
- `-4` for `nofollow`
- `-3` for missing canonical
- `-8` for invalid canonical
- `-8` for canonical pointing to another URL

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

Social metadata stays secondary and does not create high `Traffic Risk`.

## Diagnostic Info-Only Issues

Some signals are shown as diagnostics but do not reduce the score:

- long URL
- deep path
- URL/topic mismatch
- missing contextual internal links
- long paragraphs
- low content depth on commercial pages
- generic image filenames
- images without explicit dimensions
- generic anchor text

These issues have `infoOnly = true` and are excluded from `Top 3 Fixes`.

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
- weak title/meta length
- missing H1 without a major cluster
- multiple H1
- weak heading structure
- invalid or missing useful schema
- many images without alt
- missing viewport
- notable link/placeholder issues

### Low

Low risk covers minor/supporting signals:

- missing Open Graph
- missing Twitter tags
- missing `lang`
- missing charset
- social-only metadata
- minor link count insights

## Top 3 Fixes

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
5. Top 3 Fixes
6. SERP Preview
7. Section Breakdown

Report tabs:

- `Overview`
- `Page`
- `Links`
- `Content`
- `Secondary`

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
report.html#data=<encoded current-page payload>
```

`report.js` hydrates a printable local report. The user saves through Chrome's print dialog.

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
- Top 3 Fixes include evidence
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

- full website/domain audit
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
