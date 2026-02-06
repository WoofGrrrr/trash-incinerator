import { Logger     } from '../modules/logger.js';
import { TrashIncineratorOptions } from '../modules/options.js';
import { getI18nMsg, parseDocumentLocation } from '../modules/utilities.js';

class ConfirmDialog {
  #CLASS_NAME   = this.constructor.name;

  #INFO         = false;
  #LOG          = false;
  #DEBUG        = false;
  #WARN         = false;

  #logger       = new Logger();
  #tiOptionsApi = new TrashIncineratorOptions(this.#logger);


  constructor() {
    this.windowName = "confirmDialogWindow";
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

  error(...info) {
    // always log errors
    this.#logger.error(this.#CLASS_NAME, ...info);
  }

  caught(e, ...info) {
    // always log exceptions
    this.#logger.error( this.#CLASS_NAME,
                       msg,
                       "\n name:    " + e.name,
                       "\n message: " + e.message,
                       "\n stack:   " + e.stack,
                       ...info
                     );
  }



  async run(e) {
    window.addEventListener("beforeunload", (e) => this.windowUnloading(e));

    const thisWindow = await messenger.windows.getCurrent();
    messenger.windows.onRemoved.addListener((windowId) => this.windowRemoved(windowId, thisWindow.id));
    


    const okButtonLabelMsgId     = "tiConfirmDialog_okButton.label";       // OK Button label message ID
    const cancelButtonLabelMsgId = "tiConfirmDialog_cancelButton.label";   // CANCEL Button label message ID
    const yesButtonLabelMsgId    = "tiConfirmDialog_yesButton.label";      // YES Button label message ID
    const noButtonLabelMsgId     = "tiConfirmDialog_noButton.label";       // NO Button label message ID

    var   buttons_3              = false;
    var   title                  = getI18nMsg("tiConfirmDialogTitle", "Please Confirm"); // default dialog  title
    var   message1;
    var   message2;
    var   message3;
    var   message4;
    var   message5;
    var   message6;

    var   button1LabelMsgId      = okButtonLabelMsgId;       // default button1 label message ID
    var   button2LabelMsgId      = cancelButtonLabelMsgId;   // default button2 label message ID
    var   button3LabelMsgId

    var   button1LabelText;
    var   button2LabelText;
    var   button3LabelText;

    const docLocationInfo = parseDocumentLocation(document);
    const params          = docLocationInfo.params;
    if (params) {
      var param;

      param = params.get('windowName');
      if (param) this.windowName = param;

      param = params.get('title');
      if (param) title = param;

      param = params.get('message1');
      if (param) message1 = param;

      param = params.get('message2');
      if (param) message2 = param;

      param = params.get('message3');
      if (param) message3 = param;

      param = params.get('message4');
      if (param) message4 = param;

      param = params.get('message5');
      if (param) message5 = param;

      param = params.get('message6');
      if (param) message6 = param;

      param = params.get('yes_no');
      if (param && param === 'true') {
        buttons_3         = false; // buttons_3 and yes_no_cancel override this
        button1LabelMsgId = yesButtonLabelMsgId;
        button2LabelMsgId = noButtonLabelMsgId;
      }

      param = params.get('yes_no_cancel');
      if (param && param === 'true') {
        buttons_3         = true;
        button1LabelMsgId = yesButtonLabelMsgId;
        button2LabelMsgId = noButtonLabelMsgId;
        button3LabelMsgId = cancelButtonLabelMsgId;
      }

      param = params.get('buttons_3');
      if (param && param === 'true') buttons_3 = true;

      // buttonX and buttonXMsgId override all presents

      param = params.get('button1'); // button1 overrides button1MsgId
      if (param) button1LabelText = param;

      param = params.get('button1MsgId');
      if (param) button1LabelMsgId = param;

      param = params.get('button2'); // button2 overrides button2MsgId
      if (param) button2LabelText = param;

      param = params.get('button2MsgId');
      if (param) button2LabelMsgId = param;

      // button3 and button3Msg are ignored if no buttons_3 or yes_no_cancel
      param = params.get('button3'); // button3 overrides button3MsgId
      if (param) button3LabelText = param;

      param = params.get('button3MsgId');
      if (param) button3LabelMsgId = param;
    }

    if (! button1LabelText && button1LabelMsgId) button1LabelText = getI18nMsg(button1LabelMsgId, "BUTTON_1"); // button1 overrides button1MsgId
    if (! button2LabelText && button2LabelMsgId) button2LabelText = getI18nMsg(button2LabelMsgId, "BUTTON_2"); // button2 overrides button2MsgId
    if (! button3LabelText && button3LabelMsgId) button3LabelText = getI18nMsg(button3LabelMsgId, "BUTTON_3"); // button3 overrides button3MsgId

    if (! button2LabelText) button1LabelText = "BUTTON_1";
    if (! button2LabelText) button2LabelText = "BUTTON_2";
    if (! button3LabelText) button3LabelText = "BUTTON_3";

    const titleLabel = document.getElementById("ConfirmDialogTitleLabel");
    titleLabel.innerText = title;

    this.debug( "\n---",
                `\n- windowName="${this.windowName}"`,
                `\n- message1="${message1}"`,
                `\n- message2="${message2}"`,
                `\n- message3="${message3}"`,
                `\n- message4="${message4}"`,
                `\n- message5="${message5}"`,
                `\n- message6="${message6}"`,
                `\n- buttons_3=${buttons_3}`,
                `\n- button1LabelText="${button1LabelText}"`,
                `\n- button2LabelText="${button2LabelText}"`,
                `\n- button3LabelText="${button3LabelText}"`,
              );

    // MABXXX we could always build the messages instead... perhaps indicate how many to build.  Same with buttons?
    const message1Panel = document.getElementById("ConfirmDialogMessage1Panel");
    if (message1 != undefined) {
      message1Panel.style.display = "block";
      const message1Label = document.getElementById("ConfirmDialogMessage1Label");
      if (message1 === " ") message1Label.innerHTML = "&nbsp;";
      else                  message1Label.innerText = message1;
    } else {
      message1Panel.style.display = "none";
    }

    const message2Panel = document.getElementById("ConfirmDialogMessage2Panel");
    if (message2 != undefined) {
      message2Panel.style.display = "block";
      const message2Label = document.getElementById("ConfirmDialogMessage2Label");
      if (message2 === " ") message2Label.innerHTML = "&nbsp;";
      else                  message2Label.innerText = message2;
    } else {
      message2Panel.style.display = "none";
    }

    const message3Panel = document.getElementById("ConfirmDialogMessage3Panel");
    if (message3 != undefined) {
      message3Panel.style.display = "block";
      const message3Label = document.getElementById("ConfirmDialogMessage3Label");
      if (message3 === " ") message3Label.innerHTML = "&nbsp;";
      else                  message3Label.innerText = message3;
    } else {
      message3Panel.style.display = "none";
    }

    const message4Panel = document.getElementById("ConfirmDialogMessage4Panel");
    if (message4 != undefined) {
      message4Panel.style.display = "block";
      const message4Label = document.getElementById("ConfirmDialogMessage4Label");
      if (message4 === " ") message4Label.innerHTML = "&nbsp;";
      else                  message4Label.innerText = message4;
    } else {
      message4Panel.style.display = "none";
    }

    const message5Panel = document.getElementById("ConfirmDialogMessage5Panel");
    if (message5 != undefined) {
      message5Panel.style.display = "block";
      const message5Label = document.getElementById("ConfirmDialogMessage5Label");
      if (message5 === " ") message5Label.innerHTML = "&nbsp;";
      else                  message5Label.innerText = message5;
    } else {
      message5Panel.style.display = "none";
    }

    const message6Panel = document.getElementById("ConfirmDialogMessage6Panel");
    if (message6 != undefined) {
      message6Panel.style.display = "block";
      const message6Label = document.getElementById("ConfirmDialogMessage6Label");
      if (message6 === " ") message6Label.innerHTML = "&nbsp;";
      else                  message6Label.innerText = message6;
    } else {
      message6Panel.style.display = "none";
    }

    const button1Label = document.getElementById("ConfirmDialogButton1Label");
    button1Label.textContent = button1LabelText;

    const button2Label = document.getElementById("ConfirmDialogButton2Label");
    button2Label.textContent = button2LabelText;

    if (buttons_3) {
      const button3Label = document.getElementById("ConfirmDialogButton3Label");
      button3Label.textContent = button3LabelText;
    }

    const button1 = document.getElementById("ConfirmDialogButton1");
    button1.addEventListener( "click", (e) => this.buttonClicked(e) );

    const button2 = document.getElementById("ConfirmDialogButton2");
    button2.addEventListener( "click", (e) => this.buttonClicked(e) );

    const button3 = document.getElementById("ConfirmDialogButton3");
    if (buttons_3) {
      button3.style.display = "inline-block";
      button3.addEventListener( "click", (e) => this.buttonClicked(e) );
    } else {
      button3.style.display = "none";
    }


    await this.localizePage();
  }



