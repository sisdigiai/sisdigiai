// roadmap-gj — o GJ PUXA a ordem do dia, em vez de o digiai empurrar
// ============================================================================
// ⚠ PUBLICADA E DESLIGADA (medido em 16/09/2026): v2 no ar desde 09/09 16:11 BRT, mas
//    ROADMAP_GJ_SECRET não existe nos secrets — toda chamada responde 503. Falta só o
//    segredo, digitado pelo dono nos dois projetos. Portão 54. A versão deste arquivo
//    (dia em Brasília + estado no item) ainda não foi publicada: sobe junto com o segredo.
//
// POR QUE INVERTE O SENTIDO: hoje a `push-ordem-gj` empurra, e para isso guarda
// `GJ_SERVICE_ROLE_KEY` — a CHAVE-MESTRA do banco do GJ — dentro do projeto
// compartilhado. É o mesmo padrão que desmontámos em 08/09 com a chave do Pulso.
// Com pull, o GJ guarda uma CAMPAINHA (um segredo de uma rota) e nenhum acesso a
// banco nenhum; e o alarme fica do lado certo: se a busca falhar, quem descobre é
// quem precisa do dado, não quem o produz.
//
// SUBSTITUI a `push-ordem-gj`, que entra na fila de APAGAR (portão 54) — apagar,
// não "deixar sem segredo": função sem segredo devolve 503 para sempre e alguém,
// daqui a três meses, "conserta" repondo a chave-mestra por boa intenção.
//
// CONTRATO DE RESPOSTA:
//   200  { dia, itens: [...] } — cada item traz `estado` (aberto | cumprido | justificado):
//        item encerrado VEM, com o estado, para o GJ fechar do lado dele em vez de
//        adivinhar pela ausência. `origem_ref` é estável dentro do dia (migration 141:
//        regerar a ordem atualiza no lugar, não troca o id). Pode vir `itens: []` num dia sem ordem humana,
//        e isso é RESPOSTA VÁLIDA, não falha: existe `dia` no corpo para o GJ
//        distinguir "li e não há nada" de "não consegui ler".
//   400  `dia` fora do formato ou fora da janela
//   401  segredo ausente ou errado
//   405  método diferente de GET
//   503  segredo/credencial ausentes, ou falha ao ler a fonte
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Valor PRÓPRIO desta rota. O header é o mesmo das três origens do GJ
// (`x-agenda-gj-secret`), para o cron dele ser um só; o que distingue é o VALOR.
const SEGREDO = Deno.env.get('ROADMAP_GJ_SECRET') ?? '';

// Teto de janela: a agenda do GJ é de dia, não é arquivo histórico. Sem teto,
// um `?dia=2020-01-01` varreria a tabela inteira por uma campainha.
const JANELA_DIAS = 31;

const PREFIXO: Record<string, string> = { trava: '🔴 TRAVA', gate: '🎯 GATE' };

// A ordem do dia é gravada pelo dia de Brasília. `toISOString()` daria o dia UTC e, das
// 21h à meia-noite, pediria o dia seguinte — que ainda não tem ordem.
const hojeBrasilia = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

// SHA-256 fixa o TAMANHO dos dois lados; o tempo constante vem da comparação
// byte a byte SEM saída antecipada. Hash com `===` no fim voltaria a vazar
// posição do primeiro byte diferente.
async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
async function segredoConfere(recebido: string): Promise<boolean> {
  const [a, b] = [await sha256(recebido), await sha256(SEGREDO)];
  let dif = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i % b.length];
  return dif === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return json({ erro: 'metodo' }, 405);

  if (!SEGREDO) return json({ erro: 'sem_segredo_configurado' }, 503);
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ erro: 'sem_credencial' }, 503);

  const recebido = req.headers.get('x-agenda-gj-secret') ?? '';
  if (!recebido || !(await segredoConfere(recebido))) return json({ erro: 'nao_autorizado' }, 401);

  const hoje = hojeBrasilia();
  const dia = new URL(req.url).searchParams.get('dia')?.trim() || hoje;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return json({ erro: 'dia_invalido', esperado: 'AAAA-MM-DD' }, 400);

  const distancia = Math.abs(
    (Date.parse(`${dia}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86400000,
  );
  if (!Number.isFinite(distancia) || distancia > JANELA_DIAS) {
    return json({ erro: 'dia_fora_da_janela', janela_dias: JANELA_DIAS, dia }, 400);
  }

  try {
    const cli = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await cli
      .schema('ops')
      .from('ordem_do_dia')
      // Colunas NOMEADAS, e só as que viram evento. Nada de `select('*')`:
      // a tabela pode ganhar coluna interna e ela viajaria para outro projeto
      // sem ninguém decidir.
      .select('id, bloco, posicao, titulo, porque, estado')
      .eq('dia', dia)
      // O mesmo recorte da push-ordem-gj, e pelo mesmo motivo: obrigação da
      // máquina não vira compromisso de gente.
      .eq('dono', 'humano')
      .in('estado', ['aberto', 'cumprido', 'justificado'])
      .order('posicao');

    if (error) {
      console.error('[roadmap-gj] leitura falhou', error);
      return json({ erro: 'leitura_falhou' }, 503); // 503, não lista vazia
    }

    // EVENTO PRONTO, não linha de banco: o GJ recebe o que importa, não o
    // esquema do `ops`. Se a coluna mudar de nome aqui, a tradução muda aqui —
    // não no app dele.
    const itens = (data ?? []).map((it) => ({
      origem: 'digiai',
      origem_ref: `ordem-${it.id}`,
      // O bloco entra no título porque a agenda do GJ não mostra hierarquia —
      // herdado da push-ordem-gj, para o dono ver a mesma coisa que via antes.
      titulo: `${PREFIXO[it.bloco] ?? ''} ${it.titulo}`.trim(),
      porque: it.porque ?? null,
      data: dia,
      hora: null,
      contexto: 'trabalho',
      tipo: 'tarefa',
      local: null,
      posicao: it.posicao,
      estado: it.estado,
    }));

    // `itens: []` é resposta válida (dia sem ordem humana) e vem COM `dia`:
    // é assim que o GJ distingue "li e não havia nada" de "não consegui ler".
    return json({ dia, itens, total: itens.length });
  } catch (e) {
    console.error('[roadmap-gj] erro interno', e);
    return json({ erro: 'erro_interno' }, 503);
  }
});
