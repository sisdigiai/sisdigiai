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
const DIAS_DO_LINK = 7 * 24 * 60 * 60;   // o link de leitura que o robô do MKT consome
const RENOVAR_ABAIXO_DE_H = 48;          // renova o que vence nas próximas 48h, não só o já vencido
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

// Assina os links de LEITURA das peças e grava nos campos que o robô do MKT consome.
//
// POR QUE AQUI E NÃO NO MOTOR: o robô do MKT lê `url_assinada`/`url_expira` de cada peça, e a RPC
// `cortes_gravar_episodio` grava esses campos **a partir da carga** — só que o motor não tem como
// preenchê-los: ele não segura credencial do depósito, e é assim que tem de ser. Quem assina é quem
// guarda a credencial: esta função. Sem isto as peças chegam ao MKT sem vídeo.
//
// POR QUE POR RPC E NÃO LENDO A TABELA: tentei ler `cortes.pecas` direto e a chamada devolveu
// **`Invalid schema: cortes`** — a API REST não expõe esse schema. Descobri **testando de ponta a
// ponta**, não lendo o código; entregue sem isso, as peças chegariam ao MKT sem vídeo e só se saberia
// no dia da publicação. Agora são duas portas da 238: uma diz quais peças precisam de link, a outra
// grava o link que esta função assinou. A borda nunca escreve na tabela; a tabela nunca sabe assinar.
async function assinarLinks(
  sb: ReturnType<typeof createClient>,
  alvo: { codigo?: string; horas?: number },
): Promise<{ pecas: number; links: number; gravadas?: number; avisos: string[] }> {
  const avisos: string[] = [];
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  const inteira = (u: string) => (u.startsWith("http") ? u : `${base}/storage/v1${u}`);

  const { data: fila, error } = await sb.rpc("cortes_pecas_para_assinar", {
    p_codigo: alvo.codigo ?? null,
    p_horas: alvo.horas ?? RENOVAR_ABAIXO_DE_H,
  });
  if (error) return { pecas: 0, links: 0, avisos: [`não consegui listar as peças: ${error.message}`] };

  const pecas = (fila ?? []) as Array<{ id: string; caminhos: string[] }>;
  const gravar: Array<Record<string, unknown>> = [];
  let links = 0;

  for (const peca of pecas) {
    const caminhos = (peca.caminhos ?? []).filter(Boolean);
    if (caminhos.length === 0) continue;

    const { data: assinados, error: eSign } = await sb.storage.from("cortes")
      .createSignedUrls(caminhos, DIAS_DO_LINK);
    if (eSign) { avisos.push(`peça ${peca.id}: ${eSign.message}`); continue; }

    const porCaminho = new Map(
      (assinados ?? []).filter((a) => a.signedUrl && !a.error)
        .map((a) => [a.path ?? "", inteira(a.signedUrl!)]),
    );
    // Arquivo que o depósito não assinou fica FORA da lista, nomeado no aviso — e não vira entrada
    // vazia no meio do array, que o robô leria como link quebrado sem saber por quê. O caso comum é
    // honesto: a peça foi gravada antes de o vídeo subir.
    const faltando = caminhos.filter((c) => !porCaminho.has(c));
    if (faltando.length) avisos.push(`peça ${peca.id}: sem arquivo no depósito para ${faltando.join(", ")}`);

    const todos = caminhos.map((c) => porCaminho.get(c)).filter((u): u is string => !!u);
    if (todos.length === 0) continue;

    gravar.push({
      id: peca.id,
      url_assinada: todos[0],
      urls_assinadas: todos,
      url_expira: new Date(Date.now() + DIAS_DO_LINK * 1000).toISOString(),
    });
    links += todos.length;
  }

  if (gravar.length === 0) return { pecas: pecas.length, links: 0, gravadas: 0, avisos };

  const { data: res, error: eGrav } = await sb.rpc("cortes_gravar_links", { p: gravar });
  if (eGrav) return { pecas: pecas.length, links, avisos: [...avisos, `não gravei os links: ${eGrav.message}`] };

  const gravadas = Number((res as Record<string, unknown> | null)?.gravadas ?? 0);
  // Pedi N e gravou menos: a diferença é peça que sumiu entre listar e gravar. Vai dito, não somado.
  if (gravadas !== gravar.length) avisos.push(`pedi ${gravar.length} links e o banco gravou ${gravadas}`);
  return { pecas: pecas.length, links, gravadas, avisos };
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
  //
  // A consulta pede a chave PARA ESTA PORTA. Antes ela lia a tabela inteira e aceitava qualquer emissor
  // ativo — e como a mesma tabela guarda os emissores da Lousa, a chave do Limelight podia gravar
  // episódio aqui (achado por mim em 17/11, ninguém usou: `ultima_entrega` nula e 0 episódios).
  // Agora quem decide é o banco, numa função só, e emissor sem a porta `cortes` não recebe chave nenhuma.
  const { data: chavePublica, error: eLeitura } = await sb.schema("ops")
    .rpc("fn_emissor_chave", { p_nome: origem, p_porta: "cortes" });
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
    // Gravar por cima é um ato DECLARADO, nunca o padrão. Medido em 17/11: sem isto o segundo link
    // para o mesmo caminho é recusado com "The resource already exists" — e era o que travava o vídeo
    // corrigido, que tem o mesmo nome. Mas substituição silenciosa apagaria um arquivo bom por engano
    // do motor, sem deixar rastro; por isso o motor pede `substituir: true` e a resposta diz que houve.
    const substituir = carga.substituir === true;
    const { data, error } = await sb.storage.from("cortes")
      .createSignedUploadUrl(caminho, substituir ? { upsert: true } : undefined);
    if (error) {
      return json({
        erro: `não consegui criar o link de envio: ${error.message}`,
        dica: error.message.includes("already exists")
          ? "este caminho já tem arquivo; reenvia com \"substituir\": true para gravar por cima"
          : undefined,
      }, 502);
    }
    return json({ acao: "upload", caminho, substituindo: substituir, url: data.signedUrl, token: data.token,
                  aviso: await carimbar(sb, origem) });
  }

  if (acao === "ler") {
    // Porta de LEITURA do motor: o dono aprova na tela publicada e a decisão fica no banco; sem isto
    // nada chega à máquina, porque a chave de serviço não mora lá (R-042) e é assim que tem de ser.
    // Só o episódio pedido, só o que é dele, e sem `decidido_por` — quem decidiu é dado de pessoa, o
    // motor não pediu e não precisa. Não carimba `ultima_entrega`: ler não é entregar.
    const codigo = String(carga.codigo ?? "");
    if (!codigo) return json({ erro: "a ação 'ler' precisa de 'codigo'" }, 400);
    const { data, error } = await sb.rpc("cortes_ler_episodio", { p_codigo: codigo });
    if (error) return json({ erro: error.message }, 400);
    return json({ acao: "ler", ...(data as Record<string, unknown>) });
  }

  if (acao === "links") {
    // Renova os links de leitura. Com `episodio`, só os daquele; sem nada, tudo que vence em 48h.
    const r = await assinarLinks(sb, {
      codigo: carga.episodio ? String(carga.episodio) : undefined,
      horas: typeof carga.horas === "number" ? carga.horas : undefined,
    });
    return json({ acao: "links", ...r, aviso: await carimbar(sb, origem) });
  }

  if (acao !== "gravar") return json({ erro: `ação '${acao}' não existe aqui` }, 400);

  const { data, error } = await sb.rpc("cortes_gravar_episodio", { p: carga.episodio ?? carga });
  if (error) return json({ erro: error.message }, 400);

  // Assina os links logo depois de gravar: peça que chega ao MKT sem link é peça sem vídeo. Se a
  // assinatura falhar, a gravação NÃO é desfeita — ela já aconteceu — mas o aviso volta na resposta,
  // porque engolir isto faria o motor pensar que entregou vídeo quando entregou só texto.
  const codigo = (data as Record<string, unknown> | null)?.episodio;
  const links = await assinarLinks(sb, { codigo: codigo ? String(codigo) : undefined });

  return json({ acao: "gravar", resultado: data, links,
                aviso: [await carimbar(sb, origem), ...links.avisos].filter(Boolean).join(" · ") || undefined });
});
