# SEO Score Checker: Functions, Metrics, and Scoring

Документ описывает текущую реализацию расширения по коду проекта: какие функции есть, какие метрики собираются, какие derived-данные строятся поверх DOM-сигналов и как рассчитывается `SEO Score`.

## Scope

Расширение анализирует только текущую активную вкладку. Оно не краулит домен, не проверяет позиции, не делает собственный PageSpeed/Core Web Vitals анализ, не использует удаленный API и не отправляет DOM-данные наружу.

Основной поток:

1. `popup.js` получает активную вкладку.
2. `popup.js` блокирует restricted URL, куда Chrome не разрешает инжектить content script.
3. `popup.js` инжектит `src/content/content.js`.
4. `content.js` возвращает `pageData`.
5. Popup строит:
   - `audit = scorePage(pageData)`
   - `risk = calculateTrafficRisk(audit.issues, pageData)`
   - `topFixes = getTopFixes(audit.issues, pageData)`
   - `serpPreview = buildSerpPreview(pageData)`
6. UI рендерит popup/report и локальные экспорты.

## Product Features

| Feature | Где реализовано | Что делает |
| --- | --- | --- |
| Active page audit | `popup.js`, `src/content/content.js` | Собирает DOM-сигналы с текущей вкладки. |
| SEO Score | `src/analyzer/scorePage.js` | Считает итоговый score `0..100` из секционных score и применяет critical caps. |
| Score label | `src/analyzer/scorePage.js` | Присваивает `Good`, `Needs improvement`, `Critical issues`. |
| Traffic Risk | `src/analyzer/trafficRisk.js` | Выставляет эвристический риск `Low`, `Medium`, `High`. |
| Top 3 Fixes | `src/analyzer/recommendations.js` | Выбирает 3 приоритетные исправления с evidence/confidence. |
| SERP Preview | `src/analyzer/serpPreview.js` | Строит пример поискового сниппета из title, description и URL. |
| Section Breakdown | `src/ui/renderSections.js`, `src/ui/reportView.js` | Показывает score по секциям. |
| Score details | `src/ui/reportView.js`, `src/ui/reportMarkdown.js` | Объясняет formula, section scores with `Total`, score deductions with section names, critical cap status, and info-only signals when present. |
| Meta tab | `src/ui/reportView.js` | Показывает title, description, canonical, robots, viewport, URL-сигналы. |
| Headers tab | `src/ui/reportView.js` | Показывает H1-H6, структуру заголовков, content depth. |
| Images tab | `src/ui/reportView.js` | Показывает alt-тексты, missing alt ratio, filenames, dimensions. |
| Links tab | `src/ui/reportView.js` | Показывает internal/external/placeholder links, anchors, follow/nofollow. |
| Schema tab | `src/ui/reportView.js` | Показывает JSON-LD, Open Graph, Twitter/X, commercial intent. |
| Resources tab | `src/ui/reportView.js` | Показывает HTML/CSS/JS ресурсы, inline/external counts. Informational only. |
| Help tooltips | `src/ui/helpText.js`, `src/ui/tooltipPlacement.js` | Рисует и позиционирует подсказки `?`. |
| Link/resource interactivity | `src/ui/renderInteractiveValue.js`, `popup.js` | Делает URL кликабельными, открывает ресурсы, preview images. |
| Links CSV export | `popup.js` | Экспортирует таблицу ссылок через локальный `Blob`. |
| Resources CSV export | `popup.js` | Экспортирует таблицу ресурсов через локальный `Blob`. |
| PDF/printable report | `popup.js`, `src/report/report.js`, `src/ui/reportView.js` | Открывает локальную printable report page для печати/PDF. |
| Markdown report copy | `src/report/report.js`, `src/ui/reportMarkdown.js` | Копирует printable report в Markdown; H1 содержит дату локального времени в английском формате без секунд. |

## Tooltip Map

Визуальные tooltip-подсказки рендерятся через `renderHelpTip()` как `.help-tip` с символом `?`, а показываются через `bindHelpTooltips()`. Tooltip у иконки расширения в браузерной панели задается отдельно через `manifest.json` -> `action.default_title`.

Одинаковые tooltip-триггеры появляются и в popup, и в printable report, если соответствующий блок рендерится в обоих местах.

| UI area | Element | Tooltip text |
| --- | --- | --- |
| Browser toolbar | Extension icon | Check SEO Score |
| Summary / Overview | `SEO Score` label | A 0-100 score for the current open page based on the checks in this extension. It is not a full website or domain audit. |
| Summary / Overview | `Traffic Risk` label | A heuristic priority label based on detected page issues. It is not a revenue estimate, ranking forecast, or traffic prediction. |
| Overview | `Section Breakdown` label | Each section starts from its maximum points and loses points for detected issues. The percentage is section score divided by maximum score; insights are shown for context but do not reduce score. |
| Overview / Section Breakdown | `Indexability` section card | Starts at 25 points. Checks robots noindex/nofollow and canonical tag presence, validity, and whether it points to the current URL. Blocking or conflicting signals subtract points. |
| Overview / Section Breakdown | `Metadata` section card | Starts at 20 points. Checks title and meta description presence plus healthy length ranges. Missing tags cost more; weak lengths subtract smaller penalties. |
| Overview / Section Breakdown | `Headings` section card | Starts at 15 points. Checks for an H1, whether there is only one H1, and whether heading levels skip unexpectedly. Structure issues subtract points. |
| Overview / Section Breakdown | `Technical basics` section card | Starts at 10 points. Checks viewport responsiveness, HTML language, and charset signals collected from page metadata. Missing basics subtract points. |
| Overview / Section Breakdown | `Schema` section card | Starts at 8 points. Checks JSON-LD structured data on the current page. Missing schema may be a small signal; invalid schema is more important when structured data is expected. |
| Overview / Section Breakdown | `Images` section card | Starts at 10 points. Counts meaningful images and alt text coverage. Hidden, decorative, or tiny images are ignored where possible. |
| Overview / Section Breakdown | `Links` section card | Starts at 5 points. Counts total, internal, external, placeholder links, contextual internal links, and generic anchors. Placeholder links and weak internal linking subtract points. |
| Overview / Section Breakdown | `Secondary insights` section card | Starts at 7 points. Checks Open Graph and Twitter/X preview tags used for shared-link previews. Missing title, description, image, or card basics subtract points. |
| Meta tab | `Hostname` field label | Domain name of the audited page. |
| Meta tab | `Title` field label | The page title from the title tag. It is often used as the search result headline. |
| Meta tab | `Title length` field label | Number of characters in the page title. The target range is usually about 30 to 65 characters. |
| Meta tab | `Meta description` field label | The meta description tag, often used as search result snippet text. |
| Meta tab | `Meta description length` field label | Number of characters in the meta description. The target range is usually about 110 to 170 characters. |
| Meta tab | `Canonical` field label | Canonical URL declared by the page as the preferred version. |
| Meta tab | `Canonical exists` field label | Whether a canonical link tag was found. |
| Meta tab | `Canonical valid` field label | Whether the canonical URL can be parsed as a valid URL. |
| Meta tab | `Canonical matches current URL` field label | Whether the canonical URL points to this page after basic URL normalization. A different canonical may be intentional for duplicate pages. |
| Meta tab | `Robots meta` field label | Robots meta tag content on the current page, not the site-level robots.txt file. |
| Meta tab | `Googlebot` field label | Googlebot-specific robots directives, if present. |
| Meta tab | `Noindex` field label | Whether the page asks search engines not to index it. |
| Meta tab | `Nofollow` field label | Whether the page asks search engines not to follow links on it. |
| Meta tab | `Charset` field label | Detected character encoding, such as UTF-8. |
| Meta tab | `Viewport` field label | Viewport meta tag used for mobile layout behavior. |
| Meta tab | `Path depth` field label | Number of path segments in the URL. |
| Meta tab | `Slug reflects topic` field label | A heuristic check of whether URL words overlap with the page title or H1. It is only a supporting signal. |
| Images tab | `Missing alt percentage` field label | Percentage of meaningful images that are missing non-empty alt text. |
| Images tab | `Generic image filenames` field label | Count of meaningful images whose source filename is generic, such as image1.jpg or photo-123.png, which gives weaker image context. |
| Images tab | `Images without dimensions` field label | Count of meaningful images missing explicit width or height attributes in the HTML, which can make layout shift while images load. |
| Links tab | `Internal` stat badge | Links that point to the same host or site. |
| Links tab | `External` stat badge | Links that point to other sites. |
| Links tab | `Placeholder` stat badge | Empty, hash-only, or javascript links that do not lead to a real destination. |
| Links tab | `Contextual internal` stat badge | Internal links found inside meaningful page content. |
| Links tab | `Generic anchors` stat badge | Links with weak anchor text, such as click here or learn more. |
| Schema tab | `Structured Data` subtitle | This block summarizes JSON-LD structured data found on the page: total blocks, valid and invalid blocks, and detected Schema.org types. |
| Schema tab | `Social Preview Tags` subtitle | This block shows Open Graph and Twitter/X preview tags used by social platforms when the page is shared: title, description, image, and card type. |
| Schema tab | `Commercial Signals` subtitle | Label for business/conversion terms on the current page. Used only to prioritize SEO fixes, not to estimate revenue. |
| Resources tab | `External` stat badge | Resources loaded from another URL or host, such as external CSS, JavaScript, images, or preloads. |
| Resources tab | `Inline` stat badge | Resources embedded directly in the page HTML, such as inline style or script blocks without their own URL. |

