const UNINSTALL_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfEpt7nfzwXMJTmXDGN9yUmQB82_-DkwdPBguYFm9Bag6FgBg/viewform";

if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.setUninstallURL(UNINSTALL_URL);

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
      // Open welcome page on first install
      const uiLang =
        typeof chrome.i18n !== "undefined" && chrome.i18n.getUILanguage
          ? chrome.i18n.getUILanguage()
          : "";
      chrome.tabs.create({
        url: `https://seoscorechecker.app?lang=${encodeURIComponent(uiLang)}`,
      });
    } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
      // When extension is updated
      // TODO: Remove this after testing - opens welcome page on every update for testing
      // chrome.tabs.create({
      //   url: 'https://seoscorechecker.app',
      // });
    } else if (
      details.reason === chrome.runtime.OnInstalledReason.CHROME_UPDATE
    ) {
      // When browser is updated
    } else if (
      details.reason === chrome.runtime.OnInstalledReason.SHARED_MODULE_UPDATE
    ) {
      // When a shared module is updated
    }
  });
}