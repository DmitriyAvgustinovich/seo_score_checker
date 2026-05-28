export function buildSerpPreview(pageData) {
  return {
    title: pageData.title.exists ? pageData.title.text : "Missing title",
    url: (pageData.url || "").split("#")[0] || "",
    description: pageData.metaDescription.exists
      ? pageData.metaDescription.text
      : "Missing meta description"
  };
}