Некоторые строки есть в `HELP_TEXTS`, но в текущих основных popup/report вкладках не получают видимый `?`, потому что `renderHelpLabel()` показывает tooltip только для labels из `HELP_ENABLED_LABELS`, либо потому что соответствующий renderer сейчас не используется активной навигацией.

## Full Function Inventory

Ниже перечислены именованные функции и локальные function/const helpers, которые есть в проекте. Inline anonymous callbacks в `map`, `forEach`, event listeners и `setTimeout` отдельно не раскрываются, если они не вынесены в именованную функцию.

### `popup.js`

| Function | Purpose |
| --- | --- |
| `openResourceLink(link)` | Открывает URL ресурса, при ошибке может fallback-нуться на исходный URL. |
| `setState(nextState)` | Обновляет `currentState`, перерендеривает app и бинды. |
| `bindActions()` | Навешивает обработчики на tabs, export и links. |
| `isRestrictedUrl(url)` | Блокирует `chrome:`, `edge:`, `brave:`, `about:`, `chrome-extension:`, Chrome Web Store. |
| `getActiveTab()` | Получает активную вкладку через `chrome.tabs.query`. |
| `collectPageData(tabId)` | Инжектит `src/content/content.js` через `chrome.scripting.executeScript`. |
| `runAudit()` | Главный orchestration: active tab, restricted checks, collect, score, risk, fixes, SERP. |
| `exportPdf()` | Сохраняет report payload в localStorage и открывает `src/report/report.html`. |
| `exportLinksCsv()` | Экспортирует `pageData.links.items` в CSV. |
| `escapeCsv(value)` inside `exportLinksCsv` | Экранирует CSV-значение для links export. |
| `exportResourcesCsv()` | Экспортирует `pageData.resources.html/css/js` в CSV. |
| `escapeCsv(value)` inside `exportResourcesCsv` | Экранирует CSV-значение для resources export. |

### `src/content/content.js`

| Function | Purpose | Main output |
| --- | --- | --- |
| `textContentOf(node)` | Возвращает trim-нутый `textContent`. | string |
| `tokenize(text)` | Токенизирует текст для URL/topic matching, убирает stop words. | string[] |
| `metaContent(selector)` | Читает `content` у meta-тега. | string |
| `normalizeComparableUrl(url)` | Нормализует URL для сравнения canonical/current URL. | string |
| `collectCanonical()` | Собирает canonical href, existence, validity, self-canonical flag. | `canonical` |
| `collectRobots()` | Собирает robots/googlebot meta и флаги `noindex`/`nofollow`. | `robots` |
| `parseRobotsTxt(url, text, response)` | Парсит robots.txt response: allow/disallow/sitemap/preview. | `robotsTxt` |
| `collectRobotsTxt()` | Fetch-ит `/robots.txt` текущего origin с timeout 2500 ms. | `robotsTxt` |
| `collectHeadings()` | Собирает H1-H6, counts, skipped levels. | `h1`, `headings` |
| `extractJsonLdTypes(value, types)` | Рекурсивно достает `@type` из JSON-LD и `@graph`. | Set mutation |
| `collectJsonLd()` | Парсит `script[type="application/ld+json"]`. | `jsonLd` |
| `isHiddenImage(image)` | Определяет decorative/hidden image. | boolean |
| `collectImages()` | Собирает image counts, alt coverage, filenames, dimensions, samples. | `images` |
| `classifyLink(anchor)` | Классифицирует ссылку как `internal`, `external`, `placeholder`. | link classification |
| `collectLinks()` | Собирает link counts, generic anchors, follow/nofollow, items. | `links` |
| `collectTechnical()` | Собирает viewport, responsive viewport, lang, charset. | `technical` |
| `collectSocial()` | Собирает Open Graph и Twitter/X meta tags. | `openGraph`, `twitter` |
| `collectCommercialIntent(titleText, h1Texts)` | Ищет commercial terms в URL/title/H1/body snippet. | `commercialIntent` |
| `collectUrlSignals(titleText, h1Texts)` | Считает URL length/path/query/topic matching. | `urlSignals` |
| `collectReadability()` | Считает paragraphs, words, long paragraphs, content depth. | `readability` |
| `resolveResourceUrl(value)` | Превращает resource URL в absolute URL. | string |
| `collectPageResources()` | Собирает HTML/CSS/JS resources, inline/external totals. | `resources` |
| `collectPageData()` | Главный сборщик DOM-метрик. | `pageData` |

