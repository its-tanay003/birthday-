import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port configuration (using standard fallback)
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

const server = http.createServer((req, res) => {
  // Normalize and sanitise path to prevent directory traversal
  let safeUrl = req.url.split('?')[0];
  if (safeUrl === '/') {
    safeUrl = '/index.html';
  }

  let filePath = path.join(__dirname, safeUrl);

  try {
    filePath = decodeURIComponent(filePath);
  } catch (e) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('400 Bad Request');
    return;
  }

  // Double check directory traversal vulnerability
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('403 Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('404 File Not Found');
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(`500 Internal Server Error: ${err.code}`);
      }
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(data);
    }
  });
});

function startServer(port) {
  server.listen(port);
}

server.on('listening', () => {
  const address = server.address();
  console.log('\n\x1b[35m%s\x1b[0m', '  ♥ Five Years of Us - Digital Love Letter ♥');
  console.log('\x1b[36m%s\x1b[0m', `  🚀 Local development server running at:`);
  console.log('\x1b[32m%s\x1b[0m', `  👉 http://localhost:${address.port}`);
  console.log('\x1b[90m%s\x1b[0m', '  (Press Ctrl+C to stop the server)\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const currentPort = err.port;
    console.log(`\x1b[33m  ⚠️  Port ${currentPort} is currently in use, trying next port... \x1b[0m`);
    startServer(currentPort + 1);
  } else {
    console.error('  ❌ Server error:', err);
  }
});

startServer(PORT);
