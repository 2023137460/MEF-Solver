// ============================================================================
// MOLA (SISTEMAS DE MOLAS + PRINCÍPIO DA ENERGIA POTENCIAL MÍNIMA)
// ============================================================================

import { McRow } from '../types/fea';

export interface MolaElemStiffness {
  ke: number[][];
  valStepStrings: string[][];
}

export function computeMolaElementStiffness(row: McRow): MolaElemStiffness {
  const kVal = row.k || 1;
  const ke = [
    [kVal, -kVal],
    [-kVal, kVal]
  ];
  const valStepStrings = [
    [`${kVal}k`, `-${kVal}k`],
    [`-${kVal}k`, `${kVal}k`]
  ];
  return { ke, valStepStrings };
}

export interface PotentialEnergyStep {
  UeExprKaTeX: string;
  WExprKaTeX: string;
  PiExprKaTeX: string;
  derivativesKaTeX: string[];
  springForces: Array<{ elem: number; k: number; delta: number; force: number; forceStr: string }>;
}

export function computePotentialEnergyAnalysis(
  mcRows: McRow[],
  displacements: number[] | null,
  Fnum: number[],
  forceSym = 'mg'
): PotentialEnergyStep | null {
  if (!displacements || displacements.length === 0) return null;

  const springForces = mcRows.map((row) => {
    const d1 = row.dofs[0];
    const d2 = row.dofs[1];
    const u1 = d1 > 0 ? displacements[d1 - 1] : 0;
    const u2 = d2 > 0 ? displacements[d2 - 1] : 0;
    const delta = u2 - u1;
    const k = row.k || 1;
    const force = k * delta;
    return {
      elem: row.index,
      k,
      delta,
      force,
      forceStr: `${force === 1 ? '' : force === -1 ? '-' : force} ${forceSym}`
    };
  });

  const uTerms = mcRows
    .map((r, i) => {
      const k = r.k || 1;
      const d1 = r.dofs[0] ? `u_{${r.dofs[0]}}` : '0';
      const d2 = r.dofs[1] ? `u_{${r.dofs[1]}}` : '0';
      return `\\frac{1}{2}(${k}k)(${d2} - ${d1})^2`;
    })
    .join(' + ');

  const wTerms = Fnum
    .map((f, i) => {
      if (Math.abs(f) < 1e-9) return null;
      const fStr = f === 1 ? forceSym : `${f}${forceSym}`;
      return `(${fStr}) \\cdot u_{${i + 1}}`;
    })
    .filter(Boolean)
    .join(' + ');

  const derivativesKaTeX = displacements.map((_, i) => {
    return `\\frac{\\partial \\Pi}{\\partial u_{${i + 1}}} = 0 \\implies K_{${i + 1}} \\{u\\} = F_{${i + 1}}`;
  });

  return {
    UeExprKaTeX: `U_e = ${uTerms}`,
    WExprKaTeX: `W = ${wTerms || '0'}`,
    PiExprKaTeX: `\\Pi = U_e - W`,
    derivativesKaTeX,
    springForces
  };
}
