import { migratePrefs } from "./modules/migration.mjs";
import { createMenuEntries } from "./modules/menus.mjs";
import { 
  xpungeMultiple,
  handleXpungeTimer
} from "./modules/xpunge.mjs";

/* Migrate Prefs from the legacy preference tree to local storage */
await migratePrefs();

/* Menu entries
 * ------------
 * Add entries to the tools menu and to the folder pane context menu.
 */
await createMenuEntries();

/* Timer
 * -----
 * We use a default timer to check every minute if something needs to be done.
 */
browser.alarms.create("xpunge", {
  periodInMinutes: 1,
});
browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name == "xpunge") {
    handleXpungeTimer();
  }
})
// Reset timer related values on startup.
await browser.storage.local.set({
  startup: Date.now(),
  lastTimerRun: 0,
})

/* Browser Action
 * --------------
 * Add a browser action for the multi expunge action to the unified toolbar.
 */
browser.browserAction.onClicked.addListener(() => {
  xpungeMultiple();
});