### `src/analyzer/scorePage.js`

| Function | Purpose |
| --- | --- |
| `clamp(value, min, max)` | Ограничивает число диапазоном. |
| `hasGoodTitleLength(length)` | Проверяет title length `30..65`. |
| `hasGoodDescriptionLength(length)` | Проверяет meta description length `110..170`. |
| `buildInfoIssue(id, section, title, recommendation)` | Создает diagnostic issue без потери score. |
| `pushIssueOrPass(items, condition, issueId, passedId, passedTitle, overrides)` | Добавляет issue или passed check. |
| `scoreIndexability(pageData)` | Считает секцию indexability. |
| `scoreMetadata(pageData)` | Считает секцию metadata. |
| `scoreStructure(pageData)` | Считает секцию headings. |
| `scoreTechnicalBasics(pageData)` | Считает секцию technical basics. |
| `scoreSchema(pageData)` | Считает секцию schema. |
| `scoreImages(pageData)` | Считает секцию images. |
| `scoreLinks(pageData)` | Считает секцию links. |
| `scoreSecondary(pageData)` | Считает секцию secondary insights. |
| `getScoreLabel(score)` | Возвращает `Good`, `Needs improvement`, `Critical issues`. |
| `hasUnresolvedIssue(issues, issueId)` | Проверяет наличие unresolved issue перед score cap. |
| `applyScoreCaps(score, issues)` | Применяет final score caps для критических page-level issues. |
| `getScoreCap(issues)` | Возвращает самый строгий applicable cap по unresolved critical issues. |
| `scorePage(pageData)` | Главная scoring-функция. Возвращает `audit`. |

### `src/analyzer/trafficRisk.js`

| Function | Purpose |
| --- | --- |
| `hasIssue(issues, id)` | Проверяет наличие unresolved issue по id. |
| `findFirst(issues, ids)` | Находит первый unresolved issue из списка id. |
| `buildClusterReason(unresolved)` | Строит текст reason для группы важных issues. |
| `calculateTrafficRisk(issues, pageData)` | Возвращает Traffic Risk object. |

### `src/analyzer/recommendations.js`

| Function | Purpose |
| --- | --- |
| `getConfidence(issue, pageData)` | Выставляет confidence для issue. |
| `getEvidence(issue, pageData)` | Генерирует evidence по issue и `pageData`. |
| `getWhyItMatters(issue)` | Генерирует SEO rationale по section. |
| `getTopFixes(issues, pageData)` | Считает priority, фильтрует low confidence, сортирует и берет top 3. |

### Other analyzer and constants

| File | Function | Purpose |
| --- | --- | --- |
| `src/analyzer/serpPreview.js` | `buildSerpPreview(pageData)` | Возвращает title/description/url для SERP preview. |
| `src/analyzer/normalizeUrl.js` | `normalizeUrl(input)` | Нормализует URL: убирает hash, default ports, trailing slash. |
| `src/constants/issueCatalog.js` | `buildIssue(id, overrides)` | Создает issue из catalog. |
| `src/constants/issueCatalog.js` | `buildPassedCheck(id, section, title)` | Создает passed check. |

### `src/report/report.js`

| Function | Purpose |
| --- | --- |
| `parseReportPayload()` | Читает report payload из hash `#data=` или localStorage. |
| `renderMissingState()` | Рендерит state, если report payload отсутствует. |
| `copyTextToClipboard(text)` | Копирует Markdown report. |
| `showButtonFeedback(button, label)` | Временно меняет label кнопки. |
| `hydrateReport()` | Строит printable report, бинды print/copy/close. |

### UI helpers and renderers

| File | Function | Purpose |
| --- | --- | --- |
| `src/ui/escapeHtml.js` | `escapeHtml(value)` | Экранирует HTML. |
| `src/ui/helpText.js` | `normalizeHelpKey(label)` | Нормализует ключ подсказки. |
| `src/ui/helpText.js` | `getHelpText(label)` | Возвращает текст подсказки или default. |
| `src/ui/helpText.js` | `renderHelpTip(label, helpText)` | Рендерит trigger `?` с `data-help`. |
| `src/ui/helpText.js` | `renderHelpLabel(label, helpText)` | Рендерит label с tooltip, если label разрешен. |
| `src/ui/renderApp.js` | `renderAudit(root, data, activeTab)` | Рендерит успешный audit state. |
| `src/ui/renderApp.js` | `renderApp(root, state)` | Рендерит loading/restricted/unsupported/error/success. |
| `src/ui/renderScore.js` | `getBadgeClass(scoreLabel)` | CSS class для score label. |
| `src/ui/renderScore.js` | `renderScore(audit)` | Рендерит score card. |
| `src/ui/renderRisk.js` | `renderRisk(risk)` | Рендерит Traffic Risk card. |
| `src/ui/renderTopFixes.js` | `getImpactClass(scoreImpact)` | CSS impact class по величине score loss. |
| `src/ui/renderTopFixes.js` | `getConfidenceClass(confidence)` | CSS confidence class. |
| `src/ui/renderTopFixes.js` | `renderTopFixes(topFixes)` | Рендерит Top 3 Fixes. |
| `src/ui/renderSerpPreview.js` | `renderSerpPreview(serpPreview)` | Рендерит SERP preview. |
| `src/ui/renderStates.js` | `renderState(root, title, description, options)` | Generic state card. |
| `src/ui/renderStates.js` | `renderLoading(root)` | Loading state. |
| `src/ui/renderStates.js` | `renderRestricted(root)` | Restricted page state. |
| `src/ui/renderStates.js` | `renderUnsupported(root)` | Unsupported page state. |
| `src/ui/renderStates.js` | `renderError(root)` | Error/recheck state. |

### `src/ui/renderInteractiveValue.js`

| Function | Purpose |
| --- | --- |
| `formatValue(value)` | Форматирует number/boolean/null/empty/string. |
| `getPathname(url)` | Возвращает pathname URL lower-case. |
| `hasExtension(url, extensions)` | Проверяет extension по pathname. |
| `hasImageDeliverySignal(url)` | Определяет image CDN/delivery URL без явного image extension. |
| `isImageUrl(url)` | Отличает image URL от source URL. |
| `isSourceUrl(url)` | Определяет source/resource URL (`.css`, `.js`, `.html`, etc). |
| `stripTrailingPunctuation(value)` | Отделяет пунктуацию после URL. |
| `renderLink(url)` | Рендерит кликабельный URL, image preview для image URL. |
| `renderStringValue(value)` | Находит URL внутри строки и рендерит их как links. |
| `renderInteractiveValue(value)` | Рендерит scalar/array value для UI. |

### `src/ui/tooltipPlacement.js`

