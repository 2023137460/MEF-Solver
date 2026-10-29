// ============================================================================
// CAD DIMENSIONS SVG (COTAS TÉCNICAS AUTOMÁTICAS E CLICÁVEIS)
// ============================================================================

import React from 'react';
import { FeaNode } from '../../types/fea';
import { fmtSymbolicL } from '../../engine/expr';

interface CadDimensionsProps {
  nodes: FeaNode[];
  scale: number; // 1L = 160px
  onDimensionClick?: (type: 'h' | 'v', val: number, nodeAId: number, nodeBId: number) => void;
}

export const CadDimensions: React.FC<CadDimensionsProps> = ({
  nodes,
  scale,
  onDimensionClick
}) => {
  if (!nodes || nodes.length < 2) return null;

  // Extract unique X coordinates and Y coordinates sorted
  const sortedX = Array.from(new Set(nodes.map((n) => Number(n.x.toFixed(4))))).sort((a, b) => a - b);
  const sortedY = Array.from(new Set(nodes.map((n) => Number(n.y.toFixed(4))))).sort((a, b) => a - b);

  const minY = Math.min(...nodes.map((n) => -n.y * scale));
  const maxY = Math.max(...nodes.map((n) => -n.y * scale));
  const minX = Math.min(...nodes.map((n) => n.x * scale));
  const maxX = Math.max(...nodes.map((n) => n.x * scale));

  const bottomCotaY = maxY + 45;
  const leftCotaX = minX - 45;

  return (
    <g className="select-none pointer-events-none">
      {/* 1. HORIZONTAL CAD DIMENSIONS (COTAS HORIZONTAIS) */}
      {sortedX.length > 1 &&
        sortedX.slice(0, -1).map((x1, i) => {
          const x2 = sortedX[i + 1];
          const dxL = x2 - x1;
          if (dxL < 0.1) return null;

          const px1 = x1 * scale;
          const px2 = x2 * scale;
          const mx = (px1 + px2) / 2;
          const label = fmtSymbolicL(dxL);

          const node1 = nodes.find((n) => Math.abs(n.x - x1) < 1e-4);
          const node2 = nodes.find((n) => Math.abs(n.x - x2) < 1e-4);

          return (
            <g key={`cota-h-${i}`} className="pointer-events-auto">
              {/* Linhas de chamada (extension lines) */}
              <line
                x1={px1}
                y1={bottomCotaY - 25}
                x2={px1}
                y2={bottomCotaY + 8}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <line
                x1={px2}
                y1={bottomCotaY - 25}
                x2={px2}
                y2={bottomCotaY + 8}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />

              {/* Linha de cota principal com traços inclinados a 45° estilo CAD */}
              <line
                x1={px1}
                y1={bottomCotaY}
                x2={px2}
                y2={bottomCotaY}
                stroke="#475569"
                strokeWidth="1.4"
              />
              {/* Ticks oblíquos a 45° */}
              <line
                x1={px1 - 4}
                y1={bottomCotaY + 4}
                x2={px1 + 4}
                y2={bottomCotaY - 4}
                stroke="#334155"
                strokeWidth="1.6"
              />
              <line
                x1={px2 - 4}
                y1={bottomCotaY + 4}
                x2={px2 + 4}
                y2={bottomCotaY - 4}
                stroke="#334155"
                strokeWidth="1.6"
              />

              {/* Pill clicável com o valor da cota */}
              <g
                transform={`translate(${mx}, ${bottomCotaY})`}
                className="cursor-pointer group"
                onClick={() => {
                  if (node1 && node2) {
                    onDimensionClick?.('h', dxL, node1.id, node2.id);
                  }
                }}
              >
                <rect
                  x="-22"
                  y="-10"
                  width="44"
                  height="18"
                  rx="4"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  className="group-hover:stroke-blue-500 group-hover:fill-blue-50 transition-colors"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fontWeight="800"
                  fill="#334155"
                  className="group-hover:fill-blue-700 transition-colors"
                >
                  {label}
                </text>
              </g>
            </g>
          );
        })}

      {/* 2. VERTICAL CAD DIMENSIONS (COTAS VERTICAIS) */}
      {sortedY.length > 1 &&
        sortedY.slice(0, -1).map((y1, i) => {
          const y2 = sortedY[i + 1];
          const dyL = y2 - y1;
          if (dyL < 0.1) return null;

          const py1 = -y1 * scale;
          const py2 = -y2 * scale;
          const my = (py1 + py2) / 2;
          const label = fmtSymbolicL(dyL);

          const node1 = nodes.find((n) => Math.abs(n.y - y1) < 1e-4);
          const node2 = nodes.find((n) => Math.abs(n.y - y2) < 1e-4);

          return (
            <g key={`cota-v-${i}`} className="pointer-events-auto">
              {/* Linhas de chamada */}
              <line
                x1={leftCotaX - 8}
                y1={py1}
                x2={leftCotaX + 25}
                y2={py1}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <line
                x1={leftCotaX - 8}
                y1={py2}
                x2={leftCotaX + 25}
                y2={py2}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />

              {/* Linha de cota principal */}
              <line
                x1={leftCotaX}
                y1={py1}
                x2={leftCotaX}
                y2={py2}
                stroke="#475569"
                strokeWidth="1.4"
              />
              {/* Ticks oblíquos a 45° */}
              <line
                x1={leftCotaX - 4}
                y1={py1 + 4}
                x2={leftCotaX + 4}
                y2={py1 - 4}
                stroke="#334155"
                strokeWidth="1.6"
              />
              <line
                x1={leftCotaX - 4}
                y1={py2 + 4}
                x2={leftCotaX + 4}
                y2={py2 - 4}
                stroke="#334155"
                strokeWidth="1.6"
              />

              {/* Pill clicável com o valor da cota */}
              <g
                transform={`translate(${leftCotaX}, ${my})`}
                className="cursor-pointer group"
                onClick={() => {
                  if (node1 && node2) {
                    onDimensionClick?.('v', dyL, node1.id, node2.id);
                  }
                }}
              >
                <rect
                  x="-22"
                  y="-10"
                  width="44"
                  height="18"
                  rx="4"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  className="group-hover:stroke-blue-500 group-hover:fill-blue-50 transition-colors"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fontWeight="800"
                  fill="#334155"
                  className="group-hover:fill-blue-700 transition-colors"
                >
                  {label}
                </text>
              </g>
            </g>
          );
        })}
    </g>
  );
};
