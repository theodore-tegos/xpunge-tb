var xpunge_ti_WindowCounterModule = ChromeUtils.import("chrome://xpunge/content/components/XpungeWindowCounter.js");

var xpunge_ti_consoleService = Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService);

var xpunge_ti_prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);

var xpunge_ti_listenerIntervalID = null;
var xpunge_ti_timerIntervalID = null;
var xpunge_ti_timerInterval = -1;
var xpunge_ti_definedInterval = -1;

var xpunge_ti_MILLISECONDS_IN_ONE_MINUTE = 60000;
var xpunge_ti_TIMER_STOP_FAILSAFE_DELAY = 2000; // 2 seconds
var xpunge_ti_MAIN_LISTENER_INTERVAL = 1 * xpunge_ti_MILLISECONDS_IN_ONE_MINUTE;

var xpunge_ti_window_counter = -1;

var xpunge_ti_log_loop_zero = 0;
var xpunge_ti_log_loop_unchecked = 0;

function xpunge_ti_onWindowLoad(activatedWhileWindowOpen) {
  xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_ti_onWindowLoad - Params Before: " + JSON.stringify({
    activatedWhileWindowOpen: activatedWhileWindowOpen,
    xpunge_ti_window_counter: xpunge_ti_window_counter,
    getWindowCounter: xpunge_ti_WindowCounterModule.XpungeWindowCounter.getWindowCounter(),
  }));

	var window_counter = xpunge_ti_WindowCounterModule.XpungeWindowCounter.getWindowCounter();

	xpunge_ti_window_counter = window_counter + 1;

	xpunge_ti_WindowCounterModule.XpungeWindowCounter.setWindowCounter(xpunge_ti_window_counter);

  xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_ti_onWindowLoad - Params After: " + JSON.stringify({
    activatedWhileWindowOpen: activatedWhileWindowOpen,
    xpunge_ti_window_counter: xpunge_ti_window_counter,
    getWindowCounter: xpunge_ti_WindowCounterModule.XpungeWindowCounter.getWindowCounter(),
  }));

	var msg = "xpunge - xpunge_ti_onWindowLoad (on Window #" + xpunge_ti_window_counter + "): " + new Date()
			+ "\n\n";

	msg = msg + "Opened Window #" + xpunge_ti_window_counter + "\n\n";

	var singleton_pref = xpunge_ti_prefBranch.getBoolPref("extensions.xpunge.timer.singleton");

	if (singleton_pref) {
		msg = msg + "Checking Singleton Conditions ..." + "\n";

		// Only setup the timer if this is the first window
		if (xpunge_ti_window_counter == 1) {
			msg = msg + "This Is The First Window. Setting Up Relative Timer ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			// Handle the startup expunction separately
			xpunge_ti_setupStartup();
		} else {
			msg = msg + "This Is Not The First Window. Relative Timer Not Set Up." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);
		}
	} else {
		msg = msg + "No Singleton Checking Chosen." + "\n";

		xpunge_ti_consoleService.logStringMessage(msg);

		// Handle the startup expunction separately
		xpunge_ti_setupStartup();
	}
}

function xpunge_ti_onWindowUnLoad(deactivatedWhileWindowOpen) {
  xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_ti_onWindowUnLoad - Params: " + JSON.stringify({
    deactivatedWhileWindowOpen: deactivatedWhileWindowOpen,
    xpunge_ti_window_counter: xpunge_ti_window_counter,
    getWindowCounter: xpunge_ti_WindowCounterModule.XpungeWindowCounter.getWindowCounter(),
  }));

	var msg = "xpunge - xpunge_ti_onWindowUnLoad (on Window #" + xpunge_ti_window_counter + "): "
			+ new Date() + "\n\n";

	msg = msg + "Closed Window #" + xpunge_ti_window_counter + "\n\n";

	if (xpunge_ti_timerIntervalID !== null) {
		msg = msg + "Stoping Existing Relative Timer ..." + "\n";

		xpunge_ti_clearTimerLoop();
	} else {
		msg = msg + "No Existing Relative Timer To Stop." + "\n";
	}

	if (xpunge_ti_listenerIntervalID !== null) {
		msg = msg + "Stoping Existing Listener ..." + "\n";

		xpunge_ti_clearTimerListener();
	} else {
		msg = msg + "No Existing Listener To Stop." + "\n";
	}

	xpunge_ti_consoleService.logStringMessage(msg);
}

