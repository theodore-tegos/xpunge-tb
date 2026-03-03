var { FolderUtils } = ChromeUtils.importESModule(
  "resource:///modules/FolderUtils.sys.mjs"
);

// Error code returned by TB when a folder has pending IMAP offline operations
// and cannot be compacted right now (NS_MSG_ERROR_BLOCKED_COMPACTION = 0x80550025).
const NS_MSG_ERROR_BLOCKED_COMPACTION = 0x80550025;

// Maximum number of times to retry a blocked compaction, and the timeout (ms)
// to wait for the OfflineEvents flag to be cleared before giving up.
const COMPACT_RETRY_LIMIT = 5;
const COMPACT_BLOCKED_TIMEOUT_MS = 60_000;

class UrlListener {
  constructor() {
    this.PromiseWithResolvers = Promise.withResolvers();
  }
  OnStartRunningUrl() {}
  OnStopRunningUrl(url, exitCode) {
    if (Components.isSuccessCode(exitCode)) {
      this.PromiseWithResolvers.resolve();
    } else {
      // Pass exitCode so callers can distinguish error types.
      this.PromiseWithResolvers.reject(exitCode);
    }
  }
  isDone() {
    return this.PromiseWithResolvers.promise;
  }
}

/**
 * Wait until the OfflineEvents flag is cleared on `folder`, meaning all
 * pending IMAP operations have been synced and the folder is safe to compact.
 * Resolves when the flag is cleared, or rejects after COMPACT_BLOCKED_TIMEOUT_MS.
 *
 * @param {nsIMsgFolder} folder
 * @returns {Promise<void>}
 */
function waitForOfflineEventsClear(folder) {
  return new Promise((resolve, reject) => {
    // If already clear, resolve immediately.
    if (!(folder.flags & Ci.nsMsgFolderFlags.OfflineEvents)) {
      resolve();
      return;
    }

    const timer = ChromeUtils.idleDispatch(() => {
      // Fallback: clean up and reject if we never saw the flag clear.
      MailServices.mailSession.RemoveFolderListener(listener);
      reject(new Error("Timed out waiting for OfflineEvents flag to clear"));
    }, { timeout: COMPACT_BLOCKED_TIMEOUT_MS });

    // Partially implements nsIFolderListener — only the method we need.
    var listener = {
      onFolderIntPropertyChanged(item, property, oldValue, newValue) {
        if (
          property == "FolderFlag" &&
          item instanceof Ci.nsIMsgFolder &&
          item == folder &&
          (oldValue & Ci.nsMsgFolderFlags.OfflineEvents) &&
          !(newValue & Ci.nsMsgFolderFlags.OfflineEvents)
        ) {
          MailServices.mailSession.RemoveFolderListener(listener);
          resolve();
        }
      },
    };

    MailServices.mailSession.AddFolderListener(
      listener,
      Ci.nsIFolderListener.intPropertyChanged
    );
  });
}

/**
 * Compact a single folder, retrying automatically if the folder has pending
 * IMAP offline operations (NS_MSG_ERROR_BLOCKED_COMPACTION).
 *
 * @param {nsIMsgFolder} folder
 * @param {boolean} all  true → compactAll (root folder), false → compact
 * @returns {Promise<void>}
 */
async function compactWithRetry(folder, all) {
  for (let attempt = 1; attempt <= COMPACT_RETRY_LIMIT; attempt++) {
    try {
      let urlListener = new UrlListener();
      if (all) {
        folder.compactAll(urlListener, null);
      } else {
        folder.compact(urlListener, null);
      }
      await urlListener.isDone();
      return; // success
    } catch (exitCode) {
      if (exitCode === NS_MSG_ERROR_BLOCKED_COMPACTION && attempt < COMPACT_RETRY_LIMIT) {
        console.info(
          `XPUNGE: Folder "${folder.localizedName ?? folder.name}" has pending IMAP operations.`,
          `Waiting for sync before retry (attempt ${attempt}/${COMPACT_RETRY_LIMIT - 1})...`
        );
        // For compactAll the blocking folder may be any subfolder, so we watch
        // the root. For single-folder compact we watch that folder directly.
        try {
          await waitForOfflineEventsClear(folder);
        } catch {
          // Timeout — fall through to throw the original error below.
          break;
        }
      } else {
        throw exitCode;
      }
    }
  }
  throw NS_MSG_ERROR_BLOCKED_COMPACTION;
}

