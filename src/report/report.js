import { buildPrintableReport, PRINTABLE_REPORT_STYLES } from "../ui/reportView.js";
import { buildMarkdownReport } from "../ui/reportMarkdown.js";
import { bindHelpTooltips } from "../ui/tooltipPlacement.js";

function parseReportPayload() {
  try {
    const rawHash = window.location.hash || "";

    if (rawHash.startsWith("#data=")) {
      const json = decodeURIComponent(rawHash.slice("#data=".length));
      return JSON.parse(json);
    }

    const storedPayload = localStorage.getItem("seoScoreCheckerReportData");
    return storedPayload ? JSON.parse(storedPayload) : null;
  } catch (error) {
    console.error("SEO Score Checker: could not parse report payload.", error);
    return null;
  }
}

function renderMissingState() {
  document.body.innerHTML = `
    <main style="padding:32px;font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <h1 style="margin:0 0 8px;">SEO Audit Report unavailable</h1>
      <p style="margin:0;color:#64748b;">Open the report again from the extension popup.</p>
    </main>
  `;
}

function showButtonFeedback(button, label) {
  if (!button) {
    return;
  }

  const originalLabel = button.dataset.originalLabel || button.textContent || "";
  button.dataset.originalLabel = originalLabel;
  button.textContent = label;
  window.setTimeout(() => {
    if (button.isConnected) {
      button.textContent = originalLabel;
    }
  }, 1200);
}

function downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function hydrateReport() {
  const data = parseReportPayload();
  if (!data) {
    renderMissingState();
    return;
  }

  document.title = "SEO Score Checker Report - " + (data.pageData.hostname || "page");
  document.head.innerHTML = `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${document.title}</title>
    <style>${PRINTABLE_REPORT_STYLES}</style>
  `;
  document.body.innerHTML = buildPrintableReport(data);
  bindHelpTooltips(document.body);

  const printButton = document.getElementById("print-report");
  if (printButton) {
    printButton.addEventListener("click", () => {
      window.print();
    });
  }

  const exportMarkdownButton = document.getElementById("export-report-markdown");
  if (exportMarkdownButton) {
    exportMarkdownButton.addEventListener("click", () => {
      try {
        const exportDate = formatDateForFilename(new Date());
        const filename = (data.pageData.hostname || "page") + "-seo-report-" + exportDate + ".md";
        downloadTextFile(buildMarkdownReport(data), filename, "text/markdown;charset=utf-8");
        showButtonFeedback(exportMarkdownButton, "Exported");
      } catch (error) {
        console.error("SEO Score Checker: Markdown export failed.", error);
        showButtonFeedback(exportMarkdownButton, "Failed");
      }
    });
  }

  const closeButton = document.getElementById("close-report");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      window.close();
    });
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  hydrateReport();
}
