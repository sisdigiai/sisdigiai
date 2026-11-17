import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Porta de escrita do motor do DIGIAI Cortes no banco da casa.
//
// POR QUE EXISTE: o motor roda na máquina local (monta vídeo com FFmpeg) e precisa gravar no schema
// `cortes`. O desenho anterior pedia a **chave de serviço** no `.env` dele — e essa chave passa por cima da
// RLS do banco INTEIRO, não só do `cortes`. A R-042 diz que ela mora só em servidor; o dono estranhou em
// 17/11 e não colou. Esta função é o servidor: a chave fica aqui, e o motor prova quem é por **assinatura**.
//
// O QUE ELA NUNCA VAI TER, e isso é parte do desenho:
//   · nenhum "roda este SQL". Ela chama UMA função do banco, com a carga que recebeu;
//   · nenhum apagar. O motor corrige regravando (a RPC é idempotente), não removendo;
//   · nenhuma leitura de outro schema.
// Se um dia a chave privada do motor vazar, o estrago é o caminho de escrita do `cortes` — não o banco.
//
// FECHA NO ERRO, em todos os caminhos: sem cabeçalho, origem desconhecida, origem inativa, relógio fora da
// janela, assinatura inválida, tabela de emissores ilegível → 401. Não existe "não consegui conferir, então
// deixa passar" (R-037).

const JANELA_MS = 5 * 60 * 1000;   // ±5 min: requisição capturada não vale para sempre
const CAMINHO_OK = /^[A-Za-z0-9][A-Za-z0-9/_-]{0,120}\.(mp4|mov|webm|jpg|jpeg|png|srt|vtt)$/;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo, null, 2), { status, headers: { "Content-Type": "application/json" } });

const hex = (b: ArrayBuffer) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

const base64ParaBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Carimba a última entrega. NÃO derruba a entrega se falhar — a escrita já aconteceu, e fingir que não
// aconteceu seria pior. Mas também não engole: o aviso volta na resposta e fica no log.
// Esta função nasceu de um defeito meu: a primeira versão fazia o update e ignorava o erro, e o carimbo
// falhava calado porque `service_role` não tinha `update` na tabela. Descobri testando de ponta a ponta,
// não lendo o código — por isso o teste existe.
async function carimbar(sb: ReturnType<typeof createClient>, origem: string): Promise<string | undefined> {
  const { error } = await sb.schema("ops").from("emissor_externo")
    .update({ ultima_entrega: new Date().toISOString() }).eq("nome", origem);
  if (error) {
    console.warn(`[cortes-gravar] entrega aceita, carimbo falhou para '${origem}': ${error.message}`);
    return `entrega aceita, mas não consegui carimbar a última entrega: ${error.message}`;
  }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "só POST" }, 405);

  const origem = req.headers.get("x-origem") ?? "";
  const ts = req.headers.get("x-ts") ?? "";
  const assinatura = req.headers.get("x-assinatura") ?? "";
  // Corpo lido como TEXTO: o que se assina é o byte que veio, não o objeto que eu reconstruí. Reserializar
  // antes de conferir faria a assinatura valer para um texto que o emissor nunca mandou.
  const corpoTexto = await req.text();

  if (!origem || !ts || !assinatura) return json({ erro: "faltam x-origem, x-ts ou x-assinatura" }, 401);

  const quando = Date.parse(ts);
  if (!Number.isFinite(quando) || Math.abs(Date.now() - quando) > JANELA_MS) {
    return json({ erro: "x-ts ausente, inválido ou fora da janela de 5 minutos" }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const chaveServico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chaveServico) return json({ erro: "função sem credencial de servidor" }, 500);
  const sb = createClient(url, chaveServico);

  // Quem é o emissor, lido do BANCO (R-037). Erro de leitura não abre a porta.
  const { data: emissor, error: eLeitura } = await sb.schema("ops")
    .from("emissor_externo").select("chave_publica, ativo").eq("nome", origem).maybeSingle();
  if (eLeitura) return json({ erro: "não consegui conferir o emissor" }, 401);
  if (!emissor || !emissor.ativo) return json({ erro: `origem '${origem}' desconhecida ou inativa` }, 401);

  const resumo = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(corpoTexto)));
  const mensagem = new TextEncoder().encode(`${origem}.${ts}.${resumo}`);

  let valida = false;
  try {
    const publica = await crypto.subtle.importKey(
      "spki", base64ParaBytes(emissor.chave_publica), { name: "Ed25519" }, false, ["verify"]);
    valida = await crypto.subtle.verify({ name: "Ed25519" }, publica, base64ParaBytes(assinatura), mensagem);
  } catch {
    valida = false;   // chave torta ou assinatura torta é assinatura inválida, não exceção para o chamador
  }
  if (!valida) return json({ erro: "assinatura inválida" }, 401);

  let carga: Record<string, unknown>;
  try { carga = JSON.parse(corpoTexto); } catch { return json({ erro: "corpo não é JSON" }, 400); }

  const acao = String(carga.acao ?? "gravar");

  if (acao === "upload") {
    // Link assinado de envio para UM caminho dentro do bucket privado. O motor nunca segura credencial de
    // storage; o link vale pouco tempo e só para o caminho pedido.
    const caminho = String(carga.caminho ?? "");
    if (!CAMINHO_OK.test(caminho)) {
      return json({ erro: "caminho inválido: só letras, números, / _ - e extensão de mídia" }, 400);
    }
    const { data, error } = await sb.storage.from("cortes").createSignedUploadUrl(caminho);
    if (error) return json({ erro: `não consegui criar o link de envio: ${error.message}` }, 502);
    return json({ acao: "upload", caminho, url: data.signedUrl, token: data.token,
                  aviso: await carimbar(sb, origem) });
  }

  if (acao !== "gravar") return json({ erro: `ação '${acao}' não existe aqui` }, 400);

  const { data, error } = await sb.rpc("cortes_gravar_episodio", { p: carga.episodio ?? carga });
  if (error) return json({ erro: error.message }, 400);

  return json({ acao: "gravar", resultado: data, aviso: await carimbar(sb, origem) });
});
