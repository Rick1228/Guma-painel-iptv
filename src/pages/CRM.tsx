import { useAppStore } from '../store/appStore';
import KanbanBoard from '../components/KanbanBoard';
import { Kanban, TrendingUp } from 'lucide-react';
import './CRM.css';

export default function CRM() {
  const { stages, leads, moveLead } = useAppStore();

  const totalLeads = leads.length;
  const converted = leads.filter(l => l.status === 'convertido').length;
  const convRate = ((converted / totalLeads) * 100).toFixed(1);

  return (
    <div className="crm-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM — Pipeline de Vendas</h1>
          <p className="page-subtitle">
            Arraste os cards entre colunas para atualizar o status dos leads
          </p>
        </div>
        <div className="crm-header-stats">
          <div className="crm-stat">
            <Kanban size={14} />
            <span>{totalLeads} leads no pipeline</span>
          </div>
          <div className="crm-stat crm-stat--success">
            <TrendingUp size={14} />
            <span>{convRate}% convertidos</span>
          </div>
        </div>
      </div>

      <div className="crm-summary">
        {stages.map((stage) => (
          <div key={stage.id} className="crm-stage-summary">
            <div className="crm-stage-dot" style={{ background: stage.cor }} />
            <span className="crm-stage-name">{stage.titulo}</span>
            <span className="crm-stage-count" style={{ color: stage.cor }}>{stage.leads.length}</span>
          </div>
        ))}
      </div>

      <KanbanBoard stages={stages} onMove={moveLead} />
    </div>
  );
}
