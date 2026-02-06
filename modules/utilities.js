import * as ICAL from  "./ical.js"



function debug(logger, ...info) {
  let msg = info.shift();

  if (logger && (typeof logger.debug === 'function')) {
    logger.debug("utilities.js#" + msg, ...info);
  } else {
    console.debug("utilities.js#" + msg, ...info);
  }
}



export function logProps(indent, key, props) {
  if (typeof props === 'object') {
    if (Array.isArray(props)) {
      if (key) {
        console.log(`${indent}${key}: ARRAY (${props.length})`);
      } else {
        console.log(`${indent}ARRAY (${props.length})`);
      }
      for (const prop of props) {
        logProps(indent + '----', "", prop);
      }
    } else {
      const entries = Object.entries(props);
      if (key) {
        console.log(`${indent}${key}:OBJECT (${entries.length})`);
      } else {
        console.log(`${indent}OBJECT (${entries.length})`);
      }
      for (const[key,value] of entries) {
         logProps(indent + '----', key, value);
      }
    }
  } else if (typeof props === 'string') {
    if (key) {
      console.log(`${indent}${typeof props} ${key}: "${props}"`);
    } else {
      console.log(`${indent}${typeof props} "${props}"`);
    }
  } else {
    if (key) {
      console.log(`${indent}${typeof props} ${key}: ${props}`);
    } else {
      console.log(`${indent}${typeof props} ${props}`);
    }
  }
}



/* Gets the userAgent String, and splits it into an array, and returns it
 *
 * Elements in the array:
 *     [0] appname/major.minor.xxx    ex: Thunderbird/128.8.0
 *     [1] appname                    ex: Thunderbird
 *     [2] major.minor.xx             ex: 128.8.0 (.xx is optional)
 *     [3] major                      ex: 128
 *     [4[ minor                      ex: 8
 *     [5] xx (optional)              ex: 0
 *     [?] if there are more '.' characters after xx, we continue for each part...
 */
export function getBrowserAndVersion() {
  var userAgent         = navigator.userAgent;
//var browserAndVersion = userAgent.match(/(firefox|thunderbird(?=\/))\/?\s*([^\s]*)\s*/i) || [];
  var browserAndVersion = userAgent.match(/(thunderbird(?=\/))\/?\s*([^\s]*)\s*/i) || []; // cannot add "firefox|" in there because Thunderbird has BOTH

  if (browserAndVersion.length > 2) {
    var version = browserAndVersion[2].split('\.');
    if (version.length > 0) browserAndVersion = browserAndVersion.concat(version);
  }

  return browserAndVersion;
}



export function getExtensionInfo() {
  const extInfo = {};

  var manifest = messenger.runtime.getManifest();

  if (manifest) {
    extInfo['manifest_version']     = manifest.manifest_version;
    extInfo['name']                 = manifest.name;
    extInfo['short_name']           = manifest.short_name;
    extInfo['description']          = manifest.description;
    extInfo['author']               = manifest.author;
    extInfo['homepage_url']         = manifest.homepage_url;
    extInfo['version']              = manifest.version;
////extInfo['version_name']         = manifest.version_name; // not supported by Gecko (Thunderbird?)
    extInfo['default_locale']       = manifest.default_locale;
    extInfo['permissions']          = manifest.permissions;
    extInfo['optional_permissions'] = manifest.optional_permissions;

    if (manifest.developer) {
      extInfo['developer_name']     = manifest.developer.name; // if developer.name is present, it overrides author
      extInfo['developer_url']      = manifest.developer.url;  // if developer.url is present, it overrides homepage_url
    }

    if (manifest.browser_specific_settings && manifest.browser_specific_settings.gecko) { // MABXXX applications is deprecated.  Use browser_specific_settings
      const gecko = manifest.browser_specific_settings.gecko;
      extInfo['id']                          = gecko.id                          ? gecko.id                          : '';
      extInfo['strict_min_version']          = gecko.strict_min_version          ? gecko.strict_min_version          : '';
      extInfo['strict_max_version']          = gecko.strict_max_version          ? gecko.strict_max_version          : '';
      extInfo['update_url']                  = gecko.update_url                  ? gecko.update_url                  : '';
      extInfo['data_collection_permissions'] = gecko.data_collection_permissions ? gecko.data_collection_permissions : '';
    } else if (manifest.applications && manifest.applications.gecko) { // MABXXX applications is deprecated.  Use browser_specific_settings
      const gecko = manifest.applications.gecko;
      extInfo['id']                          = gecko.id                          ? gecko.id                          : '';
      extInfo['strict_min_version']          = gecko.strict_min_version          ? gecko.strict_min_version          : '';
      extInfo['strict_max_version']          = gecko.strict_max_version          ? gecko.strict_max_version          : '';
      extInfo['update_url']                  = gecko.update_url                  ? gecko.update_url                  : '';
      extInfo['data_collection_permissions'] = gecko.data_collection_permissions ? gecko.data_collection_permissions : '';
    }
  }

  return extInfo;
}

