// ============================================================================
// FLOATING HUD (POPOVERS FLUTUANTES NO ESQUEMA: NÓ, ELEMENTO, COTA, GDL)
// ============================================================================

import React from 'react';
import { X, Trash2, Anchor, Link2, Sliders } from 'lucide-react';
import { FeaElement, FeaMode, FeaNode, SupportType } from '../../types/fea';

interface NodeHudProps {
  node: FeaNode;
  mode: FeaMode;
  onUpdate: (updates: Partial<FeaNode>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const NodeHud: React.FC<NodeHudProps> = ({
  node,
  mode,
  onUpdate,
  onDelete,
  onClose
}) => {
  return (
    <div className="absolute top-3 right-3 w-80 bg-white/98 backdrop-blur-md rounded-xl shadow-2xl border border-slate-300 p-4 z-20 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-xs">
            {node.label}
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Editar Nó {node.label}</h3>
            <p className="text-[10px] text-slate-500">Coordenadas, Apoios e Forças</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Coordenadas e Etiqueta */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome</label>
          <input
            type="text"
            value={node.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">X (em L)</label>
          <input
            type="number"
            step="0.25"
            value={node.x}
            onChange={(e) => onUpdate({ x: parseFloat(e.target.value) || 0 })}
            className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-slate-900"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Y (em L)</label>
          <input
            type="number"
            step="0.25"
            value={node.y}
            onChange={(e) => onUpdate({ y: parseFloat(e.target.value) || 0 })}
            className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-slate-900"
          />
        </div>
      </div>

      {/* Tipo de Apoio */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
          <Anchor className="w-3 h-3 text-slate-400" /> Condição de Fronteira / Apoio
        </label>
        <select
          value={node.support || 'free'}
          onChange={(e) => {
            const sup = e.target.value as SupportType;
            onUpdate({
              support: sup,
              rollerAngle: sup === 'rollerAngle' ? node.rollerAngle || 30 : 0
            });
          }}
          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
        >
          <option value="free">Livre (Sem Apoio)</option>
          <option value="pinned">Apoio Fixo (Duplo) (u=0, v=0)</option>
          <option value="rollerX">Apoio Rolante Horizontal 0° (u livre, v=0)</option>
          <option value="rollerY">Apoio Rolante Vertical 90° (u=0, v livre)</option>
          <option value="rollerAngle">Apoio Rolante Inclinado α° (Ex. 4 / Ex. 5)</option>
          <option value="fixed">Encastramento (u=0, v=0, θ=0)</option>
          <option value="guided">Simetria / Apoio Guiado (v livre, θ=0 — Ex. 8)</option>
        </select>
      </div>

      {/* Ângulo de Apoio Inclinado */}
      {node.support === 'rollerAngle' && (
        <div className="bg-sky-50 p-2.5 rounded-lg border border-sky-200">
          <label className="block text-[10px] font-bold text-sky-800 uppercase mb-1">
            Plano do Apoio Rolante Inclinado α (°)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="5"
              value={node.rollerAngle || 0}
              onChange={(e) => onUpdate({ rollerAngle: parseFloat(e.target.value) || 0 })}
              className="w-20 px-2 py-1 bg-white border border-sky-300 rounded font-mono font-bold"
            />
            {[-30, -20, 20, 30, 45].map((ang) => (
              <button
                key={ang}
                onClick={() => onUpdate({ rollerAngle: ang })}
                className="px-2 py-1 bg-white hover:bg-sky-100 border border-sky-300 rounded font-bold text-[11px]"
              >
                {ang}°
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Forças Concentradas Aplicadas */}
      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
        <label className="block text-[10px] font-bold text-slate-700 uppercase">
          Forças Nodais Aplicadas (em múltiplos de P / mg)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-500 font-bold">Fx (Horizontal)</span>
            <input
              type="number"
              step="0.5"
              value={node.fx || 0}
              onChange={(e) => onUpdate({ fx: parseFloat(e.target.value) || 0 })}
              className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold">Fy (Vertical)</span>
            <input
              type="number"
              step="0.5"
              value={node.fy || 0}
              onChange={(e) => onUpdate({ fy: parseFloat(e.target.value) || 0 })}
              className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
            />
          </div>
        </div>

        {mode !== 'Mola' && mode !== 'Barra2D' && (
          <div>
            <span className="text-[10px] text-slate-500 font-bold">Mz (Momento Fletor Concentrado)</span>
            <input
              type="number"
              step="0.5"
              value={node.mz || 0}
              onChange={(e) => onUpdate({ mz: parseFloat(e.target.value) || 0 })}
              className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
            />
          </div>
        )}
      </div>

      <div className="pt-1 flex items-center justify-between">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Eliminar Nó
        </button>
        <button
          onClick={onClose}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors"
        >
          Concluir
        </button>
      </div>
    </div>
  );
};

interface ElementHudProps {
  element: FeaElement;
  mode: FeaMode;
  onUpdate: (updates: Partial<FeaElement>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ElementHud: React.FC<ElementHudProps> = ({
  element,
  mode,
  onUpdate,
  onDelete,
  onClose
}) => {
  return (
    <div className="absolute top-3 right-3 w-84 bg-white/98 backdrop-blur-md rounded-xl shadow-2xl border border-slate-300 p-4 z-20 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs">
            {element.id}
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Editar Elemento #{element.id}</h3>
            <p className="text-[10px] text-slate-500">Secção, Comprimento e Carregamentos</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Propriedades de Material / Rigidez */}
      {mode === 'Mola' ? (
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Constante de Rigidez da Mola (k)
          </label>
          <input
            type="number"
            step="1"
            value={element.k || 1}
            onChange={(e) => onUpdate({ k: parseFloat(e.target.value) || 1 })}
            className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold"
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Módulo E</label>
            <input
              type="number"
              step="0.5"
              value={element.E || 1}
              onChange={(e) => onUpdate({ E: parseFloat(e.target.value) || 1 })}
              className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Área A</label>
            <input
              type="number"
              step="0.5"
              value={element.A || 1}
              onChange={(e) => onUpdate({ A: parseFloat(e.target.value) || 1 })}
              className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
            />
          </div>
          {(mode === 'Viga' || mode === 'VigaBarra2D') && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Inércia I</label>
              <input
                type="number"
                step="0.5"
                value={element.I || 1}
                onChange={(e) => onUpdate({ I: parseFloat(e.target.value) || 1 })}
                className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded font-mono font-bold"
              />
            </div>
          )}
        </div>
      )}

      {/* Comprimento L nominal */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
          Comprimento Nominal L (em múltiplos de L)
        </label>
        <input
          type="number"
          step="0.1"
          value={element.L || 1}
          onChange={(e) => onUpdate({ L: parseFloat(e.target.value) || 1, lockL: true })}
          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
        />
      </div>

      {/* Cargas Distribuídas (Viga e Pórtico) */}
      {(mode === 'Viga' || mode === 'VigaBarra2D') && (
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
          <label className="block text-[10px] font-bold text-slate-700 uppercase">
            Cargas Distribuídas (p)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 font-bold">p no Nó Inicial</span>
              <input
                type="number"
                step="0.5"
                value={element.p0 || 0}
                onChange={(e) => onUpdate({ p0: parseFloat(e.target.value) || 0 })}
                className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold">p no Nó Final</span>
              <input
                type="number"
                step="0.5"
                value={element.pL || 0}
                onChange={(e) => onUpdate({ pL: parseFloat(e.target.value) || 0 })}
                className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-bold">Expressão Customizada p(x)</span>
            <input
              type="text"
              placeholder="ex: -x^3/L^3 ou -2*x^2/L"
              value={element.py || ''}
              onChange={(e) => onUpdate({ py: e.target.value })}
              className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-blue-700"
            />
          </div>
        </div>
      )}

      <div className="pt-1 flex items-center justify-between">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Eliminar Barra
        </button>
        <button
          onClick={onClose}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors"
        >
          Concluir
        </button>
      </div>
    </div>
  );
};
