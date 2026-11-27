// A static server that behaves like GitHub Pages for a project site:
// the site lives under SITE_BASE, a directory without a trailing slash redirects to it,
// a directory serves its index.html, and anything missing gets the site's 404.html with status 404.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const base = process.env.DSF_SITE_BASE ?? '/digital-signature-field/';
const port = Number(process.env.PORT ?? 4390);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

async function file(path) {
  try {
    return (await stat(path)).isFile() ? path : null;
  } catch {
    return null;
  }
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function send(res, status, path) {
  res.writeHead(status, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(res);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith(base) || `${pathname}/` === base) {
    const relative = normalize(pathname.slice(base.length)).replace(/^(\.\.[/\\])+/, '');
    const target = join(root, relative);
    if (!pathname.endsWith('/') && (await isDirectory(target))) {
      res.writeHead(301, { location: `${pathname}/${url.search}` });
      res.end();
      return;
    }
    const found = await file(pathname.endsWith('/') ? join(target, 'index.html') : target);
    if (found) return send(res, 200, found);
  }
  send(res, 404, join(root, '404.html'));
}).listen(port, () => console.log(`Pages site at http://localhost:${port}${base}`));
