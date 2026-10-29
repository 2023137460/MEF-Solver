// ============================================================================
// CORE SYMBOLIC FEA ENGINE (UNIFIED ORCHESTRATOR)
// ============================================================================

import {
  FeaAnalysisResult,
  FeaElement,
  FeaMode,
  FeaNode,
  FeaPreset,
  McRow
} from '../types/fea';
import {
  cosd,
  fmtNum,
  fmtSymbolicL,
  sind,
  solveLinearSystem
} from './expr';
import { assignDofs } from './dofNumbering';
import {
  computeBarra2dElementStiffness,
  computeBarra2dStresses,
  computeBarra2dVibrations
} from './barra2d';
import {
  computeVigaElementStiffness,
  computeVigaEquivalentLoads,
  computeVigaVibrations
} from './viga';
import {
  computeVigaBarra2dElementStiffness,
  computeVigaBarra2dEquivalentLoads
} from './vigaBarra2d';
import { computeMolaElementStiffness } from './mola';

export * from './expr';
export * from './autoDetect';
export * from './dofNumbering';
export * from './barra2d';
export * from './viga';
export * from './vigaBarra2d';
export * from './mola';

export interface AnalysisInputState {
  id?: string;
  mode: FeaMode;
  forceSym?: string;
  nodes: FeaNode[];
  elements: FeaElement[];
  customDofs?: Record<number, number>;
}

