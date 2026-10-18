// Query only; does not publish a device report or edit any note.
import fs from 'node:fs';import {WebSocket} from 'ws';import {VaultClientV3} from '../src/v3/client.mjs';import {DIAGNOSTICS_CAPABILITY} from '../src/v3/diagnostics.mjs';
if(!process.env.LAB_URL||!process.env.LAB_TOKEN_FILE)throw Error('Set LAB_URL and LAB_TOKEN_FILE (existing private token file)');
const c=new VaultClientV3({url:process.env.LAB_URL,token:fs.readFileSync(process.env.LAB_TOKEN_FILE,'utf8').trim(),WebSocketImpl:WebSocket});
try{c.connect();for(let i=0;!c.ready&&i<200;i++)await new Promise(r=>setTimeout(r,100));if(!c.ready)throw Error('Diagnostic connection not ready');if(!c.serverCapabilities.includes(DIAGNOSTICS_CAPABILITY))throw Error('Server does not support device diagnostics');console.log(JSON.stringify(await c.request('device-diagnostics'),null,2));}finally{await c.close();}