function xpunge_ti_setupStartup() {
	var msg = "xpunge - xpunge_ti_setupStartup (on Window #" + xpunge_ti_window_counter + "): " + new Date()
			+ "\n\n";

	var xpunge_ti_auto_pref = xpunge_ti_prefBranch.getBoolPref("extensions.xpunge.timer.auto.check");

	if (xpunge_ti_auto_pref) {
		msg = msg + "Relative Timer Checkbox Selected." + "\n";

		var interval_pref_value = xpunge_ti_prefBranch.getCharPref("extensions.xpunge.timer.auto.startup");

		if (!xpunge_ti_checkStartupInterval(interval_pref_value)) {
			msg = msg + "xpunge_ti_checkStartupInterval() Failed." + "\n";

			msg = msg + "Starting Timer Listener ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			// Call the main listener once to avoid the loop delay
			xpunge_ti_mainListener();

			// Now set the main listener to loop
			xpunge_ti_setupListener();

			return;
		}

		var xpunge_ti_definedInterval = parseInt(interval_pref_value, 10) * xpunge_ti_MILLISECONDS_IN_ONE_MINUTE;

		msg = msg + "Defined Startup Expunction Interval = " + (xpunge_ti_definedInterval/xpunge_ti_MILLISECONDS_IN_ONE_MINUTE) + " minutes" + "\n";

		// Do not do a startup expunction with 0 interval
		if (xpunge_ti_definedInterval > 0) {
			msg = msg + "Setting Up Startup Expunction ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			setTimeout(function() {	xpunge_ti_timerStartup(); }, xpunge_ti_definedInterval);
		} else {
			msg = msg + "Did Not Setup Startup Expunction Because Of 0 Interval." + "\n";

			msg = msg + "Starting Timer Listener ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			// Call the main listener once to avoid the loop delay
			xpunge_ti_mainListener();

			// Now set the main listener to loop
			xpunge_ti_setupListener();
		}
	} else {
		msg = msg + "Relative Timer Checkbox NOT Selected." + "\n";

		msg = msg + "Starting Timer Listener ..." + "\n";

		xpunge_ti_consoleService.logStringMessage(msg);

		xpunge_ti_log_loop_unchecked = 1;

		// Call the main listener once to avoid the loop delay
		xpunge_ti_mainListener();

		// Now set the main listener to loop
		xpunge_ti_setupListener();
	}
}

