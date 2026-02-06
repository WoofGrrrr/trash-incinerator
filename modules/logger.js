import { getExtensionId } from './utilities.js';

export class Logger {
  /* one day I hope to use options to set the logging levels */
  /* listen for some type of changed event to know if logging levels changed */

  #EXTENSION_ID;
  


  constructor(useManifestId, extId) {
    this.#EXTENSION_ID = extId;

    if (typeof useManifestId === 'undefined') useManifestId = true;
    if (useManifestId) this.#EXTENSION_ID = getExtensionId(extId);
    
    this.#EXTENSION_ID = this.#EXTENSION_ID ? this.#EXTENSION_ID : ''; // make sure it's not undefined or null
  }



  logStackTrace(...info) {
    const context = info.shift();
    var tag       = this.getTag(context);
    console.log(tag, ...info);

    const error      = new Error();
    const stackLines = Logger.parseStackTrace(error);

    for (const stackLine of stackLines) {
      if (stackLine.unparsed) {
        console.log(`*** unparsed: "${stackLine.unparsed}"`);
      } else {
        console.log(`*** func: ${stackLine.func}, file: ${stackLine.file}, line: ${stackLine.line}, col: ${stackLine.col}`);
      }
    }

    const callerInfo = Logger.getCallerInfo(error);
    if (! callerInfo) {
      console.log("=== NO CALLER INFO");
    } else {
      console.log(`=== CALLER INFO func: ${callerInfo.func}, file: ${callerInfo.file}, line: ${callerInfo.line}, col: ${callerInfo.col}`);
    }
  }

  

  info(...info) { /* eventually there should be an option for this */
    const context = info.shift();
    const tag     = this.getTag(context);
    console.info(tag, ...info);
  }

  infoAlways(...info) {
    const context = info.shift();
    const tag     = this.getTag(context);
    console.info(tag, ...info);
  }

  log(...info) { /* eventually there should be an option for this */
    const context = info.shift();
    const tag     = this.getTag(context);
    console.log(tag, ...info);
  }

  logAlways(...info) {
    const context = info.shift();
    const tag     = this.getTag(context);
    console.log(tag, ...info);
  }

  debug(...info) { /* eventually there should be an option for this */
    const context = info.shift();
    const tag     = this.getTag(context);
    console.debug(tag, ...info);
  }

  debugAlways(...info) {
    const context = info.shift();
    const tag     = this.getTag(context);
    console.debug(tag, ...info);
  }

  warn(...info) { /* eventually there should be an option for this */
    const context = info.shift();
    const tag     = this.getTag(context);
    console.warn(tag, ...info);
  }

  warnAlways(...info) {
    const context = info.shift();
    const tag     = this.getTag(context);
    console.warn(tag, ...info);
  }

  error(...info) { /* ALWAYS get logged */
    const context = info.shift();
    const tag     = this.getTag(context);
    console.error(tag, ...info);
  }




  getTag(context) {
    var tag = `${this.#EXTENSION_ID} ${context}`;
    const callerInfo = Logger.getCallerInfo();
    if (callerInfo) {
      tag = `${this.#EXTENSION_ID} ${context}#${callerInfo.func} ${callerInfo.file}:${callerInfo.line}:${callerInfo.col}`;
    }
    return tag;
  }



  static getCallerInfo() {
    const stackLines = Logger.parseStackTrace(new Error(), 1);
    if (! stackLines || stackLines.length < 1) {
      return null;
    }

    return stackLines[0];
  }



  static parseStackTrace(error, limit) {
    const STACKLINE_MATCH_PATTERN = /^([^@]+)@.+\/\/[^\/]*\/([^:]+):(\d*):(\d*).*$/; 
    /* Extract function name, file path, line number, and column number
     *
     * ^ - beginning of string
     *
     * group #1: 1 or more not '@' (function name)
     *
     * '@'
     *
     * 1 or more characters (e.g. "moz-extension:") - perhaps should be one or more not slash
     *
     * two slashes
     *
     * 0 or more not slashes (extension GUID)
     *
     * one slash
     *
     * group #2: 1 or more not ':' (file path)
     *
     * ':'
     *
     * group #3: 0 or more digits 0-9 (line number)
     *
     * ':'
     *
     * group #4: 0 or more digits 0-9 (column number)
     *
     * 0 or more characters
     *
     * $ - end of string
     */
    if (typeof limit !== 'number' || ! Number.isInteger(limit) || limit < 0) limit = 0;

    const stackLines  = error.stack.split('\n');
    const parsedLines = [];
    var   count       = 0;
    var   skipping    = true;

    for (const stackLine of stackLines) {
      const stackLineMatch = stackLine.match(STACKLINE_MATCH_PATTERN);

      if (! stackLineMatch) {
////////console.log(`*** NO STACKLINE MATCH: ${stackLine}`);
          parsedLines.push( { 'unparsed': stackLine } );

      } else {
        const func = stackLineMatch[1] === 'eval' ? 'anonymous' : stackLineMatch[1];
        const file = stackLineMatch[2] || 'unknown';
        const line = stackLineMatch[3] || '*';
        const col  = stackLineMatch[4] || '*';

        if (skipping && file !== 'modules/logger.js') { // don't include our own functions
          switch (func) {
            case 'logStackTrace': // calling classes might/should be calling from these functions to be skipped - maybe use a "__" marker instead?
            case 'info':
            case 'infoAlways':
            case 'log':
            case 'logAlways':
            case 'debug':
            case 'debugAlways':
            case 'warn':
            case 'warnAlways':
            case 'error':
            case 'caught':
              break;
            default:
              skipping = false;
          }
        }

        if (! skipping) {
          parsedLines.push( { 'func': func, 'file': file, 'line': line, 'col': col } );

          if (limit) {
            count++;
            if (count >= limit) break;
          }
        }
      }
    }

    return parsedLines;
  }
}
