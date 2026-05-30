import { getTopFixes } from "./src/analyzer/recommendations.js";
import { calculateTrafficRisk } from "./src/analyzer/trafficRisk.js";
import { scorePage } from "./src/analyzer/scorePage.js";
import { buildSerpPreview } from "./src/analyzer/serpPreview.js";
import { renderApp } from "./src/ui/renderApp.js";
import { bindHelpTooltips } from "./src/ui/tooltipPlacement.js";

const appRoot = document.getElementById("app");

const RESTRICTED_PROTOCOLS = ["chrome:", "edge:", "brave:", "about:", "chrome-extension:"];

let currentState = {
  status: "loading"
};

async function openResourceLink(link) {
  const openUrl = link.dataset.openUrl || link.href;
  const sourceUrl = link.dataset.sourceUrl || openUrl;
  const tabsApi = globalThis.chrome && globalThis.chrome.tabs;

  try {
    if (tabsApi && tabsApi.create) {
      await tabsApi.create({ url: openUrl });
      return;
    }
  } catch (error) {
    if (openUrl !== sourceUrl && tabsApi && tabsApi.create) {
      await tabsApi.create({ url: sourceUrl });
      return;
    }
  }

  window.open(sourceUrl || openUrl, "_blank", "noopener");
}

function setState(nextState) {
  currentState = {
    ...currentState,
    ...nextState
  };
  renderApp(appRoot, currentState);
  bindActions();
}

function bindActions() {
  bindHelpTooltips(appRoot);

  appRoot.querySelectorAll("[data-action='recheck']").forEach((button) => {
    button.addEventListener("click", () => {
      void runAudit();
    });
  });

  appRoot.querySelectorAll("[data-action='switch-tab']").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.tab || "overview";
      if (currentState.status !== "success") {
        return;
      }

      setState({ activeTab: nextTab });
    });
  });

  appRoot.querySelectorAll("[data-action='export-pdf']").forEach((button) => {
    button.addEventListener("click", () => {
      void exportPdf();
    });
  });

  appRoot.querySelectorAll("[data-action='export-links-csv']").forEach((button) => {
    button.addEventListener("click", () => {
      exportLinksCsv();
    });
  });

  appRoot.querySelectorAll("[data-action='export-resources-csv']").forEach((button) => {
    button.addEventListener("click", () => {
      exportResourcesCsv();
    });
  });

  appRoot.querySelectorAll("[data-action='open-resource-link']").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      void openResourceLink(link);
    });
  });
}

function isRestrictedUrl(url) {
  if (!url) {
    return true;
  }

  return RESTRICTED_PROTOCOLS.some((protocol) => url.startsWith(protocol)) || url.startsWith("https://chromewebstore.google.com/");
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function collectPageData(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/content/content.js"]
  });

  return results && results[0] ? results[0].result : null;
}

async function runAudit() {
  setState({ status: "loading", activeTab: "overview" });

  try {
    const activeTab = await getActiveTab();

    if (!activeTab || !activeTab.id) {
      console.error("SEO Score Checker: missing active tab or tab id.");
      setState({ status: "error" });
      return;
    }

    if (isRestrictedUrl(activeTab.url || "")) {
      setState({ status: "restricted" });
      return;
    }

    let pageData;

    try {
      pageData = await collectPageData(activeTab.id);
    } catch (error) {
      console.error("SEO Score Checker: executeScript failed.", error);
      const message = error && typeof error.message === "string" ? error.message : "";
      if (message.includes("Cannot access") || message.includes("The extensions gallery cannot be scripted")) {
        setState({ status: "restricted" });
        return;
      }

      setState({ status: "error" });
      return;
    }

    if (!pageData) {
      setState({ status: "unsupported" });
      return;
    }

    const audit = scorePage(pageData);
    const risk = calculateTrafficRisk(audit.issues, pageData);
    const topFixes = getTopFixes(audit.issues, pageData);
    const serpPreview = buildSerpPreview(pageData);

    setState({
      status: "success",
      activeTab: currentState.activeTab || "overview",
      data: {
        pageData,
        audit,
        risk,
        topFixes,
        serpPreview
      }
    });
  } catch (error) {
    console.error("SEO Score Checker: unexpected popup error.", error);
    setState({ status: "error" });
  }
}

async function exportPdf() {
  if (currentState.status !== "success" || !currentState.data) {
    return;
  }

  try {
    localStorage.setItem("seoScoreCheckerReportData", JSON.stringify(currentState.data));
    const reportUrl = chrome.runtime.getURL("src/report/report.html");
    await chrome.tabs.create({ url: reportUrl });
  } catch (error) {
    console.error("SEO Score Checker: export failed.", error);
  }
}

function exportLinksCsv() {
  if (currentState.status !== "success" || !currentState.data) {
    return;
  }

  try {
    const rows = currentState.data.pageData.links.items;
    const headers = ["Anchor text", "Type", "Follow", "URL kind", "URL", "Rel"];
    const escapeCsv = (value) => {
      const normalized = String(value ?? "");
      if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
        return '"' + normalized.replaceAll('"', '""') + '"';
      }

      return normalized;
    };

    const csv = [
      headers.join(","),
      ...rows.map((item) =>
        [
          item.text,
          item.type,
          item.followType,
          item.urlKind,
          item.href,
          item.rel
        ]
          .map(escapeCsv)
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (currentState.data.pageData.hostname || "page") + "-links.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("SEO Score Checker: CSV export failed.", error);
  }
}

function exportResourcesCsv() {
  if (currentState.status !== "success" || !currentState.data) {
    return;
  }

  try {
    const resources = currentState.data.pageData.resources || {
      html: [],
      css: [],
      js: []
    };
    const rows = [
      ...resources.html,
      ...resources.css,
      ...resources.js
    ];
    const headers = ["Type", "Kind", "Resource"];
    const escapeCsv = (value) => {
      const normalized = String(value ?? "");
      if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
        return '"' + normalized.replaceAll('"', '""') + '"';
      }

      return normalized;
    };

    const csv = [
      headers.join(","),
      ...rows.map((item) =>
        [
          item.type,
          item.kind,
          item.url
        ]
          .map(escapeCsv)
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (currentState.data.pageData.hostname || "page") + "-resources.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("SEO Score Checker: resources CSV export failed.", error);
  }
}

setState({ status: "loading" });
void runAudit();
