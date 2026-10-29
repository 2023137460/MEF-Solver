// ============================================================================
// STUDY MODE (MODO ESTUDO / AUTO-AVALIAÇÃO CÉLULA A CÉLULA COM TOLERÂNCIA DE 1%)
// ============================================================================

import React, { useState } from 'react';
import {
  CheckCircle2, XCircle, HelpCircle, Eye, RefreshCw,
  Award, Sparkles, BookOpen
} from 'lucide-react';
import { FeaAnalysisResult, FeaPreset } from '../../types/fea';
import { fmtNum } from '../../engine/expr';
import { KaTeXBlock, CircledNumKaTeX } from './KaTeXBlock';

interface StudyModeProps {
  state: FeaPreset;
  analysis: FeaAnalysisResult;
  onRevealSolution: () => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({
  state,
  analysis,
  onRevealSolution
}) => {
  const { nDof, mcRows, Knum, Fnum, displacements, barStresses } = analysis;

  // Student inputs state
  const [mcInputs, setMcInputs] = useState<Record<string, string>>({});
  const [kInputs, setKInputs] = useState<Record<string, string>>({});
  const [uInputs, setUInputs] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState(false);
  const [revealedSteps, setRevealedSteps] = useState<Record<string, boolean>>({});

  const checkValue = (inputStr: string, expectedVal: number, tol = 0.02): boolean => {
    if (!inputStr || inputStr.trim() === '') return false;
    const clean = inputStr.replace(/,/g, '.').trim();
    // Support fractions like 2/15 or -5/24
    if (clean.includes('/')) {
      const parts = clean.split('/');
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (den !== 0 && !isNaN(num) && !isNaN(den)) {
        const val = num / den;
        return Math.abs(val - expectedVal) < Math.max(tol, Math.abs(expectedVal) * tol);
      }
    }
    const val = parseFloat(clean);
    if (isNaN(val)) return false;
    return Math.abs(val - expectedVal) < Math.max(tol, Math.abs(expectedVal) * tol);
  };

  const handleVerify = () => {
    setVerified(true);
  };

  const handleReset = () => {
    setMcInputs({});
    setKInputs({});
    setUInputs({});
    setVerified(false);
    setRevealedSteps({});
  };

  // Score calculation
  let totalQuestions = 0;
  let correctCount = 0;

  // 1. MC Table checking
  mcRows.forEach((row) => {
    row.dofs.forEach((expectedDof, dIdx) => {
      totalQuestions++;
      const val = parseInt(mcInputs[`${row.index}_${dIdx}`] || '', 10);
      if (verified && val === expectedDof) correctCount++;
    });
  });

  // 2. K Matrix checking (diagonal and upper terms)
  for (let r = 0; r < Math.min(nDof, 3); r++) {
    for (let c = r; c < Math.min(nDof, 3); c++) {
      totalQuestions++;
      const valStr = kInputs[`${r}_${c}`] || '';
      if (verified && checkValue(valStr, Knum[r][c])) correctCount++;
    }
  }

  // 3. Displacements checking
  if (displacements) {
    displacements.forEach((expectedU, idx) => {
      totalQuestions++;
      const valStr = uInputs[idx] || '';
      if (verified && checkValue(valStr, expectedU)) correctCount++;
    });
  }

  const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="p-6 bg-white min-h-full space-y-6 font-sans text-slate-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/40 text-blue-100 font-extrabold text-[11px] uppercase tracking-wider">
              Modo Estudo & Auto-Avaliação ESTG
            </span>
            <span className="text-xs text-blue-200">Tolerância aceitável: ±1% ou fração exata</span>
          </div>
          <h2 className="text-xl font-black mt-1">Preencha e Valide os Cálculos do Exercício</h2>
          <p className="text-xs text-blue-100 mt-0.5 max-w-xl">
            Teste os seus conhecimentos da Sebenta preenchendo a tabela m.c., matriz [K] e deslocamentos.
            O motor valida instantaneamente as suas respostas com feedback célula a célula.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {verified && (
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20">
              <Award className="w-5 h-5 text-amber-300" />
              <div>
                <div className="text-lg font-black leading-none">{scorePct}%</div>
                <div className="text-[10px] text-blue-100 font-bold">{correctCount}/{totalQuestions} corretos</div>
              </div>
            </div>
          )}
          <button
            onClick={handleVerify}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Verificar Respostas
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors"
            title="Limpar Respostas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. Preenchimento da Tabela m.c. */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
            Preencha os Graus de Liberdade na Matriz de Conectividade (m.c.)
          </h3>
          <button
            onClick={() => setRevealedSteps((s) => ({ ...s, mc: !s.mc }))}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" /> {revealedSteps.mc ? 'Ocultar Solução' : 'Revelar Solução'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 font-bold text-slate-700">
              <tr>
                <th className="py-2 px-3 text-left">Elemento</th>
                <th className="py-2 px-2">Nós</th>
                {mcRows[0]?.dofs.map((_, idx) => (
                  <th key={idx} className="py-2 px-2 font-mono">Slot GDL {idx + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mcRows.map((row) => (
                <tr key={row.index}>
                  <td className="py-2 px-3 text-left font-bold text-slate-800">
                    <CircledNumKaTeX n={row.index} /> {row.n1Label}{row.n2Label}
                  </td>
                  <td className="py-2 px-2 font-mono text-slate-600 font-bold">
                    {row.n1Label} → {row.n2Label}
                  </td>
                  {row.dofs.map((expectedDof, dIdx) => {
                    const key = `${row.index}_${dIdx}`;
                    const val = mcInputs[key] || '';
                    const isCorrect = verified && parseInt(val, 10) === expectedDof;
                    const isWrong = verified && parseInt(val, 10) !== expectedDof;

                    return (
                      <td key={dIdx} className="py-1.5 px-2">
                        <div className="relative inline-block w-14">
                          <input
                            type="number"
                            placeholder="0"
                            value={revealedSteps.mc ? expectedDof : val}
                            onChange={(e) =>
                              setMcInputs((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            disabled={revealedSteps.mc}
                            className={`w-full py-1 text-center font-mono font-bold rounded border text-xs transition-colors ${
                              revealedSteps.mc
                                ? 'bg-blue-50 border-blue-300 text-blue-800'
                                : isCorrect
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                : isWrong
                                ? 'bg-red-50 border-red-400 text-red-800 animate-shake'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Preenchimento da Matriz [K] */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
            Preencha os Coeficientes Principais da Matriz de Rigidez $[K]$
          </h3>
          <button
            onClick={() => setRevealedSteps((s) => ({ ...s, k: !s.k }))}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" /> {revealedSteps.k ? 'Ocultar Solução' : 'Revelar Solução'}
          </button>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
          <div className="text-xs font-bold text-slate-600 mb-3">
            Introduza os valores multiplicados pelo fator base (ex: EA/L, EI/L³ ou k):
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(nDof, 3)}, minmax(0, 1fr))` }}>
            {Array.from({ length: Math.min(nDof, 3) }).map((_, r) =>
              Array.from({ length: Math.min(nDof, 3) }).map((_, c) => {
                const key = `${r}_${c}`;
                const expectedVal = Knum[r][c];
                const val = kInputs[key] || '';
                const isCorrect = verified && checkValue(val, expectedVal);
                const isWrong = verified && !checkValue(val, expectedVal);

                return (
                  <div key={key} className="flex flex-col items-center">
                    <span className="text-[10px] font-mono text-slate-400 mb-0.5">K{r + 1}{c + 1}</span>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={revealedSteps.k ? fmtNum(expectedVal) : val}
                      onChange={(e) => setKInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                      disabled={revealedSteps.k}
                      className={`w-20 py-1 px-1.5 text-center font-mono font-bold rounded border text-xs transition-colors ${
                        revealedSteps.k
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : isCorrect
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                          : isWrong
                          ? 'bg-red-50 border-red-400 text-red-800'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Preenchimento dos Deslocamentos Nodais {u} */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
            Preencha os Deslocamentos Nodais Finais <KaTeXBlock math="\{u\}" />
          </h3>
          <button
            onClick={() => setRevealedSteps((s) => ({ ...s, u: !s.u }))}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" /> {revealedSteps.u ? 'Ocultar Solução' : 'Revelar Solução'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {displacements &&
            displacements.map((expectedU, idx) => {
              const val = uInputs[idx] || '';
              const isCorrect = verified && checkValue(val, expectedU);
              const isWrong = verified && !checkValue(val, expectedU);

              return (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-serif italic font-bold text-sm text-slate-800">
                    u<sub>{idx + 1}</sub> =
                  </span>
                  <div className="w-32">
                    <input
                      type="text"
                      placeholder="ex: 0.4645 ou 2/15"
                      value={revealedSteps.u ? fmtNum(expectedU) : val}
                      onChange={(e) => setUInputs((prev) => ({ ...prev, [idx]: e.target.value }))}
                      disabled={revealedSteps.u}
                      className={`w-full py-1 px-2 text-center font-mono font-bold rounded border text-xs transition-colors ${
                        revealedSteps.u
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : isCorrect
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                          : isWrong
                          ? 'bg-red-50 border-red-400 text-red-800'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
