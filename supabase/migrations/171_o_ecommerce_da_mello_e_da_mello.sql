-- 171 — o e-commerce é da Mello, não do Clearix; por isso o pixel certo parecia intruso
--
-- ✔ APLICADA em 05/10/2026 às 14:58:07 BRT, reensaiada antes. Veredito do e-commerce passou de
--   "pixel no ar que o inventário não conhece" para **"só pixel de terceiro"**, com o 1897105824592837
--   batendo entre ar e inventário. ("Só pixel" porque a loja ainda não tem medição própria — isso é verdade,
--   não defeito.)
--
-- (Escrita como NÃO APLICADA.)
--
-- O SINTOMA: o agente do Ecommerce pôs o pixel "Mello E-commerce" (1897105824592837) no ar em 05/10 e o
--   Geral registrou no inventário sob `produtos = {mello}`. Remedi e o painel disse **"pixel no ar que o
--   inventário não conhece"**, apontando como declarado o pixel do CLEARIX (1655805246137412). Ninguém errou
--   lá: o erro é meu, aqui.
--
-- A CAUSA: `v_ops_pixels` casa site com pixel por `digital_assets.owner_product`, e o e-commerce estava com
--   `owner_product = 'clearix'` — rotulado "E-commerce Mello (cliente Clearix)" porque a loja RODA no Clearix.
--   Mas rodar no Clearix não faz a loja ser do Clearix: ela é da Mello, a conta de anúncio é da Mello e o
--   pixel é da Mello. O campo dizia quem HOSPEDA quando deveria dizer de QUEM É.
--
-- POR QUE ISSO IMPORTA ALÉM DO RÓTULO: enquanto o dono do ativo estiver errado, qualquer pixel certo da Mello
--   vai aparecer como intruso, e o pixel do Clearix vai aparecer como se fosse o esperado para a loja —
--   convidando alguém a "consertar" trocando o pixel certo pelo errado.
--
-- EFEITO NA TELA: em Ecossistemas o e-commerce sai do bloco do Clearix e passa a ter o seu. O rótulo também
--   muda: "E-commerce Mello (roda no Clearix)" diz a mesma verdade sem trocar posse por hospedagem.

begin;

do $$
begin
  if not exists (select 1 from company.digital_assets
                  where deleted_at is null and valor = 'https://mellooticas.com.br' and owner_product = 'clearix') then
    raise exception 'o e-commerce ja nao esta como clearix — a 171 ja foi aplicada?';
  end if;
end $$;

update company.digital_assets
   set owner_product = 'mello',
       rotulo = 'E-commerce Mello (roda no Clearix)',
       observacoes = coalesce(observacoes || ' · ', '') ||
         '171 (05/10): owner_product era "clearix" porque a loja roda no Clearix. A loja é da Mello — '
         'com o dono errado, o pixel certo da Mello aparecia como intruso e o do Clearix como esperado.',
       updated_at = now()
 where deleted_at is null and valor = 'https://mellooticas.com.br';

do $$
declare v record;
begin
  select site, produto, veredito, meta_no_ar, meta_declarado into v
    from public.v_ops_pixels where url = 'https://mellooticas.com.br';
  if v.produto <> 'mello' then
    raise exception 'PROVA_171_FALHOU: o dono do ativo nao virou mello (%)', v.produto;
  end if;
  if v.meta_no_ar <> '1897105824592837' then
    raise exception 'PROVA_171_FALHOU: o pixel no ar mudou (%)', v.meta_no_ar;
  end if;
  if v.meta_declarado is null or position('1897105824592837' in v.meta_declarado) = 0 then
    raise exception 'PROVA_171_FALHOU: o pixel do ar nao bate com o declarado (%)', v.meta_declarado;
  end if;
  if v.veredito = 'pixel no ar que o inventário não conhece' then
    raise exception 'PROVA_171_FALHOU: continua acusando pixel intruso';
  end if;
  raise notice '171: e-commerce agora %, veredito "%"', v.produto, v.veredito;
end $$;

commit;
