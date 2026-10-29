
# PLAN.MD — Plataforma Web Interativa de Elementos Finitos (MEF / FEA - ESTG)

## 0. Contexto para o Agente de IA (Código Base Anexado)
Este projeto parte de um protótipo funcional (`App.jsx`) e de quatro motores matemáticos originais desenvolvidos em Lua (`Barra2d.txt`, `viga.txt`, `VigaBarra.txt`, `mola.txt`), baseados nos 15 exercícios oficiais da `Sebenta.pdf` de Mecânica Aplicada / Elementos Finitos (ESTG - IPLeiria / ULO).

**Regra de Ouro para a Refatoração:**
1. **Preservar 100% do rigor matemático e dos 15 exercícios pré-carregados (`PRESETS`)** já implementados no código base. Nenhuma fórmula, convenção de sinais, matriz de massa ou regra de integração simbólica da Sebenta pode ser simplificada ou alterada.
2. **Modularizar o monólito (`App.jsx`)** numa aplicação **Vite + React + TypeScript + Tailwind CSS + KaTeX**, preparada para deploy na **Vercel** (com Serverless Functions em `/api`).
3. **Manter apenas o Esquema Visual Interativo (estilo *Bridge Builder* + CAD)** para construção/edição da estrutura (sem o antigo editor de tabelas estilo calculadora TI-Nspire).

---

## 1. Arquitetura do Projeto (Vercel + Vite + React + TypeScript)

```text
mef-estg-web/
├── api/
│   ├── exercises.ts                # Vercel Serverless: GET (listar biblioteca) e POST (publicar exercício)
│   └── share.ts                    # Vercel Serverless: Criar/ler links curtos (?id=...) via Vercel KV / Upstash ou Gist
├── public/
│   └── presets/
│       └── sebenta-15.json         # Os 15 exercícios oficiais da Sebenta (fallback estático offline)
├── src/
│   ├── types/
│   │   └── fea.ts                  # Interfaces: Node, Element, SupportType, Load, ProblemConfig, ActiveQuestions
│   ├── presets/
│   │   └── sebentaPresets.ts       # Dados completos e validados dos Exercícios 1 a 15 da Sebenta
│   ├── engine/
│   │   ├── expr.ts                 # Motor algébrico híbrido (Simbólico + Substituição Numérica Parcial/Total)
│   │   ├── autoDetect.ts           # Deteção automática do modo da tabela m.c. (2, 4 ou 6 slots)
│   │   ├── dofNumbering.ts         # Atribuição automática e reordenação manual de G.D.L. (u1, u2, ...)
│   │   ├── barra2d.ts              # Motor Treliças/Barras 2D + Apoio Rolante Inclinado + Modos de Vibração
│   │   ├── viga.ts                 # Motor Vigas Euler-Bernoulli + Simetria + Reações + Zeros/Extremos + Vibrações
│   │   ├── vigaBarra2d.ts          # Motor Pórticos 2D + Integração simbólica de polinómios p(x)
│   │   └── mola.ts                 # Motor Sistemas de Molas + Princípio da Energia Potencial Mínima
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── StructureCanvas.tsx # Canvas SVG interativo (PC Mouse + iPad Touch/Apple Pencil) com getScreenCTM()
│   │   │   ├── CadDimensions.tsx   # Cotas CAD automáticas e clicáveis (L/2, L, 2L) e arcos de ângulo (θ, α)
│   │   │   ├── SupportsSvg.tsx     # Desenho técnico de Apoio Fixo, Apoio Rolante (0°, 90°, α°), Encastramento, Simetria
│   │   │   ├── LoadsSvg.tsx        # Setas de forças concentradas (P, 2P) e cargas distribuídas p(x)
│   │   │   ├── DofOverlaySvg.tsx   # Vista/Camada de G.D.L. (setas vermelhas u1, u2..., círculos ①, ②, ③)
│   │   │   └── FloatingHud.tsx     # Popovers flutuantes no esquema para editar Nó, Elemento ou Cota clicada
│   │   ├── solver/
│   │   │   ├── QuestionToggles.tsx # Toggles modulares das alíneas pedidas + Configuração Simbólico/Numérico
│   │   │   ├── McTable.tsx         # Tabela m.c. adaptativa (2, 4 ou 6 colunas conforme elementos presentes)
│   │   │   ├── ResolutionSheet.tsx # Folha de resolução passo a passo renderizada com KaTeX
│   │   │   └── StudyMode.tsx       # Modo Estudo (auto-avaliação célula a célula da m.c., [K], {F} e resultados)
│   │   └── layout/
│   │       ├── TopBar.tsx          # Seletor Ex. 1-15, Novo, Undo/Redo, Modo Resolução/Estudo, PT/EN, Partilhar, PDF
│   │       └── LibraryModal.tsx    # Biblioteca comunitária (pesquisa por UC, ano de exame, submissão)
│   ├── i18n/
│   │   ├── pt.ts                   # Português (terminologia exata ESTG)
│   │   └── en.ts                   # Inglês
│   └── utils/
│       ├── urlState.ts             # Serialização/compressão lz-string no URL (?ex=...)
│       └── pdfPrint.ts             # Estilização e geração de folha de exame A4 limpa para impressão/PDF
├── vercel.json                     # Configuração de rewrites para SPA + /api
├── package.json
└── vite.config.ts

```

