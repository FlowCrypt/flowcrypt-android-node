/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="../types/openpgp.d.ts" />

'use strict';

import { PgpMsg } from '../core/pgp';
import { Validate } from './validate';
import { fmtRes, Buffers } from './fmt';
import { Buf } from '../core/buf';

export class Debug {

  public static printChunk = (name: string, data: Buffer | Uint8Array) => {
    const header1 = `Debug.printChunk[${name}, ${data.length}B]: `;
    const header2 = ' '.repeat(header1.length);
    const chunk = Array.from(data.subarray(0, 30));
    const chunkIndices = chunk.map((v, i) => i);
    console.log(`-\n${header1}-+-[${chunk.map(Debug.pad).join(' ')} ]\n${header2} |-[${chunk.map(Debug.char).map(Debug.pad).join(' ')} ]\n${header2} \`-[${chunkIndices.map(Debug.pad).join(' ')} ]`);
  }

  private static char = (byte: number) => {
    let c = ''
    if (byte === 10) {
      c += '\\n';
    } else if (byte === 13) {
      c += '\\r';
    } else if (byte === 140 || byte === 160) {
      c += '???';
    } else {
      c += String.fromCharCode(byte);
    }
    return c;
  }

  private static pad = (char: string | number) => {
    char = String(char);
    while (char.length < 3) {
      char = ' ' + char;
    }
    return char;
  }
}

export class Endpoints {

  [endpoint: string]: ((uncheckedReq: any, data: Buffers) => Promise<Buffers>) | undefined;

  public version = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    return fmtRes(process.versions);
  }

  public encryptMsg = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const req = Validate.encryptMsg(uncheckedReq);
    const encrypted = await PgpMsg.encrypt(req.pubKeys, undefined, undefined, Buffer.concat(data), undefined, true) as OpenPGP.EncryptArmorResult;
    return fmtRes({}, Buffer.from(encrypted.data));
  }

  public encryptFile = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const req = Validate.encryptFile(uncheckedReq);
    const encrypted = await PgpMsg.encrypt(req.pubKeys, undefined, undefined, Buffer.concat(data), req.name, false) as OpenPGP.EncryptBinaryResult;
    return fmtRes({}, encrypted.message.packets.write());
  }

  /**
   * Todo - this will fail when it receives a Mime message, because emailjs mime libraries are not loaded, see platform/require.ts
   */
  public decryptMsg = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const { keys, passphrases, msgPwd } = Validate.decryptMsg(uncheckedReq);
    const decrypted = await PgpMsg.decrypt({ keys, passphrases }, Buffer.concat(data), msgPwd);
    if (!decrypted.success) {
      decrypted.message = undefined;
      return fmtRes(decrypted);
    }
    const blocks = await PgpMsg.fmtDecrypted(decrypted.content.uint8);
    const blockMetas = blocks.map(b => ({ type: b.type, length: b.content.length }));
    // first line is a blockMetas JSON. Data below represent one JSON-stringified block per line. This is so that it can be read as a stream
    return fmtRes({ success: true, blockMetas }, Buffer.from(blocks.map(b => JSON.stringify(b)).join('\n')));
  }

  public decryptFile = async (uncheckedReq: any, data: Buffers): Promise<Buffers> => {
    const { keys, passphrases, msgPwd } = Validate.decryptFile(uncheckedReq);
    // Debug.printChunk("decryptFile.data", data);
    const decryptedMeta = await PgpMsg.decrypt({ keys, passphrases }, Buffer.concat(data), msgPwd);
    if (!decryptedMeta.success) {
      decryptedMeta.message = undefined;
      return fmtRes(decryptedMeta);
    }
    const decryptedData = Buffer.from(decryptedMeta.content.uint8!);
    decryptedMeta.content.uint8 = new Buf(0);
    // Debug.printChunk("decryptFile.decryptedData", decryptedData);
    return fmtRes({ success: true, name: decryptedMeta.content.filename || '' }, decryptedData);
  }

}
