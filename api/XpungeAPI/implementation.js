var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://xpunge/content/xpunge_imports.js", this, "UTF-8");
Services.scriptloader.loadSubScript("chrome://xpunge/content/xpunge_Messenger_Multi.js", this, "UTF-8");

var XpungeAPI = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      XpungeAPI: {
        async doMultiXpunge() {
          xpunge_doMultiple();
        },
      },
    };
  }
};
