var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var xpunge_mu_consoleService = Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService);

var xpunge_mu_prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);

var xpunge_mu_TRASH_SEPARATOR_REGEXP = /   /;
var xpunge_mu_JUNK_SEPARATOR_REGEXP = /   /;
var xpunge_mu_COMPACT_SEPARATOR_REGEXP = /   /;

function xpunge_doMultiple() {
	var xpunge_mu_window = Services.wm.getMostRecentWindow("mail:3pane");
	var xpunge_mu_folderPane = getFolderPaneFromWindow(xpunge_mu_window);

	var msg = "xpunge - xpunge_doMultiple: " + new Date() + "\n\n";

	if (!xpunge_mu_window) {
		xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
				+ "ERROR - No window Object!" + "\n");

		return;
	}

	if (!xpunge_mu_folderPane) {
		xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
				+ "ERROR - No folderPane Object!" + "\n");

		return;
	}

	var confirmAction = xpunge_mu_prefBranch.getBoolPref("extensions.xpunge.settings.multi.confirm");

	if (confirmAction) {
		var proceed = xpunge_mu_proceedWith(xpunge_mu_window);

		if (!proceed) {
			return;
		}
	}

	msg = msg + xpunge_mu_processJunk(xpunge_mu_folderPane);

	msg = msg + xpunge_mu_processTrash(xpunge_mu_folderPane);

	msg = msg + xpunge_mu_processCompact(xpunge_mu_folderPane);

	xpunge_mu_consoleService.logStringMessage(msg);
}

function xpunge_mu_processTrash(xpunge_mu_folderPane) {
	var returnedMsg = "";

	var pref_trash = xpunge_mu_prefBranch.getCharPref("extensions.xpunge.multi.trash.accounts");

	if (pref_trash !== "") {
		var trash_array = pref_trash.split(xpunge_mu_TRASH_SEPARATOR_REGEXP);

		for (var i = 0; i < trash_array.length; i++) {
			if (trash_array[i] === "") {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "ERROR - Empty Trash Account Entry: Index = " + i + "\n");

				continue;
			}

			var msgfolder = xpunge_GetMsgFolderFromUri(trash_array[i], true);

			if (!msgfolder) {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "ERROR - Invalid Trash Account: " + trash_array[i] + "\n");

				continue;
			}

			if (!msgfolder.isServer) {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "ERROR - Trash Account Is Not A Server: " + trash_array[i] + "\n");

				continue;
			}

			if (msgfolder.name === "") {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "WARNING - Trash Account Has No Name: " + trash_array[i] + "\n");

				continue;
			}

			try {
				if (xpunge_canEmptyTrashMulti(msgfolder)) {
					returnedMsg = returnedMsg + "Emptying Trash For Account: " + msgfolder.prettyName + "\n";

					xpunge_mu_folderPane.emptyTrash(msgfolder);
				}
			} catch (e) {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple EXCEPTION 1 ["
						+ new Date() + "]: " + "\n\n" + trash_array[i] + "\n\n" + e + "\n");
			}
		}
	}

	return returnedMsg;
}

function xpunge_mu_processJunk(xpunge_mu_folderPane) {
	var returnedMsg = "";

	var pref_junk = xpunge_mu_prefBranch.getCharPref("extensions.xpunge.multi.junk.accounts");

	if (pref_junk !== "") {
		var junk_array = pref_junk.split(xpunge_mu_JUNK_SEPARATOR_REGEXP);

		for (var i = 0; i < junk_array.length; i++) {
			if (junk_array[i] === "") {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "ERROR - Empty Junk Account Entry: Index = " + i + "\n");

				continue;
			}

			var msgfolder = xpunge_GetMsgFolderFromUri(junk_array[i], true);

			if (!msgfolder) {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "ERROR - Invalid Junk Account: " + junk_array[i] + "\n");

				continue;
			}

			if (!msgfolder.isServer) {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "ERROR - Junk Account Is Not A Server: " + junk_array[i] + "\n");

				continue;
			}

			if (msgfolder.name === "") {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "WARNING - Junk Account Has No Name: " + junk_array[i] + "\n");

				continue;
			}

			try {
				if (xpunge_canEmptyJunkMulti(msgfolder)) {
					returnedMsg = returnedMsg + xpunge_emptyJunkMulti(xpunge_mu_folderPane, msgfolder);
				}
			} catch (e) {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple EXCEPTION 2 ["
						+ new Date() + "]: " + "\n\n" + junk_array[i] + "\n\n" + e + "\n");
			}
		}
	}

	return returnedMsg;
}

