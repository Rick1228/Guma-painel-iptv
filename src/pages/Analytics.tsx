import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { fetchLeadsPorFonte } from '../services/leadsService';
import { RefreshCw, TrendingUp, Users, Target, DollarSign } from 'lucide-react';
import './Analytics.css';

// ─── Source metadata ──────────────────────────────
const SOURCE_META: Record<string, { color: string; icon: string }> = {
  Instagram: { color: '#E1306C', icon: '📸' },
  Facebook:  { color: '#1877F2', icon: '📘' },
  Reddit:    { color: '#FF4500', icon: '🤖' },
  Twitter:   { color: '#1DA1F2', icon: '🐦' },
  Quora:     { color: '#B92B27', icon: '❓' },
  YouTube:   { color: '#FF0000', icon: '▶️' },
};

// ─── SVG Bar chart from live leads data ───────────────
function BarChart({ leads }: { leads: ReturnType<typeof useAppStore>['leads'] }) {
  const now = new Date();
  const months: { label: string; total: number; converted: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('pt-BR', { month: 'short' });
    const monthLeads = leads.filter((l) => {
      const ld = new Date(l.data_captura);
      return ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear();
    });
    months.push({
      label,
      total: monthLeads.length,
      converted: monthLeads.filter((l) => l.status === 'convertido').length,
    });
  }

  const maxVal = Math.max(...months.map((m) => m.total), 1);

  return (
    <div className="bar-chart">
      {months.map((m) => (
        <div key={m.label} className="bar-group">
          <div className="bar-wrap">
            <div
              className="bar bar-total"
              style={{ height: `${(m.total / maxVal) * 100}%` }}
              title={`${m.total} leads`}
            />
            <div
              className="bar bar-converted"
              style={{ height: `${(m.converted / maxVal) * 100}%` }}
              title={`${m.converted} convertidos`}
            />
          </div>
          <div className="bar-label">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── SVG Score distribution chart ────────────────────
function ScoreDistChart({ leads }: { leads: ReturnType<typeof useAppStore>['leads'] }) {
  const buckets = [
    { label: '0–20',  min: 0,  max: 20,  color: '#ef4444' },
    { label: '21–40', min: 21, max: 40,  color: '#f97316' },
    { label: '41–60', min: 41, max: 60,  color: '#f59e0b' },
    { label: '61–80', min: 61, max: 80,  color: '#06b6d4' },
    { label: '81–100',min: 81, max: 100, color: '#10b981' },
  ].map((b) => ({
    ...b,
    count: leads.filter((l) => l.pontuacao_comportamental >= b.min && l.pontuacao_comportamental <= b.max).length,
  }));

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="bar-chart">
      {buckets.map((b) => (
        <div key={b.label} className="bar-group">
          <div className="bar-wrap">
            <div
              className="bar"
              style={{
                height: `${(b.count / maxCount) * 100}%`,
                background: `linear-gradient(180deg, ${b.color}99, ${b.color})`,
                flex: 1,
              }}
              title={`${b.count} leads`}
            />
          </div>
          <div className="bar-label">{b.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────
export default function Analytics() {
  const { leads, leadsLoading, loadLeads } = useAppStore();
  const [sourceData, setSourceData] = useState<Record<string, number>>({});
  const [sourceLoading, setSourceLoading] = useState(true);
  const [period, setPeriod] = useState<'6m' | '3m' | '1m'>('6m');

  useEffect(() => {
    if (leads.length === 0 && !leadsLoading) loadLeads();
    fetchLeadsPorFonte().then((data) => {
      setSourceData(data);
      setSourceLoading(false);
    });
  }, []);

  // Filter leads by period
  const filteredLeads = leads.filter((l) => {
    const cutoff = new Date();
    if (period === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
    else if (period === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
    else cutoff.setMonth(cutoff.getMonth() - 1);
    return new Date(l.data_captura) >= cutoff;
  });

  const total = filteredLeads.length;
  const converted = filteredLeads.filter((l) => l.status === 'convertido').length;
  const novos = filteredLeads.filter((l) => l.status === 'novo').length;
  const avgScore = total > 0
    ? Math.round(filteredLeads.reduce((a, l) => a + l.pontuacao_comportamental, 0) / total)
    : 0;
  const taxaConversao = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';

  // Source breakdown from Supabase aggregate
  const sourceTotals = Object.entries(
    sourceLoading ? {} : sourceData
  ).sort((a, b) => b[1] - a[1]);
  const sourceTotal = sourceTotals.reduce((a, [, v]) => a + v, 0) || 1;

  // Top leads by score
  const topLeads = [...filteredLeads]
    .sort((a, b) => b.pontuacao_comportamental - a.pontuacao_comportamental)
    .slice(0, 8);

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            {leadsLoading ? 'Carregando dados...' : `Relatórios baseados em ${leads.length} leads reais do Supabase`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { loadLeads(); fetchLeadsPorFonte().then(setSourceData); }} disabled={leadsLoading} id="refresh-analytics">
            <RefreshCw size={14} className={leadsLoading ? 'spin-icon' : ''} />
            Atualizar
          </button>
          <div className="analytics-period">
            {(['6m', '3m', '1m'] as const).map((p) => (
              <button
                key={p}
                className={`analytics-period-btn ${period === p ? 'analytics-period-btn--active' : ''}`}
                onClick={() => setPeriod(p)}
                id={`period-${p}`}
              >
                {p === '6m' ? '6 meses' : p === '3m' ? '3 meses' : '1 mês'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="analytics-top-stats">
        {[
          { label: 'Total de Leads', value: total, icon: Users, color: 'var(--primary-light)' },
          { label: 'Convertidos', value: converted, icon: Target, color: 'var(--success)' },
          { label: 'Taxa de Conversão', value: `${taxaConversao}%`, icon: TrendingUp, color: 'var(--accent-light)' },
          { label: 'Score Médio', value: avgScore, icon: DollarSign, color: 'var(--warning)' },
        ].map((stat) => (
          <div key={stat.label} className="analytics-top-stat card">
            <div className="analytics-stat-icon">
              <stat.icon size={18} />
            </div>
            <div
              className="analytics-top-value"
              style={{ color: stat.color }}
            >
              {leadsLoading ? '–' : stat.value}
            </div>
            <div className="analytics-top-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {leadsLoading ? (
        <div className="page-loading">
          <div className="page-loading-spinner" />
          <span>Carregando dados do Supabase...</span>
        </div>
      ) : (
        <>
          <div className="analytics-charts">
            <div className="card analytics-chart-card">
              <h3 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>
                📊 Leads Capturados por Mês
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
                <span style={{ color: 'var(--primary-light)' }}>■</span> Total &nbsp;
                <span style={{ color: 'var(--success)' }}>■</span> Convertidos
              </p>
              <BarChart leads={filteredLeads} />
            </div>

            <div className="card analytics-chart-card">
              <h3 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>
                🎯 Distribuição por Score
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
                Quantidade de leads por faixa de pontuação comportamental
              </p>
              <ScoreDistChart leads={filteredLeads} />
            </div>
          </div>

          {/* Status breakdown */}
          <div className="analytics-status-grid">
            {[
              { label: 'Novos', count: novos, color: 'var(--primary-light)', bg: 'var(--primary-subtle)' },
              { label: 'Contatados', count: filteredLeads.filter(l => l.status === 'contatado').length, color: 'var(--accent-light)', bg: 'var(--accent-subtle)' },
              { label: 'Qualificados', count: filteredLeads.filter(l => l.status === 'qualificado').length, color: 'var(--warning)', bg: 'var(--warning-subtle)' },
              { label: 'Em Negociação', count: filteredLeads.filter(l => l.status === 'negociacao').length, color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
              { label: 'Convertidos', count: converted, color: 'var(--success)', bg: 'var(--success-subtle)' },
              { label: 'Perdidos', count: filteredLeads.filter(l => l.status === 'perdido').length, color: 'var(--danger)', bg: 'var(--danger-subtle)' },
            ].map((s) => (
              <div key={s.label} className="analytics-status-card card" style={{ background: s.bg, borderColor: `${s.color}25` }}>
                <span className="analytics-status-value" style={{ color: s.color }}>{s.count}</span>
                <span className="analytics-status-label">{s.label}</span>
                <div className="analytics-status-bar">
                  <div
                    className="analytics-status-bar-fill"
                    style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%`, background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Source breakdown — dados reais do Supabase */}
          <div className="card analytics-sources">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h3 className="section-title">🌐 Leads por Fonte</h3>
              {sourceLoading && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Carregando...</span>}
            </div>
            <div className="source-breakdown">
              {sourceTotals.length > 0 ? sourceTotals.map(([nome, count]) => {
                const meta = SOURCE_META[nome] ?? { color: '#7c3aed', icon: '🔗' };
                const pct = ((count / sourceTotal) * 100).toFixed(1);
                return (
                  <div key={nome} className="source-breakdown-item">
                    <div className="source-breakdown-header">
                      <div className="source-breakdown-name">
                        <span>{meta.icon}</span>
                        <span>{nome}</span>
                      </div>
                      <div className="source-breakdown-meta">
                        <span style={{ color: meta.color, fontWeight: 700 }}>{count}</span>
                        <span className="source-breakdown-pct">{pct}%</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${meta.color}80, ${meta.color})`,
                        }}
                      />
                    </div>
                  </div>
                );
              }) : (
                // Fallback se não há dados no Supabase ainda
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>
                  Nenhum dado de fonte disponível ainda.
                </p>
              )}
            </div>
          </div>

          {/* Top leads table */}
          {topLeads.length > 0 && (
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: 'var(--space-5)' }}>
                🏆 Top Leads por Score
              </h3>
              <div className="analytics-table">
                <div className="analytics-table-header">
                  <span>Lead</span>
                  <span>Fonte</span>
                  <span>Score</span>
                  <span>Status</span>
                  <span>Capturado</span>
                </div>
                {topLeads.map((lead) => (
                  <div key={lead.id} className="analytics-table-row">
                    <span className="analytics-lead-name">{lead.nome}</span>
                    <span className="analytics-source">{SOURCE_META[lead.fonte]?.icon ?? '🔗'} {lead.fonte}</span>
                    <span
                      className="analytics-score"
                      style={{
                        color: lead.pontuacao_comportamental >= 80
                          ? 'var(--success)'
                          : lead.pontuacao_comportamental >= 60
                          ? 'var(--warning)'
                          : 'var(--danger)',
                      }}
                    >
                      {lead.pontuacao_comportamental}
                    </span>
                    <span className={`badge badge-${lead.status}`}>{lead.status}</span>
                    <span className="analytics-signals">
                      {new Date(lead.data_captura).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
