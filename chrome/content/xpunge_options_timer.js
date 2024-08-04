var xpunge_timer_consoleService = Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService);

var xpunge_timer_ELEMENT_IDS = [ "xpunge_options_timer_auto_check", "xpunge_options_timer_auto_startup",
		"xpunge_options_timer_auto_loop", "xpunge_options_timer_singleton_check",
		"xpunge_options_timer_auto_absolute_check", "xpunge_options_timer_auto_absolute_hours",
		"xpunge_options_timer_auto_absolute_minutes" ];

var xpunge_timer_NO_URI = "none";

var xpunge_timer_TRASH_ACCOUNT_SEPARATOR = "   ";
var xpunge_timer_JUNK_ACCOUNT_SEPARATOR = "   ";
var xpunge_timer_COMPACT_ACCOUNT_SEPARATOR = "   ";

var xpunge_timer_TRASH_ACCOUNT_SEPARATOR_REGEXP = /   /;
var xpunge_timer_JUNK_ACCOUNT_SEPARATOR_REGEXP = /   /;
var xpunge_timer_COMPACT_ACCOUNT_SEPARATOR_REGEXP = /   /;

function xpunge_timer_LoadOptions() {
	xpunge_timer_PopulateEmptiedAccountsTree();
	xpunge_timer_LoadOtherOptions();
	xpunge_timer_LoadTrashOptions();
	xpunge_timer_LoadJunkOptions();
	xpunge_timer_LoadCompactOptions();

	xpunge_timer_doHandleTimerState();
}

function xpunge_timer_LoadOtherOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var element = document.getElementById("xpunge_options_timer_singleton_check");
	element.checked = prefBranch.getBoolPref(element.getAttribute("prefstring"));

	element = document.getElementById("xpunge_options_timer_auto_check");
	element.checked = prefBranch.getBoolPref(element.getAttribute("prefstring"));

	element = document.getElementById("xpunge_options_timer_auto_startup");
	var num_str = prefBranch.getCharPref(element.getAttribute("prefstring"));

	if (!xpunge_timer_checkStartupInterval(num_str))
		element.value = "0";
	else
		element.value = num_str;

	element = document.getElementById("xpunge_options_timer_auto_loop");
	num_str = prefBranch.getCharPref(element.getAttribute("prefstring"));

	if (!xpunge_timer_checkLoopInterval(num_str))
		element.value = "0";
	else
		element.value = num_str;

	element = document.getElementById("xpunge_options_timer_auto_absolute_check");
	element.checked = prefBranch.getBoolPref(element.getAttribute("prefstring"));

	element = document.getElementById("xpunge_options_timer_auto_absolute_hours");
	num_str = prefBranch.getCharPref(element.getAttribute("prefstring"));

	element.setAttribute("label", num_str);

	element = document.getElementById("xpunge_options_timer_auto_absolute_minutes");
	num_str = prefBranch.getCharPref(element.getAttribute("prefstring"));

	element.setAttribute("label", num_str);
}

function xpunge_timer_LoadJunkOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_junk_account = prefBranch.getCharPref("extensions.xpunge.timer.junk.accounts");

	if (pref_junk_account === "") {
		xpunge_timer_setJunkAccountCounter(0);
	} else {
		var junk_account_array = pref_junk_account.split(xpunge_timer_JUNK_ACCOUNT_SEPARATOR_REGEXP);

		var do_fix_junk = false;

		var checked_rows = 0;

		for (var j = 0; j < junk_account_array.length; j++) {
			if (!xpunge_timer_isValidJunkAccountEntry(j, junk_account_array[j],
					"xpunge_timer_LoadJunkOptions")) {
				do_fix_junk = true;

				continue;
			}

			xpunge_timer_setJunkAccount(junk_account_array[j]);

			checked_rows++;
		}

		xpunge_timer_setJunkAccountCounter(checked_rows);

		if (do_fix_junk)
			xpunge_timer_fixInvalidSelectedJunkAccounts();
	}
}

function xpunge_timer_LoadTrashOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_trash_account = prefBranch.getCharPref("extensions.xpunge.timer.trash.accounts");

	if (pref_trash_account === "") {
		xpunge_timer_setTrashAccountCounter(0);
	} else {
		var trash_account_array = pref_trash_account.split(xpunge_timer_TRASH_ACCOUNT_SEPARATOR_REGEXP);

		var do_fix_trash = false;

		var checked_rows = 0;

		for (var j = 0; j < trash_account_array.length; j++) {
			if (!xpunge_timer_isValidTrashAccountEntry(j, trash_account_array[j],
					"xpunge_timer_LoadTrashOptions")) {
				do_fix_trash = true;

				continue;
			}

			xpunge_timer_setTrashAccount(trash_account_array[j]);

			checked_rows++;
		}

		xpunge_timer_setTrashAccountCounter(checked_rows);

		if (do_fix_trash)
			xpunge_timer_fixInvalidSelectedTrashAccounts();
	}
}

