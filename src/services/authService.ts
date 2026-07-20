import { supabase } from '../lib/supabase';
import type { User } from '../types';

// ========================
// SIGN IN com Email/Senha (Supabase Auth)
// ========================
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { user: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, error: 'Usuário não encontrado.' };
  }

  // Buscar perfil na tabela usuarios
  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    // Se não existe perfil, cria um padrão
    const defaultProfile = {
      id: data.user.id,
      nome: data.user.email?.split('@')[0] ?? 'Usuário',
      email: data.user.email ?? '',
      tipo: 'revendedor' as const,
      equipe_tamanho: 1,
      plano: 'starter' as const,
    };

    await supabase.from('usuarios').insert(defaultProfile);
    return { user: defaultProfile, error: null };
  }

  return {
    user: {
      id: profile.id as string,
      nome: profile.nome as string,
      email: profile.email as string,
      tipo: profile.tipo as User['tipo'],
      equipe_tamanho: profile.equipe_tamanho as number,
      plano: profile.plano as User['plano'],
    },
    error: null,
  };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUserProfile(): Promise<User | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return null;

  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', sessionData.session.user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: profile.id as string,
    nome: profile.nome as string,
    email: profile.email as string,
    tipo: profile.tipo as User['tipo'],
    equipe_tamanho: profile.equipe_tamanho as number,
    plano: profile.plano as User['plano'],
  };
}

// ========================
// SIGN UP (Cadastro)
// ========================
export async function signUp(
  email: string,
  password: string,
  nome: string,
  tipo: User['tipo'] = 'revendedor'
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Erro ao criar conta.' };

  const profile = {
    id: data.user.id,
    nome,
    email,
    tipo,
    equipe_tamanho: 1,
    plano: 'starter' as const,
  };

  await supabase.from('usuarios').insert(profile);

  return { user: profile, error: null };
}
