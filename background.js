function multiXpungeClickAction() {
  browser.XpungeAPI.doMultiXpunge();
}

browser.browserAction.onClicked.addListener(multiXpungeClickAction);

messenger.WindowListener.registerDefaultPrefs("defaults/preferences/xpunge.js");

messenger.WindowListener.registerChromeUrl([ 
  ["content",  "xpunge",              "chrome/content/"],
  ["locale",   "xpunge",   "en-US",   "chrome/locale/en-US/"],
  ["locale",   "xpunge",   "da",      "chrome/locale/da/"],
  ["locale",   "xpunge",   "de",      "chrome/locale/de/"],
  ["locale",   "xpunge",   "el",      "chrome/locale/el/"],
  ["locale",   "xpunge",   "fr-FR",   "chrome/locale/fr-FR/"],
  ["locale",   "xpunge",   "ja",      "chrome/locale/ja/"],
  ["locale",   "xpunge",   "ru",      "chrome/locale/ru/"]
]);

messenger.WindowListener.registerOptionsPage("chrome://xpunge/content/xpunge_options.xhtml");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xhtml",
  "chrome://xpunge/content/messenger.js"
);

messenger.WindowListener.startListening();