---

## 2. Requisitos Funcionais Detalhados

### 2.1. Motor Algébrico Híbrido (Simbólico + Numérico Parcial ou Total)

* Alguns exercícios dão apenas proporções ($3E, A$, $2E, A$, $L/2$, $2P$), outros dão alguns valores numéricos reais e outros dão todos os valores numéricos.
* **Painel de Variáveis Base ($E, A, I, L, P, p, k, m, \rho$):**
* Cada grandeza tem um estado `Simbólico` (por defeito) ou um valor numérico opcional introduzido pelo utilizador (com unidades opcionais).
* **Comportamento:**
* Se todas estiverem em modo `Simbólico`: a resolução mantém os fatores literais exatos da Sebenta ($\frac{EA}{L}$, $\frac{PL}{EA}$, $\frac{P}{A}$, $\frac{EI}{L^3}$, $\frac{pL^4}{EI}$, $\frac{1}{L}\sqrt{\frac{E}{\rho}}$).
* Se o utilizador definir apenas algumas variáveis (ex.: $L = 2$ m, mantendo $E, A, P$ simbólicos): o motor substitui $L=2$ nos cálculos e mantém as variáveis restantes como fatores simbólicos (ex.: $u_1 = 0.929 \frac{P}{EA}$).
* Se todas tiverem valor numérico: apresenta a substituição passo a passo e o valor numérico final.




* **Opção de Substituição de Inércia ($I = n \cdot A \cdot L^2$):**
* Toggle para substituir $I = n A L^2$ em vigas/pórticos, unificando as parcelas de $\frac{EA}{L}$ e $\frac{EI}{L^3}$ numa única base $\frac{EA}{L}$.



### 2.2. Esquema Visual Unificado (*Bridge Builder* + Cotas CAD Clicáveis)

* **Não desenhar deformadas nem diagramas de esforços sobre a estrutura:** O esquema visual serve exclusivamente para construir o enunciado e visualizar o diagrama de Graus de Liberdade (G.D.L.) exatamente como na Sebenta.
* **Alinhamento à Grelha e Interação Touch/Mouse (`PC + iPad`):**
* Conversão de coordenadas via `svg.getScreenCTM().inverse()` para garantir alinhamento perfeito entre o cursor/dedo/Apple Pencil e os cruzamentos da grelha (`1L = 160px`, `0.5L = 80px`, `0.25L = 40px`).
* Arrastar qualquer nó move-o imediatamente na grelha sem necessidade de trocar de ferramenta, recalculando comprimentos, ângulos e a resolução em tempo real.


* **Cotagem CAD Automática e Interativa:**
* Desenhar automaticamente linhas de cota técnicas horizontais (em baixo/topo) e verticais (à esquerda/direita) entre os alinhamentos dos nós (ex.: $L/2$, $L$, $2L$) e arcos de ângulo ($\theta$, $30^\circ$, $20^\circ$).
* **Clicar numa cota ($L/2, L$) ou num arco de ângulo** abre um *input* direto para alterar essa dimensão (ex.: mudar de `L` para `2L` ou `L/2`), ajustando as coordenadas dos nós ligados.


