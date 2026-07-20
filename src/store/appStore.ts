import { create } from 'zustand';
import type { LeadData, LeadStatus, User, Stage, FilterConfig, Configuracao } from '../types';
import { signIn, signOut, getCurrentUserProfile } from '../services/authService';
import {
  fetchLeads,
  fetchLeadById,
  updateLeadStatus as dbUpdateLeadStatus,
  subscribeToNewLeads,
  fetchConfiguracoes,
  upsertConfiguracoes,
  fetchLeadsStats,
} from '../services/leadsService';
import { mockSources } from '../data/mockData';

// ========================
// BUILD STAGES from leads
// ========================
function buildStages(leads: LeadData[]): Stage[] {
  const stagesMeta = [
    { id: 'novo',       titulo: 'Novos Leads',    cor: '#7c3aed' },
    { id: 'contatado',  titulo: 'Contatados',     cor: '#06b6d4' },
    { id: 'qualificado',titulo: 'Qualificados',   cor: '#f59e0b' },
    { id: 'negociacao', titulo: 'Em Negociação',  cor: '#f97316' },
    { id: 'convertido', titulo: 'Convertidos',    cor: '#10b981' },
    { id: 'perdido',    titulo: 'Perdidos',       cor: '#ef4444' },
  ];

  return stagesMeta.map((s) => ({
    ...s,
    leads: leads.filter((l) => l.status === s.id),
  }));
}

// ========================
// STATE INTERFACE
// ========================
interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;

  // Leads
  leads: LeadData[];
  leadsLoading: boolean;
  leadsError: string | null;
  loadLeads: () => Promise<void>;
  refreshLead: (id: string) => Promise<void>;
  updateLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  getLeadById: (id: string) => LeadData | undefined;

  // Filters
  filters: FilterConfig;
  setFilters: (filters: FilterConfig) => void;

  // CRM Stages
  stages: Stage[];
  moveLead: (leadId: string, fromStage: string, toStage: string) => Promise<void>;

  // Configurações
  configuracao: Configuracao | null;
  configLoading: boolean;
  loadConfiguracao: () => Promise<void>;
  saveConfiguracao: (config: Configuracao) => Promise<boolean>;

  // Stats (dashboard)
  stats: {
    total: number;
    convertidos: number;
    novos: number;
    taxaConversao: string;
  } | null;
  loadStats: () => Promise<void>;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeScans: number;

  // Realtime
  realtimeUnsubscribe: (() => void) | null;
  startRealtime: () => void;
  stopRealtime: () => void;
}

