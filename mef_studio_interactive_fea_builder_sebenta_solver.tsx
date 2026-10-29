import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MousePointer, Move, Plus, Link2, Anchor, ArrowDown, Trash2,
  Eye, Compass, RotateCcw, Sliders, Zap, ZoomIn, ZoomOut,
  Maximize2, X, RefreshCw, CheckCircle2, Layers, Sparkles
} from 'lucide-react';

// ============================================================================
// MATHEMATICAL & SYMBOLIC HELPERS
// ============================================================================
const cosd = (deg) => Math.cos(((Number(deg) || 0) * Math.PI) / 180);
const sind = (deg) => Math.sin(((Number(deg) || 0) * Math.PI) / 180);

const fmtNum = (val, digits = 4) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (Math.abs(val) < 1e-9) return '0';
  const rounded = Math.round(val * Math.pow(10, digits)) / Math.pow(10, digits);
  if (Math.abs(rounded - Math.round(rounded)) < 1e-7) {
    return String(Math.round(rounded));
  }
  return Number(rounded.toFixed(digits)).toString();
};

const toUnicodeSub = (n) => {
  const map = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  return String(n).split('').map((c) => map[c] || c).join('');
};

const getExactFraction = (val) => {
  if (Math.abs(val) < 1e-9) return { sign: '', num: 0, den: 1, isExact: true };
  const sign = val < 0 ? '-' : '';
  const absV = Math.abs(val);
  const denoms = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 45, 60, 192, 480];
  for (let d of denoms) {
    const n = Math.round(absV * d);
    if (Math.abs(absV - n / d) < 1e-5) {
      return { sign, num: n, den: d, isExact: true };
    }
  }
  return { sign, num: fmtNum(absV, 4), den: 1, isExact: false };
};

const fmtSymbolicL = (L) => {
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
// ACADEMIC MATH UI COMPONENTS
// ============================================================================
const CircledNum = ({ n, small = false }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full border-2 border-red-600 text-red-600 font-sans font-extrabold leading-none select-none bg-white ${
      small ? 'w-4 h-4 text-[9px] mx-0.5' : 'w-5 h-5 text-[11px] mx-0.5'
    }`}
  >
    {n}
  </span>
);

const MathSub = ({ base, sub, sup, italic = true, className = '' }) => (
  <span className={`inline-flex items-baseline font-serif ${italic ? 'italic' : ''} ${className}`}>
    <span>{base}</span>
    {sub !== undefined && sub !== null && (
      <sub className="text-[0.72em] not-italic font-sans font-bold ml-[1px]">{sub}</sub>
    )}
    {sup !== undefined && sup !== null && (
      <sup className="text-[0.72em] not-italic font-sans font-bold ml-[1px]">{sup}</sup>
    )}
  </span>
);

const KTerm = ({ sym = 'K', sub, el }) => (
  <span className="inline-flex items-center font-serif font-bold text-slate-900">
    <span className="italic">{sym}</span>
    <sub className="text-[0.75em] not-italic font-sans font-bold ml-[1px] mr-[1px]">{sub}</sub>
    {el !== undefined && el !== null && (
      <sup className="-top-2">
        <CircledNum n={el} small />
      </sup>
    )}
  </span>
);

const Frac = ({ num, den, className = '' }) => (
  <span className={`inline-flex flex-col items-center align-middle mx-1 leading-tight ${className}`}>
    <span className="px-1 pb-[1px] border-b border-slate-800 text-center">{num}</span>
    <span className="px-1 pt-[1px] text-center">{den}</span>
  </span>
);

const SymFraction = ({ val, numSym = '', denSym = '' }) => {
  const f = getExactFraction(val);
  if (f.num === 0) return <span>0</span>;
  const topText = f.num === 1 && numSym ? numSym : `${f.num}${numSym}`;
  if (f.den === 1 && !denSym) {
    return (
      <span className="font-semibold">
        {f.sign}
        {topText}
      </span>
    );
  }
  const botText = f.den === 1 ? denSym : `${f.den}${denSym}`;
  return (
    <span className="inline-flex items-center font-semibold">
      {f.sign && <span className="mr-0.5">{f.sign}</span>}
      <Frac num={topText} den={botText} />
    </span>
  );
};

const BoxedMath = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center border-2 border-slate-900 bg-amber-50/95 px-2.5 py-1 rounded-xs font-bold text-slate-950 shadow-2xs ${className}`}
  >
    {children}
  </span>
);

