import {
  xpungeMultiple,
  xpungeAccount
} from "./xpunge.mjs";

import { getPreference, setPreference } from "./preferences.mjs";

export async function createMenuEntries() {
  // Top level tools menu entries.
  browser.menus.create({
    id: "xpunge.menu.single.name",
    contexts: ["tools_menu"],
    title: browser.i18n.getMessage("xpunge.menu.single.name"),
  });
  browser.menus.create({
    id: "xpunge.menu.multi.name",
    contexts: ["tools_menu"],
    title: browser.i18n.getMessage("xpunge.menu.multi.name"),
  });
  browser.menus.create({
    id: "xpunge.menu.timer.name",
    contexts: ["tools_menu"],
    title: browser.i18n.getMessage("xpunge.menu.timer.name"),
  });

  // Sub level tools menu entries.
  browser.menus.create({
    parentId: "xpunge.menu.single.name",
    contexts: ["tools_menu"],
    title: browser.i18n.getMessage("xpunge.menu.single.call.label"),
    onclick: async (info, tab) => {
      let selectedFolders = await browser.mailTabs.getSelectedFolders();
      if (
        selectedFolders.length == 1 &&
        selectedFolders[0].isRoot
      ) {
        await xpungeAccount(selectedFolders[0]);
      } else {
        console.info("XPUNGE: Only applicable for a single root folder:", selectedFolders);
      }
    },
  });
  browser.menus.create({
    parentId: "xpunge.menu.multi.name",
    contexts: ["tools_menu"],
    title: browser.i18n.getMessage("xpunge.menu.multi.call.label"),
    onclick: () => xpungeMultiple(),
  });
  browser.menus.create({
    id: "xpunge.menu.timer.auto.check",
    parentId: "xpunge.menu.timer.name",
    contexts: ["tools_menu"],
    type: "checkbox",
    checked: !(await getPreference("timer_interval_enabled")),
    title: browser.i18n.getMessage("xpunge.menu.timer.relative.disable.label"),
    onclick: (info) => {
      setPreference("timer_interval_enabled", !info.checked);
    }
  });
  browser.menus.create({
    id: "xpunge.menu.timer.auto.absolute.check",
    parentId: "xpunge.menu.timer.name",
    contexts: ["tools_menu"],
    type: "checkbox",
    checked: !(await getPreference("timer_absolute_enabled")),
    title: browser.i18n.getMessage("xpunge.menu.timer.absolute.disable.label"),
    onclick: (info) => {
      setPreference("timer_absolute_enabled", !info.checked);
    }
  });


  // Folder pane context menu.
  browser.menus.create({
    id: "folder_pane_xpunge_menu_entry",
    contexts: ["folder_pane"],
    title: browser.i18n.getMessage("xpunge.menu.single.call.label"),
    visible: false,
    onclick: async (info, tab) => {
      if (
        info.selectedFolders.length == 1 &&
        info.selectedFolders[0].isRoot
      ) {
        await xpungeAccount(info.selectedFolders[0]);
      } else {
        console.info("XPUNGE: Only applicable for a single root folder:", info.selectedFolders);
      }
    },
  });
  browser.menus.onShown.addListener(async (info, tab) => {
    // If the folder_pane context menu shown for a root folder, enforce visibility
    // of the folder_pane_xpunge_menu_entry.
    if (info.contexts.includes("folder_pane")) {
      const visible =
        info.selectedFolders.length == 1 &&
        info.selectedFolders[0].isRoot;
      if (visible != info.menuIds.includes("folder_pane_xpunge_menu_entry")) {
        await browser.menus.update("folder_pane_xpunge_menu_entry", { visible });
        await browser.menus.refresh();
        await browser.menus.update("folder_pane_xpunge_menu_entry", { visible: false });
      }
    }
  })


  // Register a storage change listener, to be able to update the checked status
  // of the timer menu entries.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area != "local") {
      return;
    }

    for (const [name, change] of Object.entries(changes)) {
      switch (name) {
        case "preferences.timer_interval_enabled":
          browser.menus.update(
            "xpunge.menu.timer.auto.check", {
            checked: !change.newValue
          });
          break;
        case "preferences.timer_absolute_enabled":
          browser.menus.update(
            "xpunge.menu.timer.auto.absolute.check", {
            checked: !change.newValue
          });
          break;
      }
    }
  });
}