function xpunge_timer_LoadCompactOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_compact_account = prefBranch.getCharPref("extensions.xpunge.timer.compact.accounts");

	if (pref_compact_account === "") {
		xpunge_timer_setCompactAccountCounter();
	} else {
		var compact_account_array = pref_compact_account.split(xpunge_timer_COMPACT_ACCOUNT_SEPARATOR_REGEXP);

		var do_fix_compact = false;

		for (var j = 0; j < compact_account_array.length; j++) {
			if (!xpunge_timer_isValidCompactAccountEntry(j, compact_account_array[j],
					"xpunge_timer_LoadCompactOptions")) {
				do_fix_compact = true;

				continue;
			}

			var msgfolder = xpunge_GetMsgFolderFromUri(compact_account_array[j], true);

			var item_name;
			var server_name;

			if (msgfolder.isServer) {
				item_name = msgfolder.name + " "
						+ document.getElementById("xpunge_strings").getString("xpunge_timer_str_compact_whole");
			} else {
				if (msgfolder.server)
					server_name = msgfolder.server.prettyName;
				else {
					xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_LoadCompactOptions:"
							+ "\n\n" + "ERROR - Can't find server for " + compact_account_array[j] + "\n");
					server_name = "???";
				}

				item_name = msgfolder.name + " "
						+ document.getElementById("xpunge_strings").getString("xpunge_timer_str_compact_belongs") + " " + server_name;
			}

			xpunge_timer_appendCompactAccount(item_name, compact_account_array[j]);
		}

		xpunge_timer_ensureCompactAccountIsVisible(0);
		xpunge_timer_setCompactAccountCounter();

		if (do_fix_compact)
			xpunge_timer_fixInvalidSelectedCompactAccounts();
	}
}

function xpunge_timer_SaveOptions() {
	xpunge_timer_SaveOtherOptions();
	xpunge_timer_SaveTrashOptions();
	xpunge_timer_SaveJunkOptions();
	xpunge_timer_SaveCompactOptions();
}

function xpunge_timer_SaveOtherOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	for (var i = 0; i < xpunge_timer_ELEMENT_IDS.length; i++) {
		var element = document.getElementById(xpunge_timer_ELEMENT_IDS[i]);

		if (!element) {
			xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_SaveOtherOptions:" + "\n\n"
					+ "ERROR - Invalid Element: " + xpunge_timer_ELEMENT_IDS[i] + "\n");

			continue;
		}

		var eltType = element.localName;

		if (eltType == "input") {
			prefBranch.setCharPref(element.getAttribute("prefstring"), element.value);
		} else if (eltType == "checkbox") {
			prefBranch.setBoolPref(element.getAttribute("prefstring"), element.checked);
		} else if (eltType == "menulist") {
			prefBranch.setCharPref(element.getAttribute("prefstring"), element.getAttribute('label'));
		}
	}
}

function xpunge_timer_SaveJunkOptions() {
	var log_msg = "";
	var do_fix = false;

	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_account = "";

	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	var account_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_timer_emptied_accounts_col_account");
	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_uri");
	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_junk");

	var rows = 0;

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var junk_value = accounts_tree.view.getCellValue(j, junk_column);

		if (junk_value == "true") {
			var uri_value = accounts_tree.view.getCellText(j, uri_column);

			if (xpunge_timer_isValidJunkAccountEntry(j, uri_value, "xpunge_timer_SaveJunkOptions")) {
				if (rows === 0) {
					pref_account = uri_value;
				} else {
					pref_account = pref_account + xpunge_timer_JUNK_ACCOUNT_SEPARATOR + uri_value;
				}

				rows = rows + 1;
			} else {
				do_fix = true;

				var account_value = accounts_tree.view.getCellText(j, account_column);

				log_msg = log_msg + "Row = " + j + "     " + "Label = " + account_value + "     " + "\n\n";
			}
		}
	}

	prefBranch.setCharPref("extensions.xpunge.timer.junk.accounts", pref_account);

	if (do_fix) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_SaveJunkOptions:" + "\n\n"
				+ log_msg + "\n");

		window.alert(document.getElementById("xpunge_strings").getString("xpunge_timer_str_junk_save_fixed_msg"));
	}
}

