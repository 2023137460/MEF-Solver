// ============================================================================
// MC TABLE (TABELA DE CONECTIVIDADE ADAPTATIVA: 2, 4 OU 6 SLOTS)
// ============================================================================

import React from 'react';
import { FeaMode, McRow } from '../../types/fea';
import { detectStructureMode } from '../../engine/autoDetect';
import { fmtNum, fmtSymbolicL } from '../../engine/expr';
import { CircledNumKaTeX } from './KaTeXBlock';

interface McTableProps {
  mode: FeaMode;
  mcRows: McRow[];
}

export const McTable: React.FC<McTableProps> = ({ mode, mcRows }) => {
  const detection = detectStructureMode([], [], mode);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden mb-5">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <span>Matriz de Conectividade (m.c.)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
              {detection.dofSlotsPerElement} G.D.L. por Elemento
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{detection.explanation}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs border-collapse font-sans">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
              <th className="py-2.5 px-3 text-left">Elemento</th>
              <th className="py-2.5 px-2">Nós</th>
              {detection.columnHeaders.map((header, idx) => (
                <th key={idx} className="py-2.5 px-2 font-mono">
                  {header}
                </th>
              ))}
              <th className="py-2.5 px-3">Propriedades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mcRows.map((row) => {
              const propText =
                mode === 'Mola'
                  ? `k = ${fmtNum(row.k)}k`
                  : mode === 'Viga'
                  ? `${row.E !== 1 ? `${fmtNum(row.E)}E` : 'E'}, ${row.I !== 1 ? `${fmtNum(row.I)}I` : 'I'}`
                  : `${row.E !== 1 ? `${fmtNum(row.E)}E` : 'E'}, ${row.A !== 1 ? `${fmtNum(row.A)}A` : 'A'}`;

              return (
                <tr key={row.index} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2.5 px-3 text-left font-bold text-slate-800">
                    <CircledNumKaTeX n={row.index} /> Barra {row.n1Label}{row.n2Label}
                  </td>
                  <td className="py-2.5 px-2 font-mono font-bold text-slate-600">
                    {row.n1Label} → {row.n2Label}
                  </td>

                  {/* DOFs Slots */}
                  {row.dofs.map((gdl, dIdx) => (
                    <td key={dIdx} className="py-2.5 px-2 font-mono font-bold">
                      {gdl > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 font-extrabold text-xs">
                          {gdl}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </td>
                  ))}

                  {/* Extra geometric columns: Angles θ1, θ2, Length L */}
                  {mode === 'Barra2D' && (
                    <>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-700">
                        {fmtNum(row.th1, 1)}°
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-700">
                        {fmtNum(row.th2, 1)}°
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-blue-700">
                        {fmtSymbolicL(row.L)}
                      </td>
                    </>
                  )}

                  {mode === 'Viga' && (
                    <td className="py-2.5 px-2 font-mono font-bold text-blue-700">
                      {fmtSymbolicL(row.L)}
                    </td>
                  )}

                  {mode === 'VigaBarra2D' && (
                    <>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-700">
                        {fmtNum(row.th1, 1)}°
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-700">
                        {fmtNum(row.th2, 1)}°
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-blue-700">
                        {fmtSymbolicL(row.L)}
                      </td>
                    </>
                  )}

                  <td className="py-2.5 px-3 font-serif font-bold text-slate-600 text-xs">
                    {propText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