| Function | Purpose |
| --- | --- |
| `clamp(value, min, max)` | Ограничивает координаты tooltip. |
| `getViewport()` | Возвращает viewport width/height. |
| `ensureFloatingTooltip()` | Создает singleton floating tooltip. |
| `choosePlacement(triggerRect, tooltipRect, viewport)` | Выбирает `top`, `bottom`, `right`, `left`. |
| `getTooltipCoordinates(placement, triggerRect, tooltipRect, viewport)` | Считает координаты tooltip. |
| `positionArrow(placement, triggerRect, coordinates, tooltipRect)` | Позиционирует arrow. |
| `positionTooltip(trigger)` | Измеряет и ставит tooltip около trigger. |
| `showTooltip(trigger)` | Показывает tooltip, задает `aria-describedby`. |
| `hideTooltip()` | Скрывает tooltip. |
| `findHelpTrigger(event, root)` | Находит `.help-tip` в event target. |
| `bindGlobalListeners()` | Биндит resize/scroll/Escape listeners. |
| `bindHelpTooltips(root)` | Биндит pointer/focus listeners для help tips. |

### `src/ui/reportView.js`

| Function | Purpose |
| --- | --- |
| `renderTable(headers, rows, options)` | Рендерит HTML table. |
| `getRangeStatus(value, thresholds)` | Возвращает `good`, `warn`, `danger`. |
| `renderLengthMetric(value, thresholds, unit)` | Рендерит length metric с target range. |
| `formatPercentage(value)` | Форматирует ratio как percent. |
| `renderValueRow(label, value)` | Рендерит label/value row. |
| `renderStatBadge(label, value, modifier, options)` | Рендерит stat badge. |
| `renderIssueCards(title, issues, emptyState)` | Рендерит issue cards внутри tab. |
| `getScoreSectionLabel(sectionKey)` | Возвращает label для Score details section table and deductions; `secondary` отображается как `Preview tags`. |
| `renderScoreDetails(audit, options)` | Рендерит collapsed Score details в popup и открытый блок в printable report. Таблица включает `Total`; deductions показывают section in parentheses; info-only блок скрыт, если сигналов нет. |
| `getSectionIssues(data, sectionKeys)` | Фильтрует unresolved issues по sections. |
| `getStructuredIssues(data)` | Фильтрует schema/preview issues. |
| `renderRobotsTxtSummary(robotsTxt)` | Рендерит robots.txt/sitemaps summary with an informational-only disclaimer. |
| `renderPageMetricLabel(label)` | Рендерит label с/без tooltip для Meta tab. |
| `renderPageTab(data)` | Рендерит Meta tab. |
| `renderLinksTab(data)` | Рендерит Links tab. |
| `renderContentTab(data)` | Рендерит Headers tab. |
| `renderImagesTab(data)` | Рендерит Images tab. |
| `renderSocialTab(data)` | Рендерит Schema tab. |
| `renderResourcesTab(data, options)` | Рендерит Resources tab. |
| `renderTabNav(activeTab)` | Рендерит tab navigation. |
| `renderActiveTab(data, activeTab)` | Выбирает активный tab renderer. |
| `renderReportView(data, activeTab)` | Рендерит popup report view. |
| `renderPrintableTab(title, markup)` | Оборачивает printable section. |
| `buildPrintableReport(data)` | Строит HTML printable report. |

### `src/ui/renderSections.js`

| Function | Purpose |
| --- | --- |
| `formatSeverityLabel(severity)` | Capitalize severity label. |
| `formatPercentage(value)` | Форматирует ratio как percent. |
| `renderIssueCard(issue)` | Рендерит issue card для legacy/section report. |
| `renderPassedCard(item)` | Рендерит passed check card. |
| `renderValueRow(label, value)` | Рендерит label/value row. |
| `renderSectionSummaryLabel(sectionKey)` | Рендерит section summary label с tooltip. |
| `getDataGroups(pageData)` | Собирает группы rows для data report. |
| `renderSectionSummary(audit)` | Рендерит section breakdown. |
| `renderIssuesReport(audit)` | Рендерит grouped issues report. |
| `renderPassedReport(audit)` | Рендерит grouped passed checks report. |
| `renderDataReport(pageData)` | Рендерит grouped data report. |

### `src/ui/reportMarkdown.js`

| Function | Purpose |
| --- | --- |
| `formatValue(value)` | Форматирует значения для Markdown. |
| `formatPercentage(value)` | Форматирует ratio как percent. |
| `markdownCell(value)` | Экранирует table cell. |
| `table(headers, rows)` | Строит Markdown table. |
| `progressBar(percent)` | Строит текстовый progress bar. |
| `sectionRows(audit)` | Строит rows для section breakdown. |
| `issueRows(issues)` | Строит rows для issues table. |
| `scoreDetailRows(audit)` | Строит rows `Section / Max / Current` для Markdown Score details, включая итоговую строку `Total / 100 / audit.score`. |
| `scoreDeductionRows(audit)` | Строит rows `Issue / Section / Points` для Markdown score deductions. |
| `informationalIssueRows(audit)` | Строит rows info-only signals для Markdown; section is omitted when no info-only rows exist. |
| `scoreCapText(audit)` | Формирует Markdown-текст о final cap status: `No critical cap applied.` или `Final score capped at ... because ... was detected.` |
| `resourceRows(resources)` | Объединяет resources в rows. |
| `imageSize(item)` | Форматирует `widthxheight`. |
| `formatLocalReportDate(date)` | Форматирует локальную дату отчета через `Intl.DateTimeFormat("en-US")` без секунд и миллисекунд. |
| `buildMarkdownReport(data)` | Строит полный Markdown report. |

## Raw Metrics Collected in `pageData`

`pageData` возвращается из `collectPageData()` в `src/content/content.js`.

### Top-level

| Field | Type | Source | Used for score |
| --- | --- | --- | --- |
| `url` | string | `location.href` | Indirectly, for display/SERP/resources. |
| `hostname` | string | `location.hostname` | Display/export filenames. |
| `title` | object | `<title>` | Yes, metadata. |
| `metaDescription` | object | `meta[name="description"]` | Yes, metadata. |
| `canonical` | object | `link[rel~="canonical"]` | Yes, indexability. |
| `robots` | object | `meta[name="robots"]`, `meta[name="googlebot"]` | Yes, indexability. |
| `h1` | object | `h1` nodes | Yes, headings. |
| `headings` | object | `h1..h6` nodes | Yes, headings. |
| `jsonLd` | object | JSON-LD script tags | Yes, schema. |
| `images` | object | `document.images` | Yes for alt ratio, diagnostics for filenames/dimensions. |
| `links` | object | `a[href]` nodes | Yes for placeholders/internal links, diagnostics for anchors. |
| `technical` | object | viewport/lang/charset | Yes, technical. |
| `openGraph` | object | OG meta tags | Yes, secondary. |
| `twitter` | object | Twitter/X meta tags | Yes, secondary. |
| `commercialIntent` | object | URL/title/H1/body snippet | Affects schema penalties, top fixes priority, risk. |
| `urlSignals` | object | URL + title/H1 tokens | Info-only diagnostics/display. |
| `readability` | object | paragraphs | Info-only diagnostics/risk. |
| `resources` | object | DOM resource tags | Display/export only. |
| `robotsTxt` | object | fetch `/robots.txt` | Display only. |