function xpunge_ti_timerStartup() {
	var msg = "xpunge - xpunge_ti_timerStartup (on Window #" + xpunge_ti_window_counter + "): " + new Date()
			+ "\n\n";
	msg = msg + "Running Startup Expunction:" + "\n";

	var disable_menu_item = document.getElementById("xpunge_timer_relative_disable_menuitem");

	if (disable_menu_item.getAttribute("checked") == "true") {
		msg = msg + "Relative Timer Disabled From Menu." + "\n";

		msg = msg + "Starting Timer Listener ..." + "\n";

		xpunge_ti_consoleService.logStringMessage(msg);

		// Call the main listener once to avoid the loop delay
		xpunge_ti_mainListener();

		// Now set the main listener to loop
		xpunge_ti_setupListener();

		return;
	}

	var xpunge_ti_timer_pref = xpunge_ti_prefBranch.getBoolPref("extensions.xpunge.timer.auto.check");

	if (xpunge_ti_timer_pref) {
		msg = msg + "Relative Timer Checkbox Selected." + "\n";

		var interval_pref_value = xpunge_ti_prefBranch.getCharPref("extensions.xpunge.timer.auto.startup");

		if (!xpunge_ti_checkStartupInterval(interval_pref_value)) {
			msg = msg + "xpunge_ti_checkStartupInterval() Failed." + "\n";

			msg = msg + "Starting Timer Listener ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			// Call the main listener once to avoid the loop delay
			xpunge_ti_mainListener();

			// Now set the main listener to loop
			xpunge_ti_setupListener();

			return;
		}

		var xpunge_ti_definedInterval = parseInt(interval_pref_value, 10) * xpunge_ti_MILLISECONDS_IN_ONE_MINUTE;

		msg = msg + "Defined Startup Expunction Interval = " + (xpunge_ti_definedInterval/xpunge_ti_MILLISECONDS_IN_ONE_MINUTE) + " minutes" + "\n";

		// Do not do a startup expunction with 0 interval
		if (xpunge_ti_definedInterval > 0) {
			msg = msg + "Doing Startup Timer Expunction ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			xpunge_doTimer();

			msg = "Starting Timer Listener ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			// Call the main listener once to avoid the loop delay
			xpunge_ti_mainListener();

			// Now set the main listener to loop
			xpunge_ti_setupListener();
		} else {
			msg = msg + "Did Not Do Startup Expunction Because Of 0 Interval." + "\n";

			msg = msg + "Starting Timer Listener ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			// Call the main listener once to avoid the loop delay
			xpunge_ti_mainListener();

			// Now set the main listener to loop
			xpunge_ti_setupListener();
		}
	} else {
		msg = msg + "Relative Timer Checkbox NOT Selected." + "\n";

		msg = msg + "Starting Timer Listener ..." + "\n";

		xpunge_ti_consoleService.logStringMessage(msg);

		xpunge_ti_log_loop_unchecked = 1;

		// Call the main listener once to avoid the loop delay
		xpunge_ti_mainListener();

		// Now set the main listener to loop
		xpunge_ti_setupListener();
	}
}

function xpunge_ti_mainListener() {
	if (!xpunge_ti_isAbsoluteTimerDisabledFromMenu()) {
		xpunge_ti_handleAbsoluteTimer();
	}

	if (!xpunge_ti_isRelativeTimerDisabledFromMenu()) {
		xpunge_ti_handleRelativeTimer();
	}
}

function xpunge_ti_handleAbsoluteTimer() {
	var Stamp = new Date();
	var msg = "xpunge - xpunge_ti_handleAbsoluteTimer (on Window #" + xpunge_ti_window_counter + "): "
			+ new Date() + "\n\n";

	var xpunge_ti_absolute_auto_pref = xpunge_ti_prefBranch
			.getBoolPref("extensions.xpunge.timer.auto.absolute.check");

	if (xpunge_ti_absolute_auto_pref) {
		msg = msg + "Absolute Timer Checkbox Selected." + "\n";

		var hours_pref_value = xpunge_ti_prefBranch.getCharPref("extensions.xpunge.timer.auto.absolute.hours");
		var minutes_pref_value = xpunge_ti_prefBranch
				.getCharPref("extensions.xpunge.timer.auto.absolute.minutes");

		var hours = 0;
		if (hours_pref_value.indexOf("0") === 0) {
			var stripped_hours_pref_value = hours_pref_value.substring(1);
			hours = parseInt(stripped_hours_pref_value, 10);
		} else {
			hours = parseInt(hours_pref_value, 10);
		}

		var minutes = 0;
		if (minutes_pref_value.indexOf("0") === 0) {
			var stripped_minutes_pref_value = minutes_pref_value.substring(1);
			minutes = parseInt(stripped_minutes_pref_value, 10);
		} else {
			minutes = parseInt(minutes_pref_value, 10);
		}

		if ((hours == Stamp.getHours()) && (minutes == Stamp.getMinutes())) {
			msg = msg + "Doing Absolute Timer Expunction:" + "\n";
			msg = msg + "Set Up Time = " + hours_pref_value + ":" + minutes_pref_value + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			xpunge_doTimer();
		}
	}
}

