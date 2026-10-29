// ============================================================================
// MASTER STRUCTURE CANVAS (CANVAS CAD INTERATIVO SVG COM getScreenCTM())
// ============================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MousePointer, Move, Plus, Link2, Anchor, Trash2,
  Eye, Compass, RotateCcw, Sliders, Zap, ZoomIn, ZoomOut,
  Maximize2, X, Sparkles
} from 'lucide-react';
import { FeaAnalysisResult, FeaElement, FeaMode, FeaNode, FeaPreset } from '../../types/fea';
import { SupportsSvg } from './SupportsSvg';
import { DistributedLoadSvg, NodalLoadSvg } from './LoadsSvg';
import { DofOverlaySvg } from './DofOverlaySvg';
import { CadDimensions } from './CadDimensions';
import { ElementHud, NodeHud, DimensionHud, DofReorderHud } from './FloatingHud';
import { fmtNum, fmtSymbolicL } from '../../engine/expr';
import { getTranslation } from '../../utils/i18n';

interface StructureCanvasProps {
  state: FeaPreset;
  analysis: FeaAnalysisResult;
  onChange: (updater: (prev: FeaPreset) => FeaPreset) => void;
  showDofs: boolean;
  setShowDofs: (show: boolean) => void;
  onSelectDof?: (dofIndex: number) => void;
  onReorderDof?: (oldDof: number, newDof: number) => void;
  lang?: 'pt' | 'en';
}

