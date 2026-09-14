-- ============================================================
-- ESPELHO DE SCHEMA — digiai  (projeto Supabase: digiai / region sa-east-1)
-- Gerado em 2026-09-14 por Cockpit/scripts/dump-db-mirror.mjs. Read-only.
--
-- Aqui só as TABELAS: o repositório sisdigiai/sisdigiai é PÚBLICO. Grants, policies, corpos de função, RLS e cron são o mapa de
-- acesso do banco e ficam no espelho completo, no repo privado do Cockpit:
--   Cockpit/security/espelhos/digiai/schema-completo.sql
-- Regra: portão 90 da ordem do dia (mapa de acesso sai de repo público). A fonte canônica do DDL é ./migrations/.
-- ============================================================

CREATE TABLE academy.product_assets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    asset_type text NOT NULL,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'draft'::text,
    version_label text,
    storage_provider text,
    storage_bucket text,
    storage_path text,
    file_url text,
    mime_type text,
    file_size_bytes bigint,
    is_primary boolean NOT NULL DEFAULT false,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT current_user_id()
);

CREATE TABLE academy.product_checklist_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    title text NOT NULL,
    area text NOT NULL,
    done boolean NOT NULL DEFAULT false,
    notes text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT current_user_id()
);

CREATE TABLE academy.product_creation_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    record_type text NOT NULL,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'draft'::text,
    content_md text,
    source_path text,
    external_url text,
    model_name text,
    created_via text,
    tags text[] NOT NULL DEFAULT '{}'::text[],
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT current_user_id()
);

CREATE TABLE academy.product_questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'open'::text,
    owner text,
    next_step text,
    notes text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT current_user_id()
);

CREATE TABLE academy.product_scenarios (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'draft'::text,
    landing text,
    checkout text,
    delivery text,
    access_release text,
    support text,
    summary text,
    pros text,
    cons text,
    notes text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT current_user_id()
);

CREATE TABLE academy.products (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    line text NOT NULL DEFAULT 'clearix_academy'::text,
    product_name text NOT NULL,
    subtitle text,
    status text NOT NULL DEFAULT 'draft'::text,
    offer_type text NOT NULL DEFAULT 'low_ticket'::text,
    price_brl numeric,
    launch_condition text,
    promise text,
    main_cta text,
    secondary_cta text,
    primary_audience text,
    secondary_audience text,
    core_delivery text,
    current_focus text,
    notes text,
    sales_page_url text,
    checkout_url text,
    delivery_mode text,
    delivery_provider text,
    access_duration_days smallint,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT current_user_id()
);

CREATE TABLE analytics.events_catalog (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    funnel_stage text NOT NULL,
    description text NOT NULL,
    meta_pixel_event text,
    tiktok_pixel_event text,
    ga4_event text,
    product text,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE analytics.events_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_code text NOT NULL,
    product text,
    occurred_at timestamp with time zone NOT NULL DEFAULT now(),
    session_id text,
    url text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    metadata jsonb DEFAULT '{}'::jsonb,
    user_agent text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE billing.mp_events_raw (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    received_at timestamp with time zone NOT NULL DEFAULT now(),
    topic text,
    resource_id text,
    raw jsonb NOT NULL,
    signature_ok boolean,
    processed_at timestamp with time zone,
    process_error text
);

CREATE TABLE billing.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    subscriber_id uuid,
    mp_payment_id text,
    amount_brl numeric,
    status text,
    paid_at timestamp with time zone,
    period_start date,
    period_end date,
    raw jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE billing.subscribers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product text NOT NULL DEFAULT 'clearix'::text,
    name text,
    email text,
    doc text,
    phone text,
    plan_name text,
    plan_amount_brl numeric,
    mp_preapproval_id text,
    tenant_ref text,
    status text NOT NULL DEFAULT 'active'::text,
    dunning_stage text NOT NULL DEFAULT 'em_dia'::text,
    started_on date,
    last_paid_on date,
    next_due_on date,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE company.api_credentials (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    credential_type text NOT NULL,
    vault_secret_id uuid NOT NULL,
    label text,
    scope text,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    last_sync_at timestamp with time zone,
    last_sync_status text,
    last_sync_error text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid
);

CREATE TABLE company.contacts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tipo text NOT NULL,
    nome text NOT NULL,
    empresa text,
    email text,
    telefone text,
    whatsapp text,
    custo_mensal_brl numeric,
    custo_hora_brl numeric,
    modelo_cobranca text,
    observacoes text,
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid
);

CREATE TABLE company.digital_assets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    categoria text NOT NULL,
    rotulo text NOT NULL,
    valor text,
    owner_product text,
    status text NOT NULL DEFAULT 'ativo'::text,
    provider text,
    custo_mensal_brl numeric,
    custo_anual_brl numeric,
    vencimento date,
    observacoes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid,
    brand_asset_url text
);

