import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Porta de entrada da Lousa de publicação: por onde Pulso e Limelight mandam a agenda das contas DELES.
//
// POR QUE EXISTE: a etapa 1 da Lousa mostra só o que o MKT publica. Pulso e Limelight publicam nas
// próprias contas, e isso não aparecia em lugar nenhum — que é exatamente o buraco que a Lousa existe
// para fechar (em 12/11 a Meta bloqueou um Instagram da casa e só se soube depois).
//
// POR QUE ASSINATURA, e não segredo colado: a chave de serviço passa por cima da RLS do banco INTEIRO
// (R-042), e já havia 3 segredos esperando a mão do dono. Aqui cada motor gera o par Ed25519 dentro do
// próprio projeto, a privada nunca sai de lá, e a PÚBLICA mora no banco — autorização vem do banco
// (R-037), então desligar um emissor é uma linha, sem deploy. O dono não cola nada.
//
// O QUE ELA NUNCA VAI TER: nenhum "roda este SQL", nenhum apagar, nenhuma leitura de outro schema.
// Ela chama UMA função do banco com a carga que recebeu. Se uma chave privada vazar, o estrago é
// escrever agenda errada na Lousa — não o banco.
//
// FECHA NO ERRO em todos os caminhos: sem cabeçalho, origem desconhecida/inativa/sem esta porta,
// relógio fora de ±5 min, assinatura inválida, consulta de emissor que falha → 401 (R-037).

const JANELA_MS = 5 * 60 * 1000;
const MAX_LINHAS = 2000;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo, null, 2), { status, headers: { "Content-Type": "application/json" } });

const hex = (b: ArrayBuffer) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

const base64ParaBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Carimba a última entrega sem derrubar a entrega se falhar — ela já aconteceu, e fingir que não seria
// pior. Mas também não engole: o aviso volta na resposta. (Na `cortes-gravar` este carimbo falhou calado
// por falta de grant, e só o teste de ponta a ponta mostrou.)
async function carimbar(sb: ReturnType<typeof createClient>, origem: string): Promise<string | undefined> {
  const { error } = await sb.schema("ops").from("emissor_externo")
    .update({ ultima_entrega: new Date().toISOString() }).eq("nome", origem);
  if (error) {
    console.warn(`[lousa-entrada] entrega aceita, carimbo falhou para '${origem}': ${error.message}`);
    return `entrega aceita, mas não consegui carimbar a última entrega: ${error.message}`;
  }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "só POST" }, 405);

  const origem = req.headers.get("x-lousa-origem") ?? "";
  const ts = req.headers.get("x-lousa-ts") ?? "";
  const assinatura = req.headers.get("x-lousa-assinatura") ?? "";
  // Corpo lido como TEXTO: o que se assina é o byte que veio. Reserializar antes de conferir faria a
  // assinatura valer para um texto que o emissor nunca mandou.
  const corpoTexto = await req.text();

  if (!origem || !ts || !assinatura) {
    return json({ erro: "faltam x-lousa-origem, x-lousa-ts ou x-lousa-assinatura" }, 401);
  }

  const quando = Date.parse(ts);
  if (!Number.isFinite(quando) || Math.abs(Date.now() - quando) > JANELA_MS) {
    return json({ erro: "x-lousa-ts ausente, inválido ou fora da janela de 5 minutos" }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const chaveServico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chaveServico) return json({ erro: "função sem credencial de servidor" }, 500);
  const sb = createClient(url, chaveServico);

  // A chave PARA ESTA PORTA. Emissor cadastrado para outra função não entra aqui, e emissor novo não
  // entra em lugar nenhum até alguém dizer para quê (`portas` nasce vazio).
  const { data: chavePublica, error: eLeitura } = await sb.schema("ops")
    .rpc("fn_emissor_chave", { p_nome: origem, p_porta: "lousa" });
  if (eLeitura) return json({ erro: "não consegui conferir o emissor" }, 401);
  if (!chavePublica) return json({ erro: `origem '${origem}' desconhecida, inativa ou sem esta porta` }, 401);

  const resumo = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(corpoTexto)));
  const mensagem = new TextEncoder().encode(`${origem}.${ts}.${resumo}`);

  let valida = false;
  try {
    const publica = await crypto.subtle.importKey(
      "spki", base64ParaBytes(chavePublica as string), { name: "Ed25519" }, false, ["verify"]);
    valida = await crypto.subtle.verify({ name: "Ed25519" }, publica, base64ParaBytes(assinatura), mensagem);
  } catch {
    valida = false;   // chave torta ou assinatura torta é assinatura inválida, não exceção para o chamador
  }
  if (!valida) return json({ erro: "assinatura inválida" }, 401);

  let carga: unknown;
  try { carga = JSON.parse(corpoTexto); } catch { return json({ erro: "corpo não é JSON" }, 400); }

  // Aceita a lista crua ou embrulhada em { linhas: [...] }: os dois motores mandam a mesma carga para
  // dois destinos, e exigir um embrulho só daqui criaria um envio especial para a Lousa.
  const linhas = Array.isArray(carga)
    ? carga
    : (carga && typeof carga === "object" && Array.isArray((carga as Record<string, unknown>).linhas)
        ? (carga as Record<string, unknown>).linhas as unknown[]
        : null);

  if (!linhas) return json({ erro: "corpo tem de ser uma lista de linhas de agenda" }, 400);
  if (linhas.length > MAX_LINHAS) {
    return json({ erro: `carga de ${linhas.length} linhas; o máximo é ${MAX_LINHAS}` }, 400);
  }
  if (linhas.length === 0) return json({ recebidas: 0, gravadas: 0, ignoradas: [] });

  const { data, error } = await sb.schema("ops")
    .rpc("fn_lousa_gravar", { p_origem: origem, p_linhas: linhas });
  if (error) return json({ erro: error.message }, 400);

  return json({ ...(data as Record<string, unknown>), aviso: await carimbar(sb, origem) });
});
