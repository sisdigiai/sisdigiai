-- 170 — o ponteiro da chave Resend nomeava o segredo errado
--
-- ✔ APLICADA em 05/10/2026 às 14:23:00 BRT, reensaiada antes.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE EXISTE: na 169 escrevi `secret_ref = 'secrets do Worker mello-ecommerce (RESEND_API_KEY)'`. O agente
--   do Ecommerce, que é quem mantém o Worker, corrigiu em 05/10: o segredo lá chama **EMAIL_API_KEY**.
--
-- POR QUE UMA MIGRATION PARA UM CAMPO: `secret_ref` existe para alguém seguir quando precisar da chave. Nome
--   errado manda a pessoa procurar um segredo que não existe, ela conclui que a chave sumiu e cria outra —
--   e aí passam a existir duas, uma delas sem ninguém sabendo de quem é. Ponteiro errado é pior que ponteiro
--   ausente, e o conserto fica registrado como qualquer outro.
--
-- CONTINUA SEM SEGREDO AQUI: o que muda é o NOME da variável, não o valor. O valor nunca passou por este banco.

begin;

do $$
begin
  if not exists (select 1 from ops.contas_servicos
                  where identificador = 'mellooticas-ecommerce-cf' and secret_ref ilike '%RESEND_API_KEY%') then
    raise exception 'o secret_ref nao esta como a 169 deixou — a 170 ja foi aplicada?';
  end if;
end $$;

update ops.contas_servicos
   set secret_ref = 'secrets do Worker mello-ecommerce (EMAIL_API_KEY)',
       ultima_verificacao = now(),
       ultimo_detalhe = 'nome do segredo corrigido pelo agente do Ecommerce em 05/10 (era RESEND_API_KEY)',
       updated_at = now()
 where identificador = 'mellooticas-ecommerce-cf';

do $$
begin
  if not exists (select 1 from ops.contas_servicos
                  where identificador = 'mellooticas-ecommerce-cf'
                    and secret_ref = 'secrets do Worker mello-ecommerce (EMAIL_API_KEY)') then
    raise exception 'PROVA_170_FALHOU: o ponteiro nao ficou com o nome certo';
  end if;
  if exists (select 1 from ops.contas_servicos where secret_ref ilike 're\_%' or secret_ref ~ '[A-Za-z0-9_-]{30,}') then
    raise exception 'PROVA_170_FALHOU: tem cara de valor de segredo dentro do ponteiro';
  end if;
end $$;

commit;
