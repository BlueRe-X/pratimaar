/**
 * PratimaAR - Local Development Server
 * Server HTTP / HTTPS ringan tanpa dependensi eksternal (Node.js Native)
 * Dilengkapi pendeteksi IP lokal untuk kemudahan akses dari ponsel di jaringan Wi-Fi yang sama.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { processRequest: processGeminiRequest } = require('./api/gemini');

// Fungsi pembaca .env mandiri (Zero-dependency)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envPath);
      } else {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          line = line.trim();
          if (!line || line.startsWith('#')) return;
          const eqIdx = line.indexOf('=');
          if (eqIdx !== -1) {
            const key = line.substring(0, eqIdx).trim();
            let val = line.substring(eqIdx + 1).trim();
            val = val.replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        });
      }
    } catch (e) {
      console.warn("Peringatan saat memuat .env:", e.message);
    }
  }
}

// Muat variabel lingkungan
loadEnv();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// MIME Types lengkap untuk WebAR & 3D Assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mind': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2'
};

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

function handleRequest(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse path & sanitize
  let cleanUrl = req.url.split('?')[0];

  if (cleanUrl === '/api/gemini') {
    if (req.method !== 'POST') {
      processGeminiRequest({ method: req.method, headers: req.headers, body: null }).then(result => {
        res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result.body));
      });
      return;
    }

    let rawBody = '';
    let bodyTooLarge = false;
    req.on('data', chunk => {
      if (bodyTooLarge) return;
      rawBody += chunk;
      if (rawBody.length > 16384) {
        bodyTooLarge = true;
        rawBody = '';
      }
    });
    req.on('end', async () => {
      if (bodyTooLarge) {
        res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: { message: 'Permintaan terlalu besar.' } }));
        return;
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: { message: 'Format permintaan tidak valid.' } }));
        return;
      }

      const result = await processGeminiRequest({ method: req.method, headers: req.headers, body });
      res.writeHead(result.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify(result.body));
    });
    return;
  }

  if (cleanUrl === '/' || cleanUrl === '') {
    cleanUrl = '/index.html';
  }

  const filePath = path.join(__dirname, decodeURIComponent(cleanUrl));

  // Cegah directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + cleanUrl);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  const localIps = getLocalIpAddresses();
  console.log('====================================================');
  console.log('✨ PratimaAR Web Server Berhasil Berjalan! ✨');
  console.log('====================================================');
  console.log(`\n🔑 API Key Gemini diatur secara lokal melalui menu Pengaturan aplikasi.`);
  console.log(`   Port Server    : ${PORT}`);
  console.log(`   Environment    : ${process.env.NODE_ENV || 'development'}`);

  console.log(`\n💻 Akses Komputer Lokal (Desktop/Laptop):`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://127.0.0.1:${PORT}`);
  
  if (localIps.length > 0) {
    console.log(`\n📱 Akses Perangkat Ponsel (Satu Jaringan Wi-Fi):`);
    localIps.forEach(ip => {
      console.log(`   http://${ip}:${PORT}`);
    });
  }
  console.log('\n💡 Catatan Kamera WebAR di Ponsel:');
  console.log('   Browser mobile (Chrome/Safari) mewajibkan HTTPS atau localhost.');
  console.log('   Jika mengakses via IP di ponsel, aktifkan Chrome Flag:');
  console.log(`   chrome://flags/#unsafely-treat-insecure-origin-as-secure`);
  console.log(`   Lalu tambahkan URL: http://${localIps[0] || '192.168.x.x'}:${PORT}`);
  console.log('====================================================\n');
});