function xpunge_timer_SaveTrashOptions() {
	var log_msg = "";
	var do_fix = false;

	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_account = "";

	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	var account_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_timer_emptied_accounts_col_account");
	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_uri");
	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_timer_emptied_accounts_col_trash");

	var rows = 0;

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var trash_value = accounts_tree.view.getCellValue(j, trash_column);

		if (trash_value == "true") {
			var uri_value = accounts_tree.view.getCellText(j, uri_column);

			if (xpunge_timer_isValidTrashAccountEntry(j, uri_value, "xpunge_timer_SaveTrashOptions")) {
				if (rows === 0) {
					pref_account = uri_value;
				} else {
					pref_account = pref_account + xpunge_timer_TRASH_ACCOUNT_SEPARATOR + uri_value;
				}

				rows = rows + 1;
			} else {
				do_fix = true;

				var account_value = accounts_tree.view.getCellText(j, account_column);

				log_msg = log_msg + "Row = " + j + "     " + "Label = " + account_value + "     " + "\n\n";
			}
		}
	}

	prefBranch.setCharPref("extensions.xpunge.timer.trash.accounts", pref_account);

	if (do_fix) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_SaveTrashOptions:" + "\n\n"
				+ log_msg + "\n");

		window.alert(document.getElementById("xpunge_strings").getString("xpunge_timer_str_trash_save_fixed_msg"));
	}
}

function xpunge_timer_SaveCompactOptions() {
	var log_msg = "";
	var do_fix = false;

	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var account_elem;

	var account_value;

	var pref_account = "";

	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	var rows = accounts.getRowCount();

	if (rows > 0) {
		account_elem = accounts.getItemAtIndex(0);

		account_value = account_elem.getAttribute("tooltiptext");

		if (xpunge_timer_isValidCompactAccountEntry(0, account_value, "xpunge_timer_SaveCompactOptions")) {
			pref_account = account_value;
		} else {
			do_fix = true;

			log_msg = log_msg + "Row = " + "0" + "     " + "Label = " + account_elem.getAttribute('label')
					+ "     " + "\n\n";
		}
	}

	for (var j = 1; j < rows; j++) {
		account_elem = accounts.getItemAtIndex(j);

		account_value = account_elem.getAttribute("tooltiptext");

		if (xpunge_timer_isValidCompactAccountEntry(j, account_value, "xpunge_timer_SaveCompactOptions")) {
			pref_account = pref_account + xpunge_timer_COMPACT_ACCOUNT_SEPARATOR + account_value;
		} else {
			do_fix = true;

			log_msg = log_msg + "Row = " + j + "     " + "Label = " + account_elem.getAttribute('label')
					+ "     " + "\n\n";
		}
	}

	prefBranch.setCharPref("extensions.xpunge.timer.compact.accounts", pref_account);

	if (do_fix) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_SaveCompactOptions:" + "\n\n"
				+ log_msg + "\n");

		window.alert(document.getElementById("xpunge_strings").getString("xpunge_timer_str_compact_save_fixed_msg"));
	}
}

function xpunge_timer_setJunkAccount(v_tooltip) {
	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_uri");
	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_junk");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var uri_value = accounts_tree.view.getCellText(j, uri_column);

		if (uri_value == v_tooltip) {
			accounts_tree.view.setCellValue(j, junk_column, "true");
		}
	}
}

function xpunge_timer_setTrashAccount(v_tooltip) {
	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_uri");
	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_timer_emptied_accounts_col_trash");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var uri_value = accounts_tree.view.getCellText(j, uri_column);

		if (uri_value == v_tooltip) {
			accounts_tree.view.setCellValue(j, trash_column, "true");
		}
	}
}

function xpunge_timer_constructEmptiedAccountsTreeView() {
    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);

    var allServers = accountManager.allServers;

    var serverData = new Array(allServers.length);

    var index = 0;

    for (var i = 0; i < allServers.length; i++) {
        var currentServer = allServers[i];

        if ("nntp" === currentServer.type) {
            continue;
        }

        account = currentServer.rootFolder.name;
        uri = currentServer.serverURI;

        serverData[index] = new Array(4);

        serverData[index][0] = account;
        serverData[index][1] = uri;
        serverData[index][2] = "false";
        serverData[index][3] = "false";

        index++;
    }

    return {
        rowCount : index,
        getCellText : function(row, column) {
            return serverData[row][column.index];
        },
        getCellValue : function(row, column) {
            return serverData[row][column.index];
        },
        setCellValue : function(row, column, value) {
            serverData[row][column.index] = value;
            this.treebox.invalidateCell(row, column);
        },
        setTree: function(treebox) { this.treebox = treebox; },
        isContainer: function(row) { return false; },
        isEditable: function(row, column) {
            if (("xpunge_options_timer_emptied_accounts_col_trash" === column.id) || ("xpunge_options_timer_emptied_accounts_col_junk" === column.id)) {
                return true;
            } else {
                return false;
            }
        },
        isSeparator: function(row) { return false; },
        isSorted: function() { return false; },
        getLevel: function(row) { return 0; },
        getImageSrc: function(row, column) { return null; },
        getRowProperties: function(row, props) {},
        getCellProperties: function(row, column, props) {},
        getColumnProperties: function(colid, column, props) {}
    };
}

