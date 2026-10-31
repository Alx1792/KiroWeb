import { spawn } from 'node:child_process';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const sleep=(ms)=>new Promise((r)=>setTimeout(r,ms));
const candidates=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'];let browser;
for(const candidate of candidates){try{await access(candidate);browser=candidate;break}catch{}}
if(!browser)throw new Error('Browser not found');
const out=resolve('.phase1-review'),profile=resolve('.phase1-review-profile'),port=9352;
await rm(out,{recursive:true,force:true});await rm(profile,{recursive:true,force:true});await mkdir(out);
const chrome=spawn(browser,['--headless=new','--disable-extensions','--disable-background-networking','--allow-file-access-from-files',`--remote-debugging-port=${port}`,'--remote-allow-origins=*',`--user-data-dir=${profile}`,'--window-size=1280,900','about:blank'],{stdio:'ignore',windowsHide:true});
let target;for(let i=0;i<50;i++){try{const list=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());target=list.find(x=>x.type==='page');if(target)break}catch{}await sleep(100)}if(!target)throw new Error('No target');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});let id=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.bad(new Error(m.error.message)):p.ok(m.result)}});const cdp=(method,params={})=>new Promise((ok,bad)=>{const n=++id;pending.set(n,{ok,bad});ws.send(JSON.stringify({id:n,method,params}))});
const evalJs=expr=>cdp('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
async function shot(name,wait=120){await sleep(wait);const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,`${name}.png`),Buffer.from(r.data,'base64'))}
async function key(code,key,virtual){await cdp('Input.dispatchKeyEvent',{type:'rawKeyDown',code,key,windowsVirtualKeyCode:virtual});await cdp('Input.dispatchKeyEvent',{type:'keyUp',code,key,windowsVirtualKeyCode:virtual});await sleep(220)}
try{
 await cdp('Page.enable');await cdp('Page.addScriptToEvaluateOnNewDocument',{source:'globalThis.BEY_BATTLE_TEST=true;globalThis.BEY_BATTLE_SEED=123;'});await cdp('Page.navigate',{url:pathToFileURL(resolve('index.html')).href});await sleep(1900);await shot('01-title');
 await key('Enter','Enter',13);await shot('02-roster-gingka',250);
 await evalJs("BEY_BATTLE_TEST_API.setUnlocked(true);BEY_BATTLE_TEST_API.state.cursor=8;BEY_BATTLE_TEST_API.go('select');BEY_BATTLE_TEST_API.state.cursor=8;BEY_BATTLE_TEST_API.state.t=1;BEY_BATTLE_TEST_API.draw()");await shot('03-roster-rago',20);
 await evalJs("BEY_BATTLE_TEST_API.startMatch('gingka','kyoya','classic',{human2:true});const m=BEY_BATTLE_TEST_API.state.match;BEY_BATTLE_TEST_API.state.t=1;m.phase='fight';m.beys.forEach(b=>b.spin=900);m.beys[0].x=130;m.beys[1].x=190;BEY_BATTLE_TEST_API.draw()");await shot('04-battle-small',20);
 await evalJs("BEY_BATTLE_TEST_API.triggerSpecial(0);BEY_BATTLE_TEST_API.state.match.cut.t=.35;BEY_BATTLE_TEST_API.draw()");await shot('05-gingka-cutin',5);
 await evalJs("BEY_BATTLE_TEST_API.state.match.phase='fight';BEY_BATTLE_TEST_API.triggerSpecial(1);BEY_BATTLE_TEST_API.state.match.cut.t=.35;BEY_BATTLE_TEST_API.draw()");await shot('06-kyoya-cutin',5);
 console.log('Phase 1 captures OK');
}finally{ws.close();chrome.kill();await sleep(250);await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:150})}