export function getExtensionId(defaultExtId) {
  var extId = defaultExtId;

  var manifest = messenger.runtime.getManifest();
  if (    manifest
       && manifest.applications
       && manifest.applications.gecko
       && manifest.applications.gecko.id
     )
  {
    extId = manifest.applications.gecko.id;
  }

  return extId;
}

export function getExtensionAppMinVersion() {
  var minVersion;

  var manifest = messenger.runtime.getManifest();
  if (    manifest
       && manifest.applications
       && manifest.applications.gecko
       && manifest.applications.gecko.strict_min_version
     )
  {
    minVersion = manifest.applications.gecko.strict_min_version;
  }

  return minVersion;
}

export function getExtensionAppMaxVersion() {
  var maxVersion;

  var manifest = messenger.runtime.getManifest();
  if (    manifest
       && manifest.applications
       && manifest.applications.gecko
       && manifest.applications.gecko.strict_max_version
     )
  {
    maxVersion = manifest.applications.gecko.strict_max_version;
  }

  return maxVersion;
}

export function getExtensionName(defaultExtName) {
  var extName = getI18nMsg("extensionName", defaultExtName);

  var manifest = messenger.runtime.getManifest(); // MABXXX but this is not localized!!!
  if (manifest && manifest.name) {
    extName = manifest.name;
  }

  return extName;
}

export function getExtensionVersion(defaultExtVersion) {
  var extVersion = defaultExtVersion;

  var manifest = messenger.runtime.getManifest();
  if (manifest && manifest.version) {
    extVersion = manifest.version;
  }

  return extVersion;
}



export function getI18nMsg(id, defaultMsg) {
  let i18nMessage = messenger.i18n.getMessage(id);

  if (i18nMessage == "") {
    if (defaultMsg === undefined || defaultMsg === null) {
      i18nMessage = id;
    } else {
      i18nMessage = defaultMsg;
    }
  }

  return i18nMessage;
}

export function getI18nMsgSubst(id, subst, defaultMsg) {
  let i18nMessage = messenger.i18n.getMessage(id, subst);

  if (i18nMessage == null || i18nMessage === "") {
    if (defaultMsg === undefined || defaultMsg === null) {
      i18nMessage = id;
    } else {
      i18nMessage = defaultMsg;
    }
  }

  return i18nMessage;
}



