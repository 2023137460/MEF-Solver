// ============================================================================
// HYBRID ALGEBRAIC & SYMBOLIC ENGINE (ESTG / ULO)
// ============================================================================

export const cosd = (deg: number): number =>
  Math.cos(((Number(deg) || 0) * Math.PI) / 180);

export const sind = (deg: number): number =>
  Math.sin(((Number(deg) || 0) * Math.PI) / 180);

export const fmtNum = (val: number | null | undefined, digits = 4): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (Math.abs(val) < 1e-9) return '0';
  const rounded = Math.round(val * Math.pow(10, digits)) / Math.pow(10, digits);
  if (Math.abs(rounded - Math.round(rounded)) < 1e-7) {
    return String(Math.round(rounded));
  }
  return Number(rounded.toFixed(digits)).toString();
};

export interface ExactFraction {
  sign: string;
  num: number | string;
  den: number;
  isExact: boolean;
}

export const getExactFraction = (val: number): ExactFraction => {
  if (Math.abs(val) < 1e-9) return { sign: '', num: 0, den: 1, isExact: true };
  const sign = val < 0 ? '-' : '';
  const absV = Math.abs(val);
  const denoms = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 45, 60, 192, 480];
  for (const d of denoms) {
    const n = Math.round(absV * d);
    if (Math.abs(absV - n / d) < 1e-5) {
      return { sign, num: n, den: d, isExact: true };
    }
  }
  return { sign, num: fmtNum(absV, 4), den: 1, isExact: false };
};

export const fmtSymbolicL = (L: number): string => {
  const v = Number(L) || 1;
  if (Math.abs(v - 1) < 1e-3) return 'L';
  if (Math.abs(v - 0.5) < 1e-3) return 'L/2';
  if (Math.abs(v - 0.25) < 1e-3) return 'L/4';
  if (Math.abs(v - 0.75) < 1e-3) return '3L/4';
  if (Math.abs(v - 2) < 1e-3) return '2L';
  if (Math.abs(v - 1.4142) < 1e-2) return '1.414L';
  if (Math.abs(v - 1.118) < 1e-2) return '1.118L';
  if (Math.abs(v - 0.7071) < 1e-2) return '0.707L';
  return `${fmtNum(v, 3)}L`;
};

// ============================================================================
// GAUSSIAN ELIMINATION LINEAR SOLVER
// ============================================================================
export interface LinearSolveResult {
  x: number[] | null;
  err: string | null;
}

export function solveLinearSystem(A: number[][], b: number[]): LinearSolveResult {
  const n = A.length;
  if (n === 0) return { x: [], err: 'Sistema vazio' };
  const aug: number[][] = A.map((row, i) => [...row, b[i] || 0]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) {
        pivot = row;
      }
    }
    if (Math.abs(aug[pivot][col]) < 1e-11) {
      return { x: null, err: 'Matriz singular (verifique apoios / estabilidade estática da estrutura)' };
    }
    if (pivot !== col) {
      const tmp = aug[col];
      aug[col] = aug[pivot];
      aug[pivot] = tmp;
    }
    const pVal = aug[col][col];
    for (let j = col; j <= n; j++) aug[col][j] /= pVal;
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = aug[row][col];
        if (Math.abs(factor) > 1e-12) {
          for (let j = col; j <= n; j++) {
            aug[row][j] -= factor * aug[col][j];
          }
        }
      }
    }
  }
  return { x: aug.map((row) => row[n]), err: null };
}

// ============================================================================
// POLYNOMIAL LOAD INTEGRATOR USING HERMITE SHAPE FUNCTIONS
// ============================================================================
export function evalCustomLoadAt(exprStr: string, x: number, L: number): number {
  if (!exprStr || !exprStr.trim()) return 0;
  try {
    const clean = exprStr
      .trim()
      .toLowerCase()
      .replace(/,/g, '.')
      .replace(/p/g, '1')
      .replace(/\^/g, '**')
      .replace(/(\d)(x)/g, '$1*$2')
      .replace(/(\d)(l)/g, '$1*$2')
      .replace(/(x)(l)/g, '$1*$2');
    const fn = new Function('x', 'l', 'le', `try { return (${clean}); } catch(e) { return 0; }`);
    const val = fn(x, 1, L);
    return isFinite(val) ? val : 0;
  } catch (e) {
    return 0;
  }
}

export function integrateBeamShape(exprStr: string, shapeIdx: number, L: number): number {
  const n = 40;
  const h = L / n;
  const shapeAt = (x: number) => {
    const xi = x / L;
    if (shapeIdx === 1) return 1 - xi;
    if (shapeIdx === 2) return 1 - 3 * xi * xi + 2 * xi * xi * xi;
    if (shapeIdx === 3) return x * (1 - 2 * xi + xi * xi);
    if (shapeIdx === 4) return xi;
    if (shapeIdx === 5) return 3 * xi * xi - 2 * xi * xi * xi;
    if (shapeIdx === 6) return x * (-xi + xi * xi);
    return 0;
  };
  let sum = evalCustomLoadAt(exprStr, 0, L) * shapeAt(0) + evalCustomLoadAt(exprStr, L, L) * shapeAt(L);
  for (let i = 1; i < n; i++) {
    const x = i * h;
    sum += (i % 2 === 0 ? 2 : 4) * evalCustomLoadAt(exprStr, x, L) * shapeAt(x);
  }
  return (sum * h) / 3;
}

export function detectLoadPowerL(exprStr: string): { xPow: number; lPow: number; coef: number } {
  if (!exprStr || !exprStr.trim()) return { xPow: 0, lPow: 0, coef: 1 };
  const s = exprStr.replace(/\s+/g, '').toLowerCase();
  let coef = 1;
  const mCoef = s.match(/^([+-]?\d*\.?\d+)/);
  if (mCoef && mCoef[1] !== '' && mCoef[1] !== '+' && mCoef[1] !== '-') {
    coef = parseFloat(mCoef[1]);
  } else if (s.startsWith('-')) {
    coef = -1;
  }
  let xPow = 0;
  if (s.includes('x^3')) xPow = 3;
  else if (s.includes('x^2')) xPow = 2;
  else if (s.includes('x')) xPow = 1;

  let lPow = 0;
  if (s.includes('/l^3')) lPow = -3;
  else if (s.includes('/l^2')) lPow = -2;
  else if (s.includes('/l')) lPow = -1;
  else if (s.includes('*l')) lPow = 1;

  return { xPow, lPow, coef };
}