function xpunge_ti_handleRelativeTimer() {
	var msg = "xpunge - xpunge_ti_handleRelativeTimer (on Window #" + xpunge_ti_window_counter + "): "
			+ new Date() + "\n\n";

	var xpunge_ti_timer_pref = xpunge_ti_prefBranch.getBoolPref("extensions.xpunge.timer.auto.check");

	if (xpunge_ti_timer_pref)
	// Timer selected - start a new timer
	{
		xpunge_ti_log_loop_unchecked = 0;

		msg = msg + "Relative Timer Checkbox Selected." + "\n";

		var interval_pref_value = xpunge_ti_prefBranch.getCharPref("extensions.xpunge.timer.auto.loop");

		if (!xpunge_ti_checkLoopInterval(interval_pref_value)) {
			msg = msg + "xpunge_ti_checkLoopInterval() Failed." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			return;
		}

		xpunge_ti_definedInterval = parseInt(interval_pref_value, 10) * xpunge_ti_MILLISECONDS_IN_ONE_MINUTE;

		msg = msg + "Defined Loop Expunction Interval = " + (xpunge_ti_definedInterval/xpunge_ti_MILLISECONDS_IN_ONE_MINUTE) + " minutes" + "\n";

		if (xpunge_ti_timerIntervalID === null)
		// No existing timer - start a new one
		{
			msg = msg + "No Existing Relative Timer." + "\n";

			// Do not setup a timer with 0 delay
			if (xpunge_ti_definedInterval > 0) {
				xpunge_ti_log_loop_zero = 0;

				msg = msg + "Setting Up New Relative Timer ..." + "\n";

				xpunge_ti_consoleService.logStringMessage(msg);

				setTimeout(function() { xpunge_ti_setupTimerLoop(); }, xpunge_ti_TIMER_STOP_FAILSAFE_DELAY);
			} else {
				if (xpunge_ti_log_loop_zero === 0) {
					xpunge_ti_log_loop_zero = 1;

					msg = msg + "Did Not Start Relative Timer Because Of 0 Interval." + "\n";

					xpunge_ti_consoleService.logStringMessage(msg);
				}
			}
		} else
		// Timer exists - check interval
		{
			msg = msg + "There Is An Existing Relative Timer:" + "\n";
			msg = msg + "Timer ID = " + xpunge_ti_timerIntervalID + "\n";
			msg = msg + "Timer Interval = " + (xpunge_ti_timerInterval/xpunge_ti_MILLISECONDS_IN_ONE_MINUTE)
					+ " minutes" + "\n";

			// If a new interval is defined, start a new timer
			if (xpunge_ti_timerInterval != xpunge_ti_definedInterval) {
				msg = msg + "Need To Start A New Relative Timer." + "\n";

				msg = msg + "Stopping Existing Relative Timer ..." + "\n";

				xpunge_ti_consoleService.logStringMessage(msg);

				xpunge_ti_clearTimerLoop();

				msg = "xpunge - xpunge_ti_mainListener (on Window #" + xpunge_ti_window_counter + "): "
						+ new Date() + "\n\n";

				// Do not setup a timer with 0 delay
				if (xpunge_ti_definedInterval > 0) {
					msg = msg + "Setting Up New Relative Timer ..." + "\n";

					xpunge_ti_consoleService.logStringMessage(msg);

					setTimeout(function() { xpunge_ti_setupTimerLoop(); }, xpunge_ti_TIMER_STOP_FAILSAFE_DELAY);
				} else {
					xpunge_ti_log_loop_zero = 1;

					msg = msg + "Did Not Start Relative Timer Because Of 0 Interval." + "\n";

					xpunge_ti_consoleService.logStringMessage(msg);
				}
			}
		}
	} else
	// Timer not selected - stop existing timer
	{
		msg = msg + "Relative Timer Checkbox NOT Selected." + "\n";

		if (xpunge_ti_timerIntervalID !== null) {
			xpunge_ti_log_loop_unchecked = 1;

			msg = msg + "Stopping Existing Relative Timer ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			xpunge_ti_clearTimerLoop();
		} else {
			if (xpunge_ti_log_loop_unchecked === 0) {
				xpunge_ti_log_loop_unchecked = 1;

				msg = msg + "No Existing Relative Timer To Stop" + "\n";

				xpunge_ti_consoleService.logStringMessage(msg);
			}
		}
	}
}

