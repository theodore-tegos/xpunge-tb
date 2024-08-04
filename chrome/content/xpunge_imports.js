var xpunge_imports_Scope = ChromeUtils.import("resource:///modules/MailUtils.jsm");

function xpunge_GetMsgFolderFromUri(uri, checkFolderAttributes) {
	return xpunge_imports_Scope.MailUtils.getExistingFolder(uri, checkFolderAttributes);
}

function getFolderPaneInherited() {
  return gTabmail.tabInfo[0].chromeBrowser.contentWindow.folderPane;
}

function getFolderPaneFromWindow(aWindow) {
  return aWindow.gTabmail.tabInfo[0].chromeBrowser.contentWindow.folderPane;
}

