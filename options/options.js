
import { i18n } from "../modules/i18n.mjs";
import { getPreference, setPreference } from "../modules/preferences.mjs";
import { registerMailFolderPicker } from "../modules/folderPicker.mjs";

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function addOption(prefix, info) {
    const accountsList = $(`#xpunge_${prefix}_compact_accounts`);
    if (accountsList.querySelector(`[value='${info.folderId}']`)) {
        return;
    }
    const option = document.createElement("option");
    const whole_message = browser.i18n.getMessage(`xpunge_${prefix}_str_compact_whole`);
    const whole = info.level == 0 ? ` ${whole_message}` : ""

    option.value = info.folderId;
    option.textContent = `${info.path}${whole}`
    accountsList.appendChild(option);
}

function updateCompactButtons(prefix) {
    const accountsList = $(`#xpunge_${prefix}_compact_accounts`);
    $(`#xpunge_${prefix}_compact_remove`).disabled = 
        accountsList.length == 0 ||
        !$(`#xpunge_${prefix}_compact_accounts option:checked`);
    $(`#xpunge_${prefix}_compact_remove_all`).disabled = accountsList.length == 0;
}

function tabListClickHandler(elem) {
    let target = elem.target;
    if (target.parentNode.id != 'tabList') return false;

    let selectedTab = document.querySelector('[aria-selected="true"]');
    selectedTab.setAttribute('aria-selected', false);
    target.setAttribute('aria-selected', true);

    let panels = document.querySelector('[aria-hidden="false"]');
    panels.setAttribute('aria-hidden', true);

    let panelId = target.getAttribute('aria-controls'),
        panel = document.getElementById(panelId);
    panel.setAttribute('aria-hidden', false);
}

async function saveTrash(prefix) {
    const trash = [];
    $$(`[data-${prefix}-trash-id]`).forEach(element => {
        if (element.checked) {
            trash.push(element.getAttribute(`data-${prefix}-trash-id`));
        }
    })
    await setPreference(`${prefix}_trash_accounts`, trash);
}
async function saveJunk(prefix) {
    const junk = [];
    $$(`[data-${prefix}-junk-id]`).forEach(element => {
        if (element.checked) {
            junk.push(element.getAttribute(`data-${prefix}-junk-id`));
        }
    })
    await setPreference(`${prefix}_junk_accounts`, junk);
}
async function saveCompact(prefix) {
    const compact = [];
    $$(`#xpunge_${prefix}_compact_accounts option`).forEach(element => {
        compact.push(element.getAttribute(`value`));
    });
    await setPreference(`${prefix}_compact_folders`, compact);
}

async function loadPref(prefElement) {
    let type = prefElement.dataset.type || prefElement.getAttribute('type') || prefElement.tagName;
    let name = prefElement.dataset.preference;
    
    if (["multi_junk_trash_tree","timer_junk_trash_tree"].includes(name)) {
        let prefix = name.split("_")[0];
        let trash_folders = await getPreference(`${prefix}_trash_accounts`);
        
        $$(`[data-${prefix}-trash-id]`).forEach(element => {
            if (trash_folders.find(f => f.id == element.getAttribute(`data-${prefix}-trash-id`))) {
                element.checked = true;
            }
        })
        let junk_folders = await getPreference(`${prefix}_junk_accounts`);
        $$(`[data-${prefix}-junk-id]`).forEach(element => {
            if (junk_folders.find(f => f.id == element.getAttribute(`data-${prefix}-junk-id`))) {
                element.checked = true;
            }
        })
        return;
    }

    let value = await getPreference(name);

    if (["multi_compact_folders", "timer_compact_folders"].includes(name)) {
        let prefix = name.split("_")[0];

        for (let folder of value) {
            try {
                let account = await browser.accounts.get(folder.accountId);

                let path = (await browser.folders.getParentFolders(folder.id))
                    .filter(f => !f.isRoot).map(f => f.name);

                path.push(account.name);
                path.reverse();
                if (!folder.isRoot) {
                    path.push(folder.name);
                }

                let info = {
                    folderId: folder.id,
                    level: path.length - 1,
                    path: path.join(" / "),
                };

                addOption(prefix, info);
                updateCompactButtons(prefix);
            } catch (e) {
                let entry = folder.accountId;
                let functionality = name === "multi_compact_folders" ? "MultiXpunge" : "Timer";
                console.warn(`XPUNGE: An error occurred while loading account/folder to compact (${entry}) for ${functionality} preferences: ${e.message}`);
            }
        }

        return;
    }

    switch (type.toLowerCase()) {
        case 'checkbox':
            prefElement.checked = value;
            prefElement.addEventListener('change', () => savePref(prefElement));
            break;
        case 'time':
        case 'text':
            prefElement.value = value;
            prefElement.addEventListener('change', () => savePref(prefElement));
            break;
    }
}