export function buildSymbolicAnalysis(state: AnalysisInputState): FeaAnalysisResult {
  const { mode, nodes, elements, id, forceSym } = state;
  const nodeMap: Record<number, FeaNode> = {};
  nodes.forEach((n) => {
    nodeMap[n.id] = n;
  });

  // 1. Assign Global DOFs to each node based on mode and support type
  const { nDof, nodeDofs, dofInfo, constrainedDofs } = assignDofs(
    nodes,
    mode,
    id,
    state.customDofs
  );

  // 2. Build Connectivity Table (m.c.)
  const mcRows: McRow[] = elements.map((el, idx) => {
    const n1 = nodeMap[el.n1] || { id: el.n1, label: '?', x: 0, y: 0 };
    const n2 = nodeMap[el.n2] || { id: el.n2, label: '?', x: 1, y: 0 };
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
      if (d1.isInclined && id !== 'ex4' && id !== 'ex5') {
        th1 = Number((geomTh - (d1.rollerAngle || 0)).toFixed(3));
      }
      if (d2.isInclined && id !== 'ex4' && id !== 'ex5') {
        th2 = Number((geomTh - (d2.rollerAngle || 0)).toFixed(3));
      }
    }

    let dofs: number[] = [];
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
  const Knum: number[][] = Array.from({ length: nDof }, () => Array(nDof).fill(0));
  const KsymEA: number[][] = Array.from({ length: nDof }, () => Array(nDof).fill(0));
  const KsymEI: number[][] = Array.from({ length: nDof }, () => Array(nDof).fill(0));
  const KsymEILPow: number[][] = Array.from({ length: nDof }, () => Array(nDof).fill(3));
  const kSteps: Record<string, { syms: Array<{ sub: string; el: number }>; vals: string[] }> = {};

  const addKStep = (gi: number, gj: number, symObj: { sub: string; el: number }, valStr: string) => {
    const key = `${gi},${gj}`;
    if (!kSteps[key]) kSteps[key] = { syms: [], vals: [] };
    kSteps[key].syms.push(symObj);
    kSteps[key].vals.push(valStr);
  };

  mcRows.forEach((row) => {
    const e = row.index;

    if (mode === 'Mola') {
      const { ke, valStepStrings } = computeMolaElementStiffness(row);
      for (let i = 0; i < 2; i++) {
        const gi = row.dofs[i];
        if (!gi) continue;
        for (let j = 0; j < 2; j++) {
          const gj = row.dofs[j];
          if (!gj) continue;
          Knum[gi - 1][gj - 1] += ke[i][j];
          addKStep(gi, gj, { sub: `${i + 1}${j + 1}`, el: e }, valStepStrings[i][j]);
        }
      }
    } else if (mode === 'Barra2D') {
      const { ke, valStepStrings } = computeBarra2dElementStiffness(row);
      for (let i = 0; i < 4; i++) {
        const gi = row.dofs[i];
        if (!gi) continue;
        for (let j = 0; j < 4; j++) {
          const gj = row.dofs[j];
          if (!gj) continue;
          const val = ke[i][j];
          Knum[gi - 1][gj - 1] += val;
          KsymEA[gi - 1][gj - 1] += val;
          addKStep(gi, gj, { sub: `${i + 1}${j + 1}`, el: e }, valStepStrings[i][j]);
        }
      }
    } else if (mode === 'Viga') {
      const { ke, formulaMat } = computeVigaElementStiffness(row);
      const Lsym = fmtSymbolicL(row.L || 1);
      for (let i = 0; i < 4; i++) {
        const gi = row.dofs[i];
        if (!gi) continue;
        for (let j = 0; j < 4; j++) {
          const gj = row.dofs[j];
          if (!gj) continue;
          const val = ke[i][j];
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
      const { kAg, kBg, keTotal, stepStrings, lPowMatrix } = computeVigaBarra2dElementStiffness(row);
      const eaFactor = ((row.E || 1) * (row.A || 1)) / (row.L || 1);
      const eiFactor = ((row.E || 1) * (row.I || 1)) / Math.pow(row.L || 1, 3);

      for (let i = 0; i < 6; i++) {
        const gi = row.dofs[i];
        if (!gi) continue;
        for (let j = 0; j < 6; j++) {
          const gj = row.dofs[j];
          if (!gj) continue;
          const vA = eaFactor * kAg[i][j];
          const vB = eiFactor * kBg[i][j];
          const lPow = lPowMatrix[i][j];

          if (Math.abs(vA) > 1e-10 || Math.abs(vB) > 1e-10) {
            Knum[gi - 1][gj - 1] += vA + vB;
            KsymEA[gi - 1][gj - 1] += vA;
            KsymEI[gi - 1][gj - 1] += vB;
            KsymEILPow[gi - 1][gj - 1] = lPow;
            addKStep(gi, gj, { sub: `${i + 1}${j + 1}`, el: e }, stepStrings[i][j]);
          }
        }
      }
    }
  });

  // 4. Assemble Global Force Vector {F} & Equivalent Element Loads
  const Fnum = Array(nDof).fill(0);
  const FtermsByPow: Array<Record<string, number>> = Array.from({ length: nDof }, () => ({}));
  const elemForceDetails: any[] = [];

  const addForceTerm = (dofIdx: number, val: number, lPow: number, symBase: string) => {
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
      if (d.u && Math.abs(fx) > 1e-9) addForceTerm(d.u, fx, 0, forceSym || 'mg');
    } else if (mode === 'Barra2D') {
      if (d.isInclined && d.u) {
        const proj = fx * cosd(d.rollerAngle || 0) + fy * sind(d.rollerAngle || 0);
        if (Math.abs(proj) > 1e-9) addForceTerm(d.u, proj, 0, forceSym || 'P');
      } else {
        if (d.u && Math.abs(fx) > 1e-9) addForceTerm(d.u, fx, 0, forceSym || 'P');
        if (d.v && Math.abs(fy) > 1e-9) addForceTerm(d.v, fy, 0, forceSym || 'P');
      }
    } else if (mode === 'Viga') {
      if (d.v && Math.abs(fy) > 1e-9) addForceTerm(d.v, fy, 0, 'p');
      if (d.th && Math.abs(mz) > 1e-9) addForceTerm(d.th, mz, 1, 'p');
    } else if (mode === 'VigaBarra2D') {
      if (d.u && Math.abs(fx) > 1e-9) addForceTerm(d.u, fx, 0, 'F');
      if (d.v && Math.abs(fy) > 1e-9) addForceTerm(d.v, fy, 0, 'F');
      if (d.th && Math.abs(mz) > 1e-9) addForceTerm(d.th, mz, 1, 'F');
    }
  });

  // Distributed element loads
  mcRows.forEach((row) => {
    const hasCustom = Boolean(row.py && row.py.trim() !== '');
    const hasDist = hasCustom || Math.abs(row.p0 || 0) > 1e-9 || Math.abs(row.pL || 0) > 1e-9;
    if (!hasDist) return;

    if (mode === 'Viga') {
      const { fLocal, detail } = computeVigaEquivalentLoads(row);
      elemForceDetails.push(detail);
      for (let k = 0; k < 4; k++) {
        const g = row.dofs[k];
        if (g > 0) {
          const isMom = k === 1 || k === 3;
          addForceTerm(g, fLocal[k], isMom ? 2 : 1, 'p');
        }
      }
    } else if (mode === 'VigaBarra2D') {
      const { fLocal, fGlobal, localPow, detail } = computeVigaBarra2dEquivalentLoads(row);
      elemForceDetails.push(detail);
      for (let i = 0; i < 6; i++) {
        const val = fGlobal[i];
        if (Math.abs(val) > 1e-10) {
          const g = row.dofs[i];
          if (g > 0) {
            addForceTerm(g, val, localPow[i], 'p');
          }
        }
      }
    }
  });

  // Format symbolic force strings per DOF
  const formatDofForceString = (dofIdx: number): string => {
    const terms = FtermsByPow[dofIdx - 1] || {};
    const parts: string[] = [];
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
  let displacements: number[] | null = null;
  const reactions: Record<number, number> = {};
  let solveError: string | null = null;

  if (nDof > 0) {
    if (constrainedDofs.length > 0) {
      // Partition free DOFs vs constrained-zero DOFs (Ex. 9 method)
      const freeDofs: number[] = [];
      for (let i = 1; i <= nDof; i++) {
        if (!constrainedDofs.includes(i)) freeDofs.push(i);
      }
      const Kf = freeDofs.map((r) => freeDofs.map((c) => Knum[r - 1][c - 1]));
      const Ff = freeDofs.map((r) => Fnum[r - 1]);
      const sol = solveLinearSystem(Kf, Ff);
      if (sol.err) {
        solveError = sol.err;
      } else if (sol.x) {
        displacements = Array(nDof).fill(0);
        freeDofs.forEach((dIdx, k) => {
          displacements![dIdx - 1] = sol.x![k];
        });
        // Compute reaction R_i = sum_j K_ij * u_j - F_i
        constrainedDofs.forEach((cIdx) => {
          let ku = 0;
          for (let j = 0; j < nDof; j++) {
            ku += Knum[cIdx - 1][j] * displacements![j];
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

  // 6. Post-processing for Barra2D (Stresses, Normal Forces, Critical Zone)
  let barStresses: any[] = [];
  let criticalBar: any = null;
  if (mode === 'Barra2D' && displacements) {
    const stressResult = computeBarra2dStresses(mcRows, displacements);
    barStresses = stressResult.barStresses;
    criticalBar = stressResult.criticalBar;
  }

  // 7. Consistent Mass Matrix [M] and Vibration Eigenvalues (Barra2D and Viga)
  let vibration: any = null;
  if ((mode === 'Barra2D' || mode === 'Viga') && nDof >= 1 && nDof <= 3 && constrainedDofs.length === 0) {
    if (mode === 'Barra2D') {
      vibration = computeBarra2dVibrations(mcRows, nDof, Knum);
    } else if (mode === 'Viga') {
      vibration = computeVigaVibrations(mcRows, nDof, Knum);
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
