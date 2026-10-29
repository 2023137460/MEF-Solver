// ============================================================================
// BARRA 2D (TRELIÇAS 2D + APOIO ROLANTE INCLINADO + VIBRAÇÃO)
// ============================================================================

import { BarStressResult, FeaNode, McRow, VibrationMode, VibrationResult } from '../types/fea';
import { cosd, fmtNum, fmtSymbolicL, sind } from './expr';

export interface Barra2dElemStiffness {
  ke: number[][];
  valStepStrings: string[][];
}

export function computeBarra2dElementStiffness(
  row: McRow
): Barra2dElemStiffness {
  const L = row.L || 1;
  const E = row.E || 1;
  const A = row.A || 1;
  const c1 = cosd(row.th1);
  const s1 = sind(row.th1);
  const c2 = cosd(row.th2);
  const s2 = sind(row.th2);
  const v = [c1, s1, -c2, -s2];
  const factor = (E * A) / L;
  const eaPrefix = `${E * A === 1 ? 'EA' : `${fmtNum(E * A)}EA`}/${fmtSymbolicL(L)}`;

  const trigNames = [
    `cos(${fmtNum(row.th1)}°)`,
    `sin(${fmtNum(row.th1)}°)`,
    `-cos(${fmtNum(row.th2)}°)`,
    `-sin(${fmtNum(row.th2)}°)`
  ];

  const ke: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0));
  const valStepStrings: string[][] = Array.from({ length: 4 }, () => Array(4).fill(''));

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      ke[i][j] = factor * v[i] * v[j];
      if (i === j) {
        const baseT = i % 2 === 0 ? 'cos²' : 'sin²';
        const ang = i < 2 ? row.th1 : row.th2;
        valStepStrings[i][j] = `${eaPrefix}·${baseT}(${fmtNum(ang)}°)`;
      } else {
        valStepStrings[i][j] = `${eaPrefix}·(${trigNames[i]}·${trigNames[j]})`;
      }
    }
  }

  return { ke, valStepStrings };
}

export function computeBarra2dStresses(
  mcRows: McRow[],
  displacements: number[] | null
): { barStresses: BarStressResult[]; criticalBar: BarStressResult | null } {
  const barStresses: BarStressResult[] = [];
  let criticalBar: BarStressResult | null = null;

  if (!displacements) return { barStresses, criticalBar };

  mcRows.forEach((row) => {
    const c1 = cosd(row.th1);
    const s1 = sind(row.th1);
    const c2 = cosd(row.th2);
    const s2 = sind(row.th2);
    const U = row.dofs.map((d) => (d > 0 ? displacements[d - 1] : 0));
    const u1Local = c1 * U[0] + s1 * U[1];
    const u2Local = c2 * U[2] + s2 * U[3];
    const delta = u2Local - u1Local;
    const sigma = (row.E / row.L) * delta;
    const N = sigma * row.A;
    const item: BarStressResult = {
      elem: row.index,
      label: `${row.n1Label}${row.n2Label}`,
      th1: row.th1,
      th2: row.th2,
      L: row.L,
      E: row.E,
      A: row.A,
      dofs: row.dofs,
      U,
      u1Local,
      u2Local,
      delta,
      sigma,
      N
    };
    barStresses.push(item);
    if (!criticalBar || Math.abs(sigma) > Math.abs(criticalBar.sigma)) {
      criticalBar = item;
    }
  });

  return { barStresses, criticalBar };
}

