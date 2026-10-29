// ============================================================================
// RESOLUTION SHEET (FOLHA DE RESOLUÇÃO COMPLETA RENDERIZADA EM KATEX)
// ============================================================================

import React, { useState } from 'react';
import { Printer, Sparkles, Sliders, CheckCircle2 } from 'lucide-react';
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
import { getTranslation, SupportedLang } from '../../utils/i18n';

interface ResolutionSheetProps {
  state: FeaPreset;
  analysis: FeaAnalysisResult;
  activeQuestions: ActiveQuestions;
  config: ProblemConfig;
  lang?: SupportedLang;
}

export const ResolutionSheet: React.FC<ResolutionSheetProps> = ({
  state,
  analysis,
  activeQuestions,
  config,
  lang = 'pt'
}) => {
  const t = getTranslation(lang);
  const { nDof, Knum, Fnum, FsymStrings, displacements, reactions, solveError, mcRows, kSteps } = analysis;
  const forceSym = state.forceSym || 'P';

  // Dynamic interpolation state
  const [selectedInterpElem, setSelectedInterpElem] = useState<number>(state.targetBar || 1);
  const [interpXi, setInterpXi] = useState<number>(state.targetXi || 0.5);
  const [fiberYMax, setFiberYMax] = useState<number>(0.1);

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
      analysis.unifiedEABase
        ? '\\frac{EA}{L}'
        : state.mode === 'Mola'
        ? 'k'
        : state.mode === 'Viga'
        ? '\\frac{EI}{L^3}'
        : state.mode === 'Barra2D'
        ? '\\frac{EA}{L}'
        : state.mode === 'VigaBarra2D'
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
          : state.mode === 'VigaBarra2D'
          ? (analysis.dofInfo[r + 1]?.type === 'th' ? `\\frac{PL^2}{EI}` : `\\frac{PL}{EA}`)
          : '';
      body += `u_{${r + 1}} = ${fracStr} ${unit} \\\\\n`;
    }
    return `\\begin{cases} ${body} \\end{cases}`;
  };

  const selectedRow = mcRows.find((r) => r.index === selectedInterpElem) || mcRows[0];

  return (
    <div className="p-6 bg-white min-h-full space-y-7 font-sans text-slate-800 print:p-0 print:space-y-5">
      {/* 0. CABEÇALHO OFICIAL DE EXAME / A4 PRINT HEADER */}
      <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/80 space-y-3 print:border-black print:bg-white print:p-2 print:rounded-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 print:border-black pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white font-black flex items-center justify-center text-sm print:border print:border-black print:bg-white print:text-black">
              ESTG
            </div>
            <div>
              <h2 className="text-xs font-black tracking-wide text-slate-900 uppercase">
                {t.examHeaderInstitution}
              </h2>
              <p className="text-[11px] font-bold text-slate-600 print:text-black">
                {t.examHeaderDepartment}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              title={t.printExam}
            >
              <Printer className="w-3.5 h-3.5" /> {t.printExam}
            </button>
          </div>
        </div>

        {/* Student metadata fields (Exam Sheet lines) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-white print:bg-transparent p-2 rounded border border-slate-200 print:border-black">
            <span className="block text-[10px] font-sans font-bold text-slate-500 print:text-black uppercase">
              {t.studentName}
            </span>
            <span className="text-slate-800 font-bold">____________________</span>
          </div>
          <div className="bg-white print:bg-transparent p-2 rounded border border-slate-200 print:border-black">
            <span className="block text-[10px] font-sans font-bold text-slate-500 print:text-black uppercase">
              {t.studentNumber}
            </span>
            <span className="text-slate-800 font-bold">__________</span>
          </div>
          <div className="bg-white print:bg-transparent p-2 rounded border border-slate-200 print:border-black">
            <span className="block text-[10px] font-sans font-bold text-slate-500 print:text-black uppercase">
              {t.classGroup}
            </span>
            <span className="text-slate-800 font-bold">MEC-MEF</span>
          </div>
          <div className="bg-white print:bg-transparent p-2 rounded border border-slate-200 print:border-black">
            <span className="block text-[10px] font-sans font-bold text-slate-500 print:text-black uppercase">
              {t.date}
            </span>
            <span className="text-slate-800 font-bold">
              {new Date().toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-US')}
            </span>
          </div>
        </div>

        {/* Exercise Header */}
        <div className="pt-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 font-extrabold uppercase print:border print:border-black print:bg-white print:text-black">
              {state.mode}
            </span>
            <h1 className="text-sm sm:text-base font-black text-slate-900">
              {state.title}
            </h1>
          </div>
          <span className="text-xs text-slate-500 print:text-black font-bold">
            {nDof} {t.dofsCount} • {analysis.mcRows.length} {t.elementsCount}
          </span>
        </div>
        {state.description && (
          <p className="text-xs text-slate-600 print:text-black mt-1 leading-relaxed border-t border-slate-200 print:border-black pt-1.5">
            {state.description}
          </p>
        )}
      </div>

      {/* 1. TABELA DE CONECTIVIDADE (M.C.) */}
      {activeQuestions.mcTable && (
        <section className="print:page-break-inside-avoid">
          <McTable mode={state.mode} mcRows={mcRows} />
        </section>
      )}

      {/* 2. MATRIZ DE RIGIDEZ GLOBAL [K] */}
      {activeQuestions.stiffnessMatrix && (
        <section className="space-y-3 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              K
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.stiffnessMatrix}
            </h3>
          </div>

          {analysis.unifiedEABase && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t.unifiedStiffnessTitle}</span>
              </div>
              <p className="text-[11px] text-indigo-700">
                {t.unifiedStiffnessDesc} <KaTeXBlock math={`I = ${config.inertiaN} A L^2 \\implies \\frac{EI}{L^3} = ${config.inertiaN} \\frac{EA}{L}`} />
              </p>
            </div>
          )}

          <p className="text-xs text-slate-600">
            {t.globalStiffnessAssembled}{' '}
            <KaTeXBlock math="K_{ij} = \sum_{e} k_{rs}^{(e)}" />
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
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex justify-center overflow-x-auto text-sm print:bg-white print:border-black">
            <KaTeXBlock math={formatKMatrixKaTeX()} block />
          </div>
        </section>
      )}

      {/* 3. VETOR DE FORÇAS EQUIVALENTES {F} */}
      {activeQuestions.forceVector && (
        <section className="space-y-3 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              F
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.forceVector} <KaTeXBlock math="\{F\}" />
            </h3>
          </div>

          <p className="text-xs text-slate-600">
            {t.globalForceAssembled}{' '}
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

          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex justify-center overflow-x-auto text-sm print:bg-white print:border-black">
            <KaTeXBlock math={formatFVectorKaTeX()} block />
          </div>
        </section>
      )}

      {/* 4. DESLOCAMENTOS NODAIS {u} */}
      {activeQuestions.displacements && (
        <section className="space-y-3 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              u
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.displacements} <KaTeXBlock math="\{u\}" />
            </h3>
          </div>

          {solveError ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-700 font-bold text-xs">
              {solveError}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-emerald-950 font-serif text-sm print:bg-white print:border-black">
              <p className="font-sans font-bold text-xs text-emerald-800 mb-2">
                {t.equilibriumSystem} <KaTeXBlock math="[K]\{u\} = \{F\}" />:
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
        <section className="space-y-3 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              R
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.reactions}
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
                      {t.reactionsCalculated} Nó {dof?.nodeLabel} (GDL {cIdx}):
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
        <section className="space-y-3 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              σ
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.stresses}
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
        <section className="space-y-2 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center">
              !
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.criticalZone} <KaTeXBlock math="(|\sigma|_{\max})" />
            </h3>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-900">
                {t.criticalBarText}{' '}
                <span className="underline font-black">
                  Barra {analysis.criticalBar.label} (Elemento {analysis.criticalBar.elem})
                </span>
                .
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {t.criticalBarVerify}{' '}
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
      {activeQuestions.interpolation && (state.mode === 'Viga' || state.mode === 'VigaBarra2D') && mcRows.length > 0 && displacements && (
        <section className="space-y-3 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              x
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.interpolationTitle}
            </h3>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">{t.selectElementToInterpolate}</span>
                <div className="flex items-center gap-1">
                  {mcRows.map((row) => (
                    <button
                      key={row.index}
                      onClick={() => setSelectedInterpElem(row.index)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        selectedInterpElem === row.index
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-200 border border-slate-300 text-slate-700'
                      }`}
                    >
                      {t.element} {row.index} ({row.n1Label}{row.n2Label})
                    </button>
                  ))}
                </div>
              </div>

              {/* Fiber Max Distance ymax input */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600 text-[11px]">{t.fiberHeight}</span>
                <input
                  type="number"
                  step="0.01"
                  value={fiberYMax}
                  onChange={(e) => setFiberYMax(parseFloat(e.target.value) || 0.05)}
                  className="w-20 px-2 py-0.5 border border-slate-300 rounded font-mono font-bold bg-white text-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Position Xi slider and quick buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">{t.positionX}</span>
                <span className="font-mono font-extrabold text-blue-700 text-xs">
                  ξ = x/L = {fmtNum(interpXi, 2)} (x = {fmtNum(interpXi * (selectedRow?.L || 1), 3)}L)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={interpXi}
                  onChange={(e) => setInterpXi(parseFloat(e.target.value))}
                  className="flex-1 cursor-pointer accent-blue-600"
                />
                <div className="flex items-center gap-1">
                  {[
                    { label: '0', val: 0 },
                    { label: 'L/4', val: 0.25 },
                    { label: 'L/2', val: 0.5 },
                    { label: '3L/4', val: 0.75 },
                    { label: 'L', val: 1.0 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setInterpXi(preset.val)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                        Math.abs(interpXi - preset.val) < 1e-4
                          ? 'bg-blue-100 border-blue-400 text-blue-800'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Evaluated Interpolation Results */}
            {selectedRow && (() => {
              const xVal = interpXi * selectedRow.L;
              const interp = interpolateBeamAt(selectedRow, displacements, xVal);
              const normalBendingSigma = Math.abs(interp.M) * fiberYMax;
              return (
                <div className="pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 font-serif text-sm">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="block text-[10px] font-sans font-bold text-slate-500 uppercase">Flecha v(x)</span>
                      <KaTeXBlock math={`v = ${fmtNum(interp.v)} \\frac{pL^4}{EI}`} />
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="block text-[10px] font-sans font-bold text-slate-500 uppercase">Rotação θ(x)</span>
                      <KaTeXBlock math={`\\theta = ${fmtNum(interp.theta)} \\frac{pL^3}{EI}`} />
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="block text-[10px] font-sans font-bold text-slate-500 uppercase">Momento M(x)</span>
                      <KaTeXBlock math={`M = ${fmtNum(interp.M)} pL^2`} />
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="block text-[10px] font-sans font-bold text-slate-500 uppercase">Transverso V(x)</span>
                      <KaTeXBlock math={`V = ${fmtNum(interp.V)} pL`} />
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-center">
                      <span className="block text-[10px] font-sans font-bold text-amber-800 uppercase">{t.bendingStress}</span>
                      <KaTeXBlock math={`\\sigma = ${fmtNum(normalBendingSigma)} \\frac{pL^2 y_{\\max}}{I}`} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* 9. PONTOS CRÍTICOS / ZEROS DE ROTAÇÃO */}
      {activeQuestions.criticalPoints && state.mode === 'Viga' && mcRows[0] && displacements && (
        <section className="space-y-3 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              0
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.zeroRotationPoint}
            </h3>
          </div>

          {(() => {
            const root = findZeroRotationRoot(mcRows[0], displacements);
            return (
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs">
                <p className="font-bold text-blue-900 mb-1">
                  {t.zeroRotationFound} <KaTeXBlock math="\theta(x) = \frac{dv}{dx} = 0" />:
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
        <section className="space-y-3 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center">
              ω
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.vibrations}
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
        <section className="space-y-3 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
              Π
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t.potentialEnergy}
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

      {/* 12. SUBSTITUIÇÃO NUMÉRICA DOS PARÂMETROS (HYBRID NUMERICAL EVALUATION) */}
      {analysis.isHybridNumeric && (
        <section className="space-y-4 pt-2 print:page-break-inside-avoid">
          <div className="flex items-center gap-2 border-b border-indigo-200 pb-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
              #
            </span>
            <div>
              <h3 className="font-extrabold text-indigo-950 text-sm">
                {t.hybridResultsTitle}
              </h3>
              <p className="text-[11px] text-indigo-700">
                {t.hybridResultsSub}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50/60 to-slate-50 rounded-2xl border border-indigo-200 p-4 space-y-4 shadow-xs print:bg-white print:border-black">
            {/* Properties Inputs Summary */}
            <div>
              <span className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wide mb-1.5">
                {t.inputProperties}:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono font-bold">
                {config.variables.E && (
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-sans text-slate-500 block">E</span>
                    {fmtNum(config.variables.E)} Pa
                  </div>
                )}
                {config.variables.A && (
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-sans text-slate-500 block">A</span>
                    {fmtNum(config.variables.A)} m²
                  </div>
                )}
                {config.variables.I && (
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-sans text-slate-500 block">I</span>
                    {fmtNum(config.variables.I)} m⁴
                  </div>
                )}
                {config.variables.L && (
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-sans text-slate-500 block">L</span>
                    {fmtNum(config.variables.L)} m
                  </div>
                )}
                {config.variables.P && (
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-sans text-slate-500 block">P</span>
                    {fmtNum(config.variables.P)} N
                  </div>
                )}
                {config.variables.k && (
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-sans text-slate-500 block">k</span>
                    {fmtNum(config.variables.k)} N/m
                  </div>
                )}
              </div>
            </div>

            {/* Evaluated Displacements with Real Units */}
            {analysis.numericDisplacements && (
              <div>
                <span className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wide mb-1.5">
                  {t.evaluatedDisplacements}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {analysis.numericDisplacements.map((uVal, idx) => {
                    const dof = analysis.dofInfo[idx + 1];
                    const unit = analysis.numericUnits[idx] || 'm';
                    const isRot = dof?.type === 'th';
                    return (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-indigo-100 font-mono">
                        <div className="flex items-center justify-between font-sans text-[11px] text-slate-500 font-bold mb-1">
                          <span>GDL u{idx + 1} (Nó {dof?.nodeLabel})</span>
                          <span className="text-indigo-600">{isRot ? 'Rotação' : 'Translação'}</span>
                        </div>
                        <div className="text-sm font-black text-slate-900">
                          {fmtNum(uVal, 5)} {unit}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isRot
                            ? `≈ ${fmtNum((uVal * 180) / Math.PI, 3)}°`
                            : `≈ ${fmtNum(uVal * 1000, 3)} mm`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evaluated Bar Stresses and Forces */}
            {analysis.numericStresses && analysis.numericStresses.length > 0 && (
              <div>
                <span className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wide mb-1.5">
                  {t.evaluatedStresses}:
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border border-indigo-100 rounded-lg overflow-hidden bg-white">
                    <thead className="bg-indigo-50/70 text-indigo-900 font-bold border-b border-indigo-100">
                      <tr>
                        <th className="py-2 px-3 text-left">Barra</th>
                        <th className="py-2 px-3">Tensão σ (Pa)</th>
                        <th className="py-2 px-3">Tensão σ (MPa)</th>
                        <th className="py-2 px-3">Esforço Normal N (N)</th>
                        <th className="py-2 px-3">Esforço Normal N (kN)</th>
                        <th className="py-2 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50 font-mono">
                      {analysis.numericStresses.map((b) => (
                        <tr key={b.elem} className="hover:bg-indigo-50/30">
                          <td className="py-1.5 px-3 text-left font-sans font-bold text-slate-800">
                            Barra {b.label}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{fmtNum(b.sigmaNum, 2)}</td>
                          <td className="py-1.5 px-3 font-black text-blue-700">{fmtNum(b.sigmaNum / 1e6, 3)}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{fmtNum(b.NNum, 2)}</td>
                          <td className="py-1.5 px-3 font-black text-indigo-700">{fmtNum(b.NNum / 1e3, 3)}</td>
                          <td className="py-1.5 px-3 font-sans font-extrabold text-[11px]">
                            {b.NNum > 1e-4 ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Tração (+)</span>
                            ) : b.NNum < -1e-4 ? (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">Compressão (-)</span>
                            ) : (
                              <span className="text-slate-400">Nulo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Evaluated Reactions */}
            {analysis.numericReactions && Object.keys(analysis.numericReactions).length > 0 && (
              <div>
                <span className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wide mb-1.5">
                  {t.evaluatedReactions}:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {Object.entries(analysis.numericReactions).map(([cIdxStr, rVal]) => {
                    const cIdx = parseInt(cIdxStr, 10);
                    const dof = analysis.dofInfo[cIdx];
                    return (
                      <div key={cIdx} className="p-2.5 bg-white rounded-lg border border-indigo-100">
                        <span className="block font-sans text-[10px] text-slate-500 font-bold">
                          R no Nó {dof?.nodeLabel} (GDL {cIdx})
                        </span>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">
                          {fmtNum(rVal, 2)} N
                        </div>
                        <div className="text-[10px] text-indigo-700 font-bold">
                          ≈ {fmtNum(rVal / 1000, 3)} kN
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evaluated Vibration Modes & Frequencies */}
            {analysis.numericVibrations && analysis.numericVibrations.length > 0 && (
              <div>
                <span className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wide mb-1.5">
                  {t.evaluatedFrequencies}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {analysis.numericVibrations.map((vib, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
                      <div className="font-sans font-bold text-purple-900">
                        Modo {idx + 1} de Vibração
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{t.naturalFrequency} ω:</span>
                        <span className="font-bold text-slate-900">{fmtNum(vib.omegaNum, 2)} rad/s</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{t.cyclicFrequency} f:</span>
                        <span className="font-bold text-purple-700">{fmtNum(vib.fNumHz, 2)} Hz</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{t.vibrationPeriod} T:</span>
                        <span className="font-bold text-slate-900">{fmtNum((1 / vib.fNumHz) * 1000, 2)} ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