* **Terminologia e Símbolos de Apoios (Norma ESTG):**
* Usar sempre o termo **Apoio Rolante** (nunca "rolete"):
* `Livre`
* `Apoio Fixo (Duplo)` (impede $u_x, u_y$)
* `Apoio Rolante Horizontal (0°)` (impede $u_y$, liberta $u_x$)
* `Apoio Rolante Vertical (90°)` (impede $u_x$, liberta $u_y$)
* `Apoio Rolante Inclinado (α°)` (plano inclinado a $\alpha^\circ$: liberta deslocamento tangencial $u_t$ ao longo de $\alpha^\circ$, impede normal)
* `Encastramento` (impede $u_x, u_y, \theta$)
* `Simetria / Guiado` (liberta translação vertical $v$, impede rotação $\theta = 0$, como no meio da viga do Ex. 8)





### 2.3. Matriz de Conectividade (`m.c.`) Adaptativa

O canvas é unificado (permite criar Barras 2D, Vigas, Pórticos Viga-Barra 2D e Molas), mas a tabela `m.c.` e as matrizes elementares adaptam-se automaticamente aos elementos presentes na estrutura:

1. **Modo Mola (`Mola`):** Quando só existem molas $\to$ Tabela `m.c.` com **2 colunas de G.D.L.** (`1 | 2 | k`).
2. **Modo Treliça (`Barra 2D`):** Quando só existem barras articuladas $\to$ Tabela `m.c.` com **4 colunas de G.D.L.** (`1 | 2 | 3 | 4 | θ₁ | θ₂ | L`), onde `1, 2` são translações do nó inicial e `3, 4` do nó final.
3. **Modo Viga (`Viga`):** Quando existem elementos de flexão horizontais sem forças/deslocamentos axiais $\to$ Tabela `m.c.` com **4 colunas de G.D.L.** (`1 | 2 | 3 | 4 | L`), correspondentes a $(v_1, \theta_1, v_2, \theta_2)$.
4. **Modo Pórtico (`Viga-Barra 2D`):** Quando existem elementos de viga inclinados ou combinação de esforço axial + flexão $\to$ Tabela `m.c.` com **6 colunas de G.D.L.** (`1 | 2 | 3 | 4 | 5 | 6 | θ₁ | θ₂ | L`), correspondentes a $(U_1, V_1, \theta_1, U_2, V_2, \theta_2)$.

* **Reordenação de G.D.L. no Esquema:** Clicar numa seta vermelha $u_i$ no esquema permite alterar o seu número (ex.: trocar $u_1 \leftrightarrow u_2$) para coincidir com a numeração de qualquer enunciado.

### 2.4. Sistema de Alíneas Modulares (Tudo por Toggles)

O utilizador ativa através de *chips/toggles* apenas o que o enunciado pede, gerando apenas essas secções na folha de resolução e no PDF:

* `[x]` **Tabela `m.c.` + Matriz de Rigidez Global $[K]$** (sempre visível ou toggleável).
* `[ ]` **Vetor de Forças Equivalentes $\{F\}$ passo a passo** (parametrização $f(x) = P_2 \frac{x}{L} + P_1$, integrais $-\int_0^{L_e} p(x) N_i(x)\,dx$ e transformação $\{F^{(e)}\} = [R]^T \{f^{(e)}\}$).
* `[ ]` **Deslocamentos Nodais Exatos** (resolução do sistema $[K]\{u\} = \{F\}$).
* `[ ]` **Reações de Apoio** (adiciona +1 G.D.L. no apoio pretendido com $u_i = 0$ para determinar a reação diretamente da linha da matriz $[K]$, como no Ex. 9 para $R_B = \frac{11pL}{20}$).
* `[ ]` **Tensão Axial ($\sigma$) e Esforço Normal ($N$)** (escolher uma barra específica, ex.: `Barra DC`, ou todas as barras, mostrando $\{u\} = [R]\{U\}$, $\delta = u_2 - u_1$ e $\sigma = \frac{E}{L}\delta$).
* `[ ]` **Zona Crítica da Estrutura** (calcula $\sigma$ em todas as barras e identifica a barra com $|\sigma|_{\max}$).
* `[ ]` **Interpolação num ponto $x$ de um Elemento** (selecionar Elemento e $x/L$, ex.: $x = L/2$ ou $x = L/4$):
* Deslocamento axial aproximado $u(x) = N_1 u_1 + N_2 u_2$
* Deslocamento transversal $v(x) = N_1 v_1 + N_2 \theta_1 + N_3 v_2 + N_4 \theta_2$
* Rotação aproximada $\theta(x) = \frac{dv}{dx}$
* Momento fletor $M(x) = EI \frac{d^2v}{dx^2}$
* Esforço transverso $V(x) = EI \frac{d^3v}{dx^3}$
* Tensão normal na viga $\sigma = -\frac{M_z \cdot y}{I_z}$


