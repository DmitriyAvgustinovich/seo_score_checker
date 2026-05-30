export function buildSerpPreview(pageData) {
  return {
    title: pageData.title.exists ? pageData.title.text : "Missing title",
    titleExists: pageData.title.exists,
    titleLength: pageData.title.length,
    url: (pageData.url || "").split("#")[0] || "",
    description: pageData.metaDescription.exists
      ? pageData.metaDescription.text
      : "Missing meta description",
    descriptionExists: pageData.metaDescription.exists,
    descriptionLength: pageData.metaDescription.length
  };
}
