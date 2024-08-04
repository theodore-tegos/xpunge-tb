var xpunge_si_consoleService = Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService);

var xpunge_si_prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);

function xpunge_doSingle() {
	var msg = "xpunge - xpunge_doSingle: " + new Date() + "\n\n";

	var empty_trash = xpunge_si_prefBranch.getBoolPref("extensions.xpunge.single.trash");

	var empty_junk = xpunge_si_prefBranch.getBoolPref("extensions.xpunge.single.junk");

	var compact_folders = xpunge_si_prefBranch.getBoolPref("extensions.xpunge.single.compact");

	var xpunge_si_selectedFolder = null;
	var trash_folder_uri = "";

	var selectedFolders = GetSelectedMsgFolders();

	if (selectedFolders.length == 1) {
		var xpunge_si_selectedFolder = selectedFolders[0];

		var confirmAction = xpunge_si_prefBranch.getBoolPref("extensions.xpunge.settings.single.confirm");

		if (confirmAction) {
			var proceed = xpunge_si_proceedWith(xpunge_si_selectedFolder);

			if (!proceed) {
				return;
			}
		}

		// Check if the Trash folder is selected
		if (xpunge_si_selectedFolder.server.type != "imap") {
			try {
				if ((!xpunge_si_selectedFolder.isServer) && (xpunge_si_selectedFolder.prettyName == "Trash")
						&& (xpunge_si_selectedFolder.parent.URI == xpunge_si_selectedFolder.server.serverURI)) {
					trash_folder_uri = xpunge_si_selectedFolder.URI;
				}
			} catch (e) {
				xpunge_si_consoleService.logStringMessage("xpunge - xpunge_doSingle EXCEPTION 1 ["
						+ new Date() + "]:" + "\n\n" + e + "\n");
			}
		}

		try {
			if ((empty_junk) && (xpunge_canEmptyJunkSingle(xpunge_si_selectedFolder))) {
				msg = msg + xpunge_emptyJunkSingle(xpunge_si_selectedFolder);
			}
		} catch (e) {
			xpunge_si_consoleService.logStringMessage("xpunge - xpunge_doSingle EXCEPTION 2 [" + new Date()
					+ "]:" + "\n\n" + e + "\n");
		}

		try {
			if ((empty_trash) && (xpunge_canEmptyTrashSingle(xpunge_si_selectedFolder))) {
				msg = msg + "Emptying Trash For Account: " + xpunge_si_selectedFolder.server.prettyName
						+ "\n";
				getFolderPaneInherited().emptyTrash(xpunge_si_selectedFolder);
			}
		} catch (e) {
			xpunge_si_consoleService.logStringMessage("xpunge - xpunge_doSingle EXCEPTION 3 [" + new Date()
					+ "]:" + "\n\n" + e + "\n");
		}

		try {
			// Select the Trash folder again for compacting to work
			if (trash_folder_uri !== "") {
				SelectFolder(trash_folder_uri);
			}
		} catch (e) {
			xpunge_si_consoleService.logStringMessage("xpunge - xpunge_doSingle EXCEPTION 4 [" + new Date()
					+ "]:" + "\n\n" + e + "\n");
		}

		try {
			if ((compact_folders) && (xpunge_canCompactFoldersSingle(xpunge_si_selectedFolder))) {
                msg = msg + "Compacting All Folders For Account: " + xpunge_si_selectedFolder.server.prettyName
                    + "\n";
				getFolderPaneInherited().compactAllFoldersForAccount(xpunge_si_selectedFolder);
			}
		} catch (e) {
			xpunge_si_consoleService.logStringMessage("xpunge - xpunge_doSingle EXCEPTION 5 [" + new Date()
					+ "]:" + "\n\n" + e + "\n");
		}
	} else {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_doSingle:" + "\n\n"
				+ "WARNING - The Number Of Selected Folders is Not 1: " + selectedFolders.length + "\n");
	}

	xpunge_si_consoleService.logStringMessage(msg);
}

function xpunge_emptyJunkSingle(selectedFolder) {
	var returnedMsg = "";

	// This will discover all folders considered to be "junk". For example, in an IMAP Gmail account
	// it will be both Gmail's "Spam" folder and the "Junk" folder created by Thunderbird if the user 
	// chooses to send emails marked as spam there.
	var junkFolders = selectedFolder.rootFolder.getFoldersWithFlags(Components.interfaces.nsMsgFolderFlags.Junk);

	for (var junkFolder of junkFolders) {
		try {
			if (junkFolder.getTotalMessages(true) > 0) {
				returnedMsg = returnedMsg + "Emptying Junk Folder (" + junkFolder.prettyName + ") For Account: "
						+ selectedFolder.server.prettyName + "\n";
				getFolderPaneInherited().emptyJunk(junkFolder);
			} else {
				xpunge_si_consoleService.logStringMessage("xpunge - xpunge_doSingle: " + new Date() + "\n\n"
						+ "Avoiding To Empty Already " 
						+ "Empty Junk Folder (" + junkFolder.prettyName + ") For Account: " 
						+ selectedFolder.server.prettyName + "\n");
			}
		} catch (e) {
			xpunge_si_consoleService.logStringMessage("xpunge - xpunge_doSingle EXCEPTION 6 [" + new Date()
					+ "]:" + "\n\nJunk Folder: " + junkFolder.URI + "\n\n" + e + "\n");
		}
	}

	return returnedMsg;
}

