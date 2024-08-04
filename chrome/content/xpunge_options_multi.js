var xpunge_multi_consoleService = Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService);

var xpunge_multi_NO_URI = "none";

var xpunge_multi_TRASH_ACCOUNT_SEPARATOR = "   ";
var xpunge_multi_JUNK_ACCOUNT_SEPARATOR = "   ";
var xpunge_multi_COMPACT_ACCOUNT_SEPARATOR = "   ";

var xpunge_multi_TRASH_ACCOUNT_SEPARATOR_REGEXP = /   /;
var xpunge_multi_JUNK_ACCOUNT_SEPARATOR_REGEXP = /   /;
var xpunge_multi_COMPACT_ACCOUNT_SEPARATOR_REGEXP = /   /;

function xpunge_multi_LoadOptions() {
	xpunge_multi_PopulateEmptiedAccountsTree();
	xpunge_multi_LoadTrashOptions();
	xpunge_multi_LoadJunkOptions();
	xpunge_multi_LoadCompactOptions();
}

function xpunge_multi_LoadJunkOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_junk_account = prefBranch.getCharPref("extensions.xpunge.multi.junk.accounts");

	if (pref_junk_account === "") {
		xpunge_multi_setJunkAccountCounter(0);
	} else {
		var junk_account_array = pref_junk_account.split(xpunge_multi_JUNK_ACCOUNT_SEPARATOR_REGEXP);

		var do_fix_junk = false;

		var checked_rows = 0;

		for (var j = 0; j < junk_account_array.length; j++) {
			if (!xpunge_multi_isValidJunkAccountEntry(j, junk_account_array[j],
					"xpunge_multi_LoadJunkOptions")) {
				do_fix_junk = true;

				continue;
			}

			xpunge_multi_setJunkAccount(junk_account_array[j]);

			checked_rows++;
		}

		xpunge_multi_setJunkAccountCounter(checked_rows);

		if (do_fix_junk)
			xpunge_multi_fixInvalidSelectedJunkAccounts();
	}
}

function xpunge_multi_LoadTrashOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_trash_account = prefBranch.getCharPref("extensions.xpunge.multi.trash.accounts");

	if (pref_trash_account === "") {
		xpunge_multi_setTrashAccountCounter(0);
	} else {
		var trash_account_array = pref_trash_account.split(xpunge_multi_TRASH_ACCOUNT_SEPARATOR_REGEXP);

		var do_fix_trash = false;

		var checked_rows = 0;

		for (var j = 0; j < trash_account_array.length; j++) {
			if (!xpunge_multi_isValidTrashAccountEntry(j, trash_account_array[j],
					"xpunge_multi_LoadTrashOptions")) {
				do_fix_trash = true;

				continue;
			}

			xpunge_multi_setTrashAccount(trash_account_array[j]);

			checked_rows++;
		}

		xpunge_multi_setTrashAccountCounter(checked_rows);

		if (do_fix_trash)
			xpunge_multi_fixInvalidSelectedTrashAccounts();
	}
}

function xpunge_multi_LoadCompactOptions() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_compact_account = prefBranch.getCharPref("extensions.xpunge.multi.compact.accounts");

	if (pref_compact_account === "") {
		xpunge_multi_setCompactAccountCounter();
	} else {
		var compact_account_array = pref_compact_account.split(xpunge_multi_COMPACT_ACCOUNT_SEPARATOR_REGEXP);

		var do_fix_compact = false;

		for (var j = 0; j < compact_account_array.length; j++) {
			if (!xpunge_multi_isValidCompactAccountEntry(j, compact_account_array[j],
					"xpunge_multi_LoadCompactOptions")) {
				do_fix_compact = true;

				continue;
			}

			var msgfolder = xpunge_GetMsgFolderFromUri(compact_account_array[j], true);

			var item_name;
			var server_name;

			if (msgfolder.isServer) {
				item_name = msgfolder.name + " "
						+ document.getElementById("xpunge_strings").getString("xpunge_multi_str_compact_whole");
			} else {
				if (msgfolder.server)
					server_name = msgfolder.server.prettyName;
				else {
					xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_LoadCompactOptions:"
							+ "\n\n" + "ERROR - Can't find server for " + compact_account_array[j] + "\n");
					server_name = "???";
				}

				item_name = msgfolder.name + " "
						+ document.getElementById("xpunge_strings").getString("xpunge_multi_str_compact_belongs") + " " + server_name;
			}

			xpunge_multi_appendCompactAccount(item_name, compact_account_array[j]);
		}

		xpunge_multi_ensureCompactAccountIsVisible(0);
		xpunge_multi_setCompactAccountCounter();

		if (do_fix_compact)
			xpunge_multi_fixInvalidSelectedCompactAccounts();
	}
}

