// ============================================================================
// AUTO-DETECTION OF FEA STRUCTURE MODE & CONNECTIVITY TABLE (M.C.) FORMAT
// ============================================================================

import { FeaElement, FeaMode, FeaNode } from '../types/fea';

export interface ModeDetectionResult {
  detectedMode: FeaMode;
  dofSlotsPerElement: 2 | 4 | 6;
  columnHeaders: string[];
  explanation: string;
}

export function detectStructureMode(
  nodes: FeaNode[],
  elements: FeaElement[],
  explicitMode?: FeaMode
): ModeDetectionResult {
  if (explicitMode) {
    if (explicitMode === 'Mola') {
      return {
        detectedMode: 'Mola',
        dofSlotsPerElement: 2,
        columnHeaders: ['GDL 1', 'GDL 2', 'k'],
        explanation: 'Modo Mola: 2 G.D.L. por elemento (u₁, u₂).'
      };
    }
    if (explicitMode === 'Barra2D') {
      return {
        detectedMode: 'Barra2D',
        dofSlotsPerElement: 4,
        columnHeaders: ['GDL 1 (u₁)', 'GDL 2 (v₁)', 'GDL 3 (u₂)', 'GDL 4 (v₂)', 'θ₁ (°)', 'θ₂ (°)', 'L'],
        explanation: 'Modo Treliça (Barra 2D): 4 G.D.L. por elemento, rótulas em todos os nós.'
      };
    }
    if (explicitMode === 'Viga') {
      return {
        detectedMode: 'Viga',
        dofSlotsPerElement: 4,
        columnHeaders: ['GDL 1 (v₁)', 'GDL 2 (θ₁)', 'GDL 3 (v₂)', 'GDL 4 (θ₂)', 'L'],
        explanation: 'Modo Viga (Euler-Bernoulli): 4 G.D.L. por elemento (translação v e rotação θ).'
      };
    }
    return {
      detectedMode: 'VigaBarra2D',
      dofSlotsPerElement: 6,
      columnHeaders: ['GDL 1 (u₁)', 'GDL 2 (v₁)', 'GDL 3 (θ₁)', 'GDL 4 (u₂)', 'GDL 5 (v₂)', 'GDL 6 (θ₂)', 'θ₁ (°)', 'θ₂ (°)', 'L'],
      explanation: 'Modo Pórtico 2D (Viga-Barra): 6 G.D.L. por elemento (axial + flexão combinados).'
    };
  }

  // Auto-detect based on element properties and supports
  const hasSpring = elements.some((e) => e.k !== undefined && e.k > 0 && e.A === undefined);
  if (hasSpring && elements.every((e) => e.k !== undefined)) {
    return {
      detectedMode: 'Mola',
      dofSlotsPerElement: 2,
      columnHeaders: ['GDL 1', 'GDL 2', 'k'],
      explanation: 'Deteção automática: apenas molas presentes.'
    };
  }

  // Check if any element has bending (I > 0 or distributed load or moment)
  const hasBending = elements.some(
    (e) => (e.I && e.I > 0) || e.p0 || e.pL || (e.py && e.py.trim().length > 0)
  ) || nodes.some((n) => n.support === 'fixed' || n.support === 'guided' || (n.mz && Math.abs(n.mz) > 1e-6));

  if (!hasBending) {
    return {
      detectedMode: 'Barra2D',
      dofSlotsPerElement: 4,
      columnHeaders: ['GDL 1 (u₁)', 'GDL 2 (v₁)', 'GDL 3 (u₂)', 'GDL 4 (v₂)', 'θ₁ (°)', 'θ₂ (°)', 'L'],
      explanation: 'Deteção automática: apenas esforço axial (treliça 2D).'
    };
  }

  // Check if elements are purely horizontal or if there are inclined beams / axial loads
  const nodeMap = new Map<number, FeaNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const hasInclinedBeam = elements.some((e) => {
    const n1 = nodeMap.get(e.n1);
    const n2 = nodeMap.get(e.n2);
    if (!n1 || !n2) return false;
    const dy = Math.abs(n2.y - n1.y);
    return dy > 1e-3;
  });

  const hasAxialLoads = nodes.some((n) => n.fx && Math.abs(n.fx) > 1e-6);

  if (hasInclinedBeam || hasAxialLoads) {
    return {
      detectedMode: 'VigaBarra2D',
      dofSlotsPerElement: 6,
      columnHeaders: ['GDL 1 (u₁)', 'GDL 2 (v₁)', 'GDL 3 (θ₁)', 'GDL 4 (u₂)', 'GDL 5 (v₂)', 'GDL 6 (θ₂)', 'θ₁ (°)', 'θ₂ (°)', 'L'],
      explanation: 'Deteção automática: pórtico 2D (elementos inclinados ou forças axiais combinadas com flexão).'
    };
  }

  return {
    detectedMode: 'Viga',
    dofSlotsPerElement: 4,
    columnHeaders: ['GDL 1 (v₁)', 'GDL 2 (θ₁)', 'GDL 3 (v₂)', 'GDL 4 (θ₂)', 'L'],
    explanation: 'Deteção automática: viga horizontal Euler-Bernoulli sob flexão pura.'
  };
}
