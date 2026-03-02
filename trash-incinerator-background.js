import { Logger                  } from './modules/logger.js';
import { TrashIncineratorOptions } from './modules/options.js';
import { getBrowserAndVersion, getExtensionInfo, getExtensionId, getExtensionName, getExtensionVersion, getI18nMsg, getI18nMsgSubst, formatMsToDateTime12HR } from './modules/utilities.js';



/* TO DO:
 *
 * - Options:
 *   - Delete Sub-Folders or NO
 *   - Delete Trash in Sub-Folders or not
 *   - Show Confirmation yes/no
 *
 * BUGS:
 * -
 */

class TrashIncinerator {
  // getBrowserAndVersion() returns array of string. Elements in the array:
  //   [0] appname/major.minor.xxx    ex: Thunderbird/128.8.0
  //   [1] appname                    ex: Thunderbird
  //   [2] major.minor.xx             ex: 128.8.0 (.xx is optional)
  //   [3] major                      ex: 128
  //   [4[ minor                      ex: 8
  //   [5] xx (optional)              ex: 0
  //   [?] if there are more '.' characters after xx, we continue for each part...
  #BROWSER_AND_VERSION = Object.freeze( getBrowserAndVersion() );
  #TB_MAJOR_VERSION    = parseInt(this.#BROWSER_AND_VERSION[3]);
  #TB_MINOR_VERSION    = parseInt(this.#BROWSER_AND_VERSION[4]);

  #CLASS_NAME          = this.constructor.name;
  #EXTENSION_NAME      = getExtensionName();
  #EXTENSION_VERSION   = getExtensionVersion();
  #EXTENSION_ID        = getExtensionId();

  #INFO                = true;
  #LOG                 = true;
  #DEBUG               = false;
  #WARN                = true;

  #logger              = new Logger();
  #tiOptionsApi        = new TrashIncineratorOptions(this.#logger);

  // cached options - see #cacheOptions and #optionChanged()
  #option_confirmIncinerate;
  #option_emptySubFolders;
  #option_deleteSubFolders;

  #accountNameById     = {};

  #lastDisplayedFolder;
  




  constructor() {
  }