function xpunge_multi_SaveOptions() {
	xpunge_multi_SaveTrashOptions();
	xpunge_multi_SaveJunkOptions();
	xpunge_multi_SaveCompactOptions();
}

function xpunge_multi_SaveJunkOptions() {
	var log_msg = "";
	var do_fix = false;

	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_account = "";

	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	var account_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_multi_emptied_accounts_col_account");
	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_uri");
	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_junk");

	var rows = 0;

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var junk_value = accounts_tree.view.getCellValue(j, junk_column);

		if (junk_value == "true") {
			var uri_value = accounts_tree.view.getCellText(j, uri_column);

			if (xpunge_multi_isValidJunkAccountEntry(j, uri_value, "xpunge_multi_SaveJunkOptions")) {
				if (rows === 0) {
					pref_account = uri_value;
				} else {
					pref_account = pref_account + xpunge_multi_JUNK_ACCOUNT_SEPARATOR + uri_value;
				}

				rows = rows + 1;
			} else {
				do_fix = true;

				var account_value = accounts_tree.view.getCellText(j, account_column);

				log_msg = log_msg + "Row = " + j + "     " + "Label = " + account_value + "     " + "\n\n";
			}
		}
	}

	prefBranch.setCharPref("extensions.xpunge.multi.junk.accounts", pref_account);

	if (do_fix) {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_SaveJunkOptions:" + "\n\n"
				+ log_msg + "\n");

		window.alert(document.getElementById("xpunge_strings").getString("xpunge_multi_str_junk_save_fixed_msg"));
	}
}

function xpunge_multi_SaveTrashOptions() {
	var log_msg = "";
	var do_fix = false;

	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var pref_account = "";

	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	var account_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_multi_emptied_accounts_col_account");
	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_uri");
	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_multi_emptied_accounts_col_trash");

	var rows = 0;

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var trash_value = accounts_tree.view.getCellValue(j, trash_column);

		if (trash_value == "true") {
			var uri_value = accounts_tree.view.getCellText(j, uri_column);

			if (xpunge_multi_isValidTrashAccountEntry(j, uri_value, "xpunge_multi_SaveTrashOptions")) {
				if (rows === 0) {
					pref_account = uri_value;
				} else {
					pref_account = pref_account + xpunge_multi_TRASH_ACCOUNT_SEPARATOR + uri_value;
				}

				rows = rows + 1;
			} else {
				do_fix = true;

				var account_value = accounts_tree.view.getCellText(j, account_column);

				log_msg = log_msg + "Row = " + j + "     " + "Label = " + account_value + "     " + "\n\n";
			}
		}
	}

	prefBranch.setCharPref("extensions.xpunge.multi.trash.accounts", pref_account);

	if (do_fix) {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_SaveTrashOptions:" + "\n\n"
				+ log_msg + "\n");

		window.alert(document.getElementById("xpunge_strings").getString("xpunge_multi_str_trash_save_fixed_msg"));
	}
}

function xpunge_multi_SaveCompactOptions() {
	var log_msg = "";
	var do_fix = false;

	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var account_elem;

	var account_value;

	var pref_account = "";

	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	var rows = accounts.getRowCount();

	if (rows > 0) {
		account_elem = accounts.getItemAtIndex(0);

		account_value = account_elem.getAttribute("tooltiptext");

		if (xpunge_multi_isValidCompactAccountEntry(0, account_value, "xpunge_multi_SaveCompactOptions")) {
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

		if (xpunge_multi_isValidCompactAccountEntry(j, account_value, "xpunge_multi_SaveCompactOptions")) {
			pref_account = pref_account + xpunge_multi_COMPACT_ACCOUNT_SEPARATOR + account_value;
		} else {
			do_fix = true;

			log_msg = log_msg + "Row = " + j + "     " + "Label = " + account_elem.getAttribute('label')
					+ "     " + "\n\n";
		}
	}

	prefBranch.setCharPref("extensions.xpunge.multi.compact.accounts", pref_account);

	if (do_fix) {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_SaveCompactOptions:" + "\n\n"
				+ log_msg + "\n");

		window.alert(document.getElementById("xpunge_strings").getString("xpunge_multi_str_compact_save_fixed_msg"));
	}
}