export function globToRegExp(glob) {
  const regexp = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexp}$`);
}

export function isGlobMatch(string, glob) {
  const regexp = globToRegExp(glob);
  return regexp.test(string);
}



export function parseDocumentLocation(doc) {
  const docLocation = doc.location;

  let hostname;
  let pathname;
  let filename;
  let search;
  let params;

  if (docLocation) {
    hostname = docLocation.hostname;
    hostname = docLocation.hostname;
    pathname = docLocation.pathname;
    filename = docLocation.pathname;
    search   = docLocation.search;

    if (! pathname) {
      //debug(`XXXXXXXXXXXXXXX userChrome.js: parseWindowLocation(): Window Location has no 'pathname' XXXXXXXXXXXXXXX`);
    } else { 
      let lastSlashIndex = pathname.lastIndexOf('/');
      if (lastSlashIndex < 0) {
        //debug(`XXXXXXXXXXXXXXX userChrome.js: parseWindowLocation(): Window Location 'pathname' contains NO '/' character XXXXXXXXXXXXXXX`);
      } else {
        filename = pathname.substr(lastSlashIndex + 1);
      }
    }

    if (search) {
      params = new URLSearchParams(search)
    }
  }

  return { location: docLocation,
           hostname: hostname,
           pathname: pathname,
           filename: filename,
           search:   search,
           params:   params
         };
}



// requires permissions!!!
// - addressBooks
// - sensitiveDataUpload (optional) - to remote server for further processing
export async function makeRecipientEmailList(composeRecipients, logger) {
  // - composeRecipients: messenger.compose.ComposeRecipient or array of messenger.compose.ComposeRecipient/
  //   - messenger.compose.ComposeRecipient: String or { id, type }
  //     - id:    String - the ID of a contact from the contacts API or the ID of a mailing list from the mailingLists API.
  //     - type: 'contact' or 'mailingList'

  let emailList = "";

  if (typeof composeRecipients === 'string') {
    emailList = composeRecipients;

  } else if (typeof composeRecipients === 'object') {
    if (Array.isArray(composeRecipients)) {
      for (let recip of composeRecipients) {
        let recipEmail = getRecipientEmail(recip, logger);
        if (recipEmail) {
          if (emailList === "") {
            emailList = recipEmail;
          } else {
            emailList += ", " + recipEmail;
          }
        }
      }

    } else {
      let email = getRecipientEmail(composeRecipient, logger);
      if (email) {
        if (emailList === "") {
          emailList = email;
        } else {
          emailList += ", " + email;
        }
      }
    }
  }

  return emailList;
}

// requires permissions!!!
// - addressBooks
// - sensitiveDataUpload (optional) - to remote server for further processing
export async function getRecipientEmail(composeRecipient, logger) {
  let email = "";

  if (typeof composeRecipient === 'string') {
    debug(logger, `getRecipientEmail -- composeRecipient is a string (email address?): composeRecipient="${composeRecipient}"`);
    email = composeRecipient;

  } else if (typeof composeRecipient === 'object') {
    debug(logger, `getRecipientEmail -- composeRecipient is an Object with id="${composeRecipient.id}" type="${composeRecipient.type}"`);

    if ((typeof composeRecipient.id === 'string') && (typeof composeRecipient.type === 'string')) {
      if (composeRecipient.type === 'contact') {
        debug(logger, "getRecipientEmail -- composeRecipient is a contact");

        let contact = await messenger.contacts.get(composeRecipient.id); // messenger.contacts.ContactNode
        if (contact && contact.properties && contact.properties.vCard) { // { vCard } MABXXX ???
          debug(logger, `getRecipientEmail -- composeRecipient: contact has a vCard`);
          let vCardObj = ICAL.parse(contact.properties.vCard);
          let [ component, jCard ] = vCardObj;
          debug(logger, `getRecipientEmail -- composeRecipient: contact vCardObj component="${component}" jCard="${jCard}"`);

          if (component = 'vcard' ) {
            let emailInfo = jCard.find(e => e[0] == "email");
            debug(logger, `getRecipientEmail -- composeRecipient: contact vCardObj jCard emailInfo="${emailInfo}"`);
            if (emailInfo) {
              debug(logger, `getRecipientEmail -- composeRecipient: contact vCardObj jCard emailInfo[3]="${emailInfo[3]}"`);
              email = emailInfo[3];
            }
          }
        } else {
          debug(logger, `getRecipientEmail -- VALID contact NOT FOUND: id="${composeRecipient.id}"`);
        }

      } else if (composeRecipient.type === 'mailingList') {
        debug(logger, "getRecipientEmail -- composeRecipient is a mailingList");

        let mailingList = await messenger.mailingLists.get(composeRecipient.id); // messenger.mailingLists.MailingListNode
        if (mailingList) {
          // we're not going to get into the contacts or whether it's remote or not
          email = "list {" + mailingList.name + "}";
        } else {
          debug(logger, `getRecipientEmail -- mailingList NOT FOUND: id="${composeRecipient.id}"`);
        }

      } else {
        debug(logger, `getRecipientEmail -- UNKNOWN COMPOSE RECIPIENT TYPE: composeRecipient.type="${composeRecipient.type}"`);
      }

    } else {
      debug(logger, "getRecipientEmail -- INVALID COMPOSE RECIPIENT: MISSING OR INVALID 'id' AND/OR 'type' (expecting 'string')");
    }

  } else {
    debug(logger, `getRecipientEmail -- INVALID COMPOSE RECIPIENT: (typeof composeRecipient)='${(typeof composeRecipient)}' (expecting 'string' or 'object')`);
  }

  return email;
}



export function formatNowToTimeForFilename() {
  return formatMsToTimeForFilename(Date.now());
}

export function formatMsToTimeForFilename(ms) {
  const date = new Date(ms);

  const hours   = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${hours}-${minutes}-${seconds}`;
}



