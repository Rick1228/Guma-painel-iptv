import type { FilterConfig, LeadSource, LeadStatus } from '../types';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import './FilterBar.css';

interface FilterBarProps {
  filters: FilterConfig;
  onChange: (filters: FilterConfig) => void;
  total: number;
  filtered: number;
}

const sources: Array<{ value: LeadSource | 'all'; label: string }> = [
  { value: 'all', label: 'Todas as fontes' },
  { value: 'Instagram', label: '📸 Instagram' },
  { value: 'Facebook', label: '📘 Facebook' },
  { value: 'Reddit', label: '🤖 Reddit' },
  { value: 'Quora', label: '❓ Quora' },
  { value: 'Twitter', label: '🐦 Twitter' },
  { value: 'YouTube', label: '▶️ YouTube' },
];

const statuses: Array<{ value: LeadStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'novo', label: 'Novo' },
  { value: 'contatado', label: 'Contatado' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'negociacao', label: 'Em Negociação' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'perdido', label: 'Perdido' },
];

const periods = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo período' },
];

export default function FilterBar({ filters, onChange, total, filtered }: FilterBarProps) {
  const hasActiveFilters =
    filters.busca !== '' ||
    filters.fonte !== 'all' ||
    filters.status !== 'all' ||
    filters.periodo !== 'all';

  const clearFilters = () => {
    onChange({
      busca: '',
      fonte: 'all',
      status: 'all',
      pontuacao_min: 0,
      pontuacao_max: 100,
      periodo: 'all',
    });
  };

  return (
    <div className="filter-bar">
      <div className="filter-bar-top">
        <div className="filter-search">
          <Search size={15} className="filter-search-icon" />
          <input
            type="text"
            className="input filter-input"
            placeholder="Buscar por nome, email ou telefone..."
            value={filters.busca}
            onChange={(e) => onChange({ ...filters, busca: e.target.value })}
            id="leads-search"
          />
          {filters.busca && (
            <button className="filter-clear-search" onClick={() => onChange({ ...filters, busca: '' })}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="filter-controls">
          <SlidersHorizontal size={15} className="filter-icon" />

          <select
            className="input filter-select"
            value={filters.fonte}
            onChange={(e) => onChange({ ...filters, fonte: e.target.value as FilterConfig['fonte'] })}
            id="filter-source"
          >
            {sources.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            className="input filter-select"
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value as FilterConfig['status'] })}
            id="filter-status"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            className="input filter-select"
            value={filters.periodo}
            onChange={(e) => onChange({ ...filters, periodo: e.target.value as FilterConfig['periodo'] })}
            id="filter-period"
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button className="btn btn-ghost btn-sm filter-clear" onClick={clearFilters} id="clear-filters">
              <X size={13} />
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar-info">
        <span className="filter-result-count">
          Exibindo <strong>{filtered}</strong> de <strong>{total}</strong> leads
        </span>
        {hasActiveFilters && (
          <span className="filter-active-badge">Filtros ativos</span>
        )}
      </div>
    </div>
  );
}
