import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Seguidores dos canais de YouTube da casa, por API (YouTube Data API v3).
//
// POR QUE EXISTE: em 06/11/2026 o dono perguntou se a casa recebia dado de todas as redes. Medido: só
// Instagram e Facebook. YouTube, TikTok, Pinterest e LinkedIn tinham ZERO número — e o YouTube é o único
// dos quatro em que a casa já tem o que precisa para ler sozinha: `refresh_token` no Vault (2 de 3 canais)
// e `YOUTUBE_CLIENT_ID/SECRET` já como segredo do projeto. Os outros três dependem de um consentimento do
// dono no navegador (TikTok e Pinterest) ou de aprovação da própria rede (LinkedIn, Community Management
// API não aprovada desde 26/08).
//
// ONDE GRAVA: `mkt.audiencia_diaria`, que é a tabela que a tela de crescimento do digiai JÁ LÊ. Criar uma
// segunda casa para "seguidores" seria criar uma segunda verdade — e duas verdades sobre o mesmo número é
// como nasce retrato errado. A tabela é do digiai_mkt; o aviso vai para o agente do MKT.
//
// O QUE ESTA FUNÇÃO NÃO FAZ, de propósito:
//   - Canal sem credencial no Vault NÃO GERA LINHA. Gravar 0 seguidores por falta de token seria dizer
//     "este canal não tem ninguém" quando a verdade é "eu não consegui ler" — e as duas pedem ações
//     opostas (uma é conteúdo, a outra é reconectar). A resposta nomeia cada canal não lido.
//   - `monthly_views` fica NULO. A API devolve `viewCount` da VIDA do canal; escrever vida inteira numa
//     coluna chamada "views do mês" seria mentira de rótulo, e rótulo errado engana mais que campo vazio.
const DATA_API = "https://www.googleapis.com/youtube/v3";
const OAUTH = "https://oauth2.googleapis.com/token";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { ...cors, "Content-Type": "application/json" } });

// O dia do negócio é BRT, não UTC. `toISOString()` depois das 21h joga o dado para o dia seguinte e a tela
// do dono amanhece vazia — já aconteceu nesta casa, e é por isso que aqui o dia vem de São Paulo.
const diaBRT = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());

async function accessToken(refresh: string, id: string, secret: string): Promise<string> {
  const r = await fetch(OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "refresh_token", refresh_token: refresh }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`refresh falhou: ${j.error_description ?? j.error ?? r.status}`);
  return j.access_token as string;
}

