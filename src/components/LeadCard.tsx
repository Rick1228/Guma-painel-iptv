import type { LeadData, LeadStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, Zap } from 'lucide-react';
import BehavioralScore from './BehavioralScore';
import './LeadCard.css';

interface LeadCardProps {
  lead: LeadData;
  onStatusChange: (id: string, status: LeadStatus) => void;
  compact?: boolean;
}

const sourceIcons: Record<string, string> = {
  Instagram: '📸', Facebook: '📘', Reddit: '🤖', Quora: '❓', Twitter: '🐦', YouTube: '▶️',
};

const statusOptions: LeadStatus[] = ['novo', 'contatado', 'qualificado', 'negociacao', 'convertido', 'perdido'];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export default function LeadCard({ lead, onStatusChange, compact = false }: LeadCardProps) {
  const navigate = useNavigate();

  return (
    <div className={`lead-card card ${compact ? 'lead-card--compact' : ''}`}>
      <div className="lead-card-top">
        <div className="lead-card-info">
          <div className="lead-card-avatar">
            {lead.nome.charAt(0)}
          </div>
          <div>
            <div className="lead-card-name">{lead.nome}</div>
            <div className="lead-card-email">{lead.email}</div>
            {lead.cidade && (
              <div className="lead-card-location">
                <MapPin size={10} />
                {lead.cidade}
              </div>
            )}
          </div>
        </div>

        <div className="lead-card-meta">
          <div className={`badge badge-${lead.status}`}>
            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
          </div>
          <div className="lead-card-source">
            <span>{sourceIcons[lead.fonte]}</span>
            <span className={`source-${lead.fonte.toLowerCase()}`}>{lead.fonte}</span>
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div className="lead-card-score-row">
            <BehavioralScore score={lead.pontuacao_comportamental} breakdown={lead.score_breakdown} compact />
            <div className="lead-card-phone">{lead.telefone}</div>
          </div>

          {lead.sinais_compra.length > 0 && (
            <div className="lead-card-signals">
              {lead.sinais_compra.slice(0, 3).map((sinal) => (
                <span key={sinal} className="lead-signal">
                  <Zap size={10} />
                  {sinal}
                </span>
              ))}
              {lead.sinais_compra.length > 3 && (
                <span className="lead-signal-more">+{lead.sinais_compra.length - 3}</span>
              )}
            </div>
          )}

          {lead.historico_interacoes.length > 0 && (
            <div className="lead-card-preview">
              <p>"{lead.historico_interacoes[lead.historico_interacoes.length - 1].conteudo.slice(0, 100)}..."</p>
            </div>
          )}
        </>
      )}

      <div className="lead-card-footer">
        <div className="lead-card-time">
          <Clock size={11} />
          {timeAgo(lead.ultima_interacao)}
        </div>

        <div className="lead-card-actions">
          <select
            className="lead-status-select"
            value={lead.status}
            onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
            onClick={(e) => e.stopPropagation()}
            id={`status-${lead.id}`}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/leads/${lead.id}`)}
            id={`view-lead-${lead.id}`}
          >
            Ver <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