function xpunge_ti_clearTimerListener() {
	var msg = "xpunge - xpunge_ti_clearTimerListener (on Window #" + xpunge_ti_window_counter + "): "
			+ new Date() + "\n\n";
	msg = msg + "Stopped Existing Listener:" + "\n";
	msg = msg + "Listener ID = " + xpunge_ti_listenerIntervalID + "\n";
	msg = msg + "Listener Interval = " + (xpunge_ti_MAIN_LISTENER_INTERVAL/xpunge_ti_MILLISECONDS_IN_ONE_MINUTE) + " minutes" + "\n";

	window.clearInterval(xpunge_ti_listenerIntervalID);
	xpunge_ti_listenerIntervalID = null;

	xpunge_ti_consoleService.logStringMessage(msg);
}

function xpunge_ti_setupListener() {
	var msg = "xpunge - xpunge_ti_setupListener (on Window #" + xpunge_ti_window_counter + "): " + new Date()
			+ "\n\n";

	xpunge_ti_listenerIntervalID = window.setInterval(function() { xpunge_ti_mainListener(); }, xpunge_ti_MAIN_LISTENER_INTERVAL);

	msg = msg + "Started New Listener:" + "\n";
	msg = msg + "Listener ID = " + xpunge_ti_listenerIntervalID + "\n";
	msg = msg + "Listener Interval = " + (xpunge_ti_MAIN_LISTENER_INTERVAL/xpunge_ti_MILLISECONDS_IN_ONE_MINUTE) + " minutes" + "\n";

	xpunge_ti_consoleService.logStringMessage(msg);
}

function xpunge_ti_clearTimerLoop() {
	var msg = "xpunge - xpunge_ti_clearTimerLoop (on Window #" + xpunge_ti_window_counter + "): "
			+ new Date() + "\n\n";
	msg = msg + "Stopped Existing Relative Timer:" + "\n";
	msg = msg + "Timer ID = " + xpunge_ti_timerIntervalID + "\n";
	msg = msg + "Timer Interval = " + (xpunge_ti_timerInterval/xpunge_ti_MILLISECONDS_IN_ONE_MINUTE)
			+ " minutes" + "\n";

	window.clearInterval(xpunge_ti_timerIntervalID);
	xpunge_ti_timerIntervalID = null;
	xpunge_ti_timerInterval = -1;

	xpunge_ti_consoleService.logStringMessage(msg);
}

function xpunge_ti_setupTimerLoop() {
	var msg = "xpunge - xpunge_ti_setupTimerLoop (on Window #" + xpunge_ti_window_counter + "): "
			+ new Date() + "\n\n";

	xpunge_ti_timerInterval = xpunge_ti_definedInterval;
	xpunge_ti_timerIntervalID = window.setInterval(function() { xpunge_ti_timerLoop(); }, xpunge_ti_timerInterval);

	msg = msg + "Started New Relative Timer:" + "\n";
	msg = msg + "Timer ID = " + xpunge_ti_timerIntervalID + "\n";
	msg = msg + "Timer Interval = " + (xpunge_ti_timerInterval/xpunge_ti_MILLISECONDS_IN_ONE_MINUTE)
			+ " minutes" + "\n";

	xpunge_ti_consoleService.logStringMessage(msg);
}

function xpunge_ti_timerLoop() {
	var msg = "xpunge - xpunge_ti_timerLoop (on Window #" + xpunge_ti_window_counter + "): " + new Date()
			+ "\n\n";
	msg = msg + "Doing Relative Timer Expunction:" + "\n";
	msg = msg + "Timer ID = " + xpunge_ti_timerIntervalID + "\n";
	msg = msg + "Timer Interval = " + (xpunge_ti_timerInterval/xpunge_ti_MILLISECONDS_IN_ONE_MINUTE)
			+ " minutes" + "\n";

	xpunge_ti_consoleService.logStringMessage(msg);

	xpunge_doTimer();
}

