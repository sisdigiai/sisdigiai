# Comercial › Pitch — desenho da tela e estimativa

**Data:** 17/09/2026 · **Autor:** agente do app digiai · **Para:** Orquestrador Geral (revisão) → dono (palavra)
**Status:** RASCUNHO. Nada de tela commitado; migration `142_pitch_blocos_e_nao_faz.sql` só ensaiada (rollback).
**Base:** `Cockpit/comercial/pitch-dinamico-recomendacao-2026-09-17.md` e `Cockpit/comercial/pitch-20min-anamnese-2026-09-16.md` (v0).

---

## 1. O que muda do recomendado, medido em 17/09

| Recomendado | Medido | Proposta |
|---|---|---|
| Tabela `comercial.pitch_blocos` | Não existe schema `comercial`; o Comercial todo mora em `ops`, com RLS `is_staff()` | `ops.pitch_blocos` + `ops.pitch_nao_faz`; views `public.v_comercial_pitch` e `v_comercial_pitch_nao_faz` |
| Rótulo lido de `iam.clearix_packages` | **Essa tabela não está no banco do digiai** (mora no Clearix/landing); o digiai não lê o crm_erp | Decisão pendente — ver §5 |
| Fechamento grava no pipeline | Já existe `ops.meeting_sessions` com `pain_noted`, `objections_raised`, `outcome`, `next_action`, `follow_up_date`, `duration_min`, `interest_plan`, `interest_apps`; e "Iniciar reunião" já existe no Comercial | O pitch **é** uma reunião: grava ali e em `commercial_leads.next_step/next_touch_at`. Nenhuma tabela nova para o fechamento |
| Link para a tela no "tenant real" | As 9 anamneses dizem **tenant sintético "Ótica Olhar Certo"**, e o usuário de teste **ainda não existe** (portão 83) | Link para o tenant sintético; sem o usuário de teste, a tela mostra o link desligado com o motivo |
| Carga = consolidação do eco | Os 9 arquivos de 16/09 têm formatos diferentes (colunas e aspas variam; BI, DCL e Finance sem linhas parseáveis por padrão simples) | Carga só do arquivo **consolidado** do eco (formato único), com parser que recusa linha fora do formato e diz qual |

## 2. A tela (rota `#/comercial` › aba **Pitch**)

Uma tela, cinco estados em sequência. Tudo no navegador do dono, logado.

### 2.1 Preparar (antes da conversa)
- Escolhe o **lead** do pipeline (ou "sem lead" para ensaio).
- Mostra o **checklist "antes de demonstrar"** das anamneses: usuário de teste existe? tela sem CPF/telefone? lembrete **"mostrar até antes de salvar"** — clicar em baixa, entrega, caixa, orçamento, garantia **grava em produção** mesmo no tenant sintético.
- Botão **Começar** → cria a `meeting_session` (`started_at`) e liga o cronômetro.

### 2.2 Anamnese (0–3 min)
- As **6 perguntas** do v0, na ordem, uma por vez, com o "→ app" de cada uma.
- Para cada pergunta: campo livre **"nas palavras dele"** + marcação rápida das dores que a pergunta costuma revelar (as `duvida` dos blocos daquela `pergunta_numero`).
- Nada de vender aqui: a tela não mostra solução nesse estado.

### 2.3 Espelho (3–5 min)
- Repete as dores marcadas, **na ordem em que ele falou**, com o texto literal que o dono anotou, e a frase de origem D4.

### 2.4 Soluções puxadas (5–15 min)
- **Até 4 blocos**, um por dor, na ordem da fala. Se passar de 4, a tela pede para escolher — não corta sozinha.
- Cada bloco mostra: solução em 1 frase · **abrir tela no Clearix** (outra aba, tenant sintético, `registro_demo`) · **ressalva em voz alta** destacada · roteiro de 60 s · número da folha com data (de `v_mkt_fatos`, nunca digitado; sem fato vivo, o bloco mostra "sem número").
- Dor marcada sem bloco → mostra a resposta de **"isso o Clearix não faz"** e segue.
- Cronômetro por bloco (~2,5 min) e total; passou do tempo, fica âmbar — não bloqueia.

### 2.5 Rótulo (15–17 min) e Fechamento (17–20 min)
- Rótulo do pacote que cabe na loja (P2: lojas e pessoas) — **fonte pendente (§5)**.
- Fechamento honesto (texto fixo do v0: sem cliente externo pagante; a prova é a operação) → **um próximo passo só**: demo assistida / olhar o processo / piloto pago e assistido, com **dia e hora**.
- **Gravar**: fecha a `meeting_session` (`ended_at`, `duration_min`, `pain_noted` = dores literais, `objections_raised`, `outcome`, `next_action`, `follow_up_date`, `interest_apps` = sub-apps dos blocos mostrados) e atualiza o lead (`next_step`, `next_touch_at`) pela RPC existente. O lead aparece na **Fila de vendas do dia** na data marcada.

### 2.6 Trilha fixa (anexo A)
- Se a anamnese não trouxer dor, um botão troca para a trilha fixa do v0.

## 3. Dados

- **Blocos:** `v_comercial_pitch`, só aprovados, válidos, com rota verificada há ≤ 30 dias, fato vivo (se houver) e sem preço no texto. Mesma régua das ideias (135), aprovação só por função, por lote, com a palavra do dono.
- **Não faz:** `v_comercial_pitch_nao_faz`.
- **Reunião e lead:** tabelas e RPCs que já existem.
- **Nada** de dado de paciente ou cliente na tela do digiai; o dado fica no Clearix.

## 4. Estimativa

| Passo | Dias | Depende de |
|---|---|---|
| Migration 142 (tabelas, régua, aprovação, views) — rascunho já ensaiado | 0,5 | palavra do dono |
| Carga: parser do consolidado do eco → `pitch_blocos`/`pitch_nao_faz` + aprovação do lote | 0,5 | consolidado do eco (fim de 17/09) + revisão do Geral + palavra do dono |
| Tela (5 estados + cronômetro + gravar reunião/lead) | 1,5 | 142 no ar |
| Conferência no navegador com o dono logado + ajuste | 0,5 | agenda do dono |
| **Total** | **3 dias úteis** | — |

O "1 dia de tela" do recomendado não cabe com gravação da reunião, cronômetro por bloco e os estados de erro (sem bloco, sem fato, sem usuário de teste) — daí 1,5 + conferência.

## 5. Decisões pendentes (não bloqueiam a 142)

1. **Rótulo do pacote (15–17 min):** o preço dos pacotes não está no banco do digiai. Opções: (a) fatos por pacote em `mkt.fatos` (`clearix_pacote_essencial` etc., curadoria do app, palavra do dono), lidos como os outros números; (b) espelho publicado pelo eco, como o do aporte. **(a) é mais rápido e usa régua que já existe.**
2. **Tenant da demonstração:** "real" (recomendação) × **sintético "Ótica Olhar Certo"** (as 9 anamneses). O link da tela segue a anamnese, até o dono/eco dizerem outra coisa.
3. **Usuário de teste (portão 83):** sem ele, a demonstração ao vivo não acontece; a tela avisa e deixa o link desligado.
