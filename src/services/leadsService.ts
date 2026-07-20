import { supabase } from '../lib/supabase';
import type { LeadData, LeadStatus, LeadSource, Interaction, ScoreBreakdown } from '../types';

// ========================
// Helpers
// ========================
function mapRowToLead(row: Record<string, unknown>, interacoes: Interaction[] = []): LeadData {
  const breakdown = (row.score_breakdown as Record<string, number>) ?? {
    intencao_compra: 0,
    engajamento: 0,
    urgencia: 0,
    poder_aquisitivo: 0,
    pesquisa_ativa: 0,
  };

  return {
    id: row.id as string,
    nome: row.nome as string,
    email: (row.email as string) ?? '',
    telefone: (row.telefone as string) ?? '',
    fonte: (row.fonte as LeadSource) ?? 'Instagram',
    pontuacao_comportamental: (row.pontuacao_comportamental as number) ?? 0,
    score_breakdown: breakdown as ScoreBreakdown,
    status: (row.status as LeadStatus) ?? 'novo',
    data_captura: (row.data_captura as string) ?? new Date().toISOString(),
    ultima_interacao: (row.ultima_interacao as string) ?? new Date().toISOString(),
    sinais_compra: (row.sinais_compra as string[]) ?? [],
    historico_interacoes: interacoes,
    cidade: row.cidade as string | undefined,
    bio: row.bio as string | undefined,
  };
}

function mapRowToInteraction(row: Record<string, unknown>): Interaction {
  return {
    id: row.id as string,
    lead_id: row.lead_id as string,
    tipo: row.tipo as Interaction['tipo'],
    conteudo: row.conteudo as string,
    data_hora: row.data_hora as string,
    plataforma: row.plataforma as LeadSource,
    engajamento: (row.engajamento as number) ?? 0,
  };
}

// ========================
// LEADS
// ========================

export async function fetchLeads(): Promise<LeadData[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('data_captura', { ascending: false });

  if (error) {
    console.error('Erro ao buscar leads:', error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRowToLead(row as Record<string, unknown>));
}

export async function fetchLeadById(id: string): Promise<LeadData | null> {
  // Fetch lead and its interactions in parallel
  const [leadRes, interacoesRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('interacoes').select('*').eq('lead_id', id).order('data_hora', { ascending: true }),
  ]);

  if (leadRes.error || !leadRes.data) {
    console.error('Erro ao buscar lead:', leadRes.error?.message);
    return null;
  }

  const interacoes = (interacoesRes.data ?? []).map((r) =>
    mapRowToInteraction(r as Record<string, unknown>)
  );

  return mapRowToLead(leadRes.data as Record<string, unknown>, interacoes);
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<boolean> {
  const { error } = await supabase
    .from('leads')
    .update({ status, ultima_interacao: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar status:', error.message);
    return false;
  }
  return true;
}

export async function insertLead(lead: Omit<LeadData, 'id' | 'historico_interacoes'>): Promise<LeadData | null> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      fonte: lead.fonte,
      pontuacao_comportamental: lead.pontuacao_comportamental,
      score_breakdown: lead.score_breakdown,
      status: lead.status,
      data_captura: lead.data_captura,
      ultima_interacao: lead.ultima_interacao,
      sinais_compra: lead.sinais_compra,
      cidade: lead.cidade,
      bio: lead.bio,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao inserir lead:', error.message);
    return null;
  }

  return mapRowToLead(data as Record<string, unknown>);
}

export async function deleteLead(id: string): Promise<boolean> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) {
    console.error('Erro ao deletar lead:', error.message);
    return false;
  }
  return true;
}

// ========================
// INTERAÇÕES
// ========================

export async function fetchInteracoesByLead(leadId: string): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from('interacoes')
    .select('*')
    .eq('lead_id', leadId)
    .order('data_hora', { ascending: true });

  if (error) {
    console.error('Erro ao buscar interações:', error.message);
    return [];
  }

  return (data ?? []).map((r) => mapRowToInteraction(r as Record<string, unknown>));
}

export async function insertInteracao(interacao: Omit<Interaction, 'id'>): Promise<boolean> {
  const { error } = await supabase.from('interacoes').insert({
    lead_id: interacao.lead_id,
    tipo: interacao.tipo,
    conteudo: interacao.conteudo,
    data_hora: interacao.data_hora,
    plataforma: interacao.plataforma,
    engajamento: interacao.engajamento,
  });

  if (error) {
    console.error('Erro ao inserir interação:', error.message);
    return false;
  }
  return true;
}

// ========================
// CONFIGURAÇÕES
// ========================

export async function fetchConfiguracoes(usuarioId: string) {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar configurações:', error.message);
    return null;
  }

  return data;
}

export async function upsertConfiguracoes(config: {
  usuario_id: string;
  termos_busca: string[];
  fontes_ativas: string[];
  frequencia_varredura: number;
  regras_pontuacao: Array<{ id: string; criterio: string; peso: number; ativo: boolean }>;
}): Promise<boolean> {
  const { error } = await supabase
    .from('configuracoes')
    .upsert({ ...config, updated_at: new Date().toISOString() }, { onConflict: 'usuario_id' });

  if (error) {
    console.error('Erro ao salvar configurações:', error.message);
    return false;
  }
  return true;
}

// ========================
// ANALYTICS
// ========================

export async function fetchLeadsStats() {
  const [totalRes, convertidosRes, novosRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'convertido'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'novo'),
  ]);

  const total = totalRes.count ?? 0;
  const convertidos = convertidosRes.count ?? 0;
  const novos = novosRes.count ?? 0;
  const taxaConversao = total > 0 ? ((convertidos / total) * 100).toFixed(1) : '0.0';

  return { total, convertidos, novos, taxaConversao };
}

export async function fetchLeadsPorFonte() {
  const { data, error } = await supabase
    .from('leads')
    .select('fonte');

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  data.forEach((r) => {
    counts[r.fonte] = (counts[r.fonte] ?? 0) + 1;
  });
  return counts;
}

// ========================
// REALTIME — Novos Leads
// ========================

export function subscribeToNewLeads(callback: (lead: LeadData) => void) {
  const channel = supabase
    .channel('leads-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'leads' },
      (payload) => {
        const lead = mapRowToLead(payload.new as Record<string, unknown>);
        callback(lead);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'leads' },
      (payload) => {
        const lead = mapRowToLead(payload.new as Record<string, unknown>);
        callback(lead);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
