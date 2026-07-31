# BRIEFING — migrar o app digiai para `app.digiai.app.br` (Cloudflare Pages)

> **De:** agente do `digiai_mkt` (orquestrador desta rodada) · **Para:** agente do app `digiai`
> **Data:** 2026-07-30 · **Despacho conforme R-032** (mudança em app passa pelo agente do app)
> **Status:** proposta — NÃO aplicar sem o dono autorizar

---

## 1. Por que este briefing existe

A receita abaixo foi **executada e verificada de ponta a ponta hoje** no `digiai_mkt`. Não é teoria: é o mesmo caminho, com as armadilhas já mapeadas. Mas quem conhece as telas, as variáveis e os fluxos deste app é você — por isso a R-032 manda passar por aqui antes de aplicar.

**Contexto:** o Netlify já pausou todo o ecossistema uma vez por estouro de créditos (26/05, origem da R-025 e da ADR-0028). O `digiai_mkt` acabou de sair de lá; este app é o próximo pela ADR-0028.

## 2. O que a ADR-0028 define

```
digiai.app.br              ← institucional (Worker digiai-site, JÁ NO AR — não tocar)
├── app.digiai.app.br      ← ESTE APP (painel interno)   ← destino
└── mkt.digiai.app.br      ← digiai_mkt (feito hoje ✅)
```

Hoje: `sisdigiai.netlify.app` (o dono acessa `/#/clearix`).

## 3. Avaliação de risco (feita, com evidência)

O dono levantou a dúvida certa: *"o digiai só consome o banco do Clearix, as decisões saem daqui — a migração é segura?"* Verificação:

| Ponto | Achado | Impacto |
|---|---|---|
| Autenticação | **só `signInWithPassword`** (2 ocorrências); sem OAuth, sem magic link, sem `redirectTo` | ✅ **o calcanhar clássico não existe** — trocar de domínio não quebra login (não há allowlist de redirect a atualizar no Supabase) |
| Ligação com Clearix | cliente Supabase no browser (`src/lib/clearixSupabase.ts`), URL+anon via env; quem governa é o **RLS**, não a origem | ✅ migração não altera |
| Operações no Clearix | 25 `select`, **3 `upsert`, 1 `update`, 1 `delete`** | ⚠️ **não é só leitura** — o app escreve. Config errada não é só "tela vazia" |

**Conclusão:** risco técnico baixo. Os riscos reais são de **configuração**, não de banco.

## 4. Os dois riscos que importam

### 4.1 Seis variáveis de ambiente (o erro mais provável)
```
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
VITE_CLEARIX_SUPABASE_URL / VITE_CLEARIX_SUPABASE_ANON_KEY     ← exceção ADR-0001
VITE_NEXUS_SUPABASE_URL / VITE_NEXUS_SUPABASE_ANON_KEY
```
Faltando qualquer uma, a tela **abre e não traz nada** — falha silenciosa. Cadastrar TODAS no painel do Pages (Production) **antes** de conectar o Git, senão o primeiro build sobe quebrado.

### 4.2 Links de outros apps cravados no código
O app tem URLs `*.netlify.app` escritas direto no código, apontando para: `clearixhub`, `clearixcalc`, `digiaiatlas`, `luminabox`, `easyidioma`, `landingoticasemimproviso` e **`digiaimkt`**.

⚠️ **`https://digiaimkt.netlify.app` está desatualizado desde hoje** — trocar por **`https://mkt.digiai.app.br`**. Os demais viram links mortos conforme cada app migrar; vale um inventário.

## 5. Receita validada (ordem importa)

1. **Conferir o repo compila a partir do GitHub** — `git clone` limpo + `npm ci && npm run build`.
   > 🔴 **Foi exatamente aqui que o `digiai_mkt` quebrou:** faltavam 3 arquivos nunca commitados (`lib/marca.tsx`, `lib/ui.tsx`, `digiai-foundation.css`). Todos os deploys saíam da máquina local; o repositório **nunca** compilou. É a causa provável do Netlify ter parado de publicar. **Verifique isto antes de tudo.**
2. **Criar o projeto Pages** (`wrangler pages project create <nome> --production-branch=main`).
3. **Cadastrar as 6 variáveis** (Settings → Variables and secrets, Production).
4. **Conectar o Git** (Settings → Build → Connect): repo, branch `main`, build `npm run build`, saída `dist`. A conta `sisdigiai` já está autorizada no Cloudflare — não pede OAuth novo.
5. **`public/_redirects`** com `/*  /index.html  200` (SPA). Sem isso, rota direta dá 404.
   > ℹ️ Este app usa **hash routing** (`/#/clearix`), então o risco é menor — mas confirme.
6. **Custom domain** `app.digiai.app.br` pelo próprio projeto Pages (cria só o CNAME; não mexe nos MX/TXT nem no Worker do apex).
7. **Verificar**: domínio 200 + SSL, login funcionando, **Central Clearix trazendo dados**, e `digiai.app.br` + `www` intactos.
8. **Só então** redirect 301 do Netlify e, dias depois, desligar.

## 6. O que NÃO fazer

- ❌ Conectar o Git antes das variáveis (primeiro build sobe quebrado)
- ❌ Criar registros DNS à mão na zona `digiai.app.br` (o apex serve o institucional; deixe o Pages criar o CNAME)
- ❌ Apagar o Netlify antes de provar o novo (fica sem rollback)
- ❌ Migrar sem testar a **Central Clearix** — é control plane (ADR-0001), escreve no banco do Mello

## 7. Pendências que ficam com o dono

- Login no Netlify (não há credencial no workspace; agente não faz login)
- Avisar a equipe do endereço novo (R-011)
- Decidir o inventário de links `*.netlify.app` cravados

---
**Referências:** ADR-0028 (domínios/hosting) · ADR-0001 (isolamento Clearix) · R-025 (Cloudflare canônico) · R-032 (este despacho) · R-011 (deploy/comunicação com humano) · `digiai_mkt/docs/changelog.md` 2026-07-30 (execução completa)
