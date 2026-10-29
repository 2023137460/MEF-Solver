// ============================================================================
// VIGA (EULER-BERNOULLI BEAMS + SIMETRIA + REAÇÕES + INTERPOLAÇÃO + VIBRAÇÃO)
// ============================================================================

import { ElemForceDetail, McRow, VibrationMode, VibrationResult } from '../types/fea';
import { fmtNum, fmtSymbolicL, integrateBeamShape } from './expr';

export interface VigaElemStiffness {
  ke: number[][];
  formulaMat: string[][];
}

export function computeVigaElementStiffness(
  row: McRow
): VigaElemStiffness {
  const L = row.L || 1;
  const E = row.E || 1;
  const I = row.I || 1;
  const factor = (E * I) / (L * L * L);

  const ke = [
    [12, 6 * L, -12, 6 * L],
    [6 * L, 4 * L * L, -6 * L, 2 * L * L],
    [-12, -6 * L, 12, -6 * L],
    [6 * L, 2 * L * L, -6 * L, 4 * L * L]
  ].map((rowArr) => rowArr.map((v) => factor * v));

  const Lsym = fmtSymbolicL(L);
  const formulaMat = [
    [`12`, `6(${Lsym})`, `-12`, `6(${Lsym})`],
    [`6(${Lsym})`, `4(${Lsym})²`, `-6(${Lsym})`, `2(${Lsym})²`],
    [`-12`, `-6(${Lsym})`, `12`, `-6(${Lsym})`],
    [`6(${Lsym})`, `2(${Lsym})²`, `-6(${Lsym})`, `4(${Lsym})²`]
  ];

  return { ke, formulaMat };
}

export function computeVigaEquivalentLoads(
  row: McRow
): { fLocal: number[]; detail: ElemForceDetail } {
  const L = row.L || 1;
  const p0 = row.p0 || 0;
  const pL = row.pL || 0;
  const hasCustom = Boolean(row.py && row.py.trim() !== '');
  const P1 = p0;
  const P2 = pL - p0;
  let fLocal = [0, 0, 0, 0];

  if (hasCustom && row.py) {
    fLocal = [
      integrateBeamShape(row.py, 2, L),
      integrateBeamShape(row.py, 3, L),
      integrateBeamShape(row.py, 5, L),
      integrateBeamShape(row.py, 6, L)
    ];
  } else {
    fLocal = [
      (3 / 20) * P2 * L + (P1 * L) / 2,
      (1 / 30) * P2 * L * L + (P1 * L * L) / 12,
      (7 / 20) * P2 * L + (P1 * L) / 2,
      (-1 / 20) * P2 * L * L - (P1 * L * L) / 12
    ];
  }

  const detail: ElemForceDetail = {
    elem: row.index,
    L,
    p0,
    pL,
    P1,
    P2,
    py: row.py,
    hasCustom,
    fLocal,
    dofs: row.dofs
  };

  return { fLocal, detail };
}

export interface BeamInterpolationResult {
  x: number;
  xi: number;
  v: number;       // Flecha / deslocamento transversal
  theta: number;   // Rotação dv/dx
  M: number;       // Momento fletor EI * d²v/dx²
  V: number;       // Esforço transverso EI * d³v/dx³
  N: number[];     // Valores das funções de forma
}

