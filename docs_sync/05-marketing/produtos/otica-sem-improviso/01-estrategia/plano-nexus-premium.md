---
title: Plano de desenvolvimento — Nexus Premium (OSI)
last_updated: 2026-05-20
status: rascunho
topic_key: marketing.osi.nexus_premium
source_kind: planejamento
supersedes: []
superseded_by: null
---

# Plano de desenvolvimento — Nexus Premium (OSI)

> O que este doc é: roadmap das features que precisam estar prontas pra entregar valor real no **gate de 90 dias** do produto Ótica Sem Improviso. Complementa o [funil-osi-clearix-master.md](./funil-osi-clearix-master.md) — onde o gate aparece como bloco crítico (Nexus premium) mas sem detalhamento técnico.

## 0. Visão

**O que é Nexus Premium pro comprador do OSI:**

Camada complementar ao manual (PDF + leitor). Acesso de 90 dias com:

1. **Doug AI** — tutor IA que responde dúvidas reais do balcão na linguagem do método.
2. **Workshops gravados** — 8 vídeos aplicando o método em casos concretos.
3. **Gamificação** — XP, coins, badges, leaderboard. Hábito de retornar.
4. **Trilha certificada** — sequência de 6 módulos com badge "Graduado OSI" ao fim.
5. **Simulações de cenário** — pratica atendimentos com personas fictícias antes do balcão real.
6. **Hub OSI** — dashboard de progresso + próximos passos + ponte sutil pro Clearix.

**Por que isso importa estrategicamente:** o leitor (manual web aberto) é viral marketing — qualquer um lê. **O Nexus é onde o comprador percebe valor real e onde o pitch Clearix B2B acontece de verdade** (CTAs, easter eggs, gatilho de demo após trilha certificada).

---

## 1. Estado atual (auditoria 2026-05-20)