### `title`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `text` | Text from `<title>`. | Missing title penalty. |
| `length` | Character count. | Title length penalty. |
| `exists` | Boolean title presence. | Missing title check. |

### `metaDescription`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `text` | `content` from `meta[name="description"]`. | Missing description penalty. |
| `length` | Character count. | Description length penalty. |
| `exists` | Boolean description presence. | Missing description check. |

### `canonical`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `href` | Resolved canonical href, or raw invalid href. | Evidence/display. |
| `exists` | Whether canonical tag exists. | Missing canonical penalty. |
| `isValid` | Whether canonical URL can be parsed. | Invalid canonical penalty. |
| `pointsToCurrentUrl` | Whether normalized canonical equals normalized current URL. | Other URL penalty. |

### `robots`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `content` | Robots meta content. | Source for directives. |
| `googlebotContent` | Googlebot meta content. | Source for directives. |
| `noindex` | Combined robots/googlebot contains `noindex`. | `-15` indexability. |
| `nofollow` | Combined robots/googlebot contains `nofollow`. | `-4` indexability. |

### `robotsTxt`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `url` | Checked robots.txt URL. | Display. |
| `status` | `found`, `not found`, `fetch failed`, `timeout`, `not checked`. | Display. |
| `statusCode` | HTTP status or `null`. | Display. |
| `contentType` | Response content type. | Display/debug. |
| `size` | Response text length. | Display/debug. |
| `allowCount` | Count of `Allow:` directives. | Display. |
| `disallowCount` | Count of `Disallow:` directives. | Display. |
| `sitemapCount` | Count of `Sitemap:` directives. | Display. |
| `sitemapUrls` | Up to first 20 sitemap URLs. | Display/report. |
| `preview` | First 20 lines. | Collected but not heavily surfaced. |
| `truncated` | Whether lines or sitemaps exceeded preview limit. | Collected/debug. |

### `h1` and `headings`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `h1.count` | Number of H1 nodes. | Missing/multiple H1 penalties. |
| `h1.texts` | Non-empty H1 texts. | Commercial intent and display. |
| `headings.total` | Total H1-H6 count. | Display. |
| `headings.items[]` | `{ level, text }` for every heading. | Display. |
| `headings.hasSkippedLevels` | Whether heading jumps by more than 1 level. | Skipped heading penalty. |
| `headings.counts.h1..h6` | Counts per heading level. | Display. |
| `headings.skipExamples[]` | Up to 5 examples like `H2 -> H4`. | Penalty severity/evidence. |

### `jsonLd`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `count` | Number of JSON-LD script tags. | Display. |
| `validCount` | Blocks parsed successfully. | Schema penalty. |
| `invalidCount` | Blocks that failed parsing or were empty. | Invalid schema penalty. |
| `types[]` | Extracted JSON-LD `@type` values. | Missing useful schema penalty. |

### `images`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `total` | All `document.images`. | Display. |
| `meaningfulTotal` | Images excluding hidden/presentation/tiny images. | Denominator for alt ratio. |
| `missingAlt` | Meaningful images without alt or with empty alt. | Numerator for alt ratio. |
| `missingAltRatio` | `missingAlt / meaningfulTotal`. | Image score penalty tiers. |
| `genericFilenameCount` | Meaningful images with generic filenames like `image1.jpg`. | Info-only issue. |
| `missingDimensionsCount` | Meaningful images missing `width` or `height` attributes. | Info-only issue. |
| `missingAltSamples[]` | `{ src, alt, width, height }` for missing-alt images. | UI/report. |
| `imagesWithAlt[]` | `{ src, alt, width, height }` for images with alt. | UI/report. |

Hidden/non-meaningful image filtering checks: `hidden`, `role="presentation"`, `aria-hidden="true"`, rendered width/height `<= 2`, CSS `display:none`, CSS `visibility:hidden`.

### `links`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `total` | Count of `a[href]`. | Weak internal link check condition. |
| `internal` | Same-host links. | Weak internal link penalty if zero and total > 0. |
| `external` | Other-host links. | Display. |
| `placeholders` | Empty, `#`, `javascript:`, invalid/no-host links. | Placeholder link penalty. |
| `contextualInternal` | Internal links outside nav/header/footer/navigation/aside. | Info-only/risk. |
| `genericAnchorCount` | Anchors with text like `click here`, `read more`, `learn more`. | Info-only issue. |
| `items[]` | Link inventory. | UI/CSV. |

`links.items[]` fields:

| Field | Meaning |
| --- | --- |
| `text` | Anchor text, fallback to `aria-label`, then `title`, then `(no anchor text)`. |
| `href` | Resolved or raw href. |
| `type` | `internal`, `external`, or `placeholder`. |
| `followType` | `Nofollow` if rel contains `nofollow`, else `Follow`. |
| `rel` | Raw rel attribute. |
| `urlKind` | Protocol/kind, for example `http`, `https`, `hash`, `javascript`, `empty`, `invalid`. |

### `technical`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `viewport` | Viewport meta content. | Viewport penalty. |
| `hasViewport` | Boolean viewport presence. | Viewport penalty. |
| `hasResponsiveViewport` | Viewport contains `width=device-width`. | Viewport penalty. |
| `lang` | `document.documentElement.lang`. | Missing lang penalty. |
| `charset` | `document.characterSet`. | Missing charset penalty. |

### `openGraph` and `twitter`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `openGraph.title` | `meta[property="og:title"]`. | Secondary penalty. |
| `openGraph.description` | `meta[property="og:description"]`. | Secondary penalty. |
| `openGraph.image` | `meta[property="og:image"]`. | Secondary penalty. |
| `twitter.card` | `meta[name="twitter:card"]`. | Twitter basics check. |
| `twitter.title` | `meta[name="twitter:title"]`. | Twitter basics check. |
| `twitter.description` | `meta[name="twitter:description"]`. | Twitter basics check. |
| `twitter.image` | `meta[name="twitter:image"]`. | Display only in current score formula. |

Twitter basics pass if `twitter.card` exists and either `twitter.title` or `twitter.description` exists.

### `commercialIntent`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `detected` | Whether any commercial term was found. | Schema penalty size, Traffic Risk, Top Fixes bonus. |
| `matchedTerms[]` | Terms found in URL/title/H1/body snippet. | Display/evidence. |

Commercial terms currently include English and Russian terms such as `pricing`, `buy`, `shop`, `product`, `service`, `demo`, `trial`, `contact`, `booking`, `checkout`, `cart`, `category`, `plan`, `subscribe`, `order`, `quote`, `купить`, `заказать`, `услуги`, `сервис`, `акции`, `кредит`, `лизинг`, `страхование`, `trade-in`, `тест-драйв`, `автомобиль`, `авто`.