* `[ ]` **Pontos de Rotação Nula / Deslocamento Nulo / Extremos** (resolver $\theta(x) = 0 \implies x = \dots$, $v(x) = 0$, $v_{\max}$, $M_{\max}$).
* `[ ]` **Modos de Vibração e Frequências Naturais** ($|[K] - \omega^2[M]| = 0$, montagem de $M_{ij}$, equação em $\lambda$, frequências $\omega_1, \omega_2$ e vetores próprios associados $\{u\}$).
* `[ ]` **Princípio da Energia Potencial Mínima** ($\Pi = U_e - W$, $\frac{\partial \Pi}{\partial u_i} = 0$ e forças em cada mola).

### 2.5. Renderização Matemática KaTeX + Modo Estudo + Exportação PDF

* **KaTeX:** Renderizar todas as equações na folha de resolução com KaTeX (`\frac{EA}{L}`, matrizes `\begin{bmatrix}...\end{bmatrix}`, integrais `\int_0^{L}`, resultados finais em `\boxed{...}`).
* **Modo Estudo (Auto-Avaliação):**
* Toggle no topo: `Modo Resolução` | `Modo Estudo`.
* No `Modo Estudo`, os resultados começam ocultos e o aluno pode preencher interativamente:
1. A tabela `m.c.` (G.D.L., $\theta_1, \theta_2, L$).
2. Os valores da matriz $[K]$ e vetor $\{F\}$.
3. Os deslocamentos/tensões finais.


* Botão *"Verificar"* valida célula a célula (verde = correto com tolerância de $1\%$, vermelho = incorreto com dica) e botão *"Revelar Passo"* mostra a resolução KaTeX.


* **Exportação PDF Limpa:**
* Botão **"Exportar PDF"** que formata a página em A4 vetorial (ocultando barras de ferramentas e botões), incluindo o Esquema do Enunciado, o Esquema de G.D.L., a tabela `m.c.` e a resolução KaTeX das alíneas ativas.



### 2.6. Internacionalização (PT-PT / EN) & Partilha / Vercel API

* **Idiomas:** Toggle `PT` | `EN` no cabeçalho. Em `PT`, usar rigorosamente a terminologia da ESTG (*Apoio Rolante*, *Encastramento*, *Esforço Normal*, *Esforço Transverso*, *Momento Fletor*, *Zona Crítica*, *Matriz de Conectividade*).
* **Partilha por URL (`?ex=...`):** Qualquer exercício customizado pode ser partilhado instantaneamente copiando o URL comprimido com `lz-string` (funciona mesmo sem base de dados).
* **Biblioteca Cloud na Vercel (`/api/exercises`):**
* Integração com **Vercel KV (Upstash Redis)** ou **Neon Postgres** (com fallback para `localStorage` + `sebenta-15.json` se as variáveis de ambiente não estiverem configuradas).



---

## 3. Checklist de Validação dos 15 Exercícios da Sebenta (Testes Obrigatórios)

Ao finalizar a migração para TypeScript, o motor tem de produzir exatamente os mesmos resultados do protótipo e da Sebenta para todos os 15 exercícios:

