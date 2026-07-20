import { useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import FilterBar from '../components/FilterBar';
import LeadTable from '../components/LeadTable';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';
import './Leads.css';

export default function Leads() {
  const { leads, filters, setFilters, updateLeadStatus, leadsLoading, leadsError, loadLeads } = useAppStore();

  useEffect(() => {
    if (leads.length === 0 && !leadsLoading) loadLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filters.busca) {
        const query = filters.busca.toLowerCase();
        if (
          !lead.nome.toLowerCase().includes(query) &&
          !lead.email.toLowerCase().includes(query) &&
          !lead.telefone.includes(query)
        ) return false;
      }
      if (filters.fonte !== 'all' && lead.fonte !== filters.fonte) return false;
      if (filters.status !== 'all' && lead.status !== filters.status) return false;
      if (lead.pontuacao_comportamental < filters.pontuacao_min) return false;
      if (lead.pontuacao_comportamental > filters.pontuacao_max) return false;
      return true;
    });
  }, [leads, filters]);

  const counts = useMemo(() => ({
    total: leads.length,
    novos: leads.filter((l) => l.status === 'novo').length,
    qualificados: leads.filter((l) => l.status === 'qualificado').length,
    convertidos: leads.filter((l) => l.status === 'convertido').length,
  }), [leads]);

  const handleExport = () => {
    const csv = [
      ['Nome', 'Email', 'Telefone', 'Fonte', 'Score', 'Status', 'Capturado'].join(','),
      ...filteredLeads.map((l) => [
        `"${l.nome}"`,
        l.email,
        l.telefone,
        l.fonte,
        l.pontuacao_comportamental,
        l.status,
        new Date(l.data_captura).toLocaleDateString('pt-BR'),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guma-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="leads-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">
            {leadsLoading
              ? 'Carregando leads...'
              : `${leads.length} leads · ${counts.novos} novos aguardando contato`}
          </p>
        </div>
        <div className="leads-actions">
          <button className="btn btn-ghost btn-sm" onClick={loadLeads} disabled={leadsLoading} id="refresh-leads">
            <RefreshCw size={14} className={leadsLoading ? 'spin-icon' : ''} />
            {leadsLoading ? 'Carregando...' : 'Atualizar'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={filteredLeads.length === 0} id="export-leads">
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {leadsError && (
        <div className="config-warning">
          <AlertTriangle size={16} />
          {leadsError} — Configure o Supabase no arquivo .env
        </div>
      )}

      {/* Quick stats */}
      <div className="leads-quick-stats">
        {[
          { label: 'Total', value: counts.total, color: 'var(--text-primary)' },
          { label: 'Novos', value: counts.novos, color: 'var(--primary-light)' },
          { label: 'Qualificados', value: counts.qualificados, color: 'var(--warning)' },
          { label: 'Convertidos', value: counts.convertidos, color: 'var(--success)' },
        ].map((stat) => (
          <div key={stat.label} className="leads-quick-stat card">
            <span className="leads-quick-value" style={{ color: stat.color }}>
              {leadsLoading ? '–' : stat.value}
            </span>
            <span className="leads-quick-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        total={leads.length}
        filtered={filteredLeads.length}
      />

      {leadsLoading ? (
        <div className="page-loading">
          <div className="page-loading-spinner" />
          <span>Carregando leads do Supabase...</span>
        </div>
      ) : (
        <LeadTable leads={filteredLeads} onStatusChange={updateLeadStatus} />
      )}
    </div>
  );
}