  async localizePage() {
    this.debug("-- start");

    for (const el of document.querySelectorAll("[data-l10n-id]")) {
      const id = el.getAttribute("data-l10n-id");
      let i18nMessage = browser.i18n.getMessage(id);
      if (i18nMessage == "") {
        i18nMessage = id;
      }
      el.textContent = i18nMessage;
    }

    for (const el of document.querySelectorAll("[data-html-l10n-id]")) {
      const id = el.getAttribute("data-html-l10n-id");
      let i18nMessage = browser.i18n.getMessage(id);
      if (i18nMessage == "") {
        i18nMessage = id;
      }
      el.insertAdjacentHTML('afterbegin', i18nMessage);
    }

    this.debug("-- end");
  }
  


  async windowUnloading(e) {
    if (this.DEBUG) this.debugAlways( "\n--- Window Unloading ---",
                                      `\n- window.screenTop=${window.screenTop}`,
                                      `\n- window.screenLeft=${window.screenLeft}`,
                                      `\n- window.outerWidth=${window.outerWidth}`,
                                      `\n- window.outerHeight=${window.outerHeight}`,
                                      `\n- windowName=${this.windowName}`,
                                    );

    await this.#tiOptionsApi.storeWindowBounds(this.windowName, window);

    if (this.DEBUG) {
      const bounds = await this.#tiOptionsApi.getWindowBounds(this.windowName);

      if (! bounds) {
        this.debugAlways("--- WINDOW UNLOADING --- Retrieve Stored Window Bounds --- FAILED TO GET Backup Manager Window Bounds ---");
      } else if (typeof bounds !== 'object') {
        this.debugAlways(`--- WINDOW UNLOADING --- Retrieve Stored Window Bounds --- Backup Manager Window Bounds IS NOT AN OBJECT: typeof='${typeof bounds}' ---`);
      } else {
        this.debugAlways( "\n--- Retrieve Stored Window Bounds ---",
                          `\n- bounds.top:    ${bounds.top}`,
                          `\n- bounds.left:   ${bounds.left}`,
                          `\n- bounds.width:  ${bounds.width}`,
                          `\n- bounds.height: ${bounds.height}`,
                        );
      }
    }

    // Tell Thunderbird to close the window
    e.returnValue = '';  // any "non-truthy" value will do
    return false;
  }



