// ============================================================================
// VIGA-BARRA 2D (PÓRTICOS 2D + POLINÓMIOS P(X) + MATRIZES 6x6)
// ============================================================================

import { ElemForceDetail, McRow } from '../types/fea';
import {
  cosd,
  detectLoadPowerL,
  fmtNum,
  integrateBeamShape,
  sind
} from './expr';

export interface VigaBarraElemStiffness {
  kAg: number[][]; // Termos multiplicados por EA/L
  kBg: number[][]; // Termos multiplicados por EI/L³
  keTotal: number[][];
  stepStrings: string[][];
  lPowMatrix: number[][];
}

const mul6 = (A6: number[][], B6: number[][]): number[][] => {
  const C6 = Array.from({ length: 6 }, () => Array(6).fill(0));
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      for (let k = 0; k < 6; k++) C6[r][c] += A6[r][k] * B6[k][c];
    }
  }
  return C6;
};

export function computeVigaBarra2dElementStiffness(
  row: McRow
): VigaBarraElemStiffness {
  const L = row.L || 1;
  const E = row.E || 1;
  const A = row.A || 1;
  const I = row.I || 1;
  const eaFactor = (E * A) / L;
  const eiFactor = (E * I) / (L * L * L);
  const c1 = cosd(row.th1);
  const s1 = sind(row.th1);
  const c2 = cosd(row.th2);
  const s2 = sind(row.th2);

  const kA = [
    [1, 0, 0, -1, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [-1, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0]
  ];

  const kB = [
    [0, 0, 0, 0, 0, 0],
    [0, 12, 6 * L, 0, -12, 6 * L],
    [0, 6 * L, 4 * L * L, 0, -6 * L, 2 * L * L],
    [0, 0, 0, 0, 0, 0],
    [0, -12, -6 * L, 0, 12, -6 * L],
    [0, 6 * L, 2 * L * L, 0, -6 * L, 4 * L * L]
  ];

  const R = [
    [c1, s1, 0, 0, 0, 0],
    [-s1, c1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, c2, s2, 0],
    [0, 0, 0, -s2, c2, 0],
    [0, 0, 0, 0, 0, 1]
  ];

  const Rt = R[0].map((_, c) => R.map((r) => r[c]));
  const kAg = mul6(Rt, mul6(kA, R));
  const kBg = mul6(Rt, mul6(kB, R));

  const keTotal: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
  const stepStrings: string[][] = Array.from({ length: 6 }, () => Array(6).fill(''));
  const lPowMatrix: number[][] = Array.from({ length: 6 }, () => Array(6).fill(3));

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const vA = eaFactor * kAg[i][j];
      const vB = eiFactor * kBg[i][j];
      keTotal[i][j] = vA + vB;

      const isRotI = i === 2 || i === 5;
      const isRotJ = j === 2 || j === 5;
      const lPow = isRotI && isRotJ ? 1 : isRotI || isRotJ ? 2 : 3;
      lPowMatrix[i][j] = lPow;

      const parts: string[] = [];
      if (Math.abs(vA) > 1e-10) parts.push(`${fmtNum(vA)}(EA/L)`);
      if (Math.abs(vB) > 1e-10) {
        const eiUnit = lPow === 1 ? 'EI/L' : lPow === 2 ? 'EI/L²' : 'EI/L³';
        parts.push(`${fmtNum(vB)}(${eiUnit})`);
      }
      stepStrings[i][j] = parts.join(' + ').replace(/\+ -/g, '- ');
    }
  }

  return { kAg, kBg, keTotal, stepStrings, lPowMatrix };
}

export function computeVigaBarra2dEquivalentLoads(
  row: McRow
): { fLocal: number[]; fGlobal: number[]; localPow: number[]; detail: ElemForceDetail } {
  const L = row.L || 1;
  const p0 = row.p0 || 0;
  const pL = row.pL || 0;
  const P1 = p0;
  const P2 = pL - p0;
  const hasCustom = Boolean(row.py && row.py.trim() !== '');

  let fLocal = [0, 0, 0, 0, 0, 0];
  let baseLPow = 0;

  if (hasCustom && row.py) {
    const { xPow, lPow } = detectLoadPowerL(row.py);
    baseLPow = xPow + lPow;
    fLocal = [
      0,
      integrateBeamShape(row.py, 2, L),
      integrateBeamShape(row.py, 3, L),
      0,
      integrateBeamShape(row.py, 5, L),
      integrateBeamShape(row.py, 6, L)
    ];
  } else {
    fLocal = [
      0,
      (L * (7 * p0 + 3 * pL)) / 20,
      (L * L * (3 * p0 + 2 * pL)) / 60,
      0,
      (L * (3 * p0 + 7 * pL)) / 20,
      -(L * L * (2 * p0 + 3 * pL)) / 60
    ];
  }

  const c1 = cosd(row.th1);
  const s1 = sind(row.th1);
  const c2 = cosd(row.th2);
  const s2 = sind(row.th2);
  const Rt = [
    [c1, -s1, 0, 0, 0, 0],
    [s1, c1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, c2, -s2, 0],
    [0, 0, 0, s2, c2, 0],
    [0, 0, 0, 0, 0, 1]
  ];

  const fGlobal = Array(6).fill(0);
  const localPow = [1 + baseLPow, 1 + baseLPow, 2 + baseLPow, 1 + baseLPow, 1 + baseLPow, 2 + baseLPow];

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const val = Rt[i][j] * fLocal[j];
      if (Math.abs(val) > 1e-10) {
        fGlobal[i] += val;
      }
    }
  }

  const detail: ElemForceDetail = {
    elem: row.index,
    L,
    th1: row.th1,
    th2: row.th2,
    p0,
    pL,
    P1,
    P2,
    py: row.py,
    hasCustom,
    fLocal,
    fGlobal,
    Rt,
    localPow,
    dofs: row.dofs
  };

  return { fLocal, fGlobal, localPow, detail };
}