var Xpunge = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      Xpunge: {
        async confirm(dialogTitle, dialogMsg) {
          let w = Services.wm.getMostRecentWindow("mail:3pane");
          return Services.prompt.confirm(w, dialogTitle, dialogMsg);
        },

        // Empty junk of the account belonging to the specified folder.
        async emptyJunk(folder) {
          const rootFolder = context.extension.folderManager.get(
            folder.accountId,
            folder.path
          ).rootFolder;

          const _emptyJunk = async (nativeFolder) => {
            if (FolderUtils.isSmartVirtualFolder(nativeFolder)) {
              // This is the unified junk folder.
              const wrappedFolder = VirtualFolderHelper.wrapVirtualFolder(nativeFolder);
              for (const searchFolder of wrappedFolder.searchFolders) {
                await _emptyJunk(searchFolder);
              }
              return;
            }

            // Delete any subfolders this folder might have.
            for (const subFolder of nativeFolder.subFolders) {
              nativeFolder.propagateDelete(subFolder, true);
            }

            const messages = [...nativeFolder.messages];
            if (!messages.length) {
              return;
            }

            await new Promise((resolve, reject) => {
              nativeFolder.deleteMessages(
                messages,
                null,  // msgWindow
                true,  // deleteStorage
                false, // isMove
                {
                  /** @implements {nsIMsgCopyServiceListener} */
                  onStartCopy() {},
                  onProgress() {},
                  setMessageKey() {},
                  getMessageId() { return null; },
                  onStopCopy(status) {
                    if (status == Cr.NS_OK) {
                      resolve();
                    } else {
                      reject(status);
                    }
                  },
                },
                false, // allowUndo
              );
            });
          };

          const junkFolders = rootFolder.getFoldersWithFlags(Ci.nsMsgFolderFlags.Junk);
          for (const junkFolder of junkFolders) {
            // localizedName is the correct API; prettyName was removed in TB 141.
            const folderLabel = junkFolder.localizedName ?? junkFolder.name;
            try {
              console.info("XPUNGE: Emptying junk folder (", folderLabel, ") for account:", rootFolder.server.prettyName);
              await _emptyJunk(junkFolder);
              console.info("XPUNGE: Done");
            } catch (ex) {
              console.info("XPUNGE: Failed emptying junk folder:", folderLabel, ex);
            }
          }
        },

        // Empty trash of the account belonging to the specified folder.
        async emptyTrash(folder) {
          const rootFolder = context.extension.folderManager.get(
            folder.accountId,
            folder.path
          ).rootFolder;

          const _emptyTrash = async (trashFolder) => {
            if (["none", "rss", "pop3", "owl"].includes(trashFolder.server.type)) {
              // nsMsgLocalMailFolder::EmptyTrash does not call the urlListener.
              // https://searchfox.org/comm-central/rev/d9f4b21312781d3abb9c88cade1d077b9e1622f4/mailnews/local/src/nsLocalMailFolder.cpp#615
              trashFolder.emptyTrash(null);
              return;
            }
            let urlListener = new UrlListener();
            trashFolder.emptyTrash(urlListener);
            await urlListener.isDone();
          };

          try {
            console.info("XPUNGE: Emptying trash for account:", rootFolder.server.prettyName);
            const accountTrashFolder = rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);
            if (accountTrashFolder) {
              if (FolderUtils.isSmartVirtualFolder(rootFolder)) {
                for (const server of MailServices.accounts.allServers) {
                  for (const trashFolder of server.rootFolder.getFoldersWithFlags(
                    Ci.nsMsgFolderFlags.Trash
                  )) {
                    await _emptyTrash(trashFolder);
                  }
                }
              } else {
                await _emptyTrash(accountTrashFolder);
              }
            }
            console.info("XPUNGE: Done");
          } catch (ex) {
            console.info("XPUNGE: Failed emptying trash for account:", rootFolder.server.prettyName, ex);
          }
        },

        // Compact specified folder, or the entire account if the folder is the root.
        async compact(folder) {
          let nativeFolder = context.extension.folderManager.get(
            folder.accountId,
            folder.path
          );

          if (nativeFolder.isServer) {
            // Compact the entire account.
            try {
              console.info("XPUNGE: Compacting all folders for account:", nativeFolder.server.prettyName);
              await compactWithRetry(nativeFolder, true);
              console.info("XPUNGE: Done");
            } catch (ex) {
              console.info("XPUNGE: Failed compacting all folders for account:", nativeFolder.server.prettyName, ex);
            }
          } else {
            // Compact the specified folder.
            // Skip if nothing to compact (non-IMAP only).
            if (nativeFolder.server.type != "imap" && !nativeFolder.expungedBytes) {
              const folderLabel = nativeFolder.localizedName ?? nativeFolder.name;
              console.info("XPUNGE: Nothing to do, skipping compacting of folder (", folderLabel, ") on account:", nativeFolder.server.prettyName);
              return;
            }
            const folderLabel = nativeFolder.localizedName ?? nativeFolder.name;
            try {
              console.info("XPUNGE: Compacting folder (", folderLabel, ") on account:", nativeFolder.server.prettyName);
              await compactWithRetry(nativeFolder, false);
              console.info("XPUNGE: Done");
            } catch (ex) {
              console.info("XPUNGE: Failed compacting folder (", folderLabel, ") on account:", nativeFolder.server.prettyName, ex);
            }
          }
        },
      },
    };
  }
};