* **Ex. 1:** 2 G.D.L. em D; $K_{11}=3.707\frac{EA}{L}, K_{12}=-0.707\frac{EA}{L}, K_{22}=1.707\frac{EA}{L}$; $u_1=0.4645\frac{PL}{EA}, u_2=-0.3934\frac{PL}{EA}$; $\sigma^{(2)}=-0.8586\frac{P}{A}$; $M_{11}=0.569\rho AL, M_{12}=-0.236\rho AL, M_{22}=0.569\rho AL$; $\lambda_1=3, \lambda_2=7.24$.
* **Ex. 2 e Ex. 3:** 3 barras simétricas ($63.435^\circ, 90^\circ, -63.435^\circ$, $L=1.118L$); $K_{11}=0.3578\frac{EA}{L}, K_{12}=0, K_{22}=2.4311\frac{EA}{L}$; vibrações com $M$ consistente.
* **Ex. 4:** Apoio rolante inclinado a $30^\circ$ em A ($\theta_1=33.435^\circ, \theta_2=63.435^\circ$ na barra 1); 3 G.D.L.; Zona crítica na barra CB com $\sigma=2.22\frac{P}{A}$; $u(x=L/2)=4.245\frac{PL}{EA}$ na barra AB.
* **Ex. 5:** Apoio rolante inclinado a $-20^\circ$ em C ($\theta_1=0^\circ, \theta_2=-20^\circ$ na barra 3) + força $2P$ a $20^\circ$ em B; Zona crítica na barra BD ($\sigma=4.466\frac{P}{A}$).
* **Ex. 6:** Treliça em losango com apoios rolantes verticais ($90^\circ$) em B e D e apoio rolante horizontal ($0^\circ$) em C; $\sigma_{CD}=-4.24\frac{F}{A}$; deslocamento nulo na barra AB ($u_3=0$).
* **Ex. 7:** Viga encastrada de comprimento $2L$ com carga trapezoidal ($-p/2$ a $-p$); 1 G.D.L. ($u_1=\theta_B=\frac{2pL^3}{15EI}$); $v(x=L)=-\frac{pL^4}{30EI}$; $M(x=0)=-\frac{2pL^2}{15}$.
* **Ex. 8:** Viga bi-apoiada $2L$ com carga triangular simétrica; usando simetria ($L^{(1)}=L$, 2 G.D.L.: $u_1=\theta_A=-\frac{5pL^3}{24EI}, u_2=v_{\text{meio}}=-\frac{2pL^4}{15EI}$); $\theta(x=L/2)=-\frac{71pL^3}{480EI}$; $V(x=3L/2)=\frac{7pL}{20}$.
* **Ex. 9:** Viga encastrada-apoiada $2L$ com carga triangular; +1 G.D.L. em B ($u_1=0$) $\implies u_2=\frac{pL^3}{10EI}$ e reação $R_B=\frac{11pL}{20}$; rotação nula $\theta(x)=0 \implies x=\frac{4L}{3}$.
* **Ex. 10, 11, 12 e 15:** Pórticos 2D com 6 e 7 G.D.L.; matriz $[K]$ separando termos $\frac{EA}{L}, \frac{EI}{L^3}, \frac{EI}{L^2}, \frac{EI}{L}$; integração de $p(x)=-\frac{px^3}{L^3}$ (Ex. 12) e $p(x)=-\frac{2px^2}{L}$ (Ex. 15) preservando as unidades $pL, pL^2, pL^3$ na soma final de $\{F\}$.
* **Ex. 13:** Viga bi-encastrada dividida em 2 elementos de $L/2$; carga $3p$ (uniforme) e $3p \to 2p$ (trapezoidal); $M(x=L/2)=-0.182pL^2$; $\theta(x=L/4 \text{ do 2.º elem.})=-0.02213\frac{pL^3}{EI}$; $\sigma=\frac{0.001038pL^2 y}{I}$; modos de vibração $\lambda_1=517.37, \lambda_2=6742.4$.
* **Ex. 14:** Sistema de 2 molas ($k, 2k$) e 2 massas ($m, m$); Energia Potencial Mínima $\Pi = U_e - W \implies u_1=\frac{2mg}{k}, u_2=\frac{5mg}{2k}$; forças $F^{(1)}=2mg, F^{(2)}=mg$.

