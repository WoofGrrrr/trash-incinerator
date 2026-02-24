import { Logger } from './logger.js';
import { getExtensionId, getExtensionName, getExtensionVersion } from './utilities.js';

export class TrashIncineratorOptions {
  #CLASS_NAME        = this.constructor.name;

  #EXTENSION_ID      = getExtensionId();
  #EXTENSION_NAME    = getExtensionName();
  #EXTENSION_VERSION = getExtensionVersion();

  #INFO              = true;
  #LOG               = true;
  #DEBUG             = false;
  #WARN              = true;

  #logger;



  static #DEFAULT_OPTION_KEYS = [
    'tiConfirmIncinerate',
    'tiEmptySubFolders',
    'tiDeleteSubFolders',
    'tiStringOption1',
  ];

  static #DEFAULT_OPTION_VALUES = {
    'tiConfirmIncinerate': true,
    'tiEmptySubFolders':   true,
    'tiDeleteSubFolders':  true,
    'tiStringOption1':     '',
  };

  static {
    Object.freeze(this.#DEFAULT_OPTION_KEYS);
    Object.freeze(this.#DEFAULT_OPTION_VALUES);
  }



  static #optionChangeListeners = [];

  static {
    messenger.storage.onChanged.addListener( async ( storageChanges, areaName ) => { this.#storageChanged(storageChanges, areaName); } );
  }

  static async #storageChanged(storageChanges, areaName) {
////console.debug("storageChanged", `\n- areaName="${areaName}"\n- storageChanges:`, storageChanges);

    if (areaName === 'local') {
      this.#callOptionChangedListeners(storageChanges);
    }
  }

  static addOptionChangeListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error("listener is not a function");
    }

    this.#optionChangeListeners.push(listener);
  }

  static removeOptionChangeListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error("listener is not a function");
    }

    const idx = this.#optionChangeListeners.indexOf(listener);
    if (idx < 0) {
      throw new Error("listener is not in the list of listeners");
    }

    this.#optionChangeListeners.splice(idx, 1);
  }

  static #callOptionChangedListeners(storageChanges) {
    for (const [key, change] of Object.entries(storageChanges)) {
      for (const listener of this.#optionChangeListeners) {
        try {
          listener(key, change.newValue, change.oldValue);
        } catch (ignore) { }
      }
    }
  }



  constructor(logger) {
    this.#logger = logger;
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



  async resetOptions() {
    await messenger.storage.local.clear();
    await this.setupDefaultOptions();
  }



  async setupDefaultOptions() {
    this.debug("setupDefaultOptions -- begin");

    const optionKeys = await messenger.storage.local.get(TrashIncineratorOptions.#DEFAULT_OPTION_KEYS);
    this.debug('setupDefaultOptions: locally stored options:', optionKeys);

    for(const [optionKey, defaultValue] of Object.entries(TrashIncineratorOptions.#DEFAULT_OPTION_VALUES)) {
      if (!(optionKey in optionKeys)) {
        messenger.storage.local.set(
          { [optionKey] : defaultValue}
        );
        this.debug(`setupDefaultOptions: new option: [${optionKey}]: ${defaultValue}`);
      }
    }

    this.debug("setupDefaultOptions -- end");
  }

  static getDefaultOptionNames() {
    return TrashIncineratorOptions.#DEFAULT_OPTION_KEYS;
  }

  static getDefaultOptions() {
    return TrashIncineratorOptions.#DEFAULT_OPTION_VALUES;
  }

  static isDefaultOption(optionName) {
    return TrashIncineratorOptions.#DEFAULT_OPTION_KEYS.includes(optionName);
  }

  static getDefaultOptionValue(optionName) {
    return TrashIncineratorOptions.#DEFAULT_OPTION_VALUES[optionName];
  }





  async isEnabledConfirmIncinerate() {
    const KEY = 'tiConfirmIncinerate';
    return await this.isEnabledOption(KEY, TrashIncineratorOptions.#DEFAULT_OPTION_VALUES[KEY]); 
  }

  async isEnabledEmptySubFolders() {
    const KEY = 'tiEmptySubFolders';
    return await this.isEnabledOption(KEY, TrashIncineratorOptions.#DEFAULT_OPTION_VALUES[KEY]); 
  }

  async isEnabledDeleteSubFolders() {
    const KEY = 'tiDeleteSubFolders';
    return await this.isEnabledOption(KEY, TrashIncineratorOptions.#DEFAULT_OPTION_VALUES[KEY]); 
  }

  async isEnabledOption(key, defaultValue) {
    const options = await messenger.storage.local.get(key); // returns a Promise of an Object with a key-value pair for every key found

    var value = defaultValue;
    if (key in options) {
      value = options[key]; // get the value for the specific key
    }

    return value;
  }



  async getStringOption1(defaultValue) {
    const OPTION_NAME = 'itStringOption1';

    var value = defaultValue;

    const options = await messenger.storage.local.get(OPTION_NAME); // returns a Promise of an Object with a key-value pair for every key found
    if (OPTION_NAME in options) {
      value = options[OPTION_NAME]; // get the value for the specific key
    }

    return value;
  }



  async getAllOptions() {
    return messenger.storage.local.get(); // returns a Promise of an array of Object with a key-value pair for every key found
  }

  async getOption(key, defaultValue) {
    const options = await messenger.storage.local.get(key); // returns a Promise of an Object with a key-value pair for every key found

    var value = defaultValue;
    if (key in options) {
      value = options[key]; // get the value for the specific key
    }

    return value;
  }



  // obj must be object like: {[key], value}
  async storeOption(obj) {
    return messenger.storage.local.set(obj);
  }

  // build object {[key], value} and store it
  async saveOption(key, value) {
    const obj = {[key]: value};
    return await this.storeOption(obj);
  }



  async getWindowBounds(windowName) {
    if (windowName && windowName.length > 0) {
      const allWindowBounds = await this.getOption('windowBounds');
      if (allWindowBounds) return allWindowBounds[windowName];
    }
  }

  async storeWindowBounds(windowName, theWindow) {
    if (windowName && windowName.length > 0 && theWindow) {
      let allWindowBounds = await this.getOption('windowBounds');
      if (! allWindowBounds) allWindowBounds = {};

      const bounds = {
        "top":    theWindow.screenTop,
        "left":   theWindow.screenLeft,
        "width":  theWindow.outerWidth,
        "height": theWindow.outerHeight
      }

      allWindowBounds[windowName] = bounds;

      await this.saveOption('windowBounds', allWindowBounds);

      return bounds;
    }
  }
}
