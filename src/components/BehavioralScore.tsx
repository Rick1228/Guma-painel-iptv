import type { ScoreBreakdown } from '../types';
import './BehavioralScore.css';

interface BehavioralScoreProps {
  score: number;
  breakdown: ScoreBreakdown;
  compact?: boolean;
}

const criteriaLabels: Record<keyof ScoreBreakdown, string> = {
  intencao_compra: 'Intenção de Compra',
  engajamento: 'Engajamento',
  urgencia: 'Urgência',
  poder_aquisitivo: 'Poder Aquisitivo',
  pesquisa_ativa: 'Pesquisa Ativa',
};

function getScoreColor(score: number) {
  if (score >= 85) return '#10b981';
  if (score >= 65) return '#f59e0b';
  if (score >= 45) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score: number) {
  if (score >= 85) return 'Quente';
  if (score >= 65) return 'Morno';
  if (score >= 45) return 'Frio';
  return 'Gelado';
}

export default function BehavioralScore({ score, breakdown, compact = false }: BehavioralScoreProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (compact) {
    return (
      <div className="bs-compact">
        <div className="bs-compact-ring">
          <svg width="44" height="44" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="28" fill="none" stroke="var(--bg-surface)" strokeWidth="4" />
            <circle
              cx="30" cy="30" r="28"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 30 30)"
              style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${color})` }}
            />
            <text x="30" y="35" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>
              {score}
            </text>
          </svg>
        </div>
        <div className="bs-compact-info">
          <span className="bs-compact-label" style={{ color }}>● {label}</span>
          <span className="bs-compact-sub">Score comportamental</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bs-full">
      <div className="bs-full-header">
        <div className="bs-ring">
          <svg width="80" height="80" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="28" fill="none" stroke="var(--bg-surface)" strokeWidth="5" />
            <circle
              cx="30" cy="30" r="28"
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 30 30)"
              style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color})` }}
            />
          </svg>
          <div className="bs-ring-value" style={{ color }}>
            <span className="bs-ring-number">{score}</span>
            <span className="bs-ring-label">{label}</span>
          </div>
        </div>
      </div>

      <div className="bs-breakdown">
        {(Object.keys(breakdown) as (keyof ScoreBreakdown)[]).map((key) => {
          const val = breakdown[key];
          const c = getScoreColor(val);
          return (
            <div key={key} className="bs-criterion">
              <div className="bs-criterion-header">
                <span className="bs-criterion-label">{criteriaLabels[key]}</span>
                <span className="bs-criterion-value" style={{ color: c }}>{val}</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${val}%`, background: `linear-gradient(90deg, ${c}90, ${c})` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