function xpunge_doTimer() {
	var msg = "xpunge - xpunge_doTimer (on Window #" + xpunge_ti_window_counter + "): " + new Date() + "\n\n";

	if (!messenger) {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
				+ "ERROR - No Messenger Object!" + "\n");

		return;
	}

	msg = msg + xpunge_ti_processJunk();

	msg = msg + xpunge_ti_processTrash();

	msg = msg + xpunge_ti_processCompact();

	xpunge_ti_consoleService.logStringMessage(msg);
}

function xpunge_ti_processTrash() {
	var xpunge_ti_TrashSeparatorRegExp = /   /;

	var returnedMsg = "";

	var pref_trash = xpunge_ti_prefBranch.getCharPref("extensions.xpunge.timer.trash.accounts");

	if (pref_trash !== "") {
		var trash_array = pref_trash.split(xpunge_ti_TrashSeparatorRegExp);

		for (var i = 0; i < trash_array.length; i++) {
			if (trash_array[i] === "") {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "ERROR - Empty Trash Account Entry: Index = " + i + "\n");

				continue;
			}

			var msgfolder = xpunge_GetMsgFolderFromUri(trash_array[i], true);

			if (!msgfolder) {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "ERROR - Invalid Trash Account: " + trash_array[i] + "\n");

				continue;
			}

			if (!msgfolder.isServer) {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "ERROR - Trash Account Is Not A Server: " + trash_array[i] + "\n");

				continue;
			}

			if (msgfolder.name === "") {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "WARNING - Trash Account Has No Name: " + trash_array[i] + "\n");

				continue;
			}

			try {
				if (xpunge_canEmptyTrashTimer(msgfolder)) {
					returnedMsg = returnedMsg + "Emptying Trash For Account: " + msgfolder.prettyName + "\n";

					getFolderPaneInherited().emptyTrash(msgfolder);
				}
			} catch (e) {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer EXCEPTION 1 ["
						+ new Date() + "]: " + "\n\n" + trash_array[i] + "\n\n" + e + "\n");
			}
		}
	}

	return returnedMsg;
}

function xpunge_ti_processJunk() {
	var xpunge_ti_JunkSeparatorRegExp = /   /;

	var returnedMsg = "";

	var pref_junk = xpunge_ti_prefBranch.getCharPref("extensions.xpunge.timer.junk.accounts");

	if (pref_junk !== "") {
		var junk_array = pref_junk.split(xpunge_ti_JunkSeparatorRegExp);

		for (var i = 0; i < junk_array.length; i++) {
			if (junk_array[i] === "") {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "ERROR - Empty Junk Account Entry: Index = " + i + "\n");

				continue;
			}

			var msgfolder = xpunge_GetMsgFolderFromUri(junk_array[i], true);

			if (!msgfolder) {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "ERROR - Invalid Junk Account: " + junk_array[i] + "\n");

				continue;
			}

			if (!msgfolder.isServer) {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "ERROR - Junk Account Is Not A Server: " + junk_array[i] + "\n");

				continue;
			}

			if (msgfolder.name === "") {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "WARNING - Junk Account Has No Name: " + junk_array[i] + "\n");

				continue;
			}

			try {
				if (xpunge_canEmptyJunkTimer(msgfolder)) {
					returnedMsg = returnedMsg + xpunge_emptyJunkTimer(msgfolder);
				}
			} catch (e) {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer EXCEPTION 2 ["
						+ new Date() + "]: " + "\n\n" + junk_array[i] + "\n\n" + e + "\n");
			}
		}
	}

	return returnedMsg;
}

function xpunge_emptyJunkTimer(folder) {
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
				getFolderPaneInherited().emptyJunk(junkFolder);
			} else {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer: " + new Date() + "\n\n"
						+ "Avoiding To Empty Already " 
						+ "Empty Junk Folder (" + junkFolder.prettyName + ") For Account: " 
						+ folder.prettyName + "\n");
			}
		} catch (e) {
			xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer EXCEPTION 4 [" + new Date()
					+ "]:" + "\n\nJunk Folder: " + junkFolder.URI + "\n\n" + e + "\n");
		}
	}

	return returnedMsg;
}

