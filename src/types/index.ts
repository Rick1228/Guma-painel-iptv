export type LeadSource = 'Instagram' | 'Facebook' | 'Reddit' | 'Quora' | 'Twitter' | 'YouTube';

export type LeadStatus =
  | 'novo'
  | 'contatado'
  | 'qualificado'
  | 'negociacao'
  | 'perdido'
  | 'convertido';

export type InteractionType = 'postagem' | 'comentario' | 'mensagem' | 'compartilhamento';

export interface Interaction {
  id: string;
  lead_id: string;
  tipo: InteractionType;
  conteudo: string;
  data_hora: string;
  plataforma: LeadSource;
  engajamento: number;
}

export interface ScoreBreakdown {
  intencao_compra: number;
  engajamento: number;
  urgencia: number;
  poder_aquisitivo: number;
  pesquisa_ativa: number;
}

export interface LeadData {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  fonte: LeadSource;
  pontuacao_comportamental: number;
  score_breakdown: ScoreBreakdown;
  status: LeadStatus;
  data_captura: string;
  ultima_interacao: string;
  sinais_compra: string[];
  historico_interacoes: Interaction[];
  cidade?: string;
  avatar?: string;
  bio?: string;
}

export interface FilterConfig {
  busca: string;
  fonte: LeadSource | 'all';
  status: LeadStatus | 'all';
  pontuacao_min: number;
  pontuacao_max: number;
  periodo: '7d' | '30d' | '90d' | 'all';
}

export interface SourceConfig {
  id: string;
  nome: LeadSource;
  ativo: boolean;
  termos: string[];
  leads_hoje: number;
  status: 'scanning' | 'idle' | 'error';
  ultima_varredura: string;
  cor: string;
}

export interface Stage {
  id: string;
  titulo: string;
  cor: string;
  leads: LeadData[];
}

export interface User {
  id: string;
  nome: string;
  email: string;
  tipo: 'revendedor' | 'afiliado' | 'admin';
  equipe_tamanho: number;
  plano: 'starter' | 'pro' | 'enterprise';
  avatar?: string;
}

export interface StatsData {
  titulo: string;
  valor: number | string;
  variacao: number;
  tendencia: 'up' | 'down';
  unidade?: string;
  icone: string;
}

export interface AnalyticsData {
  periodo: string;
  leads_total: number;
  leads_convertidos: number;
  taxa_conversao: number;
  por_fonte: Record<LeadSource, number>;
}

export interface ConfiguracaoRegra {
  id: string;
  criterio: string;
  peso: number;
  ativo: boolean;
}

export interface Configuracao {
  id: string;
  usuario_id: string;
  termos_busca: string[];
  fontes_ativas: LeadSource[];
  frequencia_varredura: number;
  regras_pontuacao: ConfiguracaoRegra[];
}
