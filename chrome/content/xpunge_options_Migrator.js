var xpunge_mi_NetUtilModule = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
var xpunge_mi_FileUtilsModule = ChromeUtils.import("resource://gre/modules/FileUtils.jsm");

var xpunge_mi_consoleService = Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService);

var xpunge_mi_prefService = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService);

var XPUNGE_MIGRATOR_PREF_BRANCH_OLD_ROOT         = "xpunge.options.";
var XPUNGE_MIGRATOR_PREF_BRANCH_NEW_ROOT         = "extensions.xpunge.";
var XPUNGE_MIGRATOR_PREF_NAME_MIGRATION_HAPPENED = "prefs.migrated.to.extensions.branch";
var XPUNGE_MIGRATOR_FILE_NAME_OLD_PREFS          = "xpunge-extension-prefmigration-old-prefs.txt";
var XPUNGE_MIGRATOR_FILE_NAME_EXISTING_NEW_PREFS = "xpunge-extension-prefmigration-existing-new-prefs.txt";
var XPUNGE_MIGRATOR_FILE_NAME_ERROR_MESSAGES     = "xpunge-extension-prefmigration-error-messages.txt";
var XPUNGE_MIGRATOR_FILE_NAME_EXCEPTION_MESSAGE  = "xpunge-extension-prefmigration-exception-message.txt";
var XPUNGE_MIGRATOR_URL_MIGRATION_ERROR          = "http://www.theodoretegos.net/mozilla/tb/releases/xpunge/prefmigration/index.html";

function xpungeMigratorMigratePreferencesToExtensionsBranch() {
	var newBranch = xpunge_mi_prefService.getBranch(XPUNGE_MIGRATOR_PREF_BRANCH_NEW_ROOT);

	// Only do the migration if it is not marked as done
	if (newBranch.getBoolPref(XPUNGE_MIGRATOR_PREF_NAME_MIGRATION_HAPPENED)) {
		return;
	}

	var oldBranch = xpunge_mi_prefService.getBranch(XPUNGE_MIGRATOR_PREF_BRANCH_OLD_ROOT);
	
	var msg = "";

	var exception = null;
	try {
		xpungeMigratorDumpPrefs(oldBranch, false, XPUNGE_MIGRATOR_FILE_NAME_OLD_PREFS);
		xpungeMigratorDumpPrefs(newBranch, false, XPUNGE_MIGRATOR_FILE_NAME_EXISTING_NEW_PREFS);

		// Mark the migration as done
		newBranch.setBoolPref(XPUNGE_MIGRATOR_PREF_NAME_MIGRATION_HAPPENED, true);

		xpungeMigratorMigratePrefs(oldBranch, newBranch);
	} catch (e) {
		exception = e;
	}

	try {
		xpungeMigratorCleanupOldPrefs(oldBranch);
	} catch (e) {
		xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
				+ "ERROR: SOMETHING WENT WRONG WHILE CLEANING UP OLD PREFS" + "\n\n" + e);
	}

	if (null === exception) {
		msg += "xpunge - xpunge_options_Migrator:" + "\n\n"	+ "PREFERENCES MIGRATION TO 'extensions.' BRANCH COMPLETED SUCCESSFULLY.";
		xpunge_mi_consoleService.logStringMessage(msg);
	} else {
		msg += "xpunge - xpunge_options_Migrator:" + "\n\n"	+ "ERROR: PREFERENCES MIGRATION TO 'extensions.' BRANCH WAS UNSUCCESSFUL.";
		xpunge_mi_consoleService.logStringMessage(msg + "\n\n" + exception);

		xpungeMigratorHandleUnsuccessfulMigration(exception);
	}
}

