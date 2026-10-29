import { access,readdir,readFile,stat } from 'node:fs/promises';
import { join,extname } from 'node:path';
import { BLADERS,STADIUMS } from '../js/data/gameData.js';
const roots=['js','tools','tests'],validIds={beys:new Set(BLADERS.map((entry)=>entry.id)),characters:new Set(BLADERS.map((entry)=>entry.id)),arenas:new Set(STADIUMS.map((entry)=>entry.id))};let failures=0,files=0;
async function walk(path){for(const name of await readdir(path)){const full=join(path,name),info=await stat(full);if(info.isDirectory())await walk(full);else if(['.js','.mjs'].includes(extname(name))){files++;const source=await readFile(full,'utf8');if(/\b(?:eval|new Function)\s*\(/.test(source)){console.error(`Codi dinàmic prohibit: ${full}`);failures++}}}}
for(const root of roots)try{await walk(root)}catch(error){if(error.code!=='ENOENT')throw error}
const html=await readFile('index.html','utf8');for(const required of ['id="game"','type="module"','importmap'])if(!html.includes(required)){console.error(`Falta ${required} a index.html`);failures++}
const manifest=JSON.parse(await readFile('assets/models/manifest.json','utf8'));if(manifest.version!==2){console.error('El manifest de models ha de ser v2');failures++}
for(const [key,descriptor] of Object.entries(manifest.models||{})){const [type,id]=key.split(':');if(!validIds[type]?.has(id)){console.error(`Model desconegut: ${key}`);failures++;continue}if(!descriptor.path||!descriptor.license||!descriptor.source){console.error(`Metadades incompletes: ${key}`);failures++}try{await access(descriptor.path)}catch{console.error(`Fitxer de model inexistent: ${descriptor.path}`);failures++}if(type==='beys'&&descriptor.parts&&!['layer','disc','driver'].every((part)=>descriptor.parts[part])){console.error(`Contracte Burst incomplet: ${key}`);failures++}}
console.log(`${files} scripts revisats · ${Object.keys(manifest.models||{}).length} models registrats · ${failures} errors`);process.exitCode=failures?1:0;
