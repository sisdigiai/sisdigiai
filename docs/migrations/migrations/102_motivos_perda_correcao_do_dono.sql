-- 102 — a lista de motivos cai de 5 para 3: duas nasceram de uma frase mal lida
--
-- ✔ APLICADA em 09/09/2026.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE ACONTECEU, E POR QUE VALE ESCREVER INTEIRO
-- ═══════════════════════════════════════════════════════════════════════════
-- Frase original do dono (09/09), numa lista de motivos de perda:
--   "medo de mudanças, VALOR MUITO ALTO EM CLIENTES DO BANCO ANTIGO,
--    treinamento de funcionarios, modo interno da loja, diferente do app"
--
-- Três leituras, em ordem cronológica:
--   1. **MKT:** dois motivos — `preco` ("achou o valor alto") + `migracao_base`
--      ("base de clientes no sistema antigo").
--   2. **Eu (096):** contestei o `preco` e disse que a frase admitia UM motivo só,
--      de migração. Deixei `preco` inativo e mantive `migracao_base` como certo.
--   3. **O DONO:** nenhuma das duas. A frase **não é motivo de perda nenhum** —
--      é sobre OS NOSSOS DADOS: o que subimos ao Clearix a partir do banco antigo
--      da Mello **veio com erro e valores errados**.
--
-- Ou seja: a minha correção foi melhor que a do MKT (peguei que `preco` era
-- inventado) e **ainda assim errada** — troquei uma leitura inventada por outra.
-- Fiquei com a alternativa que me pareceu natural em vez de perguntar o que a
-- frase significava. A pergunta que eu mandei ("é um motivo ou dois?") já
-- assumia que era motivo; a resposta certa não estava entre as opções que ofereci.
--
-- **Lista real: TRÊS.** `medo_mudanca`, `treinamento`, `processo_interno`.
--
-- ⚠ E O ACHADO QUE SOBROU DA CORREÇÃO NÃO É DE LISTA: **a importação da Mello
--    para o Clearix subiu dado errado.** Isso é problema vivo, de outro
--    ecossistema, e é a origem do pedido de travas de importação (portão 85).
--    Registrado aqui porque foi aqui que apareceu.

begin;

-- PROVA ANTES DE APAGAR: as duas linhas não são referenciadas por lead nenhum.
-- A FK tem `on delete restrict`, então um DELETE em motivo em uso falharia — mas
-- prefiro a contagem explícita a confiar na FK para me avisar: quero saber o
-- número, não só que não deu erro.
do $$
declare n int;
begin
  select count(*) into n from ops.commercial_leads
   where motivo_perda in ('preco','migracao_base') and deleted_at is null;
  if n > 0 then
    raise exception '102 abortada: % lead(s) usam preco/migracao_base. Apagar deixaria perda sem explicação — decidir o de-para antes.', n;
  end if;
  raise notice '102: 0 leads usam preco/migracao_base — seguro apagar.';
end $$;

delete from ops.motivos_perda where chave in ('preco','migracao_base');

comment on table ops.motivos_perda is
  'Lista fechada de motivos de perda de lead. Origem: palavras do dono em 09/09/2026, CORRIGIDAS por ele no mesmo dia — a frase "valor muito alto em clientes do banco antigo" foi lida por dois agentes como motivo de perda (preço e/ou migração) e NÃO era: falava dos nossos próprios dados subidos ao Clearix com erro. As duas linhas inventadas saíram na 102. Existe como TABELA e não como CHECK porque a lista APRENDE — acrescentar motivo é INSERT.';

-- A trava de "≥ 1 ativo" continua valendo: sem ela, uma lista só com inativos
-- reativaria o bloqueio de marcar lead como perdido (ver 096 §0).
do $$
declare n int;
begin
  select count(*) into n from ops.motivos_perda where ativo;
  if n = 0 then
    raise exception '102: lista ficaria sem motivo ATIVO — nenhum lead poderia ser marcado como perdido.';
  end if;
  raise notice '102: % motivos ativos restantes.', n;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS DEPOIS DE APLICAR
-- ═══════════════════════════════════════════════════════════════════════════
--   a) `select chave, ordem from ops.motivos_perda order by ordem` → exatamente
--      medo_mudanca (10), treinamento (30), processo_interno (40);
--   b) marcar lead descartável com 'preco' → **23503** da FK (deixou de existir),
--      não mais 23514 do trigger — a mensagem muda, e é a mensagem certa;
--   c) marcar com 'treinamento' → grava;
--   d) 260 leads intactos, 0 perdidos.
--
-- ⚠ A ordem fica 10/30/40, com buracos. **De propósito:** renumerar apagaria a
--    única pista de que duas linhas existiram e saíram. O buraco é barato e o
--    registro é caro.
