import { Logger                  } from '../modules/logger.js';
import { TrashIncineratorOptions } from '../modules/options.js';
import { getExtensionId, getI18nMsg, parseDocumentLocation } from '../modules/utilities.js';


class OptionsUI {
  #CLASS_NAME                 = this.constructor.name;
  #EXTENSION_ID               = getExtensionId();

  #INFO                       = true;
  #LOG                        = false;
  #DEBUG                      = false;
  #WARN                       = false;

  #logger                     = new Logger();
  #tiOptionsApi               = new TrashIncineratorOptions(this.#logger);

  #windowMode                 = false; // are we running in a popup window??? (from the windowMode parameter in our URL)
  #windowModeRequestedBy      = null;

  #popupWindow                = null;



  constructor() {
    // everything is #private now, so nothing to do
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
    this.#logger.warnAlways(this.CLASS_NAME, ...info);
  }

  error(...info) {
    // always log errors
    this.#logger.error(this.CLASS_NAME, ...info);
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



  async init(e) {
    this.debug("-- begin");

    const docLocationInfo = parseDocumentLocation(document);
    const params          = docLocationInfo.params;
    if (params) {
      const windowMode = params.get('windowMode');
      this.debug(`-- windowMode="${windowMode}"`);

      this.#windowMode = (windowMode === 'true') ? true : false;

      if (this.#windowMode) {
        const requestedBy = params.get('requestedBy');
        this.debug(`-- windowMode requestedBy="${requestedBy}"`);
        if ((typeof requestedBy === 'string') && requestedBy.length > 0) {
          this.#windowModeRequestedBy = requestedBy;
        }
      }
    }

    await this.localizePage();
    await this.applyTooltips(document);
    await this.buildUI();
    await this.setupListeners();

    this.debug("-- end");
  }



  async localizePage() { // we could pass this the Document and then we could move it to utilities.js
    this.debug("-- start");

    for (const el of document.querySelectorAll("[data-l10n-id]")) {
      const id = el.getAttribute("data-l10n-id");
      const i18nMessage = getI18nMsg(id);
      el.textContent = i18nMessage;
    }

    for (const el of document.querySelectorAll("[data-html-l10n-id]")) {
      const id = el.getAttribute("data-html-l10n-id");
      const i18nMessage = getI18nMsg(id);
      el.insertAdjacentHTML('afterbegin', i18nMessage);
    }

    this.debug("-- end");
  }



  async applyTooltips(theDocument) { // we could move this to utilities.js
    this.debug("-- start");

    for (const el of theDocument.querySelectorAll("[tooltip-l10n-id]")) {
      const id = el.getAttribute("tooltip-l10n-id");
      const i18nMessage = getI18nMsg(id);
      el.setAttribute("title", i18nMessage);
    }

    this.debug("-- end");
  }



  async setupListeners() {
    this.debug(`-- start -- windowMode=${this.#windowMode}`);

    document.addEventListener( "change", (e) => this.optionChanged(e) );   // One of the checkboxes or radio buttons was clicked or a select has changed
    document.addEventListener( "click",  (e) => this.actionClicked(e) );   // An Actions button was clicked (or a label, since <label for="xx"> does not work)

    if (this.#windowMode) {
      this.debug("-- Adding beforeunload Window Event Listener");
      window.addEventListener("beforeunload", (e) => this.windowUnloading(e));
    } else {
      this.debug("-- Adding onRemoved messenger.windows Event Listener");
      messenger.windows.onRemoved.addListener( async ( windowId ) => { this.popupWindowRemoved(windowId); } );
    }

    this.debug("-- end");
  }



  async buildUI() {
    this.debug("-- start");

    this.resetErrors();

    if (this.#windowMode) {
      const showPopupButton = document.getElementById('tiOptionPopupButton');
      if (showPopupButton) {
        showPopupButton.style.setProperty('display', 'none');
      }
      const doneButton = document.getElementById('tiDoneButton');
      if (doneButton) {
        doneButton.style.setProperty('display', 'inline-block');
      }
    } else {
      const showPopupButton = document.getElementById('tiOptionPopupButton');
      if (showPopupButton) {
        showPopupButton.style.setProperty('display', 'inline-block');
      }
      const doneButton = document.getElementById('tiDoneButton');
      if (doneButton) {
        doneButton.style.setProperty('display', 'none');
      }
    }

    await this.updateOptionsUI();

    this.debug("-- end");
  }






  async refreshUI(e) { // the event is not used - is it even useful?
    this.debug("-- start");

    this.debug("-- end");
  }



  async updateOptionsUI() {
    this.debug("-- start");

    const options = await this.#tiOptionsApi.getAllOptions();

    this.debug("-- sync options to UI");
    for (const [optionName, optionValue] of Object.entries(options)) {
      this.debug("-- option: ", optionName, "value: ", optionValue);

      if (TrashIncineratorOptions.isDefaultOption(optionName)) { // MABXXX WHY DOES IT HAVE TO BE A "DEFAULT" OPTION???
        const optionElement = document.getElementById(optionName);

        if (optionElement && optionElement.classList.contains("tiGeneralOption")) {
          if (optionElement.tagName === 'INPUT') {
            if (optionElement.type === 'checkbox') {
              optionElement.checked = optionValue;
            } else if (optionElement.type === 'radio') { // we need to manually un-check the other buttons in the radio group
              optionElement.value = optionValue;
            } else if (optionElement.type === 'text') {
              // we don't handle this yet...
              optionElement.value = optionValue;
            }
          } else if (optionElement.tagName === 'SELECT') {
            optionElement.value = optionValue;
            switch (optionElement.id) {
              case 'XXX': {
                  break;
                }
              default:
            }
          }
        }
      }
    }

    this.debug("-- end");
  }



  async windowUnloading(e) {
    if (this.#DEBUG) this.debugAlways( "WINDOW UNLOADING ---"
                                      + `\n- this.#windowMode=${this.#windowMode}`
                                      + `\n- window.screenTop=${window.screenTop}`
                                      + `\n- window.screenLeft=${window.screenLeft}`
                                      + `\n- window.outerWidth=${window.outerWidth}`
                                      + `\n- window.outerHeight=${window.outerHeight}`
                                    );

    // We should NOT even have been called unless windowMode=true,
    // otherwise we would NOT have been added as a listnener in the first place, no???
    // But what the heck...
    if (this.#windowMode) {
      await this.#tiOptionsApi.storeWindowBounds("optionsWindowBounds", window);

      if (this.#DEBUG) {
        const bounds = await this.#tiOptionsApi.getWindowBounds("optionsWindowBounds");

        if (! bounds) {
          this.debugAlways("WINDOW UNLOADING --- Retrieve Stored Window Bounds - FAILED TO GET bounds ---");
        } else if (typeof bounds !== 'object') {
          this.error(`--- WINDOW UNLOADING --- Retrieve Stored Window Bounds - bounds IS NOT AN OBJECT: typeof='${typeof bounds}' ---`);
        } else {
          this.debugAlways( "--- Retrieve Stored Window Bounds ---"
                            + `\n- bounds.top:    ${bounds.top}`
                            + `\n- bounds.left:   ${bounds.left}`
                            + `\n- bounds.width:  ${bounds.width}`
                            + `\n- bounds.height: ${bounds.height}`
                          );
        }
      }

      // Tell Thunderbird to close the window
      e.returnValue = '';  // any "non-truthy" value will do
      return false;

    } else { // this should never happen
      this.#popupWindow = null;

      const optionsPanel = document.getElementById("tiExtensionOptionsPanel");
      if (! optionsPanel) {
      } else {
        optionsPanel.style.setProperty('visibility', 'visible');
      }
    }
  }



  async popupWindowRemoved(windowId) {
    this.debug( "--- WINDOW REMOVED ---"
                + `\n- windowId="${windowId}"`
                + `\n- this.#popupWindow.id="${this.#popupWindow ? this.#popupWindow.id : "(NONE)"}"`
                + `\n- this.#windowMode=${this.#windowMode}`
              );

    // We should have been called only if NOT windowMode=true,
    // otherwise we would NOT have been added as a listnener in the first place, no???
    // But what the heck...
    if (! this.#popupWindow) { // it's a windowRemoved event for some other window
      this.debug( "--- NO POPUP WINDOW ---");
    } else if (windowId !== this.#popupWindow.id) { // it's a windowRemoved event for some other window
      this.debug( "--- WINDOW ID MISMATCH ---");
    } else {
      this.#popupWindow = null;

      if (this.#windowMode) {
        this.error( "--- POPUP WINDOW MODE ---");

      } else {
        this.debug( "--- GETTING OPTIONS PANEL ---");
        const optionsPanel = document.getElementById("tiExtensionOptionsPanel");
        if (! optionsPanel) {
          this.error( "--- FAILED TO GET OPTIONS PANEL ---");
        } else {
          this.debug( "--- GOT OPTIONS PANEL ---");
          await this.updateOptionsUI();
          optionsPanel.style.setProperty('visibility', 'visible');
        }
      }
    }
  }



  // One of the Options checkboxes or radio buttons (etc) has been clicked or a select has changed
  async optionChanged(e) {
    if (e == null) return;
    this.debug(`-- tagName="${e.target.tagName}" type="${e.target.type}" tiGeneralOption? ${e.target.classList.contains("tiGeneralOption")} id="${e.target.id}"`);

    this.resetErrors();

    var target = e.target;
    if ( target.tagName == "INPUT"
         && target.classList.contains("tiGeneralOption")
         && ( target.type == "checkbox"
              || target.type == "radio"
            )
       )
    {
      const optionName  = target.id;
      const optionValue = target.checked;

      /* if it's a radio button, set the values for all the other buttons in the group to false */
      if (target.type == "radio") { // is it a radio button?
        this.debug(`-- radio buttton selected ${optionName}=<${optionValue}> - group=${target.name}`);

        // first, set this option
        this.debug(`-- Setting Radio Option {[${optionName}]: ${optionValue}}`);
        await this.#tiOptionsApi.saveOption(optionName, optionValue);

        // get all the elements with the same name, and if they're a radio, un-check them
        if (target.name) { /* && (optionValue == true || optionValue == 'true')) { Don't need this. Event fired *ONLY* when SELECTED, i.e. true */
          const radioGroupName = target.name;
          const radioGroup = document.querySelectorAll(`input[type="radio"][name="${radioGroupName}"]`);
          if (! radioGroup) {
            this.debug('-- no radio group found');
          } else {
            this.debug(`-- radio group members length=${radioGroup.length}`);
            if (radioGroup.length < 2) {
              this.debug('-- no radio group members to reset (length < 2)');
            } else {
              for (const radio of radioGroup) {
                if (radio.id != optionName) { // don't un-check the one that fired
                  this.debug(`-- resetting radio button {[${radio.id}]: false}`);
                  await this.#tiOptionsApi.saveOption(radio.id, false);
                }
              }
            }
          }
        }
      } else { // since we already tested for it, it's got to be a checkbox
        this.debug(`-- Setting Checkbox Option {[${optionName}]: ${optionValue}}`);
        await this.#tiOptionsApi.saveOption(optionName, optionValue);

        // special processing for these checkboxes
        switch (optionName) {
        }
      }
    } else if ( target.tagName === 'SELECT'
                && target.classList.contains("tiGeneralOption")
              )
    {
      const optionName  = target.id;
      const optionValue = target.value;

      switch (optionName) {
        case 'XXX': {
          break;
        }
      }

      this.debug(`-- Setting Select Option {[${optionName}]: ${optionValue}}`);
      await this.#tiOptionsApi.saveOption(optionName, optionValue);
    }
  }




  // an Action button was clicked - refesh, allow/disallow all, allow/disallow selected, add, delete selected, etc
  // or a label was clicked, so check it has a for="" attribute,
  // or the extension settings title was clicked
  async actionClicked(e) {
    this.debug('--');
    if (e == null) return;

    this.resetErrors();

    this.debug(`-- tagName="${e.target.tagName}" id="${e.target.id}"`);

    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'LABEL') {
      this.debug(`-- BUTTON OR LABEL CLICKED tagName="${e.target.tagName}" id="${e.target.id}"`);

      // I thought the browser was supposed to take care of this <label> with a "for" attribute stuff...
      if (e.target.tagName === 'LABEL' && ! e.target.parentElement || e.target.parentElement.tagName !== 'BUTTON') {
        // ignore it - let optionChanged() handle it
      } else {
        e.preventDefault();

        var button;
        if (e.target.tagName === 'LABEL') {
          button = e.target.parentElement;
        } else {
          button = e.target;
        }
        this.debug(`-- BUTTON CLICKED tagName="${button.tagName}" id="${button.id}"`);

        const buttonId = button.id;
        if (buttonId) switch (buttonId) {
          case "tiOptionPopupButton":
            await this.displayOptionsAsPopupButtonClicked(e);
            break;
          case "tiDoneButton":
            await this.doneButtonClicked(e);
            break;
//        case "tiRefreshListButton":
//          await this.refreshUI(e);
//          break;
          default:
            this.debug(`-- NOT OUR BUTTON -- tagName="${e.target.tagName}" id="${e.target.id}"`);
        }
      }
    } else if (e.target.tagName == "DIV") {
//    this.debug(`-- DIV CLICKED id="${e.target.id}"`);
//
//    const divId = e.target.id;
//    if (divId == "tiExtensionOptionsTitle") {
//      await this.extensionOptionsTitleDivClicked(e);
//    }
    } else {
      // otherwise we don't care about this click
    }
  }