function xpunge_multi_setJunkAccount(v_tooltip) {
	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_uri");
	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_junk");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var uri_value = accounts_tree.view.getCellText(j, uri_column);

		if (uri_value == v_tooltip) {
			accounts_tree.view.setCellValue(j, junk_column, "true");
		}
	}
}

function xpunge_multi_setTrashAccount(v_tooltip) {
	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_uri");
	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_multi_emptied_accounts_col_trash");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var uri_value = accounts_tree.view.getCellText(j, uri_column);

		if (uri_value == v_tooltip) {
			accounts_tree.view.setCellValue(j, trash_column, "true");
		}
	}
}

function xpunge_multi_constructEmptiedAccountsTreeView() {
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
            if (("xpunge_options_multi_emptied_accounts_col_trash" === column.id) || ("xpunge_options_multi_emptied_accounts_col_junk" === column.id)) {
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

function xpunge_multi_PopulateEmptiedAccountsTree() {
    var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

    accounts_tree.view = xpunge_multi_constructEmptiedAccountsTreeView();
}

function xpunge_multi_appendCompactAccount(v_account, v_tooltip) {
	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	accounts.appendItem(v_account);

	var item = accounts.getItemAtIndex(accounts.getRowCount() - 1);

	item.setAttribute('tooltiptext', v_tooltip);

	xpunge_multi_ensureCompactAccountIsVisible(accounts.getRowCount() - 1);
}

function xpunge_multi_SetCompactFolderPicker(selection, pickerID, defaultURI) {
	var picker = document.getElementById(pickerID);

	var uri;

	if (selection !== null) {
		uri = selection.URI;
	} else {
		uri = defaultURI;
	}

	var msgfolder = xpunge_GetMsgFolderFromUri(uri, true);

	if (!msgfolder) {
		picker.setAttribute("uri", xpunge_multi_NO_URI);
	} else {
		var selectedValue = null;
		var serverName;

		if (msgfolder.isServer)
			selectedValue = msgfolder.name + " "
					+ document.getElementById("xpunge_strings").getString("xpunge_multi_str_compact_whole");
		else {
			if (msgfolder.server)
				serverName = msgfolder.server.prettyName;
			else {
				xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_SetCompactFolderPicker:"
						+ "\n\n" + "ERROR - Can't find server for " + uri + "\n");
				serverName = "???";
			}

			selectedValue = msgfolder.name + " "
					+ document.getElementById("xpunge_strings").getString("xpunge_multi_str_compact_belongs")
					+ " " + serverName;
		}

		picker.setAttribute("label", selectedValue);
		picker.setAttribute("uri", uri);

		var button_add = document.getElementById("xpunge_options_multi_compact_add");

		button_add.disabled = false;
	}
}

function xpunge_multi_doAddJunkAllAccounts() {
	var compact_accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_multi_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_multi_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_multi_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_multi_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	accounts_tree.view.selection.clearSelection();

	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_junk");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		accounts_tree.view.setCellValue(j, junk_column, "true");
	}

	xpunge_multi_setJunkAccountCounter(accounts_tree.view.rowCount);
}

function xpunge_multi_doRemoveJunkAllAccounts() {
	var compact_accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_multi_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_multi_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_multi_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_multi_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	accounts_tree.view.selection.clearSelection();

	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_junk");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		accounts_tree.view.setCellValue(j, junk_column, "false");
	}

	xpunge_multi_setJunkAccountCounter(0);
}

function xpunge_multi_doAddTrashAllAccounts() {
	var compact_accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_multi_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_multi_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_multi_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_multi_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	accounts_tree.view.selection.clearSelection();

	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_multi_emptied_accounts_col_trash");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		accounts_tree.view.setCellValue(j, trash_column, "true");
	}

	xpunge_multi_setTrashAccountCounter(accounts_tree.view.rowCount);
}

function xpunge_multi_doRemoveTrashAllAccounts() {
	var compact_accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_multi_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_multi_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_multi_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_multi_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	accounts_tree.view.selection.clearSelection();

	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_multi_emptied_accounts_col_trash");

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		accounts_tree.view.setCellValue(j, trash_column, "false");
	}

	xpunge_multi_setTrashAccountCounter(0);
}