type Conta = { id: string; brand_id: string; handle: string; account_ref: string | null; marca: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET");
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return json({ erro: "YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET ausentes neste projeto — sem elas não há como renovar o token do canal" }, 503);
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // CONTROLE DE CASO ÚNICO: `?canal=<id>&marca=<code>` lê um canal qualquer com o token da marca e não
  // grava nada. Serve para o controle POSITIVO — ler um canal que SABIDAMENTE tem inscritos e provar que
  // este código devolve número grande quando há número grande. Sem isso, "0 inscritos" tem duas causas
  // possíveis (o canal é vazio, ou o meu leitor sempre devolve 0) e eu não teria como distinguir.
  const canalAvulso = url.searchParams.get("canal");
  if (canalAvulso) {
    const marca = url.searchParams.get("marca") ?? "digiai";
    try {
      const { data: cred, error: eCred } = await sb.schema("mkt").rpc("fn_cred_get", { p_platform: "youtube", p_brand_code: marca });
      if (eCred) throw new Error(`fn_cred_get: ${eCred.message}`);
      if (!cred?.refresh_token) throw new Error(`marca '${marca}' sem refresh_token no Vault`);
      const tok = await accessToken(cred.refresh_token, CLIENT_ID, CLIENT_SECRET);
      const r = await fetch(`${DATA_API}/channels?part=statistics,snippet&id=${encodeURIComponent(canalAvulso)}`,
        { headers: { Authorization: `Bearer ${tok}` } });
      const j = await r.json();
      const item = j.items?.[0];
      return json({ controle: true, canal: canalAvulso, token_da_marca: marca, http: r.status,
        titulo: item?.snippet?.title ?? null, statistics: item?.statistics ?? null, erro: j.error?.message ?? null });
    } catch (e) {
      return json({ controle: true, canal: canalAvulso, erro: String((e as Error)?.message ?? e) }, 502);
    }
  }

  const { data: contasRaw, error: eC } = await sb.schema("mkt")
    .from("accounts").select("id, brand_id, handle, account_ref, status, brands!inner(code)")
    .eq("platform", "youtube");
  if (eC) return json({ erro: `não li as contas: ${eC.message}` }, 500);

  // deno-lint-ignore no-explicit-any
  const contas: Conta[] = (contasRaw ?? []).filter((c: any) => c.status !== "inativa")
    // deno-lint-ignore no-explicit-any
    .map((c: any) => ({ id: c.id, brand_id: c.brand_id, handle: c.handle, account_ref: c.account_ref, marca: c.brands.code }));

  const dia = diaBRT();
  const lidos: Record<string, unknown>[] = [];
  const naoLidos: Record<string, string>[] = [];

  for (const c of contas) {
    if (!c.account_ref) { naoLidos.push({ canal: c.handle, marca: c.marca, motivo: "conta sem account_ref (id do canal) no inventário" }); continue; }
    try {
      const { data: cred, error: eCred } = await sb.schema("mkt").rpc("fn_cred_get", { p_platform: "youtube", p_brand_code: c.marca });
      if (eCred) throw new Error(`fn_cred_get: ${eCred.message}`);
      const refresh = cred?.refresh_token;
      if (!refresh) { naoLidos.push({ canal: c.handle, marca: c.marca, motivo: "sem refresh_token no Vault — precisa do consentimento do dono em /oauth-youtube/start" }); continue; }

      const tok = await accessToken(refresh, CLIENT_ID, CLIENT_SECRET);
      const r = await fetch(`${DATA_API}/channels?part=statistics,snippet&id=${encodeURIComponent(c.account_ref)}`,
        { headers: { Authorization: `Bearer ${tok}` } });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error?.message ?? `HTTP ${r.status}`);
      const item = j.items?.[0];
      if (!item) { naoLidos.push({ canal: c.handle, marca: c.marca, motivo: `a API não devolveu o canal ${c.account_ref} para este token (canal de outra conta Google?)` }); continue; }

      const s = item.statistics ?? {};
      // `hiddenSubscriberCount` é o canal que ESCONDE o número de inscritos. Nesse caso a API devolve
      // `subscriberCount` ausente ou zerado — e gravar 0 aqui seria ler "escondido" como "ninguém".
      if (item.statistics?.hiddenSubscriberCount === true) {
        naoLidos.push({ canal: c.handle, marca: c.marca, motivo: "o canal esconde o número de inscritos (hiddenSubscriberCount) — não é zero, é não divulgado" });
        continue;
      }
      const seguidores = Number(s.subscriberCount);
      if (!Number.isFinite(seguidores)) { naoLidos.push({ canal: c.handle, marca: c.marca, motivo: `subscriberCount ausente na resposta da API` }); continue; }

      lidos.push({
        canal: c.handle, marca: c.marca, titulo: item.snippet?.title ?? null, dia,
        seguidores, videos: Number(s.videoCount) || null, views_da_vida_do_canal: Number(s.viewCount) || null,
      });

      if (!dry) {
        // Uma linha por conta por dia: a tabela não tem chave única de (conta, dia), então a guarda é aqui.
        // Sem isso, cada corrida do dia empilharia uma linha e o delta de seguidores da tela viraria zero
        // entre duas leituras do mesmo dia.
        const { data: ja } = await sb.schema("mkt").from("audiencia_diaria")
          .select("id").eq("account_id", c.id).eq("dia", dia).maybeSingle();
        const linha = { brand_id: c.brand_id, platform: "youtube", account_id: c.id, dia, seguidores };
        const { error: eW } = ja
          ? await sb.schema("mkt").from("audiencia_diaria").update(linha).eq("id", ja.id)
          : await sb.schema("mkt").from("audiencia_diaria").insert(linha);
        if (eW) throw new Error(`gravação: ${eW.message}`);
      }
    } catch (e) {
      naoLidos.push({ canal: c.handle, marca: c.marca, motivo: String((e as Error)?.message ?? e) });
    }
  }

  return json({
    dia, dry_run: dry,
    canais: contas.length, lidos: lidos.length, nao_lidos: naoLidos.length,
    detalhe: lidos, falhas: naoLidos,
    nota: naoLidos.length
      ? "canal não lido NÃO virou linha de zero seguidor — ausência de linha é ausência de leitura, e isso é de propósito"
      : "todos os canais lidos",
  });
});