function xpunge_ti_processCompact() {
	var xpunge_ti_CompactSeparatorRegExp = /   /;

	var returnedMsg = "";

	var pref_compact = xpunge_ti_prefBranch.getCharPref("extensions.xpunge.timer.compact.accounts");

	if (pref_compact !== "") {
		var compact_array = pref_compact.split(xpunge_ti_CompactSeparatorRegExp);

		for (var i = 0; i < compact_array.length; i++) {
			if (compact_array[i] === "") {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "ERROR - Empty Compact Account/Folder Entry: Index = " + i + "\n");

				continue;
			}

			var msgfolder = xpunge_GetMsgFolderFromUri(compact_array[i], true);

			if (!msgfolder) {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "ERROR - Invalid Compact Account/Folder: " + compact_array[i] + "\n");

				continue;
			}

			if (msgfolder.name === "") {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer:" + "\n\n"
						+ "WARNING - Compact Account/Folder Has No Name: " + compact_array[i] + "\n");

				continue;
			}

			try {
				if (xpunge_canCompactFoldersTimer(msgfolder)) {
					if (msgfolder.isServer) {
						returnedMsg = returnedMsg + "Compacting All Folders For Account: "
								+ msgfolder.prettyName + "\n";

						getFolderPaneInherited().compactAllFoldersForAccount(msgfolder);
					} else {
						returnedMsg = returnedMsg + "Compacting Folder (" + msgfolder.name + ") on "
								+ msgfolder.server.prettyName + "\n";

						getFolderPaneInherited().compactFolder(msgfolder);
					}
				}
			} catch (e) {
				xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_doTimer EXCEPTION 3 ["
						+ new Date() + "]: " + "\n\n" + compact_array[i] + "\n\n" + e + "\n");
			}
		}
	}

	return returnedMsg;
}

function xpunge_canEmptyJunkTimer(folder) {
	var server = folder.server;

	if (!server) {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkTimer:" + "\n\n"
				+ "ERROR - Invalid Server Property: " + folder.URI + "\n");

		return false;
	}

	var serverType = server.type;

	if (serverType == "nntp") {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkTimer:" + "\n\n"
				+ "WARNING - Cannot Empty Junk On An NNTP Server: " + folder.URI + "\n");

		return false;
	} else if (serverType == "imap") {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

		if (ioService.offline) {
			xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canEmptyJunkTimer:" + "\n\n"
					+ "WARNING - Cannot Empty Junk On An IMAP Server While Being Offline: " + folder.URI
					+ "\n");

			return false;
		}

		return true;
	} else {
		return true;
	}
}

function xpunge_canEmptyTrashTimer(folder) {
	var server = folder.server;

	if (!server) {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashTimer:" + "\n\n"
				+ "ERROR - Invalid Server Property: " + folder.URI + "\n");

		return false;
	}

	var serverType = server.type;

	if (serverType == "nntp") {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashTimer:" + "\n\n"
				+ "WARNING - Cannot Empty Trash On An NNTP Server: " + folder.URI + "\n");

		return false;
	} else if (serverType == "imap") {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

		if (ioService.offline) {
			xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canEmptyTrashTimer:" + "\n\n"
					+ "WARNING - Cannot Empty Trash On An IMAP Server While Being Offline: " + folder.URI
					+ "\n");

			return false;
		}

		return true;
	} else {
		return true;
	}
}

function xpunge_canCompactFoldersTimer(folder) {
	var server = folder.server;

	if (!server) {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersTimer:" + "\n\n"
				+ "ERROR - Invalid Server Property: " + folder.URI + "\n");

		return false;
	}

	if (folder.isServer) {
		if (!server.canCompactFoldersOnServer) {
			xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersTimer:" + "\n\n"
					+ "ERROR - Compacting Folders Not Allowed On Server: " + folder.URI + "\n");

			return false;
		}
	} else {
		if (!folder.canCompact) {
			xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersTimer:" + "\n\n"
					+ "ERROR - Compacting Folder Not Allowed: " + folder.URI + "\n");

			return false;
		}
	}

	var serverType = server.type;

	if (serverType == "imap") {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

		if (ioService.offline) {
			xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_canCompactFoldersTimer:" + "\n\n"
					+ "WARNING - Cannot Compact Folders On An IMAP Server While Being Offline: " + folder.URI
					+ "\n");

			return false;
		}

		return true;
	} else {
		return true;
	}
}

