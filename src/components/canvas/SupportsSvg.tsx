// ============================================================================
// SUPPORTS SVG (APOIOS TÉCNICOS SEGUNDO NORMA ESTG)
// ============================================================================

import React from 'react';
import { FeaNode, SupportType } from '../../types/fea';

interface SupportsSvgProps {
  node: FeaNode;
}

export const SupportsSvg: React.FC<SupportsSvgProps> = ({ node }) => {
  const sup: SupportType = node.support || 'free';

  if (sup === 'free') return null;

  if (sup === 'pinned') {
    return (
      <g className="pointer-events-none select-none">
        {/* Triângulo do apoio fixo duplo */}
        <polygon points="0,4 -16,26 16,26" fill="#f8fafc" stroke="#334155" strokeWidth="2.2" />
        {/* Linha de terra */}
        <line x1="-22" y1="26" x2="22" y2="26" stroke="#334155" strokeWidth="2.5" />
        {/* Hachuras técnicas de fundação a 45° */}
        {[-16, -8, 0, 8, 16].map((hx, i) => (
          <line key={i} x1={hx} y1="26" x2={hx - 5} y2="34" stroke="#64748b" strokeWidth="1.6" />
        ))}
      </g>
    );
  }

  if (sup === 'rollerX' || sup === 'rollerY' || sup === 'rollerAngle') {
    const rot =
      sup === 'rollerY'
        ? -90
        : sup === 'rollerAngle'
        ? -(Number(node.rollerAngle) || 0)
        : 0;

    return (
      <g transform={`rotate(${rot})`} className="pointer-events-none select-none">
        {/* Triângulo com roletes */}
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
  }

  if (sup === 'fixed') {
    return (
      <g className="pointer-events-none select-none">
        {/* Parede de encastramento */}
        <line x1="-20" y1="10" x2="20" y2="10" stroke="#0f172a" strokeWidth="3.5" />
        {[-16, -8, 0, 8, 16].map((hx, i) => (
          <line key={i} x1={hx} y1="10" x2={hx - 6} y2="20" stroke="#475569" strokeWidth="1.8" />
        ))}
      </g>
    );
  }

  if (sup === 'guided') {
    return (
      <g className="pointer-events-none select-none">
        {/* Guia de simetria (impede rotação, liberta translação transversal) */}
        <line x1="10" y1="-20" x2="10" y2="20" stroke="#0f172a" strokeWidth="2.5" />
        <circle cx="6" cy="-10" r="3" fill="#fff" stroke="#0f172a" strokeWidth="1.6" />
        <circle cx="6" cy="10" r="3" fill="#fff" stroke="#0f172a" strokeWidth="1.6" />
        <text x="16" y="4" fontSize="9.5" fontWeight="800" fill="#0369a1">
          Simetria
        </text>
      </g>
    );
  }

  return null;
};