function xpunge_timer_PopulateEmptiedAccountsTree() {
    var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

    accounts_tree.view = xpunge_timer_constructEmptiedAccountsTreeView();
}

function xpunge_timer_appendCompactAccount(v_account, v_tooltip) {
	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	accounts.appendItem(v_account);

	var item = accounts.getItemAtIndex(accounts.getRowCount() - 1);

	item.setAttribute('tooltiptext', v_tooltip);

	xpunge_timer_ensureCompactAccountIsVisible(accounts.getRowCount() - 1);
}

function xpunge_timer_SetCompactFolderPicker(selection, pickerID, defaultURI) {
	var picker = document.getElementById(pickerID);

	var uri;

	if (selection !== null) {
		uri = selection.URI;
	} else {
		uri = defaultURI;
	}

	var msgfolder = xpunge_GetMsgFolderFromUri(uri, true);

	if (!msgfolder) {
		picker.setAttribute("uri", xpunge_timer_NO_URI);
	} else {
		var selectedValue = null;
		var serverName;

		if (msgfolder.isServer)
			selectedValue = msgfolder.name + " "
					+ document.getElementById("xpunge_strings").getString("xpunge_timer_str_compact_whole");
		else {
			if (msgfolder.server)
				serverName = msgfolder.server.prettyName;
			else {
				xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_SetCompactFolderPicker:"
						+ "\n\n" + "ERROR - Can't find server for " + uri + "\n");
				serverName = "???";
			}

			selectedValue = msgfolder.name + " "
					+ document.getElementById("xpunge_strings").getString("xpunge_timer_str_compact_belongs")
					+ " " + serverName;
		}

		picker.setAttribute("label", selectedValue);
		picker.setAttribute("uri", uri);

		var button_add = document.getElementById("xpunge_options_timer_compact_add");

		button_add.disabled = false;
	}
}

function xpunge_timer_doAddJunkAllAccounts() {
	var compact_accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_timer_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_timer_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_timer_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_timer_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	accounts_tree.view.selection.clearSelection();

	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_junk");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		accounts_tree.view.setCellValue(j, junk_column, "true");
	}

	xpunge_timer_setJunkAccountCounter(accounts_tree.view.rowCount);

	xpunge_timer_doHandleTimerState();
}

function xpunge_timer_doRemoveJunkAllAccounts() {
	var compact_accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_timer_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_timer_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_timer_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_timer_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	accounts_tree.view.selection.clearSelection();

	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_junk");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		accounts_tree.view.setCellValue(j, junk_column, "false");
	}

	xpunge_timer_setJunkAccountCounter(0);

	xpunge_timer_doHandleTimerState();
}

function xpunge_timer_doAddTrashAllAccounts() {
	var compact_accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_timer_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_timer_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_timer_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_timer_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	accounts_tree.view.selection.clearSelection();

	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_timer_emptied_accounts_col_trash");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		accounts_tree.view.setCellValue(j, trash_column, "true");
	}

	xpunge_timer_setTrashAccountCounter(accounts_tree.view.rowCount);

	xpunge_timer_doHandleTimerState();
}

function xpunge_timer_doRemoveTrashAllAccounts() {
	var compact_accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_timer_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_timer_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_timer_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_timer_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	accounts_tree.view.selection.clearSelection();

	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_timer_emptied_accounts_col_trash");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		accounts_tree.view.setCellValue(j, trash_column, "false");
	}

	xpunge_timer_setTrashAccountCounter(0);

	xpunge_timer_doHandleTimerState();
}

function xpunge_timer_doAddCompactAccounts() {
	var picker = document.getElementById("xpunge_options_timer_compact_picker");

	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	var selection = picker.getAttribute("label");

	var uri = picker.getAttribute("uri");

	if (uri == xpunge_timer_NO_URI) {
		window.alert(document.getElementById("xpunge_strings").getString("xpunge_timer_str_compact_invalid_account"));

		return;
	}

	var rows = accounts.getRowCount();

	for (var i = 0; i < rows; i++) {
		var account_elem = accounts.getItemAtIndex(i);

		if (account_elem.getAttribute("tooltiptext") == uri) {
			if (account_elem.getAttribute("label") != selection) {
				account_elem.setAttribute("label", selection);
			} else {
				window.alert(document.getElementById("xpunge_strings").getString("xpunge_timer_str_compact_already_added"));
			}

			return;
		}
	}

	xpunge_timer_appendCompactAccount(selection, uri);

	xpunge_timer_setCompactAccountCounter();

	xpunge_timer_doHandleTimerState();
}