Body text is limited to first 3000 characters.

### `urlSignals`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `length` | Full URL length. | Info-only insight/display. |
| `pathDepth` | Number of non-empty path segments. | Info-only insight/display. |
| `queryParamCount` | Number of query parameter keys. | Display. |
| `slugTokens[]` | Tokens extracted from path segments. | URL/topic matching. |
| `matchingTokens[]` | Tokens shared by slug and title/H1 theme. | URL/topic matching. |
| `reflectsTopic` | Whether any matching tokens exist. | Info-only issue if false and slug has tokens. |
| `longUrl` | `url.length > 115`. | Info-only issue. |
| `deepPath` | `pathSegments.length > 3`. | Info-only issue. |

### `readability`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `paragraphCount` | Count of non-empty paragraphs from `main p`, `article p`, `p`. | Display. |
| `totalWords` | Total paragraph word count. | Info-only/risk. |
| `averageParagraphWords` | Rounded average words per paragraph. | Collected/display potential. |
| `longParagraphs` | Paragraphs with more than 120 words. | Info-only issue. |
| `contentDepth` | `High`, `Medium`, `Low`, `Very low`. | Info-only/risk/display. |

Content depth thresholds:

| Value | Condition |
| --- | --- |
| `High` | `totalWords >= 700` |
| `Medium` | `totalWords >= 250` |
| `Low` | `totalWords > 0` |
| `Very low` | no words |

### `resources`

| Field | Meaning | Score usage |
| --- | --- | --- |
| `html[]` | Document and iframe HTML resources. | Display/export. |
| `css[]` | Stylesheets, style preloads, inline styles. | Display/export. |
| `js[]` | Scripts, inline scripts, modulepreloads, script preloads. | Display/export. |
| `total` | `html.length + css.length + js.length`. | Display/export. |
| `externalTotal` | Resources whose URL starts with `http://` or `https://`. | Display. |
| `inlineTotal` | Inline CSS/JS count. | Display. |

Resource item fields:

| Field | Meaning |
| --- | --- |
| `type` | `HTML`, `CSS`, or `JS`. |
| `kind` | `Document`, `Iframe`, `Stylesheet`, `Preload`, `Inline style`, `Script`, `Inline script`, etc. |
| `url` | Absolute URL or inline label like `Inline script #1 (123 characters)`. |

## Derived Data

### `audit`

Returned by `scorePage(pageData)`.

| Field | Meaning |
| --- | --- |
| `score` | Final score clamped to `0..100`, then capped by critical page-level issues when present. |
| `scoreLabel` | `Good`, `Needs improvement`, or `Critical issues`. |
| `rawScore` | Section-sum score before critical caps. |
| `appliedCap` | `{ issueId, maxScore, title }` when a critical cap actually lowers the score; otherwise `null`. |
| `sections` | Object with per-section score/maxScore/issues. |
| `issues` | Flattened list of section issues plus info-only issues. |
| `insights.contentDepth` | Mirrors `pageData.readability.contentDepth`. |
| `insights.contextualInternalLinks` | Mirrors `pageData.links.contextualInternal`. |
| `insights.urlLength` | Mirrors `pageData.urlSignals.length`. |

Section object:

| Field | Meaning |
| --- | --- |
| `score` | Current points in section. |
| `maxScore` | Maximum points in section. |
| `issues[]` | Issues and passed checks for section. |

Issue object:

| Field | Meaning |
| --- | --- |
| `id` | Stable issue id. |
| `section` | Section key. |
| `severity` | `high`, `medium`, `low`; absent on passed checks. |
| `title` | User-facing title. |
| `recommendation` | Suggested fix. |
| `scoreImpact` | Default or actual point loss. |
| `trafficRisk` | Internal priority field: `high`, `medium`, `low`. Visible UI uses Traffic Risk. |
| `passed` | `true` for passed check, `false` for issue. |
| `infoOnly` | `true` for diagnostic issues with no score loss. |

### `risk`

Returned by `calculateTrafficRisk(audit.issues, pageData)`.

| Field | Meaning |
| --- | --- |
| `level` | `High`, `Medium`, or `Low`. |
| `category` | Risk group, for example `Indexability`, `Snippet & CTR`, `Quality Signals`. |
| `reason` | Human-readable reason. |
| `topRiskIssueId` | Main issue id, or `null`. |

### `topFixes`

Returned by `getTopFixes(audit.issues, pageData)`.

Each fix extends the original issue with:

| Field | Meaning |
| --- | --- |
| `priority` | Sort score for top fixes. |
| `confidence` | `High`, `Medium`, or `Low`. |
| `evidence` | Concrete detected signal. |
| `whyItMatters` | SEO rationale. |
| `fix` | Recommendation text. |

### `serpPreview`

Returned by `buildSerpPreview(pageData)`.

| Field | Meaning |
| --- | --- |
| `title` | Detected title or `Missing title`. |
| `titleExists` | Boolean title presence. |
| `titleLength` | Title character count. |
| `url` | Current URL without hash. |
| `description` | Detected meta description or `Missing meta description`. |
| `descriptionExists` | Boolean description presence. |
| `descriptionLength` | Description character count. |

## Score Formula

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

Each section starts from its max score and loses points for detected issues. Each section is clamped to `0..sectionMax`. Total score is clamped to `0..100`, then critical page-level caps are applied.

### Section weights

| Section key | UI label | Max points |
| --- | --- | ---: |
| `indexability` | Indexability | 25 |
| `metadata` | Metadata | 20 |
| `headings` | Headings | 15 |
| `technical` | Technical basics | 10 |
| `schema` | Schema | 8 |
| `images` | Images | 10 |
| `links` | Links | 5 |
| `secondary` | Secondary insights | 7 |
| Total |  | 100 |

### Score labels

| Score | Label |
| ---: | --- |
| `80..100` | `Good` |
| `50..79` | `Needs improvement` |
| `0..49` | `Critical issues` |

### Critical score caps

| Issue id | Maximum final score |
| --- | ---: |
| `noindex` | 49 |
| `title_missing` | 69 |
| `canonical_invalid` | 69 |
| `canonical_other_url` | 74 |
| `h1_missing` | 79 |

### Thresholds

| Metric | Good range | Warning range in UI |
| --- | --- | --- |
| Title length | `30..65` characters | `20..70` characters |
| Meta description length | `110..170` characters | `70..170` characters |

The scoring code uses only the good ranges for penalties. The warning ranges are used for UI status coloring.

### Indexability scoring

Starts at `25`.

| Condition | Issue id | Penalty |
| --- | --- | ---: |
| `pageData.robots.noindex` | `noindex` | `-15` |
| `pageData.robots.nofollow` | `nofollow` | `-4` |
| no canonical tag | `canonical_missing` | `-3` |
| canonical exists but URL invalid | `canonical_invalid` | `-8` |
| canonical points to another URL | `canonical_other_url` | `-8` |