CREATE TABLE company.financial_snapshots (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    month date NOT NULL,
    mrr_total_brl numeric NOT NULL DEFAULT 0,
    receita_unica_brl numeric NOT NULL DEFAULT 0,
    custo_infra_brl numeric NOT NULL DEFAULT 0,
    custo_ferramentas_brl numeric NOT NULL DEFAULT 0,
    custo_pessoas_brl numeric NOT NULL DEFAULT 0,
    custo_outros_brl numeric NOT NULL DEFAULT 0,
    custo_total_brl numeric,
    saldo_conta_pj_brl numeric,
    investimento_acumulado_brl numeric,
    clientes_pagantes integer NOT NULL DEFAULT 0,
    clientes_trial integer NOT NULL DEFAULT 0,
    leads_qualificados integer NOT NULL DEFAULT 0,
    demos_agendadas integer NOT NULL DEFAULT 0,
    observacoes text,
    fechado_em timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    aporte_intelectual_brl numeric NOT NULL DEFAULT 0
);

CREATE TABLE company.identity (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    razao_social text,
    nome_fantasia text DEFAULT 'DIGIAI'::text,
    cnpj text,
    inscricao_estadual text,
    inscricao_municipal text,
    forma_juridica text,
    natureza_juridica text,
    data_abertura date,
    capital_social numeric,
    endereco_logradouro text,
    endereco_numero text,
    endereco_complemento text,
    endereco_bairro text,
    endereco_cep text,
    endereco_cidade text,
    endereco_uf text,
    regime_tributario text,
    simples_anexo text,
    aliquota_estimada numeric,
    cnae_principal_codigo text,
    cnae_principal_descricao text,
    cnaes_secundarios jsonb NOT NULL DEFAULT '[]'::jsonb,
    certificado_digital_tipo text,
    certificado_digital_vencimento date,
    representante_nome text,
    representante_cpf text,
    representante_rg text,
    representante_email text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE company.legal_status (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dpo_nomeado boolean NOT NULL DEFAULT false,
    dpo_nome text,
    dpo_email text,
    dpo_telefone text,
    dpo_nomeado_em date,
    politica_privacidade_publicada boolean NOT NULL DEFAULT false,
    politica_privacidade_url text,
    politica_privacidade_versao text,
    politica_privacidade_publicada_em date,
    tos_publicado boolean NOT NULL DEFAULT false,
    tos_url text,
    tos_versao text,
    tos_publicado_em date,
    msa_template_pronto boolean NOT NULL DEFAULT false,
    msa_template_url text,
    dpa_template_pronto boolean NOT NULL DEFAULT false,
    dpa_template_url text,
    advogado_revisao_feita boolean NOT NULL DEFAULT false,
    advogado_revisao_data date,
    advogado_contato_id uuid,
    registro_operacoes_tratamento boolean NOT NULL DEFAULT false,
    canal_titular_ativo boolean NOT NULL DEFAULT false,
    plano_incidentes_pronto boolean NOT NULL DEFAULT false,
    criptografia_repouso boolean NOT NULL DEFAULT false,
    criptografia_transito boolean NOT NULL DEFAULT true,
    controle_acesso_minimo_privilegio boolean NOT NULL DEFAULT false,
    backup_definido boolean NOT NULL DEFAULT false,
    treinamento_lgpd_time boolean NOT NULL DEFAULT false,
    observacoes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid
);

CREATE TABLE company.metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    source text NOT NULL,
    metric_type text NOT NULL,
    metric_key text,
    value_numeric numeric,
    value_text text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    period text NOT NULL,
    period_start date,
    period_end date,
    collected_at timestamp with time zone NOT NULL DEFAULT now(),
    raw_response jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    site text NOT NULL DEFAULT 'digiai.app.br'::text
);

