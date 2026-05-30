(() => {
  function textContentOf(node) {
    return node ? (node.textContent || "").trim() : "";
  }

  function tokenize(text) {
    const stopWords = new Set([
      "about",
      "after",
      "before",
      "from",
      "into",
      "that",
      "this",
      "with",
      "your",
      "ours",
      "their",
      "them",
      "they",
      "have",
      "will",
      "would",
      "there",
      "where",
      "which",
      "when",
      "what",
      "sand",
      "stone"
    ]);

    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4 && !stopWords.has(token));
  }

  function metaContent(selector) {
    const node = document.querySelector(selector);
    return node ? (node.getAttribute("content") || "").trim() : "";
  }

  function normalizeComparableUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      parsed.hash = "";

      if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
        parsed.port = "";
      }

      if (parsed.pathname !== "/") {
        parsed.pathname = parsed.pathname.replace(/\/+$/, "");
      }

      return parsed.toString();
    } catch (error) {
      return "";
    }
  }

  function collectCanonical() {
    const node = document.querySelector('link[rel~="canonical" i]');

    if (!node) {
      return {
        href: "",
        exists: false,
        isValid: false,
        pointsToCurrentUrl: false
      };
    }

    const href = (node.getAttribute("href") || "").trim();

    try {
      const resolved = new URL(href, location.href).toString();
      return {
        href: resolved,
        exists: true,
        isValid: true,
        pointsToCurrentUrl: normalizeComparableUrl(resolved) === normalizeComparableUrl(location.href)
      };
    } catch (error) {
      return {
        href,
        exists: true,
        isValid: false,
        pointsToCurrentUrl: false
      };
    }
  }

  function collectRobots() {
    const robotsContent = metaContent('meta[name="robots" i]');
    const googlebotContent = metaContent('meta[name="googlebot" i]');
    const combined = [robotsContent, googlebotContent].join(",").toLowerCase();

    return {
      content: robotsContent,
      googlebotContent,
      noindex: combined.includes("noindex"),
      nofollow: combined.includes("nofollow")
    };
  }

  function parseRobotsTxt(url, text, response) {
    const lines = text.split(/\r?\n/);
    const sitemapUrls = [];
    let allowCount = 0;
    let disallowCount = 0;

    lines.forEach((line) => {
      const normalized = line.trim();
      const sitemapMatch = normalized.match(/^sitemap:\s*(\S+)/i);

      if (sitemapMatch) {
        sitemapUrls.push(sitemapMatch[1]);
      }

      if (/^allow\s*:/i.test(normalized)) {
        allowCount += 1;
      }

      if (/^disallow\s*:/i.test(normalized)) {
        disallowCount += 1;
      }
    });

    return {
      url,
      status: "found",
      statusCode: response.status,
      contentType: response.headers.get("content-type") || "",
      size: text.length,
      allowCount,
      disallowCount,
      sitemapCount: sitemapUrls.length,
      sitemapUrls: sitemapUrls.slice(0, 20),
      preview: lines.slice(0, 20).join("\n"),
      truncated: lines.length > 20 || sitemapUrls.length > 20
    };
  }

  async function collectRobotsTxt() {
    let url = "";

    try {
      url = new URL("/robots.txt", location.origin).toString();
    } catch (error) {
      return {
        url: "",
        status: "not checked",
        statusCode: null,
        contentType: "",
        size: 0,
        allowCount: 0,
        disallowCount: 0,
        sitemapCount: 0,
        sitemapUrls: [],
        preview: "",
        truncated: false
      };
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal
      });

      if (!response.ok) {
        return {
          url,
          status: response.status === 404 ? "not found" : "fetch failed",
          statusCode: response.status,
          contentType: response.headers.get("content-type") || "",
          size: 0,
          allowCount: 0,
          disallowCount: 0,
          sitemapCount: 0,
          sitemapUrls: [],
          preview: "",
          truncated: false
        };
      }

      return parseRobotsTxt(url, await response.text(), response);
    } catch (error) {
      return {
        url,
        status: error && error.name === "AbortError" ? "timeout" : "fetch failed",
        statusCode: null,
        contentType: "",
        size: 0,
        allowCount: 0,
        disallowCount: 0,
        sitemapCount: 0,
        sitemapUrls: [],
        preview: "",
        truncated: false
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function collectHeadings() {
    const nodes = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    const items = nodes.map((node) => ({
      level: Number(node.tagName.slice(1)),
      text: textContentOf(node)
    }));
    const counts = {
      h1: 0,
      h2: 0,
      h3: 0,
      h4: 0,
      h5: 0,
      h6: 0
    };
    const skipExamples = [];

    items.forEach((item) => {
      const key = "h" + item.level;
      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] += 1;
      }
    });

    let hasSkippedLevels = false;
    for (let index = 1; index < items.length; index += 1) {
      if (items[index].level - items[index - 1].level > 1) {
        hasSkippedLevels = true;
        if (skipExamples.length < 5) {
          skipExamples.push("H" + items[index - 1].level + " -> H" + items[index].level);
        }
      }
    }

    return {
      h1: {
        count: items.filter((item) => item.level === 1).length,
        texts: items.filter((item) => item.level === 1).map((item) => item.text).filter(Boolean)
      },
      headings: {
        total: items.length,
        items,
        hasSkippedLevels,
        counts,
        skipExamples
      }
    };
  }

  function extractJsonLdTypes(value, types) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => extractJsonLdTypes(item, types));
      return;
    }

    const typeValue = value["@type"];
    if (Array.isArray(typeValue)) {
      typeValue.forEach((item) => {
        if (typeof item === "string" && item.trim()) {
          types.add(item.trim());
        }
      });
    } else if (typeof typeValue === "string" && typeValue.trim()) {
      types.add(typeValue.trim());
    }

    if (Array.isArray(value["@graph"])) {
      value["@graph"].forEach((item) => extractJsonLdTypes(item, types));
    }
  }

  function collectJsonLd() {
    const nodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const types = new Set();
    let validCount = 0;
    let invalidCount = 0;

    nodes.forEach((node) => {
      const raw = textContentOf(node);
      if (!raw) {
        invalidCount += 1;
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        validCount += 1;
        extractJsonLdTypes(parsed, types);
      } catch (error) {
        invalidCount += 1;
      }
    });

    return {
      count: nodes.length,
      validCount,
      invalidCount,
      types: Array.from(types)
    };
  }

  function isHiddenImage(image) {
    if (image.hidden) {
      return true;
    }

    const computedStyle = window.getComputedStyle(image);

    return (
      image.getAttribute("role") === "presentation" ||
      image.getAttribute("aria-hidden") === "true" ||
      image.width <= 2 ||
      image.height <= 2 ||
      computedStyle.display === "none" ||
      computedStyle.visibility === "hidden"
    );
  }

  function collectImages() {
    const images = Array.from(document.images);
    const meaningful = images.filter((image) => !isHiddenImage(image));
    const missingAltImages = meaningful.filter((image) => {
      if (!image.hasAttribute("alt")) {
        return true;
      }

      return (image.getAttribute("alt") || "").trim() === "";
    });
    const missingAlt = missingAltImages.length;
    const genericFilenameCount = meaningful.filter((image) => {
      const src = image.currentSrc || image.src || "";
      const fileName = src.split("?")[0].split("/").pop() || "";
      return /^(img|image|photo|dsc|screenshot)[-_]?\d+/i.test(fileName);
    }).length;
    const missingDimensionsCount = meaningful.filter(
      (image) => !image.getAttribute("width") || !image.getAttribute("height")
    ).length;

    return {
      total: images.length,
      meaningfulTotal: meaningful.length,
      missingAlt,
      missingAltRatio: meaningful.length > 0 ? missingAlt / meaningful.length : 0,
      genericFilenameCount,
      missingDimensionsCount,
      missingAltSamples: missingAltImages.slice(0, 20).map((image) => ({
        src: image.currentSrc || image.src || "",
        alt: image.getAttribute("alt") || "",
        width: image.width || 0,
        height: image.height || 0
      }))
    };
  }

  function classifyLink(anchor) {
    const rawHref = (anchor.getAttribute("href") || "").trim();
    if (!rawHref || rawHref === "#" || rawHref.toLowerCase().startsWith("javascript:")) {
      return {
        type: "placeholder",
        resolvedHref: rawHref,
        urlKind: rawHref === "#" ? "hash" : rawHref.toLowerCase().startsWith("javascript:") ? "javascript" : "empty"
      };
    }

    try {
      const resolved = new URL(rawHref, location.href);
      if (!resolved.hostname) {
        return {
          type: "placeholder",
          resolvedHref: resolved.toString(),
          urlKind: resolved.protocol.replace(":", "") || "unknown"
        };
      }

      return {
        type: resolved.hostname === location.hostname ? "internal" : "external",
        resolvedHref: resolved.toString(),
        urlKind: resolved.protocol.replace(":", "") || "unknown"
      };
    } catch (error) {
      return {
        type: "placeholder",
        resolvedHref: rawHref,
        urlKind: "invalid"
      };
    }
  }

  function collectLinks() {
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    let internal = 0;
    let external = 0;
    let placeholders = 0;
    let contextualInternal = 0;
    let genericAnchorCount = 0;
    const items = [];
    const genericAnchors = new Set([
      "click here",
      "read more",
      "learn more",
      "more",
      "here",
      "details",
      "view more",
      "see more"
    ]);

    anchors.forEach((anchor) => {
      const classification = classifyLink(anchor);
      if (classification.type === "internal") {
        internal += 1;
      } else if (classification.type === "external") {
        external += 1;
      } else {
        placeholders += 1;
      }

      const rel = (anchor.getAttribute("rel") || "").trim();
      const text = textContentOf(anchor) || (anchor.getAttribute("aria-label") || "").trim() || (anchor.getAttribute("title") || "").trim();
      const isContextual = !anchor.closest("nav,header,footer,[role='navigation'],aside");
      if (classification.type === "internal" && isContextual) {
        contextualInternal += 1;
      }
      if (genericAnchors.has((text || "").toLowerCase())) {
        genericAnchorCount += 1;
      }

      items.push({
        text: text || "(no anchor text)",
        href: classification.resolvedHref || (anchor.getAttribute("href") || "").trim(),
        type: classification.type,
        followType: rel.toLowerCase().includes("nofollow") ? "Nofollow" : "Follow",
        rel,
        urlKind: classification.urlKind
      });
    });

    return {
      total: anchors.length,
      internal,
      external,
      placeholders,
      contextualInternal,
      genericAnchorCount,
      items
    };
  }

  function collectTechnical() {
    const viewport = metaContent('meta[name="viewport" i]');
    const lang = (document.documentElement.getAttribute("lang") || "").trim();

    return {
      viewport,
      hasViewport: Boolean(viewport),
      hasResponsiveViewport: viewport.toLowerCase().includes("width=device-width"),
      lang,
      charset: document.characterSet || ""
    };
  }

  function collectSocial() {
    return {
      openGraph: {
        title: metaContent('meta[property="og:title"]'),
        description: metaContent('meta[property="og:description"]'),
        image: metaContent('meta[property="og:image"]')
      },
      twitter: {
        card: metaContent('meta[name="twitter:card"]'),
        title: metaContent('meta[name="twitter:title"]'),
        description: metaContent('meta[name="twitter:description"]'),
        image: metaContent('meta[name="twitter:image"]')
      }
    };
  }

  function collectCommercialIntent(titleText, h1Texts) {
    const terms = [
      "pricing",
      "buy",
      "shop",
      "product",
      "service",
      "demo",
      "trial",
      "contact",
      "booking",
      "checkout",
      "cart",
      "category",
      "plan",
      "subscribe",
      "order",
      "quote",
      "купить",
      "продать",
      "заказать",
      "услуги",
      "сервис",
      "акции",
      "кредит",
      "лизинг",
      "страхование",
      "trade-in",
      "тест-драйв",
      "автомобиль",
      "авто"
    ];

    const bodyText = document.body ? (document.body.innerText || "").slice(0, 3000) : "";
    const haystack = [location.href, titleText, h1Texts.join(" "), bodyText].join(" ").toLowerCase();
    const matchedTerms = terms.filter((term) => haystack.includes(term));

    return {
      detected: matchedTerms.length > 0,
      matchedTerms
    };
  }

  function collectUrlSignals(titleText, h1Texts) {
    const currentUrl = new URL(location.href);
    const pathSegments = currentUrl.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const slugTokens = tokenize(pathSegments.join(" "));
    const themeTokens = Array.from(new Set(tokenize([titleText, h1Texts.join(" ")].join(" "))));
    const matchingTokens = themeTokens.filter((token) => slugTokens.includes(token));

    return {
      length: currentUrl.href.length,
      pathDepth: pathSegments.length,
      queryParamCount: Array.from(currentUrl.searchParams.keys()).length,
      slugTokens,
      matchingTokens,
      reflectsTopic: matchingTokens.length > 0,
      longUrl: currentUrl.href.length > 115,
      deepPath: pathSegments.length > 3
    };
  }

  function collectReadability() {
    const paragraphs = Array.from(document.querySelectorAll("main p, article p, p"))
      .map((node) => textContentOf(node))
      .filter(Boolean);
    const paragraphWordCounts = paragraphs.map((text) => text.split(/\s+/).filter(Boolean).length);
    const totalWords = paragraphWordCounts.reduce((sum, count) => sum + count, 0);
    const longParagraphs = paragraphWordCounts.filter((count) => count > 120).length;

    return {
      paragraphCount: paragraphs.length,
      totalWords,
      averageParagraphWords: paragraphs.length ? Math.round(totalWords / paragraphs.length) : 0,
      longParagraphs,
      contentDepth:
        totalWords >= 700 ? "High" : totalWords >= 250 ? "Medium" : totalWords > 0 ? "Low" : "Very low"
    };
  }

  function resolveResourceUrl(value) {
    try {
      return value ? new URL(value, location.href).toString() : "";
    } catch (error) {
      return value || "";
    }
  }

  function collectPageResources() {
    const html = [
      {
        kind: "Document",
        type: "HTML",
        url: location.href
      },
      ...Array.from(document.querySelectorAll("iframe[src]")).map((node) => ({
        kind: "Iframe",
        type: "HTML",
        url: resolveResourceUrl(node.getAttribute("src") || "")
      }))
    ];

    const css = [
      ...Array.from(document.querySelectorAll('link[rel~="stylesheet" i][href]')).map((node) => ({
        kind: "Stylesheet",
        type: "CSS",
        url: resolveResourceUrl(node.getAttribute("href") || "")
      })),
      ...Array.from(document.querySelectorAll('link[rel~="preload" i][as="style" i][href]')).map((node) => ({
        kind: "Preload",
        type: "CSS",
        url: resolveResourceUrl(node.getAttribute("href") || "")
      })),
      ...Array.from(document.querySelectorAll("style")).map((node, index) => ({
        kind: "Inline style",
        type: "CSS",
        url: "Inline style #" + (index + 1) + " (" + textContentOf(node).length + " characters)"
      }))
    ];

    const js = [
      ...Array.from(document.querySelectorAll("script")).map((node, index) => {
        const src = (node.getAttribute("src") || "").trim();
        return {
          kind: src ? node.getAttribute("type") || "Script" : "Inline script",
          type: "JS",
          url: src
            ? resolveResourceUrl(src)
            : "Inline script #" + (index + 1) + " (" + textContentOf(node).length + " characters)"
        };
      }),
      ...Array.from(document.querySelectorAll('link[rel~="modulepreload" i][href], link[rel~="preload" i][as="script" i][href]')).map((node) => ({
        kind: node.getAttribute("rel") || "Preload",
        type: "JS",
        url: resolveResourceUrl(node.getAttribute("href") || "")
      }))
    ];

    return {
      html,
      css,
      js,
      total: html.length + css.length + js.length,
      externalTotal: [...html, ...css, ...js].filter((item) => /^https?:\/\//i.test(item.url)).length,
      inlineTotal: [...css, ...js].filter((item) => item.url.startsWith("Inline ")).length
    };
  }

  async function collectPageData() {
    if (!document.body) {
      return null;
    }

    const titleText = textContentOf(document.querySelector("title"));
    const metaDescriptionText = metaContent('meta[name="description" i]');
    const canonical = collectCanonical();
    const robots = collectRobots();
    const { h1, headings } = collectHeadings();
    const jsonLd = collectJsonLd();
    const images = collectImages();
    const links = collectLinks();
    const technical = collectTechnical();
    const social = collectSocial();
    const urlSignals = collectUrlSignals(titleText, h1.texts);
    const readability = collectReadability();
    const resources = collectPageResources();
    const robotsTxt = await collectRobotsTxt();

    return {
      url: location.href,
      hostname: location.hostname,
      title: {
        text: titleText,
        length: titleText.length,
        exists: Boolean(titleText)
      },
      metaDescription: {
        text: metaDescriptionText,
        length: metaDescriptionText.length,
        exists: Boolean(metaDescriptionText)
      },
      canonical,
      robots,
      h1,
      headings,
      jsonLd,
      images,
      links,
      technical,
      openGraph: social.openGraph,
      twitter: social.twitter,
      commercialIntent: collectCommercialIntent(titleText, h1.texts),
      urlSignals,
      readability,
      resources,
      robotsTxt
    };
  }

  return collectPageData();
})();
