# Migrations do digiai — numeração e ordem real de aplicação

## Colisão registrada (decisão do orquestrador geral, 06/09/2026): NÃO renumerar
Duas sessões numeraram em paralelo e colidiram em **081, 082, 083 e 084** — cada
número tem DOIS arquivos. Renumerar migration já aplicada é reescrever histórico de
banco; a decisão foi **registrar o fato e travar daqui para a frente** (mesma lógica
do handoff riscado em vez de apagado). A ordem em que foram de fato aplicadas no
banco está na tabela abaixo — é ela que vale para rebuild, não o prefixo.

| Arquivo | Autor | Aplicada em |
|---|---|---|
| 081_polapetit_e_normalizacao_inventario.sql | agente do app | 28/08 10:17 |
| 081_telao_views_e_espelhos.sql | orquestrador (Telão) | 27/08 |
| 082_inventario_com_empresa.sql | agente do app | 28/08 10:17 |
| 082_infinitepay_jun_ago_2026_e_aportes.sql | orquestrador (ordem noturna) | 05/09 ~01h |
| 083_gbp_api_verificado.sql | agente do app | 28/08 10:18 |
| 083_comercial_config_dono_padrao_sla.sql | orquestrador (ordem noturna) | 05/09 ~01h |
| 084_fix_view_inventario_permissao.sql | agente do app | 28/08 10:21 |
| 084_revoke_anon_public_em_funcoes_de_escrita.sql | orquestrador (ordem noturna) | 05/09 ~01h |

Independência conferida: nenhum par escreve no mesmo objeto; a ordem relativa dentro
de cada par não altera o resultado (o 084 do app mexe numa VIEW de inventário; o 084
do orquestrador em GRANTS de FUNÇÕES). Mesmo assim, a regra abaixo existe para que
isso nunca precise ser conferido de novo.

## Regra daqui para a frente (vale para todos os agentes do app)
1. **Número novo = maior número existente no diretório + 1**, lido do disco na hora
   (`ls supabase/migrations | sort | tail -1`), nunca "o próximo que eu lembro".
2. Quem aplica, espelha no mesmo commit em `docs/migrations/migrations/` (o padrão do
   app — não flat em `docs/migrations/`), e regenera `schema.sql` quando cria objeto.
3. Antes de aplicar, `git pull`: se outro agente criou número igual entre o teu
   rascunho e o teu apply, renumera o TEU (ainda não aplicado) — nunca o dele.
4. Duas sessões no mesmo repo na mesma rodada = um executor por repo (lição 05/09).

5. **Objeto novo concede EXPLICITAMENTE, e diz a quem serve** (a partir da 098).
   Antes da 098 o silêncio concedia tudo — `pg_default_acl` do `public` dava
   `arwdDxtm` a `anon`/`authenticated` em toda view nova e `EXECUTE` a `anon` em
   toda função nova. Depois dela o silêncio não concede nada. Então:
   `grant select on … to authenticated;` + `comment on … is 'Consumidor: … Grant: … porque …'`.
   Grant a `anon` só como exceção documentada, com o motivo no comment.

Próximo número livre em 09/09/2026: **105** — aplicadas: 093, 095, 096, 097, 098, 100, 101, 102. **Escritas e NÃO aplicadas:** 099 (`company.*` por RPC — exige front no mesmo passe), 103 (`fn_marcar_lead_perdido` — a porta que falta para registrar perda) e 104 (auditoria grava IP + `fn_audit_login`; **exige um passo de front** para o LOGIN não ficar inerte). 094 é do MKT.
