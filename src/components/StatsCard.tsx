import type { StatsData } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatsCard.css';

interface StatsCardProps {
  stat: StatsData;
  delay?: number;
}

export default function StatsCard({ stat, delay = 0 }: StatsCardProps) {
  const isUp = stat.tendencia === 'up';

  return (
    <div
      className="stats-card card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stats-card-top">
        <div className="stats-card-icon">{stat.icone}</div>
        <div className={`stats-card-change ${isUp ? 'change-up' : 'change-down'}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(stat.variacao)}%</span>
        </div>
      </div>

      <div className="stats-card-value">
        {typeof stat.valor === 'number' ? stat.valor.toLocaleString('pt-BR') : stat.valor}
        {stat.unidade && <span className="stats-card-unit">{stat.unidade}</span>}
      </div>

      <div className="stats-card-title">{stat.titulo}</div>

      <div className="stats-card-bar">
        <div
          className={`stats-card-bar-fill ${isUp ? 'bar-up' : 'bar-down'}`}
          style={{ width: `${Math.min(Math.abs(stat.variacao) * 3, 100)}%` }}
        />
      </div>
    </div>
  );
}
