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

    return url.toString();
  } catch (error) {
    return "";
  }
}
