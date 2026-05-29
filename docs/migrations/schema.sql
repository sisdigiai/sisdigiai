-- ============================================================
-- ESPELHO DE SCHEMA — digiai  (projeto Supabase: digiai / region sa-east-1)
-- Snapshot estrutural gerado via Management API. Read-only.
-- Para o DDL EXATO (constraints/índices/triggers), a fonte canônica é ./migrations/.
-- Regenerar: node Cockpit/scripts/dump-db-mirror.mjs digiai
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
    created_by uuid
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
    created_at timestamp with time zone NOT NULL DEFAULT now()
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
    created_by uuid
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
    created_by uuid
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
    utm_slug text
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
    updated_at timestamp with time zone DEFAULT now()
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- RLS HABILITADO (46): academy.product_assets, academy.product_checklist_items, academy.product_creation_records, academy.product_questions, academy.product_scenarios, academy.products, company.api_credentials, company.contacts, company.digital_assets, company.financial_snapshots, company.identity, company.legal_status, company.metrics, company.partners, company.tools, finance.expenses, finance.founder_time, finance.infra_costs, finance.products, finance.revenue, finance.subscriptions, finance.vendors, iam.audit_logs, iam.users, marketing.affiliate_downloads, marketing.affiliate_materials, marketing.affiliate_payouts, marketing.affiliates, marketing.ai_prompt_templates, marketing.challenge_participations, marketing.challenges, marketing.community_members, marketing.content_calendar, marketing.content_ideas, marketing.content_pillars, marketing.hotmart_events_raw, marketing.hotmart_sales, marketing.platforms, marketing.post_ai_outputs, marketing.testimonials, ops.backlog_items, ops.copy_assets, ops.decisions, ops.milestones, ops.roadmap_phases, ops.roadmap_tasks

-- POLICIES (49):
--   academy.product_assets  [ALL]  academy_assets_staff_all
--   academy.product_checklist_items  [ALL]  academy_checklist_staff_all
--   academy.product_creation_records  [ALL]  academy_creation_staff_all
--   academy.product_questions  [ALL]  academy_questions_staff_all
--   academy.product_scenarios  [ALL]  academy_scenarios_staff_all
--   academy.products  [ALL]  academy_products_staff_all
--   company.contacts  [ALL]  contacts_staff_all
--   company.digital_assets  [ALL]  digital_staff_all
--   company.financial_snapshots  [ALL]  fsnap_staff_all
--   company.identity  [ALL]  identity_staff_all
--   company.legal_status  [ALL]  legal_staff_all
--   company.metrics  [SELECT]  metrics_staff_read
--   company.partners  [ALL]  partners_staff_all
--   company.tools  [ALL]  tools_staff_all
--   finance.expenses  [ALL]  expenses_staff_all
--   finance.founder_time  [ALL]  ftime_staff_all
--   finance.infra_costs  [ALL]  infra_staff_all
--   finance.products  [ALL]  products_staff_all
--   finance.revenue  [ALL]  revenue_staff_all
--   finance.subscriptions  [ALL]  subs_staff_all
--   finance.vendors  [ALL]  vendors_staff_all
--   iam.audit_logs  [SELECT]  audit_read_staff
--   iam.users  [ALL]  users_staff_all
--   marketing.affiliate_downloads  [ALL]  marketing_affdl_staff_all
--   marketing.affiliate_materials  [ALL]  marketing_affmat_staff_all
--   marketing.affiliate_payouts  [ALL]  payouts_staff_all
--   marketing.affiliates  [ALL]  marketing_aff_staff_all
--   marketing.ai_prompt_templates  [SELECT]  ai_prompts_staff_read
--   marketing.ai_prompt_templates  [ALL]  ai_prompts_staff_write
--   marketing.challenge_participations  [ALL]  part_staff_all
--   marketing.challenges  [ALL]  challenges_staff_all
--   marketing.community_members  [ALL]  community_staff_all
--   marketing.content_calendar  [ALL]  marketing_calendar_staff_all
--   marketing.content_ideas  [ALL]  marketing_ideas_staff_all
--   marketing.content_pillars  [ALL]  marketing_pillars_staff_all
--   marketing.hotmart_events_raw  [SELECT]  hotmart_raw_staff_read
--   marketing.hotmart_sales  [SELECT]  hotmart_sales_staff_read
--   marketing.platforms  [SELECT]  marketing_platforms_read
--   marketing.platforms  [ALL]  marketing_platforms_staff_all
--   marketing.post_ai_outputs  [ALL]  outputs_staff_all
--   marketing.testimonials  [SELECT]  testim_staff_read
--   marketing.testimonials  [ALL]  testim_staff_write
--   ops.backlog_items  [ALL]  backlog_staff_all
--   ops.copy_assets  [SELECT]  staff_read_copy_assets
--   ops.copy_assets  [ALL]  staff_write_copy_assets
--   ops.decisions  [ALL]  decisions_staff_all
--   ops.milestones  [ALL]  milestones_staff_all
--   ops.roadmap_phases  [ALL]  phases_staff_all
--   ops.roadmap_tasks  [ALL]  tasks_staff_all