| # | Feature | Status | Bloqueador? |
|---|---|---|---|
| 1 | Doug AI | 🟡 esqueleto (mock) | **🚨 SIM** |
| 2 | Workshops gravados | ✅ conteúdo + infra prontos | 🟡 só links de vídeo |
| 3 | Gamificação | ✅ pronto e funcional | Não |
| 4 | Trilha certificada OSI | 🟡 framework existe, OSI não tem trilha | Sim |
| 5 | Simulações de cenário | 🟡 UI/conteúdo Dia Real ok, IA mock | Sim (dependa de #1) |
| 6 | Hub OSI | ✅ pronto (6 módulos visíveis) | 🟡 sem gate de produto |

### 1.1 Doug AI (tutor IA) — ✅ **PRONTO** (revisão 2026-05-20)

A auditoria inicial foi imprecisa. O sistema real **NÃO usa** `server/domain/ai_runtime.ts` (legado/mock). Usa o stack client-side em `src/lib/ai/`:

- **Provider Gemini real:** [src/lib/ai/providers/gemini.ts](D:/projetos/diferentes/nexus/src/lib/ai/providers/gemini.ts) — `GoogleGenAI` SDK funcional, com `generateContent`, sessões de chat com histórico.
- **Persona Doug pronta:** [src/lib/ai/prompts.ts:23](D:/projetos/diferentes/nexus/src/lib/ai/prompts.ts) — tom veterano 68 anos, trava de escopo ("responde APENAS sobre o manual"), redireciona perguntas off-topic. Ativada via `isOsi = clearixApp === "Otica Sem Improviso"`.
- **Hook integrado:** [src/hooks/useAIChat.ts](D:/projetos/diferentes/nexus/src/hooks/useAIChat.ts) e usado em [ClearixModule.tsx:66](D:/projetos/diferentes/nexus/src/pages/clearix/ClearixModule.tsx). Doug responde dentro de cada lição com o `aiContext` da página.
- **Conteúdo populado:** todos os 6 módulos OSI em `src/data/otica-sem-improviso/modules/*` têm `appName: "Otica Sem Improviso"` + `aiContext` específico por lição.

**Dependência crítica pra produção:**
- `GEMINI_API_KEY` precisa estar nas env vars do **Netlify do Nexus** (não só no .env local). Sem isso, `isAvailable()` retorna false e Doug mostra "IA indisponível".

**Melhorias futuras (não-bloqueadoras):**
- **Doug standalone no OsiHub** — chat "tira-dúvidas geral" fora de lição específica, persistente entre páginas.
- **Persistência de sessões** — hoje cada sessão é em memória. Salvar histórico no Supabase pra continuidade.
- **Doug streaming** — respostas chegam em real-time em vez de aparecer de uma vez.

**Esforço para melhorias futuras:** 8–14h (não bloqueia venda).

### 1.2 Workshops gravados — ✅ conteúdo pronto, falta link de vídeo

- **Arquivo:** `src/data/otica-sem-improviso/modules/[01-05].ts` — 8 workshops com metadata e descrições; renderização em [ClearixModule.tsx:44](D:/projetos/diferentes/nexus/src/pages/clearix/ClearixModule.tsx)
- **Falta:**
  - Gravar e hospedar os 8 vídeos (decisão de produção: Vimeo? YouTube unlisted? Bunny Stream?)
  - Substituir placeholders por embed real
  - Analytics de % visto / conclusão
- **Esforço estimado:** trabalho **fora** do dev — gravação + edição + hospedagem. 8 workshops × ~4h cada = 32h de produção. Integração técnica: 2h

### 1.3 Gamificação — ✅ pronto

- **Arquivos:** [CoinContext.tsx:39](D:/projetos/diferentes/nexus/src/contexts/CoinContext.tsx) (XP+coins+streaks); [useClearixAchievements.ts:15](D:/projetos/diferentes/nexus/src/hooks/useClearixAchievements.ts) (14 achievements); celebrações com confetti
- **Polish opcional (pode esperar):**
  - Achievements específicos OSI ("Concluiu Módulo Atendimento", "Completou trilha OSI", etc — hoje só genéricos Clearix)
  - Leaderboard segmentado por produto
- **Esforço estimado:** 4–6h pra customização OSI

### 1.4 Trilha certificada OSI — 🟡 framework existe, falta trilha

- **Arquivo base:** [useClearixLearningPath.ts:6](D:/projetos/diferentes/nexus/src/hooks/useClearixLearningPath.ts) (estrutura genérica de trilhas por role, mas OSI não tem entrada)
- **Falta:**
  - Definir trilha OSI: 6 módulos sequenciais (segue arquitetura do manual)
  - Badge "Graduado Ótica Sem Improviso"
  - **Gatilho crítico de conversão:** ao concluir trilha → CTA automático "Agende sua demo Clearix de 15 minutos com tenant populado"
- **Esforço estimado:** 6–10h
- **Por que é crítico estratégico:** este é o **gatilho de qualificação MQL** que vimos no [mapa-mestre §3.8](./funil-osi-clearix-master.md). Sem trilha certificada, sem gatilho de demo Clearix.

### 1.5 Simulações de cenário — 🟡 estrutura ok, IA mock

- **Arquivo:** `src/data/clearix-university/dia-real.ts:18` (8 fases de Dia Real); [ClearixDiaReal.tsx](D:/projetos/diferentes/nexus/src/pages/clearix/ClearixDiaReal.tsx)
- **Falta:**
  - Adaptar "Dia Real" pro contexto OSI (atualmente focado em apps Clearix)
  - Gemini streaming real nas fases (depende da #1.1)
  - Scoring de desempenho por cenário (acertou objeção? trouxe número? etc)
- **Esforço estimado:** 8–12h (após Doug AI estar pronto)

### 1.6 Hub OSI — ✅ pronto, falta gate

- **Arquivo:** [OsiHub.tsx:20](D:/projetos/diferentes/nexus/src/pages/osi/OsiHub.tsx) (6 módulos rendered + DougAvatar banner)
- **Falta — gate de produto (urgente!):**
  - Verificar `core.user_products` (product_code='osi', is_active=true) antes de mostrar conteúdo
  - Paywall em [OsiContinuar.tsx](D:/projetos/diferentes/nexus/src/pages/osi/OsiContinuar.tsx) após 90 dias
  - Indicador "Acesso expira em X dias" no topo do hub
- **Esforço estimado:** 4–6h
- **Por que urgente:** hoje qualquer pessoa que sabe o URL `/osi` e tem conta Nexus acessa. Sem gate, o token de magic link é cosmético.

---

## 2. Roadmap por ordem de criticidade

### Sprint A — Destravar o produto pago (semana 1)

Objetivo: **acabar com a brecha** de qualquer um logado conseguir ver o conteúdo premium.

1. **Gate `/osi`** via `core.user_products` (#1.6) — **4–6h**
2. **Trilha certificada OSI** + gatilho demo Clearix (#1.4) — **6–10h**
3. **Doug AI real** (Gemini integration + persona Doug) (#1.1, parte 1) — **8–12h** (sem persistência ainda)

**Por que essa ordem:** sem gate (#1.6), gamificação e workshops viram brinquedo grátis. Sem trilha (#1.4), o pipeline OSI→Clearix não tem gatilho. Doug é o diferencial percebido — mas pode entrar depois sem bloquear venda.

**Saída da Sprint A:** comprador OSI vê o `/osi` com 6 módulos, é gated, tem Doug chat funcional (mesmo sem persistência) e a trilha certificada que dispara demo Clearix no fim.

### Sprint B — Profundidade do produto (semana 2)

4. **Doug AI persistência** + memória de sessão (#1.1, parte 2) — **4–8h**
5. **Achievements específicos OSI** (#1.3) — **4–6h**
6. **Vídeos workshop integrados** (#1.2 — depende de produção fora do dev) — **2h código**

### Sprint C — Engagement (semana 3+)

7. **Simulações Dia Real adaptadas pro OSI** (#1.5) — **8–12h**
8. **Scoring de cenários** + ranking entre alunos (#1.5)
9. **Analytics consumo** (% módulos consumidos, dropout, engagement por dor — preenche Lacuna #2 do mapa-mestre)

---

## 3. Esforço total estimado

| Sprint | Esforço dev | Bloqueio externo |
|---|---:|---|
| A — Destravar venda | 18–28h | nenhum |
| B — Profundidade | 10–16h | gravar 8 workshops (~32h não-dev) |
| C — Engagement | 16–24h | A+B prontos |
| **Total dev** | **~44–68h** | — |

Solo developer = 1–2 semanas focadas pra Sprint A. Sprint B+C podem ir em paralelo ou seguir.

---

## 4. Dependências externas (não-dev)

- **Vídeos dos 8 workshops** — script + gravação + edição. Bloqueia #1.2. Sem isso, workshops são páginas-texto.
- **Calendário de demo Clearix (Cal.com)** — URL pra colocar no CTA de "Agende demo" da trilha (#1.4). Já é Lacuna #6 do mapa-mestre.
- **Identidade visual de badges/achievements OSI** — design de 6–10 ícones de badge específicos (#1.3 polish).
- **Tenant Clearix fictício pré-populado** — pra usar na demo de 15 min após trilha (referenciado em [08_academy_low_ticket.md](../../../../../clearix_eco_full/clearix_docs/clearix_pitch/08_academy_low_ticket.md))

---

## 5. Decisões abertas

1. **Streaming Gemini real-time vs request-response simples**: streaming melhora UX do Doug mas adiciona complexidade. Recomendo começar com request-response (simples) e iterar.
2. **Persistência conversas Doug**: salvar todas as mensagens no Supabase, ou só "sessões"? Simples → só sessões com timestamp + resumo.
3. **Trilha linear vs modular**: o aluno precisa fazer Módulo 1 antes do 2? Ou pode escolher? Recomendo **linear pra ter sense of completion** que dispara o gatilho de demo.
4. **Badge "Graduado OSI" é apenas digital ou tem entrega física?** (Certificado PDF é trivial; físico exige logística.)
5. **Após 90 dias, comprador perde tudo ou mantém somente o leitor?** (Política de pós-expiração — relacionado a renovação mensal via MP, que tá em [plano-configuracao-funil-osi.md](../04-operacao-e-venda/plano-configuracao-funil-osi.md)).

---

## 6. Critérios de "pronto" por feature

| Feature | Pronto quando... |
|---|---|
| Gate `/osi` | Visitante sem `user_products(osi)` vê paywall / convite de compra. Token magic link libera. Expiração 90d funciona. |
| Trilha certificada | Aluno conclui 6 módulos → badge "Graduado OSI" aparece → CTA "Agende demo Clearix" aparece em destaque. |
| Doug AI | Comprador faz pergunta sobre atendimento óptico → resposta coerente com método OSI em <5s. Erros tratados graceful. |
| Achievements OSI | Pelo menos 6 badges específicos (1 por módulo concluído + 1 "Graduado"). Tela ClearixAchievements mostra os OSI separadamente. |
| Vídeos workshop | Todos os 8 workshops têm vídeo embed funcionando. Progresso é trackeado. |
| Simulações | Aluno completa 1 simulação Dia Real adaptada pra ótica + recebe scoring + feedback Doug. |

---

## 7. Riscos identificados

- **Gemini API rate limit** (free tier: 1500 req/dia). Em escala, vira gargalo. Quando atingir 100 alunos ativos, considerar plano pago ou cache de respostas comuns.
- **Vídeos pesados em mobile** — alunos vão acessar do celular do balcão. Garantir transcoding adaptive (Vimeo Pro / Bunny Stream cobrem).
- **Doug "alucinar"** respondendo coisa fora do método — controlar via system prompt rígido + lista de tópicos permitidos (já mencionado no [BRIEFING_NEXUS_AGENT.md](../../../../../diferentes/nexus/docs/academy/produtos/otica-sem-improviso/BRIEFING_NEXUS_AGENT.md) como "trava de escopo").

---

## 8. Próximo passo recomendado

Atacar **Sprint A** na ordem proposta. O **Gate `/osi`** (#1.6) é o que destrava ética/legalidade do "produto pago" — sem ele, qualquer pessoa pode entrar e o token vira teatro.

Quando #1.6 + #1.4 estiverem prontos, o **fluxo de venda real está completo**: comprador entra pelo magic link, faz a trilha, recebe convite pra demo Clearix. A partir daí, todas as outras features são polimentos que aumentam retenção e LTV.

---

## 9. Links

- [funil-osi-clearix-master.md](./funil-osi-clearix-master.md) — mapa-mestre do funil (este doc é o detalhamento técnico da camada Nexus)
- [BRIEFING_NEXUS_AGENT.md](../../../../../diferentes/nexus/docs/academy/produtos/otica-sem-improviso/BRIEFING_NEXUS_AGENT.md) — briefing canônico do Nexus
- [08_academy_low_ticket.md](../../../../../clearix_eco_full/clearix_docs/clearix_pitch/08_academy_low_ticket.md) — gatilho de demo Clearix após trilha
