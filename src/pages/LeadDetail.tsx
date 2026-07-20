import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { fetchLeadById } from '../services/leadsService';
import BehavioralScore from '../components/BehavioralScore';
import type { LeadData } from '../types';
import { ArrowLeft, MapPin, Phone, Mail, Clock, Zap, User, ExternalLink, RefreshCw } from 'lucide-react';
import './LeadDetail.css';

const sourceIcons: Record<string, string> = {
  Instagram: '📸', Facebook: '📘', Reddit: '🤖', Quora: '❓', Twitter: '🐦', YouTube: '▶️',
};

const interactionIcons: Record<string, string> = {
  postagem: '📝', comentario: '💬', mensagem: '✉️', compartilhamento: '🔄',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLeadById, updateLeadStatus } = useAppStore();
  const [lead, setLead] = useState<LeadData | null>(getLeadById(id!) ?? null);
  const [loading, setLoading] = useState(!lead);
  const [error, setError] = useState('');

  // Fetch full lead with interactions from Supabase
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchLeadById(id)
      .then((data) => {
        if (data) setLead(data);
        else setError('Lead não encontrado no banco de dados.');
      })
      .catch(() => setError('Erro ao carregar lead.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Carregando perfil do lead...</span>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="lead-detail-not-found">
        <User size={40} />
        <h2>{error || 'Lead não encontrado'}</h2>
        <button className="btn btn-ghost" onClick={() => navigate('/leads')}>
          <ArrowLeft size={16} />
          Voltar aos leads
        </button>
      </div>
    );
  }

  const handleStatusChange = async (status: LeadData['status']) => {
    await updateLeadStatus(lead.id, status);
    setLead((prev) => prev ? { ...prev, status } : prev);
  };

  return (
    <div className="lead-detail">
      {/* Back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button className="btn btn-ghost btn-sm lead-detail-back" onClick={() => navigate('/leads')}>
          <ArrowLeft size={15} />
          Voltar
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setLoading(true);
            fetchLeadById(lead.id).then((d) => { if (d) setLead(d); }).finally(() => setLoading(false));
          }}
          id="refresh-lead"
        >
          <RefreshCw size={13} />
          Atualizar
        </button>
      </div>

      <div className="lead-detail-grid">
        {/* Left column — Profile */}
        <div className="lead-detail-left">
          <div className="card lead-profile-card">
            <div className="lead-profile-top">
              <div className="lead-profile-avatar">
                {lead.nome.charAt(0)}
              </div>
              <div className="lead-profile-info">
                <h1 className="lead-profile-name">{lead.nome}</h1>
                {lead.cidade && (
                  <div className="lead-profile-location">
                    <MapPin size={13} />
                    {lead.cidade}
                  </div>
                )}
                <div className={`badge badge-${lead.status}`}>
                  {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </div>
              </div>
            </div>

            {lead.bio && <p className="lead-profile-bio">{lead.bio}</p>}

            <div className="lead-profile-contacts">
              {lead.email && (
                <div className="contact-item">
                  <Mail size={14} />
                  <span>{lead.email}</span>
                  <a href={`mailto:${lead.email}`} className="contact-link"><ExternalLink size={12} /></a>
                </div>
              )}
              {lead.telefone && (
                <div className="contact-item">
                  <Phone size={14} />
                  <span>{lead.telefone}</span>
                  <a href={`tel:${lead.telefone}`} className="contact-link"><ExternalLink size={12} /></a>
                </div>
              )}
            </div>

            <div className="divider" />

            <div className="lead-profile-meta">
              <div className="meta-item">
                <span className="meta-label">Fonte</span>
                <span className="meta-value">{sourceIcons[lead.fonte]} {lead.fonte}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Capturado</span>
                <span className="meta-value">{new Date(lead.data_captura).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Última interação</span>
                <span className="meta-value">{timeAgo(lead.ultima_interacao)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Interações</span>
                <span className="meta-value">{lead.historico_interacoes.length} registros</span>
              </div>
            </div>

            <div className="divider" />

            <div>
              <span className="meta-label">Alterar Status</span>
              <div className="status-buttons">
                {(['novo', 'contatado', 'qualificado', 'negociacao', 'convertido', 'perdido'] as const).map((s) => (
                  <button
                    key={s}
                    className={`status-btn ${lead.status === s ? `status-btn--${s}` : ''}`}
                    onClick={() => handleStatusChange(s)}
                    id={`detail-status-${s}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Buy signals */}
          {lead.sinais_compra.length > 0 && (
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>⚡ Sinais de Compra</h3>
              <div className="signals-list">
                {lead.sinais_compra.map((sinal) => (
                  <div key={sinal} className="signal-item">
                    <Zap size={13} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
                    <span>{sinal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Middle column — Score + Actions */}
        <div className="lead-detail-middle">
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 'var(--space-5)' }}>📊 Análise Comportamental</h3>
            <BehavioralScore score={lead.pontuacao_comportamental} breakdown={lead.score_breakdown} />
          </div>

          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>🎯 Ações Sugeridas</h3>
            <div className="actions-list">
              {[
                { action: `Enviar mensagem pelo ${lead.fonte}`, priority: 'alta', icon: '💬' },
                { action: 'Apresentar plano mensal com desconto', priority: 'alta', icon: '💰' },
                { action: 'Enviar tutorial de instalação', priority: 'media', icon: '📖' },
                { action: 'Oferecer período de teste gratuito', priority: 'media', icon: '🎁' },
              ].map((item) => (
                <div key={item.action} className="action-item">
                  <span className="action-icon">{item.icon}</span>
                  <span className="action-text">{item.action}</span>
                  <span className={`action-priority priority-${item.priority}`}>
                    {item.priority === 'alta' ? '🔴 Alta' : '🟡 Média'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — Timeline */}
        <div className="lead-detail-right">
          <div className="card lead-timeline-card">
            <h3 className="section-title" style={{ marginBottom: 'var(--space-5)' }}>
              📡 Timeline de Interações
            </h3>

            {lead.historico_interacoes.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma interação registrada ainda.</p>
              </div>
            ) : (
              <div className="timeline">
                {lead.historico_interacoes.map((interaction, idx) => (
                  <div key={interaction.id} className="timeline-item">
                    <div className="timeline-connector">
                      <div className="timeline-dot">
                        {interactionIcons[interaction.tipo] ?? '💬'}
                      </div>
                      {idx < lead.historico_interacoes.length - 1 && (
                        <div className="timeline-line" />
                      )}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-type">
                          {interaction.tipo.charAt(0).toUpperCase() + interaction.tipo.slice(1)}
                        </span>
                        <span className="timeline-platform">{interaction.plataforma}</span>
                        {interaction.engajamento > 0 && (
                          <span className="timeline-engagement">❤️ {interaction.engajamento}</span>
                        )}
                      </div>
                      <p className="timeline-text">"{interaction.conteudo}"</p>
                      <div className="timeline-meta">
                        <Clock size={11} />
                        {timeAgo(interaction.data_hora)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
