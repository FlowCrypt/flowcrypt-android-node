/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

/// <reference path="../node_modules/@types/node/index.d.ts" />
/// <reference path="../node_modules/@types/chrome/index.d.ts" />
/// <reference path="./types/jquery.d.ts" />
/// <reference path="./types/openpgp.d.ts" />

'use strict';

import * as https from 'https';
import { IncomingMessage, ServerResponse } from 'http';
import { parseReq } from './node/parse';
import { fmtErr, indexHtml, HttpClientErr, HttpAuthErr, Buffers } from './node/fmt';
import { Endpoints } from './node/endpoints';
import { sendNativeMessageToJava } from './node/native';
import { setGlobals } from './platform/util';

setGlobals();

declare const NODE_SSL_KEY: string, NODE_SSL_CRT: string, NODE_SSL_CA: string, NODE_AUTH_HEADER: string, NODE_PORT: string;

const endpoints = new Endpoints();

const delegateReqToEndpoint = async (endpointName: string, uncheckedReq: any, data: Buffers): Promise<Buffers> => {
  const endpointHandler = endpoints[endpointName];
  if (endpointHandler) {
    return endpointHandler(uncheckedReq, data);
  }
  throw new HttpClientErr(`unknown endpoint: ${endpointName}`);
}

const handleReq = async (req: IncomingMessage, res: ServerResponse): Promise<Buffers> => {
  if (!NODE_AUTH_HEADER || !NODE_SSL_KEY || !NODE_SSL_CRT || !NODE_SSL_CA) {
    throw new Error('Missing NODE_AUTH_HEADER, NODE_SSL_CA, NODE_SSL_KEY or NODE_SSL_CRT');
  }
  if (req.headers['authorization'] !== NODE_AUTH_HEADER) {
    throw new HttpAuthErr('Wrong Authorization');
  }
  if (req.url === '/' && req.method === 'GET') {
    res.setHeader('content-type', 'text/html');
    return [indexHtml];
  }
  if (req.url === '/' && req.method === 'POST') {
    const { endpoint, request, data } = await parseReq(req);
    // console.log(endpoint);
    // console.log(request);
    // console.log(`LEN: ${Buffer.concat(data).toString().length}`);
    return await delegateReqToEndpoint(endpoint, request, data);
  }
  throw new HttpClientErr(`unknown path ${req.url}`);
}

const serverOptins: https.ServerOptions = {
  key: NODE_SSL_KEY,
  cert: NODE_SSL_CRT,
  ca: NODE_SSL_CA,
  requestCert: true,
  rejectUnauthorized: true,
};

const LISTEN_PORT = Number(NODE_PORT);
if (isNaN(LISTEN_PORT) || LISTEN_PORT < 1024) {
  throw new Error('Wrong or no NODE_PORT supplied');
}

const sendRes = (res: ServerResponse, buffers: Buffers) => {
  res.end(Buffer.concat(buffers));
}

const server = https.createServer(serverOptins, (request, res) => {
  handleReq(request, res).then(buffers => sendRes(res, buffers)).catch((e) => {
    if (e instanceof HttpAuthErr) {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="flowcrypt-android-node"');
    } else if (e instanceof HttpClientErr) {
      res.statusCode = 400;
    } else {
      console.error(e);
      res.statusCode = 500;
    }
    res.end(fmtErr(e));
  });
});

server.listen(LISTEN_PORT, 'localhost');

server.on('listening', () => {
  const address = server.address();
  const msg = `listening on ${typeof address === 'object' ? address.port : address}`;
  console.info(msg);
  sendNativeMessageToJava(msg);
});