Passed checks:

| Condition | Passed id |
| --- | --- |
| no `noindex` | `indexable` |
| no `nofollow` | `followable` |
| canonical valid and points to current URL | `canonical_valid` |

### Metadata scoring

Starts at `20`.

| Condition | Issue id | Penalty |
| --- | --- | ---: |
| missing title | `title_missing` | `-12` |
| title exists but length outside `30..65` | `title_length` | `-3` |
| missing meta description | `meta_description_missing` | `-10` |
| description exists but length outside `110..170` | `meta_description_length` | `-2` |

Note: `issueCatalog` default impacts for `title_length` and `meta_description_length` are `5` and `4`, but `scorePage` overrides actual score impact to `3` and `2`.

Passed checks:

| Condition | Passed id |
| --- | --- |
| title exists | `title_exists` |
| title length good | `title_length_good` |
| meta description exists | `meta_description_exists` |
| meta description length good | `meta_description_length_good` |

### Headings scoring

Starts at `15`.

| Condition | Issue id | Penalty |
| --- | --- | ---: |
| `h1.count === 0` | `h1_missing` | `-10` |
| `h1.count > 1` and `< 5` | `h1_multiple` | `-5` |
| `h1.count >= 5` and `< 8` | `h1_multiple` | `-7` |
| `h1.count >= 8` | `h1_multiple` | `-8` |
| skipped heading levels, fewer than 3 examples | `headings_skipped` | `-5` |
| skipped heading levels, 3+ examples | `headings_skipped` | `-6` |

Additional cap:

```text
maxStructurePenalty = h1.count === 0 ? 15 : 10
score = max(SECTION_WEIGHTS.headings - maxStructurePenalty, score)
```

That means if an H1 exists, combined structure penalties cannot take the section below `5/15`.

Passed checks:

| Condition | Passed id |
| --- | --- |
| H1 exists | `h1_exists` |
| H1 count is not greater than 1 | `h1_single` |
| no skipped heading levels | `heading_order_good` |

### Technical basics scoring

Starts at `10`.

| Condition | Issue id | Penalty |
| --- | --- | ---: |
| missing viewport or viewport without `width=device-width` | `viewport_missing_or_weak` | `-4` |
| missing `html lang` | `lang_missing` | `-2` |
| missing charset | `charset_missing` | `-2` |

Passed checks:

| Condition | Passed id |
| --- | --- |
| responsive viewport found | `viewport_ok` |
| `lang` found | `lang_ok` |
| charset found | `charset_ok` |

### Schema scoring

Starts at `8`.

| Condition | Issue id | Penalty |
| --- | --- | ---: |
| invalid JSON-LD and commercial intent detected | `jsonld_invalid` | `-5` |
| invalid JSON-LD and no commercial intent | `jsonld_invalid` | `-2` |
| no valid JSON-LD or no schema types, commercial intent detected | `jsonld_missing_or_invalid` | `-4` |
| no valid JSON-LD or no schema types, no commercial intent | `jsonld_missing_or_invalid` | `-2` |

Passed check:

| Condition | Passed id |
| --- | --- |
| valid JSON-LD with detected types | `jsonld_ok` |

### Images scoring

Starts at `10`.

```text
missingAltRatio = missingAlt / meaningfulTotal
```

| Condition | Issue id | Penalty |
| --- | --- | ---: |
| `meaningfulTotal === 0` | no issue, passed | `0` |
| `missingAltRatio > 0.85` | `images_missing_alt_high` | `-8` |
| `missingAltRatio > 0.60` | `images_missing_alt_high` | `-7` |
| `missingAltRatio > 0.30` | `images_missing_alt_medium` | `-5` |
| `missingAltRatio > 0.05` | `images_missing_alt_medium` | `-3` |
| otherwise | passed | `0` |

Info-only image diagnostics:

| Condition | Info issue id |
| --- | --- |
| `genericFilenameCount > 0` | `image_filenames_generic` |
| `missingDimensionsCount > 0` | `image_dimensions_missing` |

### Links scoring

Starts at `5`.

| Condition | Issue id | Penalty |
| --- | --- | ---: |
| `links.placeholders > 3` | `placeholder_links_many` | `-3` |
| `links.placeholders >= 1` | `placeholder_links_some` | `-1` |
| `links.total > 0 && links.internal === 0` | `weak_internal_link_signal` | `-2` |

Info-only link diagnostics:

| Condition | Info issue id |
| --- | --- |
| `genericAnchorCount > 0` | `generic_anchor_text` |

Passed checks:

| Condition | Passed id |
| --- | --- |
| no placeholder links | `placeholder_links_none` |
| internal linking signal acceptable | `internal_links_ok` |

### Secondary insights scoring

Starts at `7`.

| Condition | Issue id | Penalty |
| --- | --- | ---: |
| missing `og:title` | `og_title_missing` | `-1` |
| missing `og:description` | `og_description_missing` | `-1` |
| missing `og:image` | `og_image_missing` | `-2` |
| no Twitter card basics | `twitter_basics_missing` | `-1` |

Twitter card basics:

```text
Boolean(twitter.card && (twitter.title || twitter.description))
```

Passed checks:

| Condition | Passed id |
| --- | --- |
| OG title found | `og_title_ok` |
| OG description found | `og_description_ok` |
| OG image found | `og_image_ok` |
| Twitter basics found | `twitter_basics_ok` |

## Issue Catalog

Catalog lives in `src/constants/issueCatalog.js`.

| ID | Section | Severity | Default impact | Risk | Title |
| --- | --- | --- | ---: | --- | --- |
| `noindex` | indexability | high | 15 | high | Page is marked noindex |
| `nofollow` | indexability | medium | 4 | medium | Page uses nofollow in robots directives |
| `canonical_other_url` | indexability | high | 8 | high | Canonical points to another URL |
| `canonical_invalid` | indexability | high | 8 | high | Canonical URL is invalid |
| `canonical_missing` | indexability | low | 3 | low | Canonical tag is missing |
| `title_missing` | metadata | high | 12 | high | Title tag is missing |
| `title_length` | metadata | medium | 5 | medium | Title length needs improvement |
| `meta_description_missing` | metadata | medium | 10 | medium | Meta description is missing |
| `meta_description_length` | metadata | medium | 4 | medium | Meta description length needs improvement |
| `h1_missing` | headings | high | 10 | high | H1 is missing |
| `h1_multiple` | headings | medium | 5 | medium | Multiple H1 tags found |
| `headings_skipped` | headings | medium | 5 | medium | Heading levels are skipped |
| `viewport_missing_or_weak` | technical | medium | 4 | medium | Viewport meta tag is missing or weak |
| `lang_missing` | technical | low | 2 | low | HTML lang attribute is missing |
| `charset_missing` | technical | low | 2 | low | Character set is missing or not detectable |
| `jsonld_missing_or_invalid` | schema | medium | 5 | medium | No valid JSON-LD schema found |
| `jsonld_invalid` | schema | medium | 5 | medium | Invalid JSON-LD detected |
| `images_missing_alt_medium` | images | medium | 5 | medium | Many meaningful images are missing alt text |
| `images_missing_alt_high` | images | medium | 10 | medium | Most meaningful images are missing alt text |
| `placeholder_links_some` | links | medium | 1 | medium | Placeholder links found |
| `placeholder_links_many` | links | medium | 3 | medium | Many placeholder links found |
| `weak_internal_link_signal` | links | medium | 2 | medium | No internal links detected |
| `og_title_missing` | secondary | low | 1 | low | Open Graph title is missing |
| `og_description_missing` | secondary | low | 1 | low | Open Graph description is missing |
| `og_image_missing` | secondary | low | 2 | low | Open Graph image is missing |
| `twitter_basics_missing` | secondary | low | 1 | low | Twitter card basics are missing |

