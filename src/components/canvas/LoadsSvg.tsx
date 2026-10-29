// ============================================================================
// LOADS SVG (FORÇAS CONCENTRADAS, MOMENTOS E CARGAS DISTRIBUÍDAS)
// ============================================================================

import React from 'react';
import { FeaElement, FeaNode, McRow } from '../../types/fea';
import { cosd, evalCustomLoadAt, fmtNum, sind } from '../../engine/expr';

interface NodalLoadProps {
  node: FeaNode;
  forceSym?: string;
}

export const NodalLoadSvg: React.FC<NodalLoadProps> = ({ node, forceSym = 'P' }) => {
  const fx = Number(node.fx) || 0;
  const fy = Number(node.fy) || 0;
  const mz = Number(node.mz) || 0;
  const hasForce = Math.abs(fx) > 1e-9 || Math.abs(fy) > 1e-9;
  const hasMoment = Math.abs(mz) > 1e-9;

  if (!hasForce && !hasMoment) return null;

  return (
    <g className="pointer-events-none select-none">
      {/* Força com ângulo polar personalizado (ex: 2P a 20° no Ex. 5) */}
      {node.forceMag && node.forceAngle !== undefined ? (
        (() => {
          const ang = Number(node.forceAngle) || 0;
          const len = 58;
          const x2 = len * cosd(ang);
          const y2 = -len * sind(ang);
          return (
            <g>
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
                {forceSym} ({ang}°)
              </text>
            </g>
          );
        })()
      ) : (
        <>
          {/* Força Horizontal Fx */}
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
                {forceSym}
              </text>
            </g>
          )}

          {/* Força Vertical Fy */}
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
                {forceSym}
              </text>
            </g>
          )}
        </>
      )}

      {/* Momento Concentrado Mz */}
      {hasMoment && (
        <g>
          <path
            d={mz > 0 ? "M -20,0 A 20,20 0 1,1 0,-20" : "M 0,-20 A 20,20 0 1,1 -20,0"}
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.5"
            markerEnd="url(#arrow-force)"
          />
          <text
            x={mz > 0 ? "-24" : "24"}
            y="-22"
            fill="#0f172a"
            fontSize="12.5"
            fontWeight="900"
          >
            {Math.abs(mz) === 1 ? '' : fmtNum(Math.abs(mz))}M
          </text>
        </g>
      )}
    </g>
  );
};

interface DistributedLoadProps {
  row: McRow;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  nx: number;
  ny: number;
  dx: number;
  dy: number;
}

export const DistributedLoadSvg: React.FC<DistributedLoadProps> = ({
  row,
  p1,
  p2,
  nx,
  ny,
  dx,
  dy
}) => {
  const hasDist =
    Boolean(row.py && row.py.trim() !== '') ||
    Math.abs(row.p0 || 0) > 1e-9 ||
    Math.abs(row.pL || 0) > 1e-9;

  if (!hasDist) return null;

  const nArrows = 8;
  const maxH = 40;
  const pts: string[] = [];
  const arrows: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

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
    const maxVal = Math.max(1, Math.abs(row.p0 || 0), Math.abs(row.pL || 0));
    const mag = Math.min(1.5, Math.abs(val) / maxVal);
    const h = Math.max(12, mag * maxH);
    const tx = bx - nx * h * sign;
    const ty = by - ny * h * sign;
    pts.push(`${tx},${ty}`);
    if (Math.abs(val) > 1e-6) {
      arrows.push({ x1: tx, y1: ty, x2: bx - nx * 4 * sign, y2: by - ny * 4 * sign });
    }
  }

  const polyPts = `${p1.x},${p1.y} ${pts.join(' ')} ${p2.x},${p2.y}`;
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  return (
    <g className="pointer-events-none select-none">
      <polygon points={polyPts} fill="rgba(37, 99, 235, 0.12)" stroke="#2563eb" strokeWidth="1.4" />
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
        x={mx - nx * 48}
        y={my - ny * 48}
        textAnchor="middle"
        fill="#1d4ed8"
        fontSize="11.5"
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
};
