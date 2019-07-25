/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { Contact } from '../core/pgp.js';
import { requireOpenpgp } from './require.js';

const openpgp = requireOpenpgp();

let KEY_CACHE: { [longidOrArmoredKey: string]: OpenPGP.key.Key } = {};
let KEY_CACHE_WIPE_TIMEOUT: NodeJS.Timeout;

const keyLongid = (k: OpenPGP.key.Key) => openpgp.util.str_to_hex(k.getKeyId().bytes).toUpperCase();

export class Store {

  static dbContactGet = async (db: void, emailOrLongid: string[]): Promise<(Contact | undefined)[]> => {
    return [];
  }

  static decryptedKeyCacheSet = (k: OpenPGP.key.Key) => {
    Store.keyCacheRenewExpiry();
    KEY_CACHE[keyLongid(k)] = k;
  }

  static decryptedKeyCacheGet = (longid: string): OpenPGP.key.Key | undefined => {
    Store.keyCacheRenewExpiry();
    return KEY_CACHE[longid];
  }

  static armoredKeyCacheSet = (armored: string, k: OpenPGP.key.Key) => {
    Store.keyCacheRenewExpiry();
    KEY_CACHE[armored] = k;
  }

  static armoredKeyCacheGet = (armored: string): OpenPGP.key.Key | undefined => {
    Store.keyCacheRenewExpiry();
    return KEY_CACHE[armored];
  }

  static keyCacheWipe = () => {
    KEY_CACHE = {};
  }

  private static keyCacheRenewExpiry = () => {
    // JavaScriptCore has no setTimeout. Need to wipe cache periodically from Swift instead
    if(typeof setTimeout === "function") {
      if (KEY_CACHE_WIPE_TIMEOUT) {
        clearTimeout(KEY_CACHE_WIPE_TIMEOUT);
      }
      KEY_CACHE_WIPE_TIMEOUT = setTimeout(Store.keyCacheWipe, 2 * 60 * 1000);  
    }
  }

}