function xpunge_emptyJunkMulti(xpunge_mu_folderPane, folder) {
	var returnedMsg = "";

	// This will discover all folders considered to be "junk". For example, in an IMAP Gmail account
	// it will be both Gmail's "Spam" folder and the "Junk" folder created by Thunderbird if the user 
	// chooses to send emails marked as spam there.
	var junkFolders = folder.rootFolder.getFoldersWithFlags(Components.interfaces.nsMsgFolderFlags.Junk);

	for (var junkFolder of junkFolders) {
		try {
			if (junkFolder.getTotalMessages(true) > 0) {
				returnedMsg = returnedMsg + "Emptying Junk Folder (" + junkFolder.prettyName + ") For Account: "
						+ folder.prettyName + "\n";
				xpunge_mu_folderPane.emptyJunk(junkFolder);
			} else {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple: " + new Date() + "\n\n"
						+ "Avoiding To Empty Already " 
						+ "Empty Junk Folder (" + junkFolder.prettyName + ") For Account: " 
						+ folder.prettyName + "\n");
			}
		} catch (e) {
			xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple EXCEPTION 4 [" + new Date()
					+ "]:" + "\n\nJunk Folder: " + junkFolder.URI + "\n\n" + e + "\n");
		}
	}

	return returnedMsg;
}

function xpunge_mu_processCompact(xpunge_mu_folderPane) {
	var returnedMsg = "";

	var pref_compact = xpunge_mu_prefBranch.getCharPref("extensions.xpunge.multi.compact.accounts");

	if (pref_compact !== "") {
		var compact_array = pref_compact.split(xpunge_mu_COMPACT_SEPARATOR_REGEXP);

		for (var i = 0; i < compact_array.length; i++) {
			if (compact_array[i] === "") {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "ERROR - Empty Compact Account/Folder Entry: Index = " + i + "\n");

				continue;
			}

			var msgfolder = xpunge_GetMsgFolderFromUri(compact_array[i], true);

			if (!msgfolder) {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "ERROR - Invalid Compact Account/Folder: " + compact_array[i] + "\n");

				continue;
			}

			if (msgfolder.name === "") {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple:" + "\n\n"
						+ "WARNING - Compact Account/Folder Has No Name: " + compact_array[i] + "\n");

				continue;
			}

			try {
				if (xpunge_canCompactFoldersMulti(msgfolder)) {
					if (msgfolder.isServer) {
						returnedMsg = returnedMsg + "Compacting All Folders For Account: "
								+ msgfolder.prettyName + "\n";

						xpunge_mu_folderPane.compactAllFoldersForAccount(msgfolder);
					} else {
						returnedMsg = returnedMsg + "Compacting Folder (" + msgfolder.name + ") on "
								+ msgfolder.server.prettyName + "\n";

						xpunge_mu_folderPane.compactFolder(msgfolder);
					}
				}
			} catch (e) {
				xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_doMultiple EXCEPTION 3 ["
						+ new Date() + "]: " + "\n\n" + compact_array[i] + "\n\n" + e + "\n");
			}
		}
	}

	return returnedMsg;
}

function xpunge_canEmptyJunkMulti(folder) {
	var server = folder.server;

	if (!server) {
		xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkMulti:" + "\n\n"
				+ "ERROR - Invalid Server Property: " + folder.URI + "\n");

		return false;
	}

	var serverType = server.type;

	if (serverType == "nntp") {
		xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkMulti:" + "\n\n"
				+ "WARNING - Cannot Empty Junk On An NNTP Server: " + folder.URI + "\n");

		return false;
	} else if (serverType == "imap") {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

		if (ioService.offline) {
			xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkMulti:" + "\n\n"
					+ "WARNING - Cannot Empty Junk On An IMAP Server While Being Offline: " + folder.URI
					+ "\n");

			return false;
		}

		return true;
	} else {
		return true;
	}
}

function xpunge_canEmptyTrashMulti(folder) {
	var server = folder.server;

	if (!server) {
		xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashMulti:" + "\n\n"
				+ "ERROR - Invalid Server Property: " + folder.URI + "\n");

		return false;
	}

	var serverType = server.type;

	if (serverType == "nntp") {
		xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashMulti:" + "\n\n"
				+ "WARNING - Cannot Empty Trash On An NNTP Server: " + folder.URI + "\n");

		return false;
	} else if (serverType == "imap") {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

		if (ioService.offline) {
			xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashMulti:" + "\n\n"
					+ "WARNING - Cannot Empty Trash On An IMAP Server While Being Offline: " + folder.URI
					+ "\n");

			return false;
		}

		return true;
	} else {
		return true;
	}
}

function xpunge_canCompactFoldersMulti(folder) {
	var server = folder.server;

	if (!server) {
		xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersMulti:" + "\n\n"
				+ "ERROR - Invalid Server Property: " + folder.URI + "\n");

		return false;
	}

	if (folder.isServer) {
		if (!server.canCompactFoldersOnServer) {
			xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersMulti:" + "\n\n"
					+ "ERROR - Compacting Folders Not Allowed On Server: " + folder.URI + "\n");

			return false;
		}
	} else {
		if (!folder.canCompact) {
			xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersMulti:" + "\n\n"
					+ "ERROR - Compacting Folder Not Allowed: " + folder.URI + "\n");

			return false;
		}
	}

	var serverType = server.type;

	if (serverType == "imap") {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

		if (ioService.offline) {
			xpunge_mu_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersMulti:" + "\n\n"
					+ "WARNING - Cannot Compact Folders On An IMAP Server While Being Offline: " + folder.URI
					+ "\n");

			return false;
		}

		return true;
	} else {
		return true;
	}
}

