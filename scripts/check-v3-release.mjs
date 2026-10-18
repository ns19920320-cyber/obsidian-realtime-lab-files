import fs from 'node:fs';
const dir='work/v3-files-plugin',expected=JSON.parse(fs.readFileSync('manifest.v3-files.json','utf8')),actual=JSON.parse(fs.readFileSync(dir+'/manifest.json','utf8'));
if(actual.id!=='realtime-lab-v3-files'||JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Files manifest mismatch');
for(const name of ['main.js','manifest.json']){const text=fs.readFileSync(dir+'/'+name,'utf8');for(const re of [/\/Users\//,/192\.168\.\d+\.\d+/,/BEGIN (RSA |EC )?PRIVATE KEY/,/couchDB_PASSWORD/,/\/private\/var\/folders\//])if(re.test(text))throw Error('Private pattern in '+name);}
console.log('Files release identity and asset privacy checks passed: '+actual.version);
