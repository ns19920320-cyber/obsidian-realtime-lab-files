import {build} from 'esbuild';
import fs from 'node:fs/promises';
const result=await build({entryPoints:['src/plugin.ts'],outfile:'main.js',bundle:true,format:'cjs',platform:'browser',target:'es2022',write:false,external:['obsidian','@codemirror/state','@codemirror/view','@codemirror/language']});
// Remove only esbuild's standalone module-location annotations; preserve source
// code, normal documentation and third-party legal notices without minification.
const modulePathComment=/^\/\/ (?:\.{1,2}\/|node_modules\/|src\/|\/Users\/|\/private\/|[A-Za-z]:[\\/]).*(?:\r?\n|$)/gm;
await fs.writeFile('main.js',result.outputFiles[0].text.replace(modulePathComment,''));
