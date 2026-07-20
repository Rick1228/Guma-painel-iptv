import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { mockConfiguracao } from '../data/mockData';
import type { Configuracao } from '../types';
import { Plus, X, Save, RefreshCw, ToggleLeft, ToggleRight, CheckCircle, AlertTriangle } from 'lucide-react';
import './Configuracoes.css';

export default function Configuracoes() {
  const { configuracao, loadConfiguracao, saveConfiguracao, configLoading, user } = useAppStore();
  const [config, setConfig] = useState<Configuracao>(mockConfiguracao);
  const [novoTermo, setNovoTermo] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load from Supabase on mount
  useEffect(() => {
    loadConfiguracao();
  }, []);

  // Sync local state when Supabase data arrives
  useEffect(() => {
    if (configuracao) {
      setConfig(configuracao);
    }
  }, [configuracao]);

  const addTermo = () => {
    if (novoTermo.trim() && !config.termos_busca.includes(novoTermo.trim())) {
      setConfig({ ...config, termos_busca: [...config.termos_busca, novoTermo.trim()] });
      setNovoTermo('');
    }
  };

  const removeTermo = (termo: string) => {
    setConfig({ ...config, termos_busca: config.termos_busca.filter((t) => t !== termo) });
  };

  const toggleRegra = (id: string) => {
    setConfig({
      ...config,
      regras_pontuacao: config.regras_pontuacao.map((r) =>
        r.id === id ? { ...r, ativo: !r.ativo } : r
      ),
    });
  };

  const updatePeso = (id: string, peso: number) => {
    setConfig({
      ...config,
      regras_pontuacao: config.regras_pontuacao.map((r) =>
        r.id === id ? { ...r, peso } : r
      ),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');

    const configToSave: Configuracao = {
      ...config,
      usuario_id: user?.id ?? config.usuario_id,
    };

    const ok = await saveConfiguracao(configToSave);
    setSaving(false);

    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError('Falha ao salvar. Verifique o Supabase.');
    }
  };

  const pesoTotal = config.regras_pontuacao.filter((r) => r.ativo).reduce((a, r) => a + r.peso, 0);

  return (
    <div className="config-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="config-section-desc">
            {configLoading ? 'Carregando configurações...' : 'Configure fontes, termos de busca e regras de pontuação'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>
              <AlertTriangle size={13} /> {saveError}
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || configLoading}
            id="save-config"
          >
            {saved ? (
              <><CheckCircle size={15} /> Salvo no Supabase!</>
            ) : saving ? (
              <><RefreshCw size={15} className="spin-icon" /> Salvando...</>
            ) : (
              <><Save size={15} /> Salvar alterações</>
            )}
          </button>
        </div>
      </div>

      {configLoading && (
        <div className="page-loading">
          <div className="page-loading-spinner" />
          <span>Carregando configurações do Supabase...</span>
        </div>
      )}

      {!configLoading && (
        <>
          <div className="config-grid">
            {/* Termos de busca */}
            <div className="card config-card">
              <h3 className="config-section-title">🔍 Termos de Busca</h3>
              <p className="config-section-desc">Palavras e frases monitoradas em tempo real nas redes sociais</p>

              <div className="config-add-term">
                <input
                  type="text"
                  className="input"
                  placeholder="Adicionar novo termo..."
                  value={novoTermo}
                  onChange={(e) => setNovoTermo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTermo()}
                  id="new-term-input"
                />
                <button className="btn btn-primary btn-sm" onClick={addTermo} id="add-term-btn">
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>

              <div className="config-terms">
                {config.termos_busca.map((termo) => (
                  <div key={termo} className="config-term">
                    <span>{termo}</span>
                    <button
                      className="config-term-remove"
                      onClick={() => removeTermo(termo)}
                      aria-label={`Remover ${termo}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequência */}
            <div className="card config-card">
              <h3 className="config-section-title">⏱️ Frequência de Varredura</h3>
              <p className="config-section-desc">A cada quantos minutos o sistema varre as fontes ativas</p>

              <div className="config-frequency">
                <div className="frequency-display">
                  <span className="frequency-value">{config.frequencia_varredura}</span>
                  <span className="frequency-unit">minutos</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={config.frequencia_varredura}
                  onChange={(e) => setConfig({ ...config, frequencia_varredura: Number(e.target.value) })}
                  className="config-range"
                  id="frequency-range"
                />
                <div className="frequency-labels">
                  <span>5min (+ rápido)</span>
                  <span>60min (+ econômico)</span>
                </div>
              </div>

              <div className="config-hint">
                <RefreshCw size={13} />
                Varredura mais frequente captura leads em tempo real, mas pode consumir mais cota da API.
              </div>
            </div>
          </div>

          {/* Regras de pontuação */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-5)' }}>
              <div>
                <h3 className="config-section-title">📊 Regras de Pontuação Comportamental</h3>
                <p className="config-section-desc">Critérios que determinam o score comportamental dos leads</p>
              </div>
              <div className={`config-rules-total-badge ${pesoTotal === 100 ? 'total-ok' : 'total-warn'}`}>
                Peso total: {pesoTotal}/100
              </div>
            </div>

            <div className="config-rules">
              {config.regras_pontuacao.map((regra) => (
                <div key={regra.id} className={`config-rule ${!regra.ativo ? 'config-rule--disabled' : ''}`}>
                  <button
                    className="config-rule-toggle"
                    onClick={() => toggleRegra(regra.id)}
                    id={`toggle-rule-${regra.id}`}
                  >
                    {regra.ativo
                      ? <ToggleRight size={22} style={{ color: 'var(--success)' }} />
                      : <ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} />
                    }
                  </button>

                  <div className="config-rule-info">
                    <span className="config-rule-criterio">{regra.criterio}</span>
                  </div>

                  <div className="config-rule-weight">
                    <span className="config-weight-label">Peso</span>
                    <div className="config-weight-control">
                      <button className="weight-btn" onClick={() => updatePeso(regra.id, Math.max(0, regra.peso - 5))} id={`dec-peso-${regra.id}`}>−</button>
                      <span className="config-weight-value">{regra.peso}</span>
                      <button className="weight-btn" onClick={() => updatePeso(regra.id, Math.min(50, regra.peso + 5))} id={`inc-peso-${regra.id}`}>+</button>
                    </div>
                  </div>

                  <div className="config-rule-bar">
                    <div
                      className="config-rule-bar-fill"
                      style={{
                        width: `${(regra.peso / 50) * 100}%`,
                        background: regra.ativo ? 'var(--gradient-primary)' : 'var(--text-muted)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