function xpunge_ti_checkStartupInterval(interval_str) {
	if (interval_str.length <= 0) {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_ti_checkStartupInterval:" + "\n\n"
				+ "WARNING - Empty startup timer interval preference: " + interval_str + "\n");

		return false;
	}

	if (interval_str.search(/[^0-9]/) != -1) {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_ti_checkStartupInterval:" + "\n\n"
				+ "WARNING - Invalid startup timer interval preference: " + interval_str + "\n");

		return false;
	}

	return true;
}

function xpunge_ti_checkLoopInterval(interval_str) {
	if (interval_str.length <= 0) {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_ti_checkLoopInterval:" + "\n\n"
				+ "WARNING - Empty loop timer interval preference: " + interval_str + "\n");

		return false;
	}

	if (interval_str.search(/[^0-9]/) != -1) {
		xpunge_ti_consoleService.logStringMessage("xpunge - xpunge_ti_checkLoopInterval:" + "\n\n"
				+ "WARNING - Invalid loop timer interval preference: " + interval_str + "\n");

		return false;
	}

	return true;
}

function xpunge_ti_doMenuActionDisableRelative(elem) {
	var msg = "xpunge - xpunge_ti_doMenuActionDisableRelative (on Window #" + xpunge_ti_window_counter
			+ "): " + new Date() + "\n\n";

	if (elem.getAttribute("checked") != "true") {
		msg = msg + "Relative Timer Disable Menu Deselected." + "\n";

		xpunge_ti_consoleService.logStringMessage(msg);

		return;
	} else {
		msg = msg + "Relative Timer Disable Menu Selected." + "\n";
	}

	if (xpunge_ti_timerIntervalID !== null) {
		msg = msg + "Stopping Existing Relative Timer ..." + "\n";

		xpunge_ti_consoleService.logStringMessage(msg);

		xpunge_ti_clearTimerLoop();
	} else {
		msg = msg + "No Existing Relative Timer To Stop." + "\n";

		xpunge_ti_consoleService.logStringMessage(msg);
	}
}

function xpunge_ti_doMenuActionDisableAbsolute(elem) {
	var msg = "xpunge - xpunge_ti_doMenuActionDisableAbsolute (on Window #" + xpunge_ti_window_counter
			+ "): " + new Date() + "\n\n";

	if (elem.getAttribute("checked") != "true") {
		msg = msg + "Absolute Timer Disable Menu Deselected." + "\n";

		xpunge_ti_consoleService.logStringMessage(msg);

		return;
	} else {
		msg = msg + "Absolute Timer Disable Menu Selected." + "\n";
	}

	xpunge_ti_consoleService.logStringMessage(msg);
}

function xpunge_ti_isRelativeTimerDisabledFromMenu() {
	var msg = "xpunge - xpunge_ti_isRelativeTimerDisabledFromMenu (on Window #" + xpunge_ti_window_counter
			+ "): " + new Date() + "\n\n";

	var disable_menu_item = document.getElementById("xpunge_timer_relative_disable_menuitem");

	if (disable_menu_item.getAttribute("checked") == "true") {
		msg = msg + "Relative Timer Disabled From Menu." + "\n";

		if (xpunge_ti_timerIntervalID !== null) {
			msg = msg + "WARNING: RELATIVE TIMER STILL RUNNING!!!" + "\n";

			msg = msg + "Stopping Existing Relative Timer ..." + "\n";

			xpunge_ti_consoleService.logStringMessage(msg);

			xpunge_ti_clearTimerLoop();
		}

		return true;
	} else {
		return false;
	}
}

function xpunge_ti_isAbsoluteTimerDisabledFromMenu() {
	var disable_menu_item = document.getElementById("xpunge_timer_absolute_disable_menuitem");

	if (disable_menu_item.getAttribute("checked") == "true") {
		return true;
	} else {
		return false;
	}
}