function xpungeMigratorMigratePrefs(oldBranch, newBranch) {
	var msg = "";

	msg += 'Old Branch: "' + oldBranch.root + '"' + "\n";
	msg += 'New Branch: "' + newBranch.root + '"' + "\n";

	var oldPrefs = oldBranch.getChildList("", {});
	msg += "Number Of Preferences To Migrate: " + oldPrefs.length + "\n\n";

	var problemFound = false;
	var problemsMsg = "";
	for (var index = 0; index < oldPrefs.length; index++) {
		var prefName = oldPrefs[index];
		if (oldBranch.prefHasUserValue(prefName)) {
			if (!newBranch.prefHasUserValue(prefName)) {
				msg += xpungeMigratorMigrateSinglePref(index + 1, oldBranch, newBranch, prefName);
			} else {
				problemFound = true;
				var errorMsg = 'ERROR: Preference (' + (index + 1) + ') "' + (newBranch.root + prefName) + '"' + ' Already Exists With New Value "'
				+ xpungeMigratorGetPrefAttributes(newBranch, prefName).value + '"' + ' [Old Value = "' + xpungeMigratorGetPrefAttributes(oldBranch, prefName).value
				+ '"]';
				problemsMsg += errorMsg + "\n\n";
				xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n" + errorMsg);
				
				xpungeMigratorDeletePref(oldBranch, prefName);
			}
		} else {
			msg += 'NOT MIGRATING Preference Because It Is Not Set By The User: "' + prefName + '"' + "\n\n";
		}
	}

	xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n" + msg);

	if (problemFound) {
		xpungeMigratorWriteProblemsMessageToFile(problemsMsg);
		throw new Error("Some preferences already exist in the new branch!");
	}
}

function xpungeMigratorMigrateSinglePref(prefId, oldBranch, newBranch, prefName) {
	var prefAttributes = xpungeMigratorGetPrefAttributes(oldBranch, prefName);
	var prefValue = prefAttributes.value;
	var prefType = prefAttributes.type;

	var msg = "Migrating " + xpungeMigratorPrettyPref(prefId, prefType, prefName, prefValue);
	msg += "\n";

	msg += xpungeMigratorSetPrefValue(newBranch, prefType, prefName, prefValue);
	msg += "\n";
	msg += xpungeMigratorDeletePref(oldBranch, prefName);
	msg += "\n";
	msg += "---------------";
	msg += "\n\n";

	return msg;
}

function xpungeMigratorDumpPrefs(branch, includeDefaults, filename) {
	xpungeMigratorWritePrefsToFile(filename, branch, includeDefaults);
	xpungeMigratorWritePrefsToConsole(branch, includeDefaults);
}

function xpungeMigratorWritePrefsToConsole(branch, includeDefaults) {
	var msg = "";

	msg += 'Branch: "' + branch.root + '"' + "\n";

	var prefs = branch.getChildList("", {});

	var prefMsg = "";
	var count = 0;
	for (var index = 0; index < prefs.length; index++) {
		var prefName = prefs[index];

		if (!includeDefaults && !branch.prefHasUserValue(prefName)) {
			continue;
		}

		count++;

		var prefAttributes = xpungeMigratorGetPrefAttributes(branch, prefName);
		var prefValue = prefAttributes.value;
		var prefType = prefAttributes.type;

		prefMsg += xpungeMigratorPrettyPref(count, prefType, prefName, prefValue);
		prefMsg += "\n";
		prefMsg += "---------------";
		prefMsg += "\n\n";
	}

	msg += "Number Of Preferences: " + count + "\n\n";
	msg += prefMsg;

	xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n" + msg);
}

function xpungeMigratorGetPrefAttributes(branch, prefName) {
	var prefValue = null;
	var prefType = branch.getPrefType(prefName);

	if (branch.PREF_INT == prefType) {
		prefValue = branch.getIntPref(prefName);
	} else if (branch.PREF_BOOL == prefType) {
		prefValue = branch.getBoolPref(prefName);
	} else if (branch.PREF_STRING == prefType) {
		prefValue = branch.getCharPref(prefName);
	}

	return {
		'value' : prefValue,
		'type' : prefType
	};
}

