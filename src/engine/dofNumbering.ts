// ============================================================================
// DEGREE OF FREEDOM (D.O.F.) NUMBERING & MANUAL REORDERING
// ============================================================================

import { DofInfo, FeaMode, FeaNode } from '../types/fea';

export interface DofAssignmentResult {
  nDof: number;
  nodeDofs: Record<number, Record<string, any>>;
  dofInfo: Record<number, DofInfo>;
  constrainedDofs: number[];
}

export function assignDofs(
  nodes: FeaNode[],
  mode: FeaMode,
  presetId?: string,
  customReordering?: Record<number, number> // Map oldIndex -> newIndex
): DofAssignmentResult {
  let dofCounter = 0;
  const nodeDofs: Record<number, Record<string, any>> = {};
  const dofInfo: Record<number, DofInfo> = {};

  // Check if Exercise 8 symmetry ordering applies (θ1 = u1, v2 = u2)
  const isEx8 = presetId === 'ex8' && mode === 'Viga' && nodes.length === 2;

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

  // Handle manual DOF reordering if user customized it
  if (customReordering && Object.keys(customReordering).length > 0) {
    const newDofInfo: Record<number, DofInfo> = {};
    for (const [oldStr, newIdx] of Object.entries(customReordering)) {
      const oldIdx = parseInt(oldStr, 10);
      if (dofInfo[oldIdx]) {
        newDofInfo[newIdx] = { ...dofInfo[oldIdx], index: newIdx };
      }
    }
    // Update nodeDofs mapping
    for (const n of nodes) {
      const d = nodeDofs[n.id];
      if (!d) continue;
      ['u', 'v', 'th'].forEach((key) => {
        if (d[key] && customReordering[d[key]]) {
          d[key] = customReordering[d[key]];
        }
      });
    }
  }

  const constrainedDofs = Object.values(dofInfo)
    .filter((d) => d.constrainedZero)
    .map((d) => d.index);

  return {
    nDof: dofCounter,
    nodeDofs,
    dofInfo,
    constrainedDofs
  };
}
