// ============================================================================
// LIBRARY MODAL (BIBLIOTECA DE EXERCÍCIOS OFICIAIS DA SEBENTA)
// ============================================================================

import React, { useState } from 'react';
import { X, Search, Filter, BookOpen, Check } from 'lucide-react';
import { FeaMode, FeaPreset } from '../../types/fea';
import { SEBENTA_PRESETS } from '../../presets/sebentaPresets';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preset: FeaPreset) => void;
  currentPresetId: string;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentPresetId
}) => {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = SEBENTA_PRESETS.filter((p) => {
    const matchesMode = modeFilter === 'all' || p.mode === modeFilter;
    const matchesSearch =
      search.trim() === '' ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      `ex ${p.num}`.includes(search.toLowerCase());
    return matchesMode && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Biblioteca de Exercícios da Sebenta (ESTG / ULO)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              15 exercícios completos de Mecânica Aplicada e Elementos Finitos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por título, alínea, tipo de apoio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['all', 'Barra2D', 'Viga', 'VigaBarra2D', 'Mola'].map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors ${
                  modeFilter === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m === 'all' ? 'Todos' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Exercises */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((preset) => {
            const isCurrent = preset.id === currentPresetId;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  onSelect(preset);
                  onClose();
                }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all hover:shadow-md flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                      {preset.mode}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {preset.nodes.length} nós • {preset.elements.length} barras
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                    {preset.title}
                  </h3>
                  {preset.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-600 hover:underline">Carregar Exercício →</span>
                  {isCurrent && (
                    <span className="flex items-center gap-1 text-emerald-600 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Ativo
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
