// ============================================================================
// DOF OVERLAY SVG (GRAUS DE LIBERDADE: SETAS VERMELHAS u1, u2... E ROTAÇÃO)
// ============================================================================

import React from 'react';

const toUnicodeSub = (n: number | string) => {
  const map: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
  };
  return String(n).split('').map((c) => map[c] || c).join('');
};

interface DofOverlayProps {
  dofs: {
    u?: number;
    v?: number;
    th?: number;
    isInclined?: boolean;
    rollerAngle?: number;
  };
  onDofClick?: (dofIndex: number, type: 'u' | 'v' | 'th') => void;
}

export const DofOverlaySvg: React.FC<DofOverlayProps> = ({ dofs, onDofClick }) => {
  return (
    <g className="select-none">
      {/* Translação Horizontal ou Tangencial (u) */}
      {dofs.u !== undefined && dofs.u > 0 && (
        (() => {
          const ang = dofs.isInclined ? -(dofs.rollerAngle || 0) : 0;
          return (
            <g
              transform={`rotate(${ang})`}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onDofClick?.(dofs.u!, 'u');
              }}
            >
              <line
                x1="12"
                y1="0"
                x2="52"
                y2="0"
                stroke="#dc2626"
                strokeWidth="2.8"
                markerEnd="url(#arrow-red)"
                className="group-hover:stroke-red-700 transition-colors"
              />
              <text
                x="60"
                y="4"
                fill="#dc2626"
                fontSize="14"
                fontWeight="900"
                fontStyle="italic"
                className="group-hover:fill-red-700 group-hover:scale-110 transition-transform origin-left font-serif"
              >
                u{toUnicodeSub(dofs.u)}
              </text>
            </g>
          );
        })()
      )}

      {/* Translação Vertical (v) */}
      {dofs.v !== undefined && dofs.v > 0 && (
        <g
          className="cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            onDofClick?.(dofs.v!, 'v');
          }}
        >
          <line
            x1="0"
            y1="-12"
            x2="0"
            y2="-52"
            stroke="#dc2626"
            strokeWidth="2.8"
            markerEnd="url(#arrow-red)"
            className="group-hover:stroke-red-700 transition-colors"
          />
          <text
            x="10"
            y="-46"
            fill="#dc2626"
            fontSize="14"
            fontWeight="900"
            fontStyle="italic"
            className="group-hover:fill-red-700 group-hover:scale-110 transition-transform origin-left font-serif"
          >
            u{toUnicodeSub(dofs.v)}
          </text>
        </g>
      )}

      {/* Rotação (θ) */}
      {dofs.th !== undefined && dofs.th > 0 && (
        <g
          className="cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            onDofClick?.(dofs.th!, 'th');
          }}
        >
          <path
            d="M 16 -12 A 20 20 0 1 0 -16 -12"
            fill="none"
            stroke="#dc2626"
            strokeWidth="2.4"
            markerEnd="url(#arrow-red)"
            className="group-hover:stroke-red-700 transition-colors"
          />
          <text
            x="-34"
            y="-18"
            fill="#dc2626"
            fontSize="13.5"
            fontWeight="900"
            fontStyle="italic"
            className="group-hover:fill-red-700 group-hover:scale-110 transition-transform origin-right font-serif"
          >
            u{toUnicodeSub(dofs.th)}
          </text>
        </g>
      )}
    </g>
  );
};
