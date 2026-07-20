import { useState } from 'react';
import type { Stage, LeadData, LeadStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import { Zap, User } from 'lucide-react';
import './KanbanBoard.css';

interface KanbanBoardProps {
  stages: Stage[];
  onMove: (leadId: string, toStage: string) => void;
}

function getScoreColor(score: number) {
  if (score >= 85) return '#10b981';
  if (score >= 65) return '#f59e0b';
  return '#ef4444';
}

const sourceIcons: Record<string, string> = {
  Instagram: '📸', Facebook: '📘', Reddit: '🤖', Quora: '❓', Twitter: '🐦', YouTube: '▶️',
};

function KanbanCard({ lead, onDragStart }: { lead: LeadData; onDragStart: (lead: LeadData) => void }) {
  const navigate = useNavigate();
  const scoreColor = getScoreColor(lead.pontuacao_comportamental);

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={() => onDragStart(lead)}
      onClick={() => navigate(`/leads/${lead.id}`)}
      id={`kanban-card-${lead.id}`}
    >
      <div className="kanban-card-header">
        <div className="kanban-card-avatar">
          {lead.nome.charAt(0)}
        </div>
        <div className="kanban-card-name-group">
          <div className="kanban-card-name">{lead.nome}</div>
          <div className="kanban-card-source">
            {sourceIcons[lead.fonte]} {lead.fonte}
          </div>
        </div>
        <div
          className="kanban-card-score"
          style={{ color: scoreColor, borderColor: `${scoreColor}30`, background: `${scoreColor}15` }}
        >
          {lead.pontuacao_comportamental}
        </div>
      </div>

      {lead.sinais_compra.length > 0 && (
        <div className="kanban-card-signals">
          <Zap size={10} style={{ color: 'var(--primary-light)' }} />
          <span>{lead.sinais_compra[0]}</span>
        </div>
      )}

      <div className="kanban-card-footer">
        <span className="kanban-card-phone">{lead.telefone}</span>
        <button
          className="kanban-view-btn"
          onClick={(e) => { e.stopPropagation(); navigate(`/leads/${lead.id}`); }}
        >
          <User size={11} />
        </button>
      </div>
    </div>
  );
}

export default function KanbanBoard({ stages, onMove }: KanbanBoardProps) {
  const [dragging, setDragging] = useState<LeadData | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const handleDragStart = (lead: LeadData) => setDragging(lead);
  const handleDragEnd = () => { setDragging(null); setOverStage(null); };
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setOverStage(stageId);
  };
  const handleDrop = (stageId: string) => {
    if (dragging && dragging.status !== stageId) {
      onMove(dragging.id, dragging.status, stageId);
    }
    setDragging(null);
    setOverStage(null);
  };

  return (
    <div className="kanban-board" onDragEnd={handleDragEnd}>
      {stages.map((stage) => (
        <div
          key={stage.id}
          className={`kanban-column ${overStage === stage.id ? 'kanban-column--over' : ''}`}
          onDragOver={(e) => handleDragOver(e, stage.id)}
          onDrop={() => handleDrop(stage.id)}
          id={`kanban-column-${stage.id}`}
        >
          <div className="kanban-column-header">
            <div className="kanban-column-title">
              <div
                className="kanban-column-dot"
                style={{ background: stage.cor, boxShadow: `0 0 8px ${stage.cor}60` }}
              />
              <span>{stage.titulo}</span>
            </div>
            <div className="kanban-column-count" style={{ background: `${stage.cor}20`, color: stage.cor, border: `1px solid ${stage.cor}30` }}>
              {stage.leads.length}
            </div>
          </div>

          <div className="kanban-cards">
            {stage.leads.length === 0 ? (
              <div className="kanban-empty">
                <div className="kanban-empty-icon" style={{ borderColor: `${stage.cor}30` }}>
                  <User size={18} style={{ color: stage.cor, opacity: 0.5 }} />
                </div>
                <span>Arraste leads aqui</span>
              </div>
            ) : (
              stage.leads.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  onDragStart={handleDragStart}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