function xpunge_mu_doMenuActionCall(elem) {
	xpunge_doMultiple();
}

function xpunge_mu_proceedWith(xpunge_mu_window) {
	let stringBundle = Services.strings.createBundle("chrome://xpunge/locale/xpunge_strings.properties");

	var trashSettings = xpunge_mu_calculateTrashSettings();
	var junkSettings = xpunge_mu_calculateJunkSettings();
	var compactSettings = xpunge_mu_calculateCompactSettings(stringBundle);

	var dialogTitle = stringBundle.GetStringFromName("xpunge_multi_str_confirm_dialog_title");

	var dialogMsg = stringBundle.formatStringFromName("xpunge_multi_str_confirm_msg_body", [ trashSettings,
			junkSettings, compactSettings ]);

	// Show a confirmation dialog. For the first argument, supply the parent window. The second
	// argument is the dialog title and the third argument is the message to display.
	return Services.prompt.confirm(xpunge_mu_window, dialogTitle, dialogMsg);
}

function xpunge_mu_calculateTrashSettings() {
	var trashSettings = "";

	var pref_trash = xpunge_mu_prefBranch.getCharPref("extensions.xpunge.multi.trash.accounts");

	if (pref_trash !== "") {
		var trash_array = pref_trash.split(xpunge_mu_TRASH_SEPARATOR_REGEXP);

		var msgfolder;

		for (var i = 0; i < trash_array.length - 1; i++) {
			msgfolder = xpunge_GetMsgFolderFromUri(trash_array[i], true);
			trashSettings = trashSettings + msgfolder.prettyName + ", ";
		}

		if ((trash_array.length - 1) >= 0) {
			msgfolder = xpunge_GetMsgFolderFromUri(trash_array[trash_array.length - 1], true);
			trashSettings = trashSettings + msgfolder.prettyName + ".";
		}
	}

	return trashSettings;
}

function xpunge_mu_calculateJunkSettings() {
	var junkSettings = "";

	var pref_junk = xpunge_mu_prefBranch.getCharPref("extensions.xpunge.multi.junk.accounts");

	if (pref_junk !== "") {
		var junk_array = pref_junk.split(xpunge_mu_JUNK_SEPARATOR_REGEXP);

		var msgfolder;

		for (var i = 0; i < junk_array.length - 1; i++) {
			msgfolder = xpunge_GetMsgFolderFromUri(junk_array[i], true);
			junkSettings = junkSettings + msgfolder.prettyName + ", ";
		}

		if ((junk_array.length - 1) >= 0) {
			msgfolder = xpunge_GetMsgFolderFromUri(junk_array[junk_array.length - 1], true);
			junkSettings = junkSettings + msgfolder.prettyName + ".";
		}
	}

	return junkSettings;
}

function xpunge_mu_calculateCompactSettings(stringBundle) {
	var compactSettings = "";

	var pref_compact = xpunge_mu_prefBranch.getCharPref("extensions.xpunge.multi.compact.accounts");

	if (pref_compact !== "") {
		var compact_array = pref_compact.split(xpunge_mu_COMPACT_SEPARATOR_REGEXP);

		var msgfolder;

		for (var i = 0; i < compact_array.length - 1; i++) {
			msgfolder = xpunge_GetMsgFolderFromUri(compact_array[i], true);

			if (msgfolder.isServer) {
				compactSettings = compactSettings + msgfolder.prettyName + " "
						+ stringBundle.GetStringFromName("xpunge_multi_str_compact_whole") + ", ";
			} else {
				compactSettings = compactSettings + msgfolder.prettyName + " "
						+ stringBundle.GetStringFromName("xpunge_multi_str_compact_belongs") + " "
						+ msgfolder.server.prettyName + ", ";
			}
		}

		if ((compact_array.length - 1) >= 0) {
			msgfolder = xpunge_GetMsgFolderFromUri(compact_array[compact_array.length - 1], true);

			if (msgfolder.isServer) {
				compactSettings = compactSettings + msgfolder.prettyName + " "
						+ stringBundle.GetStringFromName("xpunge_multi_str_compact_whole") + ".";
			} else {
				compactSettings = compactSettings + msgfolder.prettyName + " "
						+ stringBundle.GetStringFromName("xpunge_multi_str_compact_belongs") + " "
						+ msgfolder.server.prettyName + ".";
			}
		}
	}

	return compactSettings;
}
