-- Atualiza 3 assets OSI que estavam 'a_registrar' e foram criados em 2026-06-02
-- + insere o BM Digiai como asset de orquestração da família DIGIAI Academy.
-- Cross-ref: Cockpit/sessoes/META_setup_2026-06-02.md
-- Nota: categoria 'facebook' não existe no CHECK (mesma raiz do Facebook DIGIAI usa 'outro').

-- 1. Instagram OSI — agora ativo
UPDATE company.digital_assets
SET status = 'ativo',
    valor = 'https://instagram.com/oticasemimproviso',
    observacoes = $obs$
[2026-06-02] Conta criada e conectada ao BM Digiai (1330524481742986).
- IG asset_id no BM: 17841422939800023
- Página FB companheira: Óticas Sem Improviso (id 1079807541890310, URL profile.php?id=61590241545549)
- Avatar atual: foto da Tatiana Camargo (mentor-led brand, decisão Gilberto)
- Acesso BM: Gilberto Junior (total) · Taty Mello (total)
- Bio: vazia (pendência humana)
- Brand mark MJ disponível em src/modules/osi-academy/docs/divulgacao/avatar-instagram-v1.png (reserva, não usado)
$obs$,
    updated_at = now()
WHERE id = 'e7653620-07fd-477c-bd6b-46b31453fd50';

-- 2. Facebook OSI — agora ativo (categoria mantida 'outro' por compatibilidade com check constraint)
UPDATE company.digital_assets
SET status = 'ativo',
    valor = 'https://www.facebook.com/profile.php?id=61590241545549',
    observacoes = $obs$
[2026-06-02] Página criada e vinculada ao BM Digiai (1330524481742986).
- Identificação (MBS): 1079807541890310
- URL profile pública: facebook.com/profile.php?id=61590241545549
- Nome: Óticas Sem Improviso
- Bio: "Treinamentos práticos para óticas que querem atender e vender com método. Sem improviso, com resultado."
- Categoria FB: Serviço local (refinar pra 'Empresa de educação' via Settings)
- Avatar: foto Tatiana Camargo (mentor-led brand)
- Capa: cover-facebook-v1.png (eye-test card editorial + lens cases, gerada via prompt MJ canônico)
- Pessoas: Gilberto Junior (total) · Taty Mello (parcial)
$obs$,
    updated_at = now()
WHERE id = 'e2305a97-6f39-43b4-bd0f-28dcb11ef517';

-- 3. TikTok OSI — agora ativo
UPDATE company.digital_assets
SET status = 'ativo',
    valor = 'https://www.tiktok.com/@oticasemimproviso',
    observacoes = $obs$
[2026-06-02] Conta TikTok configurada (login Taty/Gilberto).
- Handle: @oticasemimproviso
- Nome (apelido): Óticas Sem Improviso
- Bio (69/80): "Dono de ótica? Pare de vender no improviso. Mentoria Tatiana Camargo."
- Stats estreia: 0 seguidores, 0 vídeos
- Avatar: pendente humano (subir foto Tatiana via app mobile — web tem limitações)
- TikTok Business Center: NÃO criado (deferido até decisão de rodar ads)
- TikTok NÃO conecta com Meta Business — ecossistema separado.

[Plano original]
Largada travada 2026-05-29: presença DEDICADA ancorada na Taty (a cara). Primárias: Instagram + TikTok. Conta pessoal da Taty (buffet) só dá empurrão pontual. Não usar contas DIGIAI nem da loja (público errado). Motor: orgânico (salvar/compartilhar) + afiliados 51% (boca a boca) + R$50/dia amplificando vencedor.
$obs$,
    updated_at = now()
WHERE id = 'b81180b1-f4a9-405d-8ca8-8bb5807cda7b';

-- 4. Inserir BM Digiai como asset DIGIAI (orquestração da família Academy)
INSERT INTO company.digital_assets
  (categoria, rotulo, valor, owner_product, status, provider, observacoes)
VALUES
  ('outro',
   'Meta Business Manager — Digiai',
   'https://business.facebook.com/latest/home?business_id=1330524481742986',
   'digiai',
   'ativo',
   'Meta',
   $obs$
[2026-06-02] 9º BM criado (separado dos 8 BMs Óticas Taty Mello + Projetos Pulso).
- business_id: 1330524481742986
- Nome: Digiai (Meta rejeitou "DIGIAI" all-caps — regra anti-shouting)
- Email comercial: junior@oticastatymello.com.br (verificação pendente)
- Controlador total: Gilberto Junior
- Convidado: junior.sax@gmail.com (acesso total + Finanças)

Assets vinculados:
- Página FB Óticas Sem Improviso (1079807541890310)
- IG @oticasemimproviso (17841422939800023)

Razão estratégica: separa família DIGIAI Academy (OSI, futuros Polapetit/NipoSchool/Clearix) dos BMs de ótica (Taty Mello, Lancaster). Mantém Óticas Lancaster Suzano sem mistura.

Pendências futuras:
- Adicionar WhatsApp Business (quando número definido)
- Adicionar Conta de Anúncios (quando rodar ads pós-1ª venda)
- Adicionar Pixel + Catálogo (Meta-9)
- Verificação domínio oticasemimproviso.com.br (quando registrar)

Cross-ref: Cockpit/sessoes/META_setup_2026-06-02.md
$obs$);
