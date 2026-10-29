// ============================================================================
// MAIN APPLICATION (MODULAR SPLIT-PANE MEF ESTG STUDIO)
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import { FeaPreset, ActiveQuestions, ProblemConfig } from './types/fea';
import { SEBENTA_PRESETS } from './presets/sebentaPresets';
import { buildSymbolicAnalysis } from './engine/index';
import { TopBar } from './components/layout/TopBar';
import { LibraryModal } from './components/layout/LibraryModal';
import { StructureCanvas } from './components/canvas/StructureCanvas';
import { QuestionToggles } from './components/solver/QuestionToggles';
import { ResolutionSheet } from './components/solver/ResolutionSheet';
import { StudyMode } from './components/solver/StudyMode';
import { deserializeStateFromUrl } from './utils/urlState';

export default function App() {
  // Load state from URL param or default to Ex. 1
  const [exState, setExState] = useState<FeaPreset>(() => {
    const fromUrl = deserializeStateFromUrl();
    if (fromUrl) return fromUrl;
    return SEBENTA_PRESETS[0];
  });

  const [history, setHistory] = useState<FeaPreset[]>([]);
  const [future, setFuture] = useState<FeaPreset[]>([]);
  const [appMode, setAppMode] = useState<'resolution' | 'study'>('resolution');
  const [lang, setLang] = useState<'pt' | 'en'>('pt');
  const [showDofs, setShowDofs] = useState<boolean>(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);

  // Active Questions Toggles
  const [activeQuestions, setActiveQuestions] = useState<ActiveQuestions>({
    mcTable: true,
    stiffnessMatrix: true,
    forceVector: true,
    displacements: true,
    reactions: true,
    stresses: true,
    criticalZone: true,
    interpolation: true,
    criticalPoints: true,
    vibrations: true,
    potentialEnergy: true
  });

  // Problem Variables Config
  const [config, setConfig] = useState<ProblemConfig>({
    variables: {
      E: null,
      A: null,
      I: null,
      L: null,
      P: null,
      p: null,
      k: null,
      m: null,
      rho: null
    },
    substituteInertia: false,
    inertiaN: 0.01,
    targetBar: 1,
    targetXi: 0.5
  });

  // State update wrapper with Undo/Redo
  const updateState = (updater: (prev: FeaPreset) => FeaPreset) => {
    setExState((prev) => {
      const next = updater(prev);
      setHistory((h) => [...h.slice(-25), prev]);
      setFuture([]);
      return next;
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [exState, ...f]);
    setExState(prev);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, exState]);
    setExState(next);
  };

  const handleSelectPreset = (presetId: string) => {
    if (presetId === 'blank') {
      const blank: FeaPreset = {
        id: 'custom',
        num: null,
        title: 'Exercício Personalizado (Em Branco)',
        mode: exState.mode || 'Barra2D',
        forceSym: 'P',
        targetBar: 1,
        targetXi: 0.5,
        nodes: [
          { id: 1, label: 'A', x: 0, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
          { id: 2, label: 'B', x: 1, y: 0, support: 'rollerX', rollerAngle: 0, fx: 1, fy: -1, mz: 0 }
        ],
        elements: [
          { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '' }
        ]
      };
      updateState(() => blank);
      return;
    }
    const found = SEBENTA_PRESETS.find((p) => p.id === presetId);
    if (found) {
      const cloned = JSON.parse(JSON.stringify(found));
      setExState(cloned);
      setHistory([]);
      setFuture([]);
    }
  };

  // Run pure symbolic FEA analysis
  const analysis = useMemo(() => buildSymbolicAnalysis(exState), [exState]);

  const handleToggleQuestion = (key: keyof ActiveQuestions) => {
    setActiveQuestions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* 1. Header Toolbar */}
      <TopBar
        currentPresetId={exState.id}
        onSelectPreset={handleSelectPreset}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        mode={appMode}
        onSetMode={setAppMode}
        lang={lang}
        onSetLang={setLang}
        currentState={exState}
        onOpenLibrary={() => setIsLibraryOpen(true)}
      />

      {/* 2. Main Split-Pane Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Pane: Interactive Bridge Builder CAD Canvas */}
        <section className="flex-1 lg:w-1/2 h-[45vh] lg:h-full relative border-r border-slate-300 overflow-hidden">
          <StructureCanvas
            state={exState}
            analysis={analysis}
            onChange={updateState}
            showDofs={showDofs}
            setShowDofs={setShowDofs}
          />
        </section>

        {/* Right Pane: Modular Solver & Resolution Sheet or Study Mode */}
        <section className="flex-1 lg:w-1/2 h-[55vh] lg:h-full flex flex-col bg-white overflow-hidden shadow-sm">
          {/* Alíneas and Hybrid Variables Bar */}
          <QuestionToggles
            mode={exState.mode}
            activeQuestions={activeQuestions}
            onToggleQuestion={handleToggleQuestion}
            config={config}
            onUpdateConfig={setConfig}
          />

          {/* Scrollable Resolution or Study Content */}
          <div className="flex-1 overflow-y-auto print:overflow-visible">
            {appMode === 'resolution' ? (
              <ResolutionSheet
                state={exState}
                analysis={analysis}
                activeQuestions={activeQuestions}
                config={config}
              />
            ) : (
              <StudyMode
                state={exState}
                analysis={analysis}
                onRevealSolution={() => setAppMode('resolution')}
              />
            )}
          </div>
        </section>
      </main>

      {/* 3. Library Modal */}
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={(p) => {
          setExState(JSON.parse(JSON.stringify(p)));
          setHistory([]);
          setFuture([]);
        }}
        currentPresetId={exState.id}
      />
    </div>
  );
}
