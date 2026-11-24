-- A série da Mello são 20 episódios, não 186 (23/11/2026).
--
-- O fato `mello_serie_no_ar` estava vencido há 77 dias dizendo "12 publicados, último 28/07". Pedi a
-- medição ao agente do Limelight, que é o dono da fonte, e ele mediu e devolveu no mesmo turno —
-- **com um aviso que evitou um erro de quase 9×**, e que fica escrito aqui porque é o tipo de coisa
-- que se esquece:
--
--   São TRÊS números verdadeiros e diferentes, e só um responde "a série está no ar":
--     ·  20 — episódios distintos publicados  ← é este
--     ·  72 — publicações contando cada rede (episódio × rede), de 22/07 a 23/11
--     · 186 — tudo o que o espelho conta na conta da Mello, de onde só 72 são desta esteira
--
-- ERRATA DO MESMO DIA, e ela importa porque fato errado sobre número certo também é fato errado: a
-- primeira versão deste comentário dizia que os 186 incluíam "post de perfil, card e carrossel do
-- MKT". Não incluíam — a view já exclui perfil. O agente do Limelight foi medir a composição antes
-- de me deixar com a explicação torta e devolveu: **103 são da série v1 do canal antigo** (material
-- de 2025, importado, sem `episodio_id`), **72 desta esteira**, **10 do MKT** (8 publicados, 2
-- falhados) e **1 rascunho** que nunca virou post. 103+72+10+1 = 186.
-- O número do fato não mudou; mudou o motivo. E o motivo verdadeiro muda a escolha: se um dia o
-- fato quiser dizer "o canal tem X peças da série", a v1 conta e o número é outro. Este fato diz
-- "a série nova está no ar e viva", e é por isso que ele fala em **episódios**, que é o que a data
-- de 23/11 sustenta.
--
-- Eu estava lendo a `v_espelho_limelight` (agregado das 4 marcas) e teria publicado 186 como "a
-- série", porque a Mello é a única marca publicando e o agregado parecia ser dela. Número certo da
-- conta errada continua sendo número errado.
--
-- Por rede, no dia da medição: YouTube 20 (última 23/11) · TikTok 19 (23/11) · Instagram 17 (03/11)
-- · Facebook 16 (03/11).
--
-- A fonte passa a nomear a view por marca (`v_espelho_limelight_marca`), que eu nem sabia que
-- existia. Ela ainda não traz "episódios distintos" nem a data da última publicação — é esse par que
-- faria o verificador diário conferir este fato sozinho. O Limelight se ofereceu para acrescentar os
-- dois campos; enquanto não vier, este fato depende de gente, e o verificador vai dizer isso com
-- todas as letras em vez de fingir que mediu.
update mkt.fatos set
  fato = 'A série "Transforme Sua Visão" da Mello Óticas está no ar com 20 episódios publicados, '
      || 'o último em 23/11/2026, distribuídos em YouTube, TikTok, Instagram e Facebook.',
  valor_numerico = 20,
  fonte = 'v_espelho_limelight_marca (marca=mello) — episódios distintos, medido pelo agente do Limelight',
  verificado_em = '2026-11-23 20:00:00-03',
  validade_dias = 30,
  updated_at = now()
where chave = 'mello_serie_no_ar';

-- Prova: quantos fatos ativos continuam vencidos, e de quem é cada um.
select count(*) as vencidos
from mkt.fatos
where ativo and verificado_em + (validade_dias || ' days')::interval < now();
