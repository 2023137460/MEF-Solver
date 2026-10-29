// ============================================================================
// TOP BAR (CABEÇALHO COM SELEÇÃO EX 1-15, MODO ESTUDO, IDIOMA, PARTILHA E PDF)
// ============================================================================

import React, { useState } from 'react';
import {
  BookOpen, Plus, Undo2, Redo2, Share2, Printer,
  GraduationCap, Globe, Check, Library
} from 'lucide-react';
import { FeaPreset } from '../../types/fea';
import { SEBENTA_PRESETS } from '../../presets/sebentaPresets';
import { serializeStateToUrl } from '../../utils/urlState';
import { printDocument } from '../../utils/pdfPrint';
import { pt } from '../../i18n/pt';
import { en } from '../../i18n/en';

interface TopBarProps {
  currentPresetId: string;
  onSelectPreset: (presetId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  mode: 'resolution' | 'study';
  onSetMode: (mode: 'resolution' | 'study') => void;
  lang: 'pt' | 'en';
  onSetLang: (lang: 'pt' | 'en') => void;
  currentState: FeaPreset;
  onOpenLibrary: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPresetId,
  onSelectPreset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  mode,
  onSetMode,
  lang,
  onSetLang,
  currentState,
  onOpenLibrary
}) => {
  const t = lang === 'pt' ? pt : en;
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = serializeStateToUrl(currentState);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-white shrink-0 select-none z-30">
      {/* Left: Brand & Preset Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-sm text-white shadow-md shadow-blue-500/20">
            MEF
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black tracking-tight leading-none text-white">
              ESTG — Elementos Finitos
            </h1>
            <p className="text-[10px] text-slate-400 font-bold leading-tight mt-0.5">
              15 Exercícios Oficiais da Sebenta
            </p>
          </div>
        </div>

        {/* Preset Selector Dropdown */}
        <div className="relative">
          <select
            value={currentPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="h-9 pl-3 pr-8 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-blue-500 transition-colors cursor-pointer max-w-[260px] truncate"
          >
            {SEBENTA_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                Ex. {p.num} — {p.title}
              </option>
            ))}
            <option value="blank">⚡ {t.newBlank}</option>
          </select>
        </div>

        {/* Undo / Redo */}
        <div className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-colors ${
              canUndo ? 'hover:bg-slate-800 text-slate-300' : 'text-slate-600 cursor-not-allowed'
            }`}
            title={t.undo}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-colors ${
              canRedo ? 'hover:bg-slate-800 text-slate-300' : 'text-slate-600 cursor-not-allowed'
            }`}
            title={t.redo}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Mode Switcher (Resolução | Estudo) */}
      <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
        <button
          onClick={() => onSetMode('resolution')}
          className={`px-3 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition-all ${
            mode === 'resolution'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.resolutionMode}</span>
        </button>
        <button
          onClick={() => onSetMode('study')}
          className={`px-3 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition-all ${
            mode === 'study'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.studyMode}</span>
        </button>
      </div>

      {/* Right: Library, Share, PDF, Language */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenLibrary}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-bold text-xs transition-colors"
          title={t.library}
        >
          <Library className="w-3.5 h-3.5" />
          <span>{t.library}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-bold text-xs transition-colors"
          title={copied ? t.copiedLink : t.share}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copiado!' : t.share}</span>
        </button>

        <button
          onClick={printDocument}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-bold text-xs transition-colors"
          title={t.exportPdf}
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PDF</span>
        </button>

        {/* Language Toggle */}
        <button
          onClick={() => onSetLang(lang === 'pt' ? 'en' : 'pt')}
          className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-bold text-xs transition-colors"
          title="Alternar Idioma / Switch Language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="uppercase font-mono text-[11px]">{lang}</span>
        </button>
      </div>
    </header>
  );
};
