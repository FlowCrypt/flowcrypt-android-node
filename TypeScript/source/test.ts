/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import * as ava from 'ava';
import { startNodeCoreInstance, request, expectNoData, getKeypairs, expectData, expectEmptyJson, getCompatAsset } from './test/test-utils';
import { expect } from 'chai';
import { ChildProcess } from './test/flowcrypt-node-modules';
import { requireOpenpgp } from './platform/require';


const compatText = 'some\n汉\ntxt';
const compatHtml = compatText.replace(/\n/g, '<br>');

const openpgp = requireOpenpgp();

let nodeProcess: ChildProcess;

ava.test.before(async t => {
  nodeProcess = await startNodeCoreInstance(t);
  t.pass();
});

ava.test('version', async t => {
  const { json, data } = await request('version', {}, []);
  expect(json).to.have.property('node');
  expectNoData(data);
  t.pass();
});

ava.test('doesnotexist', async t => {
  const { data, err } = await request('doesnotexist', {}, [], false);
  expect(err).to.equal('Error: unknown endpoint: doesnotexist');
  expectNoData(data);
  t.pass();
});

ava.test('encryptMsg - decryptMsg', async t => {
  const { pubKeys, keys, passphrases } = getKeypairs('rsa1');
  const { data: encryptedMsg, json: encryptJson } = await request('encryptMsg', { pubKeys }, 'hello\nwrld');
  expectEmptyJson(encryptJson);
  expectData(encryptedMsg, 'armoredMsg');
  const { data: blocks, json: decryptJson } = await request('decryptMsg', { keys, passphrases }, encryptedMsg);
  expect(decryptJson).to.deep.equal({ success: true, blockMetas: [{ type: 'html', length: 13 }] });
  expectData(blocks, 'msgBlocks', [{ type: "html", content: 'hello<br>wrld', complete: true }]);
  t.pass();
});

ava.test('encryptFile - decryptFile', async t => {
  const { pubKeys, keys, passphrases } = getKeypairs('rsa1');
  const name = 'myfile.txt';
  const content = Buffer.from([10, 20, 40, 80, 160, 0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250]);
  const { data: encryptedFile, json: encryptJson } = await request('encryptFile', { pubKeys, name }, content);
  expectEmptyJson(encryptJson);
  expectData(encryptedFile);
  const { data: decryptedContent, json: decryptJson } = await request('decryptFile', { keys, passphrases }, encryptedFile);
  expect(decryptJson).to.deep.equal({ success: true, name });
  expectData(decryptedContent, 'binary', content);
  t.pass();
});

ava.test('parseDateStr', async t => {
  const { data, json } = await request('parseDateStr', { dateStr: 'Sun, 10 Feb 2019 07:08:20 -0800' }, []);
  expect(json).to.deep.equal({ timestamp: '1549811300000' });
  expectNoData(data);
  t.pass();
});

ava.test('gmailBackupSearch', async t => {
  const { data, json } = await request('gmailBackupSearch', { acctEmail: 'test@acct.com' }, []);
  expect(json).to.deep.equal({ query: 'from:test@acct.com to:test@acct.com (subject:"Your FlowCrypt Backup" OR subject: "Your CryptUp Backup" OR subject: "All you need to know about CryptUP (contains a backup)" OR subject: "CryptUP Account Backup") -is:spam' });
  expectNoData(data);
  t.pass();
});

ava.test('isEmailValid - true', async t => {
  const { data, json } = await request('isEmailValid', { email: 'test@acct.com' }, []);
  expect(json).to.deep.equal({ valid: true });
  expectNoData(data);
  t.pass();
});

ava.test('isEmailValid - false', async t => {
  const { data, json } = await request('isEmailValid', { email: 'testacct.com' }, []);
  expect(json).to.deep.equal({ valid: false });
  expectNoData(data);
  t.pass();
});

