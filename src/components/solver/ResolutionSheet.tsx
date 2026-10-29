// ============================================================================
// RESOLUTION SHEET (FOLHA DE RESOLUÇÃO COMPLETA RENDERIZADA EM KATEX)
// ============================================================================

import React from 'react';
import {
  ActiveQuestions,
  FeaAnalysisResult,
  FeaPreset,
  ProblemConfig
} from '../../types/fea';
import { KaTeXBlock, CircledNumKaTeX } from './KaTeXBlock';
import { McTable } from './McTable';
import { fmtNum, fmtSymbolicL, getExactFraction } from '../../engine/expr';
import { interpolateBeamAt, findZeroRotationRoot } from '../../engine/viga';
import { computePotentialEnergyAnalysis } from '../../engine/mola';

interface ResolutionSheetProps {
  state: FeaPreset;
  analysis: FeaAnalysisResult;
  activeQuestions: ActiveQuestions;
  config: ProblemConfig;
}

export const ResolutionSheet: React.FC<ResolutionSheetProps> = ({
  state,
  analysis,
  activeQuestions,
  config
}) => {
  const { nDof, Knum, Fnum, FsymStrings, displacements, reactions, solveError, mcRows, kSteps } = analysis;
  const forceSym = state.forceSym || 'P';

  // Format KaTeX matrix string for [K]
  const formatKMatrixKaTeX = () => {
    if (nDof === 0) return '\\begin{bmatrix} 0 \\end{bmatrix}';
    let body = '';
    for (let r = 0; r < nDof; r++) {
      const rowTerms = [];
      for (let c = 0; c < nDof; c++) {
        const val = Knum[r][c];
        rowTerms.push(fmtNum(val));
      }
      body += rowTerms.join(' & ') + ' \\\\\n';
    }
    const factorStr =
      state.mode === 'Mola'
        ? 'k'
        : state.mode === 'Viga'
        ? '\\frac{EI}{L^3}'
        : state.mode === 'Barra2D'
        ? '\\frac{EA}{L}'
        : '';
    return `[K] = ${factorStr} \\begin{bmatrix} ${body} \\end{bmatrix}`;
  };

  // Format KaTeX vector string for {F}
  const formatFVectorKaTeX = () => {
    if (nDof === 0) return '\\{F\\} = \\begin{Bmatrix} 0 \\end{Bmatrix}';
    let body = '';
    for (let r = 0; r < nDof; r++) {
      body += `${FsymStrings[r] || '0'} \\\\\n`;
    }
    return `\\{F\\} = \\begin{Bmatrix} ${body} \\end{Bmatrix}`;
  };

  // Format KaTeX vector string for {u}
  const formatUVectorKaTeX = () => {
    if (!displacements || displacements.length === 0) return '\\{u\\} = \\text{Indefinido}';
    let body = '';
    for (let r = 0; r < nDof; r++) {
      const val = displacements[r];
      const frac = getExactFraction(val);
      const fracStr =
        frac.isExact && frac.den > 1
          ? `${frac.sign}\\frac{${frac.num}}{${frac.den}}`
          : fmtNum(val);
      const unit =
        state.mode === 'Mola'
          ? `\\frac{${forceSym}}{k}`
          : state.mode === 'Barra2D'
          ? `\\frac{${forceSym}L}{EA}`
          : state.mode === 'Viga'
          ? (analysis.dofInfo[r + 1]?.type === 'th' ? `\\frac{pL^3}{EI}` : `\\frac{pL^4}{EI}`)
          : '';
      body += `u_{${r + 1}} = ${fracStr} ${unit} \\\\\n`;
    }
    return `\\begin{cases} ${body} \\end{cases}`;
  };

  return (
    <div className="p-6 bg-white min-h-full space-y-7 font-sans text-slate-800">
      {/* Title Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-extrabold uppercase">
            {state.mode}
          </span>
          <span className="text-xs text-slate-500 font-bold">
            {nDof} Graus de Liberdade ({analysis.mcRows.length} Elementos)
          </span>
        </div>
        <h1 className="text-xl font-black text-slate-900 mt-1">{state.title}</h1>
        {state.description && (
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{state.description}</p>
        )}
      </div>

      {/* 1. TABELA DE CONECTIVIDADE (M.C.) */}
      {activeQuestions.mcTable && (
        <section>
          <McTable mode={state.mode} mcRows={mcRows} />
        </section>
      )}

      {/* 2. MATRIZ DE RIGIDEZ GLOBAL [K] */}
      {activeQuestions.stiffnessMatrix && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              K
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Matriz de Rigidez Global $[K]$
            </h3>
          </div>

          <p className="text-xs text-slate-600">
            Montagem por sobreposição direta das rigidezes elementares{' '}
            <KaTeXBlock math="K_{ij} = \sum_{e} k_{rs}^{(e)}" /> segundo a conectividade:
          </p>

          {/* Key Step-by-Step terms Kij */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {Object.keys(kSteps)
              .slice(0, 8)
              .map((key) => {
                const [rStr, cStr] = key.split(',');
                const r = parseInt(rStr, 10);
                const c = parseInt(cStr, 10);
                const step = kSteps[key];
                const symSum = step.syms.map((s) => `k_{${s.sub}}^{(${s.el})}`).join(' + ');
                const valSum = step.vals.join(' + ').replace(/\+ -/g, '- ');
                const totalVal = fmtNum(Knum[r - 1][c - 1]);
                return (
                  <div key={key} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
                    <KaTeXBlock
                      math={`K_{${r}${c}} = ${symSum} = ${valSum} = ${totalVal}`}
                    />
                  </div>
                );
              })}
          </div>

          {/* Matrix [K] in KaTeX */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex justify-center overflow-x-auto text-sm">
            <KaTeXBlock math={formatKMatrixKaTeX()} block />
          </div>
        </section>
      )}

      {/* 3. VETOR DE FORÇAS EQUIVALENTES {F} */}
      {activeQuestions.forceVector && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              F
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Vetor de Forças Equivalentes <KaTeXBlock math="\{F\}" />
            </h3>
          </div>

          <p className="text-xs text-slate-600">
            Cargas nodais diretas somadas aos vetores de forças equivalentes das cargas distribuídas{' '}
            <KaTeXBlock math="f_i^{(e)} = -\int_0^{L_e} p(x) N_i(x) \, dx" /> transformadas por{' '}
            <KaTeXBlock math="\{F^{(e)}\} = [R]^T \{f^{(e)}\}" />:
          </p>

          {/* Details for elements with distributed loads */}
          {analysis.elemForceDetails.length > 0 && (
            <div className="space-y-2">
              {analysis.elemForceDetails.map((efd, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <CircledNumKaTeX n={efd.elem} />
                    <span>Elemento {efd.elem} (L = {fmtSymbolicL(efd.L)})</span>
                  </div>
                  {efd.py ? (
                    <KaTeXBlock math={`p(x) = ${efd.py}`} block />
                  ) : (
                    <KaTeXBlock math={`p_0 = ${efd.p0}p, \\quad p_L = ${efd.pL}p`} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex justify-center overflow-x-auto text-sm">
            <KaTeXBlock math={formatFVectorKaTeX()} block />
          </div>
        </section>
      )}

      {/* 4. DESLOCAMENTOS NODAIS {u} */}
      {activeQuestions.displacements && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              u
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Deslocamentos Nodais Exatos <KaTeXBlock math="\{u\}" />
            </h3>
          </div>

          {solveError ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-700 font-bold text-xs">
              {solveError}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-emerald-950 font-serif text-sm">
              <p className="font-sans font-bold text-xs text-emerald-800 mb-2">
                Resolução do Sistema Linear <KaTeXBlock math="[K]\{u\} = \{F\}" />:
              </p>
              <div className="flex justify-center">
                <KaTeXBlock math={formatUVectorKaTeX()} block />
              </div>
            </div>
          )}
        </section>
      )}

      {/* 5. REAÇÕES DE APOIO */}
      {activeQuestions.reactions && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              R
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Reações de Apoio
            </h3>
          </div>

          {Object.keys(reactions).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(reactions).map(([cIdxStr, val]) => {
                const cIdx = parseInt(cIdxStr, 10);
                const dof = analysis.dofInfo[cIdx];
                const frac = getExactFraction(val);
                const fracStr =
                  frac.isExact && frac.den > 1
                    ? `${frac.sign}\\frac{${frac.num}}{${frac.den}}`
                    : fmtNum(val);
                return (
                  <div key={cIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800 mb-1">
                      Reação no apoio do Nó {dof?.nodeLabel} (GDL {cIdx}):
                    </p>
                    <KaTeXBlock
                      math={`R_{${dof?.nodeLabel}} = \\sum_{j} K_{${cIdx}j} u_j - F_{${cIdx}} = \\boxed{${fracStr} pL}`}
                      block
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Não existem graus de liberdade com restrição nula parametrizados para reação neste modelo.
            </p>
          )}
        </section>
      )}

      {/* 6. TENSÕES AXIAIS E ESFORÇOS NORMAIS (BARRA 2D) */}
      {activeQuestions.stresses && state.mode === 'Barra2D' && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              σ
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Tensão Axial $(\sigma)$ e Esforço Normal $(N)$ nas Barras
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2 px-3 text-left">Barra</th>
                  <th className="py-2 px-2">u₁ local</th>
                  <th className="py-2 px-2">u₂ local</th>
                  <th className="py-2 px-2">Alongamento δ</th>
                  <th className="py-2 px-3">Tensão σ (P/A)</th>
                  <th className="py-2 px-3">Esforço N (P)</th>
                  <th className="py-2 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {analysis.barStresses.map((b) => {
                  const isTens = b.N > 1e-4;
                  const isComp = b.N < -1e-4;
                  return (
                    <tr key={b.elem} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-left font-bold font-sans text-slate-800">
                        <CircledNumKaTeX n={b.elem} /> {b.label}
                      </td>
                      <td className="py-2 px-2 text-slate-600">{fmtNum(b.u1Local)}</td>
                      <td className="py-2 px-2 text-slate-600">{fmtNum(b.u2Local)}</td>
                      <td className="py-2 px-2 font-bold text-slate-800">{fmtNum(b.delta)}</td>
                      <td className="py-2 px-3 font-bold text-blue-700">{fmtNum(b.sigma)}</td>
                      <td className="py-2 px-3 font-bold text-indigo-700">{fmtNum(b.N)}</td>
                      <td className="py-2 px-3 font-sans font-extrabold text-[11px]">
                        {isTens ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Tração (+)
                          </span>
                        ) : isComp ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">
                            Compressão (-)
                          </span>
                        ) : (
                          <span className="text-slate-400">Nulo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7. ZONA CRÍTICA DA ESTRUTURA */}
      {activeQuestions.criticalZone && analysis.criticalBar && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center">
              !
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Zona Crítica da Estrutura <KaTeXBlock math="(|\sigma|_{\max})" />
            </h3>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-900">
                A barra crítica sujeita à maior solicitação é a{' '}
                <span className="underline font-black">
                  Barra {analysis.criticalBar.label} (Elemento {analysis.criticalBar.elem})
                </span>
                .
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Verificação de dimensionamento:{' '}
                <KaTeXBlock
                  math={`|\\sigma|_{\\max} = |${fmtNum(analysis.criticalBar.sigma)}| \\frac{${forceSym}}{A} \\le \\sigma_{\\text{adm}}`}
                />
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-amber-200 rounded-lg font-mono font-extrabold text-amber-900 text-sm">
                |σ| = {fmtNum(Math.abs(analysis.criticalBar.sigma))} {forceSym}/A
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 8. INTERPOLAÇÃO NUM PONTO X (VIGA / PÓRTICO) */}
      {activeQuestions.interpolation && state.mode === 'Viga' && mcRows[0] && displacements && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              x
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Interpolação de Deslocamentos, Rotação e Esforços num Ponto $x$
            </h3>
          </div>

          {(() => {
            const row = mcRows[0];
            const xVal = (state.targetXi || 0.5) * row.L;
            const interp = interpolateBeamAt(row, displacements, xVal);
            return (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="font-bold text-slate-800">
                  Avaliação no Elemento 1 em <KaTeXBlock math={`x = ${fmtNum(xVal)} = \\frac{L}{2}`} />:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-serif text-sm">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-[10px] font-sans font-bold text-slate-500 uppercase">Flecha v(x)</span>
                    <KaTeXBlock math={`v = ${fmtNum(interp.v)} \\frac{pL^4}{EI}`} />
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-[10px] font-sans font-bold text-slate-500 uppercase">Rotação θ(x)</span>
                    <KaTeXBlock math={`\\theta = ${fmtNum(interp.theta)} \\frac{pL^3}{EI}`} />
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-[10px] font-sans font-bold text-slate-500 uppercase">Momento M(x)</span>
                    <KaTeXBlock math={`M = ${fmtNum(interp.M)} pL^2`} />
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-[10px] font-sans font-bold text-slate-500 uppercase">Transverso V(x)</span>
                    <KaTeXBlock math={`V = ${fmtNum(interp.V)} pL`} />
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* 9. PONTOS CRÍTICOS / ZEROS DE ROTAÇÃO */}
      {activeQuestions.criticalPoints && state.mode === 'Viga' && mcRows[0] && displacements && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              0
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Pontos Críticos: Rotação Nula e Extremos
            </h3>
          </div>

          {(() => {
            const root = findZeroRotationRoot(mcRows[0], displacements);
            return (
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs">
                <p className="font-bold text-blue-900 mb-1">
                  Ponto de Rotação Nula <KaTeXBlock math="\theta(x) = \frac{dv}{dx} = 0" />:
                </p>
                <KaTeXBlock
                  math={`x_{\\text{zero}} = \\boxed{${root.xRatioStr}}`}
                  block
                />
              </div>
            );
          })()}
        </section>
      )}

      {/* 10. MODOS DE VIBRAÇÃO E FREQUÊNCIAS NATURAIS */}
      {activeQuestions.vibrations && analysis.vibration && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center">
              ω
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Modos de Vibração e Frequências Naturais
            </h3>
          </div>

          <p className="text-xs text-slate-600">
            Equação característica de autovalores{' '}
            <KaTeXBlock math="| [K] - \omega^2 [M] | = 0" /> utilizando a matriz de massa consistente:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {analysis.vibration.modes.map((m, idx) => (
              <div key={idx} className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 font-serif">
                <div className="font-sans font-bold text-purple-900 mb-1">
                  Modo {idx + 1} de Vibração:
                </div>
                <KaTeXBlock
                  math={`\\lambda_{${idx + 1}} = \\omega_{${idx + 1}}^2 = ${fmtNum(m.lam)} \\implies \\omega_{${idx + 1}} = ${fmtNum(m.omega)} \\frac{1}{L}\\sqrt{\\frac{E}{\\rho}}`}
                  block
                />
                <div className="mt-2 text-center">
                  <KaTeXBlock
                    math={`\\{u\}_{(${idx + 1})} = \\begin{Bmatrix} ${fmtNum(m.vec[0])} \\\\ ${fmtNum(m.vec[1])} \\end{Bmatrix}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 11. ENERGIA POTENCIAL MÍNIMA (MODO MOLA) */}
      {activeQuestions.potentialEnergy && state.mode === 'Mola' && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              Π
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Princípio da Energia Potencial Mínima
            </h3>
          </div>

          {(() => {
            const pot = computePotentialEnergyAnalysis(mcRows, displacements, Fnum, forceSym);
            if (!pot) return null;
            return (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3 font-serif">
                <KaTeXBlock math={pot.UeExprKaTeX} block />
                <KaTeXBlock math={pot.WExprKaTeX} block />
                <KaTeXBlock math={pot.PiExprKaTeX} block />
                <div className="pt-2 border-t border-slate-200">
                  <p className="font-sans font-bold text-xs text-slate-700 mb-1">
                    Condição de Estacionaridade:
                  </p>
                  {pot.derivativesKaTeX.map((dStr, idx) => (
                    <KaTeXBlock key={idx} math={dStr} block />
                  ))}
                </div>
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
};
