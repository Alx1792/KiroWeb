import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    let file = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
    if (!file.startsWith(root)) throw new Error('Ruta no vàlida');
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type':mime[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end('No trobat');
  }
}).listen(port, () => console.log(`Bey Battle: Metal Fury — http://localhost:${port}`));