ava.test('parseKeys', async t => {
  const { pubKeys: [pubkey] } = getKeypairs('rsa1');
  const { data, json } = await request('parseKeys', {}, Buffer.from(pubkey));
  expect(json).to.deep.equal({
    "format": "armored",
    "keyDetails": [
      {
        "public": "-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: FlowCrypt 0.0.1-dev Gmail Encryption\r\nComment: Seamlessly send and receive encrypted email\r\n\r\nxsBNBFwBWOEBB/9uIqBYIPDQbBqHMvGXhgnm+b2i5rNLXrrGoalrp7wYQ654\r\nZln/+ffxzttRLRiwRQAOG0z78aMDXAHRfI9d3GaRKTkhTqVY+C02E8NxgB3+\r\nmbSsF0Ui+oh1//LT1ic6ZnISCA7Q2h2U/DSAPNxDZUMu9kjh9TjkKlR81fiA\r\nlxuD05ivRxCnmZnzqZtHoUvvCqsENgRjO9a5oWpMwtdItjdRFF7UFKYpfeA+\r\nct0uUNMRVdPK7MXBEr2FdWiKN1K21dQ1pWiAwj/5cTA8hu5Jue2RcF8FcPfs\r\nniRihQkNqtLDsfY5no1B3xeSnyO2SES1bAHw8ObXZn/C/6jxFztkn4NbABEB\r\nAAHNEFRlc3QgPHRAZXN0LmNvbT7CwH8EEAEIACkFAlwBWOEGCwkHCAMCCRA6\r\nMPTMCpqPEAQVCAoCAxYCAQIZAQIbAwIeAQAKCRA6MPTMCpqPENaTB/0faBFR\r\n2k3RM7P427HyZOsZtqEPxuynsLUqmsAAup6LtPhir4CAsb5DSvgYrzC8pbrf\r\njCaodoB7hMXc8RxTbSh+vQc5Su4QwY8sqy7hyMXOGGWsRxnuZ8t8BeEJBIHy\r\nPguXIR+wYvo1eveC+NMxHhTtjoSIn/E4vW0W9j5OlFeTK7HTNCuidIE0Hk2k\r\nXnEEoNO7ztxPPxsHz9g56uMhyAhf3mqKfvUFo/FLLRBOpxLO0kk64yAMcAHm\r\nc6ZI5Fz10y48+hHEv/RFOwfub9asF5NWHltanqyiZ+kHeoaieYJFc6t7Mt3j\r\ng8qxMKTUKAEeCfHt1UJCjp/aIgJRU4JRXgYXzsBNBFwBWOEBB/9nclmx98vf\r\noSpPUccBczvuZxmqk+jY6Id+vBhBFoEhtdTSpaw/JNstf0dTXN8RCFjB0lHt\r\na51llTjSobqcFwAU54/HKDOW3qMVbvadaGILpuCMCxdMgLWlpZdYY7BApv1N\r\n9zpN+iQ2tIrvnUQ312xKOXF/W83NUJ1nTObQYNpsUZLLG2N3kz11HuBS3E9F\r\ngEOYYy1tLT53hs5btqvQ5Jp4Iw5cBoBoTAmv+dPMDKYBroBPwuFeNRIokwLT\r\nrVcxrXajxlXaGXmmGS3PZ00HXq2g7vKIqWliMLLIWFl+LlVb6O8bMeXOT1l0\r\nXSO9GlLOSMDEc7pY26vkmAjbWv7iUWHNABEBAAHCwGkEGAEIABMFAlwBWOEJ\r\nEDow9MwKmo8QAhsMAAoJEDow9MwKmo8QjTcH/1pYXyXW/rpBrDg7w/dXJCfT\r\n8+RVYlhW3kqMxbid7EB8zgGVTDr3us/ki99hc2HjsKbxUqrGBxeh3Mmui7OD\r\nCI8XFeYl7lSDbgU6mZ5J4iXzdR8LNqIib4Horlx/Y24dOuvikSUNpDtFAYfa\r\nbZwxyKa/ihZT1rS1GO3V7tdAB9BJagJqVRssF5g5GBUAX3sxQ2p62HoUxPlJ\r\nOOr4AaCc1na92xScBJL8dtBBRQ5pUZWOjb2UHp9L5QdPaBX8T9ZAieOiTlSt\r\nQxoUfCk7RU0/TnsM3KqFnDFoCzkGxKAmU4LmGtP48qV+v2Jzvl+qcmqYuKtw\r\nH6FWd+EZH07MfdEIiTI=\r\n=wXbX\r\n-----END PGP PUBLIC KEY BLOCK-----\r\n",
        "isDecrypted": null,
        "users": [
          "Test <t@est.com>"
        ],
        "ids": [
          { "fingerprint": "E76853E128A0D376CAE47C143A30F4CC0A9A8F10", "longid": "3A30F4CC0A9A8F10", "shortid": "0A9A8F10", "keywords": "DEMAND MARBLE CREDIT BENEFIT POTTERY CAPITAL" },
          { "fingerprint": "9EF2F8F36A841C0D5FAB8B0F0BAB9C018B265D22", "longid": "0BAB9C018B265D22", "shortid": "8B265D22", "keywords": "ARM FRIEND ABOUT BIND GRAPE CATTLE" }
        ],
        "algo": {
          "algorithm": "rsa_encrypt_sign",
          "bits": 2048,
          "algorithmId": 1
        },
        "created": 1543592161
      }
    ]
  });
  expectNoData(data);
  t.pass();
});