  info(...info) {
    if (this.#INFO) this.#logger.info(this.#CLASS_NAME, ...info);
  }

  infoAlways(...info) {
    this.#logger.infoAlways(this.#CLASS_NAME, ...info);
  }

  log(...info) {
    if (this.#LOG) this.#logger.log(this.#CLASS_NAME, ...info);
  }

  logAlways(...info) {
    this.#logger.logAlways(this.#CLASS_NAME, ...info);
  }

  debug(...info) {
    if (this.#DEBUG) this.#logger.debug(this.#CLASS_NAME, ...info);
  }

  debugAlways(...info) {
    this.#logger.debugAlways(this.#CLASS_NAME, ...info);
  }

  warn(...info) {
    if (this.#WARN) this.#logger.debug(this.#CLASS_NAME, ...info);
  }

  warnAlways(...info) {
    this.#logger.warnAlways(this.#CLASS_NAME, ...info);
  }

  error(...info) {
    // always log errors
    this.#logger.error(this.#CLASS_NAME, ...info);
  }

  caught(e, msg, ...info) {
    // always log exceptions
    this.#logger.error( this.#CLASS_NAME,
                       msg,
                       "\n name:    " + e.name,
                       "\n message: " + e.message,
                       "\n stack:   " + e.stack,
                       ...info
                     );
  }



  async init() {
    this.infoAlways(`Extension Loaded: ${this.#EXTENSION_NAME} version ${this.#EXTENSION_VERSION} - app & version: "${this.#BROWSER_AND_VERSION.join(" : ")}"`);
////this.info("Extension Info: ", getExtensionInfo());

    await this.#loadAccountNames();

    await this.#tiOptionsApi.setupDefaultOptions();
    await this.#cacheOptions();

    await this.#setupActionButton();

    await this.#setupListeners();
  }



  async #cacheOptions() {
    this.#option_confirmIncinerate = await this.#tiOptionsApi.isEnabledConfirmIncinerate();
    this.#option_emptySubFolders   = await this.#tiOptionsApi.isEnabledEmptySubFolders();
    this.#option_deleteSubFolders  = await this.#tiOptionsApi.isEnabledDeleteSubFolders();
  }



  async #setupActionButton() {
    const currentMailTab  = await messenger.mailTabs.getCurrent();
    const displayedFolder = currentMailTab?.displayedFolder;

    if (! displayedFolder) {
      this.error("No displayed folder");
    } else {
      this.#lastDisplayedFolder = displayedFolder;

      const trashFolder = await this.#getTrashFolder(displayedFolder);

      if (! trashFolder) {
        this.error("No trash folder");
      } else if (trashFolder.isVirtual) {
        this.error("Trash folder isVirtual");
      } else {
        await this.#updateActionButton(trashFolder);
      }
    }
  }



  async #setupListeners() {
    TrashIncineratorOptions.addOptionChangeListener(         async ( optionName, newValue, oldValue ) => { this.#optionChanged(optionName, newValue, oldValue );      } );

    messenger.accounts.onCreated.addListener(                async ( accountId, account             ) => { this.#accountCreated(accountId, account);                  } );
    messenger.accounts.onUpdated.addListener(                async ( accountId, changedValues       ) => { this.#accountUpdated(accountId, changedValues);            } );
    messenger.accounts.onDeleted.addListener(                async ( accountId                      ) => { this.#accountDeleted(accountId);                           } );

    messenger.folders.onCreated.addListener(                 async ( folder                         ) => { this.#folderCreated(folder);                               } );
    messenger.folders.onMoved.addListener(                   async ( originalFolder, movedFolder    ) => { this.#folderMoved(originalFolder, movedFolder);            } );
    messenger.folders.onDeleted.addListener(                 async ( folder                         ) => { this.#folderDeleted(folder);                               } );
    messenger.folders.onFolderInfoChanged.addListener(       async ( folder, folderInfo             ) => { this.#folderInfoChanged(folder, folderInfo);               } );

    messenger.mailTabs.onDisplayedFolderChanged.addListener( async ( tab, displayedFolder           ) => { this.#displayedFolderChanged(tab, displayedFolder);        } );
    messenger.tabs.onActivated.addListener(                  async ( activeInfo                     ) => { this.#tabActivated(activeInfo);                            } );

    messenger.browserAction.onClicked.addListener(           async ( tab, onClickData               ) => { this.#browserActionButtonClicked(tab, onClickData);        } );

    if (messenger.composeAction) {
      messenger.composeAction.onClicked.addListener(         async ( tab, onClickData               ) => { this.#composeActionButtonClicked(tab, onClickData);        } );
    }

    if (messenger.messageDisplayAction) {
      messenger.messageDisplayAction.onClicked.addListener(  async ( tab, onClickData               ) => { this.#messageDisplayActionButtonClicked(tab, onClickData); } );
    }
  }



  // build the accountsNames so we can display account names in console messages
  async #loadAccountNames() {
    const accounts = await messenger.accounts.list(); // requires the accountsRead permission

    for (const account of accounts) {
      if (true || this.#DEBUG) { // MABXXX <-------------------------------------------------------------------------------------------<<<<<<<<<<<<<<
        var kv = "";
        Object.entries(account).forEach( ([key, value]) => { switch (key) {
                                                               case 'rootFolder':
                                                               case 'identities':
                                                               case 'folders':
                                                                 break;
                                                               default:
                                                                 if (typeof value === 'string')
                                                                   kv += `\n- ${key} = "${value}"`
                                                                 else
                                                                   kv += `\n- ${key} = ${value}`
                                                             }
                                                           }
                                       );
        this.debug(kv);
      }

      this.#accountNameById[account.id] = account.name;
    }
  }

  getAccountName(accountId, defaultAccountName) {
    var accountName = defaultAccountName ? defaultAccountName : accountId;

    if (accountId && Object.hasOwn(this.#accountNameById, accountId)) {
      accountName = this.#accountNameById[accountId];
    }

    return accountName;
  }

  /*** keep this.#accountNameById up to date --- handle events: accounts.onCreated, accounts.onUpdated, and accounts.onDeleted  */

  async #accountCreated(accountId, account) {
    this.debug(`created: accountId="${accountId}" account.name="${account.name}"`);
    this.#accountNameById[account.id] = account.name;
  }

  async #accountUpdated(accountId, changedValues) {
    this.debug(`updated: accountId="${accountId}" changedValues: `, changedValues);
////if ( Object.hasOwn(this.#accountNameById, accountId) && Object.hasOwn(changedValues, 'name') ) { // who cares if it's not already there.  just add it.
    if ( Object.hasOwn(changedValues, 'name') ) {
      this.debug(`updated: accountId="${accountId}": name --> "${changedValues.name}": `);
      this.#accountNameById[accountId] = changedValues.name;
    }
  }

  async #accountDeleted(accountId) {
    this.debug(`deleted: accountId="${accountId}"`);
    if (Object.hasOwn(this.#accountNameById, accountId)) {
      this.debug(`deleted: accountId="${accountId}" name="${this.#accountNameById[accountId]}"`);
      delete this.#accountNameById[accountId];
    }
  }



  async #tabActivated(activeInfo) {
    const activeTab = await messenger.tabs.get(activeInfo.tabId);

    if (! activeTab) {
      this.debug("No Active Tab");
    } else if (! activeTab.mailTab) { // same as active.type === 'mail' ???
      this.debug("Active Tab is not a MailTab");
    } else {

      const activeMailTab = await messenger.mailTabs.get(activeTab.id);

      if (! activeMailTab) {
        this.debug("No Active MailTab");
      } else if (! activeMailTab.displayedFolder) {
        this.debug("Active MailTab has no displayedFolder");
      } else {
        this.#lastDisplayedFolder = activeMailTab.displayedFolder;

        var trashFolder = await this.#getTrashFolder(activeMailTab.displayedFolder);

        if (! trashFolder) {
          this.error("No trash folder");
        } else if (trashFolder.isVirtual) {
          this.error("Trash folder isVirtual");
        } else {
          await this.#updateActionButton(trashFolder);
        }
      }
    }
  }



  async #displayedFolderChanged(tab, displayedFolder) { // tabs.Tab, folders.MailFolder
    const prevLastDisplayedFolder = this.#lastDisplayedFolder
    this.#lastDisplayedFolder     = displayedFolder;

    this.debug( "\n========== NEW Displayed MailFolder ==========",
                `\n- id .......... "${displayedFolder.id}"`,
                `\n- name ........ "${displayedFolder.name}"`,
                `\n- accountId ... "${displayedFolder.accountId}"`,
                `\n- account ..... "${this.getAccountName(displayedFolder.accountId, "(none)")}"`,
                `\n- isRoot ...... ${displayedFolder.isRoot}`,
                `\n- isVirtual ... ${displayedFolder.isVirtual}`,
                "\n- specialUse:", displayedFolder.specialUse,
                "\n- subFolders:", displayedFolder.subFolders,
              );

    if (! prevLastDisplayedFolder || prevLastDisplayedFolder.accountId !== displayedFolder.accountId) {
      const trashFolder = await this.#getTrashFolder(displayedFolder);

      if (! trashFolder) {
        this.error("No trash folder");
      } else if (trashFolder.isVirtual) {
        this.error("Trash folder isVirtual");
      } else {
        this.debug( "\n========== TRASH MailFolder ==========",
                    `\n- id .......... "${trashFolder.id}"`,
                    `\n- name ........ "${trashFolder.name}"`,
                    `\n- accountId ... "${trashFolder.accountId}"`,
                    `\n- account ..... "${this.getAccountName(trashFolder.accountId, "(none)")}"`,
                    `\n- isRoot ...... ${trashFolder.isRoot}`,
                    `\n- isVirtual ... ${trashFolder.isVirtual}`,
                    "\n- specialUse:", trashFolder.specialUse,
                    "\n- subFolders:", trashFolder.subFolders,
                  );
        await this.#updateActionButton(trashFolder);
      }
    }
    
  }



  async #optionChanged(optionName, newValue, oldValue) {
    switch (optionName) {
      case 'tiConfirmIncinerate':
        this.#option_confirmIncinerate = newValue;
        break;
      case 'tiEmptySubFolders':
        this.#option_emptySubFolders   = newValue;
        break;
      case 'tiDeleteSubFolders':
        this.#deleteSubFoldersOptionChanged(newValue, oldValue);
        break;
    }  
  }

  // whether we are deleting sub-folders or not has a bearing on whether we enable the action button or not.
  async #deleteSubFoldersOptionChanged(newValue, oldValue) {
    this.#option_deleteSubFolders = newValue;

    this.debug(`newValue ... ${newValue}`);

    const currentMailTab  = await messenger.mailTabs.getCurrent();
    const displayedFolder = currentMailTab?.displayedFolder;

    if (! displayedFolder) {
      this.error("No displayed folder");
    } else {
      this.#lastDisplayedFolder = displayedFolder;

      const trashFolder = await this.#getTrashFolder(displayedFolder);

      if (! trashFolder) {
        this.error("No trash folder");
      } else if (trashFolder.isVirtual) {
        this.error("Trash folder isVirtual");
      } else {
        await this.#updateActionButton(trashFolder);
      }
    }
  }



  async #folderCreated(folder) {  // folders.MailFolder
    this.debug( "\n========== MailFolder CREATED ==========",
                `\n- id .......... "${folder.id}"`,
                `\n- name ........ "${folder.name}"`,
                `\n- accountId ... "${folder.accountId}"`,
                `\n- account ..... "${this.getAccountName(folder.accountId, "(none)")}"`,
                `\n- isVirtual ... ${folder.isVirtual}`,
                "\n- specialUse:", folder.specialUse,
              );

    const parentFolders = await messenger.folders.getParentFolders(folder.id, false); // includeSubFolders=false;
    if (! parentFolders || parentFolders.length < 1) {
      this.error("\n- NO parentFolders:");

    } else {
      // if the new Folder is a descendent of the trash folder, this require a change to the Action Buttion
      const firstFolder = parentFolders.pop();
      this.debug( "\n========== First MailFolder ==========",
                  `\n- id .......... "${firstFolder.id}"`,
                  `\n- name ........ "${firstFolder.name}"`,
                  `\n- accountId ... "${firstFolder.accountId}"`,
                  `\n- account ..... "${this.getAccountName(firstFolder.accountId, "(none)")}"`,
                  `\n- isVirtual ... ${firstFolder.isVirtual}`,
                  "\n- specialUse:", firstFolder.specialUse,
                );
      if (! firstFolder.isVirtual && firstFolder.specialUse && firstFolder.specialUse.includes('trash')) {
        await this.#updateActionButton(firstFolder);
      }
    }
  }



  async #folderMoved(originalFolder, movedFolder) {  // folders.MailFolder, folders.MailFolder
    this.debug( "\n========== MailFolder MOVED ==========",
                "---original--------",
                `\n- id .......... "${originalFolder.id}"`,
                `\n- name ........ "${originalFolder.name}"`,
                `\n- accountId ... "${originalFolder.accountId}"`,
                `\n- account ..... "${this.getAccountName(originalFolder.accountId, "(none)")}"`,
                `\n- isVirtual ... ${originalFolder.isVirtual}`,
                "\n- specialUse:", originalFolder.specialUse,
                "---moved--------",
                `\n- id .......... "${movedFolder.id}"`,
                `\n- name ........ "${movedFolder.name}"`,
                `\n- accountId ... "${movedFolder.accountId}"`,
                `\n- account ..... "${this.getAccountName(movedFolder.accountId, "(none)")}"`,
                `\n- isVirtual ... ${movedFolder.isVirtual}`,
                "\n- specialUse:", movedFolder.specialUse,
              );
  }

  async #folderDeleted(folder) {  // folders.MailFolder - but be CAREFUL!!!  This Folder has been deleted.  You can't do anything with it, not even call get() for it!!!
    this.debug( "\n========== MailFolder DELETED ==========",
                `\n- id .......... "${folder.id}"`,
                `\n- name ........ "${folder.name}"`,
                `\n- accountId ... "${folder.accountId}"`,
                `\n- account ..... "${this.getAccountName(folder.accountId, "(none)")}"`,
                `\n- isVirtual ... ${folder.isVirtual}`,
                "\n- specialUse:", folder.specialUse,
                "\n- subFolders:", folder.subFolders,
              );

    // Since we CAN NOT get the parent folders of this deleted folder,
    // there is no way to know if it was a descendent of the Trash Folder
    // other than to keep track of the folder hierarchy, which I am NOT
    // going to do.  So get the Trash Folder with the same Account ID
    // as this folder and call #updateActionButton() on that.

    const trashFolder = await this.#getTrashFolder(folder);

    if (! trashFolder) {
      this.error("No trash folder");
    } else if (trashFolder.isVirtual) {
      this.error("Trash folder isVirtual");
    } else {
      await this.#updateActionButton(trashFolder);
    }
  }

  async #folderInfoChanged(folder, folderInfo) {  // folders.MailFolder, folders.MailFolderInfo
    // folders.get(folder.id) folders.getFolderInfo(folder or folder.id) 
    //
    // MABXXX This event happens EVEN WHEN all the user did was change the DISPLAYED FOLDER!!! (timeLastUsed!!!)
    //
    // MABXXX MailFolderInfo values are undefined unless they actually changed!!!
    //
    this.debug( "\n========== MailFolder INFO CHANGED ==========",
                `\n- id .......... "${folder.id}"`,
                `\n- name ........ "${folder.name}"`,
                `\n- accountId ... "${folder.accountId}"`,
                `\n- account ..... "${this.getAccountName(folder.accountId, "(none)")}"`,
                `\n- isVirtual ... ${folder.isVirtual}`,
                "\n- specialUse:", folder.specialUse,
                "\n- subFolders:", folder.subFolders, // never seems to have subFolders
                "\n========== MailFolderInfo ==========",
                `\n- newMessageCount ...... ${folderInfo.newMessageCount}`,     // MABXXX does this include sub-folders???  YES/NO not reliable
                `\n- unreadMessageCount ... ${folderInfo.unreadMessageCount}`,  // MABXXX does this include sub-folders???  YES/NO not reliable
                `\n- totalMessageCount .... ${folderInfo.totalMessageCount}`,   // MABXXX does this include sub-folders???  YES/NO not reliable
              );


    if (! folder.isVirtual && folder.specialUse && folder.specialUse.includes('trash')) {
      await this.#updateActionButton(folder);
    }
  }



  // Folder must NOT be virtual and must have 'trash' in folder.specialUse
  async #updateActionButton(folder) {
    if (folder.isVirtual || ! folder.specialUse || ! folder.specialUse.includes('trash')) {
      this.error(`Folder is not a non-virtual 'trash' Folder, id="${folder.id}"`, folder);

    } else {
      const trashFolder     = await messenger.folders.get(folder.id, true); // includeSubFolders=true - We need the sub-folders!!!
      const trashFolderInfo = await messenger.folders.getFolderInfo(trashFolder.id);
      const currentMailTab  = await messenger.mailTabs.getCurrent();
      const displayedFolder = currentMailTab?.displayedFolder;

      this.debug( "\n========== Trash MailFolder ==========",
                  `\n- id .......... "${trashFolder.id}"`,
                  `\n- name ........ "${trashFolder.name}"`,
                  `\n- accountId ... "${trashFolder.accountId}"`,
                  `\n- account ..... "${this.getAccountName(trashFolder.accountId, "(none)")}"`,
                  "\n- specialUse:", trashFolder.specialUse,
                  "\n- subFolders:", trashFolder.subFolders,
                  "\n========== Trash MailFolderInfo ==========",
                  `\n- newMessageCount ...... ${trashFolderInfo.newMessageCount}`,     // This DOES NOT ALWAYS include sub-folders
                  `\n- unreadMessageCount ... ${trashFolderInfo.unreadMessageCount}`,  // This DOES NOT ALWAYS include sub-folders
                  `\n- totalMessageCount .... ${trashFolderInfo.totalMessageCount}`,   // This DOES NOT ALWAYS include sub-folders
                );

      if (! displayedFolder) {
        // the Action Button won't be visible
        this.error( "\n========== NO MailFolder is currently being displayed ==========");
      } else {
        this.#lastDisplayedFolder = displayedFolder;

        this.debug( "\n========== Displayed MailFolder ==========",
                    `\n- id .......... "${displayedFolder.id}"`,
                    `\n- name ........ "${displayedFolder.name}"`,
                    `\n- accountId ... "${displayedFolder.accountId}"`,
                    `\n- account ..... "${this.getAccountName(displayedFolder.accountId, "(none)")}"`,
                    "\n- specialUse:", displayedFolder.specialUse,
                    "\n- subFolders:", displayedFolder.subFolders,
                  );
      }

      const viewingSameAccount = displayedFolder && (displayedFolder.accountId === trashFolder.accountId);
      this.debug(`\n========== viewingSameAccount? ${viewingSameAccount} ==========`);

      if (! viewingSameAccount) {
        //
      } else {
        //this.#option_emptySubFolders
        //this.#option_deleteSubFolders

////////const totalMessageCount = trashFolderInfo.totalMessageCount;  // DOES NOT INCLUDE SUB-FOLDERS???
        const totalMessageCount = await this.#getTotalMessageCount(trashFolder);
        this.debug(`\n========== totalMessageCount=${totalMessageCount} ==========`);

        const enableActionButton = totalMessageCount > 0
                                   || ( this.#option_deleteSubFolders
                                        && trashFolder.subFolders
                                        && trashFolder.subFolders.length > 0
                                      );

        this.debug(`\n========== enableActionButton? ${enableActionButton} ==========`);

        if (enableActionButton) {
          await messenger.browserAction.enable();
        } else {
          await messenger.browserAction.disable();
        }
      }
    }
  }



  // recursively calculate the total of the messages in the given Folder and all its sub-folders
  async #getTotalMessageCount(folder) {
    var count = 0;

    const folderInfo = await messenger.folders.getFolderInfo(folder.id);
    if (! folderInfo) {
      this.debug(`NO FolderInfo for folder id="${folder.id}" name="${folder.name}"`);
    } else {
      this.debug(`Folder id="${folder.id}" name="${folder.name}" totalMessageCount="${folderInfo.totalMessageCount}`);
      if (folderInfo.totalMessageCount) count += folderInfo.totalMessageCount;
    }

    if (folder.subFolders) {
      for (const subFolder of folder.subFolders) {
        count += await this.#getTotalMessageCount(subFolder);
      }
    }

    return count;
  }



  async #browserActionButtonClicked(tab, onClickData) {
    const mailTab = await messenger.mailTabs.getCurrent();

    if (mailTab) {
      const displayedFolder = mailTab.displayedFolder;
      
      if (displayedFolder) {
        this.#lastDisplayedFolder = displayedFolder;

        const trashFolder = await this.#getTrashFolder(displayedFolder);

        if (! trashFolder) {
          this.error("No trash folder");
        } else if (trashFolder.isVirtual) {
          this.error("Trash folder isVirtual");
        } else {
          var requireConfirmation = this.#option_confirmIncinerate;

          this.debug(`INCINERATING Messages in Trash Folder for Account ID="${displayedFolder.accountId}"!!!  Messages in Sub-Folders Too? ${this.#option_emptySubFolders}`);
          const messageQueryInfo  = { 'accountId':         displayedFolder.accountId,
                                      'folderId':          trashFolder.id,
                                      'includeSubFolders': this.#option_emptySubFolders,
                                    };
          var msgList = await messenger.messages.query(messageQueryInfo);

          if (! msgList || ! msgList.messages || msgList.messages.length < 1) {
            this.debug("No Messages found in the Trash Folder");
          } else {  
            const msgHdrs = [];
            const msgIds  = [];

            while (true) {
              for (const msgHdr of msgList.messages) {
                msgHdrs.push(msgHdr);
                msgIds.push(msgHdr.id);
              }

              if (! msgList.id) break;
              msgList = await messenger.messages.continueList(msgList.id);
            }

            if (msgIds.length < 1) {
              this.debug("No Messages in the Trash Folder");

            } else {
              this.debug(`INCINERATING ${msgIds.length} messages`);

              const ok = requireConfirmation ? await this.#showIncinerateConfirmDialog(true, msgHdrs) : true;
              requireConfirmation = false;

              if (ok) {
                try {
                  if (this.#TB_MAJOR_VERSION < 147) {
                    messenger.messages.delete(msgIds, true); // delete permanently
                  } else {
                    const deleteOptions = { 'deletePermanently': true,
                                            'isUserAction':      true,
                                          };
                    messenger.messages.delete(msgIds, deleteOptions);
                  }
                } catch (error) {
                  this.caught(error, `Failed to delete ${msgIds.length} messages`);
                }
              }
            }
          }

          if (this.#option_emptySubFolders && this.#option_deleteSubFolders) {
            this.debug(`INCINERATING Sub-Folders of Trash Folder for Account id="${displayedFolder.accountId}"`);

////////////const subFolders = await messenger.folders.getSubFolders(trashFolder.id, true);  // includeSubFolders = true  // only need to delete top-level sub-folders
            const subFolders = await messenger.folders.getSubFolders(trashFolder.id, false); // includeSubFolders = false // only need to delete top-level sub-folders

            if (! subFolders || subFolders.length < 1) {
              this.debug("No sub-folders in the Trash Folder");
            } else {
              this.debug(`INCINERATING ${subFolders.length} Sub-Folders`);

              const ok = requireConfirmation ? await this.#showIncinerateConfirmDialog(false, subFolders) : true;

              if (ok) {
                for (const subFolder of subFolders) {
                  // MABXXX do we need to worry about any particular folder types???  specialUse???  In the TRASH Folder???
                  this.debug(`Deleting sub-folder, id="${subFolder.id}" accountId="${subFolder.accountId}" path="${subFolder.path}"`);
                  try {
                    await messenger.folders.delete(subFolder.id);
                  } catch (error) {
                    this.caught(error, `Failed to delete sub-folder, id="${subFolder.id}" accountId="${subFolder.accountId}" path="${subFolder.path}"`);
                  }
                }
              }
            }
          }
        }
      }
    }
  }



  async #composeActionButtonClicked(tab, onClickData) {
    // nothing to do
  }



  async #messageDisplayActionButtonClicked(tab, onClickData) {
    // nothing to do
  }



  // - data: an array of integer: msgId or folderId
  async #showIncinerateConfirmDialog(incineratingMessages, data) {
    this.debug( "\n--- begin:",
                `\n incineratingMessages=${incineratingMessages}`,
                `\n data="${data}"`,
                `\n (typeof data)="${typeof data}"`,
                `\n isArray(data)="${Array.isArray(data)}"`,                              // but is MUST be
                `\n data.length=${Array.isArray(data) ? data.length : '(not an array)'}`, // but is MUST be
              );

    if (data == null) {
      this.error("data is null");
      return;
    } else if (typeof data === 'undefined') {
      this.error("data is undefined");
      return;
    } else if (! Array.isArray(data)) {
      this.error("data is not an array");
      return;
    } else if (data.length < 0) {
      this.error("data.length < 0");
      return;
    } else if (typeof data[0] !== 'object') {
      this.error("data[0] is not an object");
      return;
    } else {
    }

    var   popupLeft   = 100;
    var   popupTop    = 100;
    var   popupHeight = 500;
    var   popupWidth  = 600;
    const mainWindow  = await messenger.windows.getCurrent();

    if (! mainWindow) {
      this.debug("-- DID NOT GET THE CURRENT (MAIN, mail:3pane) WINDOW!!! ---");

    } else {
      this.debug( "\n--- Got the Current (Main, mail:3pane) Window:",
                  `\n- mainWindow.top=${mainWindow.top}`,
                  `\n- mainWindow.left=${mainWindow.left}`,
                  `\n- mainWindow.height=${mainWindow.height}`,
                  `\n- mainWindow.width=${mainWindow.width}`,
                );
//////popupTop  = mainWindow.top  + mainWindow. / 2;
      popupTop  = mainWindow.top  + Math.round( (mainWindow.height - popupHeight) / 2 );
//////popupLeft = mainWindow.left + 100;
      popupLeft = mainWindow.left + Math.round( (mainWindow.width  - popupWidth)  / 2 );
      if (mainWindow.height - 200 > popupHeight) popupHeight - mainWindow.Height - 200;   // make it higher, but not shorter
////////if (mainWindow.Width  - 200 > popupWidth)  popupWidth  = mainWindow.Width  - 200;   // make it wider,  but not narrower --- eh, don't need it wider
    }

    const bounds = await this.#tiOptionsApi.getWindowBounds("IncinerateConfirmDialog"); // MABXXX PERHAPS THIS SHOULD ALWAYS BE CENTERED??????

    if (! bounds) {
      this.debug("-- no previous window bounds");
    } else if (typeof bounds !== 'object') {
      this.error(`-- PREVIOUS WINDOW BOUNDS IS NOT AN OBJECT: typeof='${typeof bounds}' #####`);
    } else {
      this.debug( "\n--- restoring previous window bounds:",
                  `\n- bounds.top=${bounds.top}`,
                  `\n- bounds.left=${bounds.left}`,
                  `\n- bounds.width=${bounds.width}`,
                  `\n- bounds.height=${bounds.height}`,
                );
//    popupTop    = bounds.top;
      popupTop    = mainWindow ? mainWindow.top  + Math.round( (mainWindow.height - bounds.height) / 2 ) : bounds.top; // CENTER ON THE MAIN WINDOW!!!
//    popupLeft   = bounds.left;
      popupLeft   = mainWindow ? mainWindow.left + Math.round( (mainWindow.width  - bounds.width)  / 2 )  : bounds.left; // CENTER ON THE MAIN WINDOW!!!
      popupWidth  = bounds.width;
      popupHeight = bounds.height;
    }



    // window.id does not exist.  how do we get our own window id???
    var   ourTabId;
    var   ourWindowId;
    const currentTab = await messenger.tabs.getCurrent();
    if (! currentTab) {
      this.debug("-- messenger.tabs.getCurrent() didn't return a Tab");
    } else {
      this.debug(`-- currentTab.id="${currentTab.id}" currentTab.windowId="${currentTab.windowId}"`);
      ourTabId    = currentTab.id;
      ourWindowId = currentTab.windowId;
    }

    const title           = getI18nMsg("tiIncinerateConfirmDialog_title");            // "Confirm Trash Incineration"
    const button1MsgId    = "tiIncinerateConfirmDialog_continueButton.label";
    const button2MsgId    = "tiIncinerateConfirmDialog_cancelButton.label";
    const messageContinue = getI18nMsg("tiIncinerateConfirmDialog_message_continue"); // "Do you wish to continue?"

    var  confirmDialogUrl = messenger.runtime.getURL("../dialogs/confirm.html")
                             + `?windowName=${encodeURIComponent("IncinerateConfirmDialog")}`
                             + `&title=${encodeURIComponent(title)}`
                             + "&buttons_3=false"
                             + `&button1MsgId=${encodeURIComponent(button1MsgId)}`
                             + `&button2MsgId=${encodeURIComponent(button2MsgId)}`;

    if (incineratingMessages) { // We're deleting Messages!
      var message1;
      var message2;
      var message3;
      var message4;
      if (data.length < 2) {
        message1 = getI18nMsg("tiIncinerateOneMessageConfirmDialog_message1"); // "One Message will be deleted:"
        message2 = getI18nMsg("tiIncinerateOneMessageConfirmDialog_message2"); // "This message will be deleted permanently."
        message3 = getI18nMsg("tiIncinerateOneMessageConfirmDialog_message3"); // "You will not be able to recover it."
        message4 = getI18nMsg("tiIncinerateOneMessageConfirmDialog_message4"); // " "
      } else {
        message1 = getI18nMsgSubst("tiIncinerateCountMessagesConfirmDialog_message1", '' + data.length); // "NN Messages will be deleted:"
        message2 = getI18nMsg(     "tiIncinerateCountMessagesConfirmDialog_message2"                  ); // "These messages will be deleted permanently."
        message3 = getI18nMsg(     "tiIncinerateCountMessagesConfirmDialog_message3"                  ); // "You will not be able to recover them."
        message4 = getI18nMsg(     "tiIncinerateCountMessagesConfirmDialog_message4"                  ); // " "
      }
      confirmDialogUrl +=   `&message1=${encodeURIComponent(message1)}`
                          + `&message2=${encodeURIComponent(message2)}`
                          + `&message3=${encodeURIComponent(message3)}`
                          + `&message4=${encodeURIComponent(message4)}`
                          + `&message5=${encodeURIComponent(messageContinue)}`;
    } else { // We're deleting SUb-Folders!
      var message1;
      var message2;
      if (data.length < 2) {
        message1 = getI18nMsg("tiIncinerateOneFolderConfirmDialog_message1"); // "One Sub-Folder will be deleted."
        message2 = getI18nMsg("tiIncinerateOneFolderConfirmDialog_message2"); // " "
      } else {
        message1 = getI18nMsgSubst("tiIncinerateCountFoldersConfirmDialog_message1", '' + data.length); // "NN Sub-Folders will be deleted."
        message2 = getI18nMsg(     "tiIncinerateCountFoldersConfirmDialog_message2"                  ); // " "
      }
      confirmDialogUrl +=   `&message1=${encodeURIComponent(message1)}`
                          + `&message2=${encodeURIComponent(message2)}`
                          + `&message3=${encodeURIComponent(messageContinue)}`;
    }

    // MABXXX DAMN!!! THERE'S NO WAY TO MAKE THIS MODAL!!! MUST USE action "default_popup".  But how to get Extension ID, etc?
    // The window.confirm() function doesn't give a way to specify button text.
    // Which is worse? Ugly ugly UGLY!!!
    this.debug( "\n--- window bounds:",
                `\n- popupTop=${popupTop}`,
                `\n- popupLeft=${popupLeft}`,
                `\n- popupWidth=${popupWidth}`,
                `\n- popupHeight=${popupHeight}`,
              );
    const confirmDialogWindow = await messenger.windows.create(
      {
        'url':                 confirmDialogUrl,
        'type':                "popup",
        'titlePreface':        getI18nMsg("extensionName") + " - ",
        'top':                 popupTop,
        'left':                popupLeft,
        'height':              popupHeight,
        'width':               popupWidth,
        'allowScriptsToClose': true,
      }
    );

    this.debug( "\n--- Folder Delete Messages Confirmation Popup Window Created --",
                `\n-from ourTabId="${ourTabId}"`,
                `\n-from ourWindowId="${ourWindowId}"`,
                `\n-confirmDialogWindow.id="${confirmDialogWindow.id}"`,
                `\n-URL="${confirmDialogUrl}"`,
              );

    // Re-focus on the confirmDialog window when our window gets focus
    // MABXXX PERHAPS THIS SHOULD BE DONE INSIDE #confirmDialogPrompt() ???
//  const focusListener = async (windowId) => this.windowFocusChanged(windowId, ourTabId, ourWindowId, confirmDialogWindow.id);
    const focusListener = null;
//  messenger.windows.onFocusChanged.addListener(focusListener);

    // ConfirmDialogResponse - expected:
    // - null     - the user closed the popup window        (set by our own windows.onRemoved listener - the defaultResponse sent to #confirmDialogPrompt)
    // - CLOSED   - the user closed the popup window        (sent by the ConfirmDialog window's window.onRemoved listener -- NOT REALLY - we use our own onRemoved listener)
    // - BUTTON_1 - the user clicked button 1               (sent by the ConfirmDialog window's button listener)
    // - BUTTON_2 - the user clicked button 2               (sent by the ConfirmDialog window's button listener)
    // - BUTTON_3 - the user clicked button 3               (sent by the ConfirmDialog window's button listener)

    const confirmDialogResponse = await this.#confirmDialogPrompt(confirmDialogWindow.id, focusListener, null);
    this.debug(`-- confirmDialogResponse="${confirmDialogResponse}"`);

    switch (confirmDialogResponse) {
      case 'BUTTON_1': // 'Yes' button - Continue
        this.debug("-- ConfirmDialog 'Continue' clicked");
        return true;
      case 'BUTTON_2': // 'No' button - Cancel
        this.debug("-- ConfirmDialog 'Cancel' clicked");
        return false;
      case 'CLOSED':   // this never happens - see comments in ConfirmDialog regarding conduit failure
      case null:       // closed using the window close button
        this.debug("-- ConfirmDialog window closed");
        return false;
      default:
        this.error(`-- UNKNOWN ConfirmDialog Response - NOT A KNOWN RESPONSE: "${confirmDialogResponse}"`);
    }
  }

  async #confirmDialogPrompt(confirmDialogWindowId, focusListener, defaultResponse) {
    try {
      await messenger.windows.get(confirmDialogWindowId);
    } catch (error) {
      // Window does not exist, assume closed.
      this.caught(error, "-- PERHAPS WINDOW CLOSED???");
      return defaultResponse;
    }

    return new Promise(resolve => {
      var response = defaultResponse;

      function windowRemovedListener(windowId) {
        if (windowId == confirmDialogWindowId) {

          messenger.runtime.onMessage.removeListener(messageListener);
          messenger.windows.onRemoved.removeListener(windowRemovedListener);
//////////messenger.windows.onFocusChanged.removeListener(focusListener);

          resolve(response);
        }
      }

      /* The ConfirmDialog sends a message as ConfirmDialogResponse:
       * - CLOSED   - the user closed the popup window   (sent by the ConfirmDialog window's window.onRemoved listener -- NOT REALLY -- using OUR onRemoved instead)
       * - BUTTON_1 - the user clicked button 1          (sent by the ConfirmDialog window's button listener)
       * - BUTTON_2 - the user clicked button 2          (sent by the ConfirmDialog window's button listener)
       * - BUTTON_3 - the user clicked button 3          (sent by the ConfirmDialog window's button listener)
       * Save this ConfirmDialogResponse into response for resolve()
       */
      function messageListener(request, sender, sendResponse) {
        if (sender.tab && sender.tab.windowId == confirmDialogWindowId && request && request.hasOwnProperty("ConfirmDialogResponse")) {
          response = request.ConfirmDialogResponse;
        }

        return false; // we're not sending any response 
      }

      messenger.runtime.onMessage.addListener(messageListener);
      messenger.windows.onRemoved.addListener(windowRemovedListener);
    });
  }



  async #getTrashFolder(folder) { // get the 'trash' folder with the same accountId as this folder, or just this folder if it IS a 'trash' folder
    var trashFolder;

    if (folder.specialUse && folder.specialUse.includes('trash')) {
      trashFolder = folder;
    } else if (! folder.accountId) {
      this.error(`Folder has no accountId, id="${folder.id}"`, folder);
    } else {

      const folderQueryInfo = { 'accountId':  folder.accountId,
                                'specialUse': [ 'trash' ],
                              };
      const trashFolders = await messenger.folders.query(folderQueryInfo);

      if (! trashFolders || trashFolders.length < 1) {
        this.error(`Failed to get 'trash' Folder for Account id="${folder.accountId}"`);
      } else if (trashFolders.length > 1) {
        this.error(`Got more than one 'trash' Folder for Account id="${folder.accountId}", count=${trashFolders.length}`);
      } else {
        trashFolder = trashFolders[0];
      }
    }

    return trashFolder;
  }
}



messenger.management.onInstalled.addListener(   async (extensionInfo) => onExtensionInstalled(   extensionInfo ) );
messenger.management.onUninstalled.addListener( async (extensionInfo) => onExtensionUninstalled( extensionInfo ) );
messenger.management.onEnabled.addListener(     async (extensionInfo) => onExtensionEnabled(     extensionInfo ) );
messenger.management.onDisabled.addListener(    async (extensionInfo) => onExtensionDisabled(    extensionInfo ) );

async function onExtensionInstalled(info) { // management.ExtensionInfo
//if (info.id === getExtensionId()) {
    console.log(`===== Extension Installed: id="${info.id}" name="${info.name}" version="${info.version}" installType="${info.installType}" mayDisable=${info.mayDisable}`);
//}
}
async function onExtensionUninstalled(info) { // management.ExtensionInfo
//if (info.id === getExtensionId()) {
    console.log(`===== Extension Uninstalled: id="${info.id}" name="${info.name}" version="${info.version}"`);
//}
}
async function onExtensionEnabled(info) { // management.ExtensionInfo
//if (info.id === getExtensionId()) {
    console.log(`===== Extension Enabled: id="${info.id}" name="${info.name}" version="${info.version}"`);
//}
}
async function onExtensionDisabled(info) { // management.ExtensionInfo
//if (info.id === getExtensionId()) {
    console.log(`===== Extension Disabled: id="${info.id}" name="${info.name}" version="${info.version}" disabledReason="${info.disabledReason}"`);
//}
}



messenger.runtime.onInstalled.addListener( async ( { reason, previousVersion } ) => onInstalled(reason, previousVersion) );
messenger.runtime.onStartup.addListener(   async ()                              => onStartup()                          );
messenger.runtime.onSuspend.addListener(   async ()                              => onSuspend()                          );

async function onInstalled(reason, previousVersion) {
  await messenger.browserAction.disable();

  const extId      = getExtensionId("");
  const extName    = getExtensionName("Trash Incinerator");
  const extVersion = getExtensionVersion();

//const options = new TrashIncineratorOptions();
//const isSkipOnboarding = await options.isEnabledSkipOnboarding(); // this call just goes to the local storage to get this option, no logging needed

  if (reason === "update") {
    console.log(`${extId} === EXTENSION ${extName} UPDATED: "${previousVersion}" --> "${extVersion}" ===`); 
  } else if (reason === "install") {
    console.log(`${extId} === EXTENSION ${extName} ${extVersion} INSTALLED ===`); 
  } else { // last option is "browser_update"
    console.log(`${extId} === EXTENSION ${extName} ${extVersion} INSTALLED (browser update) ===`); 
  }

//if (! isSkipOnboarding) {
//  if (reason === "update" /* && previousVersion?.startsWith("3.") */) {
//    messenger.tabs.create({ url: "/onboarding/onboarding.html" });
//    messenger.tabs.create({ url: "/onboarding/changes.html" });
//  } else if (reason === "install") {
//    messenger.tabs.create({ url: "/onboarding/onboarding.html" });
//  }
//}
}

async function onStartup() {
  await messenger.browserAction.disable();

  const extId   = getExtensionId("");
  const extName = getExtensionName("EXTENSION_NAME");
  console.log(`${extId} === EXTENSION ${extName} STARTED ===`); 
}

async function onSuspend() {
  const extId   = getExtensionId("");
  const extName = getExtensionName("EXTENSION_NAME");
  console.log(`${extId} === EXTENSION ${extName} SUSPENDED ===`); 
}



// self-executing async "main" function
(async () => {
  const ti = new TrashIncinerator();
  ti.init();
})()
