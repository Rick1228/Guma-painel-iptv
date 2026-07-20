import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { Zap, Eye, EyeOff, ArrowRight, Shield, Radio, TrendingUp, AlertTriangle } from 'lucide-react';
import './Login.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string ?? '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string ?? '';

const isSupabaseConfigured =
  supabaseUrl.includes('supabase.co') &&
  supabaseKey.length > 20 &&
  !supabaseKey.includes('SUA_CHAVE');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAppStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { success, error: loginError } = await login(email, password);
    setLoading(false);

    if (success) {
      navigate('/dashboard');
    } else {
      setError(loginError ?? 'E-mail ou senha inválidos. Verifique suas credenciais.');
    }
  };

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-bg">
        <div className="login-bg-glow login-bg-glow1" />
        <div className="login-bg-glow login-bg-glow2" />
        <div className="login-grid" />
      </div>

      {/* Left panel */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-logo">
            <div className="login-logo-icon">
              <Zap size={28} fill="currentColor" />
            </div>
            <div>
              <span className="login-brand">Guma</span>
              <span className="login-brand-accent">Leads</span>
            </div>
          </div>

          <h2 className="login-headline">
            Prospecção de leads IPTV com <span className="login-highlight">inteligência em tempo real</span>
          </h2>

          <p className="login-description">
            Identifique, qualifique e capture leads com intenção real de compra, monitorando milhares de interações simultâneas em redes sociais e fóruns.
          </p>

          <div className="login-features">
            {[
              { icon: Radio, text: 'Monitoramento em tempo real de 6 fontes simultâneas' },
              { icon: TrendingUp, text: 'Pontuação comportamental automática com IA' },
              { icon: Shield, text: 'CRM integrado com pipeline de vendas visual' },
            ].map(({ icon: Icon, text }) => (
              <div className="login-feature" key={text}>
                <div className="login-feature-icon">
                  <Icon size={14} />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="login-stats">
            <div className="login-stat">
              <span className="login-stat-value">12.4k+</span>
              <span className="login-stat-label">Leads capturados</span>
            </div>
            <div className="login-stat-divider" />
            <div className="login-stat">
              <span className="login-stat-value">18.9%</span>
              <span className="login-stat-label">Taxa de conversão</span>
            </div>
            <div className="login-stat-divider" />
            <div className="login-stat">
              <span className="login-stat-value">6</span>
              <span className="login-stat-label">Fontes monitoradas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h1 className="login-card-title">Entrar na plataforma</h1>
            <p className="login-card-subtitle">Acesse seu painel de prospecção</p>
          </div>

          {/* Supabase not configured warning */}
          {!isSupabaseConfigured && (
            <div className="login-warning">
              <AlertTriangle size={16} />
              <div>
                <strong>Supabase não configurado.</strong>
                <br />
                Edite o arquivo <code>.env</code> com sua URL e chave anon do Supabase antes de fazer login.
              </div>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-label">E-mail</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={!isSupabaseConfigured}
                id="login-email"
              />
            </div>

            <div className="login-field">
              <label className="login-label">Senha</label>
              <div className="login-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={!isSupabaseConfigured}
                  id="login-password"
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={loading || !isSupabaseConfigured}
              id="login-submit"
            >
              {loading ? (
                <span className="login-loading">
                  <span className="login-spinner" />
                  Entrando...
                </span>
              ) : (
                <>
                  Entrar no painel
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="login-hint">
              <Shield size={12} />
              Autenticado via Supabase Auth · Dados seguros e criptografados
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
