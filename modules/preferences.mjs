const DEFAULTS = {
    empty_trash: true,
    empty_junk: false,
    compact_folders: true,
    multi_trash_accounts: "",
    multi_junk_accounts: "",
    multi_compact_folders: "",
    timer_trash_accounts: "",
    timer_junk_accounts: "",
    timer_compact_folders: "",
    timer_interval_enabled: false,
    timer_interval_startup: "0",
    timer_interval_loop: "0",
    timer_absolute_enabled: false,
    timer_absolute: "00:00",
    confirm_single_action: false,
    confirm_multi_action: false,
}

export async function getAllPreferences() {
    const preferences = {}
    for (let name of Object.keys(DEFAULTS)) {
        preferences[name] = await getPreference(name);
    }
    return preferences;
}

export async function getPreference(name) {
    let rv = await browser.storage.local.get({ [`preferences_${name}`]: DEFAULTS[name] });
    let value = rv[`preferences_${name}`];

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
        // For convinience, we return the full folder object and ignore folders
        // which no longer exists.
        let folders = [];
        for (let id of value) {
            let folder = await browser.folders.get(id);
            if (folder) {
                folders.push(folder);
            }
        }
        return folders;
    }
    return value;
}

export async function setPreference(name, value) {
    return browser.storage.local.set({ [`preferences_${name}`]: value });
}