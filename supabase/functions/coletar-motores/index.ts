import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// O BOTÃO ÚNICO: pede coleta a todos os motores de uma vez.
//
// De onde vem: o dono, 27/11/2026 — "clico em cada app para atualizar, não é nada automático... se
// temos uma central de comando, não seria interessante ter um só comando para atualizar tudo?".
//
// POR QUE ESTA FUNÇÃO EXISTE, EM VEZ DE O NAVEGADOR CHAMAR OS MOTORES DIRETO: porque a chamada vai
// ASSINADA, e a chave privada não pode viver no front — tudo que está no app do navegador é legível
// por quem abre a página. Aqui ela fica no servidor, lida só pela service role (migration 277).
//
// POR QUE ASSINADA, E NÃO PELA CHAVE ANÔNIMA DO MOTOR: medição do Limelight, 27/11. A coleta deles
// bate na MESMA cota de Graph/TikTok/YouTube que a PUBLICAÇÃO usa — 43 s por rodada, 565 mídias só da
// Lancaster. Uma porta aberta não derrubaria só a coleta: derrubaria a publicação. É o espelho exato
// da `lousa-entrada`, que recebe assinado deles; aqui o digiai é quem assina.
//
// O PULSO ESCOLHEU OUTRO CAMINHO, e os dois valem: `pedir_coleta_pulso()` é uma RPC sem parâmetro que
// só GRAVA o pedido, e só se a última coleta tiver mais de 15 min — o teto fica no servidor deles, o
// que contém o mesmo risco por outra via. Por isso `modo` é coluna, não `if` no código.
//
// O QUE ELA NUNCA FAZ: não manda parâmetro de quem chama, não lê dado de motor, não escreve em banco
// de ninguém. Pede, e conta o que voltou.
//
// FECHA NO ERRO: sem JWT, quem não é staff, motor inativo ou sem chave → não chama (R-037).

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo, null, 2), { status, headers: { "Content-Type": "application/json" } });

const bytesParaBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const base64ParaBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

type Motor = {
  nome: string; url: string; modo: "assinado" | "rpc";
  chave_anon: string | null; ativo: boolean;
};

/** O par do digiai, criado na PRIMEIRA chamada e guardado no banco. O dono não cola nada: é a mesma
 *  regra que a `lousa-entrada` já impõe aos motores — quem assina gera a própria chave. */
async function parDoDigiai(sb: ReturnType<typeof createClient>) {
  const { data } = await sb.schema("ops").from("chave_propria")
    .select("privada_pkcs8, publica_spki").eq("porta", "coleta").eq("ativa", true).maybeSingle();

  if (data?.privada_pkcs8) {
    const privada = await crypto.subtle.importKey(
      "pkcs8", base64ParaBytes(data.privada_pkcs8 as string), { name: "Ed25519" }, false, ["sign"]);
    return { privada, publica: data.publica_spki as string, nova: false };
  }

  const par = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]) as CryptoKeyPair;
  const pkcs8 = bytesParaBase64(new Uint8Array(await crypto.subtle.exportKey("pkcs8", par.privateKey)));
  const spki = bytesParaBase64(new Uint8Array(await crypto.subtle.exportKey("spki", par.publicKey)));
  const { error } = await sb.schema("ops").from("chave_propria")
    .upsert({ porta: "coleta", privada_pkcs8: pkcs8, publica_spki: spki, ativa: true });
  if (error) throw new Error(`não consegui guardar o par: ${error.message}`);
  return { privada: par.privateKey, publica: spki, nova: true };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ erro: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const servico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !anon || !servico) return json({ erro: "função sem credencial de servidor" }, 500);

  // QUEM CHAMA: pessoa logada no painel e staff. O papel vem do banco, nunca de constante (R-037).
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json({ erro: "sem credencial" }, 401);
  const comoUsuario = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: u, error: eu } = await comoUsuario.auth.getUser(jwt);
  if (eu || !u?.user?.id) return json({ erro: "sessão inválida" }, 401);
  const { data: staff, error: es } = await comoUsuario.rpc("is_staff");
  if (es || staff !== true) return json({ erro: "não autorizado" }, 401);

  const sb = createClient(url, servico);

  const { data: motores, error: em } = await sb.schema("ops").from("motor_coleta")
    .select("nome, url, modo, chave_anon, ativo").eq("ativo", true).order("nome");
  if (em) return json({ erro: `não consegui ler os motores: ${em.message}` }, 500);
  if (!motores || motores.length === 0) {
    return json({ ok: true, pedidos: [], aviso: "nenhum motor ligado — o portão de cada um é a palavra do dono no canal dele" });
  }

  let par: Awaited<ReturnType<typeof parDoDigiai>> | null = null;
  const precisaAssinar = (motores as Motor[]).some((m) => m.modo === "assinado");
  if (precisaAssinar) {
    try { par = await parDoDigiai(sb); }
    catch (e) { return json({ erro: String((e as Error).message) }, 500); }
  }

  const pedidos = await Promise.all((motores as Motor[]).map(async (m) => {
    const t0 = Date.now();
    try {
      let r: Response;
      if (m.modo === "assinado") {
        // Carga vazia de propósito: o endereço do motor não aceita parâmetro de quem chama
        // (condição da casa, arbitrada pelo Geral em 27/11). Assina-se o instante, para a chamada
        // não poder ser gravada e repetida depois.
        const carimbo = new Date().toISOString();
        const mensagem = new TextEncoder().encode(`coletar-agora\n${carimbo}`);
        const assinatura = bytesParaBase64(new Uint8Array(
          await crypto.subtle.sign({ name: "Ed25519" }, par!.privada, mensagem)));
        r = await fetch(m.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-origem": "digiai",
            "x-carimbo": carimbo,
            "x-assinatura": assinatura,
          },
          body: "{}",
        });
      } else {
        if (!m.chave_anon) return { motor: m.nome, ok: false, motivo: "sem a chave pública do motor cadastrada" };
        r = await fetch(m.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: m.chave_anon, Authorization: `Bearer ${m.chave_anon}` },
          body: "{}",
        });
      }

      const texto = await r.text();
      let corpo: unknown; try { corpo = JSON.parse(texto); } catch { corpo = texto.slice(0, 200); }
      const resposta = { motor: m.nome, ok: r.ok, status: r.status, ms: Date.now() - t0, resposta: corpo };
      // Carimbo que não derruba a chamada se falhar — ela já aconteceu, e fingir que não seria pior.
      await sb.schema("ops").from("motor_coleta")
        .update({ ultima_chamada: new Date().toISOString(), ultima_resposta: resposta })
        .eq("nome", m.nome);
      return resposta;
    } catch (e) {
      // Motor fora do ar não é motor que recusou, e a tela precisa poder dizer qual dos dois.
      return { motor: m.nome, ok: false, ms: Date.now() - t0, motivo: `não consegui falar com ele: ${String((e as Error).message)}` };
    }
  }));

  return json({
    ok: pedidos.every((p) => p.ok),
    pedidos,
    // Só na primeira chamada da vida: a pública precisa ir para cada motor cadastrar.
    chave_publica_nova: par?.nova ? par.publica : undefined,
  });
});
