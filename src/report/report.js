import { buildPrintableReport, PRINTABLE_REPORT_STYLES } from "../ui/reportView.js";

function parseReportPayload() {
  try {
    const rawHash = window.location.hash || "";
    if (!rawHash.startsWith("#data=")) {
      return null;
    }

    const json = decodeURIComponent(rawHash.slice("#data=".length));
    return JSON.parse(json);
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

  const printButton = document.getElementById("print-report");
  if (printButton) {
    printButton.addEventListener("click", () => {
      window.print();
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
