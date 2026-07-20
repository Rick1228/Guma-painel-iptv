import type { SourceConfig } from '../types';
import { RefreshCw, AlertCircle, Pause, ExternalLink } from 'lucide-react';
import './SourceMonitor.css';

interface SourceMonitorProps {
  sources: SourceConfig[];
  activeScans: number;
}

const sourceIcons: Record<string, string> = {
  Instagram: '📸',
  Facebook: '📘',
  Reddit: '🤖',
  Quora: '❓',
  Twitter: '🐦',
  YouTube: '▶️',
};

export default function SourceMonitor({ sources, activeScans }: SourceMonitorProps) {
  return (
    <div className="source-monitor card">
      <div className="source-monitor-header">
        <div>
          <h3 className="source-monitor-title">Monitor de Fontes</h3>
          <p className="source-monitor-subtitle">
            <span className="pulse-dot" />
            {activeScans} fontes varrendo agora
          </p>
        </div>
        <div className="source-monitor-total">
          <span className="source-total-number">
            {sources.reduce((a, s) => a + s.leads_hoje, 0)}
          </span>
          <span className="source-total-label">leads hoje</span>
        </div>
      </div>

      <div className="source-list">
        {sources.map((source) => (
          <div key={source.id} className={`source-item ${!source.ativo ? 'source-item--inactive' : ''}`}>
            <div className="source-item-left">
              <div
                className="source-item-icon"
                style={{ background: `${source.cor}20`, border: `1px solid ${source.cor}30` }}
              >
                <span>{sourceIcons[source.nome]}</span>
              </div>
              <div>
                <div className="source-item-name">{source.nome}</div>
                <div className="source-item-terms">
                  {source.termos.slice(0, 2).join(' • ')}
                </div>
              </div>
            </div>

            <div className="source-item-right">
              <div className="source-item-leads">
                <span className="source-leads-count" style={{ color: source.cor }}>
                  {source.leads_hoje}
                </span>
                <span className="source-leads-label">hoje</span>
              </div>

              <div className={`source-status-badge source-status-${source.status}`}>
                {source.status === 'scanning' && <RefreshCw size={10} className="spin-icon" />}
                {source.status === 'idle' && <Pause size={10} />}
                {source.status === 'error' && <AlertCircle size={10} />}
                <span>{source.status === 'scanning' ? 'Ativo' : source.status === 'idle' ? 'Pausado' : 'Erro'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="source-footer">
        <button className="btn btn-ghost btn-sm">
          <ExternalLink size={13} />
          Gerenciar fontes
        </button>
        <span className="source-footer-time">
          Atualizado agora há pouco
        </span>
      </div>
    </div>
  );
}