  async windowRemoved(windowId, thisWindowId) {
    this.debug(`-- windowId="${windowId}" thisWindowId="${thisWindowId}" `);


    if (true) { // <==========================================================================================<<<
      // sending the message causes the "'Conduits' destroyed" error mentioned below.
      // they'll just have to listen for the onRemoved() event.
    } else {
      const responseMessage = "CLOSED";
      this.debug(`-- Sending responseMessage="${responseMessage}"`);

      try { // just in case the window is not listening for windowRemoved (any more)
        // maybe not the best idea to do this... message receiver gets:
        //     Promise rejected after context unloaded: Actor 'Conduits' destroyed before query 'RuntimeMessage' was resolved
        await messenger.runtime.sendMessage(
          { ConfirmDialogResponse: responseMessage }
        );
      } catch (error) {
        // any need to tell the user???
        this.caught( error,
                     "##### SEND RESPONSE MESSAGE FAILED #####"
                     + `\n- windowId="${windowId}"`
                     + `\n- thisWindowId="${thisWindowId}"`
                     + `\n- responseMessage="${responseMessage}"`
                   );
      }
    }
  }




  async buttonClicked(e) {
    this.debug(`-- e.target.tagName="${e.target.tagName}" e.target.id="${e.target.id}"`);

    e.preventDefault();

    var target = e.target;
    if (target.tagName === 'LABEL' && target.parentElement && target.parentElement.tagName === 'BUTTON') {
      target = target.parentElement;
    }
    this.debug(`-- target.tagName="${target.tagName}" target.id="${target.id}" button-id="${target.getAttribute('button-id')}"`);

      // it's up to the caller what the button-id -- 'BUTTON_1', 'BUTTON_2', or 'BUTTON_3' -- means
    var responseMessage = target.getAttribute('button-id');
    this.debug(`-- Sending responseMessage="${responseMessage}"`);

    try {
      await messenger.runtime.sendMessage(
        { ConfirmDialogResponse: responseMessage }
      );
    } catch (error) {
      // any need to tell the user???
      this.caught( error,
                   "##### SEND RESPONSE MESSAGE FAILED #####"
                   + `\n- responseMessage="${responseMessage}"`
                 );
    }

    this.debug("-- Closing window");
    window.close();
  }
}



const confirmDialog = new ConfirmDialog();

document.addEventListener("DOMContentLoaded", (e) => confirmDialog.run(e), {once: true});
