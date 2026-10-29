// ============================================================================
// QUESTION TOGGLES & VARIABLES HYBRID CONFIGURATION
// ============================================================================

import React from 'react';
import {
  CheckSquare, Square, Settings2, Sparkles, HelpCircle,
  Layers, Gauge, Activity, Cpu, Variable
} from 'lucide-react';
import { ActiveQuestions, FeaMode, ProblemConfig } from '../../types/fea';

interface QuestionTogglesProps {
  mode: FeaMode;
  activeQuestions: ActiveQuestions;
  onToggleQuestion: (key: keyof ActiveQuestions) => void;
  config: ProblemConfig;
  onUpdateConfig: (updater: (prev: ProblemConfig) => ProblemConfig) => void;
}

export const QuestionToggles: React.FC<QuestionTogglesProps> = ({
  mode,
  activeQuestions,
  onToggleQuestion,
  config,
  onUpdateConfig
}) => {
  const [showConfigPanel, setShowConfigPanel] = React.useState(false);

  const toggleItems: Array<{
    key: keyof ActiveQuestions;
    label: string;
    sublabel: string;
    applicableModes: FeaMode[];
  }> = [
    {
      key: 'mcTable',
      label: 'Tabela de Conectividade (m.c.)',
      sublabel: 'G.D.L., ângulos θ e comprimentos',
      applicableModes: ['Mola', 'Barra2D', 'Viga', 'VigaBarra2D']
    },
    {
      key: 'stiffnessMatrix',
      label: 'Matriz de Rigidez Global [K]',
      sublabel: 'Montagem passo a passo dos termos Kij',
      applicableModes: ['Mola', 'Barra2D', 'Viga', 'VigaBarra2D']
    },
    {
      key: 'forceVector',
      label: 'Vetor de Forças Equivalentes {F}',
      sublabel: 'Integrais das funções de forma -∫p(x)Ni dx',
      applicableModes: ['Mola', 'Barra2D', 'Viga', 'VigaBarra2D']
    },
    {
      key: 'displacements',
      label: 'Deslocamentos Nodais {u}',
      sublabel: 'Resolução do sistema [K]{u} = {F}',
      applicableModes: ['Mola', 'Barra2D', 'Viga', 'VigaBarra2D']
    },
    {
      key: 'reactions',
      label: 'Reações de Apoio',
      sublabel: 'Cálculo direto a partir das linhas restringidas',
      applicableModes: ['Viga', 'VigaBarra2D', 'Barra2D']
    },
    {
      key: 'stresses',
      label: 'Tensões Axiais (σ) e Normal (N)',
      sublabel: 'Transformação local {u}=[R]{U} e σ=E/L·δ',
      applicableModes: ['Barra2D', 'VigaBarra2D']
    },
    {
      key: 'criticalZone',
      label: 'Zona Crítica da Estrutura',
      sublabel: 'Barra com máxima tensão absoluta |σ|max',
      applicableModes: ['Barra2D']
    },
    {
      key: 'interpolation',
      label: 'Interpolação num Ponto x',
      sublabel: 'Deslocamento, rotação, M(x) e V(x)',
      applicableModes: ['Barra2D', 'Viga', 'VigaBarra2D']
    },
    {
      key: 'criticalPoints',
      label: 'Pontos Críticos / Zeros de Rotação',
      sublabel: 'Resolução de θ(x)=0, v(x)=0 e extremos',
      applicableModes: ['Viga']
    },
    {
      key: 'vibrations',
      label: 'Modos de Vibração e Frequências',
      sublabel: 'Matriz de massa consistente [M] e |[K]-ω²[M]|=0',
      applicableModes: ['Barra2D', 'Viga']
    },
    {
      key: 'potentialEnergy',
      label: 'Energia Potencial Mínima',
      sublabel: 'Princípio de Estacionaridade Π = Ue - W',
      applicableModes: ['Mola']
    }
  ];

  const applicableItems = toggleItems.filter((item) => item.applicableModes.includes(mode));

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h2 className="font-extrabold text-sm text-slate-800 tracking-tight">
            Alíneas Pedidas no Enunciado (Toggles Ativos)
          </h2>
        </div>

        <button
          onClick={() => setShowConfigPanel(!showConfigPanel)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
            showConfigPanel || config.substituteInertia || Object.values(config.variables).some((v) => v !== null)
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Variable className="w-3.5 h-3.5" /> Variáveis & Rigidez
        </button>
      </div>

      {/* Grid of Chips */}
      <div className="flex flex-wrap gap-1.5">
        {applicableItems.map((item) => {
          const isActive = activeQuestions[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onToggleQuestion(item.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                isActive
                  ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
              title={item.sublabel}
            >
              {isActive ? (
                <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dropdown Configuration Panel for Symbolic vs Numeric Variables */}
      {showConfigPanel && (
        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-600" />
              <h3 className="font-extrabold text-slate-900">
                Painel Algébrico Híbrido (Simbólico vs Valores Numéricos)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Deixe vazio para manter a expressão simbólica exata da Sebenta
            </span>
          </div>

          {/* Numeric substitution inputs */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { key: 'E', label: 'E (Pa)', sym: 'E' },
              { key: 'A', label: 'A (m²)', sym: 'A' },
              { key: 'I', label: 'I (m⁴)', sym: 'I' },
              { key: 'L', label: 'L (m)', sym: 'L' },
              { key: 'P', label: 'P / p (N)', sym: 'P' },
              { key: 'k', label: 'k (N/m)', sym: 'k' }
            ].map((v) => (
              <div key={v.key} className="bg-white p-2 rounded-lg border border-slate-200">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase">{v.label}</label>
                <input
                  type="number"
                  placeholder="Simbólico"
                  value={config.variables[v.key as keyof typeof config.variables] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                    onUpdateConfig((prev) => ({
                      ...prev,
                      variables: { ...prev.variables, [v.key]: val }
                    }));
                  }}
                  className="w-full mt-1 px-2 py-1 text-xs border border-slate-300 rounded font-mono font-bold text-slate-900"
                />
              </div>
            ))}
          </div>

          {/* Inertia Substitution Toggle: I = n * A * L^2 */}
          {(mode === 'Viga' || mode === 'VigaBarra2D') && (
            <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inertiaSub"
                  checked={config.substituteInertia}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      substituteInertia: e.target.checked
                    }))
                  }
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="inertiaSub" className="font-bold text-slate-800 cursor-pointer">
                  Substituir momento de inércia por <span className="font-serif italic font-bold">I = n · A · L²</span>
                </label>
              </div>

              {config.substituteInertia && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Fator n:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={config.inertiaN}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0.01;
                      onUpdateConfig((prev) => ({ ...prev, inertiaN: val }));
                    }}
                    className="w-20 px-2 py-0.5 border border-indigo-300 rounded font-mono font-bold text-slate-900"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