const MathMatrix = ({ data, digits = 4, prefix = null }) => (
  <div className="inline-flex items-center gap-1.5 my-1 font-mono text-xs">
    {prefix && <div className="mr-1 font-serif text-sm">{prefix}</div>}
    <div className="relative flex items-center px-2.5 py-1.5 bg-white border-l-2 border-r-2 border-slate-900 rounded-xs shadow-2xs">
      <div className="w-1.5 h-full border-t-2 border-b-2 border-slate-900 absolute left-0 top-0 pointer-events-none" />
      <div className="w-1.5 h-full border-t-2 border-b-2 border-slate-900 absolute right-0 top-0 pointer-events-none" />
      <div className="space-y-1">
        {data.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-4 justify-end">
            {row.map((cell, cIdx) => (
              <span key={cIdx} className="min-w-[3.4rem] text-right font-semibold text-slate-800">
                {typeof cell === 'number' ? fmtNum(cell, digits) : cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MathVector = ({ items, curly = true }) => (
  <div className="inline-flex items-center my-1 font-mono text-xs">
    <div
      className={`relative flex flex-col items-center px-2.5 py-1.5 bg-white border-slate-900 shadow-2xs ${
        curly ? 'border-l-2 border-r-2 rounded-lg' : 'border-l-2 border-r-2 rounded-xs'
      }`}
    >
      {items.map((it, idx) => (
        <div key={idx} className="py-0.5 text-center font-semibold text-slate-800 whitespace-nowrap">
          {it}
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// LINEAR SOLVER & POLYNOMIAL INTEGRATOR
// ============================================================================
function solveLinearSystem(A, b) {
  const n = A.length;
  if (n === 0) return { x: [], err: 'Sistema vazio' };
  const aug = A.map((row, i) => [...row, b[i] || 0]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) {
        pivot = row;
      }
    }
    if (Math.abs(aug[pivot][col]) < 1e-11) {
      return { x: null, err: 'Matriz singular (verifique apoios / estabilidade da estrutura)' };
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

function evalCustomLoadAt(exprStr, x, L) {
  if (!exprStr || !exprStr.trim()) return 0;
  try {
    let clean = exprStr
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

function integrateBeamShape(exprStr, shapeIdx, L) {
  const n = 40;
  const h = L / n;
  const shapeAt = (x) => {
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

function detectLoadPowerL(exprStr) {
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

// ============================================================================
// ALL 15 SEBENTA EXERCISES PRESETS
// ============================================================================
const SEBENTA_PRESETS = [
  {
    id: 'ex1',
    num: 1,
    title: 'Ex. 1 — Treliça 3 Barras (Desl., σ, Modos Vibração)',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 2,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 1, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 1, y: 1, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 0, y: 1, support: 'free', rollerAngle: 0, fx: 2, fy: -1, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 4, n2: 2, E: 2, A: 1, I: 1, L: 1.4142, th1: -45, th2: -45, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 4, n2: 3, E: 3, A: 1, I: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex2',
    num: 2,
    title: 'Ex. 2 — Treliça Simétrica 3 Barras (Desl., σ DC, Vibração)',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 3,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: -0.5, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 0.5, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 0, y: 1, support: 'free', rollerAngle: 0, fx: -1, fy: -1, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 4, E: 1, A: 1, I: 1, L: 1.118, th1: 63.435, th2: 63.435, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 2, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 4, n2: 3, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex3',
    num: 3,
    title: 'Ex. 3 — Treliça em Y (Desl. em C, σ em AC, Vibração)',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 2,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'D', x: 0, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'C', x: 0, y: 1, support: 'free', rollerAngle: 0, fx: -1, fy: -2, mz: 0 },
      { id: 3, label: 'A', x: -0.5, y: 2, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'B', x: 0.5, y: 2, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 3, n2: 2, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 2, n2: 4, E: 1, A: 1, I: 1, L: 1.118, th1: 63.435, th2: 63.435, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex4',
    num: 4,
    title: 'Ex. 4 — Apoio Rolante Inclinado 30° (Zona Crítica e u(x))',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 1,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: -0.5, y: 0, support: 'rollerAngle', rollerAngle: 30, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0, y: 1, support: 'free', rollerAngle: 0, fx: 3, fy: 2, mz: 0 },
      { id: 3, label: 'C', x: 0.5, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 1, y: 1, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.118, th1: 33.435, th2: 63.435, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 2, n2: 4, E: 1, A: 2, I: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex5',
    num: 5,
    title: 'Ex. 5 — Apoio Rolante -20° e Força 2P a 20° (u(x) e Zona Crítica)',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 1,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: -0.5, y: 1, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      {
        id: 2,
        label: 'B',
        x: 0,
        y: 0,
        support: 'free',
        rollerAngle: 0,
        fx: Number((2 * cosd(20)).toFixed(4)),
        fy: Number((2 * sind(20)).toFixed(4)),
        forceMag: 2,
        forceAngle: 20,
        mz: 0
      },
      { id: 3, label: 'C', x: 0.5, y: 0, support: 'rollerAngle', rollerAngle: -20, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 0, y: -1, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 4, n2: 2, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 2, n2: 3, E: 1, A: 2, I: 1, L: 0.5, th1: 0, th2: -20, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex6',
    num: 6,
    title: 'Ex. 6 — Quadro Paralelogramo com 3 Apoios Rolantes',
    mode: 'Barra2D',
    forceSym: 'F',
    targetBar: 4,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'C', x: 0, y: 0, support: 'rollerX', rollerAngle: 0, fx: 3, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0, y: 1, support: 'rollerY', rollerAngle: 90, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'D', x: 1, y: 1, support: 'rollerY', rollerAngle: 90, fx: 0, fy: -1, mz: 0 },
      { id: 4, label: 'A', x: 1, y: 2, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 2, n2: 4, E: 1, A: 1, I: 1, L: 1.4142, th1: 45, th2: 45, p0: 0, pL: 0, py: '' },
      { id: 4, n1: 1, n2: 3, E: 1, A: 1, I: 1, L: 1.4142, th1: 45, th2: 45, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex7',
    num: 7,
    title: 'Ex. 7 — Viga 2L Trapezoidal (-p/2 a -p: θB, v(L), M(0))',
    mode: 'Viga',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 2, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: -0.5, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex8',
    num: 8,
    title: 'Ex. 8 — Viga Simétrica 2L (Simetria em x=L, θ(L/2), V(3L/2))',
    mode: 'Viga',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'Meio', x: 1, y: 0, support: 'guided', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex9',
    num: 9,
    title: 'Ex. 9 — Viga 2L (Reação RB no Apoio Rolante e θ(x)=0)',
    mode: 'Viga',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.6667,
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 2, y: 0, support: 'pinned', calcReactionY: true, rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: 0, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex10',
    num: 10,
    title: 'Ex. 10 — Pórtico Viga-Barra 6 GDL (Perna 45° + Viga 2L)',
    mode: 'VigaBarra2D',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0.5, y: 0.5, support: 'free', rollerAngle: 0, fx: 0, fy: -1, mz: 0 },
      { id: 3, label: 'C', x: 1, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 3, y: 1, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 0.7071, th1: 45, th2: 45, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 0.7071, th1: 45, th2: 45, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: -1, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex11',
    num: 11,
    title: 'Ex. 11 — Pórtico 7 GDL ([K] 7x7 e Vetor de Forças {F})',
    mode: 'VigaBarra2D',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 1, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 3, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 3, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.4142, th1: 45, th2: 45, p0: -1, pL: -1, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: 0, pL: -1, py: '' },
      { id: 3, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: -90, th2: -90, p0: -1, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex12',
    num: 12,
    title: 'Ex. 12 — Pórtico com Carga Cúbica p(x) = -p·x³/L³',
    mode: 'VigaBarra2D',
    forceSym: 'p',
    targetBar: 2,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0.5, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 1.5, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 2, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.118, th1: 63.435, th2: 63.435, p0: 0, pL: -1, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '-x^3/L^3' },
      { id: 3, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: -1, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex13',
    num: 13,
    title: 'Ex. 13 — Viga Bi-Encastrada (L/2 + L/2: M, θ, σ e Vibração)',
    mode: 'Viga',
    forceSym: 'p',
    targetBar: 2,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'M', x: 0.5, y: 0, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'B', x: 1, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 0.5, th1: 0, th2: 0, p0: 3, pL: 3, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 0.5, th1: 0, th2: 0, p0: 3, pL: 2, py: '' }
    ]
  },
  {
    id: 'ex14',
    num: 14,
    title: 'Ex. 14 — Sistema de Molas (Energia Potencial Π = Ue - W)',
    mode: 'Mola',
    forceSym: 'mg',
    targetBar: 1,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'Apoio', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'm₁', x: 1, y: 0, support: 'free', rollerAngle: 0, fx: 1, fy: 0, mz: 0, mass: 1 },
      { id: 3, label: 'm₂', x: 2, y: 0, support: 'free', rollerAngle: 0, fx: 1, fy: 0, mz: 0, mass: 1 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, k: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 2, n2: 3, E: 2, A: 1, I: 1, k: 2, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex15',
    num: 15,
    title: 'Ex. 15 — Pórtico com Carga Parabólica p(x) = -2p·x²/L',
    mode: 'VigaBarra2D',
    forceSym: 'p',
    targetBar: 2,
    targetXi: 0.5,
    nodes: [
      { id: 1, label: 'A', x: 0, y: 1, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 1, y: 0, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 3, y: 0, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 3, y: -1, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.4142, th1: -45, th2: -45, p0: 0, pL: -2, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: 0, pL: 0, py: '-2*x^2/L' },
      { id: 3, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: -90, th2: -90, p0: -3, pL: -3, py: '' }
    ]
  }
];

// ============================================================================
// CORE SYMBOLIC FEA ENGINE (AUTO-DOF, STIFFNESS, FORCE, POST-PROCESSING)
// ============================================================================
function buildSymbolicAnalysis(state) {
  const { mode, nodes, elements } = state;
  const nodeMap = {};
  nodes.forEach((n) => {
    nodeMap[n.id] = n;
  });

  // 1. Assign Global DOFs to each node based on mode and support type
  let dofCounter = 0;
  const nodeDofs = {};
  const dofInfo = {};

  // Check if Exercise 8 symmetry ordering applies (θ1 = u1, v2 = u2)
  const isEx8 = state.id === 'ex8' && mode === 'Viga' && nodes.length === 2;

  if (isEx8) {
    // Node 1 pinned (u1 = rotation), Node 2 guided (u2 = vertical translation)
    dofCounter = 2;
    nodeDofs[nodes[0].id] = { v: 0, th: 1 };
    nodeDofs[nodes[1].id] = { v: 2, th: 0 };
    dofInfo[1] = { index: 1, nodeId: nodes[0].id, nodeLabel: nodes[0].label, type: 'th', angle: 0 };
    dofInfo[2] = { index: 2, nodeId: nodes[1].id, nodeLabel: nodes[1].label, type: 'v', angle: 90 };
  } else {
    nodes.forEach((n) => {
      const sup = n.support || 'free';
      if (mode === 'Mola') {
        if (sup === 'free' || sup === 'rollerX') {
          dofCounter++;
          nodeDofs[n.id] = { u: dofCounter };
          dofInfo[dofCounter] = { index: dofCounter, nodeId: n.id, nodeLabel: n.label, type: 'u', angle: 0 };
        } else {
          nodeDofs[n.id] = { u: 0 };
        }
      } else if (mode === 'Barra2D') {
        if (sup === 'free') {
          const uIdx = ++dofCounter;
          const vIdx = ++dofCounter;
          nodeDofs[n.id] = { u: uIdx, v: vIdx, isInclined: false };
          dofInfo[uIdx] = { index: uIdx, nodeId: n.id, nodeLabel: n.label, type: 'u', angle: 0 };
          dofInfo[vIdx] = { index: vIdx, nodeId: n.id, nodeLabel: n.label, type: 'v', angle: 90 };
        } else if (sup === 'rollerX') {
          const uIdx = ++dofCounter;
          nodeDofs[n.id] = { u: uIdx, v: 0, isInclined: false };
          dofInfo[uIdx] = { index: uIdx, nodeId: n.id, nodeLabel: n.label, type: 'u', angle: 0 };
        } else if (sup === 'rollerY') {
          const vIdx = ++dofCounter;
          nodeDofs[n.id] = { u: 0, v: vIdx, isInclined: false };
          dofInfo[vIdx] = { index: vIdx, nodeId: n.id, nodeLabel: n.label, type: 'v', angle: 90 };
        } else if (sup === 'rollerAngle') {
          const uIdx = ++dofCounter;
          const alpha = Number(n.rollerAngle) || 0;
          nodeDofs[n.id] = { u: uIdx, v: 0, isInclined: true, rollerAngle: alpha };
          dofInfo[uIdx] = { index: uIdx, nodeId: n.id, nodeLabel: n.label, type: 'u_inc', angle: alpha };
        } else {
          nodeDofs[n.id] = { u: 0, v: 0, isInclined: false };
        }
      } else if (mode === 'Viga') {
        let vIdx = 0;
        let thIdx = 0;
        if (sup === 'free' || sup === 'rollerY') {
          vIdx = ++dofCounter;
          thIdx = ++dofCounter;
        } else if (sup === 'pinned' || sup === 'rollerX') {
          if (n.calcReactionY) {
            vIdx = ++dofCounter;
            dofInfo[vIdx] = {
              index: vIdx,
              nodeId: n.id,
              nodeLabel: n.label,
              type: 'v',
              angle: 90,
              constrainedZero: true
            };
          }
          thIdx = ++dofCounter;
        } else if (sup === 'guided') {
          vIdx = ++dofCounter;
        }
        nodeDofs[n.id] = { v: vIdx, th: thIdx };
        if (vIdx > 0 && !dofInfo[vIdx]) {
          dofInfo[vIdx] = { index: vIdx, nodeId: n.id, nodeLabel: n.label, type: 'v', angle: 90 };
        }
        if (thIdx > 0) {
          dofInfo[thIdx] = { index: thIdx, nodeId: n.id, nodeLabel: n.label, type: 'th', angle: 0 };
        }
      } else if (mode === 'VigaBarra2D') {
        let uIdx = 0;
        let vIdx = 0;
        let thIdx = 0;
        if (sup === 'free') {
          uIdx = ++dofCounter;
          vIdx = ++dofCounter;
          thIdx = ++dofCounter;
        } else if (sup === 'pinned') {
          thIdx = ++dofCounter;
        } else if (sup === 'rollerX') {
          uIdx = ++dofCounter;
          thIdx = ++dofCounter;
        } else if (sup === 'rollerY') {
          vIdx = ++dofCounter;
          thIdx = ++dofCounter;
        }
        nodeDofs[n.id] = { u: uIdx, v: vIdx, th: thIdx };
        if (uIdx > 0) dofInfo[uIdx] = { index: uIdx, nodeId: n.id, nodeLabel: n.label, type: 'u', angle: 0 };
        if (vIdx > 0) dofInfo[vIdx] = { index: vIdx, nodeId: n.id, nodeLabel: n.label, type: 'v', angle: 90 };
        if (thIdx > 0) dofInfo[thIdx] = { index: thIdx, nodeId: n.id, nodeLabel: n.label, type: 'th', angle: 0 };
      }
    });
  }

  const nDof = dofCounter;

  // 2. Build Connectivity Table (m.c.)
  const mcRows = elements.map((el, idx) => {
    const n1 = nodeMap[el.n1] || { x: 0, y: 0, label: '?' };
    const n2 = nodeMap[el.n2] || { x: 1, y: 0, label: '?' };
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const geomL = Math.hypot(dx, dy) || 1;
    const geomTh = (Math.atan2(dy, dx) * 180) / Math.PI;

    const L = el.L !== undefined && el.L !== null ? Number(el.L) : Number(geomL.toFixed(4));
    let th1 = el.th1 !== undefined && el.th1 !== null ? Number(el.th1) : Number(geomTh.toFixed(3));
    let th2 = el.th2 !== undefined && el.th2 !== null ? Number(el.th2) : th1;

    // Automatic adjustments if node has inclined roller and user didn't custom-override
    const d1 = nodeDofs[n1.id] || {};
    const d2 = nodeDofs[n2.id] || {};
    if (mode === 'Barra2D' && !el.customAngles) {
      if (d1.isInclined && state.id !== 'ex4' && state.id !== 'ex5') {
        th1 = Number((geomTh - (d1.rollerAngle || 0)).toFixed(3));
      }
      if (d2.isInclined && state.id !== 'ex4' && state.id !== 'ex5') {
        th2 = Number((geomTh - (d2.rollerAngle || 0)).toFixed(3));
      }
    }

    let dofs = [];
    if (mode === 'Mola') {
      dofs = [d1.u || 0, d2.u || 0];
    } else if (mode === 'Barra2D') {
      dofs = [d1.u || 0, d1.v || 0, d2.u || 0, d2.v || 0];
    } else if (mode === 'Viga') {
      dofs = [d1.v || 0, d1.th || 0, d2.v || 0, d2.th || 0];
    } else if (mode === 'VigaBarra2D') {
      dofs = [d1.u || 0, d1.v || 0, d1.th || 0, d2.u || 0, d2.v || 0, d2.th || 0];
    }

    return {
      ...el,
      index: idx + 1,
      n1Label: n1.label,
      n2Label: n2.label,
      dofs,
      L,
      th1,
      th2,
      E: Number(el.E) || 1,
      A: Number(el.A) || 1,
      I: Number(el.I) || 1,
      k: Number(el.k || el.E) || 1,
      p0: Number(el.p0) || 0,
      pL: Number(el.pL) || 0,
      py: el.py || ''
    };
  });

  // 3. Assemble Global Stiffness Matrix [K] and Step-by-Step Symbolic Terms
  const Knum = Array.from({ length: nDof }, () => Array(nDof).fill(0));
  const KsymEA = Array.from({ length: nDof }, () => Array(nDof).fill(0));
  const KsymEI = Array.from({ length: nDof }, () => Array(nDof).fill(0));
  const KsymEILPow = Array.from({ length: nDof }, () => Array(nDof).fill(3));
  const kSteps = {};

  const addKStep = (gi, gj, symObj, valStr) => {
    const key = `${gi},${gj}`;
    if (!kSteps[key]) kSteps[key] = { syms: [], vals: [] };
    kSteps[key].syms.push(symObj);
    kSteps[key].vals.push(valStr);
  };

  mcRows.forEach((row) => {
    const e = row.index;
    const L = row.L || 1;
    const E = row.E || 1;
    const A = row.A || 1;
    const I = row.I || 1;

    if (mode === 'Mola') {
      const kVal = row.k || 1;
      const ke = [
        [kVal, -kVal],
        [-kVal, kVal]
      ];
      for (let i = 0; i < 2; i++) {
        const gi = row.dofs[i];
        if (!gi) continue;
        for (let j = 0; j < 2; j++) {
          const gj = row.dofs[j];
          if (!gj) continue;
          Knum[gi - 1][gj - 1] += ke[i][j];
          addKStep(
            gi,
            gj,
            { sub: `${i + 1}${j + 1}`, el: e },
            `${ke[i][j] >= 0 ? '' : '-'}${Math.abs(ke[i][j]) === 1 ? '' : fmtNum(Math.abs(ke[i][j]))}k`
          );
        }
      }
    } else if (mode === 'Barra2D') {
      const c1 = cosd(row.th1);
      const s1 = sind(row.th1);
      const c2 = cosd(row.th2);
      const s2 = sind(row.th2);
      const v = [c1, s1, -c2, -s2];
      const trigNames = [
        `cos(${fmtNum(row.th1)}°)`,
        `sin(${fmtNum(row.th1)}°)`,
        `-cos(${fmtNum(row.th2)}°)`,
        `-sin(${fmtNum(row.th2)}°)`
      ];
      const factor = (E * A) / L;
      const eaPrefix = `${E * A === 1 ? 'EA' : `${fmtNum(E * A)}EA`}/${fmtSymbolicL(L)}`;

      for (let i = 0; i < 4; i++) {
        const gi = row.dofs[i];
        if (!gi) continue;
        for (let j = 0; j < 4; j++) {
          const gj = row.dofs[j];
          if (!gj) continue;
          const val = factor * v[i] * v[j];
          Knum[gi - 1][gj - 1] += val;
          KsymEA[gi - 1][gj - 1] += val;
          let tStr = '';
          if (i === j) {
            const baseT = i % 2 === 0 ? 'cos²' : 'sin²';
            const ang = i < 2 ? row.th1 : row.th2;
            tStr = `${eaPrefix}·${baseT}(${fmtNum(ang)}°)`;
          } else {
            tStr = `${eaPrefix}·(${trigNames[i]}·${trigNames[j]})`;
          }
          addKStep(gi, gj, { sub: `${i + 1}${j + 1}`, el: e }, tStr);
        }
      }
    } else if (mode === 'Viga') {
      const factor = (E * I) / (L * L * L);
      const ke = [
        [12, 6 * L, -12, 6 * L],
        [6 * L, 4 * L * L, -6 * L, 2 * L * L],
        [-12, -6 * L, 12, -6 * L],
        [6 * L, 2 * L * L, -6 * L, 4 * L * L]
      ];
      const Lsym = fmtSymbolicL(L);
      const formulaMat = [
        [`12`, `6(${Lsym})`, `-12`, `6(${Lsym})`],
        [`6(${Lsym})`, `4(${Lsym})²`, `-6(${Lsym})`, `2(${Lsym})²`],
        [`-12`, `-6(${Lsym})`, `12`, `-6(${Lsym})`],
        [`6(${Lsym})`, `2(${Lsym})²`, `-6(${Lsym})`, `4(${Lsym})²`]
      ];
      for (let i = 0; i < 4; i++) {
        const gi = row.dofs[i];
        if (!gi) continue;
        for (let j = 0; j < 4; j++) {
          const gj = row.dofs[j];
          if (!gj) continue;
          const val = factor * ke[i][j];
          Knum[gi - 1][gj - 1] += val;
          KsymEI[gi - 1][gj - 1] += val;
          const isRotI = i === 1 || i === 3;
          const isRotJ = j === 1 || j === 3;
          KsymEILPow[gi - 1][gj - 1] = isRotI && isRotJ ? 1 : isRotI || isRotJ ? 2 : 3;
          addKStep(
            gi,
            gj,
            { sub: `${i + 1}${j + 1}`, el: e },
            `[EI / (${Lsym})³] · ${formulaMat[i][j]}`
          );
        }
      }
    } else if (mode === 'VigaBarra2D') {
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
      const mul6 = (A6, B6) => {
        const C6 = Array.from({ length: 6 }, () => Array(6).fill(0));
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 6; c++) {
            for (let k = 0; k < 6; k++) C6[r][c] += A6[r][k] * B6[k][c];
          }
        }
        return C6;
      };
      const Rt = R[0].map((_, c) => R.map((r) => r[c]));
      const kAg = mul6(Rt, mul6(kA, R));
      const kBg = mul6(Rt, mul6(kB, R));

      for (let i = 0; i < 6; i++) {
        const gi = row.dofs[i];
        if (!gi) continue;
        for (let j = 0; j < 6; j++) {
          const gj = row.dofs[j];
          if (!gj) continue;
          const vA = eaFactor * kAg[i][j];
          const vB = eiFactor * kBg[i][j];
          const isRotI = i === 2 || i === 5;
          const isRotJ = j === 2 || j === 5;
          const lPow = isRotI && isRotJ ? 1 : isRotI || isRotJ ? 2 : 3;

          if (Math.abs(vA) > 1e-10 || Math.abs(vB) > 1e-10) {
            Knum[gi - 1][gj - 1] += vA + vB;
            KsymEA[gi - 1][gj - 1] += vA;
            KsymEI[gi - 1][gj - 1] += vB;
            KsymEILPow[gi - 1][gj - 1] = lPow;

            const parts = [];
            if (Math.abs(vA) > 1e-10) parts.push(`${fmtNum(vA)}(EA/L)`);
            if (Math.abs(vB) > 1e-10) {
              const eiUnit = lPow === 1 ? 'EI/L' : lPow === 2 ? 'EI/L²' : 'EI/L³';
              parts.push(`${fmtNum(vB)}(${eiUnit})`);
            }
            addKStep(gi, gj, { sub: `${i + 1}${j + 1}`, el: e }, parts.join(' + ').replace(/\+ -/g, '- '));
          }
        }
      }
    }
  });

  // 4. Assemble Global Force Vector {F} & Equivalent Element Loads
  const Fnum = Array(nDof).fill(0);
  const FtermsByPow = Array.from({ length: nDof }, () => ({})); // power of L -> coeff
  const elemForceDetails = [];

  const addForceTerm = (dofIdx, val, lPow, symBase) => {
    if (dofIdx < 1 || dofIdx > nDof) return;
    Fnum[dofIdx - 1] += val;
    const key = `${symBase}_L${lPow}`;
    FtermsByPow[dofIdx - 1][key] = (FtermsByPow[dofIdx - 1][key] || 0) + val;
  };

  // Nodal loads
  nodes.forEach((n) => {
    const d = nodeDofs[n.id];
    if (!d) return;
    const fx = Number(n.fx) || 0;
    const fy = Number(n.fy) || 0;
    const mz = Number(n.mz) || 0;

    if (mode === 'Mola') {
      if (d.u && Math.abs(fx) > 1e-9) addForceTerm(d.u, fx, 0, state.forceSym || 'mg');
    } else if (mode === 'Barra2D') {
      if (d.isInclined && d.u) {
        const proj = fx * cosd(d.rollerAngle || 0) + fy * sind(d.rollerAngle || 0);
        if (Math.abs(proj) > 1e-9) addForceTerm(d.u, proj, 0, state.forceSym || 'P');
      } else {
        if (d.u && Math.abs(fx) > 1e-9) addForceTerm(d.u, fx, 0, state.forceSym || 'P');
        if (d.v && Math.abs(fy) > 1e-9) addForceTerm(d.v, fy, 0, state.forceSym || 'P');
      }
    } else if (mode === 'Viga') {
      if (d.v && Math.abs(fy) > 1e-9) addForceTerm(d.v, fy, 0, 'P');
      if (d.th && Math.abs(mz) > 1e-9) addForceTerm(d.th, mz, 1, 'P');
    } else if (mode === 'VigaBarra2D') {
      if (d.u && Math.abs(fx) > 1e-9) addForceTerm(d.u, fx, 0, 'F');
      if (d.v && Math.abs(fy) > 1e-9) addForceTerm(d.v, fy, 0, 'F');
      if (d.th && Math.abs(mz) > 1e-9) addForceTerm(d.th, mz, 1, 'F');
    }
  });

  // Distributed element loads
  mcRows.forEach((row) => {
    const L = row.L || 1;
    const p0 = row.p0 || 0;
    const pL = row.pL || 0;
    const hasCustom = Boolean(row.py && row.py.trim() !== '');
    const hasDist = hasCustom || Math.abs(p0) > 1e-9 || Math.abs(pL) > 1e-9;
    if (!hasDist) return;

    if (mode === 'Viga') {
      const P1 = p0;
      const P2 = pL - p0;
      let fLocal = [0, 0, 0, 0];
      if (hasCustom) {
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
      elemForceDetails.push({
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
      });
      for (let k = 0; k < 4; k++) {
        const g = row.dofs[k];
        if (g > 0) {
          const isMom = k === 1 || k === 3;
          addForceTerm(g, fLocal[k], isMom ? 2 : 1, 'p');
        }
      }
    } else if (mode === 'VigaBarra2D') {
      const P1 = p0;
      const P2 = pL - p0;
      let fLocal = [0, 0, 0, 0, 0, 0];
      let baseLPow = 0;
      if (hasCustom) {
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
            const g = row.dofs[i];
            if (g > 0) {
              addForceTerm(g, val, localPow[j], 'p');
            }
          }
        }
      }

      elemForceDetails.push({
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
      });
    }
  });

  // Format symbolic force strings per DOF
  const formatDofForceString = (dofIdx) => {
    const terms = FtermsByPow[dofIdx - 1] || {};
    const parts = [];
    Object.keys(terms)
      .sort()
      .forEach((k) => {
        const val = terms[k];
        if (Math.abs(val) < 1e-9) return;
        const [sym, powPart] = k.split('_L');
        const p = parseInt(powPart, 10);
        const lStr = p === 0 ? '' : p === 1 ? 'L' : `L^${p}`;
        const sign = val < 0 ? '-' : parts.length > 0 ? '+' : '';
        const absV = Math.abs(val);
        const numStr = Math.abs(absV - 1) < 1e-9 && (sym || lStr) ? '' : fmtNum(absV, 4);
        parts.push(`${sign} ${numStr}${sym}${lStr}`.trim());
      });
    return parts.length > 0 ? parts.join(' ') : '0';
  };

  const FsymStrings = Array.from({ length: nDof }, (_, i) => formatDofForceString(i + 1));

  // 5. Solve Displacements (including Support Reaction DOFs with u_i = 0 like Ex. 9)
  let displacements = null;
  let reactions = {};
  let solveError = null;

  const constrainedDofs = Object.values(dofInfo)
    .filter((d) => d.constrainedZero)
    .map((d) => d.index);

  if (nDof > 0) {
    if (constrainedDofs.length > 0) {
      // Partition free DOFs vs constrained-zero DOFs (Ex. 9 method)
      const freeDofs = [];
      for (let i = 1; i <= nDof; i++) {
        if (!constrainedDofs.includes(i)) freeDofs.push(i);
      }
      const Kf = freeDofs.map((r) => freeDofs.map((c) => Knum[r - 1][c - 1]));
      const Ff = freeDofs.map((r) => Fnum[r - 1]);
      const sol = solveLinearSystem(Kf, Ff);
      if (sol.err) {
        solveError = sol.err;
      } else {
        displacements = Array(nDof).fill(0);
        freeDofs.forEach((dIdx, k) => {
          displacements[dIdx - 1] = sol.x[k];
        });
        // Compute reaction R_i = sum_j K_ij * u_j - F_i
        constrainedDofs.forEach((cIdx) => {
          let ku = 0;
          for (let j = 0; j < nDof; j++) {
            ku += Knum[cIdx - 1][j] * displacements[j];
          }
          reactions[cIdx] = ku - Fnum[cIdx - 1];
        });
      }
    } else {
      const sol = solveLinearSystem(Knum, Fnum);
      if (sol.err) solveError = sol.err;
      else displacements = sol.x;
    }
  }

  // 6. Post-processing for Barra2D (Stresses, Normal Forces, Critical Zone, u(x), Vibration Modes)
  const barStresses = [];
  let criticalBar = null;

  if (mode === 'Barra2D' && displacements) {
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
      const item = {
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
  }

  // 7. Consistent Mass Matrix [M] and Vibration Eigenvalues (Barra2D and Viga)
  let vibration = null;
  if ((mode === 'Barra2D' || mode === 'Viga') && nDof >= 1 && nDof <= 3 && constrainedDofs.length === 0) {
    const Mnum = Array.from({ length: nDof }, () => Array(nDof).fill(0));
    const mSteps = {};

    mcRows.forEach((row) => {
      const e = row.index;
      const L = row.L || 1;
      const A = row.A || 1;
      if (mode === 'Barra2D') {
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
      } else if (mode === 'Viga') {
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
        const modes = lambdas.map((lam) => {
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
        vibration = { Mnum, mSteps, quad: { a, b, c }, modes };
      }
    }
  }

  return {
    nDof,
    nodeDofs,
    dofInfo,
    mcRows,
    Knum,
    KsymEA,
    KsymEI,
    KsymEILPow,
    kSteps,
    Fnum,
    FsymStrings,
    elemForceDetails,
    displacements,
    reactions,
    solveError,
    barStresses,
    criticalBar,
    vibration
  };
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [exState, setExState] = useState(() => SEBENTA_PRESETS[0]);
  const [history, setHistory] = useState([]);
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'move' | 'addNode' | 'addBar' | 'support' | 'load' | 'delete'
  const [snapStep, setSnapStep] = useState(0.5);
  const [showDofs, setShowDofs] = useState(true);
  const [showAngles, setShowAngles] = useState(true);

  // Selection for on-canvas floating HUD editors
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedElemId, setSelectedElemId] = useState(null);
  const [connectStartNodeId, setConnectStartNodeId] = useState(null);
  const [resizeGeometryOnL, setResizeGeometryOnL] = useState(true);

  // SVG Viewport & Pointer Dragging State
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: -120, y: -260, w: 540, h: 420 });
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef(null);
  const [hoverWorld, setHoverWorld] = useState({ x: 0, y: 0, visible: false });

  const SCALE = 160; // 1L = 160px in SVG world space
  const worldToSvg = (wx, wy) => ({ x: wx * SCALE, y: -wy * SCALE });

  const pushState = (updater) => {
    setExState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setHistory((h) => [...h.slice(-19), prev]);
      return next;
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setExState(prev);
  };

  // Auto-fit camera whenever preset changes
  const centerViewOnStructure = (nodesList = exState.nodes) => {
    if (!nodesList || nodesList.length === 0) {
      setViewBox({ x: -140, y: -240, w: 520, h: 400 });
      return;
    }
    const xs = nodesList.map((n) => n.x * SCALE);
    const ys = nodesList.map((n) => -n.y * SCALE);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padX = 150;
    const padY = 135;
    const w = Math.max(460, maxX - minX + padX * 2);
    const h = Math.max(380, maxY - minY + padY * 2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewBox({ x: cx - w / 2, y: cy - h / 2, w, h });
  };

  const selectPreset = (presetId) => {
    if (presetId === 'blank') {
      const blank = {
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
      pushState(blank);
      setSelectedNodeId(2);
      setSelectedElemId(null);
      centerViewOnStructure(blank.nodes);
      return;
    }
    const found = SEBENTA_PRESETS.find((p) => p.id === presetId);
    if (found) {
      const cloned = JSON.parse(JSON.stringify(found));
      setExState(cloned);
      setHistory([]);
      setSelectedNodeId(null);
      setSelectedElemId(null);
      setConnectStartNodeId(null);
      centerViewOnStructure(cloned.nodes);
    }
  };

  // Accurate SVG Screen-to-World Coordinate Conversion using getScreenCTM()
  const getWorldCoordsFromEvent = (clientX, clientY, applySnap = true) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm.inverse());
    let wx = transformed.x / SCALE;
    let wy = -transformed.y / SCALE;
    if (applySnap && snapStep > 0) {
      wx = Math.round(wx / snapStep) * snapStep;
      wy = Math.round(wy / snapStep) * snapStep;
    }
    return {
      x: Number(wx.toFixed(4)),
      y: Number(wy.toFixed(4))
    };
  };

  // Global window pointer move / up for smooth node dragging and canvas panning
  useEffect(() => {
    if (!draggingNodeId && !isPanning) return;

    const handleWindowPointerMove = (e) => {
      if (draggingNodeId) {
        const wPos = getWorldCoordsFromEvent(e.clientX, e.clientY, true);
        setExState((prev) => {
          const updatedNodes = prev.nodes.map((n) =>
            n.id === draggingNodeId ? { ...n, x: wPos.x, y: wPos.y } : n
          );
          const nMap = {};
          updatedNodes.forEach((n) => (nMap[n.id] = n));
          // Recompute geometric L and angles for connected elements unless locked
          const updatedElems = prev.elements.map((el) => {
            if (el.n1 !== draggingNodeId && el.n2 !== draggingNodeId) return el;
            const n1 = nMap[el.n1];
            const n2 = nMap[el.n2];
            if (!n1 || !n2) return el;
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const newL = Number((Math.hypot(dx, dy) || 1).toFixed(4));
            const newTh = Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(3));
            return {
              ...el,
              L: el.lockL ? el.L : newL,
              th1: el.customAngles ? el.th1 : newTh,
              th2: el.customAngles ? el.th2 : newTh
            };
          });
          return { ...prev, id: 'custom', nodes: updatedNodes, elements: updatedElems };
        });
      } else if (isPanning && panStartRef.current) {
        const dx = (e.clientX - panStartRef.current.clientX) * (viewBox.w / 600);
        const dy = (e.clientY - panStartRef.current.clientY) * (viewBox.h / 450);
        setViewBox((vb) => ({
          ...vb,
          x: panStartRef.current.vbX - dx,
          y: panStartRef.current.vbY - dy
        }));
      }
    };

    const handleWindowPointerUp = () => {
      setDraggingNodeId(null);
      setIsPanning(false);
      panStartRef.current = null;
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [draggingNodeId, isPanning, snapStep, viewBox.w, viewBox.h]);

  // Run Symbolic FEA Analysis
  const analysis = useMemo(() => buildSymbolicAnalysis(exState), [exState]);

  // Helper to cycle Support Types (using "Apoio Rolante")
  const cycleNodeSupport = (nodeId) => {
    const order =
      exState.mode === 'Viga'
        ? ['free', 'pinned', 'rollerX', 'fixed', 'guided']
        : ['free', 'pinned', 'rollerX', 'rollerY', 'rollerAngle', 'fixed'];
    pushState((prev) => ({
      ...prev,
      id: 'custom',
      nodes: prev.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const idx = order.indexOf(n.support || 'free');
        const nextSup = order[(idx + 1) % order.length];
        return {
          ...n,
          support: nextSup,
          rollerAngle: nextSup === 'rollerAngle' ? n.rollerAngle || 30 : 0
        };
      })
    }));
  };

  // Canvas Background Click
  const handleCanvasPointerDown = (e) => {
    if (e.target.closest('[data-interactive="true"]')) return;
    const wPos = getWorldCoordsFromEvent(e.clientX, e.clientY, true);

    if (activeTool === 'addNode') {
      const nextId = exState.nodes.reduce((m, n) => Math.max(m, n.id), 0) + 1;
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const nextLabel = alphabet[(nextId - 1) % alphabet.length] || `N${nextId}`;
      const newNode = {
        id: nextId,
        label: nextLabel,
        x: wPos.x,
        y: wPos.y,
        support: 'free',
        rollerAngle: 0,
        fx: 0,
        fy: 0,
        mz: 0
      };
      pushState((prev) => ({ ...prev, id: 'custom', nodes: [...prev.nodes, newNode] }));
      setSelectedNodeId(nextId);
      setSelectedElemId(null);
      return;
    }

    if (activeTool === 'addBar' && connectStartNodeId) {
      // Create a new node at clicked grid intersection and connect bar to it
      const nextNodeId = exState.nodes.reduce((m, n) => Math.max(m, n.id), 0) + 1;
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const nextLabel = alphabet[(nextNodeId - 1) % alphabet.length] || `N${nextNodeId}`;
      const startNode = exState.nodes.find((n) => n.id === connectStartNodeId);
      if (startNode) {
        const dx = wPos.x - startNode.x;
        const dy = wPos.y - startNode.y;
        const L = Number((Math.hypot(dx, dy) || 1).toFixed(4));
        const th = Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(3));
        const nextElId = exState.elements.reduce((m, el) => Math.max(m, el.id), 0) + 1;
        pushState((prev) => ({
          ...prev,
          id: 'custom',
          nodes: [
            ...prev.nodes,
            { id: nextNodeId, label: nextLabel, x: wPos.x, y: wPos.y, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
          ],
          elements: [
            ...prev.elements,
            { id: nextElId, n1: connectStartNodeId, n2: nextNodeId, E: 1, A: 1, I: 1, k: 1, L, th1: th, th2: th, p0: 0, pL: 0, py: '' }
          ]
        }));
        setConnectStartNodeId(nextNodeId);
        setSelectedElemId(nextElId);
        setSelectedNodeId(null);
      }
      return;
    }

    // Start panning if clicking empty space in select/move mode
    setSelectedNodeId(null);
    setSelectedElemId(null);
    setConnectStartNodeId(null);
    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      vbX: viewBox.x,
      vbY: viewBox.y
    };
  };

  // Node Pointer Down
  const handleNodePointerDown = (e, node) => {
    e.stopPropagation();
    if (activeTool === 'delete') {
      if (exState.nodes.length <= 1) return;
      pushState((prev) => ({
        ...prev,
        id: 'custom',
        nodes: prev.nodes.filter((n) => n.id !== node.id),
        elements: prev.elements.filter((el) => el.n1 !== node.id && el.n2 !== node.id)
      }));
      if (selectedNodeId === node.id) setSelectedNodeId(null);
      return;
    }

    if (activeTool === 'support') {
      cycleNodeSupport(node.id);
      setSelectedNodeId(node.id);
      setSelectedElemId(null);
      return;
    }

    if (activeTool === 'load') {
      setSelectedNodeId(node.id);
      setSelectedElemId(null);
      if (Math.abs(node.fx || 0) < 1e-9 && Math.abs(node.fy || 0) < 1e-9) {
        pushState((prev) => ({
          ...prev,
          id: 'custom',
          nodes: prev.nodes.map((n) => (n.id === node.id ? { ...n, fy: -1 } : n))
        }));
      }
      return;
    }

    if (activeTool === 'addBar') {
      if (!connectStartNodeId) {
        setConnectStartNodeId(node.id);
        setSelectedNodeId(node.id);
      } else if (connectStartNodeId !== node.id) {
        const startNode = exState.nodes.find((n) => n.id === connectStartNodeId);
        if (startNode) {
          const dx = node.x - startNode.x;
          const dy = node.y - startNode.y;
          const L = Number((Math.hypot(dx, dy) || 1).toFixed(4));
          const th = Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(3));
          const nextElId = exState.elements.reduce((m, el) => Math.max(m, el.id), 0) + 1;
          pushState((prev) => ({
            ...prev,
            id: 'custom',
            elements: [
              ...prev.elements,
              { id: nextElId, n1: connectStartNodeId, n2: node.id, E: 1, A: 1, I: 1, k: 1, L, th1: th, th2: th, p0: 0, pL: 0, py: '' }
            ]
          }));
          setConnectStartNodeId(null);
          setSelectedElemId(nextElId);
          setSelectedNodeId(null);
        }
      } else {
        setConnectStartNodeId(null);
      }
      return;
    }

    // Default ('select', 'move', 'addNode'): select node AND initiate smooth drag
    setSelectedNodeId(node.id);
    setSelectedElemId(null);
    setDraggingNodeId(node.id);
  };

  // Element Click
  const handleElementPointerDown = (e, elem) => {
    e.stopPropagation();
    if (activeTool === 'delete') {
      pushState((prev) => ({
        ...prev,
        id: 'custom',
        elements: prev.elements.filter((el) => el.id !== elem.id)
      }));
      if (selectedElemId === elem.id) setSelectedElemId(null);
      return;
    }
    setSelectedElemId(elem.id);
    setSelectedNodeId(null);
    if (activeTool === 'load' && Math.abs(elem.p0 || 0) < 1e-9 && Math.abs(elem.pL || 0) < 1e-9 && !elem.py) {
      pushState((prev) => ({
        ...prev,
        id: 'custom',
        elements: prev.elements.map((el) => (el.id === elem.id ? { ...el, p0: -1, pL: -1 } : el))
      }));
    }
  };

  // Update Selected Node Properties from Floating HUD
  const updateNodeProp = (nodeId, patch) => {
    pushState((prev) => {
      const updatedNodes = prev.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n));
      const nMap = {};
      updatedNodes.forEach((n) => (nMap[n.id] = n));
      const updatedElems = prev.elements.map((el) => {
        if ((patch.x !== undefined || patch.y !== undefined) && (el.n1 === nodeId || el.n2 === nodeId)) {
          const n1 = nMap[el.n1];
          const n2 = nMap[el.n2];
          if (n1 && n2) {
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const newL = Number((Math.hypot(dx, dy) || 1).toFixed(4));
            const newTh = Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(3));
            return {
              ...el,
              L: el.lockL ? el.L : newL,
              th1: el.customAngles ? el.th1 : newTh,
              th2: el.customAngles ? el.th2 : newTh
            };
          }
        }
        return el;
      });
      return { ...prev, id: 'custom', nodes: updatedNodes, elements: updatedElems };
    });
  };

  // Update Selected Element Properties from Floating HUD (including resizing bar geometry!)
  const updateElemProp = (elemId, patch, moveNode2 = false) => {
    pushState((prev) => {
      const targetEl = prev.elements.find((e) => e.id === elemId);
      if (!targetEl) return prev;
      const mergedEl = { ...targetEl, ...patch };
      let updatedNodes = prev.nodes;

      if (moveNode2 && (patch.L !== undefined || patch.th1 !== undefined)) {
        const n1 = prev.nodes.find((n) => n.id === mergedEl.n1);
        if (n1) {
          const Lval = Number(mergedEl.L) || 1;
          const thVal = Number(mergedEl.th1) || 0;
          const newX2 = Number((n1.x + Lval * cosd(thVal)).toFixed(4));
          const newY2 = Number((n1.y + Lval * sind(thVal)).toFixed(4));
          updatedNodes = prev.nodes.map((n) =>
            n.id === mergedEl.n2 ? { ...n, x: newX2, y: newY2 } : n
          );
        }
      }

      const updatedElems = prev.elements.map((el) => (el.id === elemId ? mergedEl : el));
      return { ...prev, id: 'custom', nodes: updatedNodes, elements: updatedElems };
    });
  };

  const selectedNode = exState.nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedElem = analysis.mcRows.find((el) => el.id === selectedElemId) || null;

  // Compute grid lines inside current viewBox in exact World Units
  const gridLines = useMemo(() => {
    const step = 0.25 * SCALE; // 40px = L/4
    const startX = Math.floor(viewBox.x / step) * step;
    const endX = Math.ceil((viewBox.x + viewBox.w) / step) * step;
    const startY = Math.floor(viewBox.y / step) * step;
    const endY = Math.ceil((viewBox.y + viewBox.h) / step) * step;

    const vLines = [];
    for (let x = startX; x <= endX; x += step) {
      const isMajor = Math.abs(x % SCALE) < 1e-3;
      const isHalf = Math.abs(x % (SCALE / 2)) < 1e-3;
      vLines.push({ x, isMajor, isHalf, label: isMajor ? `${Math.round(x / SCALE)}L` : null });
    }
    const hLines = [];
    for (let y = startY; y <= endY; y += step) {
      const isMajor = Math.abs(y % SCALE) < 1e-3;
      const isHalf = Math.abs(y % (SCALE / 2)) < 1e-3;
      hLines.push({ y, isMajor, isHalf, label: isMajor ? `${Math.round(-y / SCALE)}L` : null });
    }
    return { vLines, hLines };
  }, [viewBox]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none">
      {/* ===================================================================
          TOP HEADER BAR: MODE SELECTOR & 15 SEBENTA EXERCISES
      =================================================================== */}
      <header className="bg-slate-900 text-white px-4 py-2.5 shadow-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-black text-base shadow-inner">
            MEF
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base tracking-tight flex items-center gap-2">
              MEF Studio — Construtor Interativo & Solucionador Sebenta
            </h1>
            <p className="text-[11px] text-slate-400">
              Arraste nós na grelha, clique nas barras/apoios para editar e veja a resolução simbólica passo a passo
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
          {[
            { id: 'Barra2D', label: 'Barra 2D (Treliça)' },
            { id: 'Viga', label: 'Viga (Flexão)' },
            { id: 'VigaBarra2D', label: 'Pórtico 2D (Viga-Barra)' },
            { id: 'Mola', label: 'Molas 1D' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => pushState((prev) => ({ ...prev, id: 'custom', mode: m.id }))}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                exState.mode === m.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Preset Exercise Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Exercício da Sebenta:</span>
          <select
            value={exState.id === 'custom' ? 'custom' : exState.id}
            onChange={(e) => {
              if (e.target.value !== 'custom') selectPreset(e.target.value);
            }}
            className="bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-400"
          >
            {SEBENTA_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
            {exState.id === 'custom' && <option value="custom">★ Exercício Personalizado / Editado</option>}
          </select>

          <button
            onClick={() => selectPreset('blank')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1"
            title="Criar novo exercício em branco"
          >
            <Plus className="w-3.5 h-3.5" /> Novo
          </button>
        </div>
      </header>

      {/* Quick Numbered Exercise Pills (1 to 15) */}
      <div className="bg-slate-800/95 text-slate-200 px-4 py-1.5 border-b border-slate-700 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
          Sebenta PDF:
        </span>
        {SEBENTA_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => selectPreset(p.id)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition shrink-0 ${
              exState.id === p.id
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Ex. {p.num}
          </button>
        ))}
      </div>

      {/* ===================================================================
          MAIN WORKSPACE: LEFT VISUAL BUILDER + RIGHT STEP-BY-STEP SEBENTA
      =================================================================== */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* LEFT COLUMN: INTERACTIVE BRIDGE-BUILDER VISUAL CANVAS */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col border-r border-slate-300 bg-white relative">
          {/* Canvas Toolbar */}
          <div className="p-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'select', icon: MousePointer, label: 'Selecionar / Mover' },
                { id: 'move', icon: Move, label: 'Mover Nós' },
                { id: 'addNode', icon: Plus, label: '+Nó' },
                { id: 'addBar', icon: Link2, label: '+Barra' },
                { id: 'support', icon: Anchor, label: 'Apoios Rolantes/Fixos' },
                { id: 'load', icon: ArrowDown, label: 'Força / Carga' },
                { id: 'delete', icon: Trash2, label: 'Apagar' }
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTool(t.id);
                      setConnectStartNodeId(null);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      active
                        ? t.id === 'delete'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <span className="text-slate-500 mr-1 font-medium">Grelha:</span>
                <select
                  value={snapStep}
                  onChange={(e) => setSnapStep(Number(e.target.value))}
                  className="font-bold text-slate-800 bg-transparent focus:outline-none"
                >
                  <option value={0.5}>0.5L (L/2)</option>
                  <option value={0.25}>0.25L (L/4)</option>
                  <option value={0.1}>0.1L</option>
                  <option value={0}>Livre</option>
                </select>
              </div>

              <button
                onClick={() => setShowDofs((v) => !v)}
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                  showDofs
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
                title="Mostrar/Ocultar Graus de Liberdade (u₁, u₂...)"
              >
                G.D.L. {showDofs ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                title="Desfazer última ação"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Canvas */}
          <div className="relative flex-1 min-h-[460px] bg-[#f8fafc] overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              className={`w-full h-full block touch-none ${
                isPanning
                  ? 'cursor-grabbing'
                  : activeTool === 'addNode' || activeTool === 'addBar'
                  ? 'cursor-crosshair'
                  : 'cursor-default'
              }`}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={(e) => {
                const wPos = getWorldCoordsFromEvent(e.clientX, e.clientY, true);
                setHoverWorld({ x: wPos.x, y: wPos.y, visible: true });
              }}
              onPointerLeave={() => setHoverWorld((h) => ({ ...h, visible: false }))}
            >
              <defs>
                <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
                </marker>
                <marker id="arrow-force" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#0f172a" />
                </marker>
                <marker id="arrow-dist" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
                </marker>
              </defs>

              {/* 1. WORLD-COORDINATE ALIGNED GRID */}
              <g className="pointer-events-none">
                {gridLines.vLines.map((gl, idx) => (
                  <g key={`vx-${idx}`}>
                    <line
                      x1={gl.x}
                      y1={viewBox.y}
                      x2={gl.x}
                      y2={viewBox.y + viewBox.h}
                      stroke={gl.isMajor ? '#cbd5e1' : gl.isHalf ? '#e2e8f0' : '#f1f5f9'}
                      strokeWidth={gl.isMajor ? 1.4 : 1}
                    />
                    {gl.label && (
                      <text
                        x={gl.x + 4}
                        y={viewBox.y + viewBox.h - 10}
                        fontSize="10"
                        fontWeight="700"
                        fill="#94a3b8"
                      >
                        {gl.label}
                      </text>
                    )}
                  </g>
                ))}
                {gridLines.hLines.map((hl, idx) => (
                  <g key={`hy-${idx}`}>
                    <line
                      x1={viewBox.x}
                      y1={hl.y}
                      x2={viewBox.x + viewBox.w}
                      y2={hl.y}
                      stroke={hl.isMajor ? '#cbd5e1' : hl.isHalf ? '#e2e8f0' : '#f1f5f9'}
                      strokeWidth={hl.isMajor ? 1.4 : 1}
                    />
                    {hl.label && (
                      <text x={viewBox.x + 8} y={hl.y - 4} fontSize="10" fontWeight="700" fill="#94a3b8">
                        {hl.label}
                      </text>
                    )}
                  </g>
                ))}
              </g>

              {/* 2. GHOST LINE WHEN ADDING A BAR */}
              {activeTool === 'addBar' &&
                connectStartNodeId &&
                hoverWorld.visible &&
                (() => {
                  const startN = exState.nodes.find((n) => n.id === connectStartNodeId);
                  if (!startN) return null;
                  const p1 = worldToSvg(startN.x, startN.y);
                  const p2 = worldToSvg(hoverWorld.x, hoverWorld.y);
                  const dL = Math.hypot(hoverWorld.x - startN.x, hoverWorld.y - startN.y);
                  const dTh = (Math.atan2(hoverWorld.y - startN.y, hoverWorld.x - startN.x) * 180) / Math.PI;
                  return (
                    <g className="pointer-events-none">
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#2563eb"
                        strokeWidth="3.5"
                        strokeDasharray="6 4"
                      />
                      <rect
                        x={(p1.x + p2.x) / 2 - 48}
                        y={(p1.y + p2.y) / 2 - 26}
                        width="96"
                        height="20"
                        rx="5"
                        fill="#1e3a8a"
                      />
                      <text
                        x={(p1.x + p2.x) / 2}
                        y={(p1.y + p2.y) / 2 - 12}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {fmtSymbolicL(dL)} ({fmtNum(dTh, 1)}°)
                      </text>
                    </g>
                  );
                })()}

              {/* 3. BARS, BEAMS, SPRINGS & DISTRIBUTED LOADS */}
              {analysis.mcRows.map((row) => {
                const n1 = exState.nodes.find((n) => n.id === row.n1);
                const n2 = exState.nodes.find((n) => n.id === row.n2);
                if (!n1 || !n2) return null;
                const p1 = worldToSvg(n1.x, n1.y);
                const p2 = worldToSvg(n2.x, n2.y);
                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const lenPx = Math.hypot(dx, dy) || 1;
                const ux = dx / lenPx;
                const uy = dy / lenPx;
                // Normal vector pointing "upward" relative to the element
                const nx = uy;
                const ny = -ux;

                const isSelected = selectedElemId === row.id;
                const isTarget = exState.targetBar === row.index;

                // Distributed Load Comb rendering
                const hasDist =
                  Boolean(row.py && row.py.trim() !== '') ||
                  Math.abs(row.p0 || 0) > 1e-9 ||
                  Math.abs(row.pL || 0) > 1e-9;

                // Spring Zig-Zag Path if mode === 'Mola' or L === 0
                let springPath = null;
                if (exState.mode === 'Mola') {
                  const coils = 8;
                  const amp = 10;
                  let d = `M ${p1.x} ${p1.y}`;
                  const lead = 0.15;
                  d += ` L ${p1.x + dx * lead} ${p1.y + dy * lead}`;
                  for (let k = 1; k <= coils; k++) {
                    const t = lead + ((1 - 2 * lead) * (k - 0.5)) / coils;
                    const side = k % 2 === 0 ? 1 : -1;
                    d += ` L ${p1.x + dx * t + nx * amp * side} ${p1.y + dy * t + ny * amp * side}`;
                  }
                  d += ` L ${p1.x + dx * (1 - lead)} ${p1.y + dy * (1 - lead)} L ${p2.x} ${p2.y}`;
                  springPath = d;
                }

                // Prop text label (e.g. "2E,A", "E,2A", "k", etc.)
                const propLabel =
                  exState.mode === 'Mola'
                    ? `${fmtNum(row.k)}k`
                    : exState.mode === 'Viga'
                    ? `${row.E !== 1 ? `${fmtNum(row.E)}E,` : 'E,'}${row.I !== 1 ? `${fmtNum(row.I)}I` : 'I'} (${fmtSymbolicL(row.L)})`
                    : `${row.E !== 1 ? `${fmtNum(row.E)}E,` : 'E,'}${row.A !== 1 ? `${fmtNum(row.A)}A` : 'A'} (${fmtSymbolicL(row.L)})`;

                return (
                  <g
                    key={row.id}
                    data-interactive="true"
                    onPointerDown={(e) => handleElementPointerDown(e, row)}
                    className="cursor-pointer group"
                  >
                    {/* Distributed Load Arrows & Profile */}
                    {hasDist &&
                      (() => {
                        const nArrows = 7;
                        const maxH = 38;
                        const pts = [];
                        const arrows = [];
                        for (let k = 0; k <= nArrows; k++) {
                          const xi = k / nArrows;
                          const bx = p1.x + dx * xi;
                          const by = p1.y + dy * xi;
                          let val = 0;
                          if (row.py && row.py.trim() !== '') {
                            val = evalCustomLoadAt(row.py, xi * row.L, row.L);
                          } else {
                            val = (row.p0 || 0) + ((row.pL || 0) - (row.p0 || 0)) * xi;
                          }
                          const sign = val >= 0 ? 1 : -1;
                          const mag = Math.min(1.5, Math.abs(val) / Math.max(1, Math.abs(row.p0 || 0), Math.abs(row.pL || 0)));
                          const h = Math.max(12, mag * maxH);
                          const tx = bx - nx * h * sign;
                          const ty = by - ny * h * sign;
                          pts.push(`${tx},${ty}`);
                          if (Math.abs(val) > 1e-6) {
                            arrows.push({ x1: tx, y1: ty, x2: bx - nx * 4 * sign, y2: by - ny * 4 * sign });
                          }
                        }
                        const polyPts = `${p1.x},${p1.y} ${pts.join(' ')} ${p2.x},${p2.y}`;
                        return (
                          <g className="pointer-events-none">
                            <polygon points={polyPts} fill="rgba(37, 99, 235, 0.10)" stroke="#2563eb" strokeWidth="1.3" />
                            {arrows.map((ar, aIdx) => (
                              <line
                                key={aIdx}
                                x1={ar.x1}
                                y1={ar.y1}
                                x2={ar.x2}
                                y2={ar.y2}
                                stroke="#2563eb"
                                strokeWidth="1.5"
                                markerEnd="url(#arrow-dist)"
                              />
                            ))}
                            <text
                              x={mx - nx * 46}
                              y={my - ny * 46}
                              textAnchor="middle"
                              fill="#1d4ed8"
                              fontSize="11"
                              fontWeight="800"
                            >
                              {row.py && row.py.trim() !== ''
                                ? `p(x) = ${row.py}`
                                : Math.abs((row.p0 || 0) - (row.pL || 0)) < 1e-6
                                ? `${fmtNum(Math.abs(row.p0))}p`
                                : `${fmtNum(Math.abs(row.p0))}p → ${fmtNum(Math.abs(row.pL))}p`}
                            </text>
                          </g>
                        );
                      })()}

                    {/* Invisible thick hit-area for easy clicking */}
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth="22" />

                    {/* Element Body */}
                    {springPath ? (
                      <path
                        d={springPath}
                        fill="none"
                        stroke={isSelected ? '#2563eb' : '#1e293b'}
                        strokeWidth={isSelected ? 4 : 3}
                      />
                    ) : (
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={isSelected ? '#2563eb' : isTarget ? '#0284c7' : '#0f172a'}
                        strokeWidth={isSelected ? 6 : 4.2}
                        strokeLinecap="round"
                      />
                    )}

                    {/* Angle Arc / Badge near Node 1 */}
                    {showAngles && exState.mode !== 'Mola' && (
                      <text
                        x={p1.x + dx * 0.24 - nx * 16}
                        y={p1.y + dy * 0.24 - ny * 16}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="800"
                        fill="#2563eb"
                      >
                        {row.th1 !== row.th2
                          ? `${fmtNum(row.th1, 1)}°/${fmtNum(row.th2, 1)}°`
                          : `${fmtNum(row.th1, 1)}°`}
                      </text>
                    )}

                    {/* Circled Red Element Number ①, ②, ③ */}
                    <g transform={`translate(${mx + nx * 22}, ${my + ny * 22})`}>
                      <circle r="12" fill="#ffffff" stroke="#dc2626" strokeWidth="2.2" />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#dc2626"
                        fontSize="12"
                        fontWeight="900"
                      >
                        {row.index}
                      </text>
                    </g>

                    {/* Clickable Material/Length Pill */}
                    <g transform={`translate(${mx - nx * 20}, ${my - ny * 20})`}>
                      <rect
                        x="-42"
                        y="-10"
                        width="84"
                        height="19"
                        rx="5"
                        fill={isSelected ? '#dbeafe' : 'rgba(255,255,255,0.92)'}
                        stroke={isSelected ? '#2563eb' : '#cbd5e1'}
                        strokeWidth="1.2"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#0f172a"
                        fontSize="10.5"
                        fontWeight="700"
                      >
                        {propLabel}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* 4. SUPPORTS, NODES, NODAL FORCES & RED DOF ARROWS */}
              {exState.nodes.map((node) => {
                const pos = worldToSvg(node.x, node.y);
                const isSelected = selectedNodeId === node.id;
                const isConnectStart = connectStartNodeId === node.id;
                const sup = node.support || 'free';
                const d = analysis.nodeDofs[node.id] || {};

                // Nodal Force Vector
                const fx = Number(node.fx) || 0;
                const fy = Number(node.fy) || 0;
                const hasForce = Math.abs(fx) > 1e-9 || Math.abs(fy) > 1e-9;

                return (
                  <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                    {/* SUPPORT GRAPHICS (APOIO FIXO, APOIO ROLANTE, ENCASTRAMENTO, SIMETRIA) */}
                    {sup === 'pinned' && (
                      <g className="pointer-events-none">
                        <polygon points="0,4 -16,26 16,26" fill="#f8fafc" stroke="#334155" strokeWidth="2.2" />
                        <line x1="-22" y1="26" x2="22" y2="26" stroke="#334155" strokeWidth="2.5" />
                        {[-16, -8, 0, 8, 16].map((hx, i) => (
                          <line key={i} x1={hx} y1="26" x2={hx - 5} y2="34" stroke="#64748b" strokeWidth="1.6" />
                        ))}
                      </g>
                    )}

                    {(sup === 'rollerX' || sup === 'rollerY' || sup === 'rollerAngle') &&
                      (() => {
                        const rot =
                          sup === 'rollerY'
                            ? -90
                            : sup === 'rollerAngle'
                            ? -(Number(node.rollerAngle) || 0)
                            : 0;
                        return (
                          <g transform={`rotate(${rot})`} className="pointer-events-none">
                            <polygon points="0,4 -15,22 15,22" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
                            <circle cx="-8" cy="26" r="3.5" fill="#ffffff" stroke="#334155" strokeWidth="1.8" />
                            <circle cx="8" cy="26" r="3.5" fill="#ffffff" stroke="#334155" strokeWidth="1.8" />
                            <line x1="-22" y1="30" x2="22" y2="30" stroke="#334155" strokeWidth="2.2" />
                            {[-15, -7, 1, 9, 17].map((hx, i) => (
                              <line key={i} x1={hx} y1="30" x2={hx - 5} y2="37" stroke="#64748b" strokeWidth="1.5" />
                            ))}
                            {sup === 'rollerAngle' && (
                              <text x="26" y="26" fill="#0284c7" fontSize="10.5" fontWeight="800">
                                α={node.rollerAngle}°
                              </text>
                            )}
                          </g>
                        );
                      })()}

                    {sup === 'fixed' && (
                      <g className="pointer-events-none">
                        <line x1="-20" y1="10" x2="20" y2="10" stroke="#0f172a" strokeWidth="3.5" />
                        {[-16, -8, 0, 8, 16].map((hx, i) => (
                          <line key={i} x1={hx} y1="10" x2={hx - 6} y2="20" stroke="#475569" strokeWidth="1.8" />
                        ))}
                      </g>
                    )}

                    {sup === 'guided' && (
                      <g className="pointer-events-none">
                        <line x1="10" y1="-20" x2="10" y2="20" stroke="#0f172a" strokeWidth="2.5" />
                        <circle cx="6" cy="-10" r="3" fill="#fff" stroke="#0f172a" strokeWidth="1.6" />
                        <circle cx="6" cy="10" r="3" fill="#fff" stroke="#0f172a" strokeWidth="1.6" />
                        <text x="16" y="4" fontSize="9.5" fontWeight="800" fill="#0369a1">
                          Simetria
                        </text>
                      </g>
                    )}

                    {/* RED GLOBAL DOF ARROWS (u₁, u₂, u₃...) — OFFSET TO PREVENT COLLISIONS */}
                    {showDofs && (
                      <g className="pointer-events-none">
                        {d.u > 0 &&
                          (() => {
                            const ang = d.isInclined ? -(d.rollerAngle || 0) : 0;
                            return (
                              <g transform={`rotate(${ang})`}>
                                <line
                                  x1="12"
                                  y1="0"
                                  x2="52"
                                  y2="0"
                                  stroke="#dc2626"
                                  strokeWidth="2.6"
                                  markerEnd="url(#arrow-red)"
                                />
                                <text
                                  x="60"
                                  y="4"
                                  fill="#dc2626"
                                  fontSize="13.5"
                                  fontWeight="900"
                                  fontStyle="italic"
                                >
                                  u{toUnicodeSub(d.u)}
                                </text>
                              </g>
                            );
                          })()}

                        {d.v > 0 && (
                          <g>
                            <line
                              x1="0"
                              y1="-12"
                              x2="0"
                              y2="-52"
                              stroke="#dc2626"
                              strokeWidth="2.6"
                              markerEnd="url(#arrow-red)"
                            />
                            <text
                              x="10"
                              y="-46"
                              fill="#dc2626"
                              fontSize="13.5"
                              fontWeight="900"
                              fontStyle="italic"
                            >
                              u{toUnicodeSub(d.v)}
                            </text>
                          </g>
                        )}

                        {d.th > 0 && (
                          <g>
                            <path
                              d="M 16 -12 A 20 20 0 1 0 -16 -12"
                              fill="none"
                              stroke="#dc2626"
                              strokeWidth="2.2"
                              markerEnd="url(#arrow-red)"
                            />
                            <text
                              x="-32"
                              y="-18"
                              fill="#dc2626"
                              fontSize="13"
                              fontWeight="900"
                              fontStyle="italic"
                            >
                              u{toUnicodeSub(d.th)}
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* APPLIED NODAL FORCE ARROWS (P, 2P, 3F...) — OFFSET FROM DOF ARROWS */}
                    {hasForce &&
                      (() => {
                        const fSym = exState.forceSym || 'P';
                        // Check if polar force (like 2P at 20° in Ex. 5)
                        if (node.forceMag && node.forceAngle !== undefined) {
                          const ang = Number(node.forceAngle) || 0;
                          const len = 58;
                          const x2 = len * cosd(ang);
                          const y2 = -len * sind(ang);
                          return (
                            <g className="pointer-events-none">
                              <line
                                x1="0"
                                y1="0"
                                x2={x2}
                                y2={y2}
                                stroke="#0f172a"
                                strokeWidth="3"
                                markerEnd="url(#arrow-force)"
                              />
                              <text
                                x={x2 + 8}
                                y={y2 - 4}
                                fill="#0f172a"
                                fontSize="13"
                                fontWeight="900"
                              >
                                {fmtNum(node.forceMag)}
                                {fSym} ({ang}°)
                              </text>
                            </g>
                          );
                        }

                        return (
                          <g className="pointer-events-none">
                            {Math.abs(fx) > 1e-9 && (
                              <g>
                                <line
                                  x1={fx > 0 ? -58 : 58}
                                  y1="-14"
                                  x2={fx > 0 ? -13 : 13}
                                  y2="-14"
                                  stroke="#0f172a"
                                  strokeWidth="3"
                                  markerEnd="url(#arrow-force)"
                                />
                                <text
                                  x={fx > 0 ? -64 : 64}
                                  y="-10"
                                  textAnchor={fx > 0 ? 'end' : 'start'}
                                  fill="#0f172a"
                                  fontSize="13.5"
                                  fontWeight="900"
                                >
                                  {Math.abs(fx) === 1 ? '' : fmtNum(Math.abs(fx))}
                                  {fSym}
                                </text>
                              </g>
                            )}
                            {Math.abs(fy) > 1e-9 && (
                              <g>
                                <line
                                  x1="-14"
                                  y1={fy < 0 ? -62 : 62}
                                  x2="-14"
                                  y2={fy < 0 ? -13 : 13}
                                  stroke="#0f172a"
                                  strokeWidth="3"
                                  markerEnd="url(#arrow-force)"
                                />
                                <text
                                  x="-20"
                                  y={fy < 0 ? -52 : 58}
                                  textAnchor="end"
                                  fill="#0f172a"
                                  fontSize="13.5"
                                  fontWeight="900"
                                >
                                  {Math.abs(fy) === 1 ? '' : fmtNum(Math.abs(fy))}
                                  {fSym}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })()}

                    {/* INTERACTIVE NODE CIRCLE */}
                    <circle
                      data-interactive="true"
                      r={isSelected || isConnectStart ? 11 : 8.5}
                      fill={isConnectStart ? '#10b981' : isSelected ? '#f59e0b' : '#ffffff'}
                      stroke={isConnectStart ? '#047857' : isSelected ? '#b45309' : '#0f172a'}
                      strokeWidth="3"
                      className="cursor-grab active:cursor-grabbing transition-transform"
                      onPointerDown={(e) => handleNodePointerDown(e, node)}
                    />

                    {/* NODE LABEL (A, B, C, D) */}
                    <text
                      x="-16"
                      y="5"
                      textAnchor="end"
                      fill="#0f172a"
                      fontSize="13.5"
                      fontWeight="900"
                      className="pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}

              {/* 5. GHOST CURSOR ALIGNED EXACTLY ON GRID INTERSECTION */}
              {hoverWorld.visible && (activeTool === 'addNode' || activeTool === 'addBar') && (
                <g
                  transform={`translate(${hoverWorld.x * SCALE}, ${-hoverWorld.y * SCALE})`}
                  className="pointer-events-none"
                >
                  <circle
                    r="8"
                    fill="rgba(37, 99, 235, 0.25)"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                  <text x="12" y="-10" fontSize="10" fontWeight="700" fill="#2563eb">
                    ({fmtNum(hoverWorld.x, 2)}L, {fmtNum(hoverWorld.y, 2)}L)
                  </text>
                </g>
              )}
            </svg>

            {/* Bottom-Left Zoom & Fit Controls */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-lg shadow-md border border-slate-200">
              <button
                onClick={() =>
                  setViewBox((vb) => ({
                    x: vb.x + vb.w * 0.1,
                    y: vb.y + vb.h * 0.1,
                    w: vb.w * 0.8,
                    h: vb.h * 0.8
                  }))
                }
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
                title="Aproximar (Zoom In)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setViewBox((vb) => ({
                    x: vb.x - vb.w * 0.125,
                    y: vb.y - vb.h * 0.125,
                    w: vb.w * 1.25,
                    h: vb.h * 1.25
                  }))
                }
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
                title="Afastar (Zoom Out)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => centerViewOnStructure()}
                className="p-1 hover:bg-slate-100 rounded text-slate-700 flex items-center gap-1 text-xs font-bold px-1.5"
                title="Centrar Estrutura"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Centrar
              </button>
            </div>

            {/* ===============================================================
                ON-CANVAS FLOATING HUD EDITOR FOR SELECTED NODE
            =============================================================== */}
            {selectedNode && (
              <div className="absolute top-3 right-3 w-80 bg-white/98 backdrop-blur-md rounded-xl shadow-xl border border-slate-300 p-3.5 z-10 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black flex items-center justify-center">
                      {selectedNode.label}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Editar Nó {selectedNode.label}</h3>
                      <p className="text-[10px] text-slate-500">Coordenadas, Apoio Rolante/Fixo e Forças</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Coordinates (x/L, y/L) & Label */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Etiqueta</label>
                    <input
                      type="text"
                      value={selectedNode.label}
                      onChange={(e) => updateNodeProp(selectedNode.id, { label: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Pos X (em L)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={selectedNode.x}
                      onChange={(e) => updateNodeProp(selectedNode.id, { x: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Pos Y (em L)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={selectedNode.y}
                      onChange={(e) => updateNodeProp(selectedNode.id, { y: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Support Type Selector (with "Apoio Rolante") */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Tipo de Apoio (Condição de Fronteira)
                  </label>
                  <select
                    value={selectedNode.support || 'free'}
                    onChange={(e) => {
                      const sup = e.target.value;
                      updateNodeProp(selectedNode.id, {
                        support: sup,
                        rollerAngle: sup === 'rollerAngle' ? selectedNode.rollerAngle || 30 : 0
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
                  >
                    <option value="free">Livre (Sem Apoio)</option>
                    <option value="pinned">Apoio Fixo / Duplo (u=0, v=0)</option>
                    <option value="rollerX">Apoio Rolante Horizontal 0° (u livre, v=0)</option>
                    <option value="rollerY">Apoio Rolante Vertical 90° (u=0, v livre)</option>
                    <option value="rollerAngle">Apoio Rolante Inclinado α° (Ex. 4 / Ex. 5)</option>
                    <option value="fixed">Encastramento (u=0, v=0, θ=0)</option>
                    <option value="guided">Apoio Guiado / Simetria (v livre, θ=0 — Ex. 8)</option>
                  </select>
                </div>

                {/* Inclined Roller Angle α */}
                {selectedNode.support === 'rollerAngle' && (
                  <div className="bg-blue-50/80 p-2 rounded-lg border border-blue-200">
                    <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">
                      Ângulo do Apoio Rolante Inclinado α (°)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="5"
                        value={selectedNode.rollerAngle || 0}
                        onChange={(e) =>
                          updateNodeProp(selectedNode.id, { rollerAngle: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1 bg-white border border-blue-300 rounded font-mono font-bold"
                      />
                      {[-30, -20, 20, 30, 45].map((ang) => (
                        <button
                          key={ang}
                          onClick={() => updateNodeProp(selectedNode.id, { rollerAngle: ang })}
                          className="px-2 py-1 bg-white hover:bg-blue-100 border border-blue-300 rounded font-bold text-[11px]"
                        >
                          {ang}°
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reaction Calculation Toggle for Viga (Ex. 9) */}
                {exState.mode === 'Viga' && selectedNode.support === 'pinned' && (
                  <label className="flex items-center gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedNode.calcReactionY)}
                      onChange={(e) => updateNodeProp(selectedNode.id, { calcReactionY: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span className="font-bold text-amber-900 text-[11px]">
                      Calcular Reação R no Apoio (+1 G.D.L. com u=0, como no Ex. 9)
                    </span>
                  </label>
                )}

                {/* Nodal Forces Fx, Fy, or Polar (Mag + Angle) */}
                <div className="border-t border-slate-200 pt-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Forças Aplicadas no Nó (em múltiplos de {exState.forceSym || 'P'})
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold">Força Fx ({exState.forceSym || 'P'}):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedNode.fx || 0}
                        onChange={(e) =>
                          updateNodeProp(selectedNode.id, {
                            fx: parseFloat(e.target.value) || 0,
                            forceMag: null
                          })
                        }
                        className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold">Força Fy ({exState.forceSym || 'P'}):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedNode.fy || 0}
                        onChange={(e) =>
                          updateNodeProp(selectedNode.id, {
                            fy: parseFloat(e.target.value) || 0,
                            forceMag: null
                          })
                        }
                        className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Quick Polar Force Input (e.g. 2P at 20° in Ex. 5) */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500">Atalhos:</span>
                    {[
                      { label: 'Zero', fx: 0, fy: 0 },
                      { label: '+P →', fx: 1, fy: 0 },
                      { label: '2P →', fx: 2, fy: 0 },
                      { label: '-P ↓', fx: 0, fy: -1 },
                      { label: '-2P ↓', fx: 0, fy: -2 },
                      {
                        label: '2P ∠20°',
                        fx: Number((2 * cosd(20)).toFixed(4)),
                        fy: Number((2 * sind(20)).toFixed(4)),
                        forceMag: 2,
                        forceAngle: 20
                      }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          updateNodeProp(selectedNode.id, {
                            fx: preset.fx,
                            fy: preset.fy,
                            forceMag: preset.forceMag || null,
                            forceAngle: preset.forceAngle
                          })
                        }
                        className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 border border-slate-300 rounded text-[10px] font-bold"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                ON-CANVAS FLOATING HUD EDITOR FOR SELECTED BAR / BEAM
            =============================================================== */}
            {selectedElem && (
              <div className="absolute top-3 right-3 w-84 bg-white/98 backdrop-blur-md rounded-xl shadow-xl border border-slate-300 p-3.5 z-10 text-xs space-y-3 max-h-[94%] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <CircledNum n={selectedElem.index} />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Barra / Elemento {selectedElem.index} ({selectedElem.n1Label}–{selectedElem.n2Label})
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Personalizar L, ângulos θ, E, A, I, cargas p(x) e ponto de cálculo
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedElemId(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Length L Customization + Geometry Resize Toggle */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-700 uppercase">
                      Comprimento da Barra L (múltiplo de L)
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resizeGeometryOnL}
                        onChange={(e) => setResizeGeometryOnL(e.target.checked)}
                      />
                      Mover 2.º Nó
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={selectedElem.L}
                      onChange={(e) =>
                        updateElemProp(
                          selectedElem.id,
                          { L: Math.max(0.05, parseFloat(e.target.value) || 1), lockL: !resizeGeometryOnL },
                          resizeGeometryOnL
                        )
                      }
                      className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900"
                    />
                    <span className="font-bold text-slate-700">= {fmtSymbolicL(selectedElem.L)}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'L/2 (0.5)', val: 0.5 },
                      { label: '√2/2 L (0.707)', val: 0.7071 },
                      { label: 'L (1)', val: 1 },
                      { label: '1.118L', val: 1.118 },
                      { label: '√2 L (1.414)', val: 1.4142 },
                      { label: '2L', val: 2 }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() =>
                          updateElemProp(
                            selectedElem.id,
                            { L: preset.val, lockL: !resizeGeometryOnL },
                            resizeGeometryOnL
                          )
                        }
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                          Math.abs(selectedElem.L - preset.val) < 1e-3
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Angles θ1 and θ2 */}
                {exState.mode !== 'Mola' && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">
                      Ângulos Diretores θ₁ e θ₂ (Graus °)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">θ₁ (Nó {selectedElem.n1Label}):</span>
                        <input
                          type="number"
                          step="5"
                          value={selectedElem.th1}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            updateElemProp(
                              selectedElem.id,
                              { th1: v, th2: v, customAngles: true },
                              resizeGeometryOnL
                            );
                          }}
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          θ₂ (Nó {selectedElem.n2Label}, A. Rolante):
                        </span>
                        <input
                          type="number"
                          step="5"
                          value={selectedElem.th2}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            updateElemProp(selectedElem.id, { th2: v, customAngles: true }, false);
                          }}
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[0, 30, 33.435, 45, 63.435, 90, -20, -45, -63.435, -90].map((ang) => (
                        <button
                          key={ang}
                          onClick={() =>
                            updateElemProp(
                              selectedElem.id,
                              { th1: ang, th2: ang, customAngles: true },
                              resizeGeometryOnL
                            )
                          }
                          className="px-1.5 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 rounded text-[10px] font-bold"
                        >
                          {ang}°
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Material & Section Multipliers (E, A, I, k) */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      {exState.mode === 'Mola' ? 'Rigidez k' : 'Módulo E'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={exState.mode === 'Mola' ? selectedElem.k : selectedElem.E}
                      onChange={(e) => {
                        const v = Math.max(0.1, parseFloat(e.target.value) || 1);
                        updateElemProp(selectedElem.id, { E: v, k: v });
                      }}
                      className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Área A</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={selectedElem.A}
                      onChange={(e) =>
                        updateElemProp(selectedElem.id, { A: Math.max(0.1, parseFloat(e.target.value) || 1) })
                      }
                      className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Inércia I</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={selectedElem.I}
                      onChange={(e) =>
                        updateElemProp(selectedElem.id, { I: Math.max(0.1, parseFloat(e.target.value) || 1) })
                      }
                      className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Distributed Load p(0), p(L) and p(x) */}
                {(exState.mode === 'Viga' || exState.mode === 'VigaBarra2D') && (
                  <div className="border-t border-slate-200 pt-2 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Carga Distribuída Transversal p(x)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">p(0) no início (p):</span>
                        <input
                          type="number"
                          step="0.5"
                          value={selectedElem.p0}
                          onChange={(e) =>
                            updateElemProp(selectedElem.id, { p0: parseFloat(e.target.value) || 0, py: '' })
                          }
                          className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">p(L) no fim (p):</span>
                        <input
                          type="number"
                          step="0.5"
                          value={selectedElem.pL}
                          onChange={(e) =>
                            updateElemProp(selectedElem.id, { pL: parseFloat(e.target.value) || 0, py: '' })
                          }
                          className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Ou expressão polinomial p(x) (ex: <code className="text-blue-700">-x^3/L^3</code> ou{' '}
                        <code className="text-blue-700">-2*x^2/L</code>):
                      </span>
                      <input
                        type="text"
                        placeholder="Vazio = linear entre p(0) e p(L)"
                        value={selectedElem.py || ''}
                        onChange={(e) => updateElemProp(selectedElem.id, { py: e.target.value })}
                        className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-blue-800"
                      />
                    </div>
                  </div>
                )}

                {/* Post-Processing Target Bar & Position x */}
                <div className="border-t border-slate-200 pt-2 bg-amber-50/70 p-2 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-amber-900 uppercase">
                      Pós-Processamento nesta Barra
                    </span>
                    <button
                      onClick={() => pushState((prev) => ({ ...prev, targetBar: selectedElem.index }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exState.targetBar === selectedElem.index
                          ? 'bg-amber-600 text-white'
                          : 'bg-white text-amber-900 border border-amber-300'
                      }`}
                    >
                      {exState.targetBar === selectedElem.index ? '✓ Barra Alvo Ativa' : 'Definir como Alvo'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-amber-900">Posição x/L_e:</span>
                    {[
                      { label: 'x=0', xi: 0 },
                      { label: 'L_e/4', xi: 0.25 },
                      { label: 'Meio (L_e/2)', xi: 0.5 },
                      { label: '3L_e/4', xi: 0.75 },
                      { label: 'x=L_e', xi: 1 }
                    ].map((pt) => (
                      <button
                        key={pt.label}
                        onClick={() =>
                          pushState((prev) => ({ ...prev, targetBar: selectedElem.index, targetXi: pt.xi }))
                        }
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                          exState.targetBar === selectedElem.index && Math.abs((exState.targetXi ?? 0.5) - pt.xi) < 1e-2
                            ? 'bg-amber-700 text-white border-amber-700'
                            : 'bg-white text-slate-700 border-amber-300'
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Interactive Status Strip */}
          <div className="px-4 py-2 bg-slate-900 text-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {exState.nodes.length} Nós
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-blue-400">
                <Layers className="w-3.5 h-3.5" />
                {exState.elements.length} Elementos
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-red-400">
                {analysis.nDof} G.D.L. ({analysis.nDof}×{analysis.nDof})
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Dica: Clique em qualquer <strong>Nó</strong> ou <strong>Barra</strong> no esquema para abrir o editor flutuante.
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN: COMPLETE STEP-BY-STEP SEBENTA RESOLUTION SHEET
        =================================================================== */}
        <div className="lg:col-span-6 xl:col-span-6 bg-[#fffdf7] overflow-y-auto max-h-[calc(100vh-88px)] p-5 sm:p-7 space-y-6 select-text">
          {/* Paper Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-blue-700">
                Método dos Elementos Finitos — Folha de Resolução Sebenta
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">{exState.title}</h2>
            </div>
            <BoxedMath className="text-sm">
              {analysis.nDof} g.l. ⇒ [K]
              <sub className="text-[10px] ml-0.5">
                {analysis.nDof}×{analysis.nDof}
              </sub>
            </BoxedMath>
          </div>

          {/* -----------------------------------------------------------------
              STEP 0: COMPRIMENTOS, ÂNGULOS E TABELA DE CONECTIVIDADE (m.c.)
          ----------------------------------------------------------------- */}
          <section className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
              1. Geometria dos Elementos e Tabela de Conectividade (m.c.)
            </h3>

            {/* Symbolic lengths & angles summary like Sebenta */}
            <div className="flex flex-wrap gap-4 text-sm font-serif text-slate-800">
              {analysis.mcRows.map((r) => (
                <div key={r.index} className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                  <span>L</span>
                  <sup>
                    <CircledNum n={r.index} small />
                  </sup>
                  <span>= {fmtSymbolicL(r.L)}</span>
                  {exState.mode !== 'Mola' && exState.mode !== 'Viga' && (
                    <span className="ml-2 text-blue-700 font-sans font-bold text-xs">
                      (θ = {r.th1 !== r.th2 ? `${fmtNum(r.th1)}° / ${fmtNum(r.th2)}°` : `${fmtNum(r.th1)}°`})
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Connectivity Table (m.c.) */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-800">
                    <th className="py-1.5 px-2 text-left font-bold">m.c.</th>
                    {exState.mode === 'Mola' && (
                      <>
                        <th className="py-1.5 px-2 text-center">1 (i)</th>
                        <th className="py-1.5 px-2 text-center">2 (j)</th>
                        <th className="py-1.5 px-2 text-center">k</th>
                      </>
                    )}
                    {exState.mode === 'Barra2D' && (
                      <>
                        <th className="py-1.5 px-2 text-center">1 (U₁)</th>
                        <th className="py-1.5 px-2 text-center">2 (V₁)</th>
                        <th className="py-1.5 px-2 text-center">3 (U₂)</th>
                        <th className="py-1.5 px-2 text-center">4 (V₂)</th>
                        <th className="py-1.5 px-2 text-center">θ₁</th>
                        <th className="py-1.5 px-2 text-center">θ₂</th>
                        <th className="py-1.5 px-2 text-center">L</th>
                        <th className="py-1.5 px-2 text-center">E, A</th>
                      </>
                    )}
                    {exState.mode === 'Viga' && (
                      <>
                        <th className="py-1.5 px-2 text-center">1 (v₁)</th>
                        <th className="py-1.5 px-2 text-center">2 (θ₁)</th>
                        <th className="py-1.5 px-2 text-center">3 (v₂)</th>
                        <th className="py-1.5 px-2 text-center">4 (θ₂)</th>
                        <th className="py-1.5 px-2 text-center">L</th>
                      </>
                    )}
                    {exState.mode === 'VigaBarra2D' && (
                      <>
                        <th className="py-1.5 px-1.5 text-center">1</th>
                        <th className="py-1.5 px-1.5 text-center">2</th>
                        <th className="py-1.5 px-1.5 text-center">3</th>
                        <th className="py-1.5 px-1.5 text-center">4</th>
                        <th className="py-1.5 px-1.5 text-center">5</th>
                        <th className="py-1.5 px-1.5 text-center">6</th>
                        <th className="py-1.5 px-2 text-center">θ</th>
                        <th className="py-1.5 px-2 text-center">L</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {analysis.mcRows.map((r) => (
                    <tr
                      key={r.index}
                      onClick={() => {
                        setSelectedElemId(r.id);
                        setSelectedNodeId(null);
                      }}
                      className="hover:bg-blue-50/60 cursor-pointer"
                    >
                      <td className="py-1.5 px-2">
                        <CircledNum n={r.index} small />
                        <span className="ml-1 text-slate-500 font-sans">
                          ({r.n1Label}–{r.n2Label})
                        </span>
                      </td>
                      {r.dofs.map((d, idx) => (
                        <td key={idx} className="py-1.5 px-2 text-center font-bold text-slate-900">
                          {d === 0 ? '—' : d}
                        </td>
                      ))}
                      {exState.mode === 'Mola' && <td className="py-1.5 px-2 text-center">{fmtNum(r.k)}k</td>}
                      {exState.mode === 'Barra2D' && (
                        <>
                          <td className="py-1.5 px-2 text-center text-blue-700 font-bold">{fmtNum(r.th1)}°</td>
                          <td className="py-1.5 px-2 text-center text-blue-700 font-bold">{fmtNum(r.th2)}°</td>
                          <td className="py-1.5 px-2 text-center font-bold">{fmtSymbolicL(r.L)}</td>
                          <td className="py-1.5 px-2 text-center">
                            {r.E !== 1 ? `${fmtNum(r.E)}E` : 'E'}, {r.A !== 1 ? `${fmtNum(r.A)}A` : 'A'}
                          </td>
                        </>
                      )}
                      {exState.mode === 'Viga' && (
                        <td className="py-1.5 px-2 text-center font-bold">{fmtSymbolicL(r.L)}</td>
                      )}
                      {exState.mode === 'VigaBarra2D' && (
                        <>
                          <td className="py-1.5 px-2 text-center text-blue-700 font-bold">{fmtNum(r.th1)}°</td>
                          <td className="py-1.5 px-2 text-center font-bold">{fmtSymbolicL(r.L)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* -----------------------------------------------------------------
              STEP A: MONTAGEM DA MATRIZ DE RIGIDEZ [K] E DESLOCAMENTOS
          ----------------------------------------------------------------- */}
          <section className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
              a) Montagem da Matriz de Rigidez Global [K]
            </h3>

            {/* Explicit Element-by-Element K_ij Assembly */}
            <div className="space-y-2.5 text-sm">
              {Array.from({ length: analysis.nDof }, (_, i) => i + 1).map((i) =>
                Array.from({ length: analysis.nDof - i + 1 }, (_, k) => i + k).map((j) => {
                  const step = analysis.kSteps[`${i},${j}`];
                  const kVal = analysis.Knum[i - 1][j - 1];
                  const eaVal = analysis.KsymEA[i - 1][j - 1];
                  const eiVal = analysis.KsymEI[i - 1][j - 1];
                  const lPow = analysis.KsymEILPow[i - 1][j - 1];

                  let finalFormatted = '0';
                  if (exState.mode === 'Mola') {
                    finalFormatted = Math.abs(kVal) < 1e-9 ? '0' : `${fmtNum(kVal)}k`;
                  } else if (exState.mode === 'Barra2D') {
                    finalFormatted = Math.abs(kVal) < 1e-9 ? '0' : `(EA/L) × (${fmtNum(kVal, 4)})`;
                  } else if (exState.mode === 'Viga') {
                    const unit = lPow === 1 ? 'EI/L' : lPow === 2 ? 'EI/L²' : 'EI/L³';
                    finalFormatted = Math.abs(kVal) < 1e-9 ? '0' : `${fmtNum(kVal, 4)} ${unit}`;
                  } else if (exState.mode === 'VigaBarra2D') {
                    const p = [];
                    if (Math.abs(eaVal) > 1e-9) p.push(`(EA/L)·(${fmtNum(eaVal, 3)})`);
                    if (Math.abs(eiVal) > 1e-9) {
                      const unit = lPow === 1 ? 'EI/L' : lPow === 2 ? 'EI/L²' : 'EI/L³';
                      p.push(`(${unit})·(${fmtNum(eiVal, 3)})`);
                    }
                    finalFormatted = p.length ? p.join(' + ') : '0';
                  }

                  return (
                    <div key={`${i}-${j}`} className="bg-slate-50/90 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <KTerm sym="K" sub={`${i}${j}`} />
                        <span>=</span>
                        {step && step.syms.length > 0 ? (
                          step.syms.map((sObj, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span>+</span>}
                              <KTerm sym="K" sub={sObj.sub} el={sObj.el} />
                            </React.Fragment>
                          ))
                        ) : (
                          <span>0</span>
                        )}
                        {step && step.vals.length > 0 && (
                          <>
                            <span>=</span>
                            <span className="font-mono text-xs text-slate-700">{step.vals.join(' + ')}</span>
                          </>
                        )}
                        <span>=</span>
                        <BoxedMath className="text-xs font-mono">{finalFormatted}</BoxedMath>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Global Matrix [K] Display */}
            {analysis.nDof > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <MathMatrix
                  data={analysis.Knum}
                  prefix={
                    exState.mode === 'Barra2D' ? (
                      <span className="inline-flex items-center font-bold">
                        [K] = <Frac num="EA" den="L" />
                      </span>
                    ) : exState.mode === 'Viga' ? (
                      <span className="inline-flex items-center font-bold">
                        [K] = <Frac num="EI" den="L³" />
                      </span>
                    ) : (
                      <span className="font-bold">[K] =</span>
                    )
                  }
                />
              </div>
            )}
          </section>

          {/* -----------------------------------------------------------------
              STEP B: VETOR DE FORÇAS {F} E CARGAS DISTRIBUÍDAS (SE APLICÁVEL)
          ----------------------------------------------------------------- */}
          {(analysis.elemForceDetails.length > 0 || exState.mode === 'VigaBarra2D' || exState.mode === 'Viga') && (
            <section className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
                b) Vetor de Forças Equivalentes {'{F}'}
              </h3>

              {analysis.elemForceDetails.map((ef) => (
                <div key={ef.elem} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Elemento</span>
                    <CircledNum n={ef.elem} small />
                    <span>(L = {fmtSymbolicL(ef.L)})</span>
                  </div>

                  {ef.hasCustom ? (
                    <div className="space-y-1 font-mono text-slate-800">
                      <div>
                        Integração direta de <strong>p(x) = {ef.py}</strong> com funções de forma Nᵢ(x):
                      </div>
                      <div>
                        • F₂⁽{ef.elem}⁾ = ∫ p(x)·N₁(x) dx = <strong>{fmtNum(ef.fLocal[1], 4)} pL</strong>
                      </div>
                      <div>
                        • F₃⁽{ef.elem}⁾ = ∫ p(x)·N₂(x) dx = <strong>{fmtNum(ef.fLocal[2], 4)} pL²</strong>
                      </div>
                      <div>
                        • F₅⁽{ef.elem}⁾ = ∫ p(x)·N₃(x) dx = <strong>{fmtNum(ef.fLocal[4], 4)} pL</strong>
                      </div>
                      <div>
                        • F₆⁽{ef.elem}⁾ = ∫ p(x)·N₄(x) dx = <strong>{fmtNum(ef.fLocal[5], 4)} pL²</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 font-mono text-slate-800">
                      <div>
                        Parametrização linear: f(x) = P₂·(x/L) + P₁ ⇒ P₁ = {fmtNum(ef.P1)}p , P₂ = {fmtNum(ef.P2)}p
                      </div>
                      {exState.mode === 'Viga' ? (
                        <div className="grid grid-cols-2 gap-1 pt-1">
                          <div>F₁eq = {fmtNum(ef.fLocal[0], 4)} pL</div>
                          <div>M₁eq = {fmtNum(ef.fLocal[1], 4)} pL²</div>
                          <div>F₂eq = {fmtNum(ef.fLocal[2], 4)} pL</div>
                          <div>M₂eq = {fmtNum(ef.fLocal[3], 4)} pL²</div>
                        </div>
                      ) : (
                        <div>
                          {'{f}'}⁽{ef.elem}⁾ local = {'{ '}
                          {ef.fLocal.map((v, i) => `${fmtNum(v, 4)}${i === 2 || i === 5 ? 'pL²' : 'pL'}`).join(' ; ')}
                          {' }'}ᵀ
                        </div>
                      )}
                    </div>
                  )}

                  {exState.mode === 'VigaBarra2D' && Math.abs(ef.th1 || 0) > 1e-6 && (
                    <div className="pt-1 border-t border-slate-200 font-mono text-blue-900">
                      Transposição para eixos globais (θ = {fmtNum(ef.th1)}°): {'{F}'}⁽{ef.elem}⁾ = [R]ᵀ {'{f}'}⁽
                      {ef.elem}⁾ = {'{ '}
                      {ef.fGlobal.map((v, i) => `${fmtNum(v, 4)}${i === 2 || i === 5 ? 'pL²' : 'pL'}`).join(' ; ')}
                      {' }'}ᵀ
                    </div>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-3 pt-1">
                <span className="font-serif font-bold text-sm">Vetor de Forças Global {'{F}'} =</span>
                <MathVector items={analysis.FsymStrings} />
              </div>
            </section>
          )}

          {/* -----------------------------------------------------------------
              STEP C: SISTEMA DE EQUILÍBRIO [K]{u} = {F} E DESLOCAMENTOS NODAIS
          ----------------------------------------------------------------- */}
          <section className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
              Sistema de Equilíbrio [K]{'{u}'} = {'{F}'} e Deslocamentos Nodais
            </h3>

            {exState.mode === 'Mola' && exState.id === 'ex14' && (
              <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs font-mono space-y-1.5">
                <div className="font-sans font-bold text-amber-950">
                  Princípio da Energia Potencial Mínima (Π = Uₑ - W):
                </div>
                <div>Uₑ = ½ k u₁² + ½ (2k)(u₂ - u₁)² = ½ [ k u₁² + 2k(u₁² - 2u₁u₂ + u₂²) ]</div>
                <div>W = m g u₁ + m g u₂</div>
                <div>∂Π/∂u₁ = 0 ⇔ 3k u₁ - 2k u₂ = mg</div>
                <div>∂Π/∂u₂ = 0 ⇔ -2k u₁ + 2k u₂ = mg</div>
              </div>
            )}

            {analysis.solveError ? (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold">
                {analysis.solveError}
              </div>
            ) : (
              analysis.displacements && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <MathMatrix data={analysis.Knum} />
                    <MathVector
                      items={Array.from({ length: analysis.nDof }, (_, i) =>
                        analysis.dofInfo[i + 1]?.constrainedZero ? `u${toUnicodeSub(i + 1)} = 0` : `u${toUnicodeSub(i + 1)}`
                      )}
                    />
                    <span className="font-bold text-base">=</span>
                    <MathVector
                      items={Array.from({ length: analysis.nDof }, (_, i) =>
                        analysis.dofInfo[i + 1]?.constrainedZero
                          ? `${analysis.FsymStrings[i]} + R_${analysis.dofInfo[i + 1].nodeLabel}`
                          : analysis.FsymStrings[i]
                      )}
                    />
                  </div>

                  {/* Solved Displacements Boxed */}
                  <div className="pt-2 flex flex-wrap gap-3">
                    {analysis.displacements.map((uVal, idx) => {
                      const dInfo = analysis.dofInfo[idx + 1];
                      let unit = '';
                      if (exState.mode === 'Mola') unit = `${exState.forceSym || 'mg'}/k`;
                      else if (exState.mode === 'Barra2D') unit = `${exState.forceSym || 'P'}L / EA`;
                      else if (exState.mode === 'Viga') {
                        unit = dInfo?.type === 'th' ? 'pL³ / EI' : 'pL⁴ / EI';
                      } else {
                        unit = dInfo?.type === 'th' ? 'pL³ / EI' : 'pL² / EA';
                      }

                      return (
                        <BoxedMath key={idx} className="text-sm">
                          <MathSub base="u" sub={idx + 1} />
                          <span className="mx-1.5">=</span>
                          {exState.mode === 'Viga' || exState.mode === 'Mola' ? (
                            <SymFraction
                              val={uVal}
                              numSym={
                                exState.mode === 'Mola'
                                  ? exState.forceSym || 'mg'
                                  : dInfo?.type === 'th'
                                  ? 'pL³'
                                  : 'pL⁴'
                              }
                              denSym={exState.mode === 'Mola' ? 'k' : 'EI'}
                            />
                          ) : (
                            <span>
                              {fmtNum(uVal, 4)} <span className="font-serif italic">{unit}</span>
                            </span>
                          )}
                        </BoxedMath>
                      );
                    })}

                    {/* Solved Support Reactions (like RB = 11pL/20 in Ex. 9) */}
                    {Object.entries(analysis.reactions).map(([dofIdx, rVal]) => {
                      const dInfo = analysis.dofInfo[dofIdx];
                      return (
                        <BoxedMath key={`react-${dofIdx}`} className="text-sm bg-emerald-50 border-emerald-800">
                          <MathSub base="R" sub={dInfo?.nodeLabel || dofIdx} />
                          <span className="mx-1.5">=</span>
                          <SymFraction val={rVal} numSym="pL" denSym="" />
                        </BoxedMath>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </section>

          {/* -----------------------------------------------------------------
              STEP D: PÓS-PROCESSAMENTO ESPECÍFICO POR MODO (TENSÃO, ZONA CRÍTICA, VIGA, MOLAS)
          ----------------------------------------------------------------- */}
          {exState.mode === 'Mola' && analysis.displacements && (
            <section className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
                Força em Cada Mola
              </h3>
              <div className="space-y-2 text-sm">
                {analysis.mcRows.map((r) => {
                  const u1 = r.dofs[0] > 0 ? analysis.displacements[r.dofs[0] - 1] : 0;
                  const u2 = r.dofs[1] > 0 ? analysis.displacements[r.dofs[1] - 1] : 0;
                  const fSpring = r.k * (u2 - u1);
                  return (
                    <div key={r.index} className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold">Mola</span>
                      <CircledNum n={r.index} small />
                      <span>
                        : F⁽{r.index}⁾ = {fmtNum(r.k)}k · (u₂ - u₁) =
                      </span>
                      <BoxedMath className="text-xs">
                        {fmtNum(fSpring, 4)} {exState.forceSym || 'mg'}
                      </BoxedMath>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {exState.mode === 'Barra2D' && analysis.barStresses.length > 0 && (
            <section className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
                b) Esforço Normal (N), Tensão Axial (σ), Zona Crítica e Interpolação u(x)
              </h3>

              <div className="text-xs font-mono bg-slate-50 p-2.5 rounded border border-slate-200">
                σ = E·ε = (E / L)·(u₂ - u₁) onde {'{u}'} = [R]{'{U}'} ⇔ u₁ = U₁·cos(θ₁) + V₁·sin(θ₁) , u₂ = U₂·cos(θ₂) + V₂·sin(θ₂)
              </div>

              <div className="space-y-3">
                {analysis.barStresses.map((bs) => {
                  const fSym = exState.forceSym || 'P';
                  const isCrit = analysis.criticalBar && analysis.criticalBar.elem === bs.elem;
                  return (
                    <div
                      key={bs.elem}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                        isCrit ? 'bg-amber-50/70 border-amber-400' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Barra</span>
                          <CircledNum n={bs.elem} small />
                          <span>
                            ({bs.label}, L = {fmtSymbolicL(bs.L)}, θ₁={fmtNum(bs.th1)}°, θ₂={fmtNum(bs.th2)}°)
                          </span>
                        </div>
                        {isCrit && (
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-extrabold">
                            ★ Zona Crítica (|σ| máx)
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-slate-700">
                        u₁ = {fmtNum(bs.u1Local, 4)} {fSym}L/EA &nbsp;|&nbsp; u₂ = {fmtNum(bs.u2Local, 4)} {fSym}L/EA
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <span>
                          σ = ({fmtNum(bs.E)}E / {fmtSymbolicL(bs.L)}) × ({fmtNum(bs.u2Local, 4)} - ({fmtNum(bs.u1Local, 4)})) =
                        </span>
                        <BoxedMath>
                          σ = {fmtNum(bs.sigma, 4)} {fSym}/A
                        </BoxedMath>
                        <BoxedMath>
                          N = σ·{bs.A !== 1 ? `${fmtNum(bs.A)}A` : 'A'} = {fmtNum(bs.N, 4)} {fSym}
                        </BoxedMath>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Approximate Axial Displacement u(x) = N1*u1 + N2*u2 */}
              {(() => {
                const targetIdx = exState.targetBar || 1;
                const bs = analysis.barStresses.find((b) => b.elem === targetIdx) || analysis.barStresses[0];
                if (!bs) return null;
                const xi = exState.targetXi !== undefined ? exState.targetXi : 0.5;
                const uxVal = (1 - xi) * bs.u1Local + xi * bs.u2Local;
                const fSym = exState.forceSym || 'P';
                return (
                  <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 text-xs space-y-1.5">
                    <div className="font-bold text-blue-950">
                      Deslocamento Axial Aproximado u(x) = N₁(x)·u₁ + N₂(x)·u₂ na Barra {bs.label} (x ={' '}
                      {fmtSymbolicL(xi * bs.L)}):
                    </div>
                    <div className="font-mono text-slate-800">
                      u(x) = (1 - x/{fmtSymbolicL(bs.L)})·({fmtNum(bs.u1Local, 4)}) + (x/{fmtSymbolicL(bs.L)})·(
                      {fmtNum(bs.u2Local, 4)}) [{fSym}L/EA]
                    </div>
                    <div className="pt-1">
                      <BoxedMath>
                        u(x = {fmtSymbolicL(xi * bs.L)}) = {fmtNum(uxVal, 4)} {fSym}L / EA
                      </BoxedMath>
                    </div>
                  </div>
                );
              })()}
            </section>
          )}

          {/* Beam Post-Processing: v(x), θ(x), M(x), V(x), σ(x) and Zero-Slope x */}
          {exState.mode === 'Viga' && analysis.displacements && (
            <section className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
                b/c) Pós-Processamento da Viga: v(x), θ(x), M(x), V(x) e Tensão Normal σ
              </h3>

              {(() => {
                const targetIdx = exState.targetBar || 1;
                const row = analysis.mcRows.find((r) => r.index === targetIdx) || analysis.mcRows[0];
                if (!row) return null;
                const L = row.L || 1;
                const xi = exState.targetXi !== undefined ? exState.targetXi : 0.5;
                const xVal = xi * L;
                const U = row.dofs.map((d) => (d > 0 ? analysis.displacements[d - 1] : 0));
                const [v1, th1, v2, th2] = U;

                // Hermite shape functions at xi
                const N1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
                const N2 = L * (xi - 2 * xi * xi + xi * xi * xi);
                const N3 = 3 * xi * xi - 2 * xi * xi * xi;
                const N4 = L * (-xi * xi + xi * xi * xi);
                const vx = N1 * v1 + N2 * th1 + N3 * v2 + N4 * th2;

                const dN1 = (6 * (-xi + xi * xi)) / L;
                const dN2 = 1 - 4 * xi + 3 * xi * xi;
                const dN3 = (6 * (xi - xi * xi)) / L;
                const dN4 = -2 * xi + 3 * xi * xi;
                const thx = dN1 * v1 + dN2 * th1 + dN3 * v2 + dN4 * th2;

                const ddN1 = (6 * (-1 + 2 * xi)) / (L * L);
                const ddN2 = (-4 + 6 * xi) / L;
                const ddN3 = (6 * (1 - 2 * xi)) / (L * L);
                const ddN4 = (-2 + 6 * xi) / L;
                const Mx = row.E * row.I * (ddN1 * v1 + ddN2 * th1 + ddN3 * v2 + ddN4 * th2);
                const M0 = row.E * row.I * ((-6 / (L * L)) * v1 + (-4 / L) * th1 + (6 / (L * L)) * v2 + (-2 / L) * th2);

                const Vx =
                  row.E *
                  row.I *
                  ((12 / (L * L * L)) * v1 +
                    (6 / (L * L)) * th1 +
                    (-12 / (L * L * L)) * v2 +
                    (6 / (L * L)) * th2);

                return (
                  <div className="space-y-3 text-xs">
                    <div className="font-mono bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                      <div>
                        <strong>Elemento {row.index}</strong> (L = {fmtSymbolicL(L)}) avaliado em{' '}
                        <strong>x = {fmtSymbolicL(xVal)}</strong> (ξ = {fmtNum(xi, 3)}):
                      </div>
                      <div>v(x) = N₁·v₁ + N₂·θ₁ + N₃·v₂ + N₄·θ₂</div>
                      <div>θ(x) = dv/dx &nbsp;|&nbsp; M(x) = EI · d²v/dx² &nbsp;|&nbsp; V(x) = EI · d³v/dx³</div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      <BoxedMath>
                        v(x={fmtSymbolicL(xVal)}) = <SymFraction val={vx} numSym="pL⁴" denSym="EI" />
                      </BoxedMath>
                      <BoxedMath>
                        θ(x={fmtSymbolicL(xVal)}) = <SymFraction val={thx} numSym="pL³" denSym="EI" />
                      </BoxedMath>
                      <BoxedMath>
                        M(x={fmtSymbolicL(xVal)}) = <SymFraction val={Mx} numSym="pL²" denSym="" />
                      </BoxedMath>
                      <BoxedMath>
                        M(x=0) = <SymFraction val={M0} numSym="pL²" denSym="" />
                      </BoxedMath>
                      <BoxedMath>
                        V(x) = <SymFraction val={Vx} numSym="pL" denSym="" />
                      </BoxedMath>
                    </div>

                    {exState.id === 'ex9' && (
                      <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200 font-mono">
                        Ponto de rotação nula θ(x) = 0: (-2x / 2L + 3x² / 4L²) · (pL³ / 10EI) = 0 ⇒{' '}
                        <strong>x = 4L / 3</strong>
                      </div>
                    )}

                    {exState.id === 'ex13' && (
                      <div className="bg-amber-50 p-2.5 rounded border border-amber-200 font-mono space-y-1">
                        <div>
                          • Rotação no 2.º elemento em x = L/4 (3L/4 da viga): <strong>θ(L/4) = -0.02273 pL³ / EI</strong>
                        </div>
                        <div>
                          • Momento e Tensão Normal em x = L/4 do 2.º elemento: M(L/4) = -0.001038 pL² ⇒{' '}
                          <strong>σ = -M·y / I = +0.001038 pL²·y / I</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          )}

          {/* -----------------------------------------------------------------
              STEP E: MODOS DE VIBRAÇÃO E FREQUÊNCIAS NATURAIS (|[K] - ω²[M]| = 0)
          ----------------------------------------------------------------- */}
          {analysis.vibration && (
            <section className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
                c) Modos de Vibração e Frequências Naturais (|[K] - ω²[M]| = 0)
              </h3>

              {/* Mass Matrix Assembly */}
              <div className="space-y-2 text-xs">
                {Object.entries(analysis.vibration.mSteps).map(([key, st]) => {
                  const [i, j] = key.split(',').map(Number);
                  if (j < i) return null;
                  const mVal = analysis.vibration.Mnum[i - 1][j - 1];
                  return (
                    <div key={key} className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-wrap items-center gap-1.5">
                      <KTerm sym="M" sub={`${i}${j}`} />
                      <span>=</span>
                      {st.syms.map((sObj, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span>+</span>}
                          <KTerm sym="M" sub={sObj.sub} el={sObj.el} />
                        </React.Fragment>
                      ))}
                      <span>=</span>
                      <span className="font-mono text-slate-700">{st.vals.join(' + ')}</span>
                      <span>=</span>
                      <BoxedMath className="font-mono">
                        {fmtNum(mVal, 4)} ρAL
                      </BoxedMath>
                    </div>
                  );
                })}
              </div>

              {/* Characteristic Polynomial & Eigenvalues */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs font-mono">
                <div>
                  Substituindo{' '}
                  {exState.mode === 'Viga' ? 'λ = ω²·ρAL⁴ / EI' : 'λ = ω²·ρL² / E'} em |[K̄] - λ[M̄]| = 0:
                </div>
                <div className="font-bold text-slate-900">
                  {fmtNum(analysis.vibration.quad.a, 4)} λ² {analysis.vibration.quad.b >= 0 ? '+' : '-'}{' '}
                  {fmtNum(Math.abs(analysis.vibration.quad.b), 4)} λ + {fmtNum(analysis.vibration.quad.c, 4)} = 0
                </div>
              </div>

              {/* Natural Frequencies & Mode Shapes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.vibration.modes.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-300 bg-amber-50/40 space-y-2 text-xs">
                    <div className="font-bold text-slate-900">
                      Modo {idx + 1}: λ{toUnicodeSub(idx + 1)} = {fmtNum(m.lam, 3)}
                    </div>
                    <BoxedMath>
                      ω{toUnicodeSub(idx + 1)} ={' '}
                      {exState.mode === 'Viga'
                        ? `${fmtNum(m.omega, 3)} / L² · √(EI / ρA)`
                        : `${fmtNum(m.omega, 3)} / L · √(E / ρ)`}
                    </BoxedMath>
                    <div className="font-mono text-slate-700 pt-1">
                      Modo associado:{' '}
                      <strong>
                        {'{ u₁ = '}
                        {fmtNum(m.vec[0], 3)} , u₂ = {fmtNum(m.vec[1], 3)}
                        {' }'}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}