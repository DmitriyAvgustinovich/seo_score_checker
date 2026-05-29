import { escapeHtml } from "./escapeHtml.js";

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const IMAGE_EXTENSIONS = [".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"];
const SOURCE_EXTENSIONS = [
  ".css",
  ".htm",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".less",
  ".map",
  ".mjs",
  ".scss",
  ".ts",
  ".tsx",
  ".txt",
  ".xml"
];
function formatValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return String(Number(value.toFixed(3)));
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "(missing)";
  }

  return String(value);
}

function getPathname(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch (error) {
    return "";
  }
}

function hasExtension(url, extensions) {
  const pathname = getPathname(url);
  return extensions.some((extension) => pathname.endsWith(extension));
}

function isImageUrl(url) {
  return hasExtension(url, IMAGE_EXTENSIONS);
}

function isSourceUrl(url) {
  return hasExtension(url, SOURCE_EXTENSIONS);
}

function stripTrailingPunctuation(value) {
  const url = value.replace(/[),.;:!?]+$/g, "");
  return {
    url,
    trailing: value.slice(url.length)
  };
}

function renderLink(url) {
  const image = isImageUrl(url);
  const source = isSourceUrl(url);
  const href = source ? "view-source:" + url : url;
  const safeUrl = escapeHtml(url);
  const safeHref = escapeHtml(href);
  const classes = ["value-link", image ? "value-link--image" : "value-link--resource"].join(" ");
  const preview = image
    ? `
      <span class="image-preview" aria-hidden="true">
        <img src="${safeUrl}" alt="" loading="lazy">
      </span>
    `
    : "";

  return `
    <a
      class="${classes}"
      href="${safeHref}"
      target="_blank"
      rel="noreferrer noopener"
      data-action="open-resource-link"
      data-open-url="${safeHref}"
      data-source-url="${safeUrl}"
    ><span class="value-link__text">${safeUrl}</span>${preview}</a>
  `;
}

function renderStringValue(value) {
  const text = formatValue(value);
  let output = "";
  let lastIndex = 0;

  URL_PATTERN.lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const startIndex = match.index || 0;
    const { url, trailing } = stripTrailingPunctuation(rawUrl);

    output += escapeHtml(text.slice(lastIndex, startIndex));
    output += url ? renderLink(url) : escapeHtml(rawUrl);
    output += escapeHtml(trailing);
    lastIndex = startIndex + rawUrl.length;
  }

  output += escapeHtml(text.slice(lastIndex));
  return output;
}

export function renderInteractiveValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => renderInteractiveValue(item)).join(", ") : "(none)";
  }

  return renderStringValue(value);
}