  async displayOptionsAsPopupButtonClicked(e) {
    e.preventDefault();

    this.resetErrors();

    await this.showPopupWindow("OptionsUI");
  }


  async doneButtonClicked(e) {
    e.preventDefault();

    // messenger.windows.remove(windowId); // how do we get our own windowId???
    window.close();
  }



  async windowFocusChanged(windowId, creatorTabId, creatorWindowId, extensionChooserWindowId) {
    const lastFocusedWindow = await messenger.windows.getLastFocused();
    var   lastFocusedWindowId;
    if (lastFocusedWindow) lastFocusedWindowId = lastFocusedWindow.id;

    this.debug(     "- windowId="                 + windowId
                + "\n- this.prevFocusedWindowId=" + this.prevFocusedWindowId
                + "\n- lastFocusedWindowId="      + lastFocusedWindowId
                + "\n- creatorTabId="             + creatorTabId
                + "\n- creatorWindowId="          + creatorWindowId
                + "\n- extensionChooserWindowId=" + extensionChooserWindowId
              );

    if ( windowId
         && windowId                 != messenger.windows.WINDOW_ID_NONE
         && windowId                 != extensionChooserWindowId
         && windowId                 == creatorWindowId
/////////&& creatorWindowId          != lastFocusedWindowId
         && extensionChooserWindowId
/////////&& extensionChooserWindowId != lastFocusedWindowId
         && extensionChooserWindowId != this.prevFocusedWindowId
       )
    {
      this.debug( "-- Creator Window got focus, bring Extension Chooserr Window into focus above it --"
                  + "\n- creatorTabId="             + creatorTabId
                  + "\n- creatorWindowId="          + creatorWindowId
                  + "\n- extensionChooserWindowId=" + extensionChooserWindowId
                );
      try {
        await messenger.windows.update(extensionChooserWindowId, { focused: true });
      } catch (error) {
        this.caught(error, "-- PERHAPS WINDOW CLOSED???");
      }
    }

    if (windowId !== messenger.windows.WINDOW_ID_NONE) this.prevFocusedWindowId = windowId;
  }



