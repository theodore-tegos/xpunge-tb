// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var xpunge_messenger_consoleService = Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService);

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://xpunge/content/xpunge_imports.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://xpunge/content/xpunge_options_Migrator.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://xpunge/content/xpunge_Messenger_Single.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://xpunge/content/xpunge_Messenger_Multi.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://xpunge/content/xpunge_Messenger_Timer.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
  xpunge_messenger_consoleService.logStringMessage("xpunge - messenger - onLoad - activatedWhileWindowOpen: " + activatedWhileWindowOpen);

  // Inject a XUL fragment (providing the needed DTD files as well)
  // using the injectElements helper function. The added elements
  // will be automatically removed on window unload.
  WL.injectElements(`
    <menupopup id="taskPopup">
      <menu id="xpunge_menu" insertbefore="filtersCmd" label="&xpunge.menu.name;">
        <menupopup id="xpunge_menupopup">
          <menu id="xpunge_menu_single" label="&xpunge.menu.single.name;">
            <menupopup id="xpunge_single_menupopup">
              <menuitem id="xpunge_single_disable_menuitem"
                label="&xpunge.menu.single.call.label;"
                oncommand="xpunge_si_doMenuActionCall(this)"/>
            </menupopup>
          </menu>
          <menu id="xpunge_menu_multi" label="&xpunge.menu.multi.name;">
            <menupopup id="xpunge_multi_menupopup">
              <menuitem id="xpunge_multi_disable_menuitem"
                label="&xpunge.menu.multi.call.label;"
                oncommand="xpunge_mu_doMenuActionCall(this)"/>
            </menupopup>
          </menu>
          <menu id="xpunge_menu_timer" label="&xpunge.menu.timer.name;">
            <menupopup id="xpunge_timer_menupopup">
              <menuitem id="xpunge_timer_relative_disable_menuitem"
                label="&xpunge.menu.timer.relative.disable.label;"
                oncommand="xpunge_ti_doMenuActionDisableRelative(this)"
                type="checkbox"/>
              <menuitem id="xpunge_timer_absolute_disable_menuitem"
                label="&xpunge.menu.timer.absolute.disable.label;"
                oncommand="xpunge_ti_doMenuActionDisableAbsolute(this)"
                type="checkbox"/>
            </menupopup>
          </menu>
        </menupopup>
      </menu>

      <menuseparator insertbefore="filtersCmd"/>
    </menupopup>
  `, ["chrome://xpunge/locale/xpunge.dtd"]);

  // Add a CSS file using the injectCSS helper function. The added CSS
  // will be automatically removed on window unload.
  WL.injectCSS("chrome://xpunge/content/skin/xpunge.css");

  // There seems to be a bug in TB 78.1.1 where when Thunderbird is started, activatedWhileWindowOpen is true
  window.xpunge_ti_onWindowLoad(activatedWhileWindowOpen);
}

function onUnload(deactivatedWhileWindowOpen) {
  xpunge_messenger_consoleService.logStringMessage("xpunge - messenger - onUnload - deactivatedWhileWindowOpen: " + deactivatedWhileWindowOpen);

  window.xpunge_ti_onWindowUnLoad(deactivatedWhileWindowOpen);

  // Cleaning up the window UI is only needed when the
  // add-on is being deactivated/removed while the window
  // is still open. It can be skipped otherwise.
}

