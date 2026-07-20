import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Supabase não configurado! Edite o arquivo .env com suas credenciais.\n' +
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          nome: string;
          email: string;
          tipo: 'revendedor' | 'afiliado' | 'admin';
          equipe_tamanho: number;
          plano: 'starter' | 'pro' | 'enterprise';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['usuarios']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>;
      };
      leads: {
        Row: {
          id: string;
          nome: string;
          email: string | null;
          telefone: string | null;
          fonte: string;
          pontuacao_comportamental: number;
          score_breakdown: Record<string, number> | null;
          status: string;
          data_captura: string;
          ultima_interacao: string;
          sinais_compra: string[];
          cidade: string | null;
          bio: string | null;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };
      interacoes: {
        Row: {
          id: string;
          lead_id: string;
          tipo: string;
          conteudo: string;
          data_hora: string;
          plataforma: string;
          engajamento: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['interacoes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['interacoes']['Insert']>;
      };
      configuracoes: {
        Row: {
          id: string;
          usuario_id: string;
          termos_busca: string[];
          fontes_ativas: string[];
          frequencia_varredura: number;
          regras_pontuacao: Array<{ id: string; criterio: string; peso: number; ativo: boolean }>;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['configuracoes']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['configuracoes']['Insert']>;
      };
    };
  };
};
