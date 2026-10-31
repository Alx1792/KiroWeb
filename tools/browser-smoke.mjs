import { spawn } from 'node:child_process';
import { access, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const candidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
let browser;
for (const candidate of candidates) {
  try { await access(candidate); browser = candidate; break; } catch {}
}
if (!browser) throw new Error('No s’ha trobat Chrome o Edge. Defineix CHROME_PATH.');

const profile = resolve('.tmp-browser-smoke');
const port = 9347;
await rm(profile, { recursive:true, force:true, maxRetries:3, retryDelay:100 });
const url = pathToFileURL(resolve('index.html')).href;
const chrome = spawn(browser, [
  '--headless=new', '--disable-extensions', '--disable-background-networking', '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1280,900', url,
], { stdio:'ignore', windowsHide:true });

let socket;
try {
  let target;
  for (let attempt=0; attempt<50; attempt++) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      target = targets.find((entry) => entry.type === 'page');
      if (target) break;
    } catch {}
    await sleep(100);
  }
  if (!target) throw new Error('No s’ha pogut connectar amb el navegador headless.');

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener('open', resolvePromise, { once:true });
    socket.addEventListener('error', reject, { once:true });
  });
  let requestId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  const cdp = (method, params={}) => new Promise((resolvePromise, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve:resolvePromise, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const keyCodes = { Enter:13, Escape:27, ArrowDown:40 };
  const key = async (code) => {
    const windowsVirtualKeyCode = keyCodes[code];
    await cdp('Input.dispatchKeyEvent', { type:'rawKeyDown', key:code, code, windowsVirtualKeyCode });
    await cdp('Input.dispatchKeyEvent', { type:'keyUp', key:code, code, windowsVirtualKeyCode });
    await sleep(190);
  };
  const evaluate = async (expression) => (await cdp('Runtime.evaluate', { expression, returnByValue:true })).result.value;
  const scene = () => evaluate('document.querySelector("#game").dataset.scene');
  const capture = async () => {
    await sleep(220);
    const image = await cdp('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
    if (!image.data || image.data.length < 12000) throw new Error('Captura visual buida.');
    return image.data;
  };
  const reload = async () => { await cdp('Page.reload', { ignoreCache:true }); await sleep(1800); };
  const expectScene = async (expected) => {
    const current = await scene();
    if (current !== expected) throw new Error(`Escena esperada ${expected}, rebuda ${current}.`);
    await capture();
  };

  await cdp('Page.enable');
  await sleep(1800);
  await expectScene('title');

  await key('ArrowDown'); await key('ArrowDown'); await key('Enter');
  await expectScene('controls');
  await key('Escape');

  await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); await key('Enter');
  await expectScene('options');
  await key('Escape');

  await key('Enter');
  await expectScene('select');
  await key('Enter');
  await expectScene('bracket');
  await key('Enter');
  await expectScene('vs');
  await sleep(3400);
  await expectScene('battle');
  await sleep(3300);
  await key('Escape');
  await expectScene('battle');

  await reload();
  await key('ArrowDown'); await key('Enter');
  await expectScene('select');
  await key('Enter'); await key('ArrowDown'); await key('Enter');
  await expectScene('stage');
  await key('Enter');
  await expectScene('vs');
  await sleep(3400);
  await expectScene('battle');

  await cdp('Emulation.setEmulatedMedia', { features:[{ name:'prefers-reduced-motion', value:'reduce' }] });
  await reload();
  if (!await evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')) throw new Error('Moviment reduït no detectat.');
  const reducedA = await capture();
  await sleep(450);
  const reducedB = await capture();
  if (reducedA !== reducedB) throw new Error('La portada encara anima elements amb moviment reduït.');

  await cdp('Emulation.setEmulatedMedia', { features:[{ name:'forced-colors', value:'active' }] });
  await reload();
  if (!await evaluate('matchMedia("(forced-colors: active)").matches')) throw new Error('Colors forçats no detectats.');
  await capture();

  console.log('Browser smoke OK · torneig · PvP · opcions · controls · estadis · combat · pausa · reduced motion · forced colors');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill();
  await sleep(250);
  await rm(profile, { recursive:true, force:true, maxRetries:5, retryDelay:150 });
}