function xpunge_timer_doAddCompactAllAccounts() {
    xpunge_timer_doRemoveCompactAllAccounts();

    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);

    var allServers = accountManager.allServers;

    for (var i = 0; i < allServers.length; ++i) {
        var currentServer = allServers[i];

        uri = currentServer.serverURI;

        var label = currentServer.rootFolder.name + " "
            + document.getElementById("xpunge_strings").getString("xpunge_timer_str_compact_whole");

        xpunge_timer_appendCompactAccount(label, uri);
    }

    xpunge_timer_setCompactAccountCounter();

    xpunge_timer_doHandleTimerState();
}

function xpunge_timer_doRemoveCompactAccounts() {
	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	var selections = accounts.selectedCount;

	while (selections > 0) {
		var item = accounts.selectedItems[0];

		var index = accounts.getIndexOfItem(item);

		accounts.getItemAtIndex(index).remove();

		selections--;
	}

	var rows = accounts.getRowCount();

	if (rows <= 0) {
		var button_remove = document.getElementById("xpunge_options_timer_compact_remove");

		button_remove.disabled = true;
	}

	xpunge_timer_setCompactAccountCounter();

	xpunge_timer_doHandleTimerState();
}

function xpunge_timer_doRemoveCompactAllAccounts() {
	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	while (accounts.getRowCount() > 0) {
		accounts.getItemAtIndex(0).remove();
	}

	var button_remove = document.getElementById("xpunge_options_timer_compact_remove");

	button_remove.disabled = true;

	var button_remove_all = document.getElementById("xpunge_options_timer_compact_remove_all");

	button_remove_all.disabled = true;

	xpunge_timer_setCompactAccountCounter();

	xpunge_timer_doHandleTimerState();
}

function xpunge_timer_doHandleEmptiedAccountsFocus() {
	var compact_accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_timer_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_timer_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_timer_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_timer_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	xpunge_timer_setEmptiedAccountCounters();

	xpunge_timer_doHandleTimerState();

	var focus_area = document.getElementById("xpunge_options_timer_focus_area");
	focus_area.focus();
}

function xpunge_timer_doHandleCompactAccountsFocus() {
	var button_add = document.getElementById("xpunge_options_timer_compact_add");

	button_add.disabled = true;

	var button_add_all = document.getElementById("xpunge_options_timer_compact_add_all");

	button_add_all.disabled = true;

	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	var elems = accounts.getRowCount();

	if (elems > 0) {
		var button_remove_all = document.getElementById("xpunge_options_timer_compact_remove_all");

		button_remove_all.disabled = false;

		if (accounts.selectedCount !== 0) {
			var button_remove = document.getElementById("xpunge_options_timer_compact_remove");

			button_remove.disabled = false;
		}
	}

	var emptied_accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	emptied_accounts_tree.view.selection.clearSelection();
}

function xpunge_timer_doHandleCompactPickerFocus() {
	var button_add_all = document.getElementById("xpunge_options_timer_compact_add_all");

	button_add_all.disabled = false;

	var button_remove = document.getElementById("xpunge_options_timer_compact_remove");

	button_remove.disabled = true;

	var button_remove_all = document.getElementById("xpunge_options_timer_compact_remove_all");

	button_remove_all.disabled = true;

	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	accounts.clearSelection();

	var emptied_accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	emptied_accounts_tree.view.selection.clearSelection();
}

function xpunge_timer_doHandleClearFocus() {
	xpunge_timer_doHandleTrashClearFocus();
	xpunge_timer_doHandleCompactClearFocus();
}

function xpunge_timer_doHandleTrashClearFocus() {
	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	accounts_tree.view.selection.clearSelection();
}

function xpunge_timer_doHandleCompactClearFocus() {
	var button_add = document.getElementById("xpunge_options_timer_compact_add");

	button_add.disabled = true;

	var button_remove = document.getElementById("xpunge_options_timer_compact_remove");

	button_remove.disabled = true;

	var button_add_all = document.getElementById("xpunge_options_timer_compact_add_all");

	button_add_all.disabled = true;

	var button_remove_all = document.getElementById("xpunge_options_timer_compact_remove_all");

	button_remove_all.disabled = true;

	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	accounts.clearSelection();
}

