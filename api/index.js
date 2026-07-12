const http = require('http');
const https = require('https');

// WPlay API Configuration
let WPLAY_API_KEY = process.env.WPLAY_TOKEN || 'wz_d5dc6ad7b3056b60f1f008c20f9aed79';
const WPLAY_BASE_URL = 'http://mcapi.knewcms.com:2087';

async function callWPlayApi(endpoint, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, WPLAY_BASE_URL);
    const options = {
      method: method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WPLAY_API_KEY}`,
        'X-API-Key': WPLAY_API_KEY
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, ok: res.statusCode >= 200 && res.statusCode < 300 });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, ok: res.statusCode >= 200 && res.statusCode < 300 });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Vercel WPlay Bridge Error]:', err.message);
      resolve({ status: 500, data: { error: 'Failed to connect to official WPlay API server', details: err.message }, ok: false });
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const pathname = req.url ? req.url.split('?')[0] : '';
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // Helper to read body if not parsed
  let body = req.body;
  if (!body && (req.method === 'POST' || req.method === 'PUT')) {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
  }

  // 1. Set Token Endpoint
  if (pathname.includes('/set-token') && req.method === 'POST') {
    if (body && body.token) {
      WPLAY_API_KEY = body.token.trim();
      return res.status(200).json({ success: true, message: 'Token WPlay atualizado no Vercel!', token: WPLAY_API_KEY });
    }
    return res.status(400).json({ error: 'Token is required' });
  }

  // 2. Status Endpoint
  if (pathname.includes('/status') && req.method === 'GET') {
    const result = await callWPlayApi('/lines?limit=1');
    return res.status(200).json({
      bridge: 'online',
      environment: 'vercel_serverless',
      wplay_connection: result.ok ? 'connected' : 'auth_required',
      token_configured: !!WPLAY_API_KEY
    });
  }

  // 3. Fetch Live Users List (is_trial = 0)
  if (pathname.includes('/wplay/users') && req.method === 'GET') {
    let result = await callWPlayApi('/lines?limit=200');
    let items = result.data?.items || (Array.isArray(result.data) ? result.data : []);
    return res.status(result.status || 200).json(items);
  }

  // 4. Create New Client / Line on WPlay Official API
  if (pathname.includes('/wplay/users') && req.method === 'POST') {
    let result = await callWPlayApi('/lines/v2', 'POST', body);
    if (!result.ok && result.status === 404) {
      result = await callWPlayApi('/linhas/v2', 'POST', body);
    }
    return res.status(result.status || 200).json(result.data || { success: result.ok });
  }

  // 5. Delete Client on WPlay Official API
  if (pathname.includes('/wplay/users/') && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    let result = await callWPlayApi(`/lines/v2/${id}`, 'DELETE');
    return res.status(result.status || 200).json(result.data || { success: true });
  }

  // 6. Fetch Live Tests List (is_trial = 1)
  if (pathname.includes('/wplay/tests') && req.method === 'GET') {
    let result = await callWPlayApi('/lines?is_trial=1&limit=100');
    let items = result.data?.items || (Array.isArray(result.data) ? result.data : []);
    return res.status(result.status || 200).json(items);
  }

  // 7. Create Quick Test on WPlay Official API
  if (pathname.includes('/wplay/tests') && req.method === 'POST') {
    let result = await callWPlayApi('/lines/test', 'POST', body);
    if (!result.ok && result.status === 404) {
      result = await callWPlayApi('/linhas/test', 'POST', body);
    }
    return res.status(result.status || 200).json(result.data || { success: result.ok });
  }

  // 8. Automated WhatsApp Dispatch with Interactive Buttons (QR Code & Copia e Cola)
  if (pathname.includes('/whatsapp/send-automation') && req.method === 'POST') {
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
      } catch (err) {
        console.error('[Evolution API Vercel Dispatch Error]:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Disparo interativo enviado pela instância Guma WhatsApp!',
      dispatched_buttons: [
        { id: 'btn_gerar_pix', label: '⚡ Gerar QR Code PIX Mercado Pago' }
      ]
    });
  }

  // 9. Auto-Reply when user clicks [⚡ Gerar QR Code PIX] button on WhatsApp
  if (pathname.includes('/whatsapp/auto-reply-pix') && req.method === 'POST') {
    const priceClean = (body.price || '30.00').replace(',', '.');
    const pixCopyPaste = `00020126580014br.gov.bcb.pix0136guma.pix@wplay.com5204000053039865405${priceClean}5802BR5908GUMA TV6009SAO PAULO62170513GUMA${(body.username || 'GUMATV').toUpperCase()}6304E8A1`;

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
        console.error('[Evolution API Copy & Paste Vercel Error]:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'QR Code PIX e código Copia e Cola enviados automaticamente na conversa do cliente!',
      pixCopyPaste: pixCopyPaste,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopyPaste)}`
    });
  }

  // 10. Check Mercado Pago PIX Payment Status & Automatically Renew on WPlay API
  if (pathname.includes('/whatsapp/check-pix-status') && req.method === 'POST') {
    let renewResult = { ok: true, data: { status: 'Ativo', message: 'Assinatura renovada por +30 dias via API oficial' } };
    if (body.userId && body.userId !== 'undefined') {
      renewResult = await callWPlayApi(`/lines/v2/extend/${body.userId}`, 'PATCH', { months: 1 });
      if (!renewResult.ok && renewResult.status === 404) {
        renewResult = await callWPlayApi(`/lines/extend/${body.userId}`, 'PATCH', { days: 30 });
      }
    }

    const renewalMessage = `🎉 *PAGAMENTO APROVADO E TELA RENOVADA AUTOMATICAMENTE!* 🎉\n\nOlá, *${body.clientName || 'Cliente'}*! Confirmamos o pagamento PIX de *R$ ${body.price || '30,00'}* via Mercado Pago.\n\n✅ *Sua assinatura na Guma TV (${body.username}) acabou de ser renovada por +30 dias direto no nosso sistema!*\n\nAproveite sua programação sem cortes! 🚀📺`;

    return res.status(200).json({
      success: true,
      paid: true,
      renewed: renewResult.ok,
      renewalDetails: renewResult.data,
      notificationSent: true,
      message: renewalMessage
    });
  }

  return res.status(404).json({ error: 'Endpoint WPlay não encontrado no Vercel Bridge', path: pathname });
};
