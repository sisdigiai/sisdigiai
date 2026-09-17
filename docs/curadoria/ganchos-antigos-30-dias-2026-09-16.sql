begin;
do $$
begin
  if (select count(*) from marketing.content_ideas
       where id in ('6b1dac80-1bf1-4742-ab8f-6b051ed5171d','07964230-303d-48ec-b0f6-ce9fc6958d8a','a7b55d2f-c665-4370-a1d1-c431e313a925','ed86ea4c-ae93-4781-a478-54108f0d2328','5533a0a5-1ab6-43c5-bcff-421f395e60ae')
         and deleted_at is null and aprovada_em is null) <> 5 then
    raise exception 'os 5 ganchos nao estao vivos e sem aprovacao como medido em 16/09.';
  end if;
end $$;

update marketing.content_ideas set hook = 'PDF profissional pra imprimir + app pra estudar no celular + Nexus 30 dias', updated_at = now()
 where id = '6b1dac80-1bf1-4742-ab8f-6b051ed5171d' and hook = 'PDF profissional pra imprimir + app pra estudar no celular + Nexus 90 dias';
update marketing.content_ideas set hook = 'O que tem dentro da Nexus: como são os 30 dias depois da compra', updated_at = now()
 where id = '07964230-303d-48ec-b0f6-ce9fc6958d8a' and hook = 'O que tem dentro da Nexus: como são os 90 dias depois da compra';
update marketing.content_ideas set hook = 'Como sair da Nexus depois de 30 dias com método interiorizado, não dependente de app', updated_at = now()
 where id = 'a7b55d2f-c665-4370-a1d1-c431e313a925' and hook = 'Como sair da Nexus depois de 90 dias com método interiorizado, não dependente de app';

-- "revogar" = tirar de circulação. fn_revogar_ideias só age em ideia APROVADA (estas nunca foram): soft delete com motivo.
update marketing.content_ideas
   set deleted_at = now(), updated_at = now(),
       notes = concat_ws(E'\n', notes, 'Tirada de circulação em 16/09/2026 (curadoria do Orquestrador Geral): promessa de resultado em prazo ("30, 60 e 90 dias"); o produto não promete resultado em prazo.')
 where id = 'ed86ea4c-ae93-4781-a478-54108f0d2328';
update marketing.content_ideas
   set deleted_at = now(), updated_at = now(),
       notes = concat_ws(E'\n', notes, 'Tirada de circulação em 16/09/2026 (curadoria do Orquestrador Geral): "depoimento real" não verificável — formulário público de 26/05, sem transação Hotmart, com valores em R$, antes de qualquer venda real da OSI.')
 where id = '5533a0a5-1ab6-43c5-bcff-421f395e60ae';

do $$
begin
  if exists (select 1 from marketing.content_ideas where deleted_at is null and concat_ws(' ', hook, narrative, cta_suggestion) ~* '90 ?dias') then
    raise exception 'ainda ha ideia viva com 90 dias.';
  end if;
  if (select count(*) from marketing.content_ideas where id in ('ed86ea4c-ae93-4781-a478-54108f0d2328','5533a0a5-1ab6-43c5-bcff-421f395e60ae') and deleted_at is not null) <> 2 then
    raise exception 'as 2 ideias nao sairam de circulacao.';
  end if;
  if (select count(*) from marketing.content_ideas where id in ('6b1dac80-1bf1-4742-ab8f-6b051ed5171d','07964230-303d-48ec-b0f6-ce9fc6958d8a','a7b55d2f-c665-4370-a1d1-c431e313a925') and hook ~ '30 dias' and deleted_at is null) <> 3 then
    raise exception 'os 3 ganchos nao ficaram com 30 dias.';
  end if;
end $$;
commit;
