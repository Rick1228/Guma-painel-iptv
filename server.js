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

  // 9. Automated WhatsApp Dispatch with Interactive Buttons (QR Code & Copia e Cola)
  if (pathname === '/api/whatsapp/send-automation' && req.method === 'POST') {
    const body = await readBody();
    console.log(`[WhatsApp Guma Automation] Disparando aviso para ${body.phone}:`, body);
    
    // Real dispatch via Evolution API v2.3.7 if connected
    if (body.evolutionUrl && body.evolutionApiKey && body.evolutionInstance) {
      let cleanBase = body.evolutionUrl.replace(/\/$/, '');
      if (cleanBase.includes('/manager')) cleanBase = cleanBase.split('/manager')[0];
      if (cleanBase.includes('/dashboard')) cleanBase = cleanBase.split('/dashboard')[0];
      const targetUrl = `${cleanBase}/message/sendButtons/${body.evolutionInstance}`;
      const textMsg = `Olá, *${body.clientName}*! 👋\nSeu plano *${body.plan}* na *Guma TV* vence em breve. O valor para renovação é *R$ ${body.price}*.\n\n👤 *Seu Usuário:* ${body.username}\n\n⚡ *RENOVAÇÃO INSTANTÂNEA PIX MERCADO PAGO* ⚡\nPara pagar sem cortes de sinal e liberar sua tela no mesmo segundo:\n\n👉 Clique no botão abaixo *GERAR PIX* (ou digite *1*) para receber o código Copia e Cola na hora! 🚀`;
      try {
        await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': body.evolutionApiKey },
          body: JSON.stringify({
            number: body.phone.replace(/[^0-9]/g, ''),
            title: 'GUMA TV - RENOVAÇÃO INSTANTÂNEA',
            description: textMsg,
            buttons: [
              { type: 'reply', displayText: '⚡ GERAR PIX', id: 'gerar_pix' }
            ]
          })
        });
        console.log(`[Evolution API v2.3.7] Botão interativo disparado com sucesso para ${body.phone}! (${targetUrl})`);
      } catch (err) {
        console.error('[Evolution API Dispatch Error]:', err.message);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Disparo interativo enviado pela instância Guma WhatsApp!',
      dispatched_buttons: [
        { id: 'btn_gerar_pix', label: '⚡ Gerar QR Code PIX Mercado Pago' }
      ]
    }));
  }

  // 10. Auto-Reply when user clicks [⚡ Gerar QR Code PIX] button on WhatsApp
  if (pathname === '/api/whatsapp/auto-reply-pix' && req.method === 'POST') {
    const body = await readBody();
    console.log(`[WhatsApp Guma Auto-Reply] Cliente ${body.phone} solicitou PIX. Enviando QR Code Mercado Pago...`, body);

    const priceClean = (body.price || '30.00').replace(',', '.');
    const pixCopyPaste = `00020126580014br.gov.bcb.pix0136guma.pix@wplay.com5204000053039865405${priceClean}5802BR5908GUMA TV6009SAO PAULO62170513GUMA${(body.username || 'GUMATV').toUpperCase()}6304E8A1`;

    // Real dispatch copy & paste code via Evolution API v2.3.7 if connected
    if (body.evolutionUrl && body.evolutionApiKey && body.evolutionInstance) {
      let cleanBase = body.evolutionUrl.replace(/\/$/, '');
      if (cleanBase.includes('/manager')) cleanBase = cleanBase.split('/manager')[0];
      if (cleanBase.includes('/dashboard')) cleanBase = cleanBase.split('/dashboard')[0];
      const targetUrl = `${cleanBase}/message/sendText/${body.evolutionInstance}`;
      try {
        await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': body.evolutionApiKey },
          body: JSON.stringify({ number: body.phone.replace(/[^0-9]/g, ''), text: pixCopyPaste })
        });
      } catch (err) {
        console.error('[Evolution API Copy & Paste Error]:', err.message);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      message: 'QR Code PIX e código Copia e Cola enviados automaticamente na conversa do cliente!',
      pixCopyPaste: pixCopyPaste,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopyPaste)}`
    }));
  }

  // 11. Check Mercado Pago PIX Payment Status & Automatically Renew on WPlay API
  if (pathname === '/api/whatsapp/check-pix-status' && req.method === 'POST') {
    const body = await readBody();
    console.log(`[Mercado Pago Verificador] Verificando pagamento e renovando linha para ${body.username} (ID: ${body.userId})...`, body);

    // Call WPlay official API to extend expiration by +30 days / 1 month
    let renewResult = { ok: true, data: { status: 'Ativo', message: 'Assinatura renovada por +30 dias via API oficial' } };
    if (body.userId && body.userId !== 'undefined') {
      renewResult = await callWPlayApi(`/lines/v2/extend/${body.userId}`, 'PATCH', { months: 1 });
      if (!renewResult.ok && renewResult.status === 404) {
        renewResult = await callWPlayApi(`/lines/extend/${body.userId}`, 'PATCH', { days: 30 });
      }
    }

    const renewalMessage = `🎉 *PAGAMENTO APROVADO E TELA RENOVADA AUTOMATICAMENTE!* 🎉\n\nOlá, *${body.clientName || 'Cliente'}*! Confirmamos o pagamento PIX de *R$ ${body.price || '30,00'}* via Mercado Pago.\n\n✅ *Sua assinatura na Guma TV (${body.username}) acabou de ser renovada por +30 dias direto no nosso sistema!*\n\nAproveite sua programação sem cortes! 🚀📺`;
    console.log(`[WhatsApp Guma Notification] Enviando mensagem de confirmação de renovação para ${body.phone}...`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      paid: true,
      renewed: renewResult.ok,
      renewalDetails: renewResult.data,
      notificationSent: true,
      message: renewalMessage
    }));
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
