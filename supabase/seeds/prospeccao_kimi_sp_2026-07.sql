-- Seed: 5 leads de prospecção (IA Kimi, SP/Grande SP, 2026-07) -> ops.commercial_leads
-- Fonte: prospecção qualificada (ICP Clearix: 2+ lojas + lab/crediário próprios).
-- Idempotente: só insere se a company ainda não existir (não duplica).
-- Rodar no projeto digiai (hswyopqvnolqpmprqvzh). value_brl = plano-alvo (MRR potencial).
-- Regra: dados comerciais seguem 00-DADOS-COMERCIAIS-CANONICOS.md (R-036).

insert into ops.commercial_leads (company, name, product, stage, source, contact, value_brl, owner, next_step, notes)
select 'Mil Ótica', null, 'clearix', 'lead', 'Prospecção IA (Kimi) · SP/Grande SP · 2026-07',
       '(11) 4433-7313 (SBC) · WhatsApp por unidade', 899, 'Gilberto (Junior)', 'Abordagem inicial no WhatsApp',
       $lead$Fit 5/5 · 9 lojas (Guarulhos, Santo André I/II, Diadema, SBC, Jundiaí, Itaim Paulista, Campinas, Penha) · Site: https://milotica.com.br · CNPJ 51.588.760/0001-00 · Sinais: lab digital próprio (óculos 30min), crediário próprio, rede em expansão · Dor: carnê/inadimplência descentralizado entre filiais; estoque multi-loja sem centralização · Plano-alvo: Controle (R$899) · Abordagem WhatsApp: "Parabéns pela expansão da Mil Ótica — 9 unidades. Quando um cliente atrasa o carnê em Diadema, a loja de Guarulhos vê isso antes de vender, ou cada unidade controla o risco sozinha? Roda há 5 anos no Grupo Mello (10 lojas). 30 dias grátis, sem cartão. Tem horário essa semana?"$lead$
where not exists (select 1 from ops.commercial_leads where company = 'Mil Ótica' and deleted_at is null);

insert into ops.commercial_leads (company, name, product, stage, source, contact, value_brl, owner, next_step, notes)
select 'Rubi Ótica', null, 'clearix', 'lead', 'Prospecção IA (Kimi) · SP/Grande SP · 2026-07',
       '(11) 4433-7301 (Mauá 1) · WhatsApp (11) 96491-4852', 1499, 'Gilberto (Junior)', 'Abordagem inicial no WhatsApp',
       $lead$Fit 5/5 · 12 lojas (Mauá 1/2, SBC, Santo André, Diadema 1/2, Franca, Lapa, Franco da Rocha, Guaianazes, Francisco Morato, Guarulhos) · Site: https://rubiotica.com.br · Sinais: lab próprio (30min), crediário próprio, Instagram ativo, preço popular (óculos completo R$79,90) · Dor: OS do lab não integrada ao financeiro; inadimplência invisível entre unidades · Plano-alvo: Crescimento (R$1.499) · Abordagem WhatsApp: "A Rubi tem 12 lojas e lab próprio — operação impressionante. Quando o gerente de Mauá precisa saber quanto o lab tem de OS em aberto, consulta no celular ou liga pro responsável? Integro lab + crediário + financeiro num login só. Roda no Grupo Mello há 5+ anos. 30 dias grátis. Topa 15 min?"$lead$
where not exists (select 1 from ops.commercial_leads where company = 'Rubi Ótica' and deleted_at is null);

insert into ops.commercial_leads (company, name, product, stage, source, contact, value_brl, owner, next_step, notes)
select 'Óticas Mileto', null, 'clearix', 'lead', 'Prospecção IA (Kimi) · SP/Grande SP · 2026-07',
       'a confirmar (site: oticasmileto.com.br)', 899, 'Gilberto (Junior)', 'Confirmar contato + abordagem WhatsApp',
       $lead$Fit 4/5 · 4 lojas (2× Barueri, Carapicuíba, Santo Amaro) · Site: https://oticasmileto.com.br · Sinais: lab próprio (óculos 1h), 20 anos, expansão recente p/ capital (Santo Amaro), site em template genérico (indício de gestão manual) · Dor: estoque multi-loja sem centralização; lab sem controle digital de OS integrado ao PDV · Plano-alvo: Controle (R$899) · Abordagem WhatsApp: "Vi que a Mileto abriu no Santo Amaro. Parabéns. Quando a loja nova precisa de uma armação que só tem em Barueri, você vê o saldo e reserva pelo celular, ou liga e espera confirmação? Estoque multi-loja + lab integrado. Grupo Mello usa há 5 anos. 30 dias grátis, sem cartão."$lead$
where not exists (select 1 from ops.commercial_leads where company = 'Óticas Mileto' and deleted_at is null);

insert into ops.commercial_leads (company, name, product, stage, source, contact, value_brl, owner, next_step, notes)
select 'Visbel Óticas', null, 'clearix', 'lead', 'Prospecção IA (Kimi) · SP/Grande SP · 2026-07',
       '(11) 4056-5110 (SAC)', 1499, 'Gilberto (Junior)', 'Abordagem inicial no WhatsApp',
       $lead$Fit 4/5 · 4 lojas (Santo Amaro, Joaniza, Anália Franco, SBC) · Site: https://oticasvisbelnacional.com.br · Sinais: familiar desde 1984, lab próprio computadorizado (óculos 1h), atendimento domiciliar/in-company (serviço premium sem ERP integrado) · Dor: agendamento/follow-up de clientes B2B (convênios) no WhatsApp solto, sem histórico nem portal · Plano-alvo: Crescimento (R$1.499) · Abordagem WhatsApp: "A Visbel tem atendimento domiciliar e in-company — diferencial raro. Quando fecha um convênio empresarial, os funcionários marcam exame pelo WhatsApp e você anota na agenda, ou já tem portal onde eles agendam e acompanham sozinhos? Portal do paciente via WhatsApp + clínico. 30 dias grátis. Vale 15 min?"$lead$
where not exists (select 1 from ops.commercial_leads where company = 'Visbel Óticas' and deleted_at is null);

insert into ops.commercial_leads (company, name, product, stage, source, contact, value_brl, owner, next_step, notes)
select 'Óticas Redvision', null, 'clearix', 'lead', 'Prospecção IA (Kimi) · SP/Grande SP · 2026-07',
       'a confirmar (site: oticasredvision.com.br)', 349, 'Gilberto (Junior)', 'Confirmar contato + abordagem WhatsApp',
       $lead$Fit 3/5 · 2 lojas (Pinheiros, Santana) · Site: https://oticasredvision.com.br · Sinais: lab próprio (30min), exame computadorizado grátis, nicho premium (Pinheiros), SEM crediário próprio aparente · Dor: perde conversão em ticket alto por não ter parcelamento próprio · Plano-alvo: Essencial (R$349), upgrade Controle ao abrir 3ª loja · Abordagem WhatsApp: "A Redvision entrega óculos em 30 min com exame computadorizado. Quando o cliente escolhe um óculos de alto valor e diz 'vou pensar' por não ter limite no cartão, você recupera essa venda na hora ou depende da operadora? Crediário integrado ao PDV. 30 dias grátis, sem cartão, sem fidelidade. Topa ver?"$lead$
where not exists (select 1 from ops.commercial_leads where company = 'Óticas Redvision' and deleted_at is null);
