import { createServer } from 'node:http';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const port = Number.parseInt(readArg('--port', '4174'), 10);
const host = readArg('--host', '127.0.0.1');
const root = path.resolve(readArg('--root', 'dist'));
const compressedCache = new Map();

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const resolveRequest = async (requestPath) => {
  const decoded = decodeURIComponent(requestPath);
  const relative = decoded.replace(/^\/+/, '');
  const exact = path.resolve(root, relative);
  if (exact.startsWith(root) && (await exists(exact)) && (await stat(exact)).isFile()) return exact;

  const prerendered = path.resolve(root, relative, 'index.html');
  if (
    prerendered.startsWith(root) &&
    (await exists(prerendered)) &&
    (await stat(prerendered)).isFile()
  ) {
    return prerendered;
  }

  return path.join(root, 'index.html');
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`);

    // Vercel injects this endpoint in production; an empty local response keeps
    // audit results from being penalized for infrastructure absent in preview.
    if (url.pathname === '/_vercel/insights/script.js') {
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentTypes['.js'],
      });
      response.end('');
      return;
    }

    const file = await resolveRequest(url.pathname);
    const source = await readFile(file);
    const extension = path.extname(file).toLowerCase();
    const acceptsBrotli = /\bbr\b/.test(request.headers['accept-encoding'] ?? '');
    const isCompressible = ['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml'].includes(extension);
    const isHashedAsset = url.pathname.startsWith('/assets/');
    const headers = {
      'Cache-Control': isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate',
      'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
      Vary: 'Accept-Encoding',
    };

    let body = source;
    if (acceptsBrotli && isCompressible) {
      const cacheKey = file;
      body =
        compressedCache.get(cacheKey) ??
        brotliCompressSync(source, {
          params: {
            [zlibConstants.BROTLI_PARAM_QUALITY]: 6,
          },
        });
      compressedCache.set(cacheKey, body);
      headers['Content-Encoding'] = 'br';
    }

    headers['Content-Length'] = String(body.length);
    response.writeHead(200, headers);
    response.end(body);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, host, () => {
  console.log(`Audit build available at http://${host}:${port}`);
});