function xpunge_multi_doAddCompactAccounts() {
	var picker = document.getElementById("xpunge_options_multi_compact_picker");

	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	var selection = picker.getAttribute("label");

	var uri = picker.getAttribute("uri");

	if (uri == xpunge_multi_NO_URI) {
		window.alert(document.getElementById("xpunge_strings").getString("xpunge_multi_str_compact_invalid_account"));

		return;
	}

	var rows = accounts.getRowCount();

	for (var i = 0; i < rows; i++) {
		var account_elem = accounts.getItemAtIndex(i);

		if (account_elem.getAttribute("tooltiptext") == uri) {
			if (account_elem.getAttribute("label") != selection) {
				account_elem.setAttribute("label", selection);
			} else {
				window.alert(document.getElementById("xpunge_strings").getString("xpunge_multi_str_compact_already_added"));
			}

			return;
		}
	}

	xpunge_multi_appendCompactAccount(selection, uri);

	xpunge_multi_setCompactAccountCounter();
}

function xpunge_multi_doAddCompactAllAccounts() {
    xpunge_multi_doRemoveCompactAllAccounts();

    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);

    var allServers = accountManager.allServers;

    for (var i = 0; i < allServers.length; ++i) {
        var currentServer = allServers[i];

        uri = currentServer.serverURI;

        var label = currentServer.rootFolder.name + " "
            + document.getElementById("xpunge_strings").getString("xpunge_multi_str_compact_whole");

        xpunge_multi_appendCompactAccount(label, uri);
    }

    xpunge_multi_setCompactAccountCounter();
}

function xpunge_multi_doRemoveCompactAccounts() {
	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	var selections = accounts.selectedCount;

	while (selections > 0) {
		var item = accounts.selectedItems[0];

		var index = accounts.getIndexOfItem(item);

		accounts.getItemAtIndex(index).remove();

		selections--;
	}

	var rows = accounts.getRowCount();

	if (rows <= 0) {
		var button_remove = document.getElementById("xpunge_options_multi_compact_remove");

		button_remove.disabled = true;
	}

	xpunge_multi_setCompactAccountCounter();
}

function xpunge_multi_doRemoveCompactAllAccounts() {
	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	while (accounts.getRowCount() > 0) {
		accounts.getItemAtIndex(0).remove();
	}

	var button_remove = document.getElementById("xpunge_options_multi_compact_remove");

	button_remove.disabled = true;

	var button_remove_all = document.getElementById("xpunge_options_multi_compact_remove_all");

	button_remove_all.disabled = true;

	xpunge_multi_setCompactAccountCounter();
}

function xpunge_multi_doHandleEmptiedAccountsFocus() {
	var compact_accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	compact_accounts.clearSelection();

	var compact_button_add = document.getElementById("xpunge_options_multi_compact_add");
	var compact_button_remove = document.getElementById("xpunge_options_multi_compact_remove");
	var compact_button_add_all = document.getElementById("xpunge_options_multi_compact_add_all");
	var compact_button_remove_all = document.getElementById("xpunge_options_multi_compact_remove_all");

	compact_button_add.disabled = true;
	compact_button_remove.disabled = true;
	compact_button_add_all.disabled = true;
	compact_button_remove_all.disabled = true;

	xpunge_multi_setEmptiedAccountCounters();

	var focus_area = document.getElementById("xpunge_options_multi_focus_area");
	focus_area.focus();
}

function xpunge_multi_doHandleCompactAccountsFocus() {
	var button_add = document.getElementById("xpunge_options_multi_compact_add");

	button_add.disabled = true;

	var button_add_all = document.getElementById("xpunge_options_multi_compact_add_all");

	button_add_all.disabled = true;

	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	var elems = accounts.getRowCount();

	if (elems > 0) {
		var button_remove_all = document.getElementById("xpunge_options_multi_compact_remove_all");

		button_remove_all.disabled = false;

		if (accounts.selectedCount !== 0) {
			var button_remove = document.getElementById("xpunge_options_multi_compact_remove");

			button_remove.disabled = false;
		}
	}

	var emptied_accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	emptied_accounts_tree.view.selection.clearSelection();
}

function xpunge_multi_doHandleCompactPickerFocus() {
	var button_add_all = document.getElementById("xpunge_options_multi_compact_add_all");

	button_add_all.disabled = false;

	var button_remove = document.getElementById("xpunge_options_multi_compact_remove");

	button_remove.disabled = true;

	var button_remove_all = document.getElementById("xpunge_options_multi_compact_remove_all");

	button_remove_all.disabled = true;

	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	accounts.clearSelection();

	var emptied_accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	emptied_accounts_tree.view.selection.clearSelection();
}

function xpunge_multi_doHandleClearFocus() {
	xpunge_multi_doHandleTrashClearFocus();
	xpunge_multi_doHandleCompactClearFocus();
}

