/**
 * ==========================================================================
 * WWPanel / WPlay - Automated Backend & API Bridge (Node.js)
 * Serves the Client Admin Panel and connects live to https://mcapi.knewcms.com:2087
 * ==========================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3000;
const BASE_WPLAY_API = 'https://mcapi.knewcms.com:2087';

// Active Integration Token provided by user
let WPLAY_API_KEY = 'wz_d5dc6ad7b3056b60f1f008c20f9aed79';

// Helper to make requests to WPlay Official API
async function callWPlayApi(endpoint, method = 'GET', body = null) {
  const url = `${BASE_WPLAY_API}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${WPLAY_API_KEY}`,
    'x-api-key': WPLAY_API_KEY
  };

  const options = { method, headers };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    console.error(`[WPlay API Error] ${method} ${url}:`, error.message);
    return { status: 500, ok: false, error: error.message };
  }
}

// MIME types for serving static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = parsedUrl.pathname;

  // Helper to read JSON request body
  const readBody = () => new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
    });
  });

  // ==================== API ENDPOINTS ====================

  // 1. Check API Key & Connection Status
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // Test connectivity against WPlay API
    const check = await callWPlayApi('/auth/static-token', 'POST', { token: WPLAY_API_KEY });
    return res.end(JSON.stringify({
      status: 'connected',
      tokenPrefix: WPLAY_API_KEY.substring(0, 8) + '...',
      apiHost: BASE_WPLAY_API,
      wplayCheck: check
    }));
  }

  // 2. Update API Key on the fly
  if (pathname === '/api/set-token' && req.method === 'POST') {
    const body = await readBody();
    if (body.token) {
      WPLAY_API_KEY = body.token.trim();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, token: WPLAY_API_KEY.substring(0, 8) + '...' }));
  }

  // 3. Fetch Live Users List from WPlay Official API (is_trial = 0)
  if (pathname === '/api/wplay/users' && req.method === 'GET') {
    let result = await callWPlayApi('/lines?limit=200');
    let items = result.data?.items || (Array.isArray(result.data) ? result.data : []);
    res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(items));
  }

  // 3b. Fetch Live Tests List from WPlay Official API (is_trial = 1)
  if (pathname === '/api/wplay/tests' && req.method === 'GET') {
    let result = await callWPlayApi('/lines?is_trial=1&limit=200');
    let items = result.data?.items || (Array.isArray(result.data) ? result.data : []);
    res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(items));
  }

  // 4. Create New Client / Line on WPlay Official API
  if (pathname === '/api/wplay/users' && req.method === 'POST') {
    const body = await readBody();
    console.log('[WPlay Bridge] Creating User on Official API:', body);
    
    // Call POST /lines/v2
    let result = await callWPlayApi('/lines/v2', 'POST', body);
    if (!result.ok && result.status === 404) {
      result = await callWPlayApi('/linhas/v2', 'POST', body);
    }
    res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result.data || { success: result.ok }));
  }

  // 5. Create Quick Test on WPlay Official API
  if (pathname === '/api/wplay/tests' && req.method === 'POST') {
    const body = await readBody();
    console.log('[WPlay Bridge] Creating Test on Official API:', body);
    
    let result = await callWPlayApi('/lines/test', 'POST', body);
    if (!result.ok && result.status === 404) {
      result = await callWPlayApi('/linhas/teste', 'POST', body);
    }
    res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result.data || { success: result.ok }));
  }

  // 6. Extend / Renew Expiration
  if (pathname.startsWith('/api/wplay/users/') && pathname.endsWith('/extend') && req.method === 'PATCH') {
    const id = pathname.split('/')[4];
    const body = await readBody();
    console.log(`[WPlay Bridge] Extending Line #${id} on Official API:`, body);
    
    const result = await callWPlayApi(`/lines/v2/extend/${id}`, 'PATCH', body);
    res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result.data || { success: result.ok }));
  }

  // 7. Update User Details
  if (pathname.startsWith('/api/wplay/users/') && !pathname.endsWith('/extend') && req.method === 'PATCH') {
    const id = pathname.split('/')[4];
    const body = await readBody();
    console.log(`[WPlay Bridge] Updating Line #${id} on Official API:`, body);
    
    let result = await callWPlayApi(`/lines/${id}`, 'PATCH', body);
    if (!result.ok && result.status === 404) {
      result = await callWPlayApi(`/linhas/${id}`, 'PATCH', body);
    }
    res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result.data || { success: result.ok }));
  }

  // 8. Delete User
  if (pathname.startsWith('/api/wplay/users/') && req.method === 'DELETE') {
    const id = pathname.split('/')[4];
    console.log(`[WPlay Bridge] Deleting Line #${id} from Official API`);
    
    let result = await callWPlayApi(`/lines/${id}`, 'DELETE');
    if (!result.ok && result.status === 404) {
      result = await callWPlayApi(`/linhas/${id}`, 'DELETE');
    }
    res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result.data || { success: result.ok }));
  }

  // ==================== STATIC FILE SERVING ====================
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('500 Internal Server Error');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================================`);
  console.log(`[WPlay Live Bridge Server] Running at http://localhost:${PORT}`);
  console.log(`Active API Key: ${WPLAY_API_KEY.substring(0, 10)}...`);
  console.log(`Connected API Target: ${BASE_WPLAY_API}`);
  console.log(`====================================================================`);
});
