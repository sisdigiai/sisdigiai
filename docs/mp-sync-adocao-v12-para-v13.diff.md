# mp-sync — o que mudou da v12 (adotada do deploy) para a v13 (com trava)

> Gerado em 2026-09-09. Existe para provar que a **única** diferença entre o que
> rodava em produção sem fonte e o que passou a rodar é a **trava de papel**.
>
> **Por que é um `.diff` e não uma cópia do arquivo:** a cópia vivia em
> `supabase/functions/mp-sync/_original_deploy_v12.ts`, dentro da pasta da função.
> O bundler leva a pasta, então o arquivo antigo viajaria no deploy — e alguém
> poderia publicá-lo por engano de slug. Um diff prova o mesmo e **não é
> deployável**. Achado do Orquestrador Geral ao rever a adoção.
>
> O conteúdo integral da v12 continua recuperável no git, no commit `87a1391`.

```diff
--- supabase/functions/mp-sync/_original_deploy_v12.ts	2026-09-09 15:27:58.473674400 -0300
+++ supabase/functions/mp-sync/index.ts	2026-09-09 15:28:26.502216400 -0300
@@ -1,11 +1,17 @@
 // Edge Function: mp-sync
 // ============================================================
-// Liga a Cobrança ao Mercado Pago via API (pull), complementando o
-// webhook (push). GET = status da conexão (sem expor valores).
-// POST = busca preapprovals (assinaturas) e payments recentes na MP
-// API e ingere cada um via public.billing_ingest_mp_event — mesma
-// trilha do webhook, zero lógica duplicada.
-// Secrets: MP_ACCESS_TOKEN (+ SUPABASE_* auto). verify_jwt = true.
+// ADOTADA DO DEPLOY em 2026-09-09: esta função rodava em produção (v12, ACTIVE)
+// SEM FONTE EM REPOSITÓRIO NENHUM. Corpo recuperado pela Management API
+// (GET /v1/projects/{ref}/functions/mp-sync/body) e versionado aqui.
+// O original intacto ficou em `_original_deploy_v12.ts` para diff — a única
+// diferença é a trava de papel abaixo.
+//
+// POR QUE A TRAVA ENTROU NO MESMO PASSE DA ADOÇÃO:
+// a função escreve em billing com SERVICE_ROLE e o único portão dela era
+// `verify_jwt = true`, que prova SESSÃO, não PAPEL. Qualquer conta autenticada
+// disparava a ingestão — furando a trava que a migration 092 pôs em billing no
+// dia anterior. Versionar primeiro e consertar depois deixaria no repositório,
+// assinado, um código que já se sabia furado.
 // ============================================================
 // @ts-ignore
 const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
@@ -15,6 +21,8 @@
 const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
 // @ts-ignore
 const MP_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';
+// @ts-ignore
+const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
 const PGRST = `${SUPABASE_URL}/rest/v1`;
 const CORS = {
   'Access-Control-Allow-Origin': '*',
@@ -67,6 +75,31 @@
   if (req.method === 'OPTIONS') return new Response('ok', {
     headers: CORS
   });
+  // Trava de papel (09/09/2026). `verify_jwt` prova que HÁ sessão, não QUEM é:
+  // sem isto, qualquer conta autenticada disparava ingestão em billing com
+  // service_role. Pergunta ao banco, nunca a uma constante (R-037), e usa a
+  // MESMA função que governa o módulo Cobrança no front — trava mais apertada
+  // que a tela recria o desalinhamento que a auditoria apontou.
+  // Erro na checagem = NEGA: portão que abre no erro não é portão.
+  let ehAdmin = false;
+  try {
+    const r = await fetch(`${PGRST}/rpc/is_admin`, {
+      method: 'POST',
+      headers: {
+        apikey: ANON,
+        Authorization: req.headers.get('authorization') ?? '',
+        'Content-Type': 'application/json'
+      },
+      body: '{}'
+    });
+    ehAdmin = r.ok && await r.json() === true;
+  } catch (e) {
+    console.error('mp-sync: checagem de papel falhou', e);
+  }
+  if (!ehAdmin) return json({
+    ok: false,
+    reason: 'Acesso negado: sincronizar cobrança exige papel admin ou superior'
+  }, 403);
   if (req.method === 'GET') {
     return json({
       ok: true,
```
