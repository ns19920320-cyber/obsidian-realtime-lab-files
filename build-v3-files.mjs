import {build} from 'esbuild';
import fs from 'node:fs/promises';
const result=await build({entryPoints:['src/v3/plugin.ts'],outfile:'work/v3-files-plugin/main.js',bundle:true,format:'cjs',platform:'browser',target:'es2022',write:false,external:['obsidian','@codemirror/state','@codemirror/view','@codemirror/language']});
// Remove only esbuild's standalone module-location annotations; preserve source
// code, normal documentation and third-party legal notices without minification.
const modulePathComment=/^\/\/ (?:\.{1,2}\/|node_modules\/|src\/|\/Users\/|\/private\/|[A-Za-z]:[\\/]).*(?:\r?\n|$)/gm;
await fs.mkdir('work/v3-files-plugin',{recursive:true});
await fs.writeFile('work/v3-files-plugin/main.js',result.outputFiles[0].text.replace(modulePathComment,''));

await fs.copyFile('manifest.v3-files.json','work/v3-files-plugin/manifest.json');
for(const p of ['work/v3-files-plugin/main.js','work/v3-files-plugin/manifest.json']){const text=await fs.readFile(p,'utf8');for(const re of [/\/Users\//,/192\.168\.[0-9]+\.[0-9]+/,/BEGIN (RSA |EC )?PRIVATE KEY/,/couchDB_PASSWORD/,/\/private\/var\/folders\//])if(re.test(text))throw Error('Private data pattern in V3 asset');}
