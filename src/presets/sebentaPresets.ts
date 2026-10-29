import { FeaPreset } from '../types/fea';

const cosd = (deg: number) => Math.cos(((Number(deg) || 0) * Math.PI) / 180);
const sind = (deg: number) => Math.sin(((Number(deg) || 0) * Math.PI) / 180);

export const SEBENTA_PRESETS: FeaPreset[] = [
  {
    id: 'ex1',
    num: 1,
    title: 'Ex. 1 — Treliça 3 Barras (Desl., σ, Modos Vibração)',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 2,
    targetXi: 0.5,
    description: 'Treliça com 2 G.D.L. no nó D. Determinação de [K], deslocamentos u_1 e u_2, tensão σ na barra 2 e frequências naturais de vibração.',
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 1, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 1, y: 1, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 0, y: 1, support: 'free', rollerAngle: 0, fx: 2, fy: -1, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 4, n2: 2, E: 2, A: 1, I: 1, L: 1.4142, th1: -45, th2: -45, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 4, n2: 3, E: 3, A: 1, I: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex2',
    num: 2,
    title: 'Ex. 2 — Treliça Simétrica 3 Barras (Desl., σ DC, Vibração)',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 3,
    targetXi: 0.5,
    description: 'Treliça simétrica com 3 barras convergindo no nó D com carga inclinada (-P, -P). Matriz [K], deslocamentos, tensão em DC e análise modal.',
    nodes: [
      { id: 1, label: 'A', x: -0.5, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 0.5, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 0, y: 1, support: 'free', rollerAngle: 0, fx: -1, fy: -1, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 4, E: 1, A: 1, I: 1, L: 1.118, th1: 63.435, th2: 63.435, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 2, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 4, n2: 3, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex3',
    num: 3,
    title: 'Ex. 3 — Treliça em Y (Desl. em C, σ em AC, Vibração)',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 2,
    targetXi: 0.5,
    description: 'Treliça com geometria em Y invertida. Deslocamento do nó central C sob carga (-P, -2P), tensão na barra AC e análise de vibração.',
    nodes: [
      { id: 1, label: 'D', x: 0, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'C', x: 0, y: 1, support: 'free', rollerAngle: 0, fx: -1, fy: -2, mz: 0 },
      { id: 3, label: 'A', x: -0.5, y: 2, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'B', x: 0.5, y: 2, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 3, n2: 2, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 2, n2: 4, E: 1, A: 1, I: 1, L: 1.118, th1: 63.435, th2: 63.435, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex4',
    num: 4,
    title: 'Ex. 4 — Apoio Rolante Inclinado 30° (Zona Crítica e u(x))',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 1,
    targetXi: 0.5,
    description: 'Treliça com apoio rolante inclinado a 30° no nó A (transformação com θ_1=33.435° e θ_2=63.435°). Identificação da zona crítica e interpolação u(x=L/2).',
    nodes: [
      { id: 1, label: 'A', x: -0.5, y: 0, support: 'rollerAngle', rollerAngle: 30, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0, y: 1, support: 'free', rollerAngle: 0, fx: 3, fy: 2, mz: 0 },
      { id: 3, label: 'C', x: 0.5, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 1, y: 1, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.118, th1: 33.435, th2: 63.435, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 2, n2: 4, E: 1, A: 2, I: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex5',
    num: 5,
    title: 'Ex. 5 — Apoio Rolante -20° e Força 2P a 20° (u(x) e Zona Crítica)',
    mode: 'Barra2D',
    forceSym: 'P',
    targetBar: 1,
    targetXi: 0.5,
    description: 'Apoio rolante com inclinação negativa de -20° em C, carga 2P a 20° no nó B. Resolução de deslocamentos, zona crítica (barra BD) e deformação axial.',
    nodes: [
      { id: 1, label: 'A', x: -0.5, y: 1, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      {
        id: 2,
        label: 'B',
        x: 0,
        y: 0,
        support: 'free',
        rollerAngle: 0,
        fx: Number((2 * cosd(20)).toFixed(4)),
        fy: Number((2 * sind(20)).toFixed(4)),
        forceMag: 2,
        forceAngle: 20,
        mz: 0
      },
      { id: 3, label: 'C', x: 0.5, y: 0, support: 'rollerAngle', rollerAngle: -20, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 0, y: -1, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 4, n2: 2, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 2, n2: 3, E: 1, A: 2, I: 1, L: 0.5, th1: 0, th2: -20, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex6',
    num: 6,
    title: 'Ex. 6 — Quadro Paralelogramo com 3 Apoios Rolantes',
    mode: 'Barra2D',
    forceSym: 'F',
    targetBar: 4,
    targetXi: 0.5,
    description: 'Treliça em paralelogramo com apoios rolantes verticais em B e D e horizontal em C. Tensão σ_CD = -4.24 F/A e deslocamento u_3 = 0.',
    nodes: [
      { id: 1, label: 'C', x: 0, y: 0, support: 'rollerX', rollerAngle: 0, fx: 3, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0, y: 1, support: 'rollerY', rollerAngle: 90, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'D', x: 1, y: 1, support: 'rollerY', rollerAngle: 90, fx: 0, fy: -1, mz: 0 },
      { id: 4, label: 'A', x: 1, y: 2, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: 90, th2: 90, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 2, n2: 4, E: 1, A: 1, I: 1, L: 1.4142, th1: 45, th2: 45, p0: 0, pL: 0, py: '' },
      { id: 4, n1: 1, n2: 3, E: 1, A: 1, I: 1, L: 1.4142, th1: 45, th2: 45, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex7',
    num: 7,
    title: 'Ex. 7 — Viga 2L Trapezoidal (-p/2 a -p: θB, v(L), M(0))',
    mode: 'Viga',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.5,
    description: 'Viga encastrada-apoiada de comprimento 2L sob carga trapezoidal. 1 GDL (θ_B = 2pL³/15EI), flecha a meio vão v(L) e momento no encastramento M(0).',
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 2, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: -0.5, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex8',
    num: 8,
    title: 'Ex. 8 — Viga Simétrica 2L (Simetria em x=L, θ(L/2), V(3L/2))',
    mode: 'Viga',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.5,
    description: 'Viga bi-apoiada 2L explorando simetria estrutural (nó 2 com apoio guiado: v livre, θ=0). Cálculo de θ_A, flecha central e esforço transverso.',
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'Meio', x: 1, y: 0, support: 'guided', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex9',
    num: 9,
    title: 'Ex. 9 — Viga 2L (Reação RB no Apoio Rolante e θ(x)=0)',
    mode: 'Viga',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.6667,
    description: 'Viga com apoio móvel em B. Atribuição de GDL suplementar para cálculo direto da reação R_B = 11pL/20 e localização do ponto de rotação nula x = 4L/3.',
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 2, y: 0, support: 'pinned', calcReactionY: true, rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: 0, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex10',
    num: 10,
    title: 'Ex. 10 — Pórtico Viga-Barra 6 GDL (Perna 45° + Viga 2L)',
    mode: 'VigaBarra2D',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.5,
    description: 'Pórtico 2D composto por perna inclinada a 45° bi-elementada e viga horizontal 2L sob carga uniforme. Matriz [K] 6x6 e forças nodais equivalentes.',
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0.5, y: 0.5, support: 'free', rollerAngle: 0, fx: 0, fy: -1, mz: 0 },
      { id: 3, label: 'C', x: 1, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 3, y: 1, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 0.7071, th1: 45, th2: 45, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 0.7071, th1: 45, th2: 45, p0: 0, pL: 0, py: '' },
      { id: 3, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: -1, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex11',
    num: 11,
    title: 'Ex. 11 — Pórtico 7 GDL ([K] 7x7 e Vetor de Forças {F})',
    mode: 'VigaBarra2D',
    forceSym: 'p',
    targetBar: 1,
    targetXi: 0.5,
    description: 'Pórtico de 3 tramos com montagem da matriz de rigidez global 7x7 e vetor de forças combinando cargas distribuídas e rotação de coordenadas.',
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 1, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 3, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 3, y: 0, support: 'pinned', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.4142, th1: 45, th2: 45, p0: -1, pL: -1, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: 0, pL: -1, py: '' },
      { id: 3, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: -90, th2: -90, p0: -1, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex12',
    num: 12,
    title: 'Ex. 12 — Pórtico com Carga Cúbica p(x) = -p·x³/L³',
    mode: 'VigaBarra2D',
    forceSym: 'p',
    targetBar: 2,
    targetXi: 0.5,
    description: 'Pórtico com carregamento não linear cúbico p(x) = -p·x³/L³ integrado analiticamente através das funções de forma de Hermite.',
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 0.5, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 1.5, y: 1, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 2, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.118, th1: 63.435, th2: 63.435, p0: 0, pL: -1, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '-x^3/L^3' },
      { id: 3, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1.118, th1: -63.435, th2: -63.435, p0: -1, pL: -1, py: '' }
    ]
  },
  {
    id: 'ex13',
    num: 13,
    title: 'Ex. 13 — Viga Bi-Encastrada (L/2 + L/2: M, θ, σ e Vibração)',
    mode: 'Viga',
    forceSym: 'p',
    targetBar: 2,
    targetXi: 0.5,
    description: 'Viga bi-encastrada discretizada em dois elementos de L/2 com cargas combinadas 3p uniforme e 3p a 2p trapezoidal. Momentos, tensões e vibrações.',
    nodes: [
      { id: 1, label: 'A', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'M', x: 0.5, y: 0, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'B', x: 1, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 0.5, th1: 0, th2: 0, p0: 3, pL: 3, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 0.5, th1: 0, th2: 0, p0: 3, pL: 2, py: '' }
    ]
  },
  {
    id: 'ex14',
    num: 14,
    title: 'Ex. 14 — Sistema de Molas (Energia Potencial Π = Ue - W)',
    mode: 'Mola',
    forceSym: 'mg',
    targetBar: 1,
    targetXi: 0.5,
    description: 'Sistema unidimensional de duas molas k e 2k com massas suspensas m. Aplicação direta do Princípio da Energia Potencial Mínima (∂Π/∂u = 0).',
    nodes: [
      { id: 1, label: 'Apoio', x: 0, y: 0, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'm₁', x: 1, y: 0, support: 'free', rollerAngle: 0, fx: 1, fy: 0, mz: 0, mass: 1 },
      { id: 3, label: 'm₂', x: 2, y: 0, support: 'free', rollerAngle: 0, fx: 1, fy: 0, mz: 0, mass: 1 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, k: 1, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '' },
      { id: 2, n1: 2, n2: 3, E: 2, A: 1, I: 1, k: 2, L: 1, th1: 0, th2: 0, p0: 0, pL: 0, py: '' }
    ]
  },
  {
    id: 'ex15',
    num: 15,
    title: 'Ex. 15 — Pórtico com Carga Parabólica p(x) = -2p·x²/L',
    mode: 'VigaBarra2D',
    forceSym: 'p',
    targetBar: 2,
    targetXi: 0.5,
    description: 'Pórtico 2D com carregamento parabólico de segundo grau p(x) = -2p·x²/L e rotação global das componentes de força nodais equivalentes.',
    nodes: [
      { id: 1, label: 'A', x: 0, y: 1, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 2, label: 'B', x: 1, y: 0, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 3, label: 'C', x: 3, y: 0, support: 'free', rollerAngle: 0, fx: 0, fy: 0, mz: 0 },
      { id: 4, label: 'D', x: 3, y: -1, support: 'fixed', rollerAngle: 0, fx: 0, fy: 0, mz: 0 }
    ],
    elements: [
      { id: 1, n1: 1, n2: 2, E: 1, A: 1, I: 1, L: 1.4142, th1: -45, th2: -45, p0: 0, pL: -2, py: '' },
      { id: 2, n1: 2, n2: 3, E: 1, A: 1, I: 1, L: 2, th1: 0, th2: 0, p0: 0, pL: 0, py: '-2*x^2/L' },
      { id: 3, n1: 3, n2: 4, E: 1, A: 1, I: 1, L: 1, th1: -90, th2: -90, p0: -3, pL: -3, py: '' }
    ]
  }
];
