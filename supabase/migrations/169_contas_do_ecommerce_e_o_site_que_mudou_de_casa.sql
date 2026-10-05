-- 169 — as contas novas do e-commerce no inventário, e o registro do site corrigido
--
-- ✔ APLICADA em 05/10/2026 às 14:20:41 BRT, reensaiada antes. Rodei o medidor logo depois: o site responde
--   200 em mellooticas.com.br e segue **sem pixel** — falta o ID, que é o item C1 e é do dono.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: agente do Ecommerce, 05/10, item C2 de melloeyewear/docs/gaps-2026-10-05.md: registrar o Worker
--   `mello-ecommerce`, o Cloudflare Email Routing e a chave Resend em `ops.contas_servicos` (R-042).
--
-- O QUE ELE ME CORRIGIU, e corrijo aqui: **desde 02/10 a loja roda em Cloudflare Worker**, não na Netlify —
--   a Netlify só devolve 301. Meu `company.digital_assets` ainda dizia `https://mellooticas.netlify.app`,
--   provider Netlify. Com isso meu medidor de pixel apontava para o endereço antigo e o painel descrevia uma
--   casa onde o site não mora mais. O registro passa a ser `https://mellooticas.com.br` / Cloudflare Workers.
--
-- EFEITO COLATERAL ASSUMIDO: `ops.pixel_medicao` guarda a url medida. Trocar o `valor` do ativo faz as
--   medições antigas (chaveadas pela url da Netlify) pararem de casar, e o site aparece como "nunca medido"
--   até a próxima passada do script. É o certo: a medição velha era de outro endereço.
--
-- VOCABULÁRIO: só **um** slug novo (`resend`). Worker e Email Routing entram como `cloudflare`, que já existe
--   e já cai na família "infra" — são recursos da mesma conta, distinguidos pelo identificador. Criar
--   `cloudflare_worker` e `cloudflare_email` seria inventar duas palavras para dizer "Cloudflare" três vezes.
--
-- NENHUM SEGREDO AQUI: `secret_ref` é ponteiro para onde o segredo mora, nunca o valor (R-042). Quem digita
--   segredo é o dono; a chave Resend vive nos secrets do Worker, com o agente do Ecommerce.

begin;

do $$
begin
  if exists (select 1 from ops.contas_servicos where identificador = 'Worker mello-ecommerce') then
    raise exception 'o Worker ja esta no inventario — a 169 ja foi aplicada?';
  end if;
end $$;

insert into ops.servicos (slug, nome, familia, sort_order)
values ('resend', 'Resend (e-mail transacional)', 'infra', 34)
on conflict (slug) do nothing;

insert into ops.contas_servicos
  (servico, identificador, conta_dona, navegador, produtos, status, url_painel, secret_ref, dono_humano,
   ultima_verificacao, ultimo_detalhe, obs, ativo, categoria)
values
  ('cloudflare', 'Worker mello-ecommerce', 'sisdigiai@gmail.com', 'empresa DIGIAI', array['mello'], 'ok',
   'https://dash.cloudflare.com', null, 'Gilberto', now(),
   'Declarado pelo agente do Ecommerce em 05/10; a loja roda aqui desde 02/10',
   'Serve mellooticas.com.br. A Netlify ficou só com 301 — o deploy do site saiu de lá. '
   'VITE_META_PIXEL_ID é variável de BUILD do Vite: entra no build/deploy do Worker, não em painel de host.',
   true, 'infra'),

  ('cloudflare', 'Email Routing mellooticas.com.br', 'sisdigiai@gmail.com', 'empresa DIGIAI', array['mello'], 'ok',
   'https://dash.cloudflare.com', null, 'Gilberto', now(),
   'Declarado pelo agente do Ecommerce em 05/10',
   'Encaminha vendas@, leads@ e contato@mellooticas.com.br para oticastatymello@gmail.com. '
   'Encaminhamento, não caixa postal: se a conta de destino mudar, os três endereços mudam juntos.',
   true, 'infra'),

  ('resend', 'mellooticas-ecommerce-cf', 'sisdigiai@gmail.com', 'empresa DIGIAI', array['mello'], 'ok',
   'https://resend.com/api-keys', 'secrets do Worker mello-ecommerce (RESEND_API_KEY)', 'Gilberto', now(),
   'Declarado pelo agente do Ecommerce em 05/10',
   'Chave de envio do e-commerce. O valor vive nos secrets do Worker, com o agente do Ecommerce — aqui só o ponteiro. '
   'Remetente verificado da conta é mellooticas.com.br (o digiai.app.br segue pendente do dono desde 15/09).',
   true, 'infra');

-- o site mudou de casa em 02/10
update company.digital_assets
   set valor = 'https://mellooticas.com.br',
       provider = 'Cloudflare Workers',
       observacoes = coalesce(observacoes || ' · ', '') ||
         '169 (05/10): era https://mellooticas.netlify.app / Netlify. A loja migrou para o Worker '
         'mello-ecommerce em 02/10 e a Netlify ficou só com 301.',
       updated_at = now()
 where deleted_at is null and categoria = 'site' and valor = 'https://mellooticas.netlify.app';

do $$
declare v_n int;
begin
  if (select count(*) from ops.contas_servicos
       where ativo and identificador in ('Worker mello-ecommerce', 'Email Routing mellooticas.com.br', 'mellooticas-ecommerce-cf')) <> 3 then
    raise exception 'PROVA_169_FALHOU: as tres contas novas nao entraram';
  end if;
  if exists (select 1 from ops.contas_servicos where secret_ref ilike 're_%' or secret_ref ilike '%key%=%') then
    raise exception 'PROVA_169_FALHOU: tem cara de segredo dentro do secret_ref';
  end if;

  select count(*) into v_n from company.digital_assets
   where deleted_at is null and valor = 'https://mellooticas.com.br' and provider = 'Cloudflare Workers';
  if v_n <> 1 then raise exception 'PROVA_169_FALHOU: o site nao ficou com o endereco novo (%)', v_n; end if;
  if exists (select 1 from company.digital_assets
              where deleted_at is null and valor = 'https://mellooticas.netlify.app') then
    raise exception 'PROVA_169_FALHOU: sobrou o endereco da Netlify';
  end if;

  -- o site continua sendo vitrine: o que mudou foi a casa, não o papel
  if not (select mede_visitante from company.digital_assets
           where deleted_at is null and valor = 'https://mellooticas.com.br') then
    raise exception 'PROVA_169_FALHOU: a loja deixou de ser vitrine';
  end if;
end $$;

commit;