CREATE TABLE company.partners (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    identity_id uuid NOT NULL,
    nome text NOT NULL,
    cpf text NOT NULL,
    percent_cotas numeric NOT NULL,
    papel text NOT NULL DEFAULT 'socio'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE company.seo_medicoes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    site text NOT NULL,
    medido_em date NOT NULL DEFAULT CURRENT_DATE,
    janela text NOT NULL DEFAULT '3m'::text,
    paginas_sitemap integer,
    sitemap_url text,
    sitemap_lido_em date,
    cliques integer,
    impressoes integer,
    posicao_media numeric,
    ctr numeric,
    fonte text NOT NULL DEFAULT 'gsc-navegador'::text,
    obs text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE company.seo_sites (
    site text NOT NULL,
    label text NOT NULL,
    color text,
    gsc_property text NOT NULL,
    bing_site_url text NOT NULL,
    cloudflare_zone_id text,
    indexnow_key text,
    github_repo text,
    active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 100,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE company.tools (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    categoria text NOT NULL,
    owner_product text,
    plano text,
    custo_mensal_brl numeric,
    custo_anual_brl numeric,
    moeda text NOT NULL DEFAULT 'BRL'::text,
    data_inicio date,
    proximo_vencimento date,
    renovacao_automatica boolean DEFAULT true,
    url_dashboard text,
    email_conta text,
    contato_suporte text,
    status text NOT NULL DEFAULT 'ativo'::text,
    observacoes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid,
    frequencia_cobranca text NOT NULL DEFAULT 'mensal'::text
);

CREATE TABLE finance.aportes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    data date NOT NULL,
    origem text NOT NULL,
    valor_brl numeric NOT NULL,
    natureza text NOT NULL,
    observacao text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE finance.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id text NOT NULL,
    vendor_id uuid,
    category expense_category NOT NULL,
    kind text NOT NULL,
    description text NOT NULL,
    month date NOT NULL,
    amount_brl numeric NOT NULL,
    amount_original numeric,
    original_currency text,
    exchange_rate numeric,
    invoice_ref text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid
);

CREATE TABLE finance.founder_time (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    month date NOT NULL,
    hours_worked integer NOT NULL,
    hourly_rate_brl numeric NOT NULL DEFAULT 180.00,
    valued_amount_brl numeric,
    product_allocation jsonb DEFAULT '{"clearix": 100}'::jsonb,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE finance.infra_costs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id text NOT NULL,
    service text NOT NULL,
    month date NOT NULL,
    cost_brl numeric NOT NULL DEFAULT 0,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid,
    conta_pagadora text,
    lancamentos integer,
    parcial boolean NOT NULL DEFAULT false,
    extrato_ate date,
    sincronizado_em timestamp with time zone
);

CREATE TABLE finance.products (
    id text NOT NULL,
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE finance.revenue (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id text NOT NULL,
    month date NOT NULL,
    mrr_brl numeric NOT NULL DEFAULT 0,
    active_subscriptions integer NOT NULL DEFAULT 0,
    new_subscriptions integer NOT NULL DEFAULT 0,
    churn_count integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid,
    one_time_brl numeric NOT NULL DEFAULT 0,
    sales_count integer NOT NULL DEFAULT 0,
    refund_count integer NOT NULL DEFAULT 0
);

CREATE TABLE finance.subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL,
    product_id text NOT NULL,
    plan_name text NOT NULL,
    monthly_amount_brl numeric NOT NULL,
    started_on date NOT NULL,
    ended_on date,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE finance.vendors (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    website text,
    billing_currency text NOT NULL DEFAULT 'BRL'::text,
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE iam.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    user_email text,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE iam.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_id uuid,
    email text NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL DEFAULT 'staff'::text,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    digiai_user_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_e164 text,
    wa_bsuid text,
    wa_username text,
    wa_phone_legacy text,
    lgpd_request_at timestamp with time zone,
    lgpd_completed_at timestamp with time zone,
    anonymized_at timestamp with time zone
);

CREATE TABLE marketing.account_status (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    account_code text NOT NULL,
    platform text NOT NULL,
    followers integer,
    follows integer,
    media_count integer,
    captured_on date NOT NULL DEFAULT CURRENT_DATE,
    raw jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE marketing.affiliate_downloads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL,
    material_id uuid NOT NULL,
    downloaded_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE marketing.affiliate_materials (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pillar_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    copy_short text,
    copy_medium text,
    copy_long text,
    art_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
    platforms text[] DEFAULT '{}'::text[],
    preview_url text,
    downloads_count integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid
);

CREATE TABLE marketing.affiliate_payouts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL,
    amount_cents bigint NOT NULL,
    payout_date date NOT NULL DEFAULT CURRENT_DATE,
    method text DEFAULT 'pix'::text,
    reference text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

CREATE TABLE marketing.affiliates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    email text NOT NULL,
    whatsapp text,
    instagram_handle text,
    city text,
    state text,
    status text NOT NULL DEFAULT 'pending'::text,
    tier text NOT NULL DEFAULT 'bronze'::text,
    joined_at timestamp with time zone NOT NULL DEFAULT now(),
    total_sales integer NOT NULL DEFAULT 0,
    total_commission_cents bigint NOT NULL DEFAULT 0,
    affiliate_link_hotmart text,
    affiliate_link_kiwify text,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid,
    hotmart_code text,
    commission_rate_percent numeric DEFAULT 30.00,
    commission_paid_cents bigint DEFAULT 0,
    first_sale_at timestamp with time zone,
    last_sale_at timestamp with time zone
);

CREATE TABLE marketing.ai_prompt_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    ai_target text NOT NULL,
    description text,
    prompt_template text NOT NULL,
    output_hint text,
    locks jsonb NOT NULL DEFAULT '{}'::jsonb,
    placeholders text[] NOT NULL DEFAULT '{}'::text[],
    pillar_id uuid,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE marketing.cadence_rules (
    id text NOT NULL,
    scope text NOT NULL,
    rule jsonb NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE marketing.challenge_participations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    challenge_id uuid NOT NULL,
    member_id uuid,
    participant_name text,
    participant_email text,
    participant_whatsapp text,
    joined_at timestamp with time zone DEFAULT now(),
    submission_text text,
    submission_url text,
    submission_at timestamp with time zone,
    status text NOT NULL DEFAULT 'registered'::text,
    sales_amount_cents integer,
    score numeric,
    ranking integer,
    prize_awarded text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE marketing.challenges (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    description text,
    movement integer,
    start_date date,
    end_date date,
    status text NOT NULL DEFAULT 'draft'::text,
    prize_description text,
    rules text,
    max_participants integer,
    hashtag text,
    banner_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE marketing.community_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    email text NOT NULL,
    whatsapp text,
    city text,
    state text,
    hotmart_transaction text,
    hotmart_sale_id uuid,
    joined_at timestamp with time zone DEFAULT now(),
    status text NOT NULL DEFAULT 'active'::text,
    tier text NOT NULL DEFAULT 'bronze'::text,
    last_active_at timestamp with time zone,
    testimonials_count integer DEFAULT 0,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    attributed_post_id uuid,
    attributed_pillar_id uuid,
    whatsapp_consent boolean DEFAULT false,
    email_consent boolean DEFAULT true,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE marketing.content_calendar (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    scheduled_date date NOT NULL,
    scheduled_time time without time zone,
    idea_id uuid,
    pillar_id uuid,
    platform text,
    content_type text,
    hook text,
    narrative text,
    cta text,
    hashtags text[],
    media_external_url text,
    status text NOT NULL DEFAULT 'planned'::text,
    published_at timestamp with time zone,
    published_url text,
    performance_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid,
    platforms text[] DEFAULT '{}'::text[],
    copy_full text,
    arts jsonb DEFAULT '[]'::jsonb,
    posting_brief text,
    responsible_producer text,
    responsible_publisher text,
    tools_used text[] DEFAULT '{}'::text[],
    reach integer,
    impressions integer,
    likes integer,
    comments integer,
    shares integer,
    saves integer,
    link_clicks integer,
    conversions integer,
    utm_slug text,
    art_prompt text,
    art_filename text
);

CREATE TABLE marketing.content_ideas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pillar_id uuid,
    hook text NOT NULL,
    narrative text,
    target_audience text,
    suggested_format text,
    cta_suggestion text,
    status text NOT NULL DEFAULT 'available'::text,
    used_count integer NOT NULL DEFAULT 0,
    last_used_at timestamp with time zone,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid
);

CREATE TABLE marketing.content_pillars (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    description text,
    color text,
    icon text,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid
);

CREATE TABLE marketing.hotmart_events_raw (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    received_at timestamp with time zone NOT NULL DEFAULT now(),
    event_type text,
    hotmart_id text,
    product_id text,
    signature_ok boolean,
    signature_provided text,
    payload jsonb NOT NULL,
    source_ip text,
    processed boolean DEFAULT false,
    process_error text,
    processed_at timestamp with time zone
);

CREATE TABLE marketing.hotmart_sales (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    hotmart_transaction text NOT NULL,
    product_id text NOT NULL,
    product_name text,
    status text NOT NULL,
    buyer_name text,
    buyer_email text,
    buyer_phone text,
    buyer_doc text,
    price_value_cents integer,
    price_currency text DEFAULT 'BRL'::text,
    commission_cents integer,
    affiliate_code text,
    affiliate_name text,
    payment_type text,
    installments integer,
    purchase_date timestamp with time zone,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    attributed_post_id uuid,
    attributed_pillar_id uuid,
    attribution_method text,
    raw_event_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    platform text NOT NULL DEFAULT 'hotmart'::text
);

CREATE TABLE marketing.kiwify_events_raw (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    received_at timestamp with time zone NOT NULL DEFAULT now(),
    event_type text,
    kiwify_order_id text,
    product_id text,
    signature_ok boolean,
    signature_provided text,
    payload jsonb NOT NULL,
    source_ip text,
    processed boolean DEFAULT false,
    process_error text,
    processed_at timestamp with time zone
);

CREATE TABLE marketing.landing_leads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    digiai_user_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
    product text NOT NULL DEFAULT 'osi'::text,
    name text,
    email text,
    phone_e164 text,
    wa_bsuid text,
    wa_username text,
    wa_phone_legacy text,
    source_url text,
    session_id text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    consent_text text,
    consent_at timestamp with time zone NOT NULL DEFAULT now(),
    user_agent text,
    status text NOT NULL DEFAULT 'novo'::text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    lgpd_request_at timestamp with time zone,
    anonymized_at timestamp with time zone
);

CREATE TABLE marketing.outreach_schedule (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL,
    kind text NOT NULL DEFAULT 'primeiro_contato'::text,
    scheduled_date date NOT NULL,
    variation character(1),
    status text NOT NULL DEFAULT 'agendado'::text,
    sent_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE marketing.platforms (
    code text NOT NULL,
    name text NOT NULL,
    parent_platform text,
    icon text,
    color text,
    formats jsonb NOT NULL DEFAULT '[]'::jsonb,
    copy_char_limit integer,
    hashtag_limit integer,
    notes text,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE marketing.post_ai_outputs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL,
    template_id uuid,
    template_code text,
    template_name text,
    ai_target text,
    ai_provider text,
    category text,
    prompt_rendered text NOT NULL,
    output_text text,
    output_url text,
    output_storage_path text,
    notes text,
    status text NOT NULL DEFAULT 'completed'::text,
    generated_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE marketing.post_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    calendar_post_id uuid,
    account_code text NOT NULL,
    external_post_id text NOT NULL,
    platform text NOT NULL,
    permalink text,
    captured_on date NOT NULL DEFAULT CURRENT_DATE,
    impressions integer,
    reach integer,
    likes integer,
    comments integer,
    shares integer,
    saves integer,
    video_views integer,
    link_clicks integer,
    raw jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE marketing.product_finance_map (
    platform_product_id text NOT NULL,
    finance_product_id text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE marketing.social_accounts (
    account_code text NOT NULL,
    display_name text NOT NULL,
    platform text NOT NULL,
    camada text NOT NULL,
    meta_ig_user_id text,
    meta_page_id text,
    meta_business_id text,
    public_url text,
    metrics_enabled boolean NOT NULL DEFAULT false,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE marketing.social_updates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    account_code text NOT NULL,
    update_type text NOT NULL,
    title text NOT NULL,
    url text,
    notes text,
    happened_on date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE marketing.testimonials (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    optica_name text,
    city text,
    state text,
    whatsapp text,
    whatsapp_consent boolean DEFAULT false,
    hook_applied text,
    story text NOT NULL,
    sale_value_cents integer,
    photo_url text,
    rating integer,
    status text NOT NULL DEFAULT 'pending'::text,
    source text NOT NULL DEFAULT 'public_form'::text,
    hotmart_transaction text,
    promoted_idea_id uuid,
    reviewer_notes text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE mkt.accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid,
    platform text NOT NULL,
    handle text,
    url text,
    account_ref text,
    papel text DEFAULT 'principal'::text,
    navegador text,
    status text NOT NULL DEFAULT 'a_configurar'::text,
    travado boolean DEFAULT false,
    notas text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    modo_publicacao text NOT NULL DEFAULT 'manual'::text,
    api_nota text,
    api_impossivel boolean NOT NULL DEFAULT false,
    publicar_ativo boolean NOT NULL DEFAULT false
);

CREATE TABLE mkt.ai_config (
    chave text NOT NULL,
    valor jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE mkt.ai_usage (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    funcao text NOT NULL,
    brand_id uuid,
    modelo text,
    unidades numeric,
    custo_usd numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE mkt.ai_use_cases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid,
    code text NOT NULL,
    nome text,
    prompt_mestre text,
    config jsonb DEFAULT '{}'::jsonb,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE mkt.app_users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL,
    digiai_user_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    nome text,
    role text NOT NULL DEFAULT 'operador'::text,
    phone_e164 text,
    cpf text,
    wa_bsuid text,
    wa_username text,
    wa_phone_legacy text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE mkt.assets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid,
    ideia_id uuid,
    roteiro_id uuid,
    tipo text NOT NULL,
    nome text,
    storage_path text,
    public_url text,
    duracao_segundos numeric,
    tamanho_bytes bigint,
    formato text,
    provedor text DEFAULT 'elevenlabs'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    status text NOT NULL DEFAULT 'a_postar'::text,
    tema text,
    reprova_motivo text,
    decidida_por text,
    decidida_em timestamp with time zone,
    reprova_categorias text[]
);

CREATE TABLE mkt.audiencia_diaria (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL,
    platform text NOT NULL,
    seguidores integer NOT NULL,
    dia date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    account_id uuid,
    monthly_views bigint
);

CREATE TABLE mkt.brand_config (
    brand_id uuid NOT NULL,
    chave text NOT NULL,
    valor jsonb NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.brands (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    accent_hex text,
    created_at timestamp with time zone DEFAULT now(),
    logo_url text,
    logo_arte_url text
);

CREATE TABLE mkt.canais_saida (
    canal_key text NOT NULL,
    numero text NOT NULL,
    marca_padrao text NOT NULL,
    provedor text NOT NULL,
    secret_ref text,
    limite_diario integer NOT NULL DEFAULT 20,
    ativo boolean NOT NULL DEFAULT false,
    obs text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.clickup_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL,
    workspace_id text NOT NULL,
    list_id text NOT NULL,
    trigger_status text NOT NULL DEFAULT 'agendado'::text,
    writeback_status text NOT NULL DEFAULT 'publicado'::text,
    enabled boolean NOT NULL DEFAULT false,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.clickup_sync (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    clickup_task_id text NOT NULL,
    brand_id uuid NOT NULL,
    publish_job_id uuid,
    last_status text,
    title text,
    synced_at timestamp with time zone NOT NULL DEFAULT now(),
    published_back_at timestamp with time zone
);

CREATE TABLE mkt.cobertura_geo (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pais text NOT NULL DEFAULT 'BR'::text,
    uf text NOT NULL,
    cidade text NOT NULL,
    termo text NOT NULL DEFAULT 'ótica'::text,
    anel integer NOT NULL,
    status text NOT NULL DEFAULT 'pendente'::text,
    varrido_em timestamp with time zone,
    encontrados integer,
    novos integer,
    com_celular integer,
    custo_usd numeric,
    actor text,
    run_id text,
    obs text,
    criado_em timestamp with time zone NOT NULL DEFAULT now(),
    atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.content_performance (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL,
    publication_id uuid,
    gatilho text,
    formato text,
    engajamento numeric,
    coletado_em timestamp with time zone DEFAULT now(),
    alcance integer,
    salvamentos integer,
    compartilhamentos integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    views integer
);

CREATE TABLE mkt.content_rules (
    brand_id uuid NOT NULL,
    persona text,
    tom text,
    publico text,
    proibicoes text[],
    gatilhos text[],
    formatos text[],
    cta_padrao text,
    exemplos text,
    notas text,
    updated_at timestamp with time zone DEFAULT now(),
    voice_id text,
    voice_settings jsonb,
    cadencia jsonb,
    fatos text,
    guardrails jsonb,
    norte jsonb,
    playbook text,
    universo jsonb
);

CREATE TABLE mkt.content_weights (
    brand_id uuid NOT NULL,
    dimensao text NOT NULL,
    valor text NOT NULL,
    peso numeric DEFAULT 1.0,
    amostras integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE mkt.content_weights_descartados_20260905 (
    brand_id uuid,
    dimensao text,
    valor text,
    peso numeric,
    amostras integer,
    updated_at timestamp with time zone,
    descartado_em timestamp with time zone DEFAULT now(),
    motivo text DEFAULT 'sem lastro em content_performance apos erosao de rotulo (ver 20260905_pesos_sem_lastro.sql)'::text
);

CREATE TABLE mkt.credentials (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid,
    platform text NOT NULL,
    account_ref text,
    vault_key text,
    scopes text[],
    expires_at timestamp with time zone,
    status text DEFAULT 'ativo'::text,
    updated_at timestamp with time zone DEFAULT now(),
    access_token text,
    refresh_token text,
    metadata jsonb DEFAULT '{}'::jsonb,
    provider text
);

CREATE TABLE mkt.datas_sazonais (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    data date NOT NULL,
    titulo text NOT NULL,
    brand_code text,
    antecedencia_dias integer NOT NULL DEFAULT 21,
    criado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE mkt.fatos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_slug text,
    chave text NOT NULL,
    fato text NOT NULL,
    valor_numerico numeric,
    fonte text NOT NULL,
    verificado_em date NOT NULL,
    validade_dias integer NOT NULL DEFAULT 30,
    publico boolean NOT NULL DEFAULT true,
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.ideias (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid,
    titulo text NOT NULL,
    descricao text,
    tags text[],
    formato text,
    gancho text,
    emocao text,
    prioridade integer,
    gatilho text,
    status text NOT NULL DEFAULT 'rascunho'::text,
    origem text DEFAULT 'IA'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE mkt.influencer_interacoes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    influencer_id uuid NOT NULL,
    tipo text NOT NULL DEFAULT 'mensagem'::text,
    canal text,
    direcao text,
    conteudo text,
    quem text,
    ocorreu_em timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.influencers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    digiai_user_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL,
    plataforma text NOT NULL,
    handle text NOT NULL,
    url text,
    nome text,
    bio text,
    ramo text,
    cidade text,
    regiao text,
    seguidores integer,
    engajamento numeric,
    posts integer,
    coletado_em timestamp with time zone,
    fonte text,
    email text,
    phone_e164 text,
    cpf text,
    wa_bsuid text,
    wa_username text,
    wa_phone_legacy text,
    opt_in boolean NOT NULL DEFAULT false,
    opt_in_em timestamp with time zone,
    opt_in_origem text,
    status text NOT NULL DEFAULT 'descoberto'::text,
    score integer,
    destaque text,
    acordo text,
    valor_brl numeric,
    proximo_passo text,
    observacoes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE mkt.mensagens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    direcao text NOT NULL,
    marca text NOT NULL,
    canal text NOT NULL DEFAULT 'whatsapp_web'::text,
    lead_id uuid,
    empresa text,
    fone text NOT NULL,
    template_id text,
    versao text,
    texto text,
    lote integer,
    status text NOT NULL DEFAULT 'rascunho'::text,
    provedor text,
    provedor_msg_id text,
    enviado_em timestamp with time zone DEFAULT now(),
    entregue_em timestamp with time zone,
    lida_em timestamp with time zone,
    erro text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.metricas_diarias (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    publication_id uuid NOT NULL,
    brand_id uuid NOT NULL,
    dia date NOT NULL,
    views bigint,
    salvamentos bigint,
    pin_click bigint,
    outbound_click bigint,
    curtidas bigint,
    comentarios bigint,
    engajamento bigint,
    coletado_em timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.osi_disparos_tabela_ate_20260909 (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lead_id uuid,
    empresa text,
    fone text NOT NULL,
    mensagem_versao text,
    lote integer,
    enviado_em timestamp with time zone DEFAULT now(),
    canal text DEFAULT 'whatsapp_web'::text,
    resposta text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.perfil_checklist (
    account_id uuid NOT NULL,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE mkt.plataforma_capacidade (
    platform text NOT NULL,
    formatos text,
    limite text,
    destrava text,
    medido_em date NOT NULL,
    fonte text NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.publications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_id uuid,
    brand_id uuid,
    platform text NOT NULL,
    external_post_id text,
    url text,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    account_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE mkt.publish_jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    calendar_post_id uuid,
    brand_id uuid,
    platforms text[] NOT NULL,
    status text NOT NULL DEFAULT 'pendente'::text,
    confirmado boolean DEFAULT false,
    scheduled_for timestamp with time zone,
    resultado jsonb,
    erro text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    roteiro_id uuid,
    asset_id uuid,
    message text,
    dry_run boolean NOT NULL DEFAULT false,
    aprovado_por text,
    account_id uuid
);

CREATE TABLE mkt.queue (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    kind text NOT NULL,
    payload jsonb,
    status text NOT NULL DEFAULT 'pendente'::text,
    tentativas integer DEFAULT 0,
    max_tentativas integer DEFAULT 3,
    proximo_retry timestamp with time zone,
    erro text,
    resultado jsonb,
    origem text DEFAULT 'manual'::text,
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone
);

CREATE TABLE mkt.roteiros (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    brand_id uuid,
    ideia_id uuid,
    titulo text,
    conteudo text,
    tipo text DEFAULT 'copy_post'::text,
    nota_hook integer,
    quality_score integer,
    status text NOT NULL DEFAULT 'rascunho'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE mkt.sentinela_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dia date NOT NULL,
    resultado jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.templates_vendas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    marca text NOT NULL,
    etapa text NOT NULL,
    nome text NOT NULL,
    texto text NOT NULL,
    versao text NOT NULL DEFAULT 'v1'::text,
    origem text,
    aprovado_por text,
    aprovado_em timestamp with time zone,
    ativo boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE mkt.tick_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job text NOT NULL,
    disparo text NOT NULL DEFAULT 'cron'::text,
    status text NOT NULL DEFAULT 'rodando'::text,
    iniciado_em timestamp with time zone NOT NULL DEFAULT now(),
    finalizado_em timestamp with time zone,
    resumo jsonb NOT NULL DEFAULT '{}'::jsonb,
    erros jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE mkt.user_brands (
    user_id uuid NOT NULL,
    brand_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE ops.backlog_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    product_id text,
    area text,
    priority smallint NOT NULL DEFAULT 3,
    status text NOT NULL DEFAULT 'pending'::text,
    owner text,
    due_date date,
    tags text[] NOT NULL DEFAULT '{}'::text[],
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid,
    origem text,
    blocker text
);

CREATE TABLE ops.comercial_config (
    chave text NOT NULL,
    valor jsonb NOT NULL,
    descricao text,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE ops.commercial_leads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    company text NOT NULL,
    product text,
    stage text NOT NULL DEFAULT 'lead'::text,
    source text,
    contact text,
    value_brl numeric,
    owner text,
    next_step text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    digiai_user_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
    email text,
    phone_e164 text,
    wa_bsuid text,
    wa_username text,
    wa_phone_legacy text,
    lgpd_request_at timestamp with time zone,
    anonymized_at timestamp with time zone,
    wa_status text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    session_id text,
    source_url text,
    first_touch_at timestamp with time zone,
    utm_term text,
    landing_lead_id uuid,
    motivo_perda text,
    perdido_em timestamp with time zone,
    wa_opt_out_em timestamp with time zone,
    wa_consentimento_em timestamp with time zone,
    wa_consentimento_origem text,
    wa_consentimento_categoria text,
    wa_consentimento_texto text,
    wa_consentimento_ip inet,
    next_touch_at timestamp with time zone,
    last_touch_at timestamp with time zone
);

CREATE TABLE ops.contas_servicos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    servico text NOT NULL,
    identificador text,
    conta_dona text,
    navegador text,
    produtos text[] DEFAULT '{}'::text[],
    plano text,
    custo_mensal numeric,
    moeda text NOT NULL DEFAULT 'BRL'::text,
    vencimento_dia integer,
    renova_em date,
    secret_ref text,
    status text NOT NULL DEFAULT 'desconhecido'::text,
    ultima_verificacao timestamp with time zone,
    ultimo_detalhe text,
    dono_humano text NOT NULL DEFAULT 'Gilberto'::text,
    url_painel text,
    obs text,
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    empresa_slug text,
    categoria text,
    situacao text NOT NULL DEFAULT 'ativa'::text,
    encerrada_em date
);

CREATE TABLE ops.copy_assets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    source_id text NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    format text NOT NULL,
    angulo text,
    content jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pendente'::text,
    image_url text,
    image_path text,
    source_file text,
    sort_order smallint DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    images jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE ops.decisions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    context text NOT NULL,
    decision text NOT NULL,
    alternatives text,
    expected_impact text,
    tags text[] NOT NULL DEFAULT '{}'::text[],
    decided_at date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid
);

CREATE TABLE ops.empresas (
    slug text NOT NULL,
    nome text NOT NULL,
    cnpj text,
    tipo text NOT NULL DEFAULT 'propria'::text,
    situacao text NOT NULL DEFAULT 'ativa'::text,
    desde date,
    ate date,
    responsavel text DEFAULT 'Gilberto'::text,
    obs text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    razao_social text
);

CREATE TABLE ops.fato_medicao (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    fato_id uuid,
    chave text,
    fonte text,
    valor_texto numeric,
    valor_medido numeric,
    veredito text NOT NULL,
    detalhe text,
    medido_em timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE ops.funnel_workspace (
    key text NOT NULL,
    workspace jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid
);

CREATE TABLE ops.meeting_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lead_id uuid,
    playbook_id uuid,
    title text,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    ended_at timestamp with time zone,
    duration_min integer,
    pain_noted text,
    objections_raised text[] NOT NULL DEFAULT '{}'::text[],
    outcome text,
    stage_changed_to text,
    next_action text,
    follow_up_date date,
    effectiveness smallint,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    interest_plan text,
    interest_apps text[] NOT NULL DEFAULT '{}'::text[],
    budget_signal text,
    quotes text[] NOT NULL DEFAULT '{}'::text[],
    action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
    meet_url text
);

CREATE TABLE ops.milestones (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phase smallint NOT NULL,
    title text NOT NULL,
    description text,
    target_date date,
    completed_at date,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE ops.motivos_perda (
    chave text NOT NULL,
    rotulo text NOT NULL,
    ativo boolean NOT NULL DEFAULT true,
    ordem integer NOT NULL DEFAULT 100,
    criado_em timestamp with time zone NOT NULL DEFAULT now(),
    tipo text NOT NULL DEFAULT 'perda'::text
);

CREATE TABLE ops.ordem_do_dia (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dia date NOT NULL DEFAULT CURRENT_DATE,
    bloco text NOT NULL,
    posicao smallint NOT NULL DEFAULT 0,
    titulo text NOT NULL,
    porque text,
    dono text NOT NULL DEFAULT 'humano'::text,
    origem_tipo text NOT NULL,
    origem_id uuid,
    origem_ref text,
    estado text NOT NULL DEFAULT 'aberto'::text,
    justificativa text,
    cumprido_em timestamp with time zone,
    gerado_em timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE ops.pendencias_humanas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    porque text,
    severidade smallint NOT NULL DEFAULT 2,
    area text,
    prazo date,
    fonte text,
    status text NOT NULL DEFAULT 'aberta'::text,
    resolvida_em timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE ops.plataformas (
    slug text NOT NULL,
    nome text NOT NULL,
    tem_canal boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 99,
    notas text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE ops.playbooks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    slug text,
    name text NOT NULL,
    product text,
    audience text,
    objective text,
    duration_min integer,
    agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
    discovery jsonb NOT NULL DEFAULT '{}'::jsonb,
    objections jsonb NOT NULL DEFAULT '[]'::jsonb,
    checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
    access_info jsonb NOT NULL DEFAULT '{}'::jsonb,
    followup jsonb NOT NULL DEFAULT '{}'::jsonb,
    deck_url text,
    pdf_url text,
    notes text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE ops.proposals (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lead_id uuid,
    meeting_id uuid,
    title text,
    plan text,
    monthly_price numeric,
    discount_pct numeric,
    trial_days integer,
    setup_note text,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    body text,
    status text NOT NULL DEFAULT 'rascunho'::text,
    sent_at timestamp with time zone,
    sent_via text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE ops.roadmap_phases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phase_number smallint NOT NULL,
    nome text NOT NULL,
    duracao_estimada text,
    objetivo text,
    track_lider text,
    tracks_ativos text[] NOT NULL DEFAULT '{}'::text[],
    metrica_unica text,
    playbook_sv text,
    decision_gate text,
    anti_patterns text[] NOT NULL DEFAULT '{}'::text[],
    track_paralelo_nota text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    decision_gate_met_at timestamp with time zone,
    notes text,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE ops.roadmap_tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phase_number smallint NOT NULL,
    track text,
    title text NOT NULL,
    description text,
    category text NOT NULL DEFAULT 'entregavel'::text,
    target_date date,
    completed_at timestamp with time zone,
    completed_by uuid,
    priority smallint NOT NULL DEFAULT 3,
    notes text,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE ops.scorecard_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    metric_id uuid NOT NULL,
    week_start date NOT NULL,
    value numeric NOT NULL,
    note text,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE ops.scorecard_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    label text NOT NULL,
    owner text NOT NULL DEFAULT 'Gilberto'::text,
    target numeric NOT NULL,
    direction text NOT NULL DEFAULT '>='::text,
    unit text,
    hint text,
    sort_order integer NOT NULL DEFAULT 100,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE ops.servicos (
    slug text NOT NULL,
    nome text NOT NULL,
    familia text NOT NULL,
    plataforma_slug text,
    sort_order integer NOT NULL DEFAULT 99,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.espelho_telao_bi (
    id integer NOT NULL DEFAULT 1,
    vendas_qtd_dia integer,
    entregas_dia integer,
    faturamento_liquido_dia numeric,
    ticket_medio_dia numeric,
    gerado_em timestamp with time zone,
    sincronizado_em timestamp with time zone NOT NULL DEFAULT now(),
    payload jsonb,
    dia_referencia date,
    mes_referencia text,
    vendas_qtd_mes integer,
    faturamento_liquido_mes numeric,
    media_diaria_30d numeric,
    os_ativas_60d integer,
    os_prontas_retirada_60d integer,
    os_finalizadas_hoje integer,
    observacoes jsonb,
    lojas_operantes integer,
    por_loja jsonb
);