  resetErrors() {
    const errorDivs = document.querySelectorAll("div.option-error");
    if (errorDivs) {
      for (const errorDiv of errorDivs) {
        errorDiv.setAttribute("error", "false");
      }
    }

    const errorLabels = document.querySelectorAll("label.option-error-text");
    if (errorLabels) {
      for (const errorLabel of errorLabels) {
        errorLabel.setAttribute("error", "false");
        errorLabel.innerText = ""; // THIS IS A HUGE LESSON:  DO NOT USE: <label/>   USE: <label></label> 
      }
    }
  }

  setErrorFor(elementId, msgId) {
    if (elementId && msgId) {
      const errorDiv = document.querySelector("div.option-error[error-for='" + elementId + "']");
      if (errorDiv) {
        errorDiv.setAttribute("error", "true");
      }

      const errorLabel = document.querySelector("label.option-error-text[error-for='" + elementId + "']");
      if (errorLabel) {
        const i18nMessage = getI18nMsg(msgId);
        errorLabel.innerText = i18nMessage;
      }
    }
  }



  // open ourself as a popup window
  async showPopupWindow(requestedBy) {
    if (this.#windowMode) {
      this.error("Attempt to display popup window in windowMode");
      return;
    }

    var   popupLeft   = 100;
    var   popupTop    = 100;
    var   popupHeight = 350;
    var   popupWidth  = 500;
    const mainWindow  = await messenger.windows.getCurrent();

    if (! mainWindow) {
      this.debug("-- DID NOT GET THE CURRENT (MAIN, mail:3pane) WINDOW!!! ---");
    } else {
      this.debug( "-- Got the Current (Main, mail:3pane) Window:"
                  + `\n- mainWindow.top=${mainWindow.top}`
                  + `\n- mainWindow.left=${mainWindow.left}`
                  + `\n- mainWindow.height=${mainWindow.height}`
                  + `\n- mainWindow.width=${mainWindow.width}`
                );
      popupTop  = mainWindow.top  + 100;
      popupLeft = mainWindow.left + 100;
//////if (mainWindow.height - 200 > popupHeight) popupHeight = mainWindow.height - 200;   // make it higher, but not shorter --- eh, don't need it higher
//////if (mainWindow.Width  - 200 > popupWidth)  popupWidth  = mainWindow.width  - 200;   // make it wider,  but not narrower --- eh, don't need it wider
    }

    const bounds = await this.#tiOptionsApi.getWindowBounds("optionsWindowBounds");

    if (true|| ! bounds) {
      this.debug("-- no previous window bounds");
    } else if (typeof bounds !== 'object') {
      this.error(`-- PREVIOUS WINDOW BOUNDS IS NOT AN OBJECT: typeof='${typeof bounds}' #####`);
    } else {
      this.debug( " -- restoring previous window bounds:"
                  + `\n- bounds.top=${bounds.top}`
                  + `\n- bounds.left=${bounds.left}`
                  + `\n- bounds.width=${bounds.width}`
                  + `\n- bounds.height=${bounds.height}`
                );
      popupTop    = bounds.top;
      popupLeft   = bounds.left;
      popupWidth  = bounds.width;
      popupHeight = bounds.height;
    }

    this.debug( "-- window bounds:"
                + `\n- popupTop=${popupTop}`
                + `\n- popupLeft=${popupLeft}`
                + `\n- popupWidth=${popupWidth}`
                + `\n- popupHeight=${popupHeight}`
              );

    const requestedByParam = ((typeof requestedBy === 'string') && requestedBy.length > 0)
                             ? `&requestedBy=${encodeURIComponent(requestedBy)}`
                             : '';

    // "?windowMode=true" tells us we're running as a pop window
    const optionsUrl = messenger.runtime.getURL( "optionsUI/optionsUI.html") + "?windowMode=true" + requestedByParam;
    this.debug(`-- optionsUrl="${optionsUrl}"`);

    this.#popupWindow = await messenger.windows.create(
      {
        url:                 optionsUrl,
        type:                "popup",
        titlePreface:        getI18nMsg("extensionName", "Options") + " - ",
        top:                 popupTop,
        left:                popupLeft,
        height:              popupHeight,
        width:               popupWidth,
        allowScriptsToClose: true,
      }
    );

    this.debug(`-- OptionsUI Popup Window Created -- windowId="${this.#popupWindow.id}" URL="${optionsUrl}"`);


    const optionsPanel = document.getElementById("tiExtensionOptionsPanel");
    if (! optionsPanel) {
    } else {
      optionsPanel.style.setProperty('visibility', 'hidden');
    }
  }



  getScrollPosition() {
    return {
      x: window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft,
      y: window.scrollY || document.documentElement.scrollTop  || document.body.scrollTop
    };
  }

  setScrollPosition(position) {
    window.scrollTo(position.x, position.y);
  }
}



var optionsUI  = new OptionsUI();

document.addEventListener("DOMContentLoaded", (e) => optionsUI.init(e), {once: true} );