ava.test('decryptKey', async t => {
  const { keys: [key], passphrases } = getKeypairs('rsa1');
  const { data, json } = await request('decryptKey', { armored: key.private, passphrases }, Buffer.from([]));
  const { keys: [decryptedKey] } = await openpgp.key.readArmored(json.decryptedKey);
  expect(decryptedKey.isDecrypted()).to.be.true;
  expectNoData(data);
  t.pass();
});

// ava.test.only('decryptKey made by OpenPGP.js v2', async t => { // OpenPGP.js bug https://github.com/openpgpjs/openpgpjs/issues/862
//   const { data, json } = await request('decryptKey', { "passphrases": ["android"], "armored": "-----BEGIN PGP PRIVATE KEY BLOCK-----\r\nVersion: FlowCrypt 0.7.2 Gmail Encryption\r\nComment: Seamlessly send and receive encrypted email\r\n\r\nxcB+BFqZSq0BB/95WmstkZtb8Dr8OYKkuHNqJQCP8ZGs8Zl9nZf4e1bqUsq7\r\nMGtTp+WeTzlipd04qCHc/8ef9myMDXwM68rBQKw3w6+5o7sWa7OjRtmftooE\r\n7TZQsFsxun4LKR3PeII9ihF1sEwPm0lE1s/vi4AKDj4qTV5rnzRSxoheh4YC\r\nPVsTof7NxAw35p1ywM63HHW7sjMwqYz7dB06OX8V27GD2NScNMKtQOTy0qZc\r\nZZoXCLWYtmy6VZbS4zhxhH2IG1El1vPPWa73TIJ01c72BRgIt2kAMVc9EyrU\r\nac1qPZcWgPpPETYoyYXuq4473x2lWhNtpPgvfBXCEuH0pt5UQp+8yBGdABEB\r\nAAH+CQMIGW2aBpoZ4HVgPrEhgZegbLABsdaqfFvEbo1tfhkBKT7WqeP3MS4+\r\ne51SgsvpzStkZWZhdWx0QGRlbmJvbmQ3LmNvbSA8ZGVmYXVsdEBkZW5ib25k\r\nNy5jb20+wsB/BBABCAApBQJamUq3BgsJBwgDAgkQHLCWPTPkOEsEFQgKAgMW\r\nAgECGQECGwMCHgEACgkQHLCWPTPkOEu7pQf/c0z1fxSuX3RIVFCvAovjo5Vr\r\nSSBspADigqMw7KnD7gRNl+5benDdrdAxMaEhRjXifozwJCYnBEXYPkmGyOhu\r\nNynmFXo89KGwVD3VEDqFzXPiKmBWL7C0IIgxWHxHhBBgQmOZdAXOLGQcuErI\r\n4PiEaKmO5mp5hANaCZ2T3Efj/xfVsd7toKouU73QpzW1Xoyg5KiViO5oMyug\r\nFxgplFL6QirE3Q+RXVMK1JadQLqLrTBbBSUdscJN+SnnL5ymLdYbRtGHcYbU\r\nRQDbmYHn+RfgJUPHzpcU85VPqrzxJN4jH3YdexK4yzcyFb9QN3038TPUvUck\r\nXHnNv6Wr6HDy1ayrMsfAfgRamUq0AQgAmYn6ieg0c37aqZLaQ9B/tObBjrHo\r\nLmAZKzIHXc5jYfiS981qTdVo3u6uui+RYwn7IWA5pX8yidY72/C3nUh/YDj1\r\nIq5SC0XpXVLX0f2R2WwA3RqvZ5HrydwSvm2hS+kQ/L4KjyuGOdsQBeK8Pg29\r\nuR/UIVArsJumWTS4hHyy0SsPw4BqW/R1X0/NHS+RVN1WbR8nGMRNfTRxhSDR\r\nxxZgcLCB4eOYbQAgmqWre+X1xjOgJticGwTh0eSpftCKhOswp2PIpSDfOwav\r\nXTIIhlplDe2+2Try3QEh5f13p5O3/yIfs/5LJ0vLe81obpFi1rnPPa4luIGj\r\n7ESY9VTikVc4GwARAQAB/gkDCGEKUQcWOHjPYD8H95MFfV9Q7V6+lzkTrIme\r\nm0kUHCph+ioFQ3bBhF01xpfJhMLAaQQYAQgAEwUCWplKtwkQHLCWPTPkOEsC\r\nGwwACgkQHLCWPTPkOEvt8gf7B2ZIHX0mRXT2COl5vbZvZ3d6H5KgZE6yWbyw\r\nUx+6MviugArFCyesLbUdrw31fFhLFDYY2xmt2CODhdkwCdLO+rSJDOT2JPWp\r\nDHqZOtlIWQ8KYXOqugnZUjsGQ78uhJ0zxjeZ2mZKFwTeJIdVsIAQa6GiCEeO\r\nNRlw/W6Pmk8QOoRA1YIOZxi3gdsPVaPKBhGnB+qMbR8wzWNcO7Ub+MU4LxPD\r\naDxbCQgqcKKYjTxMfH5bMTRhewmFmwYIvht8YOy2p0wZdyExTOnY2PgIOMBw\r\n67mnbuZ7Je4inipfF+NonLXjfsLOydj0TKDXN+NrpL/Jkm87bBKrZdl56GCl\r\nI70U5g==\r\n=KcbL\r\n-----END PGP PRIVATE KEY BLOCK-----\r\n" }, Buffer.from([]));
//   const { keys: [decryptedKey] } = await openpgp.key.readArmored(json.decryptedKey);
//   expect(decryptedKey.isDecrypted()).to.be.true;
//   expectNoData(data);
//   t.pass();
// });

