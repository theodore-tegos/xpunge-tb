var xpunge_single_consoleService = Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService);

var xpunge_single_ELEMENT_IDS = [ "xpunge_options_single_trash", "xpunge_options_single_junk",
		"xpunge_options_single_compact" ];

function xpunge_single_LoadOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	for (var i = 0; i < xpunge_single_ELEMENT_IDS.length; i++) {
		var element = document.getElementById(xpunge_single_ELEMENT_IDS[i]);

		if (!element) {
			xpunge_single_consoleService.logStringMessage("xpunge - xpunge_single_LoadOptions:" + "\n\n"
					+ "ERROR - Invalid Element: " + xpunge_single_ELEMENT_IDS[i] + "\n");

			continue;
		}

		var eltType = element.localName;

		if (eltType == "checkbox") {
			element.checked = prefBranch.getBoolPref(element.getAttribute("prefstring"));
		}
	}
}

function xpunge_single_SaveOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	for (var i = 0; i < xpunge_single_ELEMENT_IDS.length; i++) {
		var element = document.getElementById(xpunge_single_ELEMENT_IDS[i]);

		if (!element) {
			xpunge_single_consoleService.logStringMessage("xpunge - xpunge_single_SaveOptions:" + "\n\n"
					+ "ERROR - Invalid Element: " + xpunge_single_ELEMENT_IDS[i] + "\n");

			continue;
		}

		var eltType = element.localName;

		if (eltType == "checkbox") {
			prefBranch.setBoolPref(element.getAttribute("prefstring"), element.checked);
		}
	}
}