export function formatNowToDateForFilename() {
  return formatMsToDateForFilename(Date.now());
}

export function formatMsToDateForFilename(ms) {
  const date = new Date(ms);

  const year    = date.getFullYear();
  const month   = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day     = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}



export function formatNowToDateTimeForFilename() {
  return formatMsToDateTimeForFilename(Date.now());
}

export function formatMsToDateTimeForFilename(ms) {
  const date = new Date(ms);

  const year    = date.getFullYear();
  const month   = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day     = String(date.getDate()).padStart(2, '0');
  const hours   = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export function formatNowToDate() {
  return formatMsToDate(Date.now());
}

export function formatMsToDate(ms) {
  const date = new Date(ms);

  const year    = date.getFullYear();
  const month   = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day     = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatNowToDateTime24HR() {
  return formatMsToDateTime24HR(Date.now());
}

export function formatMsToDateTime24HR(ms) {
  const date = new Date(ms);

  const year    = date.getFullYear();
  const month   = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day     = String(date.getDate()).padStart(2, '0');
  const hours   = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatNowToDateTime12HR() {
  return formatMsToDateTime12HR(Date.now());
}

export function formatMsToDateTime12HR(ms) {
  const date = new Date(ms);

  let hrs = date.getHours();
  const ampm = hrs >= 12 ? "pm" : "am";
  hrs = hrs % 12;
  hrs = hrs ? hrs : 12; // 0 -> 12

  const year    = date.getFullYear();
  const month   = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day     = String(date.getDate()).padStart(2, '0');
  const hours   = String(hrs).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${ampm}`;
}



export function getNextMidnightDelayMS() {
  const nowMS = Date.now();
  return getMidnightDelayMS(nowMS);
}

export function getNextMidnightMS(nowMS) {
  const nextMidnightDate = getNextMidnightDate(nowMS);
  return nextMidnightDate.getTime();
}

export function getNextMidnightDate(nowMS) {
  return getMidnightDate(nowMS, 0);
}

export function getMidnightDelayMS(nowMS) {
  const nextMidNightMS = getNextMidnightMS(nowMS);
  return nextMidNightMS - nowMS;
}

export function getMidnightMS(nowMS, numDays) {
  const midnightDate = getMidnightDate(nowMS, numDays);
  return midnightDate.getTime();
}

export function getMidnightDate(nowMS, numDays) {
  const nextMidnightDate = new Date(nowMS + ((numDays + 1) * 86400000)); // 86400000 is one day in MS
  nextMidnightDate.setMilliseconds(0);
  nextMidnightDate.setSeconds(0);
  nextMidnightDate.setMinutes(0);
  nextMidnightDate.setHours(0);
  return nextMidnightDate;
}




/* Must be a String with at least 1 character and <= 255 characters. */
export function isValidPathname(pathname) {
  return ((typeof pathname === 'string') && pathname.length >= 1 && pathname.length <= 255);
}



/* Must be a String with at least one character. 
 *
 * ILLEGAL CHARS:
 *   <
 *   >
 *   :
 *   "
 *   /
 *   \
 *   |
 *   ?
 *   *
 *   x00-x1F (control characters)
 *
 * RESERVED NAMES:
 * - con
 * - prn
 * - aux
 * - nul
 * - com0 - com9
 * - lpt0 - lpt9
 *
 * NO MORE THAN *64* CHARACTERS
 */
export function isValidFileName(filename) {
  if (typeof filename !== 'string' || filename.length < 1) return false;

  const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;
  if (ILLEGAL_CHARS.test(filename)) return false;

  const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
  if (RESERVED_NAMES.test(filename)) return false;
  
  return (filename.length <= 64);
}



export function isValidEmail(email) {  // MABXXX this allows an email with a TLD like just "c" ??? I suppose you'd need some list of valid TLD's
  if (typeof email !== 'string' || email.length < 1) return false;

//const EMAIL_REGEX = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
//const EMAIL_REGEX = /^(?=[a-z0-9][a-z0-9@._%+-]{5,253}+$)[a-z0-9._%+-]{1,64}+@(?:(?=[a-z0-9-]{1,63}+\.)[a-z0-9]++(?:-[a-z0-9]++)*+\.){1,8}+[a-z]{2,63}+$/i;
  const EMAIL_REGEX = /\A(?=[a-z0-9@.!#$%&'*+/=?^_`{|}~-]{6,254}\z)(?=[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@)[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(?=[a-z0-9-]{1,63}\.)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?=[a-z0-9-]{1,63}\z)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z/i;
  return EMAIL_REGEX.test(email);
}



export function isValidGUID(guid) {
  if (typeof guid !== 'string' || guid.length < 1) return false;

  const ENCLOSED_GUID_REGEX   = /^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}$/;
  const UNENCLOSED_GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  if (guid[0] === '{') return ENCLOSED_GUID_REGEX.test(guid);

  return UNENCLOSED_GUID_REGEX.test(guid);
  
}



export function isValidExtensionId(extensionId) {
  if (typeof extensionId !== 'string' || extensionId.length < 1 || extensionId.length > 64) return false;

  // note: no upper-case
  const LIKE_EMAIL_REGEX = /\A(?=[a-z0-9@.!#$%&'*+/=?^_`{|}~-]{6,254}\z)(?=[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@)[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(?=[a-z0-9-]{1,63}\.)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?=[a-z0-9-]{1,63}\z)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z/;

//const ENCLOSED_GUID_REGEX   = /^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}$/;
//const UNENCLOSED_GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  // note: no upper-case
  const ENCLOSED_GUID_REGEX   = /^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/;
  const UNENCLOSED_GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  if (! LIKE_EMAIL_REGEX.test(extensionId)) {
    if (extensionId[0] === '{') {
      if (ENCLOSED_GUID_REGEX.test(extensionId)) return true;
    } else {
      if (UNENCLOSED_GUID_REGEX.test(extensionId)) return true;
    }
  }
  
//const ILLEGAL_CHARS = /<>:"/\\|?*\x00-\x1F]/g;
//if (ILLEGAL_CHARS.test(extensionId)) return false;

  const RESERVED_NAMES = /^(\.\.|con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
  if (RESERVED_NAMES.test(extensionId)) return false;

  return true;
}
