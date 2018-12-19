/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

type Obj = { [k: string]: any };

export namespace NodeRequest {

  type PrvKeyInfo = { private: string; longid: string };
  export type encryptMsg = { pubKeys: string[] };
  export type encryptFile = { pubKeys: string[], name: string };
  export type decryptMsg = { keys: PrvKeyInfo[], passphrases: string[], msgPwd?: string };
  export type decryptFile = { keys: PrvKeyInfo[], passphrases: string[], msgPwd?: string };

}

export class Validate {

  public static encryptMsg = (v: any): NodeRequest.encryptMsg => {
    if (isObj(v) && hasProp(v, 'pubKeys', 'string[]')) {
      return v as NodeRequest.encryptMsg;
    }
    throw new Error('Wrong request structure for NodeRequest.encryptMsg');
  }

  public static encryptFile = (v: any): NodeRequest.encryptFile => {
    if (isObj(v) && hasProp(v, 'pubKeys', 'string[]') && hasProp(v, 'name', 'string')) {
      return v as NodeRequest.encryptFile;
    }
    throw new Error('Wrong request structure for NodeRequest.encryptFile');
  }

  public static decryptFile = (v: any): NodeRequest.decryptFile => {
    if (isObj(v) && hasProp(v, 'keys', 'PrvKeyInfo[]') && hasProp(v, 'passphrases', 'string[]') && hasProp(v, 'msgPwd', 'string?')) {
      return v as NodeRequest.decryptFile;
    }
    throw new Error('Wrong request structure for NodeRequest.decryptFile');
  }

  public static decryptMsg = (v: any): NodeRequest.decryptMsg => {
    if (isObj(v) && hasProp(v, 'keys', 'PrvKeyInfo[]') && hasProp(v, 'passphrases', 'string[]') && hasProp(v, 'msgPwd', 'string?')) {
      return v as NodeRequest.decryptFile;
    }
    throw new Error('Wrong request structure for NodeRequest.decryptFile');
  }

}

const isObj = (v: any): v is Obj => {
  return v && typeof v === 'object';
}

const hasProp = (v: Obj, name: string, type: 'string[]' | 'object' | 'string' | 'number' | 'string?' | 'PrvKeyInfo[]'): boolean => {
  if (!isObj(v)) {
    return false;
  }
  const value = v[name];
  if (type === 'number' || type === 'string') {
    return typeof value === type;
  }
  if (type === 'string?') {
    return typeof value === 'string' || typeof value === 'undefined';
  }
  if (type === 'string[]') {
    return Array.isArray(value) && value.filter((x: any) => typeof x === 'string').length === value.length;
  }
  if (type === 'PrvKeyInfo[]') {
    return Array.isArray(value) && value.filter((ki: any) => hasProp(ki, 'private', 'string') && hasProp(ki, 'longid', 'string')).length === value.length;
  }
  if (type === 'object') {
    return isObj(value);
  }
  return false;
}