function xpunge_canEmptyTrashSingle(selectedFolder) {
	if (!selectedFolder) {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashSingle:" + "\n\n"
				+ "ERROR - Invalid Selected Folder: " + selectedFolder.URI + "\n");

		return false;
	}

	var server = selectedFolder.server;

	if (!server) {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashSingle:" + "\n\n"
				+ "ERROR - Invalid Server Property: " + selectedFolder.URI + "\n");

		return false;
	}

	var serverType = server.type;

	if (serverType == "nntp") {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashSingle:" + "\n\n"
				+ "WARNING - Cannot Empty Trash On An NNTP Server: " + selectedFolder.URI + "\n");

		return false;
	} else if (serverType == "imap") {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

		if (ioService.offline) {
			xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashSingle:" + "\n\n"
					+ "WARNING - Cannot Empty Trash On An IMAP Server While Being Offline: "
					+ selectedFolder.URI + "\n");

			return false;
		}

		return true;
	} else {
		return true;
	}
}

function xpunge_canEmptyJunkSingle(selectedFolder) {
	if (!selectedFolder) {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkSingle:" + "\n\n"
				+ "ERROR - Invalid Selected Folder: " + selectedFolder.URI + "\n");

		return false;
	}

	var server = selectedFolder.server;

	if (!server) {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkSingle:" + "\n\n"
				+ "ERROR - Invalid Server Property: " + selectedFolder.URI + "\n");

		return false;
	}

	var serverType = server.type;

	if (serverType == "nntp") {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkSingle:" + "\n\n"
				+ "WARNING - Cannot Empty Junk On An NNTP Server: " + selectedFolder.URI + "\n");

		return false;
	} else if (serverType == "imap") {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

		if (ioService.offline) {
			xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkSingle:" + "\n\n"
					+ "WARNING - Cannot Empty Junk On An IMAP Server While Being Offline: "
					+ selectedFolder.URI + "\n");

			return false;
		}

		return true;
	} else {
		return true;
	}
}

function xpunge_canCompactFoldersSingle(selectedFolder) {
	if (!selectedFolder) {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersSingle:" + "\n\n"
				+ "ERROR - Invalid Selected Folder: " + selectedFolder.URI + "\n");

		return false;
	}

	var server = selectedFolder.server;

	if (!server) {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersSingle:" + "\n\n"
				+ "ERROR - Invalid Server Property: " + selectedFolder.URI + "\n");

		return false;
	}

	if (!server.canCompactFoldersOnServer) {
		xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersSingle:" + "\n\n"
				+ "WARNING - Compacting Folders Not Allowed On Server: " + selectedFolder.URI + "\n");

		return false;
	}

	var serverType = server.type;

	if (serverType == "imap") {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

		if (ioService.offline) {
			xpunge_si_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersSingle:" + "\n\n"
					+ "WARNING - Cannot Compact Folders On An IMAP Server While Being Offline: "
					+ selectedFolder.URI + "\n");

			return false;
		}

		return true;
	} else {
		return true;
	}
}

function xpunge_si_doMenuActionCall(elem) {
	xpunge_doSingle();
}

function xpunge_si_proceedWith(selectedFolder) {
	var empty_trash = xpunge_si_prefBranch.getBoolPref("extensions.xpunge.single.trash");

	var empty_junk = xpunge_si_prefBranch.getBoolPref("extensions.xpunge.single.junk");

	var compact_folders = xpunge_si_prefBranch.getBoolPref("extensions.xpunge.single.compact");

	var stringBundle = Services.strings.createBundle("chrome://xpunge/locale/xpunge_strings.properties");

	var empty_trash_str;

	if (empty_trash) {
		empty_trash_str = stringBundle.GetStringFromName("xpunge_str_yes");
	} else {
		empty_trash_str = stringBundle.GetStringFromName("xpunge_str_no");
	}

	var empty_junk_str;

	if (empty_junk) {
		empty_junk_str = stringBundle.GetStringFromName("xpunge_str_yes");
	} else {
		empty_junk_str = stringBundle.GetStringFromName("xpunge_str_no");
	}

	var compact_folders_str;

	if (compact_folders) {
		compact_folders_str = stringBundle.GetStringFromName("xpunge_str_yes");
	} else {
		compact_folders_str = stringBundle.GetStringFromName("xpunge_str_no");
	}

	var dialogTitle = stringBundle.GetStringFromName("xpunge_single_str_confirm_dialog_title");

	var dialogMsg = stringBundle.formatStringFromName("xpunge_single_str_confirm_msg_body", 
			[ selectedFolder.server.prettyName, empty_trash_str, empty_junk_str, compact_folders_str ]);

	// Show a confirmation dialog. For the first argument, supply the parent window. The second
	// argument is the dialog title and the third argument is the message to display.
	return Services.prompt.confirm(window, dialogTitle, dialogMsg);
}
