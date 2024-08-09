const SEPARATOR = "   ";

const LEGACY_PREF_NAMES = {
    empty_trash: "extensions.xpunge.single.trash",
    empty_junk: "extensions.xpunge.single.junk",
    compact_folders: "extensions.xpunge.single.compact",
    multi_trash_accounts: "extensions.xpunge.multi.trash.accounts",
    multi_junk_accounts: "extensions.xpunge.multi.junk.accounts",
    multi_compact_folders: "extensions.xpunge.multi.compact.accounts",
    timer_trash_accounts: "extensions.xpunge.timer.trash.accounts",
    timer_junk_accounts: "extensions.xpunge.timer.junk.accounts",
    timer_compact_folders: "extensions.xpunge.timer.compact.accounts",
    timer_interval_enabled: "extensions.xpunge.timer.auto.check",
    timer_interval_startup: "extensions.xpunge.timer.auto.startup",
    timer_interval_loop: "extensions.xpunge.timer.auto.loop",
    timer_absolute_enabled: "extensions.xpunge.timer.auto.absolute.check",
    timer_absolute_hours: "extensions.xpunge.timer.auto.absolute.hours",
    timer_absolute_minutes: "extensions.xpunge.timer.auto.absolute.minutes",
    confirm_single_action: "extensions.xpunge.settings.single.confirm",
    confirm_multi_action: "extensions.xpunge.settings.multi.confirm",
}

export async function migratePrefs() {
    const options = {}
    for (let name of Object.keys(LEGACY_PREF_NAMES)) {
        let value = await getLegacyPreference(name);
        if (value) {
            console.info(`XPUNGE: Migrating legacy preference ${LEGACY_PREF_NAMES[name]} to local storage.`);
            options[`preferences_${name}`] = value;
            await browser.LegacyPrefsMigrator.clearUserPref(LEGACY_PREF_NAMES[name]);
        }
        
    }

    // Merge timer_absolute_hours and timer_absolute_minutes (if needed).
    if (
        Object.hasOwn(options, "preferences_timer_absolute_hours") ||
        Object.hasOwn(options, "preferences_timer_absolute_minutes")
    ) {
        let hours = options.preferences_timer_absolute_hours ?? "00";
        let minutes = options.preferences_timer_absolute_minutes ?? "00";
        options.preferences_timer_absolute = `${hours}:${minutes}`;
        delete options.preferences_timer_absolute_hours;
        delete options.preferences_timer_absolute_minutes;
    }

    if (Object.keys(options).length) {
        await browser.storage.local.set(options);
    }
}

async function getLegacyPreference(name) {
    let rv = await browser.LegacyPrefsMigrator.getUserPref(LEGACY_PREF_NAMES[name]);
    if (rv) {
        // Folders were  stored as legacy urls, and are now stored as an array of MailFolderIds
        if (
            [
                "multi_trash_accounts",
                "multi_junk_accounts",
                "multi_compact_folders",
                "timer_trash_accounts",
                "timer_junk_accounts",
                "timer_compact_folders",
            ].includes(name)
        ) {
            const folders = []
            const urls = rv.split(SEPARATOR);
            for (let url of urls) {
                let folder = await browser.LegacyPrefsMigrator.getFolderForUrl(url);
                if (folder) {
                    folders.push(folder.id);
                }
            }
            return folders
        }
        return rv;
    }
}