function xpungeMigratorSetPrefValue(branch, prefType, prefName, prefValue) {
	var msg = "";

	if (branch.PREF_INT == prefType) {
		msg += 'Setting [int] Preference "' + (branch.root + prefName) + '" To Value "' + prefValue + '"' + "\n";
		branch.setIntPref(prefName, prefValue);
	} else if (branch.PREF_BOOL == prefType) {
		msg += 'Setting [boolean] Preference "' + (branch.root + prefName) + '" To Value "' + prefValue + '"' + "\n";
		branch.setBoolPref(prefName, prefValue);
	} else if (branch.PREF_STRING == prefType) {
		msg += 'Setting [string] Preference "' + (branch.root + prefName) + '" To Value "' + prefValue + '"' + "\n";
		branch.setCharPref(prefName, prefValue);
	}

	return msg;
}

function xpungeMigratorDeletePref(branch, prefName) {
	var msg = 'Deleting preference: "' + (branch.root + prefName) + '"' + "\n";

	branch.clearUserPref(prefName);

	return msg;
}

function xpungeMigratorPrettyPref(prefId, prefType, prefName, prefValue) {
	var pref = "Preference " + prefId + ":" + "\n";

	pref += "\t" + 'name = "' + prefName + '"' + "\n";
	pref += "\t" + 'type = ' + xpungeMigratorPrettyType(prefType) + "\n";
	pref += "\t" + 'value = "' + prefValue + '"' + "\n";

	return pref;
}

function xpungeMigratorPrettyPrefValue(prefType, prefValue) {
	var value = "";

	if (Components.interfaces.nsIPrefBranch.PREF_INT == prefType) {
		value = prefValue;
	} else if (Components.interfaces.nsIPrefBranch.PREF_BOOL == prefType) {
		value = prefValue;
	} else if (Components.interfaces.nsIPrefBranch.PREF_STRING == prefType) {
		value = '"' + prefValue + '"';
	}

	return value;
}

function xpungeMigratorPrettyType(prefType) {
	var type = "unknown";

	if (Components.interfaces.nsIPrefBranch.PREF_INT == prefType) {
		type = "int";
	} else if (Components.interfaces.nsIPrefBranch.PREF_BOOL == prefType) {
		type = "boolean";
	} else if (Components.interfaces.nsIPrefBranch.PREF_STRING == prefType) {
		type = "string";
	}

	return type;
}

function xpungeMigratorHandleUnsuccessfulMigration(exception) {
	try {
		xpungeMigratorWriteExceptionToFile(exception);
	} catch (e) {
		xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
				+ "ERROR: SOMETHING WENT WRONG WHILE WRITING EXCEPTION TO FILE" + "\n\n" + e);
	}

	try {
		xpungeMigratorShowExceptionToUser(exception);
	} catch (e) {
		xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
				+ "ERROR: SOMETHING WENT WRONG WHILE SHOWING EXCEPTION TO USER" + "\n\n" + e);
	}
}

function xpungeMigratorShowExceptionToUser(exception) {
	var stringBundle = Services.strings.createBundle("chrome://xpunge/locale/xpunge_strings.properties");

	var msg = "";

	msg += stringBundle.GetStringFromName("xpunge_pref_migration_error_1");
	msg += "\n\n";
	msg += stringBundle.GetStringFromName("xpunge_pref_migration_error_2");
	msg += ":  " + exception.message;
	msg += "\n\n";
	msg += stringBundle.GetStringFromName("xpunge_pref_migration_error_3");
	msg += "\n\n";
	msg += stringBundle.GetStringFromName("xpunge_pref_migration_error_4");
	msg += "\n\n";
	msg += XPUNGE_MIGRATOR_URL_MIGRATION_ERROR;
	msg += "\n\n";

	window.setTimeout(function() {
		window.alert(msg);
	}, 0);
}

