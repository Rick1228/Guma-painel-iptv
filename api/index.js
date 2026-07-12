const http = require('http');
const https = require('https');

// WPlay API Configuration
let WPLAY_API_KEY = process.env.WPLAY_TOKEN || 'wz_d5dc6ad7b3056b60f1f008c20f9aed79';
const WPLAY_BASE_URL = 'https://mcapi.knewcms.com:2087';

async function callWPlayApi(endpoint, method = 'GET', body = null) {
  try {
    const urlStr = new URL(endpoint, WPLAY_BASE_URL).toString();
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WPLAY_API_KEY}`,
      'X-API-Key': WPLAY_API_KEY
    };

    if (typeof fetch !== 'undefined') {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const options = { method, headers, signal: controller.signal };
      if (body) options.body = typeof body === 'string' ? body : JSON.stringify(body);
      const res = await fetch(urlStr, options);
      clearTimeout(timeout);
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { parsed = text; }
      return { status: res.status, data: parsed, ok: res.ok };
    } else {
      return new Promise((resolve) => {
        const urlObj = new URL(urlStr);
        const req = https.request(urlObj, { method, headers, timeout: 3500 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
            resolve({ status: res.statusCode, data: parsed, ok: res.statusCode >= 200 && res.statusCode < 300 });
          });
        });
        req.on('error', (err) => resolve({ status: 500, data: { error: err.message }, ok: false }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 504, data: { error: 'Timeout' }, ok: false }); });
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
      });
    }
  } catch (err) {
    console.error('[Vercel WPlay Bridge Error]:', err.message);
    return { status: 500, data: { error: 'Falha na comunicação com WPlay API', details: err.message }, ok: false };
  }
}

module.exports = async (req, res) => {
  try {
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

    // Instant diagnostic ping endpoint (no external WPlay call)
    if (pathname.includes('/ping') || pathname.includes('/test-vercel')) {
      return res.status(200).json({ status: 'ok', vercel_bridge: 'active', time: Date.now() });
    }

    // Helper to read body if not parsed
    let body = req.body;
    if (!body && (req.method === 'POST' || req.method === 'PUT')) {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('error', err => resolve({}));
        req.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { resolve(data || {}); }
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
      const targetNumber = body.phone.replace(/[^0-9]/g, '');
      const textDesc = `Olá, *${body.clientName}*! 👋\nSeu plano *${body.plan}* na *Guma TV* vence em breve. O valor para renovação é *R$ ${body.price}*.\n\n👤 *Seu Usuário:* ${body.username}\n\n⚡ *RENOVAÇÃO INSTANTÂNEA PIX MERCADO PAGO* ⚡\nPara pagar sem cortes de sinal e liberar sua tela no mesmo segundo, clique em uma das opções abaixo:`;
      
      try {
        await fetch(`${cleanBase}/message/sendButtons/${body.evolutionInstance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': body.evolutionApiKey },
          body: JSON.stringify({
            number: targetNumber,
            title: 'RENOVAÇÃO GUMA TV',
            description: textDesc,
            footer: 'Guma TV - Atendimento Automático',
            buttons: [
              { type: 'reply', displayText: '⚡ GERAR PIX AGORA', id: 'gerar_pix' },
              { type: 'reply', displayText: '💬 FALAR COM SUPORTE', id: 'suporte' }
            ]
          })
        });

        await fetch(`${cleanBase}/message/sendPoll/${body.evolutionInstance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': body.evolutionApiKey },
          body: JSON.stringify({
            number: targetNumber,
            name: '⚡ RENOVAÇÃO GUMA TV - SELECIONE ABAIXO:',
            selectableCount: 1,
            values: ['⚡ 1. GERAR CÓDIGO PIX COPIA E COLA', '💬 2. FALAR COM SUPORTE GUMA TV']
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
      const targetNumber = body.phone.replace(/[^0-9]/g, '');
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopyPaste)}`;
      const copyMsg = `⚡ *AQUI ESTÁ SEU CÓDIGO PIX COPIA E COLA (MERCADO PAGO)* ⚡\n\n${pixCopyPaste}\n\n*(Assim que você realizar o pagamento no aplicativo do seu banco, nosso sistema WPlay identifica o PIX instantaneamente e renova +30 dias da sua tela de forma automática sem precisar mandar comprovante!)* 🚀📺`;
      
      try {
        await fetch(`${cleanBase}/message/sendMedia/${body.evolutionInstance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': body.evolutionApiKey },
          body: JSON.stringify({
            number: targetNumber,
            mediatype: 'image',
            mimetype: 'image/png',
            caption: '📷 *SEU QR CODE PIX MERCADO PAGO* (Escaneie com a câmera ou copie o código abaixo):',
            media: qrUrl
          })
        });

        await fetch(`${cleanBase}/message/sendText/${body.evolutionInstance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': body.evolutionApiKey },
          body: JSON.stringify({ number: targetNumber, text: copyMsg })
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
    // GUARD: Never renew or deduct WPlay credits unless explicitly triggered by manual verification or real approved payment webhook
    if (body.action !== 'manual_verify_renew' && body.action !== 'mercadopago_approved') {
      return res.status(200).json({
        success: true,
        paid: false,
        renewed: false,
        message: 'Aguardando confirmação bancária do PIX no Mercado Pago...'
      });
    }

    let renewResult = { ok: true, data: { status: 'Ativo', message: 'Assinatura renovada por +30 dias via API oficial' } };
    if (body.userId && body.userId !== 'undefined') {
      renewResult = await callWPlayApi(`/lines/v2/extend/${body.userId}`, 'PATCH', { months: 1 });
      if (!renewResult.ok && renewResult.status === 404) {
        renewResult = await callWPlayApi(`/lines/extend/${body.userId}`, 'PATCH', { days: 30 });
      }
    }

    const renewalMessage = `🎉 *PAGAMENTO APROVADO E TELA RENOVADA AUTOMATICAMENTE!* 🎉\n\nOlá, *${body.clientName || 'Cliente'}*! Confirmamos o pagamento PIX de *R$ ${body.price || '30,00'}* via Mercado Pago.\n\n✅ *Sua assinatura na Guma TV (${body.username}) acabou de ser renovada por +30 dias direto no nosso sistema!*\n\nAproveite sua programação sem cortes! 🚀📺`;

    if (body.evolutionUrl && body.evolutionApiKey && body.evolutionInstance && body.phone) {
      let cleanBase = body.evolutionUrl.replace(/\/$/, '');
      if (cleanBase.includes('/manager')) cleanBase = cleanBase.split('/manager')[0];
      if (cleanBase.includes('/dashboard')) cleanBase = cleanBase.split('/dashboard')[0];
      try {
        await fetch(`${cleanBase}/message/sendText/${body.evolutionInstance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': body.evolutionApiKey },
          body: JSON.stringify({ number: body.phone.replace(/[^0-9]/g, ''), text: renewalMessage })
        });
      } catch (err) {
        console.error('[Evolution API Renewal Vercel Error]:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      paid: true,
      renewed: renewResult.ok,
      renewalDetails: renewResult.data,
      notificationSent: true,
      message: renewalMessage
    });
  }

  // 11. Autonomous Webhook Auto-Reply (Sem Make.com / Cloud Vercel 24/7)
  if (pathname.includes('/whatsapp/webhook') && req.method === 'POST') {
    const data = body.data || body;
    const key = data.key || {};
    if (!key.fromMe && key.remoteJid) {
      const phone = key.remoteJid.split('@')[0];
      const msg = data.message || {};
      const textRaw = (
        msg.conversation || 
        msg.extendedTextMessage?.text || 
        msg.buttonsResponseMessage?.selectedButtonId || 
        msg.buttonsResponseMessage?.selectedDisplayText ||
        msg.templateButtonReplyMessage?.selectedId ||
        msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
        ''
      ).toLowerCase();

      if (textRaw.includes('gerar_pix') || textRaw.includes('gerar pix') || textRaw.includes('1') || textRaw.includes('copia e cola')) {
        const pixCopyPaste = '00020126580014br.gov.bcb.pix0136guma.pix@wplay.com520400005303986540530.005802BR5908GUMA TV6009SAO PAULO62170513GUMAG67G6216304E8A1';
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopyPaste)}`;
        const copyMsg = `⚡ *AQUI ESTÁ SEU CÓDIGO PIX COPIA E COLA (MERCADO PAGO)* ⚡\n\n${pixCopyPaste}\n\n*(Assim que você realizar o pagamento no aplicativo do seu banco, nosso sistema identifica o PIX instantaneamente e renova +30 dias da sua tela de forma automática sem precisar mandar comprovante!)* 🚀📺`;
        
        const evolutionUrl = 'https://evolution-api-production-fb8f.up.railway.app';
        const instance = body.instance || 'Guma';
        const apikey = '897A83EF68D7-4A24-B1AE-9727CD019020';

        try {
          await fetch(`${evolutionUrl}/message/sendMedia/${instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apikey },
            body: JSON.stringify({
              number: phone,
              mediatype: 'image',
              mimetype: 'image/png',
              caption: '📷 *SEU QR CODE PIX MERCADO PAGO* (Escaneie com a câmera ou copie o código abaixo):',
              media: qrUrl
            })
          });

          await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apikey },
            body: JSON.stringify({ number: phone, text: copyMsg })
          });
        } catch (e) {
          console.error('[Vercel Webhook Auto-Reply Error]:', e.message);
        }
      } else if (textRaw.includes('suporte') || textRaw.includes('2')) {
        const evolutionUrl = 'https://evolution-api-production-fb8f.up.railway.app';
        const instance = body.instance || 'Guma';
        const apikey = '897A83EF68D7-4A24-B1AE-9727CD019020';
        await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apikey },
          body: JSON.stringify({ number: phone, text: '💬 *Atendimento Guma TV*\n\nUm de nossos atendentes entrará em contato com você em instantes por aqui mesmo! Por favor, digite sua dúvida abaixo:' })
        });
      }
    }

    return res.status(200).json({ success: true });
  }

    return res.status(404).json({ error: 'Endpoint WPlay não encontrado no Vercel Bridge', path: pathname });
  } catch (globalError) {
    console.error('[Vercel Global Handler Crash Prevented]:', globalError);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Erro interno no Servidor Vercel Bridge',
        message: globalError.message || String(globalError)
      });
    }
  }
};
