const TRACKING_PARAM_NAMES = new Set([
  "gclid",
  "fbclid",
  "msclkid",
  "yclid",
  "gbraid",
  "wbraid",
  "_ga",
  "_gl",
  "mc_cid",
  "mc_eid"
]);

function isTrackingParam(name) {
  const normalized = String(name || "").toLowerCase();
  return normalized.startsWith("utm_") || TRACKING_PARAM_NAMES.has(normalized);
}

function removeTrackingParams(url) {
  Array.from(url.searchParams.keys()).forEach((name) => {
    if (isTrackingParam(name)) {
      url.searchParams.delete(name);
    }
  });
  url.searchParams.sort();
}

export function normalizeUrl(input) {
  if (!input) {
    return "";
  }

  try {
    const url = new URL(input);
    url.hash = "";

    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
      url.port = "";
    }

    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    removeTrackingParams(url);

    return url.toString();
  } catch (error) {
    return "";
  }
}