function xpungeMigratorWritePrefsToFile(filename, branch, includeDefaults) {
	var file = xpunge_mi_FileUtilsModule.FileUtils.getFile("ProfD", [ filename ]);

	xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
			+ 'Creating backup prefs file "' + file.path + '" for branch "' + branch.root + '" ...');

	var outputStream = xpunge_mi_FileUtilsModule.FileUtils.openSafeFileOutputStream(file);

	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";

	var data = xpungeMigratorCreatePrefsFileData(branch, includeDefaults);

	var inputStream = converter.convertToInputStream(data);

	try {
		xpunge_mi_NetUtilModule.NetUtil.asyncCopy(inputStream, outputStream, function(status) {
			if (!Components.isSuccessCode(status)) {
				xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
						+ 'ERROR: Creating backup prefs file "' + file.path + '" for branch "' + branch.root + '"' + ' was not successful: status="'
					+ status + '"');
				return;
			}

			xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
					+ 'Successfully created backup prefs file "' + file.path + '" for branch "' + branch.root + '"');
		});
	} catch (e) {
		xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
				+ 'ERROR: There was a problem creating backup prefs file "' + file.path + '" for branch "' + branch.root + '"' + "\n\n" + e);
	}
}

function xpungeMigratorCreatePrefsFileData(branch, includeDefaults) {
	var data = "";

	var prefs = branch.getChildList("", {});

	var prefData = "";
	for (var index = 0; index < prefs.length; index++) {
		var prefName = prefs[index];

		if (!includeDefaults && !branch.prefHasUserValue(prefName)) {
			continue;
		}

		var prefAttributes = xpungeMigratorGetPrefAttributes(branch, prefName);
		var prefValue = prefAttributes.value;
		var prefType = prefAttributes.type;

		prefData += "user_pref(";
		prefData += '"';
		prefData += branch.root + prefName;
		prefData += '"';
		prefData += ", ";
		prefData += xpungeMigratorPrettyPrefValue(prefType, prefValue);
		prefData += ");";
		prefData += "\n";
	}

	data += prefData;

	return data;
}

function xpungeMigratorWriteExceptionToFile(exception) {
	xpungeMigratorWriteToFile(XPUNGE_MIGRATOR_FILE_NAME_EXCEPTION_MESSAGE, "exception message", exception.message);
}

function xpungeMigratorWriteProblemsMessageToFile(msg) {
	xpungeMigratorWriteToFile(XPUNGE_MIGRATOR_FILE_NAME_ERROR_MESSAGES, "problems message", msg);
}

function xpungeMigratorWriteToFile(filename, msgId, msg) {
	var file = xpunge_mi_FileUtilsModule.FileUtils.getFile("ProfD", [ filename ]);

	xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
			+ 'Creating ' + msgId + ' file "' + file.path + '" ...');

	var outputStream = xpunge_mi_FileUtilsModule.FileUtils.openSafeFileOutputStream(file);

	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";

	var inputStream = converter.convertToInputStream(msg);

	try {
		xpunge_mi_NetUtilModule.NetUtil.asyncCopy(inputStream, outputStream, function(status) {
			if (!Components.isSuccessCode(status)) {
				xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
						+ 'ERROR: Creating ' + msgId + ' file "' + file.path + '" was not successful: status="' + status + '"');
				return;
			}

			xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
					+ 'Successfully created ' + msgId + ' file "' + file.path + '"');
		});
	} catch (e) {
		xpunge_mi_consoleService.logStringMessage("xpunge - xpunge_options_Migrator:" + "\n\n"
				+ 'ERROR: There was a problem creating ' + msgId + ' file "' + file.path + '"' + "\n\n" + e);
	}
}

function xpungeMigratorCleanupOldPrefs(branch) {
	branch.deleteBranch("");
}

window.addEventListener("load", function() {
	xpungeMigratorMigratePreferencesToExtensionsBranch();
}, false);