Info-only issue IDs created outside the catalog:

| ID | Section | Trigger |
| --- | --- | --- |
| `image_filenames_generic` | images | Some meaningful images have generic filenames. |
| `image_dimensions_missing` | images | Some meaningful images lack width/height attributes. |
| `generic_anchor_text` | links | Some links use generic anchor text. |
| `url_length_long` | metadata | URL length is greater than 115. |
| `url_path_deep` | metadata | Path depth is greater than 3. |
| `url_topic_mismatch` | metadata | Slug has tokens but none match title/H1 theme tokens. |
| `contextual_internal_links_missing` | links | No contextual internal links, but internal links exist and page has at least 250 words. |
| `long_paragraphs_detected` | headings | At least one paragraph has more than 120 words. |
| `content_depth_low` | headings | Commercial page with more than 0 and fewer than 200 words. |

## Traffic Risk Logic

`Traffic Risk` is separate from `SEO Score`. It is not a revenue estimate and not ROI forecasting.

High risk returns immediately for:

| Condition | Level | Category | `topRiskIssueId` |
| --- | --- | --- | --- |
| unresolved `noindex` | High | Indexability | `noindex` |
| unresolved `canonical_other_url` | High | Indexability | `canonical_other_url` |
| unresolved `canonical_invalid` | High | Indexability | `canonical_invalid` |
| unresolved `title_missing` | High | Snippet & CTR | `title_missing` |
| commercial page has `meta_description_missing` plus another compound issue | High | Snippet & CTR | first compound issue |
| `h1_missing` plus major companion issue | High | Content Clarity | `h1_missing` |
| 2+ indexability/metadata unresolved issues and at least one high/critical id | High | Mixed Signals | first critical cluster issue |

Commercial missing-description special case:

| Condition | Level |
| --- | --- |
| commercial page with `meta_description_missing` plus at least one of `h1_multiple`, `headings_skipped`, `images_missing_alt_high`, `jsonld_missing_or_invalid` | High |
| commercial page with only `meta_description_missing` from that cluster | Medium |

Medium risk first-match issue IDs:

```text
title_length
meta_description_missing
meta_description_length
h1_missing
h1_multiple
headings_skipped
images_missing_alt_medium
images_missing_alt_high
viewport_missing_or_weak
jsonld_missing_or_invalid
jsonld_invalid
placeholder_links_some
placeholder_links_many
weak_internal_link_signal
```

Additional Medium condition:

```text
commercialIntent.detected &&
readability.contentDepth === "Low" &&
links.contextualInternal === 0
```

Low risk first-match issue IDs:

```text
canonical_missing
lang_missing
charset_missing
og_title_missing
og_description_missing
og_image_missing
twitter_basics_missing
```

If none match, risk is:

```json
{
  "level": "Low",
  "category": "No material risk",
  "topRiskIssueId": null
}
```

## Top 3 Fixes Logic

Input: `audit.issues` and `pageData`.

Filtering:

1. Excludes passed checks.
2. Excludes `infoOnly` issues.
3. Adds `priority`, `confidence`, `evidence`, `whyItMatters`, `fix`.
4. Excludes issues whose confidence is `Low`.
5. Sorts by `priority` descending, then by `scoreImpact` descending.
6. Returns first 3.

Priority:

```text
priority =
  severityWeight * 10 +
  scoreImpact +
  commercialIntentBonus
```

Severity weights:

| Severity | Weight |
| --- | ---: |
| `high` | 3 |
| `medium` | 2 |
| `low` | 1 |

Commercial intent bonus:

```text
+5 if commercialIntent.detected
and issue.section is "metadata" or "indexability"
```

High confidence IDs:

```text
noindex
title_missing
meta_description_missing
canonical_missing
canonical_invalid
canonical_other_url
h1_missing
jsonld_invalid
```

Medium confidence IDs:

```text
title_length
meta_description_length
h1_multiple
headings_skipped
jsonld_missing_or_invalid
images_missing_alt_high
images_missing_alt_medium
placeholder_links_some
placeholder_links_many
```

Special confidence:

| Issue | Rule |
| --- | --- |
| `viewport_missing_or_weak` | `High` if viewport is absent, `Medium` if present but weak. |

Everything else defaults to `Low` and is excluded from Top Fixes.

## Exports

### Links CSV

Generated by `exportLinksCsv()` from `pageData.links.items`.

Columns:

```text
Anchor text, Type, Follow, URL kind, URL, Rel
```

### Resources CSV

Generated by `exportResourcesCsv()` from merged:

```text
resources.html + resources.css + resources.js
```

Columns:

```text
Type, Kind, Resource
```

### Printable/PDF report

`exportPdf()` stores the current report payload in extension-local `localStorage` under:

```text
seoScoreCheckerReportData
```

Then opens:

```text
src/report/report.html
```

The report page calls `buildPrintableReport(data)` and lets the user print/save PDF through the browser print dialog.

Inline script source is not collected or stored in the report payload; inline scripts are represented by label and character count only.

### Markdown report

Printable report page can copy a Markdown report generated by `buildMarkdownReport(data)`.

The Markdown H1 is:

```text
# SEO Score Checker Report - <English full local date and short local time>
```

Example:

```text
# SEO Score Checker Report - Sunday, May 31, 2026 at 2:21 AM
```

The formatter uses local time with `en-US`, `dateStyle: "full"`, and `timeStyle: "short"`, so seconds and milliseconds are omitted.

Markdown Score details include:

```text
Section / Max / Current
```

with a final `Total / 100 / audit.score` row.

Markdown score deductions use:

```text
Issue / Section / Points
```

The informational-only signals section is emitted only when there are info-only findings.

## Permissions and Privacy Notes

Manifest permissions:

```json
["activeTab", "scripting"]
```

No broad host permissions are declared. Analysis is user-triggered from the extension popup. The current implementation does not send collected page data to a server.

The only network request performed during page analysis is a same-origin fetch to:

```text
/robots.txt
```

Resources and robots.txt references are informational only and are not sent to any remote scoring service.
