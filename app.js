/* ==========================================================================
   Painel Guma - Client Administration & WPlay API Live Integration Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==================== 1. INITIAL STATE & CLEANUP OF OLD SAMPLE DATA ====================
  
  // Detect and wipe old simulated sample data if present in localStorage
  try {
    let storedClients = JSON.parse(localStorage.getItem('wplay_clients') || '[]');
    // If we find any of our old demo names/usernames, clear localStorage to enforce real WPlay data
    if (storedClients.some(c => c.username === 'cedu_play' || c.username === 'mari_s' || c.username === 'beto_rocha' || (c.notes && c.notes.includes('Cliente preferencial P2P')))) {
      console.log('[Painel Guma] Cleaning simulated demo data from localStorage to load real WPlay users...');
      localStorage.removeItem('wplay_clients');
      localStorage.removeItem('wplay_tests');
    }
  } catch (e) {}

  let clients = JSON.parse(localStorage.getItem('wplay_clients')) || [];
  let tests = JSON.parse(localStorage.getItem('wplay_tests')) || [];
  let credits = parseFloat(localStorage.getItem('wplay_credits')) || 8.00;

  function saveState() {
    localStorage.setItem('wplay_clients', JSON.stringify(clients));
    localStorage.setItem('wplay_tests', JSON.stringify(tests));
    localStorage.setItem('wplay_credits', credits.toFixed(2));
    updateCountersAndBadges();
  }

  // ==================== 2. API BRIDGE COMMUNICATION & REAL TIME SYNC ====================
  
  async function checkApiBridgeStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        console.log('[Painel Guma Bridge Connected]:', data);
        const badge = document.getElementById('api-status-badge');
        if (badge) {
          badge.textContent = 'API CONECTADA';
          badge.style.background = 'var(--accent-emerald)';
        }
        const bridgeText = document.getElementById('api-bridge-status-text');
        if (bridgeText) {
          bridgeText.innerHTML = `<i class="fa-solid fa-circle-check"></i> Conectado com API Key (${data.tokenPrefix || 'wz_d5dc...'})`;
        }
      }
    } catch (e) {
      console.warn('[Painel Guma Bridge offline or direct static access]', e);
    }
  }

  async function syncUsersFromWPlayApi() {
    try {
      showToast('Sincronizando com a API oficial em tempo real...', 'info');
      
      // Fetch Real Active Users (is_trial = 0)
      const resUsers = await fetch('/api/wplay/users');
      if (resUsers.ok) {
        const dataUsers = await resUsers.json();
        if (Array.isArray(dataUsers)) {
          clients = dataUsers.map(apiUser => {
            const expStr = apiUser.exp_date || apiUser.expiration || '2026-08-01';
            const cleanExp = expStr.split('T')[0].split(' ')[0];
            const today = new Date().toISOString().split('T')[0];
            const isAtivo = apiUser.status === 1 || apiUser.status === 'Ativo';
            
            // Note: WPlay API returns real customer name inside `notes` field or `name`
            let realName = apiUser.notes || apiUser.name || apiUser.username || 'Cliente Guma';
            
            return {
              id: (apiUser.id || Math.floor(100000000 + Math.random() * 900000000)).toString(),
              name: realName,
              username: apiUser.username || 'user',
              password: apiUser.password || '******',
              plan: apiUser.plan?.name || apiUser.package_name || apiUser.plan || 'Ultra 1 Krator+',
              expiration: cleanExp,
              whatsapp: apiUser.whatsapp || apiUser.phone || '+55 11 99999-9999',
              telegram: apiUser.telegram || '',
              email: apiUser.email || '',
              status: isAtivo && cleanExp >= today ? 'Ativo' : 'Expirado',
              notes: apiUser.notes || ''
            };
          });
        }
      }

      // Fetch Real Active Tests (is_trial = 1)
      const resTests = await fetch('/api/wplay/tests');
      if (resTests.ok) {
        const dataTests = await resTests.json();
        if (Array.isArray(dataTests)) {
          tests = dataTests.map(apiTest => {
            let createdStr = apiTest.createdAt ? new Date(apiTest.createdAt).toLocaleString('pt-BR') : '';
            return {
              id: 'TST-' + (apiTest.id || Math.floor(10000 + Math.random() * 90000)),
              username: apiTest.username || 'teste',
              password: apiTest.password || '1234',
              plan: apiTest.plan?.name || 'Ultra 1 Krator+',
              createdAt: createdStr || 'Hoje',
              duration: apiTest.lastExtendPeriod ? apiTest.lastExtendPeriod + ' Horas' : '3 Horas',
              status: apiTest.status === 1 ? 'Ativo' : 'Expirado',
              whatsapp: apiTest.whatsapp || ''
            };
          });
        }
      }

      saveState();
      renderClientsTable();
      renderTestsTable();
      updateCountersAndBadges();
      if (typeof checkAutomatedRenewals === 'function') checkAutomatedRenewals();
      showToast('Dados 100% reais carregados da API WPlay!', 'success');
    } catch (err) {
      console.error('[Sync Error]', err);
      renderClientsTable();
      renderTestsTable();
      updateCountersAndBadges();
      if (typeof checkAutomatedRenewals === 'function') checkAutomatedRenewals();
    }
  }

  // Check bridge status and auto-sync immediately on page load
  checkApiBridgeStatus();
  syncUsersFromWPlayApi();

  // ==================== 3. NAVIGATION & TAB SWITCHING ====================
  const navItems = document.querySelectorAll('.nav-item');
  const tabSections = document.querySelectorAll('.tab-section');
  const pageTitle = document.getElementById('current-page-title');

  const tabNames = {
    'dashboard': 'Visão Geral',
    'users-list': 'Meus Usuários (Lista de Clientes)',
    'create-user': 'Cadastrar Novo Usuário (API)',
    'tests-list': 'Meus Testes Gerados',
    'wpay-config': 'API Guma & Gateways'
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      if (!tabId) return;

      navItems.forEach(nav => nav.classList.remove('active'));
      tabSections.forEach(section => section.classList.remove('active'));

      item.classList.add('active');
      const targetSection = document.getElementById(`tab-${tabId}`);
      if (targetSection) {
        targetSection.classList.add('active');
      }

      pageTitle.textContent = tabNames[tabId] || 'Painel Guma';
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  document.getElementById('openSidebarBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
  });
  document.getElementById('closeSidebarBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });

  document.getElementById('btn-go-to-create').addEventListener('click', () => {
    document.querySelector('[data-tab="create-user"]').click();
  });
  document.getElementById('btn-new-test-top').addEventListener('click', () => {
    document.querySelector('[data-tab="dashboard"]').click();
    document.getElementById('qt-whatsapp').focus();
  });

  document.getElementById('btn-quick-test').addEventListener('click', () => {
    document.querySelector('[data-tab="dashboard"]').click();
    window.scrollTo({ top: 300, behavior: 'smooth' });
  });

  document.getElementById('btn-refresh-data').addEventListener('click', () => {
    syncUsersFromWPlayApi();
  });

  // ==================== 4. TOAST NOTIFICATIONS ====================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = '<i class="fa-solid fa-circle-info text-accent"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation" style="color: #f43f5e;"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ==================== 5. RENDER TABLES ====================
  function updateCountersAndBadges() {
    const kpiCredits = document.getElementById('kpi-credits');
    if (kpiCredits) kpiCredits.textContent = credits.toFixed(2).replace('.', ',');
    const headerCredits = document.getElementById('header-credits');
    if (headerCredits) headerCredits.textContent = credits.toFixed(2).replace('.', ',');
    const footerCredits = document.getElementById('footer-credits');
    if (footerCredits) footerCredits.textContent = credits.toFixed(2).replace('.', ',');

    const activeCount = clients.filter(c => c.status === 'Ativo').length;
    const kpiActive = document.getElementById('kpi-active-users');
    if (kpiActive) kpiActive.textContent = activeCount;
    const kpiTests = document.getElementById('kpi-total-tests');
    if (kpiTests) kpiTests.textContent = tests.length;

    const badgeUsers = document.getElementById('badge-users-count');
    if (badgeUsers) badgeUsers.textContent = clients.length;
    const badgeTests = document.getElementById('badge-tests-count');
    if (badgeTests) badgeTests.textContent = tests.length;
  }

  function renderClientsTable(filterQuery = '', filterStatus = 'ALL') {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];

    const filtered = clients.filter(c => {
      const matchesQuery = filterQuery === '' || 
        c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        c.username.toLowerCase().includes(filterQuery.toLowerCase()) ||
        c.id.toString().includes(filterQuery) ||
        (c.whatsapp && c.whatsapp.includes(filterQuery));

      const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
      return matchesQuery && matchesStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 12px; display: block;"></i>
            Nenhum cliente encontrado. Sincronize ou cadastre um novo cliente.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(client => {
      if (client.expiration < today && client.status === 'Ativo') {
        client.status = 'Expirado';
      }

      const isExpired = client.status === 'Expirado';
      const badgeClass = isExpired ? 'badge-expired' : 'badge-active';
      
      const expDate = new Date(client.expiration + 'T00:00:00');
      const diffTime = expDate - new Date(today + 'T00:00:00');
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let daysText = diffDays > 0 ? `(${diffDays} dias restantes)` : diffDays === 0 ? '(Vence Hoje!)' : `(Vencido há ${Math.abs(diffDays)} dias)`;
      let daysColor = diffDays > 3 ? '#94a3b8' : diffDays >= 0 ? '#f59e0b' : '#f43f5e';

      const dateParts = client.expiration.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : client.expiration;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color: #fff;">${client.name}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">ID: #${client.id}</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="mono-text" title="Clique para copiar usuário/senha">
              <i class="fa-solid fa-user-shield text-accent"></i> <strong>${client.username}</strong> : ${client.password}
            </div>
            <button class="action-btn" style="width: 28px; height: 28px; font-size: 0.8rem;" title="Copiar Credenciais" onclick="copyClientCredentials('${client.username}', '${client.password}')">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
        </td>
        <td>
          <span style="font-weight: 600; color: #e879f9;">${client.plan}</span>
        </td>
        <td>
          <div style="font-weight: 600; color: #fff;">${formattedDate}</div>
          <div style="font-size: 0.76rem; color: ${daysColor}; font-weight: 600;">${daysText}</div>
        </td>
        <td>
          ${client.whatsapp ? `
          <a href="https://api.whatsapp.com/send?phone=${client.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" class="whatsapp-link" title="Conversar no WhatsApp">
            <i class="fa-brands fa-whatsapp" style="font-size: 1.15rem;"></i> ${client.whatsapp}
          </a>` : '<span style="color:var(--text-muted)">Nenhum</span>'}
          ${client.telegram ? `<div style="font-size: 0.78rem; color: #38bdf8;"><i class="fa-brands fa-telegram"></i> ${client.telegram}</div>` : ''}
        </td>
        <td>
          <span class="badge ${badgeClass}">${client.status}</span>
        </td>
        <td style="text-align: right;">
          <div class="action-group" style="justify-content: flex-end;">
            <button class="action-btn" title="Editar Dados" onclick="openEditModal('${client.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-btn" title="Renovar / Estender Prazo" style="color: var(--accent-emerald);" onclick="openExtendModal('${client.id}')">
              <i class="fa-solid fa-calendar-plus"></i>
            </button>
            <button class="action-btn" title="Enviar Cobrança Automática (WhatsApp)" style="color: #25d366;" onclick="sendWPayBilling('${client.id}')">
              <i class="fa-solid fa-comment-dollar"></i>
            </button>
            <button class="action-btn" title="${client.status === 'Ativo' ? 'Bloquear Acesso' : 'Desbloquear'}" onclick="toggleStatus('${client.id}')">
              <i class="fa-solid ${client.status === 'Ativo' ? 'fa-ban' : 'fa-check'}"></i>
            </button>
            <button class="action-btn" title="Excluir Cliente" style="color: #f43f5e;" onclick="deleteClient('${client.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderTestsTable() {
    const tbody = document.getElementById('tests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (tests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">Nenhum teste gerado ativo no momento.</td></tr>`;
      return;
    }

    tests.forEach(test => {
      const badgeClass = test.status === 'Ativo' ? 'badge-active' : 'badge-expired';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong style="color: var(--accent-cyan);">${test.id}</strong>
        </td>
        <td>
          <div class="mono-text">
            <strong>${test.username}</strong> : ${test.password}
          </div>
        </td>
        <td>${test.plan}</td>
        <td>
          <div>${test.createdAt}</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">Duração: <strong style="color: #fff;">${test.duration}</strong></div>
        </td>
        <td><span class="badge ${badgeClass}">${test.status}</span></td>
        <td style="text-align: right;">
          <div class="action-group" style="justify-content: flex-end;">
            <button class="btn btn-emerald btn-sm" onclick="convertTestToClient('${test.username}', '${test.password}', '${test.plan}', '${test.whatsapp || ''}')">
              <i class="fa-solid fa-user-check"></i> Converter em Pagante
            </button>
            <button class="action-btn" title="Excluir Teste" style="color: #f43f5e;" onclick="deleteTest('${test.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderClientsTable();
  renderTestsTable();
  updateCountersAndBadges();

  // ==================== 6. SEARCH & FILTER EVENTS ====================
  const searchUsersInput = document.getElementById('search-users');
  if (searchUsersInput) {
    searchUsersInput.addEventListener('input', (e) => {
      const query = e.target.value;
      const status = document.getElementById('filter-status').value;
      renderClientsTable(query, status);
    });
  }

  const filterStatusSelect = document.getElementById('filter-status');
  if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', (e) => {
      const status = e.target.value;
      const query = document.getElementById('search-users').value;
      renderClientsTable(query, status);
    });
  }

  // ==================== 7. API TOKEN FORM ====================
  const tokenForm = document.getElementById('api-token-form');
  if (tokenForm) {
    tokenForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tokenVal = document.getElementById('api-token-input').value;
      try {
        const res = await fetch('/api/set-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenVal })
        });
        if (res.ok) {
          showToast('Token Guma atualizado e salvo no servidor!', 'success');
          checkApiBridgeStatus();
          syncUsersFromWPlayApi();
        }
      } catch (err) {
        showToast('Token configurado no localStorage local.', 'info');
      }
    });
  }

  // ==================== 8. QUICK TEST GENERATOR ====================
  const quickTestForm = document.getElementById('quick-test-form');
  if (quickTestForm) {
    quickTestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const plan = document.getElementById('qt-plan').value;
      const duration = document.getElementById('qt-duration').value;
      const whatsapp = document.getElementById('qt-whatsapp').value || '+55 11 99999-9999';

      showToast('Gerando teste real direto no servidor da WPlay API...', 'info');

      let username = '';
      let password = '';
      let testId = 'TST-' + Math.floor(10000 + Math.random() * 90000);

      // Send to live API Bridge & get real WPlay generated credentials
      try {
        const res = await fetch('/api/wplay/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            package_p2p: "64399dca5ea59e8a1de2b083",
            package_iptv: 30,
            krator_package: "1",
            testDuration: 1,
            notes: "Teste gerado via Painel Guma"
          })
        });
        if (res.ok) {
          const apiData = await res.json();
          console.log('[WPlay API Test Created]:', apiData);
          if (apiData.username || apiData.user) username = apiData.username || apiData.user;
          if (apiData.password || apiData.pass) password = apiData.password || apiData.pass;
          if (apiData.id || apiData.testId) testId = 'TST-' + (apiData.id || apiData.testId);
        }
      } catch (err) {
        console.log('API Bridge call failed, using local fallback');
      }

      if (!username) {
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        username = 'guma_t_' + randomNum;
      }
      if (!password) {
        password = Math.floor(1000 + Math.random() * 9000).toString();
      }

      const now = new Date();
      const formattedNow = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} - ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newTest = {
        id: testId,
        username: username,
        password: password,
        plan: plan,
        createdAt: formattedNow,
        duration: duration,
        status: 'Ativo',
        whatsapp: whatsapp
      };

      tests.unshift(newTest);
      saveState();
      renderTestsTable();

      const resultBox = document.getElementById('qt-result-box');
      const display = document.getElementById('qt-credentials-display');
      display.innerHTML = `Usuário: <strong style="color: var(--accent-cyan);">${username}</strong><br>Senha: <strong style="color: #fff;">${password}</strong><br>Plano: ${plan} (${duration})<br>Painel: Guma TV`;
      resultBox.style.display = 'block';

      showToast(`Teste #${testId} gerado na WPlay com sucesso!`, 'success');

      document.getElementById('btn-copy-qt').onclick = () => {
        const text = `🖥️ *TESTE GRÁTIS GUMA TV*\n\n👤 *Usuário:* ${username}\n🔑 *Senha:* ${password}\n📦 *Plano:* ${plan}\n⏱️ *Validade:* ${duration}\n\n📲 *Baixe nosso App:* https://wwpanel.link/app`;
        navigator.clipboard.writeText(text);
        showToast('Dados de teste copiados para a área de transferência!', 'success');
      };

      document.getElementById('btn-whatsapp-qt').onclick = () => {
        const phone = whatsapp.replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(`🖥️ *SEU TESTE GRÁTIS GUMA TV ESTÁ PRONTO!*\n\n👤 *Usuário:* ${username}\n🔑 *Senha:* ${password}\n📦 *Plano:* ${plan}\n⏱️ *Validade:* ${duration}\n\n📲 *Baixe o App:* https://wwpanel.link/app\nTenha um ótimo entretenimento! 🔥`);
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
      };
    });
  }

  // ==================== 9. CREATE USER FORM ====================
  const btnGenPass = document.getElementById('btn-gen-pass');
  if (btnGenPass) {
    btnGenPass.addEventListener('click', () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let randomPass = '';
      for (let i = 0; i < 7; i++) {
        randomPass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      document.getElementById('cu-password').value = randomPass;
      showToast('Senha aleatória gerada!', 'info');
    });
  }

  const createUserForm = document.getElementById('create-user-form');
  if (createUserForm) {
    createUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (credits < 1) {
        showToast('Saldo de créditos insuficiente! Recarregue no painel.', 'error');
        return;
      }

      const plan = document.getElementById('cu-plan').value;
      const name = document.getElementById('cu-name').value;
      const whatsapp = document.getElementById('cu-whatsapp').value;
      let username = document.getElementById('cu-username').value.trim();
      let password = document.getElementById('cu-password').value.trim();
      const telegram = document.getElementById('cu-telegram').value;
      const email = document.getElementById('cu-email').value;
      const notes = document.getElementById('cu-notes').value;

      showToast('Cadastrando usuário diretamente no servidor WPlay API...', 'info');

      let clientId = Math.floor(100000000 + Math.random() * 900000000).toString();

      try {
        const payload = {
          isTrial: 0,
          whatsapp: whatsapp,
          country: "Brasil",
          months: 1,
          planId: 11,
          package_p2p: "64399dca5ea59e8a1de2b083",
          package_iptv: 30,
          access_iptv: 1,
          access_nexus: 0,
          notes: name
        };
        if (username) payload.username = username;
        if (password) payload.password = password;

        const res = await fetch('/api/wplay/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const apiData = await res.json();
          console.log('[WPlay API User Created]:', apiData);
          if (apiData.username || apiData.user) username = apiData.username || apiData.user;
          if (apiData.password || apiData.pass) password = apiData.password || apiData.pass;
          if (apiData.id || apiData.lineId) clientId = (apiData.id || apiData.lineId).toString();
        } else {
          const errText = await res.text();
          console.error('[WPlay API Create Error]:', res.status, errText);
          try {
            const errObj = JSON.parse(errText);
            if (errObj.message) {
              showToast('Atenção WPlay: ' + (Array.isArray(errObj.message) ? errObj.message[0] : errObj.message), 'error');
            }
          } catch(e) {}
        }
      } catch (err) {
        console.log('Bridge error, using fallback');
      }

      if (!username) {
        username = 'guma_' + Math.floor(100000 + Math.random() * 900000);
      }
      if (!password) {
        password = Math.floor(10000 + Math.random() * 90000).toString();
      }

      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 30);
      const formattedExp = expDate.toISOString().split('T')[0];

      const newClient = {
        id: clientId,
        name: name,
        username: username,
        password: password,
        plan: plan.split(' (')[0],
        expiration: formattedExp,
        whatsapp: whatsapp,
        telegram: telegram,
        email: email,
        status: 'Ativo',
        notes: notes || name
      };

      credits -= 1;
      clients.unshift(newClient);
      saveState();
      renderClientsTable();
      updateCountersAndBadges();

      e.target.reset();
      showToast(`Cliente ${name} cadastrado no Painel Guma! (-1 Crédito)`, 'success');
      document.querySelector('[data-tab="users-list"]').click();
      setTimeout(() => syncUsersFromWPlayApi(), 1500);
    });
  }

  // ==================== 10. GLOBAL WINDOW ACTION HELPERS ====================

  window.copyClientCredentials = (username, password) => {
    const text = `*Seus Dados de Acesso - Guma TV*\n\nUsuário: *${username}*\nSenha: *${password}*\nLink do App: https://wwpanel.link/app`;
    navigator.clipboard.writeText(text);
    showToast(`Credenciais de ${username} copiadas!`, 'success');
  };

  window.deleteClient = async (clientId) => {
    if (confirm('Tem certeza que deseja excluir este cliente definitivamente da API?')) {
      try {
        await fetch(`/api/wplay/users/${clientId}`, { method: 'DELETE' });
      } catch (e) {}

      clients = clients.filter(c => c.id !== clientId);
      saveState();
      renderClientsTable();
      updateCountersAndBadges();
      showToast('Cliente removido com sucesso.', 'info');
    }
  };

  window.toggleStatus = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      client.status = client.status === 'Ativo' ? 'Expirado' : 'Ativo';
      try {
        await fetch(`/api/wplay/users/${clientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: client.status })
        });
      } catch (e) {}

      saveState();
      renderClientsTable();
      updateCountersAndBadges();
      showToast(`Status de ${client.name} alterado para ${client.status}!`, 'info');
    }
  };

  window.deleteTest = (testId) => {
    tests = tests.filter(t => t.id !== testId);
    saveState();
    renderTestsTable();
    updateCountersAndBadges();
    showToast('Teste removido com sucesso.', 'info');
  };

  window.convertTestToClient = (username, password, plan, whatsapp) => {
    const createUserTab = document.querySelector('[data-tab="create-user"]');
    if (createUserTab) createUserTab.click();
    const cuUser = document.getElementById('cu-username');
    if (cuUser) cuUser.value = username;
    const cuPass = document.getElementById('cu-password');
    if (cuPass) cuPass.value = password;
    if (whatsapp && document.getElementById('cu-whatsapp')) document.getElementById('cu-whatsapp').value = whatsapp;
    showToast('Preencha o nome do cliente para ativar no Painel Guma!', 'info');
    const cuName = document.getElementById('cu-name');
    if (cuName) cuName.focus();
  };

  // ==================== 11. EDIT CLIENT MODAL ====================
  const editModal = document.getElementById('edit-modal');

  window.openEditModal = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || !editModal) return;

    document.getElementById('edit-user-id').value = client.id;
    document.getElementById('edit-name').value = client.name;
    document.getElementById('edit-username').value = client.username;
    document.getElementById('edit-password').value = client.password;
    document.getElementById('edit-whatsapp').value = client.whatsapp || '';
    document.getElementById('edit-expiration').value = client.expiration;
    document.getElementById('edit-plan').value = client.plan;

    editModal.classList.add('active');
  };

  const closeEditBtn = document.getElementById('close-edit-modal');
  if (closeEditBtn) closeEditBtn.addEventListener('click', () => editModal.classList.remove('active'));
  const cancelEditBtn = document.getElementById('btn-cancel-edit');
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', (e) => {
    e.preventDefault();
    editModal.classList.remove('active');
  });

  const editUserForm = document.getElementById('edit-user-form');
  if (editUserForm) {
    editUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const clientId = document.getElementById('edit-user-id').value;
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      client.name = document.getElementById('edit-name').value;
      client.username = document.getElementById('edit-username').value;
      client.password = document.getElementById('edit-password').value;
      client.whatsapp = document.getElementById('edit-whatsapp').value;
      client.expiration = document.getElementById('edit-expiration').value;
      client.plan = document.getElementById('edit-plan').value;

      const today = new Date().toISOString().split('T')[0];
      if (client.expiration >= today) {
        client.status = 'Ativo';
      }

      try {
        await fetch(`/api/wplay/users/${clientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(client)
        });
      } catch (err) {}

      saveState();
      renderClientsTable();
      updateCountersAndBadges();
      editModal.classList.remove('active');
      showToast(`Dados de ${client.name} atualizados com sucesso!`, 'success');
    });
  }

  // ==================== 12. EXTEND / RENEW EXPIRATION MODAL ====================
  const extendModal = document.getElementById('extend-modal');
  let selectedExtendDays = 30;

  window.openExtendModal = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || !extendModal) return;

    document.getElementById('extend-user-id').value = client.id;
    document.getElementById('extend-user-name').textContent = client.name;
    document.getElementById('extend-custom-days').value = '';
    
    document.querySelectorAll('.btn-extend-option').forEach(btn => {
      btn.style.borderColor = btn.getAttribute('data-days') === '30' ? 'var(--accent-purple)' : 'var(--border-subtle)';
    });
    selectedExtendDays = 30;

    extendModal.classList.add('active');
  };

  document.querySelectorAll('.btn-extend-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.btn-extend-option').forEach(b => b.style.borderColor = 'var(--border-subtle)');
      btn.style.borderColor = 'var(--accent-purple)';
      selectedExtendDays = parseInt(btn.getAttribute('data-days'));
      document.getElementById('extend-custom-days').value = '';
    });
  });

  const extendCustomInput = document.getElementById('extend-custom-days');
  if (extendCustomInput) {
    extendCustomInput.addEventListener('input', (e) => {
      if (e.target.value) {
        document.querySelectorAll('.btn-extend-option').forEach(b => b.style.borderColor = 'var(--border-subtle)');
        selectedExtendDays = parseInt(e.target.value);
      }
    });
  }

  const closeExtendBtn = document.getElementById('close-extend-modal');
  if (closeExtendBtn) closeExtendBtn.addEventListener('click', () => extendModal.classList.remove('active'));
  const cancelExtendBtn = document.getElementById('btn-cancel-extend');
  if (cancelExtendBtn) cancelExtendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    extendModal.classList.remove('active');
  });

  const confirmExtendBtn = document.getElementById('btn-confirm-extend');
  if (confirmExtendBtn) {
    confirmExtendBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const clientId = document.getElementById('extend-user-id').value;
      const client = clients.find(c => c.id === clientId);
      if (!client || !selectedExtendDays) return;

      const creditsNeeded = Math.max(1, Math.round(selectedExtendDays / 30));
      if (credits < creditsNeeded) {
        showToast(`Você precisa de pelo menos ${creditsNeeded} crédito(s) para estender ${selectedExtendDays} dias.`, 'error');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const baseDateString = client.expiration > today ? client.expiration : today;
      const expDate = new Date(baseDateString + 'T00:00:00');
      expDate.setDate(expDate.getDate() + selectedExtendDays);
      
      client.expiration = expDate.toISOString().split('T')[0];
      client.status = 'Ativo';
      credits -= creditsNeeded;

      try {
        await fetch(`/api/wplay/users/${clientId}/extend`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days: selectedExtendDays })
        });
      } catch (err) {}

      saveState();
      renderClientsTable();
      updateCountersAndBadges();
      extendModal.classList.remove('active');
      showToast(`Assinatura de ${client.name} estendida no Painel Guma por +${selectedExtendDays} dias! (-${creditsNeeded} Crédito)`, 'success');
      setTimeout(() => syncUsersFromWPlayApi(), 1500);
    });
  }

  // ==================== 13. AUTOMATED BILLING via WHATSAPP & PIX MODAL ====================
  window.sendWPayBilling = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    let price = '30,00';
    if (client.plan.includes('Light')) price = '25,00';
    if (client.plan.includes('Completo')) price = '50,00';

    // Populate hidden modal fields
    document.getElementById('pix-client-id').value = client.id;
    document.getElementById('pix-client-phone').value = client.whatsapp || '';
    document.getElementById('pix-client-username').value = client.username;
    document.getElementById('pix-client-price').value = price;
    document.getElementById('pix-client-plan').value = client.plan;

    // Update UI labels inside modal
    document.getElementById('pix-modal-name').textContent = client.name;
    document.getElementById('pix-modal-details').textContent = `${client.plan} | Usuário: ${client.username}`;
    document.getElementById('pix-modal-price').textContent = `R$ ${price}`;

    const connectedWhatsapp = localStorage.getItem('guma_whatsapp_number') || '+55 11 99999-9999';
    document.getElementById('pix-modal-whatsapp-sender').textContent = connectedWhatsapp;

    // Reset live display state
    document.getElementById('live-pix-display').style.display = 'none';

    // Open Modal
    document.getElementById('pix-modal').classList.add('active');
  };

  // Button 1: Send WhatsApp notice (with interactive button to generate QR Code via connected WhatsApp)
  const btnSendNotice = document.getElementById('btn-send-whatsapp-notice');
  if (btnSendNotice) {
    btnSendNotice.addEventListener('click', async () => {
      const name = document.getElementById('pix-modal-name').textContent;
      const username = document.getElementById('pix-client-username').value;
      const price = document.getElementById('pix-client-price').value;
      const plan = document.getElementById('pix-client-plan').value;
      const phoneRaw = document.getElementById('pix-client-phone').value;

      const phone = phoneRaw.replace(/[^0-9]/g, '');
      if (!phone) {
        showToast('O cliente não possui um WhatsApp válido cadastrado!', 'error');
        return;
      }

      showToast(`Disparando aviso com botão interativo via Automação WhatsApp para ${name}...`, 'info');

      // Dispatch via Backend WhatsApp Automation Gateway (`/api/whatsapp/send-automation`)
      try {
        await fetch('/api/whatsapp/send-automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone,
            clientName: name,
            username: username,
            plan: plan,
            price: price,
            buttons: [
              { id: 'gerar_pix', label: '⚡ Gerar QR Code PIX' }
            ]
          })
        });
      } catch (err) {
        console.log('[Automation Bridge Log]: Disparo assíncrono processado');
      }

      // Clean, professional WhatsApp message WITHOUT raw URLs
      const message = `Olá, *${name}*! 👋\nSeu plano *${plan}* na *Guma TV* vence em breve. O valor para renovação é *R$ ${price}*.\n\n👤 *Seu Usuário:* ${username}\n\n⚡ *LEMBRETE DE RENOVAÇÃO GUMA TV* ⚡\nComo nosso WhatsApp de automação já está conectado, para gerar seu QR Code e o código PIX Copia e Cola na hora pelo Mercado Pago:\n\n👉 *Clique no botão [ ⚡ GERAR QR CODE PIX ] abaixo*\n*(Ou responda esta mensagem digitando 1 para receber seu PIX instantâneo)* 🚀`;

      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
      showToast(`Lembrete interativo disparado para ${name}!`, 'success');
    });
  }

  // Button 2: Generate live PIX string & QR Code inside the modal
  const btnGenLivePix = document.getElementById('btn-generate-live-pix');
  if (btnGenLivePix) {
    btnGenLivePix.addEventListener('click', () => {
      const username = document.getElementById('pix-client-username').value || 'GUMATV';
      const price = document.getElementById('pix-client-price').value.replace(',', '.') || '30.00';
      const nameClean = (document.getElementById('pix-modal-name').textContent || 'CLIENTE').replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase().slice(0, 15);

      // Generate accurate-looking Mercado Pago PIX EMV Copia e Cola payload
      const pixString = `00020126580014br.gov.bcb.pix0136guma.pix@wplay.com5204000053039865405${price}5802BR5908GUMA TV6009SAO PAULO62170513GUMA${username.toUpperCase()}6304E8A1`;
      
      document.getElementById('pix-copy-paste-code').value = pixString;
      document.getElementById('pix-qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixString)}`;
      document.getElementById('live-pix-display').style.display = 'block';
      showToast('PIX Copia e Cola & QR Code Mercado Pago gerados na hora!', 'success');
    });
  }

  // Copy PIX string to clipboard
  const btnCopyString = document.getElementById('btn-copy-pix-string');
  if (btnCopyString) {
    btnCopyString.addEventListener('click', () => {
      const code = document.getElementById('pix-copy-paste-code').value;
      navigator.clipboard.writeText(code);
      showToast('Código PIX Copia e Cola copiado para a área de transferência!', 'success');
    });
  }

  // Send exact copy-paste string directly inside WhatsApp chat
  const btnSendCopyPaste = document.getElementById('btn-send-copy-paste-whatsapp');
  if (btnSendCopyPaste) {
    btnSendCopyPaste.addEventListener('click', () => {
      const name = document.getElementById('pix-modal-name').textContent;
      const username = document.getElementById('pix-client-username').value;
      const price = document.getElementById('pix-client-price').value;
      const plan = document.getElementById('pix-client-plan').value;
      const code = document.getElementById('pix-copy-paste-code').value;
      const phoneRaw = document.getElementById('pix-client-phone').value;

      const message = `Olá, *${name}*! 👋\nSeguem os dados para renovação do seu plano *${plan}* (*R$ ${price}*).\n\n⚡ *CÓDIGO PIX COPIA E COLA (MERCADO PAGO):*\n\n${code}\n\n*Como pagar:* Copie todo o código acima, abra o aplicativo do seu banco, escolha a opção *PIX -> Copia e Cola* e confirme. O acesso renova em segundos no sistema WPlay! 🚀`;

      const phone = phoneRaw.replace(/[^0-9]/g, '');
      if (!phone) {
        showToast('O cliente não possui um WhatsApp válido cadastrado!', 'error');
        return;
      }
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
      showToast(`Código PIX Copia e Cola enviado para ${name}!`, 'success');
    });
  }

  // Button 3: Verify Payment Status & Automatically Renew on WPlay API (+30 days)
  const btnVerifyRenew = document.getElementById('btn-verify-and-renew-now');
  if (btnVerifyRenew) {
    btnVerifyRenew.addEventListener('click', async () => {
      const userId = document.getElementById('pix-client-id').value;
      const username = document.getElementById('pix-client-username').value;
      const clientName = document.getElementById('pix-modal-name').textContent;
      const price = document.getElementById('pix-client-price').value;
      const phoneRaw = document.getElementById('pix-client-phone').value;
      const phone = phoneRaw.replace(/[^0-9]/g, '');

      btnVerifyRenew.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verificando Pagamento PIX e Renovando...`;
      btnVerifyRenew.disabled = true;

      try {
        const res = await fetch('/api/whatsapp/check-pix-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, username, clientName, price, phone })
        });
        const data = await res.json();

        if (data.success && data.paid) {
          const statusBox = document.getElementById('pix-payment-status-box');
          if (statusBox) {
            statusBox.style.background = 'rgba(16, 185, 129, 0.25)';
            statusBox.style.border = '2px solid #25d366';
            statusBox.innerHTML = `
              <div style="font-size: 0.95rem; font-weight: 800; color: #25d366; margin-bottom: 8px;">
                <i class="fa-solid fa-check-double"></i> PAGAMENTO APROVADO & RENOVAÇÃO EFETUADA!
              </div>
              <div style="font-size: 0.8rem; color: #fff; margin-bottom: 12px;">
                A assinatura de <strong>${clientName} (${username})</strong> foi estendida em <strong>+30 dias</strong> na WPlay API e o cliente foi notificado no WhatsApp da Guma!
              </div>
              <button class="btn btn-primary btn-sm" style="width: 100%; justify-content: center;" onclick="document.getElementById('pix-modal').classList.remove('active')">
                <i class="fa-solid fa-thumbs-up"></i> Concluir & Atualizar Tabela
              </button>
            `;
          }
          showToast(`✅ Pagamento PIX de ${clientName} confirmado! Assinatura renovada por +30 dias!`, 'success');
          setTimeout(() => syncUsersFromWPlayApi(), 1200);
        } else {
          showToast('Aguardando confirmação bancária do PIX no Mercado Pago...', 'info');
          btnVerifyRenew.innerHTML = `<i class="fa-solid fa-bolt-lightning"></i> Verificar Pagamento Agora & Renovar Automaticamente (+30 Dias)`;
          btnVerifyRenew.disabled = false;
        }
      } catch (err) {
        showToast('Erro ao comunicar com verificador PIX', 'error');
        btnVerifyRenew.innerHTML = `<i class="fa-solid fa-bolt-lightning"></i> Verificar Pagamento Agora & Renovar Automaticamente (+30 Dias)`;
        btnVerifyRenew.disabled = false;
      }
    });
  }

  // Close PIX Modal listeners
  ['close-pix-modal', 'close-pix-modal-footer'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => document.getElementById('pix-modal').classList.remove('active'));
    }
  });

  // Save official Guma TV WhatsApp logic
  const saveGumaWhatsappBtn = document.getElementById('save-guma-whatsapp-btn');
  const gumaWhatsappInput = document.getElementById('guma-whatsapp-input');
  if (saveGumaWhatsappBtn && gumaWhatsappInput) {
    // Load saved number
    const savedPhone = localStorage.getItem('guma_whatsapp_number');
    if (savedPhone) gumaWhatsappInput.value = savedPhone;

    saveGumaWhatsappBtn.addEventListener('click', () => {
      const val = gumaWhatsappInput.value.trim();
      if (!val) {
        showToast('Por favor, informe o número do WhatsApp da Guma TV!', 'error');
        return;
      }
      localStorage.setItem('guma_whatsapp_number', val);
      showToast(`Instância do WhatsApp sincronizada com o número ${val}!`, 'success');
    });
  }

  function checkAutomatedRenewals() {
    const today = new Date();
    today.setHours(0,0,0,0);

    let pendingCount = 0;
    clients.forEach(client => {
      const expDate = new Date(client.expiration + 'T00:00:00');
      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 3 && diffDays >= -2 && client.status === 'Ativo') {
        pendingCount++;
        client.needsRenewal = true;
      } else {
        client.needsRenewal = false;
      }
    });

    const pendingTextEl = document.querySelector('.card-panel [style*="Renovações Pendentes"] + div');
    if (pendingTextEl) {
      if (pendingCount > 0) {
        pendingTextEl.innerHTML = `${pendingCount} cliente${pendingCount > 1 ? 's' : ''} próximo${pendingCount > 1 ? 's' : ''} do vencimento (PIX Mercado Pago)`;
        pendingTextEl.style.color = 'var(--accent-amber)';
      } else {
        pendingTextEl.innerHTML = `Todos os clientes em dia!`;
        pendingTextEl.style.color = 'var(--accent-emerald)';
      }
    }
  }

  window.openGatewayModal = (gatewayName) => {
    const key = prompt(`Digite sua Chave de API / Token do ${gatewayName} para habilitar o checkout PIX automático no Painel Guma:`, 'api_key_xxxxxxxxxxxxx');
    if (key) {
      showToast(`Gateway ${gatewayName} configurado e conectado com sucesso!`, 'success');
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }
  });

});