function xpunge_timer_fixInvalidSelectedJunkAccounts() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	if (!accounts_tree) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_fixInvalidSelectedJunkAccounts:"
				+ "\n\n" + "ERROR - Invalid Element: " + "xpunge_options_timer_emptied_accounts" + "\n");

		return;
	}

	var eltType = accounts_tree.localName;

	if (eltType != "tree") {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_fixInvalidSelectedJunkAccounts:"
				+ "\n\n" + "ERROR - xpunge_options_timer_emptied_accounts is not a tree!" + "\n");

		return;
	}

	var pref_account = "";

	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_uri");
	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_junk");

	var rows = 0;

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var junk_value = accounts_tree.view.getCellValue(j, junk_column);

		if (junk_value == "true") {
			var uri_value = accounts_tree.view.getCellText(j, uri_column);

			if (rows === 0) {
				pref_account = uri_value;
			} else {
				pref_account = pref_account + xpunge_timer_JUNK_ACCOUNT_SEPARATOR + uri_value;
			}

			rows = rows + 1;
		}
	}

	prefBranch.setCharPref("extensions.xpunge.timer.junk.accounts", pref_account);
}

function xpunge_timer_fixInvalidSelectedTrashAccounts() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	if (!accounts_tree) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_fixInvalidSelectedTrashAccounts:"
				+ "\n\n" + "ERROR - Invalid Element: " + "xpunge_options_timer_emptied_accounts" + "\n");

		return;
	}

	var eltType = accounts_tree.localName;

	if (eltType != "tree") {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_fixInvalidSelectedTrashAccounts:"
				+ "\n\n" + "ERROR - xpunge_options_timer_emptied_accounts is not a tree!" + "\n");

		return;
	}

	var pref_account = "";

	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_uri");
	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_timer_emptied_accounts_col_trash");

	var rows = 0;

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var trash_value = accounts_tree.view.getCellValue(j, trash_column);

		if (trash_value == "true") {
			var uri_value = accounts_tree.view.getCellText(j, uri_column);

			if (rows === 0) {
				pref_account = uri_value;
			} else {
				pref_account = pref_account + xpunge_timer_TRASH_ACCOUNT_SEPARATOR + uri_value;
			}

			rows = rows + 1;
		}
	}

	prefBranch.setCharPref("extensions.xpunge.timer.trash.accounts", pref_account);
}

function xpunge_timer_fixInvalidSelectedCompactAccounts() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var element = document.getElementById("xpunge_options_timer_compact_accounts");

	if (!element) {
		xpunge_timer_consoleService
				.logStringMessage("xpunge - xpunge_timer_fixInvalidSelectedCompactAccounts:" + "\n\n"
						+ "ERROR - Invalid Element: " + "xpunge_options_timer_compact_accounts" + "\n");

		return;
	}

	var eltType = element.localName;

	if (eltType != "richlistbox") {
		xpunge_timer_consoleService
				.logStringMessage("xpunge - xpunge_timer_fixInvalidSelectedCompactAccounts:" + "\n\n"
						+ "ERROR - xpunge_options_timer_compact_accounts is not a richlistbox!" + "\n");

		return;
	}

	var account_elem;

	var account_value;

	var pref_account = "";

	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	var rows = accounts.getRowCount();

	if (rows > 0) {
		account_elem = accounts.getItemAtIndex(0);

		account_value = account_elem.getAttribute("tooltiptext");

		pref_account = account_value;
	}

	for (var j = 1; j < rows; j++) {
		account_elem = accounts.getItemAtIndex(j);

		account_value = account_elem.getAttribute("tooltiptext");

		pref_account = pref_account + xpunge_timer_COMPACT_ACCOUNT_SEPARATOR + account_value;
	}

	prefBranch.setCharPref("extensions.xpunge.timer.compact.accounts", pref_account);
}

function xpunge_timer_ensureCompactAccountIsVisible(index) {
	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	accounts.ensureIndexIsVisible(index);
}

function xpunge_timer_isValidJunkAccountEntry(index, uri, caller) {
	if (uri === "") {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidJunkAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Empty Account Entry: Index = " + index + "\n");

		return false;
	}

	var msgfolder = xpunge_GetMsgFolderFromUri(uri, true);

	if (!msgfolder) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidJunkAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Invalid Account: " + uri + "\n");

		return false;
	}

	if (!msgfolder.isServer) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidJunkAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account Is Not A Server: " + uri + "\n");

		return false;
	}

	if (msgfolder.name === "") {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidJunkAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account Has No Name: " + uri + "\n");

		return false;
	}

	return true;
}