export const StructureCanvas: React.FC<StructureCanvasProps> = ({
  state,
  analysis,
  onChange,
  showDofs,
  setShowDofs,
  onSelectDof,
  onReorderDof,
  lang = 'pt'
}) => {
  const t = getTranslation(lang);
  const [activeTool, setActiveTool] = useState<'select' | 'move' | 'addNode' | 'addBar' | 'delete'>('select');
  const [snapStep, setSnapStep] = useState<number>(0.5);
  const [showAngles, setShowAngles] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedElemId, setSelectedElemId] = useState<number | null>(null);
  const [connectStartNodeId, setConnectStartNodeId] = useState<number | null>(null);

  // Dimension & DOF Hud state
  const [activeDimensionHud, setActiveDimensionHud] = useState<{
    type: 'h' | 'v';
    val: number;
    nodeAId: number;
    nodeBId: number;
    nodeALabel: string;
    nodeBLabel: string;
  } | null>(null);

  const [activeDofHud, setActiveDofHud] = useState<{
    dofIdx: number;
    nodeLabel: string;
  } | null>(null);

  // SVG Camera ViewBox
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewBox, setViewBox] = useState({ x: -140, y: -260, w: 560, h: 420 });
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; vbX: number; vbY: number } | null>(null);
  const [hoverWorld, setHoverWorld] = useState({ x: 0, y: 0, visible: false });

  const SCALE = 160; // 1L = 160px
  const worldToSvg = (wx: number, wy: number) => ({ x: wx * SCALE, y: -wy * SCALE });

  // Center camera on structure
  const centerView = (nodesList: FeaNode[] = state.nodes) => {
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
    const padX = 160;
    const padY = 140;
    const w = Math.max(500, maxX - minX + padX * 2);
    const h = Math.max(400, maxY - minY + padY * 2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewBox({ x: cx - w / 2, y: cy - h / 2, w, h });
  };

  // Convert client coordinates to CAD world coordinates using getScreenCTM()
  const getWorldCoords = (clientX: number, clientY: number, applySnap = true) => {
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

  // Global window pointer move and up
  useEffect(() => {
    if (!draggingNodeId && !isPanning) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (draggingNodeId) {
        const wPos = getWorldCoords(e.clientX, e.clientY, true);
        onChange((prev) => {
          const updatedNodes = prev.nodes.map((n) =>
            n.id === draggingNodeId ? { ...n, x: wPos.x, y: wPos.y } : n
          );
          const nMap: Record<number, FeaNode> = {};
          updatedNodes.forEach((n) => (nMap[n.id] = n));

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
          x: panStartRef.current!.vbX - dx,
          y: panStartRef.current!.vbY - dy
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

  // Handle canvas background click
  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).closest('[data-interactive="true"]')) return;
    const wPos = getWorldCoords(e.clientX, e.clientY, true);

    if (activeTool === 'addNode') {
      const nextId = state.nodes.reduce((m, n) => Math.max(m, n.id), 0) + 1;
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const nextLabel = alphabet[(nextId - 1) % alphabet.length] || `N${nextId}`;
      const newNode: FeaNode = {
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
      onChange((prev) => ({
        ...prev,
        id: 'custom',
        nodes: [...prev.nodes, newNode]
      }));
      setSelectedNodeId(nextId);
      setSelectedElemId(null);
      return;
    }

    if (e.button === 1 || e.shiftKey || activeTool === 'move') {
      setIsPanning(true);
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        vbX: viewBox.x,
        vbY: viewBox.y
      };
      return;
    }

    // Deselect if clicking on empty canvas
    setSelectedNodeId(null);
    setSelectedElemId(null);
    setConnectStartNodeId(null);
  };

  // Node Click / Pointer Down
  const handleNodePointerDown = (e: React.PointerEvent, node: FeaNode) => {
    e.stopPropagation();

    if (activeTool === 'delete') {
      onChange((prev) => ({
        ...prev,
        id: 'custom',
        nodes: prev.nodes.filter((n) => n.id !== node.id),
        elements: prev.elements.filter((el) => el.n1 !== node.id && el.n2 !== node.id)
      }));
      setSelectedNodeId(null);
      return;
    }

    if (activeTool === 'addBar') {
      if (!connectStartNodeId) {
        setConnectStartNodeId(node.id);
        setSelectedNodeId(node.id);
      } else if (connectStartNodeId !== node.id) {
        const nextElemId = state.elements.reduce((m, el) => Math.max(m, el.id), 0) + 1;
        const startN = state.nodes.find((n) => n.id === connectStartNodeId);
        const dx = node.x - (startN ? startN.x : 0);
        const dy = node.y - (startN ? startN.y : 0);
        const newL = Number((Math.hypot(dx, dy) || 1).toFixed(4));
        const newTh = Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(3));

        const newEl: FeaElement = {
          id: nextElemId,
          n1: connectStartNodeId,
          n2: node.id,
          E: 1,
          A: 1,
          I: 1,
          k: 1,
          L: newL,
          th1: newTh,
          th2: newTh,
          p0: 0,
          pL: 0,
          py: ''
        };

        onChange((prev) => ({
          ...prev,
          id: 'custom',
          elements: [...prev.elements, newEl]
        }));
        setConnectStartNodeId(null);
        setSelectedElemId(nextElemId);
      }
      return;
    }

    setSelectedNodeId(node.id);
    setSelectedElemId(null);
    setDraggingNodeId(node.id);
  };

  // Element Click / Pointer Down
  const handleElementPointerDown = (e: React.PointerEvent, el: FeaElement) => {
    e.stopPropagation();
    if (activeTool === 'delete') {
      onChange((prev) => ({
        ...prev,
        id: 'custom',
        elements: prev.elements.filter((item) => item.id !== el.id)
      }));
      setSelectedElemId(null);
      return;
    }
    setSelectedElemId(el.id);
    setSelectedNodeId(null);
  };

  // Generate background grid lines
  const gridLines = useMemo(() => {
    const vLines = [];
    const hLines = [];
    const minGridX = Math.floor(viewBox.x / SCALE) - 1;
    const maxGridX = Math.ceil((viewBox.x + viewBox.w) / SCALE) + 1;
    const minGridY = Math.floor(- (viewBox.y + viewBox.h) / SCALE) - 1;
    const maxGridY = Math.ceil(- viewBox.y / SCALE) + 1;

    for (let gx = minGridX; gx <= maxGridX; gx += 0.5) {
      const isMajor = Math.abs(gx - Math.round(gx)) < 1e-4;
      const isHalf = Math.abs(gx * 2 - Math.round(gx * 2)) < 1e-4;
      vLines.push({
        x: gx * SCALE,
        isMajor,
        isHalf,
        label: isMajor ? `${gx}L` : ''
      });
    }

    for (let gy = minGridY; gy <= maxGridY; gy += 0.5) {
      const isMajor = Math.abs(gy - Math.round(gy)) < 1e-4;
      const isHalf = Math.abs(gy * 2 - Math.round(gy * 2)) < 1e-4;
      hLines.push({
        y: -gy * SCALE,
        isMajor,
        isHalf,
        label: isMajor ? `${gy}L` : ''
      });
    }

    return { vLines, hLines };
  }, [viewBox.x, viewBox.y, viewBox.w, viewBox.h]);

  // Apply new dimension length between nodeA and nodeB
  const handleApplyNewDim = (newVal: number) => {
    if (!activeDimensionHud) return;
    const { type, val: oldVal, nodeAId, nodeBId } = activeDimensionHud;
    const delta = newVal - oldVal;
    if (Math.abs(delta) < 1e-5) {
      setActiveDimensionHud(null);
      return;
    }

    const nodeA = state.nodes.find((n) => n.id === nodeAId);
    const nodeB = state.nodes.find((n) => n.id === nodeBId);
    if (!nodeA || !nodeB) {
      setActiveDimensionHud(null);
      return;
    }

    onChange((prev) => {
      const coordA = type === 'h' ? nodeA.x : nodeA.y;
      const coordB = type === 'h' ? nodeB.x : nodeB.y;
      const minCoord = Math.min(coordA, coordB);
      const isShiftRightOrUp = coordB > coordA;

      const updatedNodes = prev.nodes.map((n) => {
        const c = type === 'h' ? n.x : n.y;
        if (isShiftRightOrUp ? c > minCoord + 1e-4 : c < minCoord - 1e-4) {
          return {
            ...n,
            [type === 'h' ? 'x' : 'y']: Number((c + (isShiftRightOrUp ? delta : -delta)).toFixed(4))
          };
        }
        return n;
      });

      const nMap: Record<number, FeaNode> = {};
      updatedNodes.forEach((n) => (nMap[n.id] = n));

      const updatedElems = prev.elements.map((el) => {
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

      return {
        ...prev,
        id: 'custom',
        nodes: updatedNodes,
        elements: updatedElems
      };
    });

    setActiveDimensionHud(null);
  };

  const selectedNode = state.nodes.find((n) => n.id === selectedNodeId);
  const selectedElement = state.elements.find((el) => el.id === selectedElemId);

  return (
    <div className="relative flex flex-col h-full bg-[#f8fafc] select-none overflow-hidden">
      {/* Top Floating Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-lg border border-slate-200">
        <button
          onClick={() => {
            setActiveTool('select');
            setConnectStartNodeId(null);
          }}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-xs transition-colors ${
            activeTool === 'select'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title={t.toolSelect}
        >
          <MousePointer className="w-3.5 h-3.5" /> {t.toolSelect}
        </button>

        <button
          onClick={() => {
            setActiveTool('addNode');
            setConnectStartNodeId(null);
          }}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-xs transition-colors ${
            activeTool === 'addNode'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title={t.toolAddNode}
        >
          <Plus className="w-3.5 h-3.5" /> {t.toolAddNode}
        </button>

        <button
          onClick={() => {
            setActiveTool('addBar');
            setConnectStartNodeId(null);
          }}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-xs transition-colors ${
            activeTool === 'addBar'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title={t.toolAddBar}
        >
          <Link2 className="w-3.5 h-3.5" /> {t.toolAddBar}
        </button>

        <button
          onClick={() => {
            setActiveTool('delete');
            setConnectStartNodeId(null);
          }}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-xs transition-colors ${
            activeTool === 'delete'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title={t.toolDelete}
        >
          <Trash2 className="w-3.5 h-3.5" /> {t.toolDelete}
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-1" />

        {/* Visibility Toggles */}
        <button
          onClick={() => setShowDofs(!showDofs)}
          className={`px-2 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors ${
            showDofs ? 'bg-red-100 text-red-700' : 'text-slate-500 hover:bg-slate-100'
          }`}
          title={t.showDofs}
        >
          <Eye className="w-3.5 h-3.5" /> {t.showDofs}
        </button>

        <button
          onClick={() => setShowDimensions(!showDimensions)}
          className={`px-2 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors ${
            showDimensions ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
          }`}
          title={t.showDimensions}
        >
          <Compass className="w-3.5 h-3.5" /> {t.showDimensions}
        </button>

        {/* Snap to Grid Selector */}
        <button
          onClick={() => setSnapStep((s) => (s === 0.5 ? 0.25 : s === 0.25 ? 1.0 : 0.5))}
          className="px-2 py-1.5 rounded-lg font-bold text-[11px] text-slate-600 hover:bg-slate-100 border border-slate-200"
          title="Alterar Resolução da Grelha Magnética"
        >
          Grelha: {snapStep}L
        </button>
      </div>

      {/* SVG Interactive Canvas */}
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
          const wPos = getWorldCoords(e.clientX, e.clientY, true);
          setHoverWorld({ x: wPos.x, y: wPos.y, visible: true });
        }}
        onPointerLeave={() => setHoverWorld((h) => ({ ...h, visible: false }))}
      >
        <defs>
          <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
          </marker>
          <marker id="arrow-force" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#0f172a" />
          </marker>
          <marker id="arrow-dist" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
          </marker>
        </defs>

        {/* 1. Grid */}
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
                <text x={gl.x + 4} y={viewBox.y + viewBox.h - 10} fontSize="10" fontWeight="700" fill="#94a3b8">
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

        {/* 2. CAD Dimensions Overlay */}
        {showDimensions && (
          <CadDimensions
            nodes={state.nodes}
            scale={SCALE}
            onDimensionClick={(type, val, nA, nB) => {
              const nodeA = state.nodes.find((n) => n.id === nA);
              const nodeB = state.nodes.find((n) => n.id === nB);
              if (nodeA && nodeB) {
                setActiveDimensionHud({
                  type,
                  val,
                  nodeAId: nA,
                  nodeBId: nB,
                  nodeALabel: nodeA.label,
                  nodeBLabel: nodeB.label
                });
                setSelectedNodeId(null);
                setSelectedElemId(null);
                setActiveDofHud(null);
              }
            }}
          />
        )}

        {/* 3. Ghost Line When Connecting Bar */}
        {activeTool === 'addBar' && connectStartNodeId && hoverWorld.visible && (() => {
          const startN = state.nodes.find((n) => n.id === connectStartNodeId);
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

        {/* 4. Elements (Bars, Beams, Springs) and Distributed Loads */}
        {analysis.mcRows.map((row) => {
          const n1 = state.nodes.find((n) => n.id === row.n1);
          const n2 = state.nodes.find((n) => n.id === row.n2);
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
          const nx = uy;
          const ny = -ux;

          const isSelected = selectedElemId === row.id;
          const isTarget = state.targetBar === row.index;

          let springPath: string | null = null;
          if (state.mode === 'Mola') {
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

          const propLabel =
            state.mode === 'Mola'
              ? `${fmtNum(row.k)}k`
              : state.mode === 'Viga'
              ? `${row.E !== 1 ? `${fmtNum(row.E)}E,` : 'E,'}${row.I !== 1 ? `${fmtNum(row.I)}I` : 'I'} (${fmtSymbolicL(row.L)})`
              : `${row.E !== 1 ? `${fmtNum(row.E)}E,` : 'E,'}${row.A !== 1 ? `${fmtNum(row.A)}A` : 'A'} (${fmtSymbolicL(row.L)})`;

          return (
            <g
              key={row.id}
              data-interactive="true"
              onPointerDown={(e) => handleElementPointerDown(e, row)}
              className="cursor-pointer group"
            >
              {/* Distributed Load */}
              <DistributedLoadSvg row={row} p1={p1} p2={p2} nx={nx} ny={ny} dx={dx} dy={dy} />

              {/* Invisible thick hit-area */}
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth="22" />

              {/* Body */}
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
                  strokeWidth={isSelected ? 6 : 4.5}
                  strokeLinecap="round"
                />
              )}

              {/* Angle Arc Badge */}
              {showAngles && state.mode !== 'Mola' && (
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

              {/* Material / Length Pill */}
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

        {/* 5. Nodes, Supports, Nodal Loads, and DOF Arrows */}
        {state.nodes.map((node) => {
          const pos = worldToSvg(node.x, node.y);
          const isSelected = selectedNodeId === node.id;
          const isConnectStart = connectStartNodeId === node.id;
          const d = analysis.nodeDofs[node.id] || {};

          return (
            <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
              {/* Technical Support Drawing */}
              <SupportsSvg node={node} />

              {/* Global Red DOF Arrows (u1, u2...) */}
              {showDofs && (
                <DofOverlaySvg
                  dofs={d}
                  onDofClick={(dofIdx) => {
                    onSelectDof?.(dofIdx);
                    setActiveDofHud({
                      dofIdx,
                      nodeLabel: node.label
                    });
                    setSelectedNodeId(null);
                    setSelectedElemId(null);
                    setActiveDimensionHud(null);
                  }}
                />
              )}

              {/* Applied Nodal Loads */}
              <NodalLoadSvg node={node} forceSym={state.forceSym} />

              {/* Interactive Node Point */}
              <circle
                data-interactive="true"
                r={isSelected || isConnectStart ? 11 : 8.5}
                fill={isConnectStart ? '#10b981' : isSelected ? '#f59e0b' : '#ffffff'}
                stroke={isConnectStart ? '#047857' : isSelected ? '#b45309' : '#0f172a'}
                strokeWidth="3"
                className="cursor-grab active:cursor-grabbing transition-transform"
                onPointerDown={(e) => handleNodePointerDown(e, node)}
              />

              {/* Node Letter (A, B, C...) */}
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

        {/* 6. Ghost Magnetic Intersection Cursor */}
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

      {/* Bottom-Left Zoom & Camera Controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow-md border border-slate-200 z-10">
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
          title={t.zoomIn}
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
          title={t.zoomOut}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => centerView()}
          className="p-1 hover:bg-slate-100 rounded text-slate-700 flex items-center gap-1 text-xs font-bold px-1.5"
          title={t.centerView}
        >
          <Maximize2 className="w-3.5 h-3.5" /> {t.centerView}
        </button>
      </div>

      {/* Floating HUD Popover for Selected Node */}
      {selectedNode && (
        <NodeHud
          node={selectedNode}
          mode={state.mode}
          onUpdate={(updates) => {
            onChange((prev) => ({
              ...prev,
              id: 'custom',
              nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, ...updates } : n))
            }));
          }}
          onDelete={() => {
            onChange((prev) => ({
              ...prev,
              id: 'custom',
              nodes: prev.nodes.filter((n) => n.id !== selectedNode.id),
              elements: prev.elements.filter((el) => el.n1 !== selectedNode.id && el.n2 !== selectedNode.id)
            }));
            setSelectedNodeId(null);
          }}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* Floating HUD Popover for Selected Element */}
      {selectedElement && (
        <ElementHud
          element={selectedElement}
          mode={state.mode}
          onUpdate={(updates) => {
            onChange((prev) => ({
              ...prev,
              id: 'custom',
              elements: prev.elements.map((el) => (el.id === selectedElement.id ? { ...el, ...updates } : el))
            }));
          }}
          onDelete={() => {
            onChange((prev) => ({
              ...prev,
              id: 'custom',
              elements: prev.elements.filter((el) => el.id !== selectedElement.id)
            }));
            setSelectedElemId(null);
          }}
          onClose={() => setSelectedElemId(null)}
        />
      )}

      {/* Floating HUD Popover for Selected Dimension */}
      {activeDimensionHud && (
        <DimensionHud
          dimInfo={activeDimensionHud}
          onApplyNewDim={handleApplyNewDim}
          onClose={() => setActiveDimensionHud(null)}
        />
      )}

      {/* Floating HUD Popover for Selected DOF Reordering */}
      {activeDofHud && (
        <DofReorderHud
          dofIdx={activeDofHud.dofIdx}
          maxDof={analysis.nDof}
          nodeLabel={activeDofHud.nodeLabel}
          onSwapDof={(targetDof) => {
            onReorderDof?.(activeDofHud.dofIdx, targetDof);
            setActiveDofHud(null);
          }}
          onClose={() => setActiveDofHud(null)}
        />
      )}
    </div>
  );
};
