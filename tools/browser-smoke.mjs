import { spawn, spawnSync } from 'node:child_process';
import { access, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
const candidates=[process.env.CHROME_PATH,'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
let browser=null;for(const candidate of candidates){try{await access(candidate);browser=candidate;break}catch{}}
if(!browser)throw new Error('No s’ha trobat Chrome o Edge. Defineix CHROME_PATH.');
const profile=join(process.cwd(),'.tmp-browser-smoke'),screenshot=join(profile,'battle.png');await rm(profile,{recursive:true,force:true});
const server=spawn(process.execPath,['tools/server.mjs'],{cwd:process.cwd(),stdio:'ignore'});
try{
  await sleep(700);
  const args=['--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-extensions','--disable-background-networking',`--user-data-dir=${profile}`,'--window-size=1280,720','--virtual-time-budget=5000',`--screenshot=${screenshot}`,'--dump-dom','http://localhost:4173/?smoke=pvp'];
  const result=spawnSync(browser,args,{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,windowsHide:true});
  if(result.error)throw result.error;if(result.status!==0)throw new Error(`Navegador exit ${result.status}: ${result.stderr}`);
  if(/Uncaught|TypeError|ReferenceError|SyntaxError/.test(result.stderr||''))throw new Error(`Error JavaScript del navegador: ${result.stderr}`);
  const dom=result.stdout;
  if(!dom.includes('data-engine="three.js r186"'))throw new Error('Three.js no ha inicialitzat el canvas');
  const smokeState=dom.match(/data-smoke="([^"]+)"/)?.[1]||'absent';
  if(smokeState!=='battle:fight:2:serpent:swept:true:3:2:2:3:true')throw new Error(`El flux 3D no ha validat GLB extern, combat, tres peces Burst, reconstrucció, tutorial i VFX (estat: ${smokeState})`);
  if(!dom.includes('PAUSA'))throw new Error('La pausa no s’ha renderitzat');
  if(dom.includes('WEBGL NO DISPONIBLE'))throw new Error('WebGL ha activat la pantalla de fallback');
  if(!dom.includes('class="loading-screen done"'))throw new Error('La pantalla de càrrega no ha finalitzat');
  const image=await stat(screenshot);if(image.size<10000)throw new Error('La captura del combat 3D és buida');
  const message=`Browser smoke OK · Three.js r186 · GLB CC0 · 19 models · Burst 3 peces · reset · tutorial · VFX · pausa · captura ${image.size} bytes`;
  await writeFile('.browser-smoke-result.json',JSON.stringify({ok:true,message},null,2));console.log(message);
}catch(error){await writeFile('.browser-smoke-result.json',JSON.stringify({ok:false,error:error.stack||String(error)},null,2));console.error(error);process.exitCode=1}
finally{server.kill();await sleep(100);await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})}
