import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import StatsCard from '../components/StatsCard';
import SourceMonitor from '../components/SourceMonitor';
import LeadCard from '../components/LeadCard';
import { mockSources } from '../data/mockData';
import type { StatsData } from '../types';
import { TrendingUp, Plus, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const { leads, updateLeadStatus, activeScans, leadsLoading, leadsError, loadLeads, stats } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (leads.length === 0) loadLeads();
  }, []);

  const statsCards: StatsData[] = [
    {
      titulo: 'Leads Capturados',
      valor: stats?.total ?? leads.length,
      variacao: 22.3,
      tendencia: 'up',
      icone: '🎯',
    },
    {
      titulo: 'Score Médio',
      valor: leads.length > 0
        ? Math.round(leads.reduce((a, l) => a + l.pontuacao_comportamental, 0) / leads.length)
        : 0,
      variacao: 5.8,
      tendencia: 'up',
      icone: '⭐',
    },
    {
      titulo: 'Taxa de Conversão',
      valor: stats?.taxaConversao ?? '0.0',
      variacao: 2.1,
      tendencia: 'up',
      icone: '🚀',
      unidade: '%',
    },
    {
      titulo: 'Novos Hoje',
      valor: stats?.novos ?? leads.filter((l) => l.status === 'novo').length,
      variacao: 31.2,
      tendencia: 'up',
      icone: '⚡',
    },
  ];

  const hotLeads = leads
    .filter((l) => l.pontuacao_comportamental >= 80 && l.status === 'novo')
    .sort((a, b) => b.pontuacao_comportamental - a.pontuacao_comportamental)
    .slice(0, 3);

  const recentLeads = leads
    .sort((a, b) => new Date(b.data_captura).getTime() - new Date(a.data_captura).getTime())
    .slice(0, 3);

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {leadsLoading
              ? 'Carregando dados em tempo real...'
              : `${leads.length} leads no banco · atualizado agora há pouco`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={loadLeads} disabled={leadsLoading} id="refresh-dashboard">
            <RefreshCw size={14} className={leadsLoading ? 'spin-icon' : ''} />
            Atualizar
          </button>
          <button className="btn btn-primary" id="add-lead-btn" onClick={() => navigate('/leads')}>
            <Plus size={16} />
            Ver todos os leads
          </button>
        </div>
      </div>

      {/* Error state */}
      {leadsError && (
        <div className="config-warning">
          <AlertTriangle size={16} />
          {leadsError} — Verifique se o Supabase está configurado corretamente no arquivo .env
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-4 dashboard-stats">
        {statsCards.map((stat, i) => (
          <StatsCard key={stat.titulo} stat={stat} delay={i * 80} />
        ))}
      </div>

      {/* Loading state */}
      {leadsLoading && (
        <div className="page-loading">
          <div className="page-loading-spinner" />
          <span>Carregando leads do Supabase...</span>
        </div>
      )}

      {/* Main grid */}
      {!leadsLoading && (
        <div className="dashboard-grid">
          {/* Source Monitor */}
          <div className="dashboard-sources">
            <SourceMonitor sources={mockSources} activeScans={activeScans} />
          </div>

          {/* Hot Leads */}
          <div className="dashboard-hot">
            <div className="section-header">
              <div>
                <h2 className="section-title">🔥 Leads Prioritários</h2>
                <p className="section-subtitle">Score alto, prontos para contato</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>
                Ver todos <ArrowRight size={13} />
              </button>
            </div>
            <div className="hot-leads-list">
              {hotLeads.length > 0 ? (
                hotLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onStatusChange={updateLeadStatus} />
                ))
              ) : (
                <div className="empty-state">
                  <TrendingUp size={32} />
                  <p>Nenhum lead prioritário no momento</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent captures */}
          <div className="dashboard-recent">
            <div className="section-header">
              <div>
                <h2 className="section-title">⚡ Capturas Recentes</h2>
                <p className="section-subtitle">{leads.length} leads no total</p>
              </div>
            </div>
            <div className="recent-leads-list">
              {recentLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onStatusChange={updateLeadStatus} compact />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity feed */}
      {!leadsLoading && leads.length > 0 && (
        <div className="dashboard-activity card">
          <div className="section-header">
            <h2 className="section-title">📡 Feed de Atividade</h2>
            <div className="activity-live">
              <span className="pulse-dot" />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success)' }}>Tempo real</span>
            </div>
          </div>
          <div className="activity-feed">
            {leads.slice(0, 6).map((lead, i) => (
              <div key={lead.id} className="activity-item" style={{ animationDelay: `${i * 60}ms` }}>
                <div
                  className="activity-dot"
                  style={{ background: ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b'][i % 4] }}
                />
                <div className="activity-content">
                  <span className="activity-name">{lead.nome}</span>
                  <span className="activity-action"> foi capturado via {lead.fonte} com score </span>
                  <span
                    className="activity-score"
                    style={{ color: lead.pontuacao_comportamental >= 80 ? '#10b981' : '#f59e0b' }}
                  >
                    {lead.pontuacao_comportamental}
                  </span>
                </div>
                <div className="activity-source">
                  {lead.sinais_compra[0] ?? 'Pesquisa ativa'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