async function savePref(prefElement) {
    let type = prefElement.dataset.type || prefElement.getAttribute('type') || prefElement.tagName;
    let name = prefElement.dataset.preference;
    switch (type.toLowerCase()) {
        case 'checkbox':
            setPreference(name, !!prefElement.checked);
            break;
        case 'time':
        case 'text':
            setPreference(name, prefElement.value);
            break;
    }
}

async function init() {
    registerMailFolderPicker();

    // Replace locale strings.
    i18n.updateDocument();
    
    const accounts = await browser.accounts.list(false);
    const elementEventMap = {
        tabList: { type: 'click', callback: tabListClickHandler },
    }

    for (let [elementId, eventData] of Object.entries(elementEventMap)) {
        document.getElementById(elementId).addEventListener(eventData.type, eventData.callback);
    }

    // Init multi-xpunge-tab and timer-expunge-tab.
    for (let prefix of ["multi", "timer"]) {
        // Init elements for junk and trash.
        for (let account of accounts) {
            $(`#xpunge_${prefix}_tree`).insertAdjacentHTML(
                "beforeend", `
                <tr>
                    <td>${account.name}</td>
                    <td class="tree_checkbox"><input type="checkbox" data-${prefix}-trash-id="${account.rootFolder.id}"/></td>
                    <td class="tree_checkbox"><input type="checkbox" data-${prefix}-junk-id="${account.rootFolder.id}"/></td>
                </tr>`);
        }

        // Init buttons and events for junk and trash.
        $(`#xpunge_${prefix}_trash_add_all`).addEventListener("click", () => {
            $$(`[data-${prefix}-trash-id]`).forEach(element => element.checked = true)
            saveTrash(prefix);
        })
        $(`#xpunge_${prefix}_trash_remove_all`).addEventListener("click", () => {
            $$(`[data-${prefix}-trash-id]`).forEach(element => element.checked = false)
            saveTrash(prefix);
        })
        $(`#xpunge_${prefix}_junk_add_all`).addEventListener("click", () => {
            $$(`[data-${prefix}-junk-id]`).forEach(element => element.checked = true)
            saveJunk(prefix);
        })
        $(`#xpunge_${prefix}_junk_remove_all`).addEventListener("click", () => {
            $$(`[data-${prefix}-junk-id]`).forEach(element => element.checked = false)
            saveJunk(prefix);
        })
        $$(`[data-${prefix}-junk-id]`).forEach(element => {
            element.addEventListener("click", () => saveJunk(prefix))
        })
        $$(`[data-${prefix}-trash-id]`).forEach(element => {
            element.addEventListener("click", () => saveTrash(prefix))
        })

        // Init buttons and events for compact.
        $(`#xpunge_${prefix}_compact_add`).addEventListener("click", () => {
            let info = $(`#xpunge_${prefix}_mail_folder_picker`).selectedFolderInfo;
            addOption(prefix, info);
            updateCompactButtons(prefix);
            saveCompact(prefix);
        });
        $(`#xpunge_${prefix}_compact_add_all`).addEventListener("click", () => {
            for (let account of accounts) {
                const info = {
                    level: 0,
                    folderId: account.rootFolder.id,
                    path: account.name,
                }
                addOption(prefix, info);
            }
            updateCompactButtons(prefix);
            saveCompact(prefix);
        });
        $(`#xpunge_${prefix}_compact_remove`).addEventListener("click", () => {
            $(`#xpunge_${prefix}_compact_accounts option:checked`).remove();
            updateCompactButtons(prefix);
            saveCompact(prefix);
        });
        $(`#xpunge_${prefix}_compact_remove_all`).addEventListener("click", () => {
            $$(`#xpunge_${prefix}_compact_accounts option`).forEach(
                element => element.remove()
            );
            updateCompactButtons(prefix);
            saveCompact(prefix);
        });

        $(`#xpunge_${prefix}_mail_folder_picker`).addEventListener("change", () => {
            $(`#xpunge_${prefix}_compact_add`).disabled = false;
        });
        $(`#xpunge_${prefix}_compact_accounts`).addEventListener("change", () => {
            updateCompactButtons(prefix)
        });
    }

    // Load preferences and attach onchange listeners for auto save.
    let prefElements = $$('*[data-preference]');
    for (let prefElement of prefElements) {
        await loadPref(prefElement);
    }

}

window.addEventListener('load', init);
