import { useState } from 'react';
import type { LeadData, LeadStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import BehavioralScore from './BehavioralScore';
import './LeadTable.css';

interface LeadTableProps {
  leads: LeadData[];
  onStatusChange: (id: string, status: LeadStatus) => void;
}

type SortKey = 'nome' | 'pontuacao_comportamental' | 'data_captura' | 'ultima_interacao';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

const sourceIcons: Record<string, string> = {
  Instagram: '📸', Facebook: '📘', Reddit: '🤖', Quora: '❓', Twitter: '🐦', YouTube: '▶️',
};

const statusOptions: LeadStatus[] = ['novo', 'contatado', 'qualificado', 'negociacao', 'convertido', 'perdido'];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function LeadTable({ leads, onStatusChange }: LeadTableProps) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('pontuacao_comportamental');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const navigate = useNavigate();

  const sorted = [...leads].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const dir = sortDir === 'asc' ? 1 : -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
    return String(aVal).localeCompare(String(bVal)) * dir;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp size={12} className="sort-inactive" />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="lead-table-wrap">
      <div className="lead-table-container">
        <table className="lead-table">
          <thead>
            <tr>
              <th
                className="lead-th sortable"
                onClick={() => handleSort('nome')}
              >
                Lead <SortIcon col="nome" />
              </th>
              <th className="lead-th">Fonte</th>
              <th
                className="lead-th sortable"
                onClick={() => handleSort('pontuacao_comportamental')}
              >
                Score <SortIcon col="pontuacao_comportamental" />
              </th>
              <th className="lead-th">Status</th>
              <th className="lead-th">Sinais</th>
              <th
                className="lead-th sortable"
                onClick={() => handleSort('ultima_interacao')}
              >
                Interação <SortIcon col="ultima_interacao" />
              </th>
              <th className="lead-th">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((lead) => (
              <tr
                key={lead.id}
                className="lead-tr"
                onClick={() => navigate(`/leads/${lead.id}`)}
              >
                <td className="lead-td">
                  <div className="lead-table-name-cell">
                    <div className="lead-table-avatar">
                      {lead.nome.charAt(0)}
                    </div>
                    <div>
                      <div className="lead-table-name">{lead.nome}</div>
                      <div className="lead-table-email">{lead.email}</div>
                    </div>
                  </div>
                </td>
                <td className="lead-td" onClick={(e) => e.stopPropagation()}>
                  <span className={`badge source-badge-${lead.fonte.toLowerCase()}`}>
                    {sourceIcons[lead.fonte]} {lead.fonte}
                  </span>
                </td>
                <td className="lead-td" onClick={(e) => e.stopPropagation()}>
                  <BehavioralScore
                    score={lead.pontuacao_comportamental}
                    breakdown={lead.score_breakdown}
                    compact
                  />
                </td>
                <td className="lead-td" onClick={(e) => e.stopPropagation()}>
                  <select
                    className={`status-select status-select--${lead.status}`}
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                    id={`table-status-${lead.id}`}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </td>
                <td className="lead-td">
                  <div className="lead-table-signals">
                    {lead.sinais_compra.slice(0, 2).map((s) => (
                      <span key={s} className="tag" title={s}>{s.slice(0, 20)}{s.length > 20 ? '...' : ''}</span>
                    ))}
                    {lead.sinais_compra.length > 2 && (
                      <span className="lead-signal-more">+{lead.sinais_compra.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="lead-td">
                  <span className="lead-table-time">{timeAgo(lead.ultima_interacao)}</span>
                </td>
                <td className="lead-td" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    id={`view-lead-table-${lead.id}`}
                  >
                    Ver lead
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="lead-table-pagination">
          <span className="pagination-info">
            Página {page} de {totalPages} ({leads.length} leads)
          </span>
          <div className="pagination-controls">
            <button
              className="btn-icon"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              id="prev-page"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`pagination-page ${p === page ? 'pagination-page--active' : ''}`}
                onClick={() => setPage(p)}
                id={`page-${p}`}
              >
                {p}
              </button>
            ))}
            <button
              className="btn-icon"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              id="next-page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
