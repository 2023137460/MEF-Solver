// ============================================================================
// FEA TYPES & INTERFACES (ESTG / ULO - Elementos Finitos)
// ============================================================================

export type SupportType =
  | 'free'         // Livre
  | 'pinned'       // Apoio Fixo (Duplo)
  | 'rollerX'      // Apoio Rolante Horizontal (0°)
  | 'rollerY'      // Apoio Rolante Vertical (90°)
  | 'rollerAngle'  // Apoio Rolante Inclinado (α°)
  | 'fixed'        // Encastramento
  | 'guided';      // Simetria / Apoio Guiado

export type FeaMode = 'Mola' | 'Barra2D' | 'Viga' | 'VigaBarra2D';

export interface FeaNode {
  id: number;
  label: string;
  x: number;
  y: number;
  support?: SupportType;
  rollerAngle?: number; // Ângulo em graus do plano de rolamento
  fx?: number;
  fy?: number;
  mz?: number;
  forceMag?: number;
  forceAngle?: number;
  mass?: number;
  calcReactionY?: boolean; // Para Ex. 9 (adicionar GDL restringido u=0 para obter a reação)
  customDofs?: { [key: string]: number }; // Reordenação manual de GDL
}

export interface FeaElement {
  id: number;
  n1: number;
  n2: number;
  E?: number;
  A?: number;
  I?: number;
  L?: number;
  k?: number;
  th1?: number; // Ângulo no nó inicial (graus)
  th2?: number; // Ângulo no nó final (graus)
  p0?: number;  // Carga distribuída inicial
  pL?: number;  // Carga distribuída final
  py?: string;  // Expressão customizada de carga, ex: '-x^3/L^3' ou '-2*x^2/L'
  lockL?: boolean;
  customAngles?: boolean;
}

export interface FeaPreset {
  id: string;
  num?: number | null;
  title: string;
  mode: FeaMode;
  forceSym?: string;
  targetBar?: number;
  targetXi?: number;
  nodes: FeaNode[];
  elements: FeaElement[];
  description?: string;
  customDofs?: Record<number, number>; // Reordenação manual de GDL (antigo -> novo)
}

export interface ProblemConfig {
  variables: {
    E: number | null; // null = simbólico
    A: number | null;
    I: number | null;
    L: number | null;
    P: number | null;
    p: number | null;
    k: number | null;
    m: number | null;
    rho: number | null;
  };
  substituteInertia: boolean; // I = n * A * L^2
  inertiaN: number;           // Fator n
  targetBar: number;
  targetXi: number;
}

export interface ActiveQuestions {
  mcTable: boolean;           // Matriz de Conectividade
  stiffnessMatrix: boolean;   // Matriz [K] global
  forceVector: boolean;       // Vetor de Forças {F} com integrais passo a passo
  displacements: boolean;     // Deslocamentos nodais {u}
  reactions: boolean;         // Reações de apoio
  stresses: boolean;          // Tensão axial σ e esforço normal N
  criticalZone: boolean;      // Zona crítica da estrutura (|σ|_max)
  interpolation: boolean;     // Deslocamento, rotação, M(x), V(x) num ponto x
  criticalPoints: boolean;    // Zeros de rotação θ(x)=0, deslocamento nulo, extremos
  vibrations: boolean;        // Modos de vibração e frequências naturais
  potentialEnergy: boolean;   // Princípio da Energia Potencial Mínima
}

export interface DofInfo {
  index: number;
  nodeId: number;
  nodeLabel: string;
  type: 'u' | 'v' | 'th' | 'u_inc';
  angle: number;
  constrainedZero?: boolean;
}

export interface McRow extends FeaElement {
  index: number;
  n1Label: string;
  n2Label: string;
  dofs: number[];
  L: number;
  th1: number;
  th2: number;
  E: number;
  A: number;
  I: number;
  k: number;
  p0: number;
  pL: number;
  py: string;
}

export interface BarStressResult {
  elem: number;
  label: string;
  th1: number;
  th2: number;
  L: number;
  E: number;
  A: number;
  dofs: number[];
  U: number[];
  u1Local: number;
  u2Local: number;
  delta: number;
  sigma: number;
  N: number;
}

export interface ElemForceDetail {
  elem: number;
  L: number;
  th1?: number;
  th2?: number;
  p0?: number;
  pL?: number;
  P1?: number;
  P2?: number;
  py?: string;
  hasCustom?: boolean;
  fLocal: number[];
  fGlobal?: number[];
  Rt?: number[][];
  localPow?: number[];
  dofs: number[];
}

export interface VibrationMode {
  lam: number;
  omega: number;
  A: number[][];
  vec: number[];
}

export interface VibrationResult {
  Mnum: number[][];
  mSteps: Record<string, { syms: Array<{ sub: string; el: number }>; vals: string[] }>;
  quad: { a: number; b: number; c: number };
  modes: VibrationMode[];
}

export interface FeaAnalysisResult {
  nDof: number;
  nodeDofs: Record<number, Record<string, any>>;
  dofInfo: Record<number, DofInfo>;
  mcRows: McRow[];
  Knum: number[][];
  KsymEA: number[][];
  KsymEI: number[][];
  KsymEILPow: number[][];
  kSteps: Record<string, { syms: Array<{ sub: string; el: number }>; vals: string[] }>;
  Fnum: number[];
  FsymStrings: string[];
  elemForceDetails: ElemForceDetail[];
  displacements: number[] | null;
  reactions: Record<number, number>;
  solveError: string | null;
  barStresses: BarStressResult[];
  criticalBar: BarStressResult | null;
  vibration: VibrationResult | null;
  // Hybrid numerical evaluation results
  isHybridNumeric?: boolean;
  numericDisplacements?: number[] | null;
  numericUnits?: string[];
  numericStresses?: Array<{ elem: number; label: string; sigmaNum: number; NNum: number }>;
  numericReactions?: Record<number, number>;
  numericVibrations?: Array<{ omegaNum: number; fNumHz: number }>;
  unifiedEABase?: boolean;
}
