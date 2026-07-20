import { useLocation } from 'react-router-dom';
import { Bell, Search, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import './Header.css';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Monitoramento em tempo real de leads' },
  '/leads': { title: 'Leads', subtitle: 'Gerencie e filtre todos os seus leads capturados' },
  '/crm': { title: 'CRM', subtitle: 'Pipeline de vendas e acompanhamento de negociações' },
  '/analytics': { title: 'Analytics', subtitle: 'Relatórios de desempenho e conversão' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Configure fontes, termos e regras de pontuação' },
};

export default function Header() {
  const location = useLocation();
  const { activeScans } = useAppStore();

  const isLeadDetail = location.pathname.startsWith('/leads/') && location.pathname !== '/leads';
  const page = pageTitles[location.pathname] || { title: 'Lead', subtitle: 'Detalhes do lead' };

  return (
    <header className="header">
      <div className="header-left">
        <div>
          <h1 className="header-title">{isLeadDetail ? 'Detalhes do Lead' : page.title}</h1>
          <p className="header-subtitle">{isLeadDetail ? 'Histórico completo e análise comportamental' : page.subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search size={14} className="header-search-icon" />
          <input
            type="text"
            placeholder="Buscar lead, email..."
            className="header-search-input"
          />
        </div>

        <div className="header-scan-status">
          <RefreshCw size={12} className="header-scan-spin" />
          <span>{activeScans} scans</span>
        </div>

        <button className="btn-icon header-notif">
          <Bell size={16} />
          <span className="notif-dot" />
        </button>
      </div>
    </header>
  );
}