export function interpolateBeamAt(
  row: McRow,
  displacements: number[],
  x: number
): BeamInterpolationResult {
  const L = row.L || 1;
  const E = row.E || 1;
  const I = row.I || 1;
  const EI = E * I;
  const xi = Math.max(0, Math.min(1, x / L));

  // Nodal displacements: [v1, th1, v2, th2]
  const q = row.dofs.map((d) => (d > 0 ? displacements[d - 1] : 0));
  const [v1, th1, v2, th2] = q;

  // Hermite shape functions
  const N1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
  const N2 = x * (1 - 2 * xi + xi * xi);
  const N3 = 3 * xi * xi - 2 * xi * xi * xi;
  const N4 = x * (-xi + xi * xi);

  const v = N1 * v1 + N2 * th1 + N3 * v2 + N4 * th2;

  // First derivatives dN/dx
  const dN1 = (-6 * xi + 6 * xi * xi) / L;
  const dN2 = 1 - 4 * xi + 3 * xi * xi;
  const dN3 = (6 * xi - 6 * xi * xi) / L;
  const dN4 = -2 * xi + 3 * xi * xi;

  const theta = dN1 * v1 + dN2 * th1 + dN3 * v2 + dN4 * th2;

  // Second derivatives d²N/dx²
  const d2N1 = (-6 + 12 * xi) / (L * L);
  const d2N2 = (-4 + 6 * xi) / L;
  const d2N3 = (6 - 12 * xi) / (L * L);
  const d2N4 = (-2 + 6 * xi) / L;

  const M = EI * (d2N1 * v1 + d2N2 * th1 + d2N3 * v2 + d2N4 * th2);

  // Third derivatives d³N/dx³
  const d3N1 = 12 / (L * L * L);
  const d3N2 = 6 / (L * L);
  const d3N3 = -12 / (L * L * L);
  const d3N4 = 6 / (L * L);

  const V = EI * (d3N1 * v1 + d3N2 * th1 + d3N3 * v2 + d3N4 * th2);

  return {
    x,
    xi,
    v,
    theta,
    M,
    V,
    N: [N1, N2, N3, N4]
  };
}

export function findZeroRotationRoot(
  row: McRow,
  displacements: number[]
): { xZero: number | null; xRatioStr: string } {
  const L = row.L || 1;
  const q = row.dofs.map((d) => (d > 0 ? displacements[d - 1] : 0));
  const [v1, th1, v2, th2] = q;

  // theta(xi) = dN1*v1 + dN2*th1 + dN3*v2 + dN4*th2 = 0
  // Quadratic equation: A * xi^2 + B * xi + C = 0
  // dN1 = (-6*xi + 6*xi^2)/L
  // dN2 = 1 - 4*xi + 3*xi^2
  // dN3 = (6*xi - 6*xi^2)/L
  // dN4 = -2*xi + 3*xi^2
  const A = (6 * v1) / L + 3 * th1 - (6 * v2) / L + 3 * th2;
  const B = (-6 * v1) / L - 4 * th1 + (6 * v2) / L - 2 * th2;
  const C = th1;

  if (Math.abs(A) < 1e-9) {
    if (Math.abs(B) > 1e-9) {
      const xi = -C / B;
      if (xi >= 0 && xi <= 1) {
        return { xZero: xi * L, xRatioStr: `${fmtNum(xi, 4)} L` };
      }
    }
    return { xZero: null, xRatioStr: 'N/A' };
  }

  const disc = B * B - 4 * A * C;
  if (disc < 0) return { xZero: null, xRatioStr: 'N/A' };

  const r1 = (-B - Math.sqrt(disc)) / (2 * A);
  const r2 = (-B + Math.sqrt(disc)) / (2 * A);

  const validRoots = [r1, r2].filter((r) => r >= -1e-5 && r <= 1 + 1e-5);
  if (validRoots.length === 0) return { xZero: null, xRatioStr: 'N/A' };

  const bestRoot = validRoots[0];
  // Check common fractions like 4/3 or 2/3
  if (Math.abs(bestRoot - 2 / 3) < 1e-3) {
    return { xZero: (2 / 3) * L, xRatioStr: '2/3 L (ou 4/3 L a partir da origem global)' };
  }
  return { xZero: bestRoot * L, xRatioStr: `${fmtNum(bestRoot, 4)} L` };
}

export function computeVigaVibrations(
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
    const me = [
      [156 * fM, 22 * L * fM, 54 * fM, -13 * L * fM],
      [22 * L * fM, 4 * L * L * fM, 13 * L * fM, -3 * L * L * fM],
      [54 * fM, 13 * L * fM, 156 * fM, -22 * L * fM],
      [-13 * L * fM, -3 * L * L * fM, -22 * L * fM, 4 * L * L * fM]
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
        mSteps[key].vals.push(`${fmtNum(me[i][j])} ρAL`);
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
