var xpunge_settings_consoleService = Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService);

var xpunge_settings_ELEMENT_IDS = [ "xpunge_options_settings_single_confirm",
		"xpunge_options_settings_multi_confirm" ];

function xpunge_settings_LoadOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	for (var i = 0; i < xpunge_settings_ELEMENT_IDS.length; i++) {
		var element = document.getElementById(xpunge_settings_ELEMENT_IDS[i]);

		if (!element) {
			xpunge_settings_consoleService.logStringMessage("xpunge - xpunge_settings_LoadOptions:" + "\n\n"
					+ "ERROR - Invalid Element: " + xpunge_settings_ELEMENT_IDS[i] + "\n");

			continue;
		}

		var eltType = element.localName;

		if (eltType == "checkbox") {
			element.checked = prefBranch.getBoolPref(element.getAttribute("prefstring"));
		}
	}
}

function xpunge_settings_SaveOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	for (var i = 0; i < xpunge_settings_ELEMENT_IDS.length; i++) {
		var element = document.getElementById(xpunge_settings_ELEMENT_IDS[i]);

		if (!element) {
			xpunge_settings_consoleService.logStringMessage("xpunge - xpunge_settings_SaveOptions:" + "\n\n"
					+ "ERROR - Invalid Element: " + xpunge_settings_ELEMENT_IDS[i] + "\n");

			continue;
		}

		var eltType = element.localName;

		if (eltType == "checkbox") {
			prefBranch.setBoolPref(element.getAttribute("prefstring"), element.checked);
		}
	}
}