// ========================
// STORE
// ========================
export const useAppStore = create<AppState>((set, get) => ({
  // ── Auth ──────────────────────────────────────────
  user: null,
  isAuthenticated: false,
  authLoading: true,

  login: async (email, password) => {
    const { user, error } = await signIn(email, password);
    if (user) {
      set({ user, isAuthenticated: true });
      await get().loadLeads();
      await get().loadStats();
      get().startRealtime();
      return { success: true, error: null };
    }
    return { success: false, error: error ?? 'Erro ao fazer login.' };
  },

  logout: async () => {
    get().stopRealtime();
    await signOut();
    set({ user: null, isAuthenticated: false, leads: [], stages: buildStages([]) });
  },

  restoreSession: async () => {
    set({ authLoading: true });
    try {
      const user = await getCurrentUserProfile();
      if (user) {
        set({ user, isAuthenticated: true });
        await Promise.all([get().loadLeads(), get().loadStats()]);
        get().startRealtime();
      }
    } catch (err) {
      console.error('Erro ao restaurar sessão:', err);
    } finally {
      set({ authLoading: false });
    }
  },

  // ── Leads ─────────────────────────────────────────
  leads: [],
  leadsLoading: false,
  leadsError: null,

  loadLeads: async () => {
    set({ leadsLoading: true, leadsError: null });
    try {
      const leads = await fetchLeads();
      set({ leads, stages: buildStages(leads), leadsLoading: false });
    } catch {
      set({ leadsError: 'Falha ao carregar leads.', leadsLoading: false });
    }
  },

  refreshLead: async (id: string) => {
    const updated = await fetchLeadById(id);
    if (updated) {
      set((state) => ({
        leads: state.leads.map((l) => (l.id === id ? updated : l)),
        stages: buildStages(
          state.leads.map((l) => (l.id === id ? updated : l))
        ),
      }));
    }
  },

  updateLeadStatus: async (id, status) => {
    // Optimistic update
    set((state) => {
      const updatedLeads = state.leads.map((l) =>
        l.id === id ? { ...l, status } : l
      );
      return { leads: updatedLeads, stages: buildStages(updatedLeads) };
    });
    // Persist to Supabase
    await dbUpdateLeadStatus(id, status);
  },

  getLeadById: (id) => get().leads.find((l) => l.id === id),

  // ── Filters ───────────────────────────────────────
  filters: {
    busca: '',
    fonte: 'all',
    status: 'all',
    pontuacao_min: 0,
    pontuacao_max: 100,
    periodo: 'all',
  },
  setFilters: (filters) => set({ filters }),

  // ── CRM ───────────────────────────────────────────
  stages: buildStages([]),

  moveLead: async (leadId, _fromStage, toStage) => {
    await get().updateLeadStatus(leadId, toStage as LeadStatus);
  },

  // ── Configurações ─────────────────────────────────
  configuracao: null,
  configLoading: false,

  loadConfiguracao: async () => {
    const user = get().user;
    if (!user) return;
    set({ configLoading: true });
    try {
      const data = await fetchConfiguracoes(user.id);
      if (data) {
        set({
          configuracao: {
            id: data.id as string,
            usuario_id: data.usuario_id as string,
            termos_busca: (data.termos_busca as string[]) ?? [],
            fontes_ativas: (data.fontes_ativas as Configuracao['fontes_ativas']) ?? [],
            frequencia_varredura: (data.frequencia_varredura as number) ?? 15,
            regras_pontuacao: (data.regras_pontuacao as Configuracao['regras_pontuacao']) ?? [],
          },
        });
      }
    } finally {
      set({ configLoading: false });
    }
  },

  saveConfiguracao: async (config: Configuracao) => {
    const ok = await upsertConfiguracoes({
      usuario_id: config.usuario_id,
      termos_busca: config.termos_busca,
      fontes_ativas: config.fontes_ativas,
      frequencia_varredura: config.frequencia_varredura,
      regras_pontuacao: config.regras_pontuacao,
    });
    if (ok) set({ configuracao: config });
    return ok;
  },

  // ── Stats ─────────────────────────────────────────
  stats: null,

  loadStats: async () => {
    const stats = await fetchLeadsStats();
    set({ stats });
  },

  // ── UI ────────────────────────────────────────────
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  activeScans: mockSources.filter((s) => s.ativo && s.status === 'scanning').length,

  // ── Realtime ──────────────────────────────────────
  realtimeUnsubscribe: null,

  startRealtime: () => {
    const existing = get().realtimeUnsubscribe;
    if (existing) existing();

    const unsubscribe = subscribeToNewLeads((lead) => {
      set((state) => {
        const exists = state.leads.find((l) => l.id === lead.id);
        const updatedLeads = exists
          ? state.leads.map((l) => (l.id === lead.id ? lead : l))
          : [lead, ...state.leads];
        return { leads: updatedLeads, stages: buildStages(updatedLeads) };
      });
    });

    set({ realtimeUnsubscribe: unsubscribe });
  },

  stopRealtime: () => {
    const unsubscribe = get().realtimeUnsubscribe;
    if (unsubscribe) {
      unsubscribe();
      set({ realtimeUnsubscribe: null });
    }
  },
}));