export function computeBarra2dVibrations(
  mcRows: McRow[],
  nDof: number,
  Knum: number[][]
): VibrationResult | null {
  if (nDof < 1 || nDof > 3) return null;

  const Mnum: number[][] = Array.from({ length: nDof }, () => Array(nDof).fill(0));
  const mSteps: Record<string, { syms: Array<{ sub: string; el: number }>; vals: string[] }> = {};

  mcRows.forEach((row) => {
    const e = row.index;
    const L = row.L || 1;
    const A = row.A || 1;
    const fM = (A * L) / 420;
    const c1 = cosd(row.th1);
    const s1 = sind(row.th1);
    const c2 = cosd(row.th2);
    const s2 = sind(row.th2);
    const v1 = [c1, s1];
    const v2 = [c2, s2];
    const me = [
      [140 * fM * v1[0] * v1[0], 140 * fM * v1[0] * v1[1], 70 * fM * v1[0] * v2[0], 70 * fM * v1[0] * v2[1]],
      [140 * fM * v1[1] * v1[0], 140 * fM * v1[1] * v1[1], 70 * fM * v1[1] * v2[0], 70 * fM * v1[1] * v2[1]],
      [70 * fM * v2[0] * v1[0], 70 * fM * v2[0] * v1[1], 140 * fM * v2[0] * v2[0], 140 * fM * v2[0] * v2[1]],
      [70 * fM * v2[1] * v1[0], 70 * fM * v2[1] * v1[1], 140 * fM * v2[1] * v2[0], 140 * fM * v2[1] * v2[1]]
    ];
    for (let i = 0; i < 4; i++) {
      const gi = row.dofs[i];
      if (!gi) continue;
      for (let j = 0; j < 4; j++) {
        const gj = row.dofs[j];
        if (!gj) continue;
        Mnum[gi - 1][gj - 1] += me[i][j];
        const key = `${gi},${gj}`;
        if (!mSteps[key]) mSteps[key] = { syms: [], vals: [] };
        mSteps[key].syms.push({ sub: `${i + 1}${j + 1}`, el: e });
        const ang = i < 2 ? row.th1 : row.th2;
        const trigPart =
          i === j
            ? i % 2 === 0
              ? `cos²(${fmtNum(ang)}°)`
              : `sin²(${fmtNum(ang)}°)`
            : `sin(${fmtNum(ang)}°)cos(${fmtNum(ang)}°)`;
        mSteps[key].vals.push(`(ρA·${fmtSymbolicL(L)}/420)·140·${trigPart}`);
      }
    }
  });

  if (nDof === 2) {
    const K11 = Knum[0][0],
      K12 = Knum[0][1],
      K22 = Knum[1][1];
    const M11 = Mnum[0][0],
      M12 = Mnum[0][1],
      M22 = Mnum[1][1];
    const a = M11 * M22 - M12 * M12;
    const b = -(K11 * M22 + K22 * M11 - 2 * K12 * M12);
    const c = K11 * K22 - K12 * K12;
    const disc = Math.max(0, b * b - 4 * a * c);
    if (Math.abs(a) > 1e-11) {
      const l1 = (-b - Math.sqrt(disc)) / (2 * a);
      const l2 = (-b + Math.sqrt(disc)) / (2 * a);
      const lambdas = [l1, l2].filter((v) => v > 0).sort((x, y) => x - y);
      const modes: VibrationMode[] = lambdas.map((lam) => {
        const A00 = K11 - lam * M11;
        const A01 = K12 - lam * M12;
        const A10 = K12 - lam * M12;
        const A11 = K22 - lam * M22;
        let vec = [1, 0];
        if (Math.abs(A00) < 1e-3 && Math.abs(A01) < 1e-3 && Math.abs(A11) > 1e-3) {
          vec = [1, 0];
        } else if (Math.abs(A11) < 1e-3 && Math.abs(A01) < 1e-3 && Math.abs(A00) > 1e-3) {
          vec = [0, 1];
        } else if (Math.abs(A00) >= Math.abs(A01) && Math.abs(A00) > 1e-5) {
          vec = [-A01 / A00, 1];
        } else if (Math.abs(A11) > 1e-5) {
          vec = [1, -A10 / A11];
        }
        return {
          lam,
          omega: Math.sqrt(lam),
          A: [
            [A00, A01],
            [A10, A11]
          ],
          vec
        };
      });
      return { Mnum, mSteps, quad: { a, b, c }, modes };
    }
  }

  return null;
}