function xpunge_timer_isValidTrashAccountEntry(index, uri, caller) {
	if (uri === "") {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidTrashAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Empty Account Entry: Index = " + index + "\n");

		return false;
	}

	var msgfolder = xpunge_GetMsgFolderFromUri(uri, true);

	if (!msgfolder) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidTrashAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Invalid Account: " + uri + "\n");

		return false;
	}

	if (!msgfolder.isServer) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidTrashAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account Is Not A Server: " + uri + "\n");

		return false;
	}

	if (msgfolder.name === "") {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidTrashAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account Has No Name: " + uri + "\n");

		return false;
	}

	return true;
}

function xpunge_timer_isValidCompactAccountEntry(index, uri, caller) {
	if (uri === "") {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidCompactAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Empty Account/Folder Entry: Index = " + index + "\n");

		return false;
	}

	var msgfolder = xpunge_GetMsgFolderFromUri(uri, true);

	if (!msgfolder) {
    xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidCompactAccountEntry("
        + caller + "):" + "\n\n" + "WARNING - Entry Is Not A Server Or A Folder: " + uri + "\n");

    return false;
	}

	if (msgfolder.name === "") {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_isValidCompactAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account/Folder Has No Name: " + uri + "\n");

		return false;
	}

	return true;
}

function xpunge_timer_setEmptiedAccountCounters() {
	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");

	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_timer_emptied_accounts_col_trash");
	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_junk");

	var checked_trash_rows = 0;
	var checked_junk_rows = 0;

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var trash_cell_value = accounts_tree.view.getCellValue(j, trash_column);
		var junk_cell_value = accounts_tree.view.getCellValue(j, junk_column);

		if (trash_cell_value == "true") {
			checked_trash_rows++;
		}

		if (junk_cell_value == "true") {
			checked_junk_rows++;
		}
	}

	var label_elem = document.getElementById("xpunge_options_timer_label_emptied_accounts");

	var old_label = label_elem.getAttribute("value");

	var new_label = old_label.replace(/\(.*\)/, "(" + checked_trash_rows + ")");
	new_label = new_label.replace(/\[.*\]/, "[" + checked_junk_rows + "]");

	label_elem.setAttribute("value", new_label);
}

function xpunge_timer_setJunkAccountCounter(count) {
	var label_elem = document.getElementById("xpunge_options_timer_label_emptied_accounts");

	var old_label = label_elem.getAttribute("value");

	var new_label = old_label.replace(/\[.*\]/, "[" + count + "]");

	label_elem.setAttribute("value", new_label);
}

function xpunge_timer_setTrashAccountCounter(count) {
	var label_elem = document.getElementById("xpunge_options_timer_label_emptied_accounts");

	var old_label = label_elem.getAttribute("value");

	var new_label = old_label.replace(/\(.*\)/, "(" + count + ")");

	label_elem.setAttribute("value", new_label);
}

function xpunge_timer_setCompactAccountCounter() {
	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	var rows = accounts.getRowCount();

	var label_elem = document.getElementById("xpunge_options_timer_label_compact_accounts");

	var old_label = label_elem.getAttribute("value");

	var field_array = old_label.split(/:/);

	var new_label = field_array[0] + ": " + rows;

	label_elem.setAttribute("value", new_label);
}

function xpunge_timer_updateTimerFocusItems() {
	var focus_element = document.getElementById("xpunge_options_timer_auto_check");
	var focus_startup = document.getElementById("xpunge_options_timer_auto_startup");
	var focus_loop = document.getElementById("xpunge_options_timer_auto_loop");

	if (focus_element.checked) {
		focus_startup.disabled = false;
		focus_loop.disabled = false;
	} else {
		focus_startup.disabled = true;
		focus_loop.disabled = true;
	}
}

function xpunge_timer_updateAbsoluteTimerFocusItems() {
	var focus_element = document.getElementById("xpunge_options_timer_auto_absolute_check");
	var focus_hours = document.getElementById("xpunge_options_timer_auto_absolute_hours");
	var focus_minutes = document.getElementById("xpunge_options_timer_auto_absolute_minutes");

	if (focus_element.checked) {
		focus_hours.disabled = false;
		focus_minutes.disabled = false;
	} else {
		focus_hours.disabled = true;
		focus_minutes.disabled = true;
	}
}

function xpunge_timer_checkStartupIntervalInput(elem) {
	if ((elem.value.search(/[^0-9]/) != -1) || (elem.value.length <= 0)) {
		window.alert(document.getElementById("xpunge_strings").getString("xpunge_timer_str_startup_invalid_integer")
				+ ": " + elem.value);
		elem.value = "0";
	}
}

