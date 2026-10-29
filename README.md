# MEF Solver — Plataforma Web de Elementos Finitos (ESTG / ULO)

Plataforma web interativa de análise e resolução de estruturas pelo **Método dos Elementos Finitos (MEF / FEA)**, desenvolvida especificamente para as UCs de **Mecânica Aplicada** e **Elementos Finitos** da **Escola Superior de Tecnologia e Gestão (ESTG - Politécnico de Leiria / ULO)**.

Inclui a resolução passo a passo e o esquema interativo dos **15 exercícios oficiais da Sebenta**, com validação analítica célula a célula, renderização matemática KaTeX e modo de estudo.

---

## 🚀 Funcionalidades Principais

* **15 Exercícios Pré-Carregados da Sebenta:**
  * Treliças 2D articuladas (Ex. 1, 2, 3, 4, 5, 6) com apoios rolantes inclinados ($\alpha^\circ$).
  * Vigas Euler-Bernoulli (Ex. 7, 8, 9, 13) com simetria estrutural, cargas trapezoidais e determinação de reações de apoio.
  * Pórticos 2D Viga-Barra (Ex. 10, 11, 12, 15) com cargas polinomiais não lineares ($p(x) = -p\frac{x^3}{L^3}$, $p(x) = -2p\frac{x^2}{L}$).
  * Sistemas de Molas 1D (Ex. 14) com o Princípio da Energia Potencial Mínima ($\Pi = U_e - W$).
* **Canvas CAD Interativo (*Bridge Builder* Style):**
  * Manipulação direta de nós e barras via rato e touch (iPad / Apple Pencil).
  * Conversão geométrica precisa com `svg.getScreenCTM().inverse()`.
  * Grelha magnética adaptativa ($0.25L, 0.5L, 1.0L$) e cotas CAD clicáveis ($L/2, L, 2L$).
  * Simbologia rigorosa ESTG: Apoio Fixo, Apoio Rolante (0°, 90°, $\alpha^\circ$), Encastramento e Guiado (Simetria).
* **Resolução Passo a Passo em KaTeX:**
  * Tabela de Conectividade (`m.c.`) adaptativa a 2, 4 ou 6 slots.
  * Matriz de Rigidez Global $[K]$ com soma dos termos elementares $K_{ij}$.
  * Vetor de Forças $\{F\}$ com integrais analíticas das funções de forma de Hermite.
  * Deslocamentos nodais $\{u\}$ e tensões axiais $\sigma$ nas barras com identificação da zona crítica.
  * Modos de vibração e frequências naturais com matriz de massa consistente $[M]$.
* **Modo Estudo (Auto-Avaliação):**
  * Preenchimento interativo com validação imediata (tolerância de $\pm 1\%$ ou frações exatas).
  * Feedback visual verde/vermelho por célula e botão de revelação da solução.
* **Partilha e Exportação:**
  * Partilha instantânea de qualquer exercício via URL comprimido com `lz-string` (`?ex=...`).
  * Impressão formatada para folha de exame A4 limpa sem menus.

---

## 🛠️ Tecnologias

* **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
* **Matemática & Renderização:** KaTeX, Lucide Icons, LZ-String
* **Deploy & Serverless:** Vercel (com Serverless Functions em `/api`)

---

## 💻 Como Executar Localmente

```bash
# 1. Clonar o repositório
git clone https://github.com/2023137460/MEF-Solver.git
cd MEF-Solver

# 2. Instalar dependências
npm install

# 3. Executar o servidor de desenvolvimento
npm run dev

# 4. Validar os motores matemáticos contra a Sebenta
npx tsx scripts/test_engine.ts
```

---

## 📜 Licença

Desenvolvido para fins académicos e pedagógicos na ESTG — Instituto Politécnico de Leiria / ULO.