ava.test('encryptKey', async t => {
  const passphrase = 'this is some pass phrase';
  const { decrypted: [decryptedKey] } = getKeypairs('rsa1');
  const { data, json } = await request('encryptKey', { armored: decryptedKey, passphrase }, Buffer.from([]));
  const { keys: [encryptedKey] } = await openpgp.key.readArmored(json.encryptedKey);
  expect(encryptedKey.isDecrypted()).to.be.false;
  expect(await encryptedKey.decrypt(passphrase)).to.be.true;
  expectNoData(data);
  t.pass();
});

ava.test('decryptMsg compat direct-encrypted-text', async t => {
  const { keys, passphrases } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('decryptMsg', { keys, passphrases }, await getCompatAsset('direct-encrypted-text'));
  expectData(blocks, 'msgBlocks', [{ type: "html", content: compatHtml, complete: true }]);
  expect(decryptJson).to.deep.equal({ success: true, blockMetas: [{ type: 'html', length: 16 }] });
  t.pass();
});

ava.test('decryptMsg compat direct-encrypted-pgpmime', async t => {
  const { keys, passphrases } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('decryptMsg', { keys, passphrases }, await getCompatAsset('direct-encrypted-pgpmime'));
  expectData(blocks, 'msgBlocks', [{ type: "html", content: compatHtml, complete: true }]);
  expect(decryptJson).to.deep.equal({ success: true, blockMetas: [{ type: 'html', length: 16 }] });
  t.pass();
});

ava.test('decryptMsg compat mime-email-plain', async t => {
  const { keys, passphrases } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('decryptMsg', { keys, passphrases, isEmail: true }, await getCompatAsset('mime-email-plain'));
  expectData(blocks, 'msgBlocks', [{ type: "text", content: compatText, complete: true }]);
  expect(decryptJson).to.deep.equal({ success: true, blockMetas: [{ type: 'text', length: compatText.length }] });
  t.pass();
});

ava.test('decryptMsg compat mime-email-encrypted-inline-text', async t => {
  const { keys, passphrases } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('decryptMsg', { keys, passphrases, isEmail: true }, await getCompatAsset('mime-email-encrypted-inline-text'));
  expectData(blocks, 'msgBlocks', [{ type: "html", content: compatHtml, complete: true }]);
  expect(decryptJson).to.deep.equal({ success: true, blockMetas: [{ type: 'html', length: compatHtml.length }] });
  t.pass();
});

ava.test('decryptMsg compat mime-email-encrypted-inline-pgpmime', async t => {
  const { keys, passphrases } = getKeypairs('rsa1');
  const { data: blocks, json: decryptJson } = await request('decryptMsg', { keys, passphrases, isEmail: true }, await getCompatAsset('mime-email-encrypted-inline-pgpmime'));
  expectData(blocks, 'msgBlocks', [{ type: "html", content: compatHtml, complete: true }]);
  expect(decryptJson).to.deep.equal({ success: true, blockMetas: [{ type: 'html', length: compatHtml.length }] });
  t.pass();
});

ava.test.after(async t => {
  nodeProcess.kill();
  t.pass();
});