function xpunge_multi_doHandleTrashClearFocus() {
	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	accounts_tree.view.selection.clearSelection();
}

function xpunge_multi_doHandleCompactClearFocus() {
	var button_add = document.getElementById("xpunge_options_multi_compact_add");

	button_add.disabled = true;

	var button_remove = document.getElementById("xpunge_options_multi_compact_remove");

	button_remove.disabled = true;

	var button_add_all = document.getElementById("xpunge_options_multi_compact_add_all");

	button_add_all.disabled = true;

	var button_remove_all = document.getElementById("xpunge_options_multi_compact_remove_all");

	button_remove_all.disabled = true;

	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	accounts.clearSelection();
}

function xpunge_multi_fixInvalidSelectedJunkAccounts() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	if (!accounts_tree) {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_fixInvalidSelectedJunkAccounts:"
				+ "\n\n" + "ERROR - Invalid Element: " + "xpunge_options_multi_emptied_accounts" + "\n");

		return;
	}

	var eltType = accounts_tree.localName;

	if (eltType != "tree") {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_fixInvalidSelectedJunkAccounts:"
				+ "\n\n" + "ERROR - xpunge_options_multi_emptied_accounts is not a tree!" + "\n");

		return;
	}

	var pref_account = "";

	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_uri");
	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_junk");

	var rows = 0;

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var junk_value = accounts_tree.view.getCellValue(j, junk_column);

		if (junk_value == "true") {
			var uri_value = accounts_tree.view.getCellText(j, uri_column);

			if (rows === 0) {
				pref_account = uri_value;
			} else {
				pref_account = pref_account + xpunge_multi_JUNK_ACCOUNT_SEPARATOR + uri_value;
			}

			rows = rows + 1;
		}
	}

	prefBranch.setCharPref("extensions.xpunge.multi.junk.accounts", pref_account);
}

function xpunge_multi_fixInvalidSelectedTrashAccounts() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	if (!accounts_tree) {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_fixInvalidSelectedTrashAccounts:"
				+ "\n\n" + "ERROR - Invalid Element: " + "xpunge_options_multi_emptied_accounts" + "\n");

		return;
	}

	var eltType = accounts_tree.localName;

	if (eltType != "tree") {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_fixInvalidSelectedTrashAccounts:"
				+ "\n\n" + "ERROR - xpunge_options_multi_emptied_accounts is not a tree!" + "\n");

		return;
	}

	var pref_account = "";

	var uri_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_uri");
	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_multi_emptied_accounts_col_trash");

	var rows = 0;

	for (var j = 0; j < accounts_tree.view.rowCount; j++) {
		var trash_value = accounts_tree.view.getCellValue(j, trash_column);

		if (trash_value == "true") {
			var uri_value = accounts_tree.view.getCellText(j, uri_column);

			if (rows === 0) {
				pref_account = uri_value;
			} else {
				pref_account = pref_account + xpunge_multi_TRASH_ACCOUNT_SEPARATOR + uri_value;
			}

			rows = rows + 1;
		}
	}

	prefBranch.setCharPref("extensions.xpunge.multi.trash.accounts", pref_account);
}

function xpunge_multi_fixInvalidSelectedCompactAccounts() {
	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	var element = document.getElementById("xpunge_options_multi_compact_accounts");

	if (!element) {
		xpunge_multi_consoleService
				.logStringMessage("xpunge - xpunge_multi_fixInvalidSelectedCompactAccounts:" + "\n\n"
						+ "ERROR - Invalid Element: " + "xpunge_options_multi_compact_accounts" + "\n");

		return;
	}

	var eltType = element.localName;

	if (eltType != "richlistbox") {
		xpunge_multi_consoleService
				.logStringMessage("xpunge - xpunge_multi_fixInvalidSelectedCompactAccounts:" + "\n\n"
						+ "ERROR - xpunge_options_multi_compact_accounts is not a richlistbox!" + "\n");

		return;
	}

	var account_elem;

	var account_value;

	var pref_account = "";

	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	var rows = accounts.getRowCount();

	if (rows > 0) {
		account_elem = accounts.getItemAtIndex(0);

		account_value = account_elem.getAttribute("tooltiptext");

		pref_account = account_value;
	}

	for (var j = 1; j < rows; j++) {
		account_elem = accounts.getItemAtIndex(j);

		account_value = account_elem.getAttribute("tooltiptext");

		pref_account = pref_account + xpunge_multi_COMPACT_ACCOUNT_SEPARATOR + account_value;
	}

	prefBranch.setCharPref("extensions.xpunge.multi.compact.accounts", pref_account);
}