function xpunge_timer_checkLoopIntervalInput(elem) {
	if ((elem.value.search(/[^0-9]/) != -1) || (elem.value.length <= 0)) {
		window.alert(document.getElementById("xpunge_strings").getString("xpunge_timer_str_loop_invalid_integer")
				+ ": " + elem.value);
		elem.value = "0";
	}
}

function xpunge_timer_checkStartupInterval(interval_str) {
	if (interval_str.length <= 0) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_checkStartupInterval:" + "\n\n"
				+ "WARNING - Empty startup timer interval preference: " + interval_str + "\n");

		return false;
	}

	if (interval_str.search(/[^0-9]/) != -1) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_checkStartupInterval:" + "\n\n"
				+ "WARNING - Invalid startup timer interval preference: " + interval_str + "\n");

		return false;
	}

	return true;
}

function xpunge_timer_checkLoopInterval(interval_str) {
	if (interval_str.length <= 0) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_checkLoopInterval:" + "\n\n"
				+ "WARNING - Empty loop timer interval preference: " + interval_str + "\n");

		return false;
	}

	if (interval_str.search(/[^0-9]/) != -1) {
		xpunge_timer_consoleService.logStringMessage("xpunge - xpunge_timer_checkLoopInterval:" + "\n\n"
				+ "WARNING - Invalid loop timer interval preference: " + interval_str + "\n");

		return false;
	}

	return true;
}

function xpunge_timer_doHandleTimerState() {
	var accounts_tree = document.getElementById("xpunge_options_timer_emptied_accounts");
	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_timer_emptied_accounts_col_trash");
	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_timer_emptied_accounts_col_junk");
	var compact_accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	var timer_check = document.getElementById("xpunge_options_timer_auto_check");
	var timer_startup = document.getElementById("xpunge_options_timer_auto_startup");
	var timer_loop = document.getElementById("xpunge_options_timer_auto_loop");
	var timer_singleton = document.getElementById("xpunge_options_timer_singleton_check");
	var timer_check_absolute = document.getElementById("xpunge_options_timer_auto_absolute_check");
	var timer_absolute_hours = document.getElementById("xpunge_options_timer_auto_absolute_hours");
	var timer_absolute_minutes = document.getElementById("xpunge_options_timer_auto_absolute_minutes");
	var timer_label_startup = document.getElementById("xpunge_options_timer_auto_label_startup_suffix");
	var timer_label_loop = document.getElementById("xpunge_options_timer_auto_label_loop_suffix");
	var timer_label_hours = document.getElementById("xpunge_options_timer_auto_absolute_label_hours_suffix");
	var timer_label_minutes = document
			.getElementById("xpunge_options_timer_auto_absolute_label_minutes_suffix");

	var trash_elems = xpunge_timer_calculateCheckedColumnElements(accounts_tree, trash_column);
	var junk_elems = xpunge_timer_calculateCheckedColumnElements(accounts_tree, junk_column);
	var compact_elems = compact_accounts.getRowCount();

	if ((trash_elems > 0) || (junk_elems > 0) || (compact_elems > 0)) {
		timer_check.disabled = false;
		timer_startup.disabled = false;
		timer_loop.disabled = false;
		timer_singleton.disabled = false;
		timer_check_absolute.disabled = false;
		timer_absolute_hours.disabled = false;
		timer_absolute_minutes.disabled = false;
		timer_label_startup.disabled = false;
		timer_label_loop.disabled = false;
		timer_label_hours.disabled = false;
		timer_label_minutes.disabled = false;

		xpunge_timer_updateTimerFocusItems();
		xpunge_timer_updateAbsoluteTimerFocusItems();
	} else {
		timer_check.checked = false;
		timer_check.disabled = true;
		timer_startup.disabled = true;
		timer_loop.disabled = true;
		timer_singleton.disabled = true;
		timer_check_absolute.checked = false;
		timer_check_absolute.disabled = true;
		timer_absolute_hours.disabled = true;
		timer_absolute_minutes.disabled = true;
		timer_label_startup.disabled = true;
		timer_label_loop.disabled = true;
		timer_label_hours.disabled = true;
		timer_label_minutes.disabled = true;
	}
}

function xpunge_timer_calculateCheckedColumnElements(tree, column) {
	var checked_rows = 0;

	for (var j = 0; j < tree.view.rowCount; j++) {
		var cell_value = tree.view.getCellValue(j, column);

		if (cell_value == "true") {
			checked_rows++;
		}
	}

	return checked_rows;
}

function xpunge_timer_doHandleCompactAccountsSelect() {
	var accounts = document.getElementById("xpunge_options_timer_compact_accounts");

	if (accounts.selectedCount !== 0) {
		var button_remove = document.getElementById("xpunge_options_timer_compact_remove");

		button_remove.disabled = false;
	}
}