function xpunge_multi_ensureCompactAccountIsVisible(index) {
	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	accounts.ensureIndexIsVisible(index);
}

function xpunge_multi_isValidJunkAccountEntry(index, uri, caller) {
	if (uri === "") {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidJunkAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Empty Account Entry: Index = " + index + "\n");

		return false;
	}

	var msgfolder = xpunge_GetMsgFolderFromUri(uri, true);

	if (!msgfolder) {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidJunkAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Invalid Account: " + uri + "\n");

		return false;
	}

	if (!msgfolder.isServer) {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidJunkAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account Is Not A Server: " + uri + "\n");

		return false;
	}

	if (msgfolder.name === "") {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidJunkAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account Has No Name: " + uri + "\n");

		return false;
	}

	return true;
}

function xpunge_multi_isValidTrashAccountEntry(index, uri, caller) {
	if (uri === "") {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidTrashAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Empty Account Entry: Index = " + index + "\n");

		return false;
	}

	var msgfolder = xpunge_GetMsgFolderFromUri(uri, true);

	if (!msgfolder) {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidTrashAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Invalid Account: " + uri + "\n");

		return false;
	}

	if (!msgfolder.isServer) {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidTrashAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account Is Not A Server: " + uri + "\n");

		return false;
	}

	if (msgfolder.name === "") {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidTrashAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account Has No Name: " + uri + "\n");

		return false;
	}

	return true;
}

function xpunge_multi_isValidCompactAccountEntry(index, uri, caller) {
	if (uri === "") {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidCompactAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Empty Account/Folder Entry: Index = " + index + "\n");

		return false;
	}

	var msgfolder = xpunge_GetMsgFolderFromUri(uri, true);

	if (!msgfolder) {
    xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidCompactAccountEntry("
        + caller + "):" + "\n\n" + "WARNING - Entry Is Not A Server Or A Folder: " + uri + "\n");

    return false;
	}

	if (msgfolder.name === "") {
		xpunge_multi_consoleService.logStringMessage("xpunge - xpunge_multi_isValidCompactAccountEntry("
				+ caller + "):" + "\n\n" + "WARNING - Account/Folder Has No Name: " + uri + "\n");

		return false;
	}

	return true;
}

function xpunge_multi_setEmptiedAccountCounters() {
	var accounts_tree = document.getElementById("xpunge_options_multi_emptied_accounts");

	var trash_column = accounts_tree.columns
			.getNamedColumn("xpunge_options_multi_emptied_accounts_col_trash");
	var junk_column = accounts_tree.columns.getNamedColumn("xpunge_options_multi_emptied_accounts_col_junk");

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

	var label_elem = document.getElementById("xpunge_options_multi_label_emptied_accounts");

	var old_label = label_elem.getAttribute("value");

	var new_label = old_label.replace(/\(.*\)/, "(" + checked_trash_rows + ")");
	new_label = new_label.replace(/\[.*\]/, "[" + checked_junk_rows + "]");

	label_elem.setAttribute("value", new_label);
}

function xpunge_multi_setJunkAccountCounter(count) {
	var label_elem = document.getElementById("xpunge_options_multi_label_emptied_accounts");

	var old_label = label_elem.getAttribute("value");

	var new_label = old_label.replace(/\[.*\]/, "[" + count + "]");

	label_elem.setAttribute("value", new_label);
}

function xpunge_multi_setTrashAccountCounter(count) {
	var label_elem = document.getElementById("xpunge_options_multi_label_emptied_accounts");

	var old_label = label_elem.getAttribute("value");

	var new_label = old_label.replace(/\(.*\)/, "(" + count + ")");

	label_elem.setAttribute("value", new_label);
}

function xpunge_multi_setCompactAccountCounter() {
	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	var rows = accounts.getRowCount();

	var label_elem = document.getElementById("xpunge_options_multi_label_compact_accounts");

	var old_label = label_elem.getAttribute("value");

	var field_array = old_label.split(/:/);

	var new_label = field_array[0] + ": " + rows;

	label_elem.setAttribute("value", new_label);
}

function xpunge_multi_doHandleCompactAccountsSelect() {
	var accounts = document.getElementById("xpunge_options_multi_compact_accounts");

	if (accounts.selectedCount !== 0) {
		var button_remove = document.getElementById("xpunge_options_multi_compact_remove");

		button_remove.disabled = false;
	}
}